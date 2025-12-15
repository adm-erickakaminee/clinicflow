import { useDroppable } from '@dnd-kit/core'
import { useMemo } from 'react'
import { format, setHours, setMinutes, startOfDay } from 'date-fns'
import clsx from 'clsx'
import type { CalendarEvent, CalendarResource } from '../../lib/types'
import { AppointmentCard } from './AppointmentCard'

interface ResourceColumnProps {
  resource: CalendarResource
  events: CalendarEvent[]
  selectedDate: Date
  startHour?: number
  endHour?: number
  intervalMinutes?: number
  draggingEventId?: string | null
  theme?: 'light' | 'dark'
}

export function ResourceColumn({
  resource,
  events,
  selectedDate,
  startHour = 7,
  endHour = 20,
  intervalMinutes = 30,
  draggingEventId,
  theme = 'dark',
}: ResourceColumnProps) {
  const timeSlots = useMemo(() => {
    const slots: { time: Date; id: string }[] = []
    const baseDate = startOfDay(selectedDate)

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        if (hour === endHour && minute > 0) break
        const time = setMinutes(setHours(baseDate, hour), minute)
        slots.push({
          time,
          id: `${resource.id}-${format(time, 'HH:mm')}`,
        })
      }
    }

    return slots
  }, [selectedDate, startHour, endHour, intervalMinutes, resource.id])

  // Agrupar eventos por slot de tempo
  const eventsBySlot = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()

    events.forEach((event) => {
      const eventHour = event.start.getHours()
      const eventMinute = event.start.getMinutes()
      const slotMinute = Math.floor(eventMinute / intervalMinutes) * intervalMinutes
      const slotKey = `${resource.id}-${String(eventHour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`

      if (!map.has(slotKey)) {
        map.set(slotKey, [])
      }
      map.get(slotKey)!.push(event)
    })

    return map
  }, [events, resource.id, intervalMinutes])

  const bgClass = theme === 'light' ? 'bg-white' : 'bg-slate-900'
  const borderClass = theme === 'light' ? 'border-gray-200' : 'border-slate-700'
  const headerBgClass = theme === 'light' ? 'bg-white' : 'bg-slate-800/50'
  const titleClass = theme === 'light' ? 'text-gray-900' : 'text-slate-200'
  const subtitleClass = theme === 'light' ? 'text-gray-600' : 'text-slate-500'
  
  return (
    <div className={`flex flex-col min-w-[280px] border-r ${borderClass}`}>
      {/* Header do recurso (profissional) */}
      <div className={`h-16 border-b ${borderClass} flex items-center justify-center gap-3 ${headerBgClass} sticky top-0 z-10`}>
        {resource.avatar ? (
          <img 
            src={resource.avatar} 
            alt={resource.title}
            className="w-10 h-10 rounded-full object-cover border-2 border-white"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {resource.title.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${titleClass}`}>{resource.title}</span>
          <span className={`text-xs ${subtitleClass}`}>
            Profissional
          </span>
        </div>
      </div>

      {/* Slots de tempo com drop zones - renderização simples sem virtualização */}
      <div className="flex-1 overflow-y-auto">
        {timeSlots.map((slot) => (
          <TimeSlotDropZone
            key={slot.id}
            slotId={slot.id}
            time={slot.time}
            resourceId={resource.id}
            events={eventsBySlot.get(slot.id) || []}
            draggingEventId={draggingEventId}
            theme={theme}
          />
        ))}
      </div>
    </div>
  )
}

interface TimeSlotDropZoneProps {
  slotId: string
  time: Date
  resourceId: string
  events: CalendarEvent[]
  draggingEventId?: string | null
}

function TimeSlotDropZone({ slotId, time, resourceId, events, draggingEventId, theme = 'dark' }: TimeSlotDropZoneProps & { theme?: 'light' | 'dark' }) {
  const { isOver, setNodeRef } = useDroppable({
    id: slotId,
    data: {
      time,
      resourceId,
      type: 'time-slot',
    },
  })

  const borderClass = theme === 'light' ? 'border-gray-100' : 'border-slate-800'
  const hoverClass = theme === 'light' ? 'hover:bg-gray-50' : 'hover:bg-slate-800/30'

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        `h-16 border-b ${borderClass} p-1 transition-colors duration-150`,
        {
          'bg-blue-500/20 ring-2 ring-blue-500 ring-inset': isOver,
          [hoverClass]: !isOver,
        }
      )}
    >
      {events.map((event) => (
        <AppointmentCard
          key={event.id}
          event={event}
          isDragging={draggingEventId === event.id}
          theme={theme}
        />
      ))}
    </div>
  )
}

