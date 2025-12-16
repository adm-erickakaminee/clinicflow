// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { z } from 'https://esm.sh/zod@3.22.4'

const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!
const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3'

const payloadSchema = z.object({
  customer: z.string(), // ID do customer no Asaas ou clinic_id
  creditCard: z.object({
    holderName: z.string(),
    number: z.string(),
    expiryMonth: z.string(),
    expiryYear: z.string(),
    ccv: z.string(),
  }),
  creditCardHolderInfo: z.object({
    name: z.string(),
    email: z.string().email(),
    cpfCnpj: z.string().min(11, 'CPF/CNPJ deve ter pelo menos 11 dígitos'), // OBRIGATÓRIO para Asaas
    postalCode: z.string().optional(),
    address: z.string().optional(), // Rua/Logradouro
    addressNumber: z.string().optional(),
    complement: z.string().optional(), // Complemento
    province: z.string().optional(), // Bairro
    city: z.string().optional(), // Cidade
    state: z.string().optional(), // Estado/UF
    phone: z.string().optional(),
  }),
  remoteIp: z.string().optional(), // IP do cliente (opcional, mas recomendado)
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
    // Verificar método
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método não permitido' }),
        { 
          status: 405, 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    // Verificar se a API key está configurada
    if (!asaasApiKey) {
      console.error('ASAAS_API_KEY não configurada')
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

    // Ler e validar o body da requisição
    let payload: any
    try {
      const bodyText = await req.text()
      console.log('📥 Body recebido:', bodyText)
      
      if (!bodyText || bodyText.trim() === '') {
        throw new Error('Body da requisição está vazio')
      }
      
      payload = JSON.parse(bodyText)
      console.log('📋 Payload parseado:', JSON.stringify(payload, null, 2))
      console.log('🔍 Verificação CPF/CNPJ no payload recebido:', {
        hasCpfCnpj: !!payload?.creditCardHolderInfo?.cpfCnpj,
        cpfCnpj: payload?.creditCardHolderInfo?.cpfCnpj,
        cpfCnpjLength: payload?.creditCardHolderInfo?.cpfCnpj?.length,
      })
    } catch (parseError: any) {
      console.error('❌ Erro ao parsear JSON:', parseError)
      return new Response(
        JSON.stringify({ 
          error: 'Erro ao processar dados da requisição',
          details: parseError.message || 'JSON inválido ou vazio'
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Validar payload com Zod
    let validated: Payload
    try {
      validated = payloadSchema.parse(payload)
      console.log('✅ Payload validado com sucesso')
    } catch (zodError: any) {
      console.error('❌ Erro de validação Zod:', zodError.errors)
      return new Response(
        JSON.stringify({ 
          error: 'Dados inválidos',
          details: zodError.errors || zodError.message,
          received: payload // Incluir o que foi recebido para debug
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      )
    }

    // Obter IP do cliente (se não fornecido, tentar obter do header)
    const remoteIp = validated.remoteIp || req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''

    // Preparar payload para tokenização no Asaas
    const tokenizePayload = {
      customer: validated.customer,
      creditCard: {
        holderName: validated.creditCard.holderName,
        number: validated.creditCard.number.replace(/\s/g, ''), // Remover espaços
        expiryMonth: validated.creditCard.expiryMonth.padStart(2, '0'),
        expiryYear: validated.creditCard.expiryYear.length === 2 ? `20${validated.creditCard.expiryYear}` : validated.creditCard.expiryYear,
        ccv: validated.creditCard.ccv,
      },
      creditCardHolderInfo: {
        name: validated.creditCardHolderInfo.name,
        email: validated.creditCardHolderInfo.email,
        cpfCnpj: validated.creditCardHolderInfo.cpfCnpj, // OBRIGATÓRIO - sempre presente após validação
        ...(validated.creditCardHolderInfo.postalCode && { postalCode: validated.creditCardHolderInfo.postalCode }),
        ...(validated.creditCardHolderInfo.address && { address: validated.creditCardHolderInfo.address }),
        ...(validated.creditCardHolderInfo.addressNumber && { addressNumber: validated.creditCardHolderInfo.addressNumber }),
        ...(validated.creditCardHolderInfo.complement && { complement: validated.creditCardHolderInfo.complement }),
        ...(validated.creditCardHolderInfo.province && { province: validated.creditCardHolderInfo.province }),
        ...(validated.creditCardHolderInfo.city && { city: validated.creditCardHolderInfo.city }),
        ...(validated.creditCardHolderInfo.state && { state: validated.creditCardHolderInfo.state }),
        ...(validated.creditCardHolderInfo.phone && { phone: validated.creditCardHolderInfo.phone }),
      },
      ...(remoteIp && { remoteIp }),
    }
    
    console.log('📤 Payload final enviado para Asaas:', JSON.stringify(tokenizePayload, null, 2))
    console.log('🔍 Verificação final CPF/CNPJ:', {
      hasCpfCnpj: !!tokenizePayload.creditCardHolderInfo.cpfCnpj,
      cpfCnpj: tokenizePayload.creditCardHolderInfo.cpfCnpj,
      cpfCnpjLength: tokenizePayload.creditCardHolderInfo.cpfCnpj?.length,
    })

    // Chamar API do Asaas para tokenizar
    // O Asaas aceita 'access_token' como header ou como query parameter
    const response = await fetch(`${asaasBaseUrl}/creditCard/tokenize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClinicFlow/1.0',
        'access_token': asaasApiKey, // Formato padrão do Asaas
      },
      body: JSON.stringify(tokenizePayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      let errorDetails: any = {}
      
      try {
        errorDetails = JSON.parse(errorText)
      } catch {
        errorDetails = { message: errorText }
      }
      
      console.error('❌ Erro ao tokenizar cartão no Asaas:', {
        status: response.status,
        statusText: response.statusText,
        error: errorDetails,
        apiKeyLength: asaasApiKey?.length,
        apiKeyPrefix: asaasApiKey?.substring(0, 10),
        baseUrl: asaasBaseUrl,
      })
      
      // Mensagem de erro mais detalhada
      if (response.status === 403) {
        throw new Error(
          `Erro 403 - Permissão negada pelo Asaas. ` +
          `Verifique: 1) API Key está correta e ativa, 2) API Key tem permissão para tokenizar cartões, ` +
          `3) Está usando o ambiente correto (sandbox/produção), 4) Conta do Asaas está ativa. ` +
          `Detalhes: ${errorDetails.errors?.[0]?.description || errorText}`
        )
      }
      
      throw new Error(`Erro ao tokenizar cartão (${response.status}): ${errorDetails.errors?.[0]?.description || errorText}`)
    }

    const tokenData = await response.json()

    // Retornar apenas o token (não os dados do cartão)
    return new Response(
      JSON.stringify({
        success: true,
        creditCardToken: tokenData.creditCardToken,
        creditCardNumber: tokenData.creditCardNumber, // Últimos 4 dígitos
        creditCardBrand: tokenData.creditCardBrand, // Bandeira do cartão
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
    console.error('❌ Erro ao tokenizar cartão:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause,
    })
    
    // Retornar erro detalhado para debug
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao tokenizar cartão',
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

serve(handler)
