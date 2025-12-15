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
    cpfCnpj: z.string().optional(),
    postalCode: z.string().optional(),
    addressNumber: z.string().optional(),
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

    const payload: Payload = await req.json()
    const validated = payloadSchema.parse(payload)

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
        ...(validated.creditCardHolderInfo.cpfCnpj && { cpfCnpj: validated.creditCardHolderInfo.cpfCnpj }),
        ...(validated.creditCardHolderInfo.postalCode && { postalCode: validated.creditCardHolderInfo.postalCode }),
        ...(validated.creditCardHolderInfo.addressNumber && { addressNumber: validated.creditCardHolderInfo.addressNumber }),
        ...(validated.creditCardHolderInfo.phone && { phone: validated.creditCardHolderInfo.phone }),
      },
      ...(remoteIp && { remoteIp }),
    }

    // Chamar API do Asaas para tokenizar
    const response = await fetch(`${asaasBaseUrl}/creditCard/tokenize`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClinicFlow/1.0',
        'access_token': asaasApiKey,
      },
      body: JSON.stringify(tokenizePayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Erro ao tokenizar cartão no Asaas:', errorText)
      throw new Error(`Erro ao tokenizar cartão: ${errorText}`)
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
    console.error('Erro ao tokenizar cartão:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao tokenizar cartão',
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
