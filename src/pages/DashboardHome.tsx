import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { TrendingUp, User } from 'lucide-react'
import { format, isToday, addMinutes } from 'date-fns'
import { AppointmentModal } from './SchedulerView'
import { useScheduler } from '../context/SchedulerContext'

const COLORS = {
  confirmed: '#22c55e',
  pending: '#f59e0b',
  cancelled: '#ef4444',
}

export function DashboardHome() {
  const { appointments = [], blocks = [], professionals = [] } = useScheduler()
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<any>(null)

  const todayAppointments = useMemo(
    () => appointments.filter((a) => isToday(new Date(a.start))),
    [appointments]
  )

  const donutData = useMemo(() => {
    const confirmed = todayAppointments.filter((a) => a.status === 'confirmado' || a.status === 'confirmed').length
    const pending = todayAppointments.filter((a) => a.status === 'pendente' || a.status === 'pending').length
    const cancelled = todayAppointments.filter((a) => a.status === 'cancelado' || a.status === 'cancelled').length
    return [
      { name: 'Confirmados', value: confirmed, color: COLORS.confirmed },
      { name: 'Pendentes', value: pending, color: COLORS.pending },
      { name: 'Cancelados', value: cancelled, color: COLORS.cancelled },
    ]
  }, [todayAppointments])

  const nextFree = useMemo(() => {
    const now = new Date()
    const slots: { profId: string; time: string }[] = []
    professionals
      .filter((p) => p.id !== 'all')
      .forEach((p) => {
        // varre de agora até +6h em blocos de 30min
        let cursor = new Date(now)
        for (let i = 0; i < 12; i++) {
          const startIso = cursor.toISOString()
          const endIso = addMinutes(cursor, 30).toISOString()
          const hasApt = appointments.some(
            (a) =>
              a.professionalId === p.id &&
              ((new Date(a.start) <= new Date(startIso) && new Date(a.end) > new Date(startIso)) ||
                (new Date(a.start) < new Date(endIso) && new Date(a.end) >= new Date(endIso)))
          )
          const hasBlock = blocks.some(
            (b) =>
              b.professionalId === p.id &&
              ((new Date(b.start) <= new Date(startIso) && new Date(b.end) > new Date(startIso)) ||
                (new Date(b.start) < new Date(endIso) && new Date(b.end) >= new Date(endIso)))
          )
          if (!hasApt && !hasBlock) {
            slots.push({ profId: p.id, time: format(cursor, 'HH:mm') })
            break
          }
          cursor = addMinutes(cursor, 30)
        }
      })
    return slots
  }, [appointments, blocks, professionals])

  const caixaHoje = useMemo(() => {
    const valid = todayAppointments.filter((a) => a.status !== 'cancelado' && a.status !== 'cancelled')
    const total = valid.reduce((sum, a) => sum + ((a as any).value || 0), 0)
    // comparativo simples com "ontem" simulado
    const ontem = total * 0.85
    const delta = total - ontem
    return { total, delta }
  }, [todayAppointments])

  const pendentesUrgentes = useMemo(
    () =>
      todayAppointments
        .filter((a) => a.status === 'pendente' || a.status === 'pending')
        .slice(0, 3),
    [todayAppointments]
  )

  const openAppointment = (profId: string, time: string) => {
    setModalData({
      mode: 'create',
      profId,
      time,
      date: new Date(),
    })
    setModalOpen(true)
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
      {/* Donut */}
      <div className="xl:col-span-2 rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4">
        <p className="text-sm font-semibold text-gray-900 mb-2">Status da Agenda (hoje)</p>
        <div className="h-64">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={donutData}
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {donutData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex justify-center gap-3 text-xs text-gray-700">
          {donutData.map((d) => (
            <span key={d.name} className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
              {d.name} ({d.value})
            </span>
          ))}
        </div>
      </div>

      {/* Caixa do dia */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4 flex flex-col gap-2">
        <p className="text-sm font-semibold text-gray-900">Caixa do Dia</p>
        <div className="text-3xl font-bold text-gray-900">R$ {caixaHoje.total.toFixed(2)}</div>
        <div className="flex items-center gap-2 text-xs text-emerald-700">
          <TrendingUp className="h-4 w-4" />
          +R$ {caixaHoje.delta.toFixed(2)} vs ontem (simulado)
        </div>
      </div>

      {/* Pendentes */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4 flex flex-col gap-3">
        <p className="text-sm font-semibold text-gray-900">Pendentes / Lembretes</p>
        {pendentesUrgentes.map((p) => (
          <div key={p.id} className="rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">{p.patient ?? p.title ?? 'Paciente'}</p>
              <p className="text-xs text-gray-500">{format(new Date(p.start), 'HH:mm')}</p>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Pendente
            </span>
          </div>
        ))}
        {pendentesUrgentes.length === 0 && <p className="text-sm text-gray-600">Sem pendências no momento.</p>}
      </div>

      {/* Próximos livres */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4 flex flex-col gap-3 xl:col-span-1">
        <p className="text-sm font-semibold text-gray-900">Próximos livres</p>
        <div className="space-y-2">
          {nextFree.map((slot) => {
            const prof = professionals.find((p) => p.id === slot.profId)
            return (
              <div key={slot.profId} className="rounded-xl bg-white/70 border border-white/60 px-3 py-2 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-700" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{prof?.name ?? slot.profId}</p>
                    <p className="text-xs text-gray-500">🕒 {slot.time}</p>
                  </div>
                </div>
                <button
                  onClick={() => openAppointment(slot.profId, slot.time)}
                  className="text-xs font-semibold text-gray-900 px-3 py-1 rounded-lg bg-white/80 border border-white/60"
                >
                  Preencher
                </button>
              </div>
            )
          })}
          {nextFree.length === 0 && <p className="text-sm text-gray-600">Nenhum horário livre nas próximas horas.</p>}
        </div>
      </div>

      {modalOpen && (
        <AppointmentModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          professionals={professionals.filter((p) => p.id !== 'all')}
          initialData={modalData}
          onSave={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

