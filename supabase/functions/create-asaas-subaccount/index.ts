// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'
import { z } from 'https://esm.sh/zod@3.22.4'

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
  type: z.enum(['clinic', 'professional']),
  clinic_id: z.string().uuid(),
  professional_id: z.string().uuid().optional(), // Obrigatório se type === 'professional'
  bank_account_data: z.object({
    bank_code: z.string(),
    agency: z.string(),
    account: z.string(),
    account_digit: z.string(),
    account_type: z.enum(['CHECKING', 'SAVINGS']),
    holder_name: z.string(),
    holder_document: z.string(), // CPF ou CNPJ
  }).optional(), // Opcional - pode ser preenchido depois
  cpf: z.string().optional(), // Obrigatório se type === 'professional'
  cnpj: z.string().optional(), // Obrigatório se type === 'clinic'
})

type Payload = z.infer<typeof payloadSchema>

interface AsaasSubaccountResponse {
  id: string
  walletId: string
  customerId: string // ID do cliente no Asaas (campo "customer" ou "customerId" ou "id")
  status: 'pending' | 'approved' | 'rejected'
}

async function createAsaasSubaccount(payload: Payload): Promise<AsaasSubaccountResponse> {
  const isProfessional = payload.type === 'professional'
  
  // Montar payload para API Asaas
  const asaasPayload: any = {
    name: isProfessional ? 'Profissional' : 'Clínica', // Será atualizado com nome real
    email: '', // Será buscado do banco
    cpfCnpj: isProfessional ? payload.cpf : payload.cnpj,
    phone: '', // Será buscado do banco
    postalCode: '', // Será buscado do banco
    address: '', // Será buscado do banco
    addressNumber: '',
    complement: '',
    province: '',
    city: '',
    state: '',
    country: 'Brasil',
    // Dados bancários (opcional - pode ser preenchido depois)
    ...(payload.bank_account_data && {
      bank: payload.bank_account_data.bank_code,
      agency: payload.bank_account_data.agency,
      account: payload.bank_account_data.account,
      accountDigit: payload.bank_account_data.account_digit,
      accountType: payload.bank_account_data.account_type === 'CHECKING' ? 'CONTA_CORRENTE' : 'CONTA_POUPANCA',
      holderName: payload.bank_account_data.holder_name,
      holderDocument: payload.bank_account_data.holder_document,
    }),
  }

  // Buscar dados completos do banco
  if (isProfessional && payload.professional_id) {
    // Buscar profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, phone')
      .eq('id', payload.professional_id)
      .maybeSingle()

    if (profileError) throw profileError
    
    // Buscar email do auth.users (não está em profiles)
    let userEmail = ''
    if (profile) {
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(payload.professional_id)
      if (!authError && authUser?.user?.email) {
        userEmail = authUser.user.email
      }
      
      asaasPayload.name = profile.full_name || 'Profissional'
      asaasPayload.phone = profile.phone || ''
      asaasPayload.email = userEmail
    }
  } else {
    const { data: org, error } = await supabase
      .from('organizations')
      .select('name, phone, email, address')
      .eq('id', payload.clinic_id)
      .maybeSingle()

    if (error) throw error
    if (org) {
      asaasPayload.name = org.name || 'Clínica'
      asaasPayload.phone = org.phone || ''
      asaasPayload.email = org.email || ''
      // ✅ Parse address (agora sempre em formato JSON com campos separados)
      if (org.address) {
        try {
          const addr = typeof org.address === 'string' ? JSON.parse(org.address) : org.address
          // ✅ Campos separados garantem que todos os dados necessários estão disponíveis
          asaasPayload.postalCode = addr.postalCode || addr.cep || ''
          asaasPayload.address = addr.address || addr.street || ''
          asaasPayload.addressNumber = addr.addressNumber || addr.number || ''
          asaasPayload.complement = addr.complement || ''
          asaasPayload.province = addr.province || addr.neighborhood || addr.district || ''
          asaasPayload.city = addr.city || ''
          asaasPayload.state = addr.state || ''
        } catch {
          // Se não for JSON válido, tentar usar como string simples (fallback)
          console.warn('Endereço não está em formato JSON, usando como string simples')
          asaasPayload.address = typeof org.address === 'string' ? org.address : ''
        }
      }
    }
  }

  // Chamar API do Asaas
  const response = await fetch(`${asaasBaseUrl}/accounts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'ClinicFlow/1.0',
      'access_token': asaasApiKey,
    },
    body: JSON.stringify(asaasPayload),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Erro ao criar subconta Asaas: ${error}`)
  }

  const data = await response.json()
  
  return {
    id: data.id,
    walletId: data.walletId || data.wallet?.id || '',
    customerId: data.customer || data.customerId || data.id, // ID do cliente no Asaas
    status: data.status || 'pending',
  }
}

async function handler(req: Request): Promise<Response> {
  try {
    // Validar variáveis de ambiente
    const { supabaseUrl, supabaseKey, asaasApiKey, asaasBaseUrl } = validateEnvVars()
    const supabase = createClient(supabaseUrl, supabaseKey)

    const payload: Payload = await req.json()
    
    // Validar payload
    const validated = payloadSchema.parse(payload)
    
    // Validações adicionais
    if (validated.type === 'professional' && !validated.professional_id) {
      return new Response(
        JSON.stringify({ error: 'professional_id é obrigatório para type=professional' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    if (validated.type === 'professional' && !validated.cpf) {
      return new Response(
        JSON.stringify({ error: 'cpf é obrigatório para type=professional' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    if (validated.type === 'clinic' && !validated.cnpj) {
      return new Response(
        JSON.stringify({ error: 'cnpj é obrigatório para type=clinic' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Criar subconta no Asaas
    const asaasResult = await createAsaasSubaccount(validated)

    // Atualizar banco de dados
    if (validated.type === 'professional' && validated.professional_id) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          asaas_wallet_id: asaasResult.walletId,
          asaas_customer_id: asaasResult.customerId, // ✅ Armazenar customer_id
          kyc_status: asaasResult.status === 'approved' ? 'approved' : 'in_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.professional_id)

      if (updateError) throw updateError
    } else {
      const { error: updateError } = await supabase
        .from('organizations')
        .update({
          asaas_wallet_id: asaasResult.walletId,
          asaas_customer_id: asaasResult.customerId, // ✅ Armazenar customer_id
          kyc_status: asaasResult.status === 'approved' ? 'approved' : 'in_review',
          updated_at: new Date().toISOString(),
        })
        .eq('id', validated.clinic_id)

      if (updateError) throw updateError
    }

    return new Response(
      JSON.stringify({
        success: true,
        wallet_id: asaasResult.walletId,
        customer_id: asaasResult.customerId, // ✅ Retornar customer_id no response
        status: asaasResult.status,
        message: 'Subconta Asaas criada com sucesso',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Erro ao criar subconta Asaas:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao criar subconta Asaas',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

serve(handler)
