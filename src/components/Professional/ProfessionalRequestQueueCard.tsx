import { useState, useEffect } from 'react'
import { Clock, User, Calendar, CheckCircle2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '../ui/Toast'
import type { AppointmentWithRelations } from '../../lib/types'

interface RequestedAppointment extends AppointmentWithRelations {}

interface ProfessionalRequestQueueCardProps {
  professionalId: string
}

export function ProfessionalRequestQueueCard({ professionalId }: ProfessionalRequestQueueCardProps) {
  const toast = useToast()
  const [requests, setRequests] = useState<RequestedAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const loadRequests = async () => {
    if (!professionalId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          client:clients (*),
          professional:profiles (*),
          service:services (*)
        `)
        .eq('professional_id', professionalId)
        .eq('status', 'requested')
        .order('start_time', { ascending: true })

      if (error) {
        console.error('Erro ao carregar solicitações:', error)
        toast.error('Erro ao carregar solicitações')
        setRequests([])
        setLoading(false)
        return
      }

      setRequests((data || []) as RequestedAppointment[])
    } catch (err) {
      console.error('Erro ao carregar solicitações:', err)
      toast.error('Erro ao carregar solicitações')
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()

    // Realtime subscription
    if (!professionalId) return

    const channel = supabase
      .channel('professional-requested-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `professional_id=eq.${professionalId}`,
        },
        (payload) => {
          // Recarregar se status mudou para/de 'requested'
          if (payload.new && (payload.new as any).status === 'requested') {
            loadRequests()
          } else if (payload.old && (payload.old as any).status === 'requested') {
            loadRequests()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [professionalId, toast])

  const handleAccept = async (request: RequestedAppointment) => {
    if (processingIds.has(request.id)) return

    setProcessingIds(prev => new Set(prev).add(request.id))

    try {
      // Atualizar status para 'confirmed'
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'confirmed',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)

      if (error) throw error

      toast.success('Solicitação aceita com sucesso!')
      await loadRequests()
    } catch (err) {
      console.error('Erro ao aceitar solicitação:', err)
      toast.error('Erro ao aceitar solicitação')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(request.id)
        return next
      })
    }
  }

  const handleReject = async (request: RequestedAppointment) => {
    if (processingIds.has(request.id)) return

    setProcessingIds(prev => new Set(prev).add(request.id))

    try {
      // Atualizar status para 'cancelled'
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)

      if (error) throw error

      toast.success('Solicitação rejeitada')
      await loadRequests()
    } catch (err) {
      console.error('Erro ao rejeitar solicitação:', err)
      toast.error('Erro ao rejeitar solicitação')
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(request.id)
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando solicitações...</p>
      </div>
    )
  }

  if (requests.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Solicitações de Agendamento</h3>
        </div>
        <p className="text-sm text-gray-500">Nenhuma solicitação pendente no momento.</p>
      </div>
    )
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">
            Solicitações de Agendamento
          </h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-sm font-semibold">
          {requests.length} {requests.length === 1 ? 'pendente' : 'pendentes'}
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {requests.map((request) => {
          const isProcessing = processingIds.has(request.id)
          return (
            <div
              key={request.id}
              className="bg-white/80 rounded-xl p-4 border border-gray-200"
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="font-semibold text-gray-900">
                        {request.client?.full_name || 'Cliente'}
                      </p>
                    </div>
                    {request.client?.phone && (
                      <p className="text-sm text-gray-600">{request.client.phone}</p>
                    )}
                  </div>
                </div>

                {/* Service */}
                {request.service && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">{request.service.name}</p>
                    {request.service.price && (
                      <span className="text-sm text-gray-500">
                        • R$ {(request.service.price / 100).toFixed(2)}
                      </span>
                    )}
                  </div>
                )}

                {/* Date and Time */}
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <p className="text-sm text-gray-600">
                    {format(new Date(request.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t border-gray-200">
                  <button
                    onClick={() => handleAccept(request)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isProcessing ? 'Processando...' : 'Aceitar'}
                  </button>
                  <button
                    onClick={() => handleReject(request)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Rejeitar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

