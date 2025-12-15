import { useMemo } from 'react'
import { startOfMonth, endOfMonth } from 'date-fns'
import { useScheduler } from '../context/SchedulerContext'
import { WeeklyProgressCard } from '../components/Analytics/WeeklyProgressCard'
import { useDashboardContext } from '../panels/ReceptionistPanel'

export function AnalyticsView() {
  const { appointments = [], clients = [] } = useScheduler()
  const { selectedProfessional } = useDashboardContext()

  const start = startOfMonth(new Date())
  const end = endOfMonth(new Date())

  // Filtrar agendamentos por profissional selecionado
  const filteredAppointments = useMemo(() => {
    let filtered = appointments
    if (selectedProfessional !== 'all') {
      filtered = appointments.filter((a) => a.professionalId === selectedProfessional)
    }
    return filtered
  }, [appointments, selectedProfessional])

  const monthAppointments = useMemo(
    () =>
      filteredAppointments.filter((a) => {
        const d = new Date(a.start)
        return d >= start && d <= end
      }),
    [filteredAppointments, start, end]
  )

  const completed = monthAppointments.filter((a) => a.status === 'confirmado').length
  const cancelled = monthAppointments.filter((a) => a.status === 'cancelado').length
  const cashbackUsado = monthAppointments.reduce((sum, a) => sum + ((a as any).cashback || 0), 0)
  
  // Filtrar clientes por agendamentos do profissional selecionado
  const novosClientes = useMemo(() => {
    if (selectedProfessional === 'all') {
      return clients.length
    }
    // Contar apenas clientes que têm agendamentos com o profissional selecionado
    const clientIds = new Set(monthAppointments.map((a) => a.clientId).filter(Boolean))
    return clientIds.size
  }, [clients, monthAppointments, selectedProfessional])

  const topProcedimentos = useMemo(() => {
    const map = new Map<string, number>()
    monthAppointments.forEach((a) => {
      const name = a.procedure || a.title || 'Procedimento'
      map.set(name, (map.get(name) || 0) + 1)
    })
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
  }, [monthAppointments])

  const clientesMes = useMemo(() => {
    const map = new Map<string, number>()
    monthAppointments.forEach((a) => {
      const count = map.get(a.clientId) || 0
      map.set(a.clientId, count + 1)
    })
    return Array.from(map.entries())
      .map(([clientId, visits]) => {
        const c = clients.find((cl) => cl.id === clientId)
        return { name: c?.name ?? clientId, visits }
      })
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 5)
  }, [monthAppointments, clients])

  return (
    <div className="space-y-4">
      {/* Gráfico de Performance Semanal */}
      <WeeklyProgressCard />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard title="Agendamentos realizados" value={completed} />
        <StatCard title="Faltas / Cancelados" value={cancelled} />
        <StatCard title="Cashback usado" value={`R$ ${cashbackUsado.toFixed(2)}`} />
        <StatCard title="Novos clientes" value={novosClientes} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">🏆 Top Procedimentos do mês</p>
          <div className="space-y-3">
            {topProcedimentos.map((item, idx) => (
              <div key={item.name} className="rounded-2xl bg-white/70 border border-white/60 px-3 py-3 flex items-center gap-3 shadow-sm">
                <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  <div className="w-full h-2 rounded-full bg-white/80 border border-white/60 overflow-hidden mt-1">
                    <div className="h-full bg-gray-900" style={{ width: `${Math.min(100, item.count * 8)}%` }} />
                  </div>
                </div>
                <span className="text-sm font-semibold text-gray-900">{item.count}</span>
              </div>
            ))}
            {topProcedimentos.length === 0 && <p className="text-sm text-gray-600">Nenhum procedimento no mês.</p>}
          </div>
        </div>

        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">⭐ Clientes do mês (Fidelidade)</p>
          <div className="space-y-3">
            {clientesMes.map((c, idx) => (
              <div key={c.name} className="rounded-2xl bg-white/70 border border-white/60 px-3 py-3 flex items-center gap-3 shadow-sm">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-700">
                  {c.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                  <p className="text-xs text-gray-600">{c.visits} visitas este mês</p>
                </div>
                <span className="text-xl">{idx === 0 ? '🏅' : '👏'}</span>
              </div>
            ))}
            {clientesMes.length === 0 && <p className="text-sm text-gray-600">Nenhum cliente recorrente no mês.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4 space-y-1">
      <p className="text-xs font-semibold text-gray-700">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

