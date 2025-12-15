import { useState, useEffect } from 'react'
import { useScheduler } from '../context/SchedulerContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { CreditCard, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'

interface SubscriptionPlan {
  id: string
  name: string
  base_price_cents: number
  additional_user_price_cents: number
  included_users_count: number
  transaction_fee_percent: number
}

interface Organization {
  id: string
  name: string
  status: 'pending_setup' | 'active' | 'suspended' | 'cancelled'
  subscription_plan_id: string | null
}

export function SubscriptionCheckout() {
  const { currentUser } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  useEffect(() => {
    if (currentUser?.clinicId) {
      loadData()
    }
  }, [currentUser])

  const loadData = async () => {
    if (!currentUser?.clinicId) return

    setLoading(true)
    try {
      // Buscar organização
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, status, subscription_plan_id')
        .eq('id', currentUser.clinicId)
        .maybeSingle()

      if (orgError) throw orgError
      if (!org) throw new Error('Organização não encontrada')

      setOrganization(org as Organization)

      // Buscar plano
      const planId = org.subscription_plan_id || (await getDefaultPlanId())
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .maybeSingle()

      if (planError) throw planError
      if (planData) {
        setPlan(planData as SubscriptionPlan)
      }
    } catch (err: any) {
      console.error('Erro ao carregar dados:', err)
      toast.error(err.message || 'Erro ao carregar informações da assinatura')
    } finally {
      setLoading(false)
    }
  }

  const getDefaultPlanId = async (): Promise<string> => {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('id')
      .eq('is_active', true)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error || !data) {
      throw new Error('Nenhum plano ativo encontrado')
    }

    return data.id
  }

  const handleCreateSubscription = async () => {
    if (!currentUser?.clinicId || !plan) return

    setProcessing(true)
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          clinic_id: currentUser.clinicId,
          plan_id: plan.id,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      if (data?.payment_url) {
        setPaymentUrl(data.payment_url)
        // Abrir link de pagamento em nova aba
        window.open(data.payment_url, '_blank')
        toast.success('Redirecionando para pagamento...')
      } else {
        toast.success('Assinatura criada! Aguarde confirmação do pagamento.')
        // Recarregar após alguns segundos
        setTimeout(() => {
          window.location.reload()
        }, 3000)
      }
    } catch (err: any) {
      console.error('Erro ao criar assinatura:', err)
      toast.error(err.message || 'Erro ao criar assinatura')
    } finally {
      setProcessing(false)
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
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  if (!organization || !plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-700">Erro ao carregar informações</p>
        </div>
      </div>
    )
  }

  const isSuspended = organization.status === 'suspended'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffb3a7] via-[#ffc78f] to-[#ffe7a3] flex items-center justify-center p-4">
      <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 lg:p-10 max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isSuspended ? 'Assinatura Suspensa' : 'Ative sua Assinatura'}
          </h1>
          <p className="text-gray-600">
            {isSuspended
              ? 'Sua assinatura foi suspensa devido a problemas no pagamento. Renove para continuar usando o sistema.'
              : 'Complete o pagamento para liberar o acesso completo ao sistema.'}
          </p>
        </div>

        {/* Plano */}
        <div className="bg-white/80 border border-white/60 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{plan.name}</h2>
              <p className="text-sm text-gray-600">Plano Mensal</p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-gray-900">{formatCurrency(plan.base_price_cents)}</p>
              <p className="text-sm text-gray-600">/mês</p>
            </div>
          </div>

          <div className="space-y-3 border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Usuários incluídos</span>
              <span className="font-semibold text-gray-900">{plan.included_users_count} usuários</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Taxa de transação</span>
              <span className="font-semibold text-gray-900">{(plan.transaction_fee_percent * 100).toFixed(2)}%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Usuário adicional</span>
              <span className="font-semibold text-gray-900">{formatCurrency(plan.additional_user_price_cents)}/mês</span>
            </div>
          </div>
        </div>

        {/* Status */}
        {isSuspended && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Pagamento pendente</p>
              <p className="text-xs text-amber-700 mt-1">
                Sua assinatura foi suspensa. Complete o pagamento para reativar o acesso.
              </p>
            </div>
          </div>
        )}

        {/* Botão de Pagamento */}
        <button
          onClick={handleCreateSubscription}
          disabled={processing}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold py-4 rounded-xl shadow-lg hover:shadow-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {processing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CreditCard className="h-5 w-5" />
              {isSuspended ? 'Renovar Assinatura' : 'Pagar e Ativar'}
            </>
          )}
        </button>

        {paymentUrl && (
          <div className="mt-4 text-center">
            <a
              href={paymentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-600 hover:underline"
            >
              Abrir link de pagamento em nova aba
            </a>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-6">
          Ao continuar, você concorda com os termos de serviço. O acesso será liberado após confirmação do pagamento.
        </p>
      </div>
    </div>
  )
}
