import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'
import { z } from 'https://esm.sh/zod@3.22.4'

interface SubscriptionPayload {
  customer: string
  billingType: 'CREDIT_CARD' | 'PIX'
  value: number
  nextDueDate: string
  description: string
  cycle: 'MONTHLY'
  externalReference: string
  creditCardToken?: string
}

interface AsaasSubscriptionResponse {
  id: string
  customer?: string
  customerId?: string
  nextDueDate?: string
  invoiceUrl?: string
  bankSlipUrl?: string
}

interface OrganizationUpdateData {
  asaas_subscription_id: string
  subscription_plan_id: string
  subscription_renewal_date: string
  status: string
  updated_at: string
  asaas_customer_id?: string
}

/**
 * Valida variáveis de ambiente obrigatórias
 * Retorna erro 500 com mensagem clara se alguma estiver faltando
 */
function validateEnvVars(): { supabaseUrl: string; supabaseKey: string; asaasApiKey: string; asaasBaseUrl: string } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const asaasApiKey = Deno.env.get('ASAAS_API_KEY')
  const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3'

  const missing: string[] = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  if (!asaasApiKey) missing.push('ASAAS_API_KEY')

  if (missing.length > 0) {
    const errorMessage = `❌ Variáveis de ambiente não configuradas: ${missing.join(', ')}\n\n` +
      `Configure no Supabase Dashboard:\n` +
      `1. Vá em Settings → Edge Functions → Secrets\n` +
      `2. Adicione as variáveis: ${missing.join(', ')}\n` +
      `3. Marque para Production, Preview e Development\n\n` +
      `Consulte: DOCS/arquivo/URGENTE_CONFIGURAR_VARIAVEIS.md`
    throw new Error(errorMessage)
  }

  return { supabaseUrl, supabaseKey, asaasApiKey, asaasBaseUrl }
}

const payloadSchema = z.object({
  clinic_id: z.string().uuid(),
  plan_id: z.string().uuid().optional(), // Se não fornecido, usa o plano padrão
  trial_days: z.number().optional().default(7), // Dias de trial grátis
  credit_card_token: z.string().optional(), // Token do cartão tokenizado (seguro)
})

type Payload = z.infer<typeof payloadSchema>

// Headers CORS para permitir requisições do frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

