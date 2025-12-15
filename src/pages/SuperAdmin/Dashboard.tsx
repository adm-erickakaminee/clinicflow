import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

interface OrgRow {
  id: string
  name: string
  status?: 'active' | 'suspended' | 'delinquent' | null
  created_at?: string
}

interface PendingFee {
  id: string
  clinic_id: string // ✅ Mudado de organization_id para clinic_id
  amount_cents: number
  platform_fee_cents: number
}

export function SuperAdminDashboard() {
  const toast = useToast()
  const [userId, setUserId] = useState<string | null>(null)
  const [orgs, setOrgs] = useState<OrgRow[]>([])
  const [pendingFees, setPendingFees] = useState<PendingFee[]>([])
  const [mrr, setMrr] = useState<number>(0)
  const [churn, setChurn] = useState<number>(0)
  const [twoFaCode, setTwoFaCode] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null)
    })
  }, [])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: orgsData } = await supabase
          .from('organizations')
          .select('id, name, status, created_at')
        setOrgs((orgsData as OrgRow[]) || [])

        const { data: fees } = await supabase
          .from('financial_transactions')
          .select('id, clinic_id, amount_cents, platform_fee_cents') // ✅ Mudado de organization_id para clinic_id
          .eq('is_fee_ledger_pending', true)
        setPendingFees((fees as PendingFee[]) || [])

        const { data: mrrData } = await supabase
          .from('financial_transactions')
          .select('amount_cents')
          .eq('status', 'completed')
          .gte('created_at', new Date(new Date().setDate(new Date().getDate() - 30)).toISOString())
        const mrrSum = (mrrData || []).reduce((acc, r: any) => acc + (r.amount_cents || 0), 0)
        setMrr(mrrSum)

        // churn simples: suspensas / total
        const suspended = (orgsData || []).filter((o: any) => o.status === 'suspended').length
        const total = orgsData?.length || 1
        setChurn((suspended / total) * 100)
      } catch (err) {
        console.warn(err)
        toast.error('Falha ao carregar dados do Super Admin')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [toast])

  const feeTotal = useMemo(
    () => pendingFees.reduce((acc, f) => acc + (f.platform_fee_cents || 0), 0),
    [pendingFees]
  )

  const impersonateUser = async (targetUserId: string, targetOrgId: string) => {
    if (!twoFaCode || twoFaCode.length < 4) {
      toast.error('2FA obrigatório para impersonate')
      return
    }
    try {
      // Registrar auditoria
      if (userId) {
        await supabase.from('audit_logs').insert({
          super_admin_id: userId,
          target_user_id: targetUserId,
          target_organization_id: targetOrgId,
          action: 'impersonate',
        })
      }
      // Chamada para função edge (deverá emitir token temporário)
      const { error } = await supabase.functions.invoke('impersonate-login', {
        body: {
          super_admin_id: userId,
          target_user_id: targetUserId,
          target_organization_id: targetOrgId,
          two_fa_code: twoFaCode,
        },
      })
      if (error) throw error
      toast.success('Impersonate iniciado (token temporário emitido)')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao impersonar'
      toast.error(msg)
    }
  }

  const blockOrganization = async (orgId: string) => {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: 'suspended' })
        .eq('id', orgId)
      if (error) throw error
      setOrgs((prev) => prev.map((o) => (o.id === orgId ? { ...o, status: 'suspended' } : o)))
      toast.success('Organização suspensa')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao suspender')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-4 max-w-5xl mx-auto space-y-4">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">Super Admin</p>
          <h1 className="text-xl font-semibold">Dashboard Global</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
            placeholder="2FA code"
            value={twoFaCode}
            onChange={(e) => setTwoFaCode(e.target.value)}
          />
        </div>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">MRR (30d)</p>
          <p className="text-2xl font-semibold">R$ {(mrr / 100).toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Churn (suspensas/total)</p>
          <p className="text-2xl font-semibold">{churn.toFixed(1)}%</p>
        </div>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
          <p className="text-xs text-slate-400">Fee Ledger Pending</p>
          <p className="text-2xl font-semibold">R$ {(feeTotal / 100).toFixed(2)}</p>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-200">Clínicas</h2>
          <p className="text-xs text-slate-400">Impersonate + Suspender</p>
        </div>
        <div className="space-y-2">
          {orgs.map((org) => (
            <div
              key={org.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
            >
              <div>
                <p className="text-sm font-semibold">{org.name}</p>
                <p className="text-xs text-slate-400">Status: {org.status || 'active'}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => impersonateUser(org.id, org.id)}
                  disabled={!twoFaCode}
                >
                  Impersonate
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => blockOrganization(org.id)}
                >
                  Suspender
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Status Técnico</h2>
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2 text-sm text-slate-300">
          <p>Supabase DB: OK (simulado)</p>
          <p>Edge Functions: OK (simulado)</p>
          <p>Última verificação: tempo real no client</p>
        </div>
      </section>
    </div>
  )
}


