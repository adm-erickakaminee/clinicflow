import { useState, useEffect } from 'react'
import { Clock, User, Calendar, CheckCircle2, X, AlertCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useScheduler } from '../../context/SchedulerContext'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '../ui/Toast'

interface RequestedAppointment {
  id: string
  client_id: string
  professional_id: string | null
  service_id: string | null
  start_time: string
  end_time: string
  client?: {
    full_name: string
    phone: string | null
  }
  professional?: {
    full_name: string
  }
  service?: {
    name: string
    price: number | null
  }
}

export function RequestQueueCard() {
  const { currentUser, updateAppointment } = useScheduler()
  const toast = useToast()
  const [requests, setRequests] = useState<RequestedAppointment[]>([])
  const [loading, setLoading] = useState(true)
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const clinicId = currentUser?.clinicId

  const loadRequests = async () => {
    if (!clinicId) {
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          client_id,
          professional_id,
          service_id,
          start_time,
          end_time,
          client:clients!appointments_client_id_fkey(id, full_name, phone),
          professional:profiles!appointments_professional_id_fkey(id, full_name),
          service:services!appointments_service_id_fkey(id, name, price)
        `)
        .eq('clinic_id', clinicId)
        .eq('status', 'requested')
        .order('start_time', { ascending: true })

      // Se houver erro, verificar se é um erro crítico
      if (error) {
        // Códigos de erro que NÃO devem mostrar notificação (ausência de dados, relacionamentos vazios, etc.)
        const silentErrorCodes = ['PGRST116', '42P01', '42703', '42883']
        const silentErrorMessages = ['no rows', 'relation', 'column', 'does not exist']
        
        const isSilentError = 
          (error.code && silentErrorCodes.includes(error.code)) ||
          (error.message && silentErrorMessages.some(msg => error.message.toLowerCase().includes(msg)))
        
        if (!isSilentError) {
          // Só mostrar erro para problemas críticos (permissão, conexão, etc.)
          console.error('Erro ao carregar solicitações:', error)
          toast.error('Erro ao carregar solicitações')
        }
        setRequests([])
        setLoading(false)
        return
      }
      
      // Mapear dados do Supabase para o formato esperado
      // Se data for null ou undefined, usar array vazio
      const mapped = (data || []).map((apt: any) => ({
        id: apt.id,
        client_id: apt.client_id,
        professional_id: apt.professional_id,
        service_id: apt.service_id,
        start_time: apt.start_time,
        end_time: apt.end_time,
        client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
        professional: Array.isArray(apt.professional) ? apt.professional[0] : apt.professional,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
      })) as RequestedAppointment[]
      
      setRequests(mapped)
    } catch (err) {
      // Em caso de exceção, verificar se é um erro crítico
      const error = err as any
      const silentErrorCodes = ['PGRST116', '42P01', '42703', '42883']
      const silentErrorMessages = ['no rows', 'relation', 'column', 'does not exist']
      
      const isSilentError = 
        (error?.code && silentErrorCodes.includes(error.code)) ||
        (error?.message && silentErrorMessages.some((msg: string) => error.message.toLowerCase().includes(msg)))
      
      if (!isSilentError) {
        console.error('Erro ao carregar solicitações:', err)
        toast.error('Erro ao carregar solicitações')
      }
      setRequests([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadRequests()

    // Realtime subscription
    if (!clinicId) return

    const channel = supabase
      .channel('requested-appointments')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `clinic_id=eq.${clinicId}`,
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
  }, [clinicId, toast])

  const handleConfirm = async (request: RequestedAppointment) => {
    if (processingIds.has(request.id)) return

    setProcessingIds(prev => new Set(prev).add(request.id))

    try {
      // Atualizar status para 'pending' usando updateAppointment do contexto
      const result = await updateAppointment(request.id, {
        status: 'pending',
      })

      if (result.ok) {
        toast.success('Agendamento confirmado!')
        await loadRequests()
      } else {
        toast.error(result.error || 'Erro ao confirmar agendamento')
      }
    } catch (err) {
      console.error('Erro ao confirmar agendamento:', err)
      toast.error('Erro ao confirmar agendamento')
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
      const result = await updateAppointment(request.id, {
        status: 'cancelled',
      })

      if (result.ok) {
        toast.success('Agendamento rejeitado')
        await loadRequests()
      } else {
        toast.error(result.error || 'Erro ao rejeitar agendamento')
      }
    } catch (err) {
      console.error('Erro ao rejeitar agendamento:', err)
      toast.error('Erro ao rejeitar agendamento')
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
          <AlertCircle className="h-6 w-6 text-gray-400" />
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
          <AlertCircle className="h-6 w-6 text-orange-500" />
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

                {/* Professional */}
                {request.professional && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-600">{request.professional.full_name}</p>
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
                    onClick={() => handleConfirm(request)}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 rounded-lg bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {isProcessing ? 'Processando...' : 'Confirmar'}
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

