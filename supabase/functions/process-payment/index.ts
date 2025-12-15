// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'
import { z } from 'https://esm.sh/zod@3.22.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, supabaseKey)

const payloadSchema = z.object({
  clinic_id: z.string().uuid(), // ✅ Mudado de organization_id para clinic_id
  appointment_id: z.string().uuid().optional(),
  professional_id: z.string().uuid(),
  amount_cents: z.number().int().nonnegative(),
  platform_fee_percent: z.number().nonnegative().max(1).default(0.0599), // 5.99% padrão
  commission_model: z.enum(['commissioned', 'rental', 'hybrid']).default('commissioned'),
  commission_rate: z.number().nonnegative().max(1).optional(), // para commissioned/hybrid
  rental_base_cents: z.number().int().nonnegative().optional(), // para hybrid
  payment_method: z.string().optional(),
})

// Wallet ID da Plataforma (recebe o lucro residual)
const PLATFORM_WALLET_ID = '0055676d-64e7-4346-92cd-a15c8a1a04d5'

type Payload = z.infer<typeof payloadSchema>

function computeSplit(input: Payload, hasReferral: boolean, referralPercentage: number, referralWalletId?: string) {
  const net = input.amount_cents
  
  // 1. Calcular Taxa de Plataforma TOTAL (5.99%)
  const platform_fee_total_cents = Math.round(net * input.platform_fee_percent)
  
  // 2. Dividir Taxa de Plataforma (com ou sem indicação)
  let platform_fee_cents = platform_fee_total_cents
  let referral_fee_cents = 0
  
  if (hasReferral && referralWalletId) {
    // COM INDICAÇÃO: X% para clínica indicadora, (5.99% - X%) para plataforma
    referral_fee_cents = Math.round(net * referralPercentage)
    platform_fee_cents = platform_fee_total_cents - referral_fee_cents
  }
  // SEM INDICAÇÃO: 5.99% inteiro para plataforma (já calculado acima)
  
  // 3. Calcular valores após taxa da plataforma
  const remaining = Math.max(net - platform_fee_total_cents, 0)

  // 4. Calcular split entre profissional e clínica
  let professional_share_cents = 0
  let clinic_share_cents = 0

  const rate = input.commission_rate ?? 0.5
  const rental_base = input.rental_base_cents ?? 0

  switch (input.commission_model) {
    case 'commissioned': {
      professional_share_cents = Math.round(remaining * rate)
      clinic_share_cents = Math.max(remaining - professional_share_cents, 0)
      break
    }
    case 'rental': {
      professional_share_cents = remaining
      clinic_share_cents = 0
      break
    }
    case 'hybrid': {
      const variablePart = Math.round(remaining * rate)
      professional_share_cents = Math.max(variablePart + rental_base, 0)
      if (professional_share_cents > remaining) {
        professional_share_cents = remaining
      }
      clinic_share_cents = Math.max(remaining - professional_share_cents, 0)
      break
    }
  }

  return {
    platform_fee_cents, // Lucro da plataforma (3.66% com indicação, 5.99% sem)
    platform_fee_total_cents, // Taxa total (5.99%)
    referral_fee_cents, // Repasse B2B (2.33% se houver indicação, 0 caso contrário)
    professional_share_cents,
    clinic_share_cents,
  }
}

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const parsed = payloadSchema.parse(body)

    // Buscar dados do profissional (wallet, commission defaults)
    const { data: prof, error: profError } = await supabase
      .from('profiles')
      .select('clinic_id, asaas_wallet_id, commission_model, commission_rate, rental_base_cents')
      .eq('id', parsed.professional_id)
      .single()

    if (profError) {
      throw new Error(`Profissional não encontrado: ${profError.message}`)
    }

    const commission_model = (prof?.commission_model as Payload['commission_model']) || parsed.commission_model
    const commission_rate = (prof?.commission_rate as number | null) ?? parsed.commission_rate ?? 0.5
    const rental_base_cents = (prof?.rental_base_cents as number | null) ?? parsed.rental_base_cents ?? 0

    // Verificar se há indicação B2B ativa e buscar regras de repasse
    const { data: referral } = await supabase
      .from('referrals')
      .select('referring_clinic_id')
      .eq('referred_clinic_id', parsed.clinic_id)
      .maybeSingle()

    // Buscar regras de repasse (percentual configurável)
    const { data: referralRule } = await supabase
      .from('referral_rules')
      .select('platform_referral_percentage')
      .limit(1)
      .maybeSingle()

    // Percentual de repasse B2B (padrão 2.33% = 233 centésimos de porcentagem)
    const referralPercentage = referralRule?.platform_referral_percentage 
      ? referralRule.platform_referral_percentage / 10000 // Converter de centésimos para decimal (233 → 0.0233)
      : 0.0233 // Fallback: 2.33%

    let hasReferral = false
    let referralWalletId: string | undefined = undefined

    if (referral?.referring_clinic_id) {
      hasReferral = true
      // Buscar wallet da clínica indicadora
      const { data: referringClinic } = await supabase
        .from('organizations')
        .select('asaas_wallet_id')
        .eq('id', referral.referring_clinic_id)
        .single()
      
      referralWalletId = referringClinic?.asaas_wallet_id as string | undefined
    }

    // Buscar wallet da clínica indicada
    const { data: clinic } = await supabase
      .from('organizations')
      .select('asaas_wallet_id')
      .eq('id', parsed.clinic_id)
      .single()

    const split = computeSplit({
      ...parsed,
      commission_model,
      commission_rate,
      rental_base_cents,
    }, hasReferral, referralPercentage, referralWalletId)

    // Montar payload de split do Asaas
    const asaasSplitPayload: any[] = []
    
    // 1. Profissional
    if (split.professional_share_cents > 0 && prof?.asaas_wallet_id) {
      asaasSplitPayload.push({
        walletId: prof.asaas_wallet_id,
        totalValue: split.professional_share_cents,
        description: 'Comissão do Profissional',
      })
    }
    
    // 2. Clínica Indicada
    if (split.clinic_share_cents > 0 && clinic?.asaas_wallet_id) {
      asaasSplitPayload.push({
        walletId: clinic.asaas_wallet_id,
        totalValue: split.clinic_share_cents,
        description: 'Receita da Clínica',
      })
    }
    
    // 3. Repasse B2B (se houver indicação)
    if (split.referral_fee_cents > 0 && referralWalletId) {
      asaasSplitPayload.push({
        walletId: referralWalletId,
        totalValue: split.referral_fee_cents,
        description: `Repasse B2B (${(referralPercentage * 100).toFixed(2)}%)`,
      })
    }
    
    // 4. Plataforma (lucro residual)
    if (split.platform_fee_cents > 0) {
      asaasSplitPayload.push({
        walletId: PLATFORM_WALLET_ID,
        totalValue: split.platform_fee_cents,
        description: hasReferral ? 'Taxa da Plataforma (3.66%)' : 'Taxa da Plataforma (5.99%)',
      })
    }

    // Simulação de chamada Asaas (substitua por integração real)
    const asaasResult = {
      simulated: true,
      split: asaasSplitPayload,
      hasReferral,
      referralWalletId: referralWalletId || null,
      amount_cents: parsed.amount_cents,
      ...split,
    }

    // Registrar transação
    const { error: insertError } = await supabase.from('financial_transactions').insert({
      clinic_id: parsed.clinic_id, // ✅ Mudado de organization_id para clinic_id
      appointment_id: parsed.appointment_id,
      professional_id: parsed.professional_id,
      payment_method: parsed.payment_method,
      commission_model,
      amount_cents: parsed.amount_cents,
      platform_fee_cents: split.platform_fee_cents,
      professional_share_cents: split.professional_share_cents,
      clinic_share_cents: split.clinic_share_cents,
      status: 'completed',
      is_fee_ledger_pending: false,
      asaas_wallet_id: prof?.asaas_wallet_id,
      asaas_split_payload: asaasResult,
    })

    if (insertError) {
      throw new Error(`Erro ao registrar transação: ${insertError.message}`)
    }

    return new Response(JSON.stringify({ ok: true, split, asaasResult }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('process-payment error', err)
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Erro desconhecido' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

serve(handler)