async function handler(req: Request): Promise<Response> {
  // Tratar preflight request (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar variáveis de ambiente
    const { supabaseUrl, supabaseKey, asaasApiKey, asaasBaseUrl } = validateEnvVars()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload: Payload = await req.json()
    const validated = payloadSchema.parse(payload)

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, email, asaas_wallet_id, asaas_customer_id, subscription_plan_id')
      .eq('id', validated.clinic_id)
      .maybeSingle()

    if (orgError) {
      throw new Error(`Erro ao buscar organização: ${orgError.message}`)
    }

    if (!org) {
      throw new Error(`Organização não encontrada com ID: ${validated.clinic_id}`)
    }

    // ✅ VALIDAÇÃO CRÍTICA: Verificar se organização possui customer_id do Asaas
    if (!org.asaas_customer_id) {
      throw new Error(
        'Organização não possui customer_id do Asaas. ' +
        'É necessário criar a subconta Asaas primeiro usando a função create-asaas-subaccount. ' +
        'Sem o customer_id, não é possível criar assinaturas no Asaas.'
      )
    }

    // Buscar plano (ou usar padrão)
    let planId: string
    try {
      planId = validated.plan_id || (await getDefaultPlanId(supabase))
    } catch (planError: unknown) {
      const errorMessage = planError instanceof Error ? planError.message : 'Erro desconhecido ao buscar plano'
      throw new Error(`Erro ao buscar plano: ${errorMessage}`)
    }

    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()

    if (planError) {
      throw new Error(`Erro ao buscar plano: ${planError.message}`)
    }

    if (!plan) {
      throw new Error(`Plano não encontrado com ID: ${planId}`)
    }

    // Validar que o plano está ativo
    if (!plan.is_active) {
      throw new Error(`Plano ${plan.name} não está ativo`)
    }

    // Validar valor do plano
    if (!plan.base_price_cents || plan.base_price_cents <= 0) {
      throw new Error(`Plano ${plan.name} possui valor inválido`)
    }

    // Calcular data de início (hoje) e data de vencimento (após trial)
    const today = new Date()
    const trialDays = validated.trial_days || 7
    
    // Validar trial_days
    if (trialDays < 0 || trialDays > 365) {
      throw new Error('Trial days deve estar entre 0 e 365')
    }

    const nextDueDate = new Date(today)
    nextDueDate.setDate(nextDueDate.getDate() + trialDays)

    // ✅ CORREÇÃO CRÍTICA: Usar asaas_customer_id (não wallet_id)
    // O Asaas requer um customer_id válido para criar assinaturas
    const subscriptionPayload: SubscriptionPayload = {
      customer: org.asaas_customer_id, // ✅ Usar customer_id (obrigatório)
      billingType: validated.credit_card_token ? 'CREDIT_CARD' : 'PIX', // Cartão (tokenizado) ou PIX
      value: plan.base_price_cents / 100, // Converter centavos para reais
      nextDueDate: nextDueDate.toISOString().split('T')[0], // Data após trial
      description: `Assinatura ${plan.name} - ${org.name}`,
      cycle: 'MONTHLY',
      externalReference: org.id,
      ...(validated.credit_card_token && { creditCardToken: validated.credit_card_token }),
    }

    // Fazer requisição para criar assinatura no Asaas
    let response: Response
    try {
      response = await fetch(`${asaasBaseUrl}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ClinicFlow/1.0',
          'access_token': asaasApiKey,
        },
        body: JSON.stringify(subscriptionPayload),
      })
    } catch (fetchError: unknown) {
      const errorMessage = fetchError instanceof Error ? fetchError.message : 'Erro desconhecido de conexão'
      throw new Error(`Erro de conexão com Asaas: ${errorMessage}`)
    }

    // Tratar resposta do Asaas
    let subscriptionData: AsaasSubscriptionResponse
    try {
      const responseText = await response.text()
      
      if (!response.ok) {
        // Tentar parsear erro como JSON
        let errorMessage = responseText
        try {
          const errorJson = JSON.parse(responseText) as { errors?: Array<{ description?: string }>; message?: string; error?: string }
          errorMessage = errorJson.errors?.[0]?.description || 
                        errorJson.message || 
                        errorJson.error || 
                        responseText
        } catch {
          // Se não for JSON, usar texto direto
        }
        
        throw new Error(
          `Erro ao criar assinatura no Asaas (${response.status}): ${errorMessage}. ` +
          `Verifique se o customer_id (${org.asaas_customer_id}) existe no Asaas.`
        )
      }

      subscriptionData = JSON.parse(responseText) as AsaasSubscriptionResponse
    } catch (parseError: unknown) {
      if (parseError instanceof Error && parseError.message.includes('Erro ao criar assinatura')) {
        throw parseError // Re-throw se já for nosso erro formatado
      }
      const errorMessage = parseError instanceof Error ? parseError.message : 'Erro desconhecido ao processar resposta'
      throw new Error(`Erro ao processar resposta do Asaas: ${errorMessage}`)
    }

    // Validar resposta do Asaas
    if (!subscriptionData || !subscriptionData.id) {
      throw new Error('Resposta inválida do Asaas: subscription_id não encontrado')
    }

    // Atualizar organização com dados da assinatura
    // Durante o trial, status fica como 'pending_setup' até confirmação do email
    // Após confirmação, pode ser 'active' (trial ativo) e depois será cobrado automaticamente
    const updateData: OrganizationUpdateData = {
      asaas_subscription_id: subscriptionData.id,
      subscription_plan_id: plan.id,
      subscription_renewal_date: subscriptionData.nextDueDate || nextDueDate.toISOString().split('T')[0],
      status: 'pending_setup', // Será atualizado para 'active' após confirmação do email
      updated_at: new Date().toISOString(),
    }

    // ✅ Atualizar customer_id se vier na resposta (pode ser diferente do que temos)
    const customerIdFromResponse = subscriptionData.customer || subscriptionData.customerId
    if (customerIdFromResponse && customerIdFromResponse !== org.asaas_customer_id) {
      console.log(`⚠️ Customer ID atualizado: ${org.asaas_customer_id} → ${customerIdFromResponse}`)
      updateData.asaas_customer_id = customerIdFromResponse
    } else if (!org.asaas_customer_id && customerIdFromResponse) {
      // Se não tínhamos customer_id e veio na resposta, salvar
      updateData.asaas_customer_id = customerIdFromResponse
    }

    const { error: updateError } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', validated.clinic_id)

    if (updateError) {
      // ⚠️ Assinatura foi criada no Asaas mas falhou ao atualizar banco
      // Logar erro crítico mas não falhar completamente
      console.error('❌ ERRO CRÍTICO: Assinatura criada no Asaas mas falhou ao atualizar banco:', {
        subscription_id: subscriptionData.id,
        error: updateError.message,
        clinic_id: validated.clinic_id,
      })
      throw new Error(
        `Assinatura criada no Asaas (ID: ${subscriptionData.id}) mas falhou ao atualizar banco: ${updateError.message}. ` +
        'A assinatura existe no Asaas mas os dados não foram salvos localmente.'
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        subscription_id: subscriptionData.id,
        payment_url: subscriptionData.invoiceUrl || subscriptionData.bankSlipUrl,
        trial_days: trialDays,
        next_due_date: subscriptionData.nextDueDate || nextDueDate.toISOString().split('T')[0],
        message: `Assinatura criada com sucesso! Você tem ${trialDays} dias grátis. A cobrança acontecerá automaticamente após o período de trial.`,
      }),
      {
        status: 200,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    )
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Erro ao criar assinatura'
    const errorStack = error instanceof Error ? error.stack : undefined
    const errorName = error instanceof Error ? error.name : undefined
    
    console.error('❌ Erro ao criar assinatura:', {
      message: errorMessage,
      stack: errorStack,
      name: errorName,
    })
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: process.env.DENO_ENV === 'development' ? {
          stack: errorStack,
          name: errorName,
        } : undefined,
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        },
      }
    )
  }
}

async function getDefaultPlanId(supabase: SupabaseClient): Promise<string> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Erro ao buscar plano padrão: ${error.message}`)
  }

  if (!data) {
    throw new Error('Nenhum plano ativo encontrado. Crie pelo menos um plano ativo antes de criar assinaturas.')
  }

  return data.id
}

serve(handler)
