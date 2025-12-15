import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import clsx from 'clsx'
import { supabase } from '../../lib/supabase'
import { useCheckoutCalculator, type CheckoutItem } from '../../hooks/useCheckoutCalculator'
import { checkoutSchema, type PaymentMethod } from '../../schemas/checkoutSchema'
import { useToast, ToastContainer } from '../ui/Toast'
import { Button } from '../ui/Button'
import { PaymentConfirmationModal } from './PaymentConfirmationModal'

interface QuickCheckoutModalProps {
  open: boolean
  onClose: () => void
  organizationId: string
  appointmentId?: string
  clientId?: string
  items: CheckoutItem[]
  suggestions?: CheckoutItem[]
  onSuccess?: () => void
  cashbackMultiplier?: number
}

function centsFromInput(value: string): number {
  const normalized = value.replace(/[^\d,.-]/g, '').replace(',', '.')
  const num = Number.parseFloat(normalized)
  if (Number.isNaN(num)) return 0
  return Math.round(num * 100)
}

function formatCents(value: number): string {
  return (value / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  })
}

export function QuickCheckoutModal({
  open,
  onClose,
  organizationId,
  appointmentId,
  clientId,
  items,
  suggestions = [],
  onSuccess,
  cashbackMultiplier = 3,
}: QuickCheckoutModalProps) {
  const [localItems, setLocalItems] = useState<CheckoutItem[]>(items)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')
  const [discountInput, setDiscountInput] = useState('0')
  const [cashbackInput, setCashbackInput] = useState('0')
  const [amountPaidInput, setAmountPaidInput] = useState('0')
  const [selectedSuggestion, setSelectedSuggestion] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [useCashback, setUseCashback] = useState(false)
  const [giveCashback, setGiveCashback] = useState(false)
  const [clientCashbackBalance, setClientCashbackBalance] = useState<number>(0)
  const [professionalCashbackConfig, setProfessionalCashbackConfig] = useState<{
    enabled: boolean
    mode: 'percent' | 'fixed'
    percent?: number
    fixed?: number
  } | null>(null)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [cashbackEarned, setCashbackEarned] = useState<number>(0)

  const toast = useToast()

  useEffect(() => {
    setLocalItems(items)
  }, [items])

  // Buscar saldo de cashback do cliente
  useEffect(() => {
    const loadClientCashback = async () => {
      if (!clientId) return
      try {
        const { data } = await supabase
          .from('client_wallet')
          .select('balance_cents')
          .eq('client_id', clientId)
          .maybeSingle()
        
        if (data) {
          setClientCashbackBalance(data.balance_cents || 0)
        }
      } catch (err) {
        console.error('Erro ao carregar saldo de cashback:', err)
      }
    }
    if (open && clientId) {
      loadClientCashback()
    }
  }, [open, clientId])

  // Buscar configuração de cashback do profissional
  useEffect(() => {
    const loadProfessionalCashback = async () => {
      if (!appointmentId) return
      try {
        // Buscar appointment para pegar professional_id
        const { data: appointment } = await supabase
          .from('appointments')
          .select('professional_id')
          .eq('id', appointmentId)
          .single()
        
        if (appointment?.professional_id) {
          const { data: prof } = await supabase
            .from('profiles')
            .select('cashback_enabled, cashback_mode, cashback_percent, cashback_fixed_cents')
            .eq('id', appointment.professional_id)
            .single()
          
          if (prof) {
            setProfessionalCashbackConfig({
              enabled: prof.cashback_enabled || false,
              mode: prof.cashback_mode || 'percent',
              percent: prof.cashback_percent || 0,
              fixed: prof.cashback_fixed_cents ? prof.cashback_fixed_cents / 100 : 0,
            })
            // Definir se deve dar cashback baseado na configuração
            setGiveCashback(prof.cashback_enabled || false)
          }
        }
      } catch (err) {
        console.error('Erro ao carregar configuração de cashback:', err)
      }
    }
    if (open && appointmentId) {
      loadProfessionalCashback()
    }
  }, [open, appointmentId])

  const discountCents = useMemo(() => centsFromInput(discountInput), [discountInput])
  const cashbackCents = useMemo(() => centsFromInput(cashbackInput), [cashbackInput])

  const calculation = useCheckoutCalculator({
    items: localItems,
    discount_amount_cents: discountCents,
    cashback_to_redeem_cents: cashbackCents,
  })

  // Calcular máximo de cashback utilizável (33% do valor do serviço)
  const maxCashbackUsable = useMemo(() => {
    const serviceSubtotal = calculation.service_subtotal
    const maxByRule = Math.floor(serviceSubtotal * 0.33) // 33% do valor do serviço
    const maxByBalance = clientCashbackBalance // Saldo disponível
    return Math.min(maxByRule, maxByBalance) // Menor entre os dois
  }, [calculation.service_subtotal, clientCashbackBalance])

  // Auto-preencher cashback quando cliente seleciona usar
  useEffect(() => {
    if (useCashback && maxCashbackUsable > 0) {
      setCashbackInput((maxCashbackUsable / 100).toFixed(2))
    } else if (!useCashback) {
      setCashbackInput('0')
    }
  }, [useCashback, maxCashbackUsable])

  // Ajustar valor pago default para o total calculado
  useEffect(() => {
    setAmountPaidInput((calculation.total_to_pay_clinic / 100).toFixed(2))
  }, [calculation.total_to_pay_clinic])

  const handleAddSuggestion = () => {
    const suggestion = suggestions.find((s) => s.id === selectedSuggestion)
    if (!suggestion) return
    setLocalItems((prev) => [...prev, suggestion])
    toast.info(`Item sugerido adicionado: ${suggestion.name}`)
    setSelectedSuggestion('')
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const amountPaid = centsFromInput(amountPaidInput)
      const payload = {
        clinic_id: organizationId, // ✅ Mudado de organization_id para clinic_id
        appointment_id: appointmentId,
        client_id: clientId,
        items: localItems,
        payment_method: paymentMethod,
        amount_paid: amountPaid,
        discount_amount_cents: discountCents,
        cashback_to_redeem_cents: cashbackCents,
        subtotal_gross: calculation.subtotal_gross,
        platform_fee: calculation.platform_fee,
        total_to_pay_clinic: calculation.total_to_pay_clinic,
        split_base_value: calculation.split_base_value,
        service_subtotal: calculation.service_subtotal,
      cashback_multiplier: cashbackMultiplier,
      }

      // Validação: cashback usado não pode exceder 33% do valor do serviço
      const maxUsable = Math.floor(payload.service_subtotal * 0.33)
      if (payload.cashback_to_redeem_cents > maxUsable) {
        toast.error(`Cashback máximo utilizável é R$ ${(maxUsable / 100).toFixed(2)} (33% do valor do serviço)`)
        return
      }

      // Validação: cashback usado não pode exceder saldo disponível
      if (payload.cashback_to_redeem_cents > clientCashbackBalance) {
        toast.error(`Saldo de cashback insuficiente. Disponível: R$ ${(clientCashbackBalance / 100).toFixed(2)}`)
        return
      }

      // Validação Zod
      checkoutSchema.parse(payload)

      // Processar pagamento
      if (paymentMethod === 'pix' || paymentMethod === 'credit') {
        const { error } = await supabase.functions.invoke('process-payment', {
          body: payload,
        })
        if (error) throw error
      } else {
        // Dinheiro ou Maquininha própria: registrar transação com fee pendente
        const { error } = await supabase.from('financial_transactions').insert({
          clinic_id: organizationId, // organizationId é o clinic_id (prop mantida para compatibilidade)
          appointment_id: appointmentId,
          amount_cents: payload.total_to_pay_clinic,
          platform_fee_cents: calculation.platform_fee,
          payment_method: paymentMethod,
          is_fee_ledger_pending: true,
          status: 'pending',
        })
        if (error) throw error
      }

      // Processar cashback usado (subtrair do wallet do cliente)
      if (payload.cashback_to_redeem_cents > 0 && clientId) {
        // Buscar clinic_id do appointment
        const { data: appointment } = await supabase
          .from('appointments')
          .select('clinic_id')
          .eq('id', appointmentId)
          .single()

        if (appointment?.clinic_id) {
          const { data: currentWallet } = await supabase
            .from('client_wallet')
            .select('balance_cents, total_spent_cents')
            .eq('client_id', clientId)
            .eq('clinic_id', appointment.clinic_id)
            .maybeSingle()

          if (currentWallet) {
            const newBalance = Math.max(0, (currentWallet.balance_cents || 0) - payload.cashback_to_redeem_cents)
            const newTotalSpent = (currentWallet.total_spent_cents || 0) + payload.cashback_to_redeem_cents
            await supabase
              .from('client_wallet')
              .update({ 
                balance_cents: newBalance,
                total_spent_cents: newTotalSpent,
              })
              .eq('client_id', clientId)
              .eq('clinic_id', appointment.clinic_id)
          }
        }
      }

      // Processar cashback dado pelo profissional (adicionar ao wallet do cliente)
      let cashbackEarnedAmount = 0
      if (giveCashback && professionalCashbackConfig?.enabled && clientId) {
        let cashbackAmount = 0
        if (professionalCashbackConfig.mode === 'percent' && professionalCashbackConfig.percent) {
          cashbackAmount = Math.round(payload.service_subtotal * (professionalCashbackConfig.percent / 100))
        } else if (professionalCashbackConfig.mode === 'fixed' && professionalCashbackConfig.fixed) {
          cashbackAmount = Math.round(professionalCashbackConfig.fixed * 100)
        }

        if (cashbackAmount > 0) {
          cashbackEarnedAmount = cashbackAmount
          // Buscar appointment para pegar clinic_id
          const { data: appointment } = await supabase
            .from('appointments')
            .select('clinic_id')
            .eq('id', appointmentId)
            .single()

          if (!appointment?.clinic_id) {
            console.error('Não foi possível obter clinic_id do agendamento')
            return
          }

          // Buscar ou criar wallet
          const { data: wallet } = await supabase
            .from('client_wallet')
            .select('balance_cents, total_earned_cents')
            .eq('client_id', clientId)
            .eq('clinic_id', appointment.clinic_id)
            .maybeSingle()

          if (wallet) {
            const newBalance = (wallet.balance_cents || 0) + cashbackAmount
            const newTotalEarned = (wallet.total_earned_cents || 0) + cashbackAmount
            await supabase
              .from('client_wallet')
              .update({ 
                balance_cents: newBalance,
                total_earned_cents: newTotalEarned,
              })
              .eq('client_id', clientId)
              .eq('clinic_id', appointment.clinic_id)
          } else {
            await supabase
              .from('client_wallet')
              .insert({
                clinic_id: appointment.clinic_id,
                client_id: clientId,
                balance_cents: cashbackAmount,
                total_earned_cents: cashbackAmount,
              })
          }
        }
      }

      // Salvar cashback ganho no agendamento (para histórico)
      if (appointmentId && cashbackEarnedAmount > 0) {
        await supabase
          .from('appointments')
          .update({ cashback_earned_cents: cashbackEarnedAmount })
          .eq('id', appointmentId)
      }

      // Fechar modal de checkout e mostrar confirmação
      onClose()
      setCashbackEarned(cashbackEarnedAmount)
      setShowConfirmation(true)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao processar pagamento'
      toast.error(message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <>
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        onClick={onClose}
        role="presentation"
      />
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-2 pb-4 sm:px-4">
        <div className="w-full max-w-lg bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Checkout Rápido</p>
              <h2 className="text-lg font-semibold">Finalizar cobrança</h2>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white px-2 py-1 rounded-md"
              aria-label="Fechar"
            >
              ✕
            </button>
          </div>

          <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-slate-200">Itens</h3>
              </div>
              <div className="space-y-2">
                {localItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-slate-400">
                        {item.type === 'service' ? 'Serviço' : 'Produto'} •{' '}
                        {formatCents(item.price_cents)}
                      </p>
                    </div>
                    <span className="text-sm text-slate-200">
                      {formatCents(item.price_cents * (item.quantity ?? 1))}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-2">
              <label className="block text-sm text-slate-300">
                Upsell (Gaby): Sugestão
                <div className="mt-1 flex gap-2">
                  <select
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                    value={selectedSuggestion}
                    onChange={(e) => setSelectedSuggestion(e.target.value)}
                  >
                    <option value="">Selecione uma sugestão</option>
                    {suggestions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({formatCents(s.price_cents)})
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    onClick={handleAddSuggestion}
                    variant="default"
                    className="bg-purple-600 text-white hover:bg-purple-700"
                    disabled={!selectedSuggestion}
                  >
                    Adicionar
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  Sugestão ativa conforme regras da Gaby (ex: reposição após 45 dias).
                </p>
              </label>
            </section>

            {/* Opção para profissional dar cashback */}
            {professionalCashbackConfig?.enabled && (
              <section className="space-y-2 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-sm font-medium text-slate-200">Dar Cashback ao Cliente</label>
                    <p className="text-xs text-slate-400 mt-1">
                      {professionalCashbackConfig.mode === 'percent'
                        ? `${professionalCashbackConfig.percent}% do valor do serviço`
                        : `R$ ${professionalCashbackConfig.fixed?.toFixed(2)} fixo`}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={giveCashback}
                      onChange={(e) => setGiveCashback(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>
              </section>
            )}

            <section className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Desconto (R$)</label>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <label className="block text-sm text-slate-300 flex-1">Usar Cashback</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useCashback}
                      onChange={(e) => setUseCashback(e.target.checked)}
                      disabled={clientCashbackBalance === 0 || maxCashbackUsable === 0}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
                  </label>
                </div>
                {useCashback && (
                  <>
                    <input
                      className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                      value={cashbackInput}
                      onChange={(e) => setCashbackInput(e.target.value)}
                      inputMode="decimal"
                      max={maxCashbackUsable / 100}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Máximo: R$ {(maxCashbackUsable / 100).toFixed(2)} (33% do serviço ou saldo disponível)
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Saldo disponível: R$ {(clientCashbackBalance / 100).toFixed(2)}
                    </p>
                  </>
                )}
                {!useCashback && clientCashbackBalance > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    Você tem R$ {(clientCashbackBalance / 100).toFixed(2)} de cashback disponível
                  </p>
                )}
              </div>
            </section>

            <section className="space-y-2">
              <label className="block text-sm text-slate-300">Método de pagamento</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['pix', 'credit', 'cash', 'proprietary_machine'] as PaymentMethod[]).map(
                  (method) => (
                    <button
                      key={method}
                      onClick={() => setPaymentMethod(method)}
                      className={clsx(
                        'px-3 py-2 rounded-lg border text-sm capitalize',
                        paymentMethod === method
                          ? 'border-blue-500 bg-blue-500/10 text-white'
                          : 'border-slate-700 bg-slate-800 text-slate-200'
                      )}
                    >
                      {method.replace('_', ' ')}
                    </button>
                  )
                )}
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-slate-300">Valor pago (R$)</label>
                <input
                  className="mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white"
                  value={amountPaidInput}
                  onChange={(e) => setAmountPaidInput(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div className="rounded-lg border border-slate-800 p-3 bg-slate-800/50">
                <p className="text-xs text-slate-400">Total a pagar</p>
                <p className="text-lg font-semibold text-white">
                  {formatCents(calculation.total_to_pay_clinic)}
                </p>
                <p className="text-xs text-slate-500">
                  Subtotal: {formatCents(calculation.subtotal_gross)} • Taxa plataforma:{' '}
                  {formatCents(calculation.platform_fee)}
                </p>
              </div>
            </section>
          </div>

          <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full sm:w-auto justify-center"
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              variant="default"
              className="w-full sm:w-auto justify-center bg-purple-600 text-white hover:bg-purple-700"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? 'Processando...' : 'Finalizar'}
            </Button>
          </div>
        </div>
      </div>
      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      
      {/* Modal de Confirmação de Pagamento e Avaliação */}
      <PaymentConfirmationModal
        open={showConfirmation}
        onClose={() => {
          setShowConfirmation(false)
          onSuccess?.()
        }}
        appointmentId={appointmentId}
        clientId={clientId}
        totalPaid={calculation.total_to_pay_clinic}
        cashbackEarned={cashbackEarned}
        onRatingSubmitted={() => {
          onSuccess?.()
        }}
      />
    </>,
    document.body
  )
}


