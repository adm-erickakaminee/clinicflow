import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { format, isSameDay, addDays } from 'date-fns'
import { Plus } from 'lucide-react'
import { AppointmentModal } from './SchedulerView'
import { useScheduler } from '../context/SchedulerContext'
import { useDashboardContext } from '../panels/ReceptionistPanel'
import { AttendanceFlowCard } from '../components/Reception/AttendanceFlowCard'

type DateFilter = 'today' | 'tomorrow' | 'custom'

const statusStyles: Record<
  string,
  { badge: string; text: string; muted?: boolean }
> = {
  confirmed: { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', text: 'Confirmado' },
  confirmando: { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', text: 'Confirmado' },
  confirmado: { badge: 'bg-emerald-50 text-emerald-700 border border-emerald-100', text: 'Confirmado' },
  pending: { badge: 'bg-amber-50 text-amber-700 border border-amber-100', text: 'Pendente' },
  pendente: { badge: 'bg-amber-50 text-amber-700 border border-amber-100', text: 'Pendente' },
  cancelled: { badge: 'bg-slate-200 text-slate-500 border border-slate-300', text: 'Cancelado', muted: true },
  cancelado: { badge: 'bg-slate-200 text-slate-500 border border-slate-300', text: 'Cancelado', muted: true },
  completed: { badge: 'bg-blue-50 text-blue-700 border border-blue-100', text: 'Concluído' },
}

export function AppointmentsListView() {
  const { appointments, professionals, updateStatus } = useScheduler()
  const { selectedProfessional } = useDashboardContext()
  const [dateFilter, setDateFilter] = useState<DateFilter>('today')
  const [customDate, setCustomDate] = useState<Date | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<{
    mode: 'create' | 'edit'
    profId: string
    time: string
    date: Date
    event?: any
  } | null>(null)

  const targetDate = useMemo(() => {
    if (dateFilter === 'tomorrow') return addDays(new Date(), 1)
    if (dateFilter === 'custom' && customDate) return customDate
    return new Date()
  }, [dateFilter, customDate])

  const filtered = useMemo(() => {
    const sameDay = (iso: string) => isSameDay(new Date(iso), targetDate)
    return appointments
      .filter((apt) => sameDay(apt.start))
      .filter((apt) => selectedProfessional === 'all' || apt.professionalId === selectedProfessional)
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [appointments, selectedProfessional, targetDate])

  const groupedByPro = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    professionals
      .filter((p) => p.id !== 'all')
      .forEach((p) => map.set(p.id, []))
    filtered.forEach((apt) => {
      const list = map.get(apt.professionalId)
      if (list) list.push(apt)
    })
    return map
  }, [filtered, professionals])

  const handleNewAppointment = (profId: string) => {
    const fallbackPro = profId === 'all' ? professionals.find((p) => p.id !== 'all')?.id ?? '' : profId
    setModalData({
      mode: 'create',
      profId: fallbackPro,
      time: '09:00',
      date: targetDate,
    })
    setModalOpen(true)
  }

  const renderStatus = (status?: string) => {
    const style = status ? statusStyles[status] : undefined
    const badge = style?.badge ?? 'bg-white/70 text-gray-700 border border-white/60'
    const text = style?.text ?? (status ? status : '—')
    return (
      <span
        className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badge}`}
      >
        {text}
      </span>
    )
  }

  const isAll = selectedProfessional === 'all'

  return (
    <div className="space-y-6">
      {/* Card de Fluxo de Atendimento - sempre no topo */}
      <AttendanceFlowCard />

      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDateFilter('today')}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
              dateFilter === 'today' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/70 text-gray-800 border-white/70'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setDateFilter('tomorrow')}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
              dateFilter === 'tomorrow' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/70 text-gray-800 border-white/70'
            }`}
          >
            Amanhã
          </button>
          <button
            onClick={() => setDateFilter('custom')}
            className={`px-3 py-1.5 rounded-xl text-sm font-semibold border ${
              dateFilter === 'custom' ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/70 text-gray-800 border-white/70'
            }`}
          >
            Calendário
          </button>
          {dateFilter === 'custom' && (
            <input
              type="date"
              className="ml-2 rounded-xl border border-white/60 bg-white/80 px-3 py-1.5 text-sm text-gray-800 shadow-sm"
              value={format(targetDate, 'yyyy-MM-dd')}
              onChange={(e) => setCustomDate(new Date(e.target.value))}
            />
          )}
          <p className="text-sm text-gray-500 ml-2">
            {format(targetDate, "dd 'de' MMMM")}
          </p>
        </div>

        <button
          onClick={() => handleNewAppointment(selectedProfessional)}
          className="inline-flex items-center gap-2 rounded-xl bg-gray-900 text-white px-4 py-2 text-sm font-semibold shadow-lg shadow-black/10"
        >
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </button>
      </div>

      {isAll ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {professionals
            .filter((p) => p.id !== 'all')
            .map((prof) => {
              const profEvents = groupedByPro.get(prof.id) ?? []
              return (
                <div
                  key={prof.id}
                  className="bg-white/60 border border-white/40 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-3">
                    {prof.avatar ? (
                      <img src={prof.avatar} alt={prof.name} className="h-10 w-10 rounded-full object-cover border border-white/60 shadow" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-gray-200" />
                    )}
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{prof.name}</p>
                      <p className="text-xs text-gray-500">{prof.specialty}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {profEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className={`rounded-xl bg-white/60 border border-white/40 px-3 py-2 text-sm shadow-sm ${
                          statusStyles[ev.status ?? '']?.muted ? 'line-through text-gray-400' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <p className="font-semibold text-gray-900">{format(new Date(ev.start), 'HH:mm')}</p>
                          {renderStatus(ev.status)}
                        </div>
                        <p className="text-gray-700">{ev.title ?? ev.patient ?? 'Agendamento'}</p>
                        <p className="text-xs text-gray-500">
                          Duração: {ev.durationMinutes ? `${ev.durationMinutes} min` : '—'}
                        </p>
                      </div>
                    ))}
                    {profEvents.length === 0 && <p className="text-xs text-gray-500">Sem eventos nesta data.</p>}
                  </div>
                </div>
              )
            })}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ev) => {
            const isCancelled = ev.status === 'cancelado' || (ev.status as string) === 'cancelled'
            return (
              <div
                key={ev.id}
                className={`rounded-xl bg-white/60 border border-white/40 px-4 py-3 shadow-sm flex items-center justify-between ${
                  statusStyles[ev.status ?? '']?.muted ? 'opacity-60 line-through' : ''
                }`}
              >
                <div>
                  <p className="text-sm font-semibold text-gray-900">{ev.title ?? ev.patient ?? 'Agendamento'}</p>
                  <p className="text-xs text-gray-500">
                    {format(new Date(ev.start), 'HH:mm')} — {format(new Date(ev.end), 'HH:mm')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {renderStatus(ev.status)}
                  {!isCancelled && (
                    <button
                      onClick={() => updateStatus(ev.id, 'cancelado')}
                      className="text-xs font-semibold text-red-600 hover:text-red-700"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="text-sm text-gray-600">Sem agendamentos nesta data.</p>}
        </div>
      )}

      {modalOpen &&
        createPortal(
          <AppointmentModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            professionals={professionals.filter((p) => p.id !== 'all')}
            initialData={modalData}
            onSave={() => setModalOpen(false)}
          />,
          document.body,
        )}
      </div>
    </div>
  )
}

