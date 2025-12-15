import { useState, useEffect, useMemo } from 'react'
import { Calendar, Clock, User, X, CheckCircle2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useScheduler } from '../../context/SchedulerContext'
import { format, addDays, startOfDay, setHours, setMinutes, eachDayOfInterval, isSameDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useToast } from '../../components/ui/Toast'

interface Service {
  id: string
  name: string
  description?: string
  duration_minutes: number
  price: number | null
}

interface Professional {
  id: string // profiles.id
  full_name: string
}

interface AvailableSlot {
  start: Date
  end: Date
  professionalId: string
  professionalName: string
}

interface ClientBookingViewProps {
  onClose: () => void
  onSuccess?: () => void
}

export function ClientBookingView({ onClose, onSuccess }: ClientBookingViewProps) {
  const { currentUser, addAppointment } = useScheduler()
  const toast = useToast()
  const [step, setStep] = useState<'service' | 'date' | 'time' | 'confirm'>('service')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Dados do formulário
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)

  // Dados carregados
  const [services, setServices] = useState<Service[]>([])
  const [professionals, setProfessionals] = useState<Professional[]>([])
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])

  const clientId = currentUser?.id
  const clinicId = currentUser?.clinicId

  // Carregar serviços
  useEffect(() => {
    const loadServices = async () => {
      if (!clinicId) return

      try {
        const { data, error } = await supabase
          .from('services')
          .select('*')
          .eq('clinic_id', clinicId)
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setServices((data || []).map(s => ({
          id: s.id,
          name: s.name,
          description: s.description,
          duration_minutes: s.duration_minutes,
          price: s.price,
        })))
      } catch (err) {
        console.error('Erro ao carregar serviços:', err)
        toast.error('Erro ao carregar serviços')
      }
    }

    loadServices()
  }, [clinicId, toast])

  // Carregar profissionais quando serviço é selecionado
  useEffect(() => {
    const loadProfessionals = async () => {
      if (!selectedService || !clinicId) {
        setProfessionals([])
        return
      }

      try {
        // Buscar profissionais que fazem este serviço
        // professional_services.professional_id referencia professionals.id
        const { data: professionalServices, error: psError } = await supabase
          .from('professional_services')
          .select('professional_id')
          .eq('service_id', selectedService.id)

        if (psError) throw psError

        if (!professionalServices || professionalServices.length === 0) {
          setProfessionals([])
          return
        }

        // professional_services.professional_id = professionals.id
        // Precisamos encontrar profiles onde profiles.professional_id = professionals.id
        const professionalIds = professionalServices.map(ps => ps.professional_id)

        // Buscar profiles que referenciam esses professionals
        // profiles.professional_id → professionals.id
        const { data: profiles, error: profError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('clinic_id', clinicId)
          .eq('role', 'professional')
          .in('professional_id', professionalIds)

        if (profError) throw profError
        setProfessionals((profiles || []).map(p => ({
          id: p.id, // profiles.id
          full_name: p.full_name || 'Profissional',
        })))
      } catch (err) {
        console.error('Erro ao carregar profissionais:', err)
        toast.error('Erro ao carregar profissionais')
      }
    }

    loadProfessionals()
  }, [selectedService, clinicId, toast])

  // Gerar slots disponíveis quando data e serviço são selecionados
  useEffect(() => {
    const generateAvailableSlots = async () => {
      if (!selectedService || !selectedDate || professionals.length === 0 || !clinicId) {
        setAvailableSlots([])
        return
      }

      setLoading(true)
      try {
        const slots: AvailableSlot[] = []
        const dayStart = startOfDay(selectedDate)
        const workStart = setHours(setMinutes(dayStart, 0), 8) // 08:00
        const workEnd = setHours(setMinutes(dayStart, 0), 18) // 18:00
        const slotDuration = selectedService.duration_minutes

        // Buscar appointments existentes para este dia
        const dayStartISO = workStart.toISOString()
        const dayEndISO = workEnd.toISOString()

        const { data: existingAppointments, error: aptError } = await supabase
          .from('appointments')
          .select('professional_id, start_time, end_time')
          .eq('clinic_id', clinicId)
          .gte('start_time', dayStartISO)
          .lte('end_time', dayEndISO)
          .in('status', ['pending', 'confirmed', 'waiting', 'in_progress'])

        if (aptError) throw aptError

        // Buscar blocks para este dia (se tabela existir)
        let blocks: any[] = []
        try {
          const { data: blocksData, error: blocksError } = await supabase
            .from('blocks')
            .select('professional_id, start_time, end_time')
            .eq('clinic_id', clinicId)
            .gte('start_time', dayStartISO)
            .lte('end_time', dayEndISO)

          if (!blocksError && blocksData) {
            blocks = blocksData
          }
          // Se tabela não existir, ignorar erro (não é crítico)
        } catch (err) {
          console.warn('Tabela blocks não disponível ou erro ao buscar:', err)
        }

        // Gerar slots para cada profissional
        for (const prof of professionals) {
          let currentTime = workStart

          while (currentTime < workEnd) {
            const slotEnd = new Date(currentTime.getTime() + slotDuration * 60 * 1000)

            if (slotEnd <= workEnd) {
              // Verificar se o slot está livre
              const isBlocked = (existingAppointments || []).some((apt: any) => {
                if (apt.professional_id !== prof.id) return false
                const aptStart = parseISO(apt.start_time)
                const aptEnd = parseISO(apt.end_time)
                return (currentTime < aptEnd && slotEnd > aptStart)
              }) || (blocks || []).some((block: any) => {
                if (block.professional_id && block.professional_id !== prof.id) return false
                const blockStart = parseISO(block.start_time)
                const blockEnd = parseISO(block.end_time)
                return (currentTime < blockEnd && slotEnd > blockStart)
              })

              if (!isBlocked) {
                slots.push({
                  start: currentTime,
                  end: slotEnd,
                  professionalId: prof.id,
                  professionalName: prof.full_name,
                })
              }
            }

            // Avançar 30 minutos para próximo slot
            currentTime = new Date(currentTime.getTime() + 30 * 60 * 1000)
          }
        }

        setAvailableSlots(slots.sort((a, b) => a.start.getTime() - b.start.getTime()))
      } catch (err) {
        console.error('Erro ao gerar slots:', err)
        toast.error('Erro ao verificar disponibilidade')
      } finally {
        setLoading(false)
      }
    }

    generateAvailableSlots()
  }, [selectedService, selectedDate, professionals, clinicId, toast])

  const handleSubmit = async () => {
    if (!selectedService || !selectedSlot || !clientId || !clinicId) {
      toast.error('Complete todos os campos')
      return
    }

    setSubmitting(true)
    try {
      // Criar appointment com status 'requested'
      // IMPORTANTE: professionalId deve ser profiles.id (conforme schema appointments.professional_id)
      const appointmentData: any = {
        professionalId: selectedSlot.professionalId, // profiles.id (correto conforme schema)
        clinicId: clinicId,
        start: selectedSlot.start.toISOString(),
        end: selectedSlot.end.toISOString(),
        clientId: clientId,
        status: 'requested', // Status será mapeado por mapStatusToBackend
        title: selectedService.name,
        patient: currentUser?.fullName || 'Cliente',
        procedure: selectedService.name,
        durationMinutes: selectedService.duration_minutes,
        color: 'bg-purple-200',
        serviceId: selectedService.id, // Adicionar serviceId ao payload
      }
      
      const result = await addAppointment(appointmentData)

      if (result.ok) {
        toast.success('Solicitação de agendamento enviada! Aguarde a confirmação da recepcionista.')
        onSuccess?.()
        onClose()
      } else {
        toast.error(result.error || 'Erro ao solicitar agendamento')
      }
    } catch (err: any) {
      console.error('Erro ao criar agendamento:', err)
      toast.error('Erro ao solicitar agendamento. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const canGoNext = () => {
    switch (step) {
      case 'service':
        return selectedService !== null
      case 'date':
        return selectedDate !== null
      case 'time':
        return selectedSlot !== null
      default:
        return false
    }
  }

  const handleNext = () => {
    if (step === 'service' && selectedService) {
      setStep('date')
    } else if (step === 'date' && selectedDate) {
      setStep('time')
    } else if (step === 'time' && selectedSlot) {
      setStep('confirm')
    }
  }

  const handleBack = () => {
    if (step === 'confirm') {
      setStep('time')
    } else if (step === 'time') {
      setStep('date')
    } else if (step === 'date') {
      setStep('service')
    }
  }

  // Datas disponíveis (próximos 30 dias)
  const availableDates = useMemo(() => {
    const today = startOfDay(new Date())
    return eachDayOfInterval({
      start: today,
      end: addDays(today, 30),
    })
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Agendar Novo Serviço</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="Fechar"
          >
            <X className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Seleção de Serviço */}
          {step === 'service' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecione o serviço</h3>
              <div className="grid grid-cols-1 gap-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => setSelectedService(service)}
                    className={`p-4 rounded-xl border-2 text-left transition ${
                      selectedService?.id === service.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{service.name}</p>
                        {service.description && (
                          <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                        )}
                        <p className="text-sm text-gray-600 mt-1">
                          Duração: {service.duration_minutes} min
                          {service.price && ` • R$ ${(service.price / 100).toFixed(2)}`}
                        </p>
                      </div>
                      {selectedService?.id === service.id && (
                        <CheckCircle2 className="h-6 w-6 text-purple-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Seleção de Data */}
          {step === 'date' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Selecione a data</h3>
              <div className="grid grid-cols-7 gap-2">
                {availableDates.map((date) => {
                  const isSelected = selectedDate && isSameDay(date, selectedDate)
                  const isPast = date < startOfDay(new Date())
                  return (
                    <button
                      key={date.toISOString()}
                      onClick={() => !isPast && setSelectedDate(date)}
                      disabled={isPast}
                      className={`p-3 rounded-lg text-center transition ${
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : isPast
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-xs font-medium">{format(date, 'EEE', { locale: ptBR })}</p>
                      <p className="text-lg font-semibold mt-1">{format(date, 'd')}</p>
                      <p className="text-xs">{format(date, 'MMM', { locale: ptBR })}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Step 3: Seleção de Horário e Profissional */}
          {step === 'time' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Selecione horário e profissional
              </h3>
              {loading ? (
                <p className="text-center text-gray-500 py-8">Carregando horários disponíveis...</p>
              ) : availableSlots.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum horário disponível para esta data.</p>
                  <button
                    onClick={() => setStep('date')}
                    className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Escolher outra data
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {availableSlots.map((slot, idx) => {
                    const isSelected = selectedSlot?.start.getTime() === slot.start.getTime() &&
                      selectedSlot?.professionalId === slot.professionalId
                    return (
                      <button
                        key={idx}
                        onClick={() => setSelectedSlot(slot)}
                        className={`w-full p-4 rounded-xl border-2 text-left transition ${
                          isSelected
                            ? 'border-purple-500 bg-purple-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Clock className="h-5 w-5 text-gray-500" />
                            <div>
                              <p className="font-semibold text-gray-900">
                                {format(slot.start, 'HH:mm')} - {format(slot.end, 'HH:mm')}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <User className="h-4 w-4 text-gray-400" />
                                <p className="text-sm text-gray-600">{slot.professionalName}</p>
                              </div>
                            </div>
                          </div>
                          {isSelected && <CheckCircle2 className="h-6 w-6 text-purple-500" />}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmação */}
          {step === 'confirm' && selectedService && selectedSlot && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirmar Agendamento</h3>
              
              <div className="bg-gray-50 rounded-xl p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <Calendar className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Serviço</p>
                    <p className="font-semibold text-gray-900">{selectedService.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <Calendar className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Data e Horário</p>
                    <p className="font-semibold text-gray-900">
                      {format(selectedSlot.start, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <User className="h-5 w-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Profissional</p>
                    <p className="font-semibold text-gray-900">{selectedSlot.professionalName}</p>
                  </div>
                </div>

                {selectedService.price && (
                  <div className="flex items-start gap-4">
                    <Calendar className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Valor</p>
                      <p className="font-semibold text-gray-900">
                        R$ {(selectedService.price / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  ⚠️ Este agendamento será enviado como solicitação. A recepcionista precisará confirmar antes do atendimento.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between gap-3">
          <button
            onClick={step === 'service' ? onClose : handleBack}
            className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
          >
            {step === 'service' ? 'Cancelar' : 'Voltar'}
          </button>

          {step === 'confirm' ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="px-6 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Enviando...' : 'Confirmar Solicitação'}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canGoNext()}
              className="px-6 py-2 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Próximo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

