import { useState, useEffect, useMemo } from 'react'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  format,
  differenceInDays,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { useScheduler } from '../context/SchedulerContext'
import { useToast } from '../components/ui/Toast'
import {
  TrendingUp,
  DollarSign,
  Target,
  Users,
  Award,
  AlertTriangle,
  Clock,
  Calendar,
  BarChart3,
  TrendingDown,
} from 'lucide-react'
import { eachDayOfInterval, getDay, isToday, isSameDay } from 'date-fns'

type PeriodType = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year'

interface DateRange {
  start: Date
  end: Date
  label: string
}

interface FinancialMetrics {
  totalRevenueCents: number
  clinicShareCents: number
  professionalShareCents: number
  platformFeeCents: number
  monthlyGoalCents: number
  goalProgress: number
}

interface TopProfessional {
  professional_id: string
  professional_name: string
  clinic_share_cents: number
  transaction_count: number
  goalProgress?: number
}

interface ClientMetrics {
  mostValuableClient: {
    client_id: string
    client_name: string
    total_spent_cents: number
  } | null
  retentionRate: number
  newClients: number
}

interface GabyAlert {
  id: string
  rule_type: string
  description: string
  severity: 'critical' | 'warning' | 'info'
}

interface AppointmentRisk {
  id: string
  client_name: string
  start_time: string
  service_name: string
  risk_score: number
  reason: string
}

interface IdleTimeSlot {
  day_of_week: number
  hour: number
  idle_hours: number
  potential_revenue_cents: number
}

interface RevenueEvolution {
  period: string
  current: number
  previous: number
  change: number
}

