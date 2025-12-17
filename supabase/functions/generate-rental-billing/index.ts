// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'
import { z } from 'https://esm.sh/zod@3.22.4'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!
const asaasBaseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3'

const supabase = createClient(supabaseUrl, supabaseKey)

/**
 * Edge Function para gerar cobranças fixas mensais (rental) para profissionais
 * Deve ser chamada diariamente via cron job do Supabase
 * 
 * Lógica:
 * 1. Buscar profissionais com commission_model = 'rental' ou 'hybrid'
 * 2. Verificar se hoje é o dia de vencimento (rental_due_day)
 * 3. Gerar link de pagamento (Pix/Cartão) via API Asaas
 * 4. Salvar link no banco para exibição no painel do profissional
 * 5. Enviar notificação da Gaby
 */
async function handler(req: Request): Promise<Response> {
  try {
    const today = new Date()
    const dayOfMonth = today.getDate()

    console.log(`🔄 generate-rental-billing - Verificando cobranças para dia ${dayOfMonth}...`)

    // Buscar profissionais com modelo rental ou hybrid que têm vencimento hoje
    const { data: professionals, error: profError } = await supabase
      .from('professionals')
      .select(`
        id,
        name,
        clinic_id,
        commission_model,
        rental_base_cents,
        rental_due_day,
        profiles!inner (
          id,
          asaas_wallet_id,
          email
        )
      `)
      .in('commission_model', ['rental', 'hybrid'])
      .eq('rental_due_day', dayOfMonth)
      .not('rental_base_cents', 'is', null)
      .gt('rental_base_cents', 0)

    if (profError) {
      throw new Error(`Erro ao buscar profissionais: ${profError.message}`)
    }

    if (!professionals || professionals.length === 0) {
      console.log('ℹ️ Nenhum profissional com cobrança vencendo hoje')
      return new Response(JSON.stringify({ ok: true, generated: 0 }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`📋 Encontrados ${professionals.length} profissionais com cobrança vencendo hoje`)

    const results: any[] = []

    for (const prof of professionals) {
      const profile = (prof as any).profiles?.[0]
      if (!profile || !profile.asaas_wallet_id) {
        console.warn(`⚠️ Profissional ${prof.name} não tem asaas_wallet_id, pulando...`)
        continue
      }

      try {
        // Verificar se já existe cobrança pendente para este mês
        const { data: existingBilling } = await supabase
          .from('professional_rental_billings')
          .select('id')
          .eq('professional_id', prof.id)
          .eq('status', 'pending')
          .gte('due_date', new Date(today.getFullYear(), today.getMonth(), 1).toISOString())
          .maybeSingle()

        if (existingBilling) {
          console.log(`ℹ️ Cobrança já existe para ${prof.name} este mês, pulando...`)
          continue
        }

        // Gerar link de pagamento via Asaas
        const billingAmount = prof.rental_base_cents / 100 // Converter centavos para reais

        const asaasPayload = {
          customer: profile.asaas_wallet_id,
          billingType: 'PIX', // Pode ser PIX, BOLETO ou CREDIT_CARD
          value: billingAmount,
          dueDate: today.toISOString().split('T')[0], // YYYY-MM-DD
          description: `Mensalidade Fixa - ${prof.name} - ${today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
        }

        const response = await fetch(`${asaasBaseUrl}/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'access_token': asaasApiKey,
          },
          body: JSON.stringify(asaasPayload),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ Erro ao gerar cobrança Asaas para ${prof.name}:`, errorText)
          continue
        }

        const asaasData = await response.json()

        // Salvar cobrança no banco
        const { error: billingError } = await supabase
          .from('professional_rental_billings')
          .insert({
            professional_id: prof.id,
            clinic_id: prof.clinic_id,
            amount_cents: prof.rental_base_cents,
            due_date: today.toISOString().split('T')[0],
            status: 'pending',
            asaas_payment_id: asaasData.id,
            payment_link: asaasData.invoiceUrl || asaasData.pixQrCode || '',
            pix_qr_code: asaasData.pixQrCode || '',
            pix_copy_paste: asaasData.pixCopiaECola || '',
          })

        if (billingError) {
          console.error(`❌ Erro ao salvar cobrança no banco para ${prof.name}:`, billingError)
          continue
        }

        console.log(`✅ Cobrança gerada para ${prof.name}: R$ ${billingAmount.toFixed(2)}`)
        results.push({
          professionalId: prof.id,
          professionalName: prof.name,
          amount: billingAmount,
          paymentLink: asaasData.invoiceUrl || asaasData.pixQrCode,
        })

        // TODO: Enviar notificação da Gaby via WhatsApp ou in-app
        // A Gaby deve aparecer no painel do profissional: "Oiee! Hoje é o dia da sua contribuição fixa mensal..."
      } catch (err) {
        console.error(`❌ Erro ao processar profissional ${prof.name}:`, err)
        continue
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        generated: results.length,
        billings: results,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error: any) {
    console.error('❌ generate-rental-billing - Erro:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Erro ao gerar cobranças' }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
}

serve(handler)

