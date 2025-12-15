import { useState, useEffect } from 'react'
import { Target, DollarSign, Clock, TrendingUp, PieChart, Home, Zap, Car, Briefcase, MoreHorizontal, TrendingDown } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../ui/Toast'
import { 
  calculateHourlyCost, 
  calculateTargetHourlyRate,
  calculateTotalFixedCostCents,
  formatCurrency,
  type ProfessionalGoals as ProfessionalGoalsType
} from '../../utils/professionalGoalsCalculations'

interface ProfessionalGoalsViewProps {
  profileId: string
  clinicId: string
}

interface AllocationGuide {
  costs: number
  goals: number
  investment: number
}

export function ProfessionalGoalsView({ profileId, clinicId }: ProfessionalGoalsViewProps) {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [goals, setGoals] = useState<ProfessionalGoalsType>({
    profile_id: profileId,
    clinic_id: clinicId,
    fixed_cost_rent_cents: 0,
    fixed_cost_utilities_cents: 0,
    fixed_cost_transport_cents: 0,
    fixed_cost_salary_cents: 0,
    fixed_cost_other_cents: 0,
    profit_margin_cents: 0,
    clinic_fee_cents: 0,
    hours_available_per_month: 160,
    monthly_income_goal_cents: 0
  })
  const [lastPayment, setLastPayment] = useState<number | null>(null)
  const [allocationGuide, setAllocationGuide] = useState<AllocationGuide | null>(null)

  // Calcular custo por hora e valor hora necessário
  const hourlyCostCents = calculateHourlyCost(goals)
  const targetHourlyRateCents = calculateTargetHourlyRate(goals)
  const totalFixedCostCents = calculateTotalFixedCostCents(goals)

  useEffect(() => {
    const loadGoals = async () => {
      if (!profileId) {
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('professional_goals')
          .select('*')
          .eq('profile_id', profileId)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar metas:', error)
          toast.error('Erro ao carregar metas')
          return
        }

        if (data) {
          // Garantir que todos os campos estejam presentes (compatibilidade com versões antigas)
          setGoals({
            profile_id: profileId,
            clinic_id: clinicId,
            fixed_cost_rent_cents: data.fixed_cost_rent_cents || 0,
            fixed_cost_utilities_cents: data.fixed_cost_utilities_cents || 0,
            fixed_cost_transport_cents: data.fixed_cost_transport_cents || 0,
            fixed_cost_salary_cents: data.fixed_cost_salary_cents || 0,
            fixed_cost_other_cents: data.fixed_cost_other_cents || 0,
            profit_margin_cents: data.profit_margin_cents || 0,
            clinic_fee_cents: data.clinic_fee_cents || 0,
            hours_available_per_month: data.hours_available_per_month || 160,
            monthly_income_goal_cents: data.monthly_income_goal_cents || 0,
            id: data.id
          })
        }

        // Buscar último pagamento (transação financeira mais recente)
        const { data: lastTransaction } = await supabase
          .from('financial_transactions')
          .select('professional_share_cents')
          .eq('professional_id', profileId)
          .eq('clinic_id', clinicId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (lastTransaction?.professional_share_cents) {
          setLastPayment(lastTransaction.professional_share_cents)
        }
      } catch (err) {
        console.error('Erro ao carregar metas:', err)
        toast.error('Erro ao carregar metas')
      } finally {
        setLoading(false)
      }
    }

    loadGoals()
  }, [profileId, clinicId, toast])

  // Calcular guia de alocação quando lastPayment ou goals mudarem
  useEffect(() => {
    if (lastPayment && goals.monthly_income_goal_cents > 0) {
      const total = lastPayment
      setAllocationGuide({
        costs: Math.round(total * 0.5), // 50% para custos
        goals: Math.round(total * 0.3), // 30% para metas
        investment: Math.round(total * 0.2) // 20% para investimento
      })
    }
  }, [lastPayment, goals.monthly_income_goal_cents])

  const handleSave = async () => {
    if (!profileId || !clinicId) return

    setSaving(true)
    try {
      const goalsData = {
        profile_id: profileId,
        clinic_id: clinicId,
        fixed_cost_rent_cents: goals.fixed_cost_rent_cents,
        fixed_cost_utilities_cents: goals.fixed_cost_utilities_cents,
        fixed_cost_transport_cents: goals.fixed_cost_transport_cents,
        fixed_cost_salary_cents: goals.fixed_cost_salary_cents,
        fixed_cost_other_cents: goals.fixed_cost_other_cents,
        profit_margin_cents: goals.profit_margin_cents,
        clinic_fee_cents: goals.clinic_fee_cents,
        hours_available_per_month: goals.hours_available_per_month,
        monthly_income_goal_cents: goals.monthly_income_goal_cents
      }

      if (goals.id) {
        // Update
        const { error } = await supabase
          .from('professional_goals')
          .update(goalsData)
          .eq('id', goals.id)

        if (error) throw error
      } else {
        // Insert
        const { data, error } = await supabase
          .from('professional_goals')
          .insert(goalsData)
          .select()
          .single()

        if (error) throw error
        if (data) setGoals({ ...goals, id: data.id })
      }

      toast.success('Metas salvas com sucesso!')
    } catch (err: any) {
      console.error('Erro ao salvar metas:', err)
      toast.error(err.message || 'Erro ao salvar metas')
    } finally {
      setSaving(false)
    }
  }

  const updateCostField = (field: keyof ProfessionalGoalsType, value: number) => {
    setGoals(prev => ({
      ...prev,
      [field]: Math.round(value * 100) // Converter para centavos
    }))
  }

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando metas...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-6 w-6 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Metas e Finanças Pessoais</h3>
        </div>

        {/* KPIs Principais */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-semibold text-blue-900">Custo por Hora</p>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {formatCurrency(hourlyCostCents)}/hora
            </p>
            <p className="text-xs text-blue-700 mt-1">
              Baseado em {formatCurrency(totalFixedCostCents)} ÷ {goals.hours_available_per_month}h
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <p className="text-sm font-semibold text-green-900">Valor Hora Necessário</p>
            </div>
            <p className="text-2xl font-bold text-green-900">
              {formatCurrency(targetHourlyRateCents)}/hora
            </p>
            <p className="text-xs text-green-700 mt-1">
              Para atingir suas metas
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              <p className="text-sm font-semibold text-purple-900">Total de Custos Fixos</p>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {formatCurrency(totalFixedCostCents)}/mês
            </p>
            <p className="text-xs text-purple-700 mt-1">
              Soma de todos os custos fixos
            </p>
          </div>
        </div>

        {/* Formulário de Custos Detalhados */}
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">Detalhamento de Custos Fixos Mensais</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Aluguel */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-400" />
                  Aluguel/Imóvel (R$)
                </label>
                <input
                  type="number"
                  value={(goals.fixed_cost_rent_cents / 100).toFixed(2)}
                  onChange={(e) => updateCostField('fixed_cost_rent_cents', parseFloat(e.target.value || '0'))}
                  className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Utilidades */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <Zap className="h-4 w-4 text-gray-400" />
                  Utilidades (R$)
                </label>
                <input
                  type="number"
                  value={(goals.fixed_cost_utilities_cents / 100).toFixed(2)}
                  onChange={(e) => updateCostField('fixed_cost_utilities_cents', parseFloat(e.target.value || '0'))}
                  className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Luz, água, internet, etc.</p>
              </div>

              {/* Transporte */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <Car className="h-4 w-4 text-gray-400" />
                  Transporte (R$)
                </label>
                <input
                  type="number"
                  value={(goals.fixed_cost_transport_cents / 100).toFixed(2)}
                  onChange={(e) => updateCostField('fixed_cost_transport_cents', parseFloat(e.target.value || '0'))}
                  className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Salário/Pró-Labore */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-gray-400" />
                  Salário/Pró-Labore (R$)
                </label>
                <input
                  type="number"
                  value={(goals.fixed_cost_salary_cents / 100).toFixed(2)}
                  onChange={(e) => updateCostField('fixed_cost_salary_cents', parseFloat(e.target.value || '0'))}
                  className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Salário desejado</p>
              </div>

              {/* Outros */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <MoreHorizontal className="h-4 w-4 text-gray-400" />
                  Outros Custos (R$)
                </label>
                <input
                  type="number"
                  value={(goals.fixed_cost_other_cents / 100).toFixed(2)}
                  onChange={(e) => updateCostField('fixed_cost_other_cents', parseFloat(e.target.value || '0'))}
                  className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>

              {/* Margem de Lucro para Reinvestimentos */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-gray-400" />
                  Margem de Lucro/Reinvestimento (R$)
                </label>
                <input
                  type="number"
                  value={(goals.profit_margin_cents / 100).toFixed(2)}
                  onChange={(e) => updateCostField('profit_margin_cents', parseFloat(e.target.value || '0'))}
                  className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Valor mensal para reinvestimentos e crescimento</p>
              </div>

              {/* Taxa da Clínica */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-400" />
                  Taxa da Clínica (R$)
                </label>
                <input
                  type="number"
                  value={(goals.clinic_fee_cents / 100).toFixed(2)}
                  onChange={(e) => updateCostField('clinic_fee_cents', parseFloat(e.target.value || '0'))}
                  className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
                <p className="text-xs text-gray-500 mt-1">Valor mensal que você paga para a clínica</p>
              </div>
            </div>
          </div>

          {/* Meta de Renda e Horas Disponíveis */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-gray-400" />
                Meta de Renda Mensal (R$)
              </label>
              <input
                type="number"
                value={(goals.monthly_income_goal_cents / 100).toFixed(2)}
                onChange={(e) => updateCostField('monthly_income_goal_cents', parseFloat(e.target.value || '0'))}
                className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400" />
                Horas Disponíveis por Mês
              </label>
              <input
                type="number"
                value={goals.hours_available_per_month}
                onChange={(e) => {
                  const value = parseInt(e.target.value || '0')
                  setGoals(prev => ({ ...prev, hours_available_per_month: value > 0 ? value : 160 }))
                }}
                className="w-full px-4 py-2 rounded-lg bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
                placeholder="160"
                min="1"
              />
              <p className="text-xs text-gray-500 mt-1">Padrão: 160h (40h/semana × 4 semanas)</p>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Salvando...' : 'Salvar Metas'}
          </button>
        </div>
      </div>

      {/* Guia de Alocação de Renda */}
      {lastPayment && allocationGuide && (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="h-6 w-6 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Guia de Alocação de Renda</h3>
          </div>

          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Último pagamento recebido:</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(lastPayment)}</p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-semibold text-green-900">Custos (50%)</p>
                <p className="text-xs text-green-700">Para manter suas operações</p>
              </div>
              <p className="text-lg font-bold text-green-900">{formatCurrency(allocationGuide.costs)}</p>
            </div>

            <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-semibold text-blue-900">Metas (30%)</p>
                <p className="text-xs text-blue-700">Para alcançar seus objetivos</p>
              </div>
              <p className="text-lg font-bold text-blue-900">{formatCurrency(allocationGuide.goals)}</p>
            </div>

            <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div>
                <p className="text-sm font-semibold text-purple-900">Investimento (20%)</p>
                <p className="text-xs text-purple-700">Para crescimento futuro</p>
              </div>
              <p className="text-lg font-bold text-purple-900">{formatCurrency(allocationGuide.investment)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
