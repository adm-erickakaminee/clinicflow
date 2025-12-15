import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Users, Building2, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PlatformMetrics {
  ttv: number // Total Transacted Value (últimos 30 dias)
  mrr: number // Monthly Recurring Revenue
  churnRate: number // Taxa de churn
  activeClinics: number
  pendingSetupClinics: number
  totalClinics: number
}

interface TopDebtClinic {
  clinic_id: string
  clinic_name: string
  total_debt_cents: number
  transaction_count: number
}

interface ClinicGrowth {
  date: string
  new_clinics: number
  activated_clinics: number
}

export function PlatformDashboardView() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null)
  const [topDebtClinics, setTopDebtClinics] = useState<TopDebtClinic[]>([])
  const [clinicGrowth, setClinicGrowth] = useState<ClinicGrowth[]>([])

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadMetrics(),
        loadTopDebtClinics(),
        loadClinicGrowth(),
      ])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar dados do dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadMetrics = async () => {
    try {
      // TTV - Total Transacted Value (últimos 30 dias)
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: ttvData, error: ttvError } = await supabase
        .from('financial_transactions')
        .select('amount_cents')
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (ttvError) throw ttvError
      const ttv = (ttvData || []).reduce((sum, tx) => sum + (tx.amount_cents || 0), 0)

      // MRR - Monthly Recurring Revenue (assinaturas ativas)
      const { data: activeOrgs, error: mrrError } = await supabase
        .from('organizations')
        .select('subscription_plan_id')
        .eq('status', 'active')

      if (mrrError) throw mrrError

      // Buscar planos das organizações ativas
      const planIds = (activeOrgs || []).map((o) => o.subscription_plan_id).filter(Boolean)
      let mrr = 0

      if (planIds.length > 0) {
        const { data: plans, error: plansError } = await supabase
          .from('subscription_plans')
          .select('base_price_cents')
          .in('id', planIds)

        if (!plansError && plans) {
          mrr = plans.reduce((sum, p) => sum + (p.base_price_cents || 0), 0)
        }
      }

      // Estatísticas de Clínicas
      const { data: allOrgs, error: orgsError } = await supabase
        .from('organizations')
        .select('status')

      if (orgsError) throw orgsError

      const activeClinics = (allOrgs || []).filter((o) => o.status === 'active').length
      const pendingSetupClinics = (allOrgs || []).filter((o) => o.status === 'pending_setup').length
      const suspendedClinics = (allOrgs || []).filter((o) => o.status === 'suspended').length
      const totalClinics = allOrgs?.length || 0

      // Churn Rate (suspensas / total)
      const churnRate = totalClinics > 0 ? (suspendedClinics / totalClinics) * 100 : 0

      setMetrics({
        ttv,
        mrr,
        churnRate,
        activeClinics,
        pendingSetupClinics,
        totalClinics,
      })
    } catch (err) {
      console.error('Erro ao carregar métricas:', err)
    }
  }

  const loadTopDebtClinics = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('clinic_id, platform_fee_cents')
        .eq('is_fee_ledger_pending', true)

      if (error) throw error

      // Agrupar por clínica
      const debtMap = new Map<string, { total: number; count: number }>()
      for (const tx of data || []) {
        if (!tx.clinic_id) continue
        const existing = debtMap.get(tx.clinic_id) || { total: 0, count: 0 }
        debtMap.set(tx.clinic_id, {
          total: existing.total + (tx.platform_fee_cents || 0),
          count: existing.count + 1,
        })
      }

      // Buscar nomes das clínicas
      const clinicIds = Array.from(debtMap.keys())
      if (clinicIds.length === 0) {
        setTopDebtClinics([])
        return
      }

      const { data: clinics, error: clinicsError } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', clinicIds)

      if (clinicsError) throw clinicsError

      // Montar lista ordenada por dívida
      const topDebt: TopDebtClinic[] = Array.from(debtMap.entries())
        .map(([clinic_id, data]) => {
          const clinic = clinics?.find((c) => c.id === clinic_id)
          return {
            clinic_id,
            clinic_name: clinic?.name || 'Clínica Desconhecida',
            total_debt_cents: data.total,
            transaction_count: data.count,
          }
        })
        .sort((a, b) => b.total_debt_cents - a.total_debt_cents)
        .slice(0, 10)

      setTopDebtClinics(topDebt)
    } catch (err) {
      console.error('Erro ao carregar top dívidas:', err)
    }
  }

  const loadClinicGrowth = async () => {
    try {
      // Últimos 30 dias de crescimento
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data: newClinics, error: newError } = await supabase
        .from('organizations')
        .select('created_at, status')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (newError) throw newError

      // Agrupar por dia
      const growthMap = new Map<string, { new: number; activated: number }>()

      for (const clinic of newClinics || []) {
        const date = format(new Date(clinic.created_at), 'yyyy-MM-dd')
        const existing = growthMap.get(date) || { new: 0, activated: 0 }
        growthMap.set(date, {
          new: existing.new + 1,
          activated: existing.activated + (clinic.status === 'active' ? 1 : 0),
        })
      }

      const growth: ClinicGrowth[] = Array.from(growthMap.entries())
        .map(([date, data]) => ({
          date,
          new_clinics: data.new,
          activated_clinics: data.activated,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))

      setClinicGrowth(growth)
    } catch (err) {
      console.error('Erro ao carregar crescimento:', err)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Dashboard da Plataforma</h2>
        <p className="text-sm text-gray-600">Monitoramento financeiro e expansão global</p>
      </div>

      {/* KPIs Principais */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <TrendingUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-gray-600 mb-1">TTV (30 dias)</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.ttv)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Transacted Value</p>
          </div>

          <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-5 w-5 text-blue-500" />
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xs text-gray-600 mb-1">MRR</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(metrics.mrr)}</p>
            <p className="text-xs text-gray-500 mt-1">Monthly Recurring Revenue</p>
          </div>

          <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Taxa de Churn</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.churnRate.toFixed(1)}%</p>
            <p className="text-xs text-gray-500 mt-1">Clínicas suspensas</p>
          </div>

          <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
            <div className="flex items-center justify-between mb-2">
              <Building2 className="h-5 w-5 text-purple-500" />
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-xs text-gray-600 mb-1">Clínicas Ativas</p>
            <p className="text-2xl font-bold text-gray-900">{metrics.activeClinics}</p>
            <p className="text-xs text-gray-500 mt-1">
              {metrics.pendingSetupClinics} pendentes de setup
            </p>
          </div>
        </div>
      )}

      {/* Top 10 Clínicas com Maior Dívida no Fee Ledger */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <AlertTriangle className="h-6 w-6 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900">Top 10 Clínicas com Maior Dívida (Fee Ledger)</h3>
        </div>

        {topDebtClinics.length > 0 ? (
          <div className="space-y-3">
            {topDebtClinics.map((clinic, index) => (
              <div
                key={clinic.clinic_id}
                className="flex items-center justify-between rounded-xl bg-white/70 border border-white/60 p-4"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{clinic.clinic_name}</p>
                    <p className="text-xs text-gray-600">
                      {clinic.transaction_count} transação(ões) pendente(s)
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-red-600">
                    {formatCurrency(clinic.total_debt_cents)}
                  </p>
                  <p className="text-xs text-gray-500">Dívida total</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Nenhuma dívida pendente no Fee Ledger</p>
        )}
      </div>

      {/* Gráfico de Expansão (Novos Tenants vs Onboarding) */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Crescimento de Clínicas (Últimos 30 dias)</h3>
        </div>

        {clinicGrowth.length > 0 ? (
          <div className="space-y-2">
            {clinicGrowth.map((day) => (
              <div
                key={day.date}
                className="flex items-center justify-between rounded-xl bg-white/70 border border-white/60 p-3"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {format(new Date(day.date), "dd 'de' MMMM", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-blue-600">{day.new_clinics}</p>
                    <p className="text-xs text-gray-500">Novas</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">{day.activated_clinics}</p>
                    <p className="text-xs text-gray-500">Ativadas</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Nenhum crescimento registrado nos últimos 30 dias</p>
        )}
      </div>
    </div>
  )
}
