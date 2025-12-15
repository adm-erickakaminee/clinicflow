import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import {
  DollarSign,
  FileText,
  TrendingUp,
  AlertCircle,
  Users,
  Loader2,
  Filter,
  Download,
  Search,
} from 'lucide-react'
import { format, subDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface FinancialTransaction {
  id: string
  clinic_id: string
  professional_id: string
  amount_cents: number
  platform_fee_cents: number
  professional_share_cents: number
  clinic_share_cents: number
  status: string
  created_at: string
  asaas_payment_id: string | null
}

interface B2BReferralAudit {
  referring_clinic_id: string
  referring_clinic_name: string
  referred_clinic_id: string
  referred_clinic_name: string
  total_referral_fee_cents: number
  transaction_count: number
}

interface SuperAdmin {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
}

export function GlobalFinancialAuditView() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([])
  const [b2bAudit, setB2bAudit] = useState<B2BReferralAudit[]>([])
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([])
  const [dateFilter, setDateFilter] = useState<'7d' | '30d' | '90d' | 'all'>('30d')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadAllData()
  }, [dateFilter])

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadTransactions(), loadB2BAudit(), loadSuperAdmins()])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar dados de auditoria')
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async () => {
    try {
      let query = supabase
        .from('financial_transactions')
        .select('id, clinic_id, professional_id, amount_cents, platform_fee_cents, professional_share_cents, clinic_share_cents, status, created_at, asaas_payment_id')
        .order('created_at', { ascending: false })
        .limit(1000)

      // Aplicar filtro de data
      if (dateFilter !== 'all') {
        const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90
        const startDate = subDays(new Date(), days)
        query = query.gte('created_at', startDate.toISOString())
      }

      const { data, error } = await query

      if (error) throw error
      setTransactions((data || []) as FinancialTransaction[])
    } catch (err) {
      console.error('Erro ao carregar transações:', err)
    }
  }

  const loadB2BAudit = async () => {
    try {
      // Buscar todas as referências B2B
      const { data: referrals, error: referralsError } = await supabase
        .from('referrals')
        .select('referring_clinic_id, referred_clinic_id')

      if (referralsError) throw referralsError

      if (!referrals || referrals.length === 0) {
        setB2bAudit([])
        return
      }

      // Buscar nomes das clínicas
      const clinicIds = new Set<string>()
      referrals.forEach((r) => {
        clinicIds.add(r.referring_clinic_id)
        clinicIds.add(r.referred_clinic_id)
      })

      const { data: clinics, error: clinicsError } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', Array.from(clinicIds))

      if (clinicsError) throw clinicsError

      const clinicMap = new Map(clinics?.map((c) => [c.id, c.name]) || [])

      // Calcular repasses B2B (2.33% das transações)
      const { data: transactions, error: txError } = await supabase
        .from('financial_transactions')
        .select('clinic_id, amount_cents')
        .eq('status', 'completed')

      if (txError) throw txError

      // Agrupar por referência
      const auditMap = new Map<string, B2BReferralAudit>()

      for (const referral of referrals) {
        const key = `${referral.referring_clinic_id}-${referral.referred_clinic_id}`
        if (!auditMap.has(key)) {
          auditMap.set(key, {
            referring_clinic_id: referral.referring_clinic_id,
            referring_clinic_name: clinicMap.get(referral.referring_clinic_id) || 'Desconhecida',
            referred_clinic_id: referral.referred_clinic_id,
            referred_clinic_name: clinicMap.get(referral.referred_clinic_id) || 'Desconhecida',
            total_referral_fee_cents: 0,
            transaction_count: 0,
          })
        }

        const audit = auditMap.get(key)!
        // Calcular 2.33% das transações da clínica referida
        const referredTx = (transactions || []).filter((tx) => tx.clinic_id === referral.referred_clinic_id)
        const referralFee = referredTx.reduce((sum, tx) => sum + Math.round(tx.amount_cents * 0.0233), 0)

        audit.total_referral_fee_cents += referralFee
        audit.transaction_count += referredTx.length
      }

      setB2bAudit(Array.from(auditMap.values()).sort((a, b) => b.total_referral_fee_cents - a.total_referral_fee_cents))
    } catch (err) {
      console.error('Erro ao carregar auditoria B2B:', err)
    }
  }

  const loadSuperAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, created_at')
        .eq('role', 'super_admin')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSuperAdmins((data || []) as SuperAdmin[])
    } catch (err) {
      console.error('Erro ao carregar super admins:', err)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100)
  }

  const totalPlatformFees = transactions.reduce((sum, tx) => sum + (tx.platform_fee_cents || 0), 0)
  const totalFixedPayments = 0 // TODO: Calcular baseado em subscription_plans

  const filteredTransactions = useMemo(() => {
    let filtered = transactions

    if (searchQuery) {
      filtered = filtered.filter(
        (tx) =>
          tx.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.clinic_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          tx.asaas_payment_id?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    return filtered
  }, [transactions, searchQuery])

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
        <h2 className="text-2xl font-semibold text-gray-900">Auditoria Financeira Global</h2>
        <p className="text-sm text-gray-600">Rastreamento de pagamentos, Fee Ledger e repasses B2B</p>
      </div>

      {/* KPIs de Auditoria */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <TrendingUp className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-xs text-gray-600 mb-1">Taxas da Plataforma (5.99%)</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalPlatformFees)}</p>
          <p className="text-xs text-gray-500 mt-1">{filteredTransactions.length} transações</p>
        </div>

        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-blue-500" />
            <FileText className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-xs text-gray-600 mb-1">Pagamentos Fixos (Assinaturas)</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalFixedPayments)}</p>
          <p className="text-xs text-gray-500 mt-1">R$ 69,90 × clínicas ativas</p>
        </div>

        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            <AlertCircle className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-xs text-gray-600 mb-1">Repasses B2B (2.33%)</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatCurrency(b2bAudit.reduce((sum, a) => sum + a.total_referral_fee_cents, 0))}
          </p>
          <p className="text-xs text-gray-500 mt-1">{b2bAudit.length} referências ativas</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as '7d' | '30d' | '90d' | 'all')}
              className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
            >
              <option value="7d">Últimos 7 dias</option>
              <option value="30d">Últimos 30 dias</option>
              <option value="90d">Últimos 90 dias</option>
              <option value="all">Todos</option>
            </select>
          </div>

          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por ID, clinic_id ou asaas_payment_id..."
                className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-300 bg-white text-sm text-gray-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Relatório de Repasse B2B */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Auditoria de Repasse B2B (2.33%)</h3>
        </div>

        {b2bAudit.length > 0 ? (
          <div className="space-y-3">
            {b2bAudit.map((audit, index) => (
              <div
                key={`${audit.referring_clinic_id}-${audit.referred_clinic_id}`}
                className="flex items-center justify-between rounded-xl bg-white/70 border border-white/60 p-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {audit.referring_clinic_name} → {audit.referred_clinic_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {audit.transaction_count} transação(ões) processada(s)
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">
                    {formatCurrency(audit.total_referral_fee_cents)}
                  </p>
                  <p className="text-xs text-gray-500">Total repassado</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Nenhum repasse B2B registrado</p>
        )}
      </div>

      {/* Tabela de Transações */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Transações da Plataforma (5.99%)</h3>
          <button className="px-4 py-2 rounded-xl bg-indigo-500 text-white text-sm font-semibold hover:bg-indigo-600 transition flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Data</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Clínica</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Valor Bruto</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Taxa Plataforma</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Asaas ID</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length > 0 ? (
                filteredTransactions.slice(0, 100).map((tx) => (
                  <tr key={tx.id} className="border-b border-gray-100 hover:bg-white/50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-900">{tx.clinic_id.substring(0, 8)}...</td>
                    <td className="py-3 px-4 text-sm font-semibold text-gray-900">
                      {formatCurrency(tx.amount_cents)}
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-green-600">
                      {formatCurrency(tx.platform_fee_cents)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                          tx.status === 'completed'
                            ? 'bg-green-100 text-green-700'
                            : tx.status === 'pending'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600 font-mono">
                      {tx.asaas_payment_id ? tx.asaas_payment_id.substring(0, 12) + '...' : 'N/A'}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-600">
                    Nenhuma transação encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length > 100 && (
          <p className="text-xs text-gray-500 mt-4 text-center">
            Mostrando 100 de {filteredTransactions.length} transações
          </p>
        )}
      </div>

      {/* Gestão de Super Admins */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-6 w-6 text-indigo-500" />
          <h3 className="text-lg font-semibold text-gray-900">Gestão de Super Admins</h3>
        </div>

        {superAdmins.length > 0 ? (
          <div className="space-y-3">
            {superAdmins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between rounded-xl bg-white/70 border border-white/60 p-4"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{admin.full_name || 'Sem nome'}</p>
                  <p className="text-xs text-gray-600">{admin.email || 'Sem email'}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Criado em {format(new Date(admin.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-indigo-100 text-indigo-700">
                    Super Admin
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-600">Nenhum super admin encontrado</p>
        )}
      </div>
    </div>
  )
}
