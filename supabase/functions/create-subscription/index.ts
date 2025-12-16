// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'
import { z } from 'https://esm.sh/zod@3.22.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!
const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3'

const supabase = createClient(supabaseUrl, supabaseKey)

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
    // Verificar se as variáveis de ambiente estão configuradas
    if (!supabaseUrl || !supabaseKey || !asaasApiKey) {
      console.error('Variáveis de ambiente não configuradas:', {
        hasSupabaseUrl: !!supabaseUrl,
        hasSupabaseKey: !!supabaseKey,
        hasAsaasApiKey: !!asaasApiKey,
      })
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    const payload: Payload = await req.json()
    const validated = payloadSchema.parse(payload)

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, email, asaas_wallet_id, subscription_plan_id')
      .eq('id', validated.clinic_id)
      .maybeSingle()

    if (orgError || !org) {
      throw new Error('Organização não encontrada')
    }

    // Buscar plano (ou usar padrão)
    const planId = validated.plan_id || (await getDefaultPlanId())
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle()

    if (planError || !plan) {
      throw new Error('Plano não encontrado')
    }

    // Calcular data de início (hoje) e data de vencimento (após trial)
    const today = new Date()
    const trialDays = validated.trial_days || 7
    const nextDueDate = new Date(today)
    nextDueDate.setDate(nextDueDate.getDate() + trialDays)

    // Criar assinatura no Asaas com trial
    const subscriptionPayload: any = {
      customer: org.asaas_wallet_id || org.id, // Usar wallet_id se disponível
      billingType: validated.credit_card_token ? 'CREDIT_CARD' : 'PIX', // Cartão (tokenizado) ou PIX
      value: plan.base_price_cents / 100, // Converter centavos para reais
      nextDueDate: nextDueDate.toISOString().split('T')[0], // Data após trial
      description: `Assinatura ${plan.name} - ${org.name}`,
      cycle: 'MONTHLY',
      externalReference: org.id,
    }

    // Se tiver token do cartão (tokenizado de forma segura), usar para pagamento
    if (validated.credit_card_token) {
      subscriptionPayload.creditCardToken = validated.credit_card_token
      // Nota: O token já contém todas as informações necessárias do cartão
      // Não precisamos enviar dados sensíveis novamente
    }

    const response = await fetch(`${asaasBaseUrl}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClinicFlow/1.0',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(subscriptionPayload),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao criar assinatura no Asaas: ${error}`)
    }

    const subscriptionData = await response.json()

    // Atualizar organização
    // Durante o trial, status fica como 'pending_setup' até confirmação do email
    // Após confirmação, pode ser 'active' (trial ativo) e depois será cobrado automaticamente
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        asaas_subscription_id: subscriptionData.id,
        subscription_plan_id: plan.id,
        subscription_renewal_date: subscriptionData.nextDueDate || nextDueDate.toISOString().split('T')[0],
        status: 'pending_setup', // Será atualizado para 'active' após confirmação do email
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.clinic_id)

    if (updateError) throw updateError

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
  } catch (error: any) {
    console.error('❌ Erro ao criar assinatura:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    })
    
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao criar assinatura',
        details: process.env.DENO_ENV === 'development' ? {
          stack: error.stack,
          name: error.name,
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

async function getDefaultPlanId(): Promise<string> {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error || !data) {
    throw new Error('Nenhum plano ativo encontrado')
  }

  return data.id
}

function getNextMonthDate(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  return date.toISOString().split('T')[0]
}

serve(handler)
