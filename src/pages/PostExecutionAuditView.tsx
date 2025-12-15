import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import { useScheduler } from '../context/SchedulerContext'
import { useToast } from '../components/ui/Toast'
import { CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react'

interface Transaction {
  id: string
  amount_cents: number
  clinic_share_cents: number
  platform_fee_cents: number
  professional_share_cents: number
  payment_method: string | null
  status: string
  created_at: string
  appointment_id: string | null
  professional_id: string | null
  professional?: {
    full_name: string | null
  }
  appointment?: {
    client_id: string | null
    client?: {
      full_name: string | null
    }
  }
}

export function PostExecutionAuditView() {
  const { currentUser } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [auditing, setAuditing] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  const clinicId = currentUser?.clinicId

  useEffect(() => {
    if (!clinicId) {
      setLoading(false)
      return
    }

    loadPendingAudits()
  }, [clinicId])

  const loadPendingAudits = async () => {
    if (!clinicId) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select(`
          id,
          amount_cents,
          clinic_share_cents,
          platform_fee_cents,
          professional_share_cents,
          payment_method,
          status,
          created_at,
          appointment_id,
          professional_id,
          professional:profiles!financial_transactions_professional_id_fkey(full_name),
          appointment:appointments!financial_transactions_appointment_id_fkey(
            client_id,
            client:clients!appointments_client_id_fkey(full_name)
          )
        `)
        .eq('clinic_id', clinicId)
        .eq('is_admin_audited', false)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setTransactions((data as Transaction[]) || [])
    } catch (err) {
      console.error('Erro ao carregar transações pendentes:', err)
      toast.error('Falha ao carregar transações para auditoria')
    } finally {
      setLoading(false)
    }
  }

  const handleAudit = async (transactionId: string, approved: boolean) => {
    if (!clinicId) return

    setAuditing(transactionId)
    try {
      const { error } = await supabase
        .from('financial_transactions')
        .update({ is_admin_audited: approved })
        .eq('id', transactionId)

      if (error) throw error

      toast.success(approved ? 'Transação auditada e aprovada' : 'Transação marcada para revisão')
      await loadPendingAudits()
    } catch (err) {
      console.error('Erro ao auditar transação:', err)
      toast.error('Falha ao processar auditoria')
    } finally {
      setAuditing(null)
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
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-600 mx-auto" />
          <p className="mt-2 text-sm text-gray-600">Carregando transações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Auditoria Pós-Execução</h2>
        <p className="text-sm text-gray-600">
          Valide transações finalizadas antes de consolidar no financeiro
        </p>
      </div>

      {transactions.length === 0 ? (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-8 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Tudo em dia!</p>
          <p className="text-sm text-gray-600">Não há transações pendentes de auditoria</p>
        </div>
      ) : (
        <div className="space-y-4">
          {transactions.map((tx) => (
            <div
              key={tx.id}
              className="rounded-2xl bg-white/70 border border-white/60 shadow-lg p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="text-sm font-semibold text-gray-900">
                      Transação #{tx.id.slice(0, 8)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {format(new Date(tx.created_at), "dd/MM/yyyy 'às' HH:mm")}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    <div>
                      <p className="text-xs text-gray-600">Valor Total</p>
                      <p className="text-lg font-bold text-gray-900">
                        {formatCurrency(tx.amount_cents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Lucro da Clínica</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(tx.clinic_share_cents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Taxa Plataforma</p>
                      <p className="text-lg font-semibold text-gray-700">
                        {formatCurrency(tx.platform_fee_cents)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Comissão Profissional</p>
                      <p className="text-lg font-semibold text-blue-600">
                        {formatCurrency(tx.professional_share_cents)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {tx.professional && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Profissional:</span>{' '}
                        {tx.professional.full_name || 'N/A'}
                      </p>
                    )}
                    {tx.appointment?.client && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Cliente:</span>{' '}
                        {tx.appointment.client.full_name || 'N/A'}
                      </p>
                    )}
                    {tx.payment_method && (
                      <p className="text-sm text-gray-700">
                        <span className="font-semibold">Método de Pagamento:</span>{' '}
                        {tx.payment_method}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-2 ml-4">
                  <button
                    onClick={() => handleAudit(tx.id, true)}
                    disabled={auditing === tx.id}
                    className="px-4 py-2 bg-green-600 text-white rounded-xl font-semibold text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {auditing === tx.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Aprovar
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleAudit(tx.id, false)}
                    disabled={auditing === tx.id}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {auditing === tx.id ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Revisar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

