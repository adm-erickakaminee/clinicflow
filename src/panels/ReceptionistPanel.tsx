import { useMemo, useState } from 'react'
import { Building2, Bell, LogOut } from 'lucide-react'
import { SchedulerView } from '../pages/SchedulerView'
import { useScheduler } from '../context/SchedulerContext'
import { AppointmentsListView } from '../pages/AppointmentsListView'
import { WhatsAppView } from '../pages/WhatsAppView'
import { ClientsView } from '../pages/ClientsView'
import { AnalyticsView } from '../pages/AnalyticsView'
import { ResourceManagementView } from '../pages/ResourceManagementView'
import UserProfileModal from '../components/UserProfileModal'
import { ProfessionalHeroCard } from '../components/Analytics/ProfessionalHeroCard'
import { startOfDay, endOfDay } from 'date-fns'
import { PanelProvider, usePanelContext } from '../context/PanelContext'
import { RequestQueueCard } from '../components/Reception/RequestQueueCard'

type Professional = {
  id: string
  name: string
  specialty: string
  avatar: string
}

// Manter compatibilidade com código antigo - usar PanelContext internamente
export function useDashboardContext() {
  const ctx = usePanelContext()
  // Mapear para compatibilidade: selectedProfessional = selectedFilter
  return {
    activeTab: ctx.activeTab,
    setActiveTab: ctx.setActiveTab,
    selectedProfessional: ctx.selectedFilter,
    setSelectedProfessional: ctx.setSelectedFilter,
  }
}

