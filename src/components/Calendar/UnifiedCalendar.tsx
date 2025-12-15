import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core'
import { startOfDay, endOfDay, addMinutes } from 'date-fns'
import { useAppointments } from '../../hooks/useAppointments'
import { useProfessionalQualifications } from '../../hooks/useProfessionalQualifications'
import { validateAppointmentMove, updateAppointmentSchema } from '../../schemas/appointment.schema'
import type { CalendarEvent, CalendarResource } from '../../lib/types'
import { CalendarHeader } from './CalendarHeader'
import { TimeColumn } from './TimeColumn'
import { ResourceColumn } from './ResourceColumn'
import { DragOverlay } from './DragOverlay'
import { ToastContainer, useToast } from '../ui/Toast'
import { Loader2, CalendarX } from 'lucide-react'

interface UnifiedCalendarProps {
  selectedDate?: Date
  onDateChange?: (date: Date) => void
  visibleProfessionals?: Set<string>
  theme?: 'light' | 'dark'
  additionalResources?: CalendarResource[]
}

export function UnifiedCalendar({ 
  selectedDate: externalSelectedDate,
  onDateChange: externalOnDateChange,
  visibleProfessionals,
  theme = 'dark',
  additionalResources = []
}: UnifiedCalendarProps = {}) {
  const [internalSelectedDate, setInternalSelectedDate] = useState(new Date())
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null)
  const [draggingEventId, setDraggingEventId] = useState<string | null>(null)
  
  const toast = useToast()

  // Usar data externa se fornecida, senão usar interna
  const selectedDate = externalSelectedDate || internalSelectedDate
  const setSelectedDate = externalOnDateChange || setInternalSelectedDate

  useEffect(() => {
    console.log('🔄 UnifiedCalendar - Componente montado', { 
      theme, 
      hasVisibleProfessionals: !!visibleProfessionals,
      additionalResourcesCount: additionalResources.length,
      additionalResources
    })
  }, [theme, visibleProfessionals, additionalResources])

  // Configurar sensores para drag & drop
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: {
      distance: 10, // Mínimo de 10px para iniciar o drag
    },
  })
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: {
      delay: 250,
      tolerance: 5,
    },
  })
  const sensors = useSensors(mouseSensor, touchSensor)

  // Buscar dados com hook customizado (inclui Realtime)
  const {
    events,
    resources,
    professionals,
    isLoading,
    error,
    refetch,
    updateAppointment,
    optimisticUpdate,
    rollbackUpdate,
  } = useAppointments({
    startDate: startOfDay(selectedDate),
    endDate: endOfDay(selectedDate),
  })

  // Obter qualificações dos profissionais para validação
  const qualifications = useProfessionalQualifications(professionals)

  // Combinar recursos do banco com recursos adicionais (profissionais fictícios)
  const allResources = useMemo(() => {
    const combined = [...resources, ...additionalResources]
    console.log('📋 UnifiedCalendar - Recursos combinados:', {
      resourcesCount: resources.length,
      additionalCount: additionalResources.length,
      totalCount: combined.length,
      additionalResources
    })
    return combined
  }, [resources, additionalResources])

  // Filtrar recursos por profissionais visíveis (se fornecido)
  const filteredResources = useMemo(() => {
    if (!visibleProfessionals || visibleProfessionals.size === 0) {
      return allResources
    }
    return allResources.filter(resource => visibleProfessionals.has(resource.id))
  }, [allResources, visibleProfessionals])

  // Filtrar eventos por recurso (profissional)
  const eventsByResource = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    
    filteredResources.forEach((resource) => {
      map.set(resource.id, [])
    })

    events.forEach((event) => {
      if (event.resourceId && map.has(event.resourceId)) {
        map.get(event.resourceId)!.push(event)
      }
    })

    return map
  }, [events, filteredResources])

  // Handler para início do drag
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const draggedEvent = active.data.current?.event as CalendarEvent | undefined

    if (draggedEvent) {
      setActiveEvent(draggedEvent)
      setDraggingEventId(draggedEvent.id)
    }
  }, [])

  // Handler para fim do drag
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event

      setActiveEvent(null)
      setDraggingEventId(null)

      if (!over || !active.data.current?.event) return

      const draggedEvent = active.data.current.event as CalendarEvent
      const dropData = over.data.current as { time: Date; resourceId: string } | undefined

      if (!dropData?.time || !dropData?.resourceId) return

      // Calcular novo horário mantendo a duração original
      const originalDuration =
        draggedEvent.end.getTime() - draggedEvent.start.getTime()
      const newStartTime = dropData.time
      const newEndTime = addMinutes(newStartTime, originalDuration / 60000)

      const payload = {
        appointmentId: draggedEvent.id,
        newProfessionalId: dropData.resourceId,
        newStartTime,
        newEndTime,
        serviceId: draggedEvent.appointment.service_id,
      }

      // Validação Zod (lança em caso de erro)
      try {
        updateAppointmentSchema.parse(payload)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Dados inválidos'
        toast.error(message)
        return
      }

      // Regra de negócio (qualificação)
      const validationResult = validateAppointmentMove(payload, qualifications)

      if (!validationResult.success) {
        toast.error(validationResult.error)
        return
      }

      // UI otimista
      const previousSnapshot = optimisticUpdate(draggedEvent.id, {
        professional_id: dropData.resourceId,
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
      })

      // Atualizar no banco de dados
      const result = await updateAppointment(draggedEvent.id, {
        professional_id: dropData.resourceId,
        start_time: newStartTime.toISOString(),
        end_time: newEndTime.toISOString(),
      })

      if (result.success) {
        toast.success('Agendamento movido com sucesso!')
      } else {
        rollbackUpdate(previousSnapshot)
        toast.error(result.error || 'Erro ao mover agendamento')
      }
    },
    [qualifications, updateAppointment, toast, optimisticUpdate, rollbackUpdate]
  )

  // Estado de carregamento - só mostrar loader se não houver recursos adicionais
  // Se houver profissionais fictícios, mostrar o calendário mesmo durante carregamento
  if (isLoading && events.length === 0 && allResources.length === 0) {
    const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
    const textClass = theme === 'light' ? 'text-gray-600' : 'text-slate-400'
    return (
      <div className={`flex items-center justify-center ${theme === 'light' ? 'min-h-[400px]' : 'h-screen'} ${bgClass}`}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
          <p className={textClass}>Carregando agenda...</p>
        </div>
      </div>
    )
  }

  // Estado de erro
  if (error) {
    const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
    return (
      <div className={`flex items-center justify-center ${theme === 'light' ? 'min-h-[400px]' : 'h-screen'} ${bgClass}`}>
        <div className="flex flex-col items-center gap-4 text-center px-4">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
            <CalendarX className="w-8 h-8 text-red-400" />
          </div>
          <h2 className={`text-xl font-semibold ${theme === 'light' ? 'text-gray-900' : 'text-white'}`}>Erro ao carregar agenda</h2>
          <p className={theme === 'light' ? 'text-gray-600' : 'text-slate-400 max-w-md'}>{error}</p>
          <button
            onClick={refetch}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className={`flex flex-col ${theme === 'light' ? 'bg-white' : 'bg-slate-900'} ${theme === 'light' ? '' : 'h-screen'}`}>
        {/* Header com navegação de data - apenas se tema escuro */}
        {theme === 'dark' && (
          <CalendarHeader
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onRefresh={refetch}
            isLoading={isLoading}
          />
        )}

        {/* Grid do calendário */}
        <div className={`${theme === 'light' ? 'max-h-[calc(100vh-400px)]' : 'flex-1'} overflow-auto`}>
          {filteredResources.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <CalendarX className={`w-16 h-16 mx-auto mb-4 ${theme === 'light' ? 'text-gray-400' : 'text-slate-600'}`} />
                <h3 className={`text-lg font-medium mb-2 ${theme === 'light' ? 'text-gray-700' : 'text-slate-300'}`}>
                  Nenhum profissional cadastrado
                </h3>
                <p className={`text-sm ${theme === 'light' ? 'text-gray-500' : 'text-slate-500'}`}>
                  Cadastre profissionais para visualizar a agenda
                </p>
                <p className={`text-xs mt-2 ${theme === 'light' ? 'text-gray-400' : 'text-slate-500'}`}>
                  Debug: resources={resources.length}, additional={additionalResources.length}, all={allResources.length}, filtered={filteredResources.length}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex min-w-max">
              {/* Coluna de horários */}
              <TimeColumn theme={theme} selectedDate={selectedDate} />

              {/* Colunas dos profissionais */}
              {filteredResources.map((resource) => {
                // Filtrar eventos apenas se visibleProfessionals estiver definido
                const resourceEvents = eventsByResource.get(resource.id) || []
                return (
                  <ResourceColumn
                    key={resource.id}
                    resource={resource}
                    events={resourceEvents}
                    selectedDate={selectedDate}
                    draggingEventId={draggingEventId}
                    theme={theme}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* Overlay do item sendo arrastado */}
        <DragOverlay activeEvent={activeEvent} />

        {/* Toast notifications */}
        <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
      </div>
    </DndContext>
  )
}

