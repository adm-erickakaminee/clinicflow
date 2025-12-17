import { useMemo, useState } from 'react'
import { startOfDay, endOfDay, format, differenceInMinutes } from 'date-fns'
import { useScheduler } from '../../context/SchedulerContext'
import { useToast } from '../ui/Toast'
import { CheckCircle, Clock, UserCheck, CreditCard, MapPin, Bell, Check } from 'lucide-react'
import { FinishAppointmentModal } from './FinishAppointmentModal'
import { supabase } from '../../lib/supabase'

// Configuração de Status em Português
const STATUS_MAP = {
  pending: { 
    label: 'Pendente', 
    color: 'bg-yellow-100 text-yellow-800', 
    border: 'border-yellow-200',
    icon: Clock
  },
  confirmed: { 
    label: 'Confirmado', 
    color: 'bg-blue-50 text-blue-700', 
    border: 'border-blue-200',
    icon: CheckCircle
  },
  waiting: { 
    label: 'Chegou / Aguardando', 
    color: 'bg-orange-100 text-orange-800', 
    border: 'border-orange-200',
    icon: MapPin
  },
  in_progress: { 
    label: 'Em Atendimento', 
    color: 'bg-green-100 text-green-800', 
    border: 'border-green-200',
    animate: 'animate-pulse',
    icon: UserCheck
  },
  medical_done: { 
    label: 'Aguardando Checkout', 
    color: 'bg-purple-100 text-purple-800', 
    border: 'border-purple-200',
    icon: CreditCard
  },
  completed: { 
    label: 'Finalizado', 
    color: 'bg-gray-100 text-gray-600', 
    border: 'border-gray-200',
    icon: Check
  },
  cancelled: { 
    label: 'Cancelado', 
    color: 'bg-red-50 text-red-600', 
    border: 'border-red-100',
    icon: Clock
  },
  // Compatibilidade com status antigos
  confirmado: { 
    label: 'Confirmado', 
    color: 'bg-blue-50 text-blue-700', 
    border: 'border-blue-200',
    icon: CheckCircle
  },
  pendente: { 
    label: 'Pendente', 
    color: 'bg-yellow-100 text-yellow-800', 
    border: 'border-yellow-200',
    icon: Clock
  },
  cancelado: { 
    label: 'Cancelado', 
    color: 'bg-red-50 text-red-600', 
    border: 'border-red-100',
    icon: Clock
  }
}

interface PatientFlowWidgetProps {
  onRefresh?: () => void
}

