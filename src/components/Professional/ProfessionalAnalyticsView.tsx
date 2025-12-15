import { useState, useEffect } from 'react'
import { TrendingUp, DollarSign, Package, Lightbulb, Calendar, PieChart, Minus, Building2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ProfessionalAnalyticsViewProps {
  professionalId: string
  clinicId: string
}

interface RevenueDistribution {
  grossAmount: number // Valor bruto recebido
  platformFee: number // Taxa de maquininha descontada
  clinicFee: number // Taxa da clínica descontada
  netRevenue: number // Valor líquido após descontos
  allocatedToCosts: number // Distribuído para custos fixos
  allocatedToGoals: number // Distribuído para metas
  allocatedToInvestment: number // Distribuído para investimento
}

interface AnalyticsData {
  grossRevenue: number
  monthlyRevenue: number
  weeklyRevenue: number
  topProducts: Array<{ id: string; name: string; sales: number; revenue_cents: number }>
  topServices: Array<{ id: string; name: string; count: number }>
  gabySuggestions: string[]
  distribution: RevenueDistribution | null
}

export function ProfessionalAnalyticsView({ professionalId, clinicId }: ProfessionalAnalyticsViewProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'month' | 'week'>('month')
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    grossRevenue: 0,
    monthlyRevenue: 0,
    weeklyRevenue: 0,
    topProducts: [],
    topServices: [],
    gabySuggestions: [],
    distribution: null
  })

  useEffect(() => {
    const loadAnalytics = async () => {
      if (!professionalId || !clinicId) {
        setLoading(false)
        return
      }

      try {
        const now = new Date()
        const monthStart = startOfMonth(now)
        const monthEnd = endOfMonth(now)
        const weekStart = startOfWeek(now, { locale: ptBR })
        const weekEnd = endOfWeek(now, { locale: ptBR })

        // Buscar transações financeiras do profissional (com todos os dados necessários)
        const { data: transactions, error: transError } = await supabase
          .from('financial_transactions')
          .select('amount_cents, platform_fee_cents, clinic_share_cents, professional_share_cents, created_at, appointment_id')
          .eq('professional_id', professionalId)
          .eq('clinic_id', clinicId)
          .eq('status', 'completed')

        if (transError) {
          console.error('Erro ao carregar transações:', transError)
        }

        // Buscar metas do profissional para calcular distribuição
        const { data: goals } = await supabase
          .from('professional_goals')
          .select('*')
          .eq('profile_id', professionalId)
          .maybeSingle()

        // Calcular rendimentos
        const allRevenue = (transactions || []).reduce((sum, t) => sum + (t.professional_share_cents || 0), 0)
        const monthlyTransactions = (transactions || []).filter(t => {
          const date = new Date(t.created_at)
          return date >= monthStart && date <= monthEnd
        })
        const weeklyTransactions = (transactions || []).filter(t => {
          const date = new Date(t.created_at)
          return date >= weekStart && date <= weekEnd
        })
        
        const monthlyRevenue = monthlyTransactions.reduce((sum, t) => sum + (t.professional_share_cents || 0), 0)
        const weeklyRevenue = weeklyTransactions.reduce((sum, t) => sum + (t.professional_share_cents || 0), 0)

        // Calcular distribuição mensal dos valores recebidos
        let distribution: RevenueDistribution | null = null
        if (monthlyTransactions.length > 0 && goals) {
          const grossAmount = monthlyTransactions.reduce((sum, t) => sum + (t.amount_cents || 0), 0)
          const platformFee = monthlyTransactions.reduce((sum, t) => sum + (t.platform_fee_cents || 0), 0)
          const clinicFee = monthlyTransactions.reduce((sum, t) => sum + (t.clinic_share_cents || 0), 0)
          const netRevenue = monthlyRevenue // Já é o valor após descontar taxas

          // Calcular distribuição baseada nas metas
          const totalFixedCosts = (goals.fixed_cost_rent_cents || 0) +
            (goals.fixed_cost_utilities_cents || 0) +
            (goals.fixed_cost_transport_cents || 0) +
            (goals.fixed_cost_salary_cents || 0) +
            (goals.fixed_cost_other_cents || 0)

          const totalNeeded = totalFixedCosts + (goals.monthly_income_goal_cents || 0) + (goals.profit_margin_cents || 0)

          // Distribuição proporcional
          let allocatedToCosts = 0
          let allocatedToGoals = 0
          let allocatedToInvestment = 0

          if (totalNeeded > 0 && netRevenue > 0) {
            allocatedToCosts = Math.round((netRevenue * totalFixedCosts) / totalNeeded)
            allocatedToGoals = Math.round((netRevenue * (goals.monthly_income_goal_cents || 0)) / totalNeeded)
            allocatedToInvestment = Math.round((netRevenue * (goals.profit_margin_cents || 0)) / totalNeeded)
          }

          distribution = {
            grossAmount,
            platformFee,
            clinicFee,
            netRevenue,
            allocatedToCosts,
            allocatedToGoals,
            allocatedToInvestment
          }
        }

        // Buscar produtos mais vendidos (via appointments -> checkout)
        // Nota: Esta é uma implementação simplificada. Em produção, você pode ter uma tabela de itens vendidos
        const { data: appointments } = await supabase
          .from('appointments')
          .select('id, service_id, created_at')
          .eq('professional_id', professionalId)
          .eq('clinic_id', clinicId)
          .gte('created_at', subMonths(now, 1).toISOString())

        // Buscar serviços mais realizados
        const serviceCounts: Record<string, number> = {}
        appointments?.forEach(apt => {
          if (apt.service_id) {
            serviceCounts[apt.service_id] = (serviceCounts[apt.service_id] || 0) + 1
          }
        })

        // Buscar informações dos serviços
        const serviceIds = Object.keys(serviceCounts)
        const { data: services } = await supabase
          .from('services')
          .select('id, name')
          .in('id', serviceIds)

        const topServices = (services || [])
          .map(s => ({
            id: s.id,
            name: s.name,
            count: serviceCounts[s.id] || 0
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5)

        // Buscar produtos mais vendidos (simplificado - em produção seria via tabela de vendas)
        const { data: products } = await supabase
          .from('products')
          .select('id, name')
          .eq('clinic_id', clinicId)
          .eq('is_active', true)
          .limit(5)

        const topProducts = (products || []).map(p => ({
          id: p.id,
          name: p.name,
          sales: 0, // Simplificado
          revenue_cents: 0 // Simplificado
        }))

        // Sugestões da Gaby baseadas em retenção de clientes
        const { data: retentionData } = await supabase
          .from('client_retention_data')
          .select('client_id, service_id, last_visit_date, service_cycle_days')
          .eq('clinic_id', clinicId)

        const suggestions: string[] = []
        if (retentionData && retentionData.length > 0) {
          // Buscar todos os clientes e serviços de uma vez para evitar múltiplas queries
          const clientIds = retentionData.map(r => r.client_id).filter(Boolean)
          const serviceIds = retentionData.map(r => r.service_id).filter(Boolean)

          const [clientsData, servicesData] = await Promise.all([
            clientIds.length > 0
              ? supabase
                  .from('clients')
                  .select('id, full_name')
                  .in('id', clientIds)
              : Promise.resolve({ data: [], error: null }),
            serviceIds.length > 0
              ? supabase
                  .from('services')
                  .select('id, name')
                  .in('id', serviceIds)
              : Promise.resolve({ data: [], error: null })
          ])

          const clientsMap = new Map((clientsData.data || []).map(c => [c.id, c.full_name]))
          const servicesMap = new Map((servicesData.data || []).map(s => [s.id, s.name]))

          retentionData.forEach(retention => {
            if (retention.last_visit_date) {
              const lastVisit = new Date(retention.last_visit_date)
              const daysSinceLastVisit = Math.floor((now.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24))
              const cycleDays = retention.service_cycle_days || 45

              if (daysSinceLastVisit >= cycleDays) {
                const clientName = clientsMap.get(retention.client_id)
                const serviceName = servicesMap.get(retention.service_id)

                if (clientName && serviceName) {
                  suggestions.push(
                    `${clientName} está atrasado para retornar ao serviço "${serviceName}" (${daysSinceLastVisit} dias desde a última visita)`
                  )
                }
              }
            }
          })
        }

        setAnalytics({
          grossRevenue: allRevenue,
          monthlyRevenue,
          weeklyRevenue,
          topProducts,
          topServices,
          gabySuggestions: suggestions.slice(0, 5),
          distribution
        })
      } catch (err) {
        console.error('Erro ao carregar analytics:', err)
        toast.error('Erro ao carregar relatórios')
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [professionalId, clinicId, toast])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(cents / 100)
  }

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando relatórios...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-6 w-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Relatórios e KPIs</h3>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPeriod('week')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                period === 'week'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white/60 text-gray-700 hover:bg-white/80'
              }`}
            >
              Semana
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                period === 'month'
                  ? 'bg-gray-900 text-white'
                  : 'bg-white/60 text-gray-700 hover:bg-white/80'
              }`}
            >
              Mês
            </button>
          </div>
        </div>

        {/* Rendimento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/80 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <p className="text-sm text-gray-600">Rendimento Total</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.grossRevenue)}</p>
          </div>

          <div className="bg-white/80 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <p className="text-sm text-gray-600">Rendimento Mensal</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.monthlyRevenue)}</p>
          </div>

          <div className="bg-white/80 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <p className="text-sm text-gray-600">Rendimento Semanal</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.weeklyRevenue)}</p>
          </div>
        </div>
      </div>

      {/* Distribuição dos Valores Recebidos */}
      {analytics.distribution && period === 'month' && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <PieChart className="h-6 w-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Distribuição dos Valores Recebidos (Mensal)</h3>
          </div>

          <div className="space-y-4">
            {/* Valor Bruto */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-green-900">Valor Bruto Recebido</p>
                  <p className="text-xs text-green-700">Total de vendas realizadas</p>
                </div>
                <p className="text-xl font-bold text-green-900">{formatCurrency(analytics.distribution.grossAmount)}</p>
              </div>
            </div>

            {/* Descontos */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                <Minus className="h-4 w-4" />
                Descontos Aplicados
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 ml-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900">Taxa de Maquininha</p>
                    <p className="text-xs text-red-700">Taxa da plataforma de pagamento</p>
                  </div>
                  <p className="text-lg font-bold text-red-900">-{formatCurrency(analytics.distribution.platformFee)}</p>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 ml-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-900 flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Taxa da Clínica
                    </p>
                    <p className="text-xs text-red-700">Comissão/aluguel pago à clínica</p>
                  </div>
                  <p className="text-lg font-bold text-red-900">-{formatCurrency(analytics.distribution.clinicFee)}</p>
                </div>
              </div>
            </div>

            {/* Valor Líquido */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-blue-900">Valor Líquido Disponível</p>
                  <p className="text-xs text-blue-700">Após descontar taxas</p>
                </div>
                <p className="text-2xl font-bold text-blue-900">{formatCurrency(analytics.distribution.netRevenue)}</p>
              </div>
            </div>

            {/* Distribuição nas Metas */}
            {analytics.distribution.netRevenue > 0 && (
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-4">Distribuição Proporcional nas Metas:</p>
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-purple-900">Custos Fixos</p>
                        <p className="text-xs text-purple-700">Aluguel, utilidades, transporte, salário, outros</p>
                      </div>
                      <p className="text-lg font-bold text-purple-900">{formatCurrency(analytics.distribution.allocatedToCosts)}</p>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-green-900">Meta de Renda</p>
                        <p className="text-xs text-green-700">Valor destinado para atingir sua meta mensal</p>
                      </div>
                      <p className="text-lg font-bold text-green-900">{formatCurrency(analytics.distribution.allocatedToGoals)}</p>
                    </div>
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-amber-900">Reinvestimento</p>
                        <p className="text-xs text-amber-700">Margem de lucro para crescimento</p>
                      </div>
                      <p className="text-lg font-bold text-amber-900">{formatCurrency(analytics.distribution.allocatedToInvestment)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Top Serviços e Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Serviços */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-6 w-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Serviços</h3>
          </div>
          {analytics.topServices.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum serviço realizado ainda</p>
          ) : (
            <div className="space-y-2">
              {analytics.topServices.map((service, index) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{service.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{service.count}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Produtos */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Package className="h-6 w-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Top 5 Produtos</h3>
          </div>
          {analytics.topProducts.length === 0 ? (
            <p className="text-sm text-gray-500">Nenhum produto vendido ainda</p>
          ) : (
            <div className="space-y-2">
              {analytics.topProducts.map((product, index) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Sugestões da Gaby */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Lightbulb className="h-6 w-6 text-amber-500" />
          <h3 className="text-lg font-semibold text-gray-900">Sugestões da Gaby</h3>
        </div>
        {analytics.gabySuggestions.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma sugestão no momento</p>
        ) : (
          <div className="space-y-3">
            {analytics.gabySuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="bg-amber-50 border border-amber-200 rounded-lg p-3"
              >
                <p className="text-sm text-amber-900">{suggestion}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

