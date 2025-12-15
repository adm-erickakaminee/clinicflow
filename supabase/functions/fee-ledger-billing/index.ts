// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const supabase = createClient(supabaseUrl, serviceRole)

async function handler(): Promise<Response> {
  try {
    // Busca todas as transações com fee pendente
    const { data: rows, error } = await supabase
      .from('financial_transactions')
      .select('id, clinic_id, platform_fee_cents') // ✅ Mudado de organization_id para clinic_id
      .eq('is_fee_ledger_pending', true)

    if (error) {
      throw new Error(error.message)
    }

    const byOrg = new Map<string, { ids: string[]; total: number }>()
    for (const row of rows || []) {
      const org = row.clinic_id // ✅ Mudado de organization_id para clinic_id
      if (!org) continue
      if (!byOrg.has(org)) byOrg.set(org, { ids: [], total: 0 })
      const entry = byOrg.get(org)!
      entry.ids.push(row.id)
      entry.total += row.platform_fee_cents || 0
    }

    const results: any[] = []

    for (const [orgId, info] of byOrg.entries()) {
      // Simula geração de boleto Asaas
      const billingRef = `simulated-boleto-${orgId}-${Date.now()}`
      results.push({ clinic_id: orgId, total_cents: info.total, billing_ref: billingRef }) // ✅ Mudado de organization_id para clinic_id

      // Atualiza as transações como cobradas
      const { error: updError } = await supabase
        .from('financial_transactions')
        .update({
          status: 'billed',
          is_fee_ledger_pending: false,
          asaas_split_payload: { billing_ref: billingRef, total_cents: info.total },
          updated_at: new Date().toISOString(),
        })
        .in('id', info.ids)

      if (updError) {
        throw new Error(`Erro ao atualizar transações: ${updError.message}`)
      }
    }

    return new Response(JSON.stringify({ ok: true, billed: results }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('fee-ledger-billing error', err)
    return new Response(JSON.stringify({ ok: false, error: err?.message || 'Erro' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}

// Pode ser chamado via cron (supabase scheduler) ou manualmente
serve(handler)


