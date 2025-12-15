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
})

type Payload = z.infer<typeof payloadSchema>

async function handler(req: Request): Promise<Response> {
  try {
    const payload: Payload = await req.json()
    const validated = payloadSchema.parse(payload)

    // Buscar organização
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, asaas_subscription_id')
      .eq('id', validated.clinic_id)
      .maybeSingle()

    if (orgError || !org) {
      throw new Error('Organização não encontrada')
    }

    if (!org.asaas_subscription_id) {
      throw new Error('Organização não possui assinatura ativa')
    }

    // Cancelar assinatura no Asaas
    const response = await fetch(`${asaasBaseUrl}/subscriptions/${org.asaas_subscription_id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'ClinicFlow/1.0',
        'access_token': asaasApiKey,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Erro ao cancelar assinatura no Asaas: ${error}`)
    }

    // Atualizar organização
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        status: 'cancelled',
        subscription_cancelled_at: new Date().toISOString(),
        asaas_subscription_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.clinic_id)

    if (updateError) throw updateError

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Assinatura cancelada com sucesso',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Erro ao cancelar assinatura:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao cancelar assinatura',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

serve(handler)