export function ReceptionistPanel() {
  const [activeTabSnapshot, setActiveTabSnapshot] = useState<string | null>(null)
  const { professionals } = useScheduler()

  return (
    <PanelProvider filterType="professional" defaultTab="Agendamentos" defaultFilter="all">
      <div className="relative min-h-screen bg-gradient-to-br from-[#ffb3a7] via-[#ffc78f] to-[#ffe7a3] text-gray-900 font-sans overflow-hidden">
        {/* Blobs */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-[#ff8fa3] blur-3xl opacity-70 animate-pulse" />
          <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[#ffd27f] blur-[120px] opacity-80 animate-pulse" />
          <div className="absolute -right-28 bottom-6 h-[28rem] w-[28rem] rounded-full bg-[#ffeab5] blur-[120px] opacity-80 animate-pulse" />
          <div className="absolute left-10 bottom-10 h-64 w-64 rounded-full bg-white/50 blur-[90px] opacity-70" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-6">
          <Header />
          <TopMenu onTabChange={(tab) => setActiveTabSnapshot(tab)} />

          <DashboardBody
            activeTabSnapshot={activeTabSnapshot}
            professionals={professionals}
          />
        </div>
      </div>
    </PanelProvider>
  )
}

function Header() {
  const { currentUser, signOut, updateUserProfile } = useScheduler()
  const [profileModal, setProfileModal] = useState(false)
  const userName = currentUser?.fullName || 'Usuário'
  const userRole = currentUser?.role || ''
  const avatarUrl = currentUser?.avatarUrl || ''
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Olá, {userName} 👋</h1>
          <p className="text-sm text-gray-500">{userRole}</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="h-11 w-11 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg flex items-center justify-center text-gray-700">
            <Bell className="h-5 w-5" />
          </button>
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/70 border border-white/60 shadow cursor-pointer hover:bg-white/90 transition"
            onClick={() => setProfileModal(true)}
          >
            <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 border border-white/60 shadow-inner flex items-center justify-center text-sm font-semibold text-gray-700">
              {avatarUrl ? <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" /> : initials}
            </div>
            <div className="hidden sm:flex flex-col text-left">
              <span className="text-sm font-semibold text-gray-900">{userName}</span>
              <span className="text-xs text-gray-500">Perfil</span>
            </div>
          </div>
          <button
            className="h-11 px-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg text-sm font-semibold text-gray-800 flex items-center gap-2"
            onClick={() => signOut()}
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      </div>

      {profileModal && (
        <UserProfileModal
          isOpen={profileModal}
          onClose={() => setProfileModal(false)}
          user={{
            name: currentUser?.fullName || '',
            email: currentUser?.email || '',
            role: currentUser?.role || '',
            avatarUrl: avatarUrl,
          }}
          onSave={async (name, avatar) => {
            try {
              await updateUserProfile({ fullName: name, avatarUrl: avatar })
              // Aguardar um pouco para garantir que o estado foi atualizado
              await new Promise(resolve => setTimeout(resolve, 100))
              setProfileModal(false)
            } catch (error) {
              console.error('Erro ao salvar perfil:', error)
              // O erro já será mostrado pelo toast no modal
              throw error
            }
          }}
          onLogout={async () => {
            await signOut()
          }}
        />
      )}
    </>
  )
}

function TopMenu({ onTabChange }: { onTabChange?: (tab: string) => void }) {
  const { activeTab, setActiveTab } = usePanelContext()
  
  // Abas para Recepcionista (sem Cadastros)
  const tabs = ['Calendário', 'Agendamentos', 'WhatsApp', 'Clientes', 'Análises', 'Configurações']

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap">
      {tabs.map((item) => {
        const active = activeTab === item
        return (
          <button
            key={item}
            onClick={() => {
              setActiveTab(item)
              onTabChange?.(item)
            }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
              active
                ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-black/10'
                : 'bg-white/60 text-gray-800 border-white/60 hover:bg-white/80'
            }`}
          >
            {item}
          </button>
        )
      })}
    </div>
  )
}

function DashboardBody({
  activeTabSnapshot,
  professionals,
}: {
  activeTabSnapshot: string | null
  professionals: Professional[]
}) {
  const { activeTab } = usePanelContext()
  const tab = activeTabSnapshot ?? activeTab

  if (tab === 'Calendário') {
    return (
      <div className="grid grid-cols-1">
        <MainContent />
      </div>
    )
  }

  if (tab === 'WhatsApp') {
    return (
      <div className="grid grid-cols-1">
        <MainContent />
      </div>
    )
  }

  if (tab === 'Clientes') {
    return (
      <div className="grid grid-cols-1">
        <MainContent />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px,1fr] gap-6 items-start">
      <div className="flex flex-col gap-6">
        {/* Hero Card acima do menu de profissionais (apenas na aba Análises) */}
        <AnalyticsHeroCard professionals={professionals} />
        <ProfessionalsSidebar professionals={professionals} />
      </div>
      <MainContent />
    </div>
  )
}

// Componente Hero Card para a sidebar (apenas Análises)
function AnalyticsHeroCard({ professionals }: { professionals: Professional[] }) {
  const { appointments = [] } = useScheduler()
  const { selectedProfessional, activeTab } = useDashboardContext()
  
  // Só mostrar na aba Análises
  if (activeTab !== 'Análises') return null
  
  // Se não houver profissionais, não mostrar
  if (!professionals || professionals.length === 0) return null

  // Calcular agendamentos de hoje
  const todayStart = startOfDay(new Date())
  const todayEnd = endOfDay(new Date())
  
  const todayAppointments = useMemo(
    () =>
      appointments.filter((a) => {
        const d = new Date(a.start)
        return d >= todayStart && d <= todayEnd && a.status !== 'cancelado'
      }),
    [appointments, todayStart, todayEnd]
  )

  // Calcular profissional em destaque
  const heroProfessional = useMemo(() => {
    // Se um profissional específico foi selecionado, mostrar ele
    if (selectedProfessional && selectedProfessional !== 'all') {
      const prof = professionals.find((p) => p.id === selectedProfessional)
      if (prof) {
        const count = todayAppointments.filter((a) => a.professionalId === prof.id).length
        return {
          professional: {
            id: prof.id,
            name: prof.name || 'Profissional',
            specialty: prof.specialty || 'Profissional',
            avatar: prof.avatar,
          },
          appointmentCount: count,
        }
      }
    }

    // Se "Todos" ou nenhum selecionado, calcular o top 1 do dia
    const professionalCounts = new Map<string, number>()
    todayAppointments.forEach((a) => {
      if (a.professionalId) {
        const count = professionalCounts.get(a.professionalId) || 0
        professionalCounts.set(a.professionalId, count + 1)
      }
    })

    // Encontrar o profissional com mais agendamentos
    let topProfessionalId: string | null = null
    let maxCount = 0
    professionalCounts.forEach((count, profId) => {
      if (count > maxCount) {
        maxCount = count
        topProfessionalId = profId
      }
    })

    if (topProfessionalId && maxCount > 0) {
      const prof = professionals.find((p) => p.id === topProfessionalId)
      if (prof) {
        return {
          professional: {
            id: prof.id,
            name: prof.name || 'Profissional',
            specialty: prof.specialty || 'Profissional',
            avatar: prof.avatar,
          },
          appointmentCount: maxCount,
        }
      }
    }

    // Fallback: primeiro profissional disponível
    if (professionals.length > 0) {
      const prof = professionals[0]
      return {
        professional: {
          id: prof.id,
          name: prof.name || 'Profissional',
          specialty: prof.specialty || 'Profissional',
          avatar: prof.avatar,
        },
        appointmentCount: 0,
      }
    }

    return null
  }, [selectedProfessional, professionals, todayAppointments])

  if (!heroProfessional) return null

  return (
    <ProfessionalHeroCard
      professional={heroProfessional.professional}
      appointmentCount={heroProfessional.appointmentCount}
    />
  )
}

function MainContent() {
  const { activeTab } = usePanelContext()

  if (activeTab === 'Calendário') {
    return (
      <div className="bg-white/0">
        <SchedulerView />
      </div>
    )
  }

  if (activeTab === 'Agendamentos') {
    return <AppointmentsListView />
  }

  if (activeTab === 'WhatsApp') {
    return <WhatsAppView />
  }

  if (activeTab === 'Clientes') {
    return <ClientsView />
  }

  if (activeTab === 'Análises') {
    return <AnalyticsView />
  }

  if (activeTab === 'Configurações') {
    return <ResourceManagementView />
  }

  // Placeholder
  return null
}

export function ProfessionalsSidebar({ professionals }: { professionals: Professional[] }) {
  const { selectedFilter: selectedProfessional, setSelectedFilter: setSelectedProfessional } = usePanelContext()

  return (
    <aside className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-4 flex flex-col gap-4 max-h-[calc(100vh-8rem)] overflow-y-auto pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="space-y-2">
        <p className="text-sm font-semibold text-gray-800">Profissionais</p>
        {professionals.map((p) => {
          const isAll = p.id === 'all'
          const active = selectedProfessional === p.id
          return (
            <button
              key={p.id}
              onClick={() => setSelectedProfessional(p.id)}
              className={`w-full text-left transition rounded-2xl border px-4 py-3 shadow-sm flex items-center gap-3 ${
                active
                  ? 'bg-white/80 border-white ring-2 ring-gray-900/10 shadow-lg'
                  : 'bg-white/50 border-white/40 hover:bg-white/70'
              }`}
            >
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                {isAll || !p.avatar ? (
                  <Building2 className="h-5 w-5 text-gray-700" />
                ) : (
                  <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900">{isAll ? 'Visão Geral' : p.name}</p>
                <p className="text-xs text-gray-500">{isAll ? 'Clínica completa' : p.specialty}</p>
              </div>
            </button>
          )
        })}
      </div>

    </aside>
  )
}

export function AgendaView({ professionals, events }: { professionals: Professional[]; events: Event[] }) {
  const { selectedFilter: selectedProfessional } = usePanelContext()
  const isAll = selectedProfessional === 'all'

  if (isAll) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-base font-semibold text-gray-900">Agenda — Visão Geral</p>
          <span className="text-xs text-gray-500">Hoje</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {professionals
            .filter((p) => p.id !== 'all')
            .map((prof) => {
              const profEvents = events.filter((e) => e.professionalId === prof.id)
              return (
                <div
                  key={prof.id}
                  className="bg-white/60 border border-white/40 rounded-2xl p-4 shadow-sm space-y-3"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={prof.avatar}
                      alt={prof.name}
                      className="h-10 w-10 rounded-full object-cover border border-white/60 shadow"
                    />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{prof.name}</p>
                      <p className="text-xs text-gray-500">{prof.specialty}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {profEvents.map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-xl bg-white/60 border border-white/40 px-3 py-2 text-sm shadow-sm"
                      >
                        <p className="font-semibold text-gray-900">{ev.time}</p>
                        <p className="text-gray-700">{ev.title}</p>
                        <p className="text-xs text-gray-500">Duração: {ev.duration}</p>
                      </div>
                    ))}
                    {profEvents.length === 0 && (
                      <p className="text-xs text-gray-500">Sem eventos hoje.</p>
                    )}
                  </div>
                </div>
              )
            })}
        </div>
      </div>
    )
  }

  const professional = professionals.find((p) => p.id === selectedProfessional)
  const profEvents = events.filter((e) => e.professionalId === selectedProfessional)
  const totalToday = profEvents.length
  const canceled = profEvents.filter((e) => e.status === 'cancelado').length
  const confirmed = totalToday - canceled

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {professional?.avatar && (
            <img
              src={professional.avatar}
              alt={professional.name}
              className="h-12 w-12 rounded-full object-cover border border-white/60 shadow"
            />
          )}
          <div>
            <p className="text-base font-semibold text-gray-900">
              Agenda — {professional?.name ?? 'Profissional'}
            </p>
            <p className="text-xs text-gray-500">{professional?.specialty}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-700">
          <span className="rounded-full bg-white/70 border border-white/60 px-3 py-1 font-semibold">
            Total: {totalToday}
          </span>
          <span className="rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 font-semibold text-emerald-700">
            Confirmados: {confirmed}
          </span>
          <span className="rounded-full bg-red-50 border border-red-100 px-3 py-1 font-semibold text-red-700">
            Cancelados: {canceled}
          </span>
        </div>
      </div>
      <div className="space-y-3">
        {profEvents.map((ev) => (
          <div
            key={ev.id}
            className="rounded-xl bg-white/60 border border-white/40 px-4 py-3 shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-gray-900">{ev.title}</p>
              <p className="text-xs text-gray-500">
                {ev.time} • {ev.duration}
              </p>
            </div>
            <span
              className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                ev.status === 'confirmado'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                  : ev.status === 'pendente'
                  ? 'bg-amber-50 text-amber-700 border border-amber-100'
                  : 'bg-red-50 text-red-700 border border-red-100'
              }`}
            >
              {ev.status ?? '—'}
            </span>
          </div>
        ))}
        {profEvents.length === 0 && (
          <p className="text-sm text-gray-600">Sem eventos para este profissional hoje.</p>
        )}
      </div>
    </div>
  )
}

// Função alternativa não utilizada - mantida para referência futura
export function AnalisesView({ professionals }: { professionals: Professional[] }) {
  const { selectedFilter: selectedProfessional } = usePanelContext()
  const isAll = selectedProfessional === 'all'

  if (isAll) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
        <p className="text-base font-semibold text-gray-900">Análises — Visão Geral</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassCard title="Faturamento Total" value="R$ 85.400" />
          <GlassCard title="Ocupação Geral" value="78%" />
          <GlassCard title="MRR Clínico" value="R$ 32.000" />
        </div>
      </div>
    )
  }

  const prof = professionals.find((p) => p.id === selectedProfessional)

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
      <p className="text-base font-semibold text-gray-900">
        Análises — {prof?.name ?? 'Profissional'}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassCard title="Comissão a Receber" value="R$ 4.200" />
        <GlassCard title="Meta Individual" value="65% atingida" />
        <GlassCard title="NPS do Médico" value="9.2 / 10" />
      </div>
    </div>
  )
}

function GlassCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="bg-white/60 border border-white/40 rounded-2xl p-4 shadow-sm">
      <p className="text-xs text-gray-500">{title}</p>
      <p className="text-lg font-semibold text-gray-900 mt-1">{value}</p>
    </div>
  )
}