export function PatientFlowWidget({ onRefresh }: PatientFlowWidgetProps = {}) {
  const { appointments = [], clients = [], currentUser } = useScheduler()
  const toast = useToast()
  const [finishingAppointment, setFinishingAppointment] = useState<{ id: string; patientName: string } | null>(null)
  
  // Função de refresh padrão se não fornecida
  const handleRefresh = onRefresh || (() => {
    // Recarregar página apenas se não houver callback fornecido
    // Em produção, isso deve ser substituído por atualização de estado
    window.location.reload()
  })

  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())

  // Filtrar agendamentos de hoje (excluindo cancelados)
  const todayAppointments = useMemo(() => {
    return appointments
      .filter((apt) => {
        const aptDate = new Date(apt.start)
        const isNotCancelled = apt.status !== 'cancelado' && apt.status !== 'cancelled'
        return aptDate >= todayStart && aptDate <= todayEnd && isNotCancelled
      })
      .map((apt) => {
        const client = clients.find((c) => c.id === apt.clientId)
        return {
          ...apt,
          clientName: client?.name || apt.patient || 'Paciente',
          clientAvatar: '',
        }
      })
  }, [appointments, clients, todayStart, todayEnd])

  // Identificar role do usuário
  const isReceptionist = currentUser?.role === 'receptionist' || currentUser?.role === 'admin' || currentUser?.role === 'clinic_owner'
  const isProfessional = currentUser?.role === 'professional'

  // Organizar em grupos visuais
  const organizedGroups = useMemo(() => {
    // Normalizar status
    const normalizeStatus = (status: string) => {
      if (status === 'confirmado') return 'confirmed'
      if (status === 'pendente') return 'pending'
      if (status === 'cancelado') return 'cancelled'
      return status
    }

    // GRUPO 1: Ação Imediata (Destaque Topo)
    let immediateAction: typeof todayAppointments = []
    if (isReceptionist) {
      immediateAction = todayAppointments.filter((apt) => normalizeStatus(apt.status || '') === 'medical_done')
    } else if (isProfessional) {
      immediateAction = todayAppointments.filter((apt) => normalizeStatus(apt.status || '') === 'in_progress')
    }

    // GRUPO 2: Fila de Espera
    let waitingQueue: typeof todayAppointments = []
    if (isReceptionist) {
      waitingQueue = todayAppointments.filter((apt) => {
        const status = normalizeStatus(apt.status || '')
        return status === 'confirmed' || status === 'confirmado'
      })
    } else if (isProfessional) {
      waitingQueue = todayAppointments.filter((apt) => normalizeStatus(apt.status || '') === 'waiting')
    }

    // GRUPO 3: Histórico Recente (completed)
    const recentHistory = todayAppointments
      .filter((apt) => normalizeStatus(apt.status || '') === 'completed')
      .slice(0, 3) // Últimos 3

    return {
      immediateAction,
      waitingQueue,
      recentHistory,
    }
  }, [todayAppointments, isReceptionist, isProfessional])

  // Funções de ação
  const handleCheckIn = async (appointmentId: string) => {
    try {
      const checkInTime = new Date().toISOString()
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'waiting',
          check_in_time: checkInTime,
        } as any)
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Check-in realizado! Paciente aguardando atendimento.')
      // CORRIGIDO: Remover window.location.reload() - usar atualização de estado
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer check-in')
    }
  }

  const handleStartAppointment = async (appointmentId: string) => {
    try {
      const startTime = new Date().toISOString()
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'in_progress',
          start_time_actual: startTime,
        } as any)
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Atendimento iniciado!')
      // CORRIGIDO: Remover window.location.reload()
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao iniciar atendimento')
    }
  }

  const handleFinishAppointment = async (medicalNotes: string) => {
    if (!finishingAppointment) return

    try {
      const endTime = new Date().toISOString()
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'medical_done',
          end_time_actual: endTime,
          medical_notes: medicalNotes,
          notes: medicalNotes, // Fallback
        } as any)
        .eq('id', finishingAppointment.id)

      if (error) throw error

      setFinishingAppointment(null)
      toast.success('Atendimento finalizado! Paciente aguardando checkout.')
      // CORRIGIDO: Remover window.location.reload()
      handleRefresh()
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Erro ao finalizar atendimento')
    }
  }

  const handleCheckout = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Checkout realizado! Atendimento concluído.')
      // CORRIGIDO: Remover window.location.reload()
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao fazer checkout')
    }
  }

  const handleConfirm = async (appointmentId: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId)

      if (error) throw error

      toast.success('Agendamento confirmado!')
      // CORRIGIDO: Remover window.location.reload()
      handleRefresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao confirmar agendamento')
    }
  }

  // Obter botão de ação baseado no status
  const getActionButton = (apt: any) => {
    const normalizeStatus = (status: string) => {
      if (status === 'confirmado') return 'confirmed'
      if (status === 'pendente') return 'pending'
      if (status === 'cancelado') return 'cancelled'
      return status
    }

    const status = normalizeStatus(apt.status || 'pending')

    if (status === 'pending') {
      return (
        <button
          onClick={() => handleConfirm(apt.id)}
          className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition flex items-center gap-2 shadow-lg"
        >
          <CheckCircle className="w-4 h-4" />
          Confirmar
        </button>
      )
    }

    if (status === 'confirmed' || status === 'confirmado') {
      return (
        <button
          onClick={() => handleCheckIn(apt.id)}
          className="px-4 py-2 rounded-xl bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition flex items-center gap-2 shadow-lg"
        >
          <MapPin className="w-4 h-4" />
          Check-in / Chegou
        </button>
      )
    }

    if (status === 'waiting') {
      if (isProfessional) {
        return (
          <button
            onClick={() => handleStartAppointment(apt.id)}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition flex items-center gap-2 shadow-lg"
          >
            <Bell className="w-4 h-4" />
            Chamar Paciente
          </button>
        )
      }
      return (
        <button
          onClick={() => handleStartAppointment(apt.id)}
          className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold hover:bg-emerald-600 transition flex items-center gap-2 shadow-lg"
        >
          <UserCheck className="w-4 h-4" />
          Iniciar
        </button>
      )
    }

    if (status === 'in_progress') {
      return (
        <button
          onClick={() => setFinishingAppointment({ id: apt.id, patientName: apt.clientName })}
          className="px-4 py-2 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition flex items-center gap-2 shadow-lg"
        >
          <Check className="w-4 h-4" />
          Finalizar Atendimento
        </button>
      )
    }

    if (status === 'medical_done') {
      return (
        <button
          onClick={() => handleCheckout(apt.id)}
          className="px-4 py-2 rounded-xl bg-purple-500 text-white text-sm font-semibold hover:bg-purple-600 transition flex items-center gap-2 shadow-lg"
        >
          <CreditCard className="w-4 h-4" />
          Realizar Checkout
        </button>
      )
    }

    return null
  }

  // Obter informações do status
  const getStatusInfo = (status: string) => {
    const normalizeStatus = (s: string) => {
      if (s === 'confirmado') return 'confirmed'
      if (s === 'pendente') return 'pending'
      if (s === 'cancelado') return 'cancelled'
      return s
    }

    const normalized = normalizeStatus(status || 'pending')
    return STATUS_MAP[normalized as keyof typeof STATUS_MAP] || STATUS_MAP.pending
  }

  // Calcular tempo de atendimento (se in_progress)
  const getAppointmentDuration = (apt: any) => {
    if (apt.status !== 'in_progress' || !apt.startTime) return null
    try {
      const start = new Date(apt.startTime)
      const now = new Date()
      const minutes = differenceInMinutes(now, start)
      return `${minutes} min`
    } catch {
      return null
    }
  }

  // Renderizar card de agendamento
  const renderAppointmentCard = (apt: any, isHighlighted = false, isHistory = false) => {
    const statusInfo = getStatusInfo(apt.status || 'pending')
    const StatusIcon = statusInfo.icon
    const duration = getAppointmentDuration(apt)

    return (
      <div
        key={apt.id}
        className={`rounded-2xl border px-4 py-4 shadow-sm flex items-center gap-4 transition-all ${
          isHighlighted
            ? 'bg-white/90 border-white/80 shadow-xl scale-[1.02]'
            : isHistory
            ? 'bg-white/40 border-white/40 opacity-60'
            : 'bg-white/70 border-white/60 hover:shadow-md'
        }`}
      >
        {/* Avatar */}
        <div className="h-12 w-12 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
          {apt.clientAvatar ? (
            <img src={apt.clientAvatar} alt={apt.clientName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-semibold text-gray-700">
              {apt.clientName.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        {/* Informações */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{apt.clientName}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-600">
              {format(new Date(apt.start), 'HH:mm')}
            </span>
            {duration && (
              <span className="text-xs font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                {duration}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusInfo.color} ${statusInfo.border} border flex items-center gap-1`}>
              <StatusIcon className="w-3 h-3" />
              {statusInfo.label}
            </span>
          </div>
        </div>

        {/* Botão de Ação */}
        {!isHistory && getActionButton(apt)}
      </div>
    )
  }

  if (todayAppointments.length === 0) {
    return (
      <div className="rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm p-6">
        <p className="text-sm font-semibold text-gray-900 mb-2">Fluxo do Dia</p>
        <p className="text-xs text-gray-600">Nenhum agendamento para hoje</p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Fluxo do Dia</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {todayAppointments.length} agendamento{todayAppointments.length !== 1 ? 's' : ''} hoje
            </p>
          </div>
        </div>

        {/* GRUPO 1: Ação Imediata (Destaque Topo) */}
        {organizedGroups.immediateAction.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              Ação Imediata
            </p>
            {organizedGroups.immediateAction.map((apt) => renderAppointmentCard(apt, true))}
          </div>
        )}

        {/* GRUPO 2: Fila de Espera */}
        {organizedGroups.waitingQueue.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              {isReceptionist ? 'Aguardando Chegada' : 'Fila de Espera'}
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {organizedGroups.waitingQueue.map((apt) => renderAppointmentCard(apt, false))}
            </div>
          </div>
        )}

        {/* GRUPO 3: Histórico Recente */}
        {organizedGroups.recentHistory.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-white/40">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Finalizados Hoje
            </p>
            <div className="space-y-2">
              {organizedGroups.recentHistory.map((apt) => renderAppointmentCard(apt, false, true))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Finalização */}
      {finishingAppointment && (
        <FinishAppointmentModal
          isOpen={!!finishingAppointment}
          onClose={() => setFinishingAppointment(null)}
          appointmentId={finishingAppointment.id}
          patientName={finishingAppointment.patientName}
          onSave={handleFinishAppointment}
        />
      )}
    </>
  )
}