export function AdminAnalyticsView() {
  const { currentUser } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<PeriodType>('month')
  const [dateRange, setDateRange] = useState<DateRange | null>(null)
  const [financialMetrics, setFinancialMetrics] = useState<FinancialMetrics>({
    totalRevenueCents: 0,
    clinicShareCents: 0,
    professionalShareCents: 0,
    platformFeeCents: 0,
    monthlyGoalCents: 0,
    goalProgress: 0,
  })
  const [topProfessionals, setTopProfessionals] = useState<TopProfessional[]>([])
  const [clientMetrics, setClientMetrics] = useState<ClientMetrics>({
    mostValuableClient: null,
    retentionRate: 0,
    newClients: 0,
  })
  const [gabyAlerts, setGabyAlerts] = useState<GabyAlert[]>([])
  const [appointmentRisks, setAppointmentRisks] = useState<AppointmentRisk[]>([])
  const [idleTimeSlots, setIdleTimeSlots] = useState<IdleTimeSlot[]>([])
  const [revenueEvolution, setRevenueEvolution] = useState<RevenueEvolution | null>(null)
  const [occupationRate, setOccupationRate] = useState(0)
  const [periodAppointments, setPeriodAppointments] = useState<any[]>([])

  const clinicId = currentUser?.clinicId

  // Calcular range de datas baseado no período selecionado
  const calculateDateRange = (periodType: PeriodType): DateRange => {
    const now = new Date()
    let start: Date
    let end: Date
    let label: string

    switch (periodType) {
      case 'day':
        start = startOfDay(now)
        end = endOfDay(now)
        label = format(now, "dd 'de' MMMM", { locale: ptBR })
        break
      case 'week':
        start = startOfWeek(now, { weekStartsOn: 1 })
        end = endOfWeek(now, { weekStartsOn: 1 })
        label = `Semana de ${format(start, 'dd/MM')} a ${format(end, 'dd/MM')}`
        break
      case 'month':
        start = startOfMonth(now)
        end = endOfMonth(now)
        label = format(now, "MMMM 'de' yyyy", { locale: ptBR })
        break
      case 'quarter':
        start = startOfQuarter(now)
        end = endOfQuarter(now)
        const quarter = Math.floor(now.getMonth() / 3) + 1
        label = `${quarter}º Trimestre de ${format(now, 'yyyy')}`
        break
      case 'semester':
        const semester = now.getMonth() < 6 ? 1 : 2
        start = new Date(now.getFullYear(), semester === 1 ? 0 : 6, 1)
        end = new Date(now.getFullYear(), semester === 1 ? 5 : 11, 31, 23, 59, 59)
        label = `${semester}º Semestre de ${format(now, 'yyyy')}`
        break
      case 'year':
        start = startOfYear(now)
        end = endOfYear(now)
        label = format(now, 'yyyy')
        break
    }

    return { start, end, label }
  }

  // Calcular range do período anterior para comparação
  const calculatePreviousRange = (currentRange: DateRange): DateRange => {
    const daysDiff = differenceInDays(currentRange.end, currentRange.start)
    return {
      start: subDays(currentRange.start, daysDiff + 1),
      end: subDays(currentRange.start, 1),
      label: 'Período Anterior',
    }
  }

  useEffect(() => {
    const range = calculateDateRange(period)
    setDateRange(range)
  }, [period])

  useEffect(() => {
    if (!clinicId || !dateRange) {
      setLoading(false)
      return
    }

    loadAllMetrics()
  }, [clinicId, dateRange, toast])

  const loadAllMetrics = async () => {
    if (!clinicId || !dateRange) return

    setLoading(true)
    try {
      const startISO = dateRange.start.toISOString()
      const endISO = dateRange.end.toISOString()
      const previousRange = calculatePreviousRange(dateRange)

      // 1. Carregar métricas financeiras
      await loadFinancialMetrics(startISO, endISO)

      // 2. Carregar ranking de profissionais
      await loadTopProfessionals(startISO, endISO)

      // 3. Carregar métricas de clientes
      await loadClientMetrics(startISO, endISO)

      // 4. Carregar alertas da Gaby
      await loadGabyAlerts()

      // 5. Carregar riscos de cancelamento
      await loadAppointmentRisks()

      // 6. Carregar horas ociosas
      await loadIdleTimeSlots(startISO, endISO)

      // 7. Carregar evolução de receita
      await loadRevenueEvolution(startISO, endISO, previousRange)

      // 8. Carregar taxa de ocupação
      await loadOccupationRate(startISO, endISO)

      // 9. Carregar agendamentos do período
      await loadPeriodAppointments(startISO, endISO)
    } catch (err) {
      // Erros são tratados silenciosamente em cada função individual
      console.warn('Aviso ao carregar métricas:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadFinancialMetrics = async (startISO: string, endISO: string) => {
    if (!clinicId) return

    const { data: transactions, error: txError } = await supabase
      .from('financial_transactions')
      .select('amount_cents, clinic_share_cents, professional_share_cents, platform_fee_cents')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    if (txError) {
      console.warn('Erro ao carregar transações financeiras:', txError)
      return
    }

    const metrics: FinancialMetrics = {
      totalRevenueCents: 0,
      clinicShareCents: 0,
      professionalShareCents: 0,
      platformFeeCents: 0,
      monthlyGoalCents: 0,
      goalProgress: 0,
    }

    if (transactions) {
      transactions.forEach((tx) => {
        metrics.totalRevenueCents += tx.amount_cents || 0
        metrics.clinicShareCents += tx.clinic_share_cents || 0
        metrics.professionalShareCents += tx.professional_share_cents || 0
        metrics.platformFeeCents += tx.platform_fee_cents || 0
      })
    }

    // Carregar meta mensal (ajustar para o período se necessário)
    const { data: settings } = await supabase
      .from('organization_settings')
      .select('monthly_revenue_goal_cents')
      .eq('clinic_id', clinicId)
      .maybeSingle()

    metrics.monthlyGoalCents = settings?.monthly_revenue_goal_cents || 0

    // Ajustar meta para o período selecionado (proporcional)
    if (metrics.monthlyGoalCents > 0 && period !== 'month') {
      const daysInPeriod = differenceInDays(dateRange!.end, dateRange!.start) + 1
      const daysInMonth = 30 // Aproximação
      metrics.monthlyGoalCents = Math.round((metrics.monthlyGoalCents * daysInPeriod) / daysInMonth)
    }

    metrics.goalProgress =
      metrics.monthlyGoalCents > 0
        ? Math.min(100, (metrics.totalRevenueCents / metrics.monthlyGoalCents) * 100)
        : 0

    setFinancialMetrics(metrics)
  }

  const loadTopProfessionals = async (startISO: string, endISO: string) => {
    if (!clinicId) return

    const { data: profData, error: profError } = await supabase
      .from('financial_transactions')
      .select('professional_id, clinic_share_cents, professional:profiles(full_name)')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .gte('created_at', startISO)
      .lte('created_at', endISO)
      .not('professional_id', 'is', null)

    if (profError) {
      console.warn('Erro ao carregar ranking de profissionais:', profError)
      return
    }

    const profMap = new Map<string, { name: string; total: number; count: number }>()
    if (profData) {
      profData.forEach((tx: any) => {
        const profId = tx.professional_id
        if (!profId) return

        const existing = profMap.get(profId) || { name: '', total: 0, count: 0 }
        profMap.set(profId, {
          name: tx.professional?.full_name || 'Profissional',
          total: existing.total + (tx.clinic_share_cents || 0),
          count: existing.count + 1,
        })
      })
    }

    // Carregar metas individuais para calcular progresso
    const { data: goals } = await supabase
      .from('professional_goals')
      .select('profile_id, monthly_income_goal_cents')
      .eq('clinic_id', clinicId)

    const goalsMap = new Map<string, number>()
    if (goals) {
      goals.forEach((g) => {
        goalsMap.set(g.profile_id, g.monthly_income_goal_cents || 0)
      })
    }

    const topProfs: TopProfessional[] = Array.from(profMap.entries())
      .map(([id, data]) => {
        const goal = goalsMap.get(id) || 0
        const goalProgress = goal > 0 ? Math.min(100, (data.total / goal) * 100) : 0
        return {
          professional_id: id,
          professional_name: data.name,
          clinic_share_cents: data.total,
          transaction_count: data.count,
          goalProgress,
        }
      })
      .sort((a, b) => b.clinic_share_cents - a.clinic_share_cents)
      .slice(0, 5)

    setTopProfessionals(topProfs)
  }

  const loadClientMetrics = async (startISO: string, endISO: string) => {
    if (!clinicId) return

    const { data: clientData, error: clientError } = await supabase
      .from('financial_transactions')
      .select('appointment_id, amount_cents, appointment:appointments(client_id, client:clients(full_name))')
      .eq('clinic_id', clinicId)
      .eq('status', 'completed')
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    if (clientError) {
      console.warn('Erro ao carregar métricas de clientes:', clientError)
      return
    }

    const clientMap = new Map<string, { name: string; total: number }>()
    if (clientData) {
      clientData.forEach((tx: any) => {
        const clientId = tx.appointment?.client_id
        if (!clientId) return

        const existing = clientMap.get(clientId) || { name: '', total: 0 }
        clientMap.set(clientId, {
          name: tx.appointment?.client?.full_name || 'Cliente',
          total: existing.total + (tx.amount_cents || 0),
        })
      })
    }

    const mostValuable = Array.from(clientMap.entries())
      .map(([id, data]) => ({
        client_id: id,
        client_name: data.name,
        total_spent_cents: data.total,
      }))
      .sort((a, b) => b.total_spent_cents - a.total_spent_cents)[0] || null

    // Novos clientes no período
    const { data: allClients } = await supabase
      .from('clients')
      .select('id, created_at')
      .eq('clinic_id', clinicId)
      .gte('created_at', startISO)
      .lte('created_at', endISO)

    const newClients = allClients?.length || 0

    // Taxa de retenção (clientes únicos no período / total de clientes)
    const uniqueClientsInPeriod = clientMap.size
    const { data: totalClientsData } = await supabase
      .from('clients')
      .select('id', { count: 'exact', head: true })
      .eq('clinic_id', clinicId)

    const totalClients = totalClientsData || 0
    const retentionRate = totalClients > 0 ? (uniqueClientsInPeriod / totalClients) * 100 : 0

    setClientMetrics({
      mostValuableClient: mostValuable,
      retentionRate,
      newClients,
    })
  }

  const loadGabyAlerts = async () => {
    if (!clinicId) return

    try {
      const { data: rules, error } = await supabase
        .from('gaby_rules')
        .select('id, rule_type, rule_config')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) {
        console.warn('Erro ao carregar alertas Gaby:', error)
        return
      }

      const alerts: GabyAlert[] = (rules || []).map((rule: any) => ({
        id: rule.id,
        rule_type: rule.rule_type,
        description: getGabyAlertDescription(rule.rule_type, rule.rule_config),
        severity: rule.rule_type === 'pricing' ? 'critical' : 'warning',
      }))

      setGabyAlerts(alerts)
    } catch (err) {
      console.warn('Aviso ao carregar alertas Gaby:', err)
    }
  }

  const getGabyAlertDescription = (ruleType: string, config: any): string => {
    switch (ruleType) {
      case 'retention':
        return 'Cliente sem retorno há mais de 45 dias'
      case 'upsell':
        return 'Oportunidade de upsell identificada'
      case 'cashback':
        return 'Regra de cashback ativa'
      case 'pricing':
        return `Margem de lucro abaixo do mínimo: ${((config?.min_margin || 0) * 100).toFixed(0)}%`
      default:
        return 'Alerta da Gaby'
    }
  }

  const loadAppointmentRisks = async () => {
    if (!clinicId) return

    try {
      const now = new Date()
      const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // Próximos 7 dias

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          status,
          client:clients(full_name),
          service:services(name)
        `)
        .eq('clinic_id', clinicId)
        .in('status', ['confirmed', 'pending'])
        .gte('start_time', now.toISOString())
        .lte('start_time', futureDate.toISOString())
        .order('start_time', { ascending: true })
        .limit(20)

      if (error) {
        console.warn('Erro ao carregar riscos de cancelamento:', error)
        return
      }

      const risks: AppointmentRisk[] = (appointments || []).map((apt: any) => {
        const hoursUntil = differenceInDays(new Date(apt.start_time), now) * 24
        let riskScore = 0
        let reason = ''

        // Calcular risco baseado em múltiplos fatores
        if (hoursUntil < 24) {
          riskScore += 30
          reason = 'Agendamento muito próximo'
        }
        if (apt.status === 'pending') {
          riskScore += 20
          reason = 'Status pendente'
        }
        if (hoursUntil < 48 && apt.status === 'pending') {
          riskScore += 50
          reason = 'Alto risco: pendente e próximo'
        }

        return {
          id: apt.id,
          client_name: apt.client?.full_name || 'Cliente',
          start_time: apt.start_time,
          service_name: apt.service?.name || 'Serviço',
          risk_score: Math.min(100, riskScore),
          reason: reason || 'Risco moderado',
        }
      })

      setAppointmentRisks(risks.sort((a, b) => b.risk_score - a.risk_score).slice(0, 5))
    } catch (err) {
      console.warn('Aviso ao carregar riscos:', err)
    }
  }

  const loadIdleTimeSlots = async (startISO: string, endISO: string) => {
    if (!clinicId) return

    try {
      // Buscar todos os agendamentos no período
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('start_time, end_time, service:services(duration)')
        .eq('clinic_id', clinicId)
        .in('status', ['confirmed', 'completed', 'in_progress'])
        .gte('start_time', startISO)
        .lte('start_time', endISO)

      if (error) {
        console.warn('Erro ao carregar horas ociosas:', error)
        return
      }

      // Calcular horas ocupadas por dia da semana e hora
      const slotMap = new Map<string, { hours: number; revenue: number }>()

      // Horário padrão da clínica (8h às 18h, segunda a sexta)
      const businessHours = { start: 8, end: 18 }
      const businessDays = [1, 2, 3, 4, 5] // Segunda a sexta

      appointments?.forEach((apt: any) => {
        const start = new Date(apt.start_time)
        const dayOfWeek = start.getDay()
        const hour = start.getHours()
        const duration = apt.service?.duration || 60
        const hours = duration / 60

        if (businessDays.includes(dayOfWeek) && hour >= businessHours.start && hour < businessHours.end) {
          const key = `${dayOfWeek}-${hour}`
          const existing = slotMap.get(key) || { hours: 0, revenue: 0 }
          slotMap.set(key, {
            hours: existing.hours + hours,
            revenue: existing.revenue, // Poderia calcular receita potencial aqui
          })
        }
      })

      // Calcular horas ociosas (horas disponíveis - horas ocupadas)
      const idleSlots: IdleTimeSlot[] = []
      businessDays.forEach((day) => {
        for (let hour = businessHours.start; hour < businessHours.end; hour++) {
          const key = `${day}-${hour}`
          const occupied = slotMap.get(key) || { hours: 0, revenue: 0 }
          const available = 1 // 1 hora por slot
          const idle = Math.max(0, available - occupied.hours)

          if (idle > 0) {
            idleSlots.push({
              day_of_week: day,
              hour,
              idle_hours: idle,
              potential_revenue_cents: 0, // Poderia calcular baseado em serviços médios
            })
          }
        }
      })

      // Agrupar e ordenar por horas ociosas
      const grouped = new Map<string, IdleTimeSlot>()
      idleSlots.forEach((slot) => {
        const key = `${slot.day_of_week}-${slot.hour}`
        const existing = grouped.get(key) || slot
        grouped.set(key, {
          ...existing,
          idle_hours: existing.idle_hours + slot.idle_hours,
        })
      })

      const topIdle = Array.from(grouped.values())
        .sort((a, b) => b.idle_hours - a.idle_hours)
        .slice(0, 3)

      setIdleTimeSlots(topIdle)
    } catch (err) {
      console.warn('Aviso ao carregar horas ociosas:', err)
    }
  }

  const loadRevenueEvolution = async (
    startISO: string,
    endISO: string,
    previousRange: DateRange
  ) => {
    if (!clinicId) return

    try {
      // Receita do período atual
      const { data: currentData, error: currentError } = await supabase
        .from('financial_transactions')
        .select('amount_cents')
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .gte('created_at', startISO)
        .lte('created_at', endISO)

      if (currentError) {
        console.warn('Erro ao carregar receita atual:', currentError)
        return
      }

      const currentRevenue =
        currentData?.reduce((sum, tx) => sum + (tx.amount_cents || 0), 0) || 0

      // Receita do período anterior
      const { data: previousData, error: previousError } = await supabase
        .from('financial_transactions')
        .select('amount_cents')
        .eq('clinic_id', clinicId)
        .eq('status', 'completed')
        .gte('created_at', previousRange.start.toISOString())
        .lte('created_at', previousRange.end.toISOString())

      if (previousError) {
        console.warn('Erro ao carregar receita anterior:', previousError)
        return
      }

      const previousRevenue =
        previousData?.reduce((sum, tx) => sum + (tx.amount_cents || 0), 0) || 0

      const change = previousRevenue > 0 ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 : 0

      setRevenueEvolution({
        period: dateRange?.label || '',
        current: currentRevenue,
        previous: previousRevenue,
        change,
      })
    } catch (err) {
      console.warn('Aviso ao carregar evolução:', err)
    }
  }

  const loadOccupationRate = async (startISO: string, endISO: string) => {
    if (!clinicId) return

    try {
      // Buscar agendamentos confirmados/completos no período
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select('start_time, end_time, service:services(duration)')
        .eq('clinic_id', clinicId)
        .in('status', ['confirmed', 'completed', 'in_progress'])
        .gte('start_time', startISO)
        .lte('start_time', endISO)

      if (error) {
        console.warn('Erro ao carregar taxa de ocupação:', error)
        return
      }

      // Calcular horas vendidas
      const soldHours = (appointments || []).reduce((sum, apt: any) => {
        const duration = apt.service?.duration || 60
        return sum + duration / 60
      }, 0)

      // Calcular horas totais disponíveis (assumindo 8h/dia, 5 dias/semana)
      const daysDiff = differenceInDays(new Date(endISO), new Date(startISO)) + 1
      const businessDays = Math.ceil((daysDiff * 5) / 7) // Aproximação
      const totalAvailableHours = businessDays * 8 // 8 horas por dia

      const rate = totalAvailableHours > 0 ? (soldHours / totalAvailableHours) * 100 : 0
      setOccupationRate(Math.min(100, rate))
    } catch (err) {
      console.warn('Aviso ao carregar ocupação:', err)
    }
  }

  const loadPeriodAppointments = async (startISO: string, endISO: string) => {
    if (!clinicId) return

    try {
      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          start_time,
          end_time,
          status,
          client:clients(full_name),
          service:services(name),
          professional:profiles(full_name)
        `)
        .eq('clinic_id', clinicId)
        .in('status', ['confirmed', 'completed', 'in_progress', 'pending'])
        .gte('start_time', startISO)
        .lte('start_time', endISO)
        .order('start_time', { ascending: true })

      if (error) {
        console.warn('Erro ao carregar agendamentos do período:', error)
        return
      }

      setPeriodAppointments((appointments || []) as any[])
    } catch (err) {
      console.warn('Aviso ao carregar agendamentos:', err)
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100)
  }

  const formatDayOfWeek = (day: number) => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    return days[day] || ''
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando métricas...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com Seletor de Período */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard Estratégico</h2>
          <p className="text-sm text-gray-600">
            Visão de lucro, crescimento e controle da clínica
            {dateRange && ` • ${dateRange.label}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-600" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as PeriodType)}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
          >
            <option value="day">Dia</option>
            <option value="week">Semana</option>
            <option value="month">Mês</option>
            <option value="quarter">Trimestre</option>
            <option value="semester">Semestre</option>
            <option value="year">Ano</option>
          </select>
        </div>
      </div>

      {/* A. PAINEL DE PROSPERIDADE (Cards Grandes) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={DollarSign}
          title="Faturamento Bruto Total"
          value={formatCurrency(financialMetrics.totalRevenueCents)}
          subtitle="Receita bruta do período"
          variant="primary"
        />
        <MetricCard
          icon={TrendingUp}
          title="Lucro Líquido da Clínica"
          value={formatCurrency(financialMetrics.clinicShareCents)}
          subtitle={`Taxas: ${formatCurrency(financialMetrics.platformFeeCents)}`}
          variant="success"
        />
        <MetricCard
          icon={Users}
          title="Custo de Comissão"
          value={formatCurrency(financialMetrics.professionalShareCents)}
          subtitle="Comissões pagas"
          variant="warning"
        />
        <MetricCard
          icon={Award}
          title="Cliente Mais Valioso"
          value={
            clientMetrics.mostValuableClient
              ? formatCurrency(clientMetrics.mostValuableClient.total_spent_cents)
              : 'R$ 0,00'
          }
          subtitle={clientMetrics.mostValuableClient?.client_name || 'Nenhum cliente'}
          variant="primary"
        />
      </div>

      {/* B. PROGRESSO DE METAS E CRESCIMENTO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Medidor de Meta */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Progressão de Metas</h3>
            </div>
            <span className="text-sm text-gray-600">
              {formatCurrency(financialMetrics.totalRevenueCents)} /{' '}
              {formatCurrency(financialMetrics.monthlyGoalCents)}
            </span>
          </div>
          <div className="w-full h-8 bg-gray-200 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full transition-all duration-500 ${
                financialMetrics.goalProgress >= 100
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                  : financialMetrics.goalProgress >= 75
                  ? 'bg-gradient-to-r from-blue-500 to-green-500'
                  : 'bg-gradient-to-r from-amber-500 to-orange-500'
              }`}
              style={{ width: `${Math.min(100, financialMetrics.goalProgress)}%` }}
            />
          </div>
          <p className="text-2xl font-bold text-gray-900 text-center">
            {financialMetrics.goalProgress.toFixed(1)}%
          </p>
        </div>

        {/* Taxa de Ocupação */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Taxa de Ocupação</h3>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold text-gray-900 mb-2">{occupationRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-600">Horas Vendidas / Horas Disponíveis</p>
          </div>
        </div>
      </div>

      {/* Gráfico de Evolução da Receita */}
      {revenueEvolution && (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-6 w-6 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900">Evolução da Receita</h3>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-gray-600">Período Atual</p>
                <p className="text-lg font-bold text-gray-900">
                  {formatCurrency(revenueEvolution.current)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-600">Período Anterior</p>
                <p className="text-lg font-semibold text-gray-700">
                  {formatCurrency(revenueEvolution.previous)}
                </p>
              </div>
              <div
                className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                  revenueEvolution.change >= 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {revenueEvolution.change >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                <span className="text-sm font-semibold">
                  {revenueEvolution.change >= 0 ? '+' : ''}
                  {revenueEvolution.change.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
          {/* Gráfico simples de barras */}
          <div className="flex items-end gap-2 h-32 mt-4">
            <div className="flex-1 flex flex-col items-center">
              <div
                className="w-full bg-blue-500 rounded-t-lg transition-all"
                style={{
                  height: `${
                    revenueEvolution.previous > 0
                      ? Math.min(100, (revenueEvolution.previous / revenueEvolution.current) * 100)
                      : 0
                  }%`,
                }}
              />
              <p className="text-xs text-gray-600 mt-2">Anterior</p>
            </div>
            <div className="flex-1 flex flex-col items-center">
              <div className="w-full bg-green-500 rounded-t-lg" style={{ height: '100%' }} />
              <p className="text-xs text-gray-600 mt-2">Atual</p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard de Agendamentos do Período */}
      {dateRange && (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-blue-500" />
              <h3 className="text-lg font-semibold text-gray-900">Agendamentos do Período</h3>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{periodAppointments.length}</p>
              <p className="text-xs text-gray-600">Total de agendamentos</p>
            </div>
          </div>

          {/* Visualização por dia (para períodos semanais ou maiores) */}
          {period === 'week' || period === 'month' || period === 'quarter' || period === 'semester' || period === 'year' ? (
            <PeriodAppointmentsChart
              appointments={periodAppointments}
              dateRange={dateRange}
              period={period}
            />
          ) : (
            /* Lista de agendamentos do dia */
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {periodAppointments.length > 0 ? (
                periodAppointments.map((apt: any) => (
                  <div
                    key={apt.id}
                    className="rounded-xl bg-white/70 border border-white/60 p-4 flex items-center justify-between hover:shadow-md transition"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-center">
                        <p className="text-sm font-semibold text-gray-900">
                          {format(new Date(apt.start_time), 'HH:mm')}
                        </p>
                        <p className="text-xs text-gray-600">
                          {format(new Date(apt.start_time), 'dd/MM')}
                        </p>
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {apt.client?.full_name || 'Cliente'}
                        </p>
                        <p className="text-xs text-gray-600">
                          {apt.service?.name || 'Serviço'} • {apt.professional?.full_name || 'Profissional'}
                        </p>
                      </div>
                      <div className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        {apt.status === 'confirmed' ? 'Confirmado' : 
                         apt.status === 'completed' ? 'Concluído' :
                         apt.status === 'in_progress' ? 'Em Atendimento' : 'Pendente'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">Nenhum agendamento no período</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* C. ANÁLISE DE POTENCIAL E RISCO */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Alertas da Gaby */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">Alertas da Gaby</h3>
          </div>
          {gabyAlerts.length > 0 ? (
            <div className="space-y-2">
              {gabyAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-xl p-3 border ${
                    alert.severity === 'critical'
                      ? 'bg-red-50 border-red-200'
                      : 'bg-amber-50 border-amber-200'
                  }`}
                >
                  <p className="text-xs font-semibold text-gray-900 capitalize mb-1">
                    {alert.rule_type}
                  </p>
                  <p className="text-xs text-gray-700">{alert.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum alerta crítico no momento</p>
          )}
        </div>

        {/* Risco de Cancelamento */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900">Risco de Cancelamento</h3>
          </div>
          {appointmentRisks.length > 0 ? (
            <div className="space-y-2">
              {appointmentRisks.map((risk) => (
                <div
                  key={risk.id}
                  className="rounded-xl bg-red-50 border border-red-200 p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-semibold text-gray-900">{risk.client_name}</p>
                    <span className="text-xs font-bold text-red-600">{risk.risk_score}%</span>
                  </div>
                  <p className="text-xs text-gray-700">{risk.service_name}</p>
                  <p className="text-xs text-red-600 mt-1">{risk.reason}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum risco identificado</p>
          )}
        </div>

        {/* Top 3 Horas Ociosas */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Clock className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Horas Ociosas</h3>
          </div>
          {idleTimeSlots.length > 0 ? (
            <div className="space-y-2">
              {idleTimeSlots.map((slot, idx) => (
                <div
                  key={`${slot.day_of_week}-${slot.hour}`}
                  className="rounded-xl bg-blue-50 border border-blue-200 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-900">
                        {formatDayOfWeek(slot.day_of_week)} às {slot.hour}h
                      </p>
                      <p className="text-xs text-gray-600">
                        {slot.idle_hours.toFixed(1)}h ociosas
                      </p>
                    </div>
                    <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Agenda otimizada</p>
          )}
        </div>
      </div>

      {/* D. RANKING E PERFORMANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Ranking de Profissionais */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            🏆 Ranking de Profissionais por Lucro
          </h3>
          {topProfessionals.length > 0 ? (
            <div className="space-y-3">
              {topProfessionals.map((prof, idx) => (
                <div
                  key={prof.professional_id}
                  className="rounded-2xl bg-white/70 border border-white/60 px-4 py-3 flex items-center justify-between shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}º`}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {prof.professional_name}
                      </p>
                      <p className="text-xs text-gray-600">
                        {prof.transaction_count} transações
                        {prof.goalProgress !== undefined && (
                          <span className="ml-2">
                            • Meta: {prof.goalProgress.toFixed(0)}%
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-gray-900">
                    {formatCurrency(prof.clinic_share_cents)}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum profissional encontrado no período</p>
          )}
        </div>

        {/* Profissional do Mês */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            ⭐ Profissional Destaque
          </h3>
          {topProfessionals.length > 0 ? (
            <div className="space-y-4">
              {topProfessionals
                .filter((p) => p.goalProgress !== undefined)
                .sort((a, b) => (b.goalProgress || 0) - (a.goalProgress || 0))[0] ? (
                (() => {
                  const top = topProfessionals
                    .filter((p) => p.goalProgress !== undefined)
                    .sort((a, b) => (b.goalProgress || 0) - (a.goalProgress || 0))[0]
                  return (
                    <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 p-6">
                      <div className="text-center">
                        <Award className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                        <p className="text-xl font-bold text-gray-900 mb-1">{top.professional_name}</p>
                        <p className="text-3xl font-bold text-amber-600 mb-2">
                          {top.goalProgress?.toFixed(0)}%
                        </p>
                        <p className="text-sm text-gray-600">de meta atingida</p>
                        <p className="text-sm font-semibold text-gray-900 mt-3">
                          {formatCurrency(top.clinic_share_cents)} gerados
                        </p>
                      </div>
                    </div>
                  )
                })()
              ) : (
                <p className="text-sm text-gray-500">
                  Nenhum profissional com meta configurada
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum profissional encontrado no período</p>
          )}
        </div>
      </div>

      {/* Métricas de Crescimento Adicionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Users className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Retenção e Crescimento</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {clientMetrics.retentionRate.toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600">Taxa de Retenção</p>
            </div>
            <div>
              <p className="text-xl font-semibold text-gray-900">{clientMetrics.newClients}</p>
              <p className="text-sm text-gray-600">Novos clientes no período</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="h-6 w-6 text-amber-500" />
            <h3 className="text-lg font-semibold text-gray-900">Cliente Mais Valioso</h3>
          </div>
          {clientMetrics.mostValuableClient ? (
            <div className="space-y-2">
              <p className="text-2xl font-bold text-gray-900">
                {clientMetrics.mostValuableClient.client_name}
              </p>
              <p className="text-sm text-gray-600">
                Total gasto: {formatCurrency(clientMetrics.mostValuableClient.total_spent_cents)}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Nenhum cliente encontrado no período</p>
          )}
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  title: string
  value: string
  subtitle?: string
  variant?: 'primary' | 'success' | 'warning' | 'danger'
}

function MetricCard({ icon: Icon, title, value, subtitle, variant = 'primary' }: MetricCardProps) {
  const variantStyles = {
    primary: 'bg-blue-50 border-blue-200 text-blue-900',
    success: 'bg-green-50 border-green-200 text-green-900',
    warning: 'bg-amber-50 border-amber-200 text-amber-900',
    danger: 'bg-red-50 border-red-200 text-red-900',
  }

  return (
    <div className={`rounded-3xl border shadow-xl p-6 ${variantStyles[variant]}`}>
      <div className="flex items-center gap-3 mb-3">
        <Icon className="h-6 w-6" />
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      <p className="text-3xl font-bold mb-1">{value}</p>
      {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
    </div>
  )
}

interface PeriodAppointmentsChartProps {
  appointments: any[]
  dateRange: DateRange
  period: PeriodType
}

function PeriodAppointmentsChart({ appointments, dateRange, period }: PeriodAppointmentsChartProps) {
  const dayInitials = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const now = new Date()

  // Calcular dados por dia
  const dailyData = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
    
    return days.map((day) => {
      const dayStart = startOfDay(day)
      const dayEnd = endOfDay(day)
      
      const dayAppointments = appointments.filter((apt) => {
        const aptDate = new Date(apt.start_time)
        return aptDate >= dayStart && aptDate <= dayEnd && apt.status !== 'cancelled'
      })

      const dayIndex = getDay(day)
      return {
        date: day,
        count: dayAppointments.length,
        appointments: dayAppointments,
        dayName: dayInitials[dayIndex],
        isToday: isToday(day),
        dayIndex,
      }
    })
  }, [appointments, dateRange])

  const total = dailyData.reduce((sum, day) => sum + day.count, 0)
  const maxCount = Math.max(...dailyData.map((d) => d.count), 1)
  const average = dailyData.length > 0 ? Math.round(total / dailyData.length) : 0

  // Sempre mostrar os últimos 30 dias (ou todos se for menos de 30)
  const displayData = dailyData.length > 30 
    ? dailyData.slice(-30) // Últimos 30 dias
    : dailyData // Todos os dias se for menos de 30

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Distribuição de Agendamentos
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-800">{average}</span>
            <span className="text-sm text-gray-600 font-medium">Média de agendamentos/dia</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-gray-900">{total}</p>
          <p className="text-xs text-gray-600">Total no período</p>
        </div>
      </div>

      {/* Gráfico de Barras Otimizado */}
      <div className="relative">
        {/* Linhas de referência horizontais */}
        <div className="absolute inset-0 flex flex-col justify-between z-0" style={{ height: '280px' }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full border-t border-gray-200/30" />
          ))}
        </div>

        {/* Container do gráfico com scroll horizontal suave */}
        <div className="relative overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
          <div className="relative flex items-end justify-start h-72 gap-1.5 z-10" style={{ minWidth: 'max-content' }}>
            {displayData.map((day, index) => {
              const heightPercent = maxCount > 0 
                ? Math.max((day.count / maxCount) * 100, 8)
                : 8

              const isActive = day.isToday
              const hasAppointments = day.count > 0

              return (
                <div 
                  key={index} 
                  className="flex flex-col items-center h-full justify-end relative group"
                  style={{ minWidth: '36px', maxWidth: '36px' }}
                >
                  {/* Tooltip no hover */}
                  {hasAppointments && (
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs font-semibold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-30 whitespace-nowrap pointer-events-none">
                      {day.count} {day.count === 1 ? 'agendamento' : 'agendamentos'}
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full">
                        <div className="border-4 border-transparent border-t-gray-900" />
                      </div>
                    </div>
                  )}

                  {/* Label do valor acima da barra */}
                  {hasAppointments && (
                    <div className={`absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold z-20 ${
                      isActive ? 'text-orange-600 font-bold' : 'text-gray-600'
                    }`}>
                      {day.count}
                    </div>
                  )}

                  {/* Barra do gráfico */}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ease-out relative cursor-pointer hover:opacity-90 ${
                      isActive
                        ? 'bg-gradient-to-t from-orange-400 to-orange-500 shadow-lg shadow-orange-500/40 ring-2 ring-orange-300'
                        : hasAppointments
                        ? 'bg-gradient-to-t from-blue-400 to-blue-500 shadow-md shadow-blue-500/20 hover:shadow-lg'
                        : 'bg-gray-200/30'
                    }`}
                    style={{
                      height: `${heightPercent}%`,
                      minHeight: hasAppointments ? '12px' : '4px',
                    }}
                  >
                    {isActive && (
                      <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full bg-orange-500 border-2 border-white shadow-md" />
                    )}
                  </div>

                  {/* Label do dia */}
                  <div className="mt-2 text-center w-full">
                    <div className={`text-xs font-semibold ${isActive ? 'text-orange-600' : 'text-gray-500'}`}>
                      {day.dayName}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${isActive ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                      {format(day.date, 'dd/MM')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Legenda */}
        <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-white/40">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-t-lg bg-gradient-to-t from-blue-400 to-blue-500" />
            <span className="text-xs text-gray-600">Agendamentos</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-t-lg bg-gradient-to-t from-orange-400 to-orange-500 ring-2 ring-orange-300" />
            <span className="text-xs text-gray-600">Hoje</span>
          </div>
        </div>
      </div>
    </div>
  )
}

