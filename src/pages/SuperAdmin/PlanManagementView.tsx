import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import { Save, DollarSign, Users, Percent, Loader2 } from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  base_price_cents: number
  additional_user_price_cents: number
  included_users_count: number
  transaction_fee_percent: number
  is_active: boolean
}

export function PlanManagementView() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    base_price: '',
    additional_user_price: '',
    included_users: '',
    transaction_fee: '',
  })

  useEffect(() => {
    loadPlan()
  }, [])

  const loadPlan = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setPlan(data as SubscriptionPlan)
        setFormData({
          name: data.name,
          base_price: (data.base_price_cents / 100).toFixed(2),
          additional_user_price: (data.additional_user_price_cents / 100).toFixed(2),
          included_users: data.included_users_count.toString(),
          transaction_fee: ((data.transaction_fee_percent || 0) * 100).toFixed(2),
        })
      }
    } catch (err: any) {
      console.error('Erro ao carregar plano:', err)
      toast.error('Erro ao carregar configurações do plano')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!plan) return

    setSaving(true)
    try {
      const basePriceCents = Math.round(parseFloat(formData.base_price) * 100)
      const additionalUserPriceCents = Math.round(parseFloat(formData.additional_user_price) * 100)
      const includedUsers = parseInt(formData.included_users)
      const transactionFeePercent = parseFloat(formData.transaction_fee) / 100

      if (basePriceCents < 0 || additionalUserPriceCents < 0 || includedUsers < 1 || transactionFeePercent < 0) {
        toast.error('Valores inválidos')
        return
      }

      const { error } = await supabase
        .from('subscription_plans')
        .update({
          name: formData.name,
          base_price_cents: basePriceCents,
          additional_user_price_cents: additionalUserPriceCents,
          included_users_count: includedUsers,
          transaction_fee_percent: transactionFeePercent,
          updated_at: new Date().toISOString(),
        })
        .eq('id', plan.id)

      if (error) throw error

      toast.success('Configurações do plano salvas com sucesso!')
      await loadPlan()
    } catch (err: any) {
      console.error('Erro ao salvar plano:', err)
      toast.error(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
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
        <h2 className="text-2xl font-semibold text-gray-900">Gestão de Planos</h2>
        <p className="text-sm text-gray-600">Configure os valores de assinatura e taxas</p>
      </div>

      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="space-y-6">
          {/* Nome do Plano */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Plano</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
              placeholder="Plano Base"
            />
          </div>

          {/* Preço Base */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preço Base Mensal
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.base_price}
                onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="69.90"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Valor cobrado mensalmente pela assinatura base</p>
          </div>

          {/* Usuários Incluídos */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários Incluídos
            </label>
            <input
              type="number"
              min="1"
              value={formData.included_users}
              onChange={(e) => setFormData({ ...formData, included_users: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
              placeholder="2"
            />
            <p className="text-xs text-gray-500 mt-1">Número de usuários incluídos no plano base (padrão: 1 Admin + 1 Recepcionista)</p>
          </div>

          {/* Preço Usuário Adicional */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Preço por Usuário Adicional
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600">R$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.additional_user_price}
                onChange={(e) => setFormData({ ...formData, additional_user_price: e.target.value })}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="29.90"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">Valor cobrado mensalmente por cada usuário além do limite incluído</p>
          </div>

          {/* Taxa de Transação */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <Percent className="h-4 w-4" />
              Taxa de Transação (Variável)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.transaction_fee}
                onChange={(e) => setFormData({ ...formData, transaction_fee: e.target.value })}
                className="w-full pr-8 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500"
                placeholder="5.99"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600">%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">Percentual cobrado sobre cada transação de agendamento (padrão: 5.99%)</p>
          </div>

          {/* Botão Salvar */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-5 w-5" />
                Salvar Configurações
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
