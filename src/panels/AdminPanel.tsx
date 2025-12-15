import { useState } from 'react'
import { Building2, Bell, LogOut } from 'lucide-react'
import { useScheduler } from '../context/SchedulerContext'
import UserProfileModal from '../components/UserProfileModal'
import { PanelProvider, usePanelContext } from '../context/PanelContext'
import { SchedulerView } from '../pages/SchedulerView'
import { AppointmentsListView } from '../pages/AppointmentsListView'
import { WhatsAppView } from '../pages/WhatsAppView'
import { ClientsView } from '../pages/ClientsView'
import { AnalyticsView } from '../pages/AnalyticsView'
import { SettingsView } from '../pages/SettingsView'
import { RegistrationsView } from '../pages/RegistrationsView'
import { AdminAnalyticsView } from '../pages/AdminAnalyticsView'
import { PostExecutionAuditView } from '../pages/PostExecutionAuditView'
import { FinancialView } from '../pages/FinancialView'
import { AdminSettingsView } from '../pages/AdminSettingsView'
import { AdminPersonalAgendaView } from '../pages/AdminPersonalAgendaView'
import { ReferralView } from '../pages/ReferralView'

type Professional = {
  id: string
  name: string
  specialty: string
  avatar: string
}

// Manter compatibilidade - usar PanelContext internamente
export function useDashboardContext() {
  const ctx = usePanelContext()
  return {
    activeTab: ctx.activeTab,
    setActiveTab: ctx.setActiveTab,
    selectedProfessional: ctx.selectedFilter,
    setSelectedProfessional: ctx.setSelectedFilter,
  }
}

export function AdminPanel() {
  const [activeTabSnapshot, setActiveTabSnapshot] = useState<string | null>(null)
  const { professionals } = useScheduler()

  return (
    <PanelProvider filterType="professional" defaultTab="Dashboard" defaultFilter="all">
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
              await new Promise(resolve => setTimeout(resolve, 100))
              setProfileModal(false)
            } catch (error) {
              console.error('Erro ao salvar perfil:', error)
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
  const { currentUser } = useScheduler()
  
  // Verificar se o Admin tem professional_id (é também um profissional ativo)
  const hasProfessionalId = !!currentUser?.professionalId
  
  // Abas para Admin: Dashboard Estratégico, Agenda Pessoal (se tiver professional_id), Auditoria, Financeiro, Gestão
  const tabs = [
    'Dashboard',
    ...(hasProfessionalId ? ['Minha Agenda'] : []),
    'Calendário',
    'Agendamentos',
    'WhatsApp',
    'Auditoria',
    'Financeiro',
    'Clientes',
    'Cadastros',
    'Configurações',
    'Indicação',
  ]

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

  // Abas que não devem mostrar a sidebar de profissionais
  const tabsWithoutSidebar = ['Dashboard', 'Calendário', 'WhatsApp', 'Clientes', 'Minha Agenda', 'Auditoria', 'Financeiro', 'Regras e Metas', 'Metas Individuais', 'Cadastros', 'Configurações', 'Indicação']

  if (tabsWithoutSidebar.includes(tab)) {
    return (
      <div className="grid grid-cols-1">
        <MainContent />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[300px,1fr] gap-6 items-start">
      <div className="flex flex-col gap-6">
        <ProfessionalsSidebar professionals={professionals} />
      </div>
      <MainContent />
    </div>
  )
}

function MainContent() {
  const { activeTab } = usePanelContext()
  const { currentUser } = useScheduler()

  // Dashboard Estratégico (foco em lucro e crescimento)
  if (activeTab === 'Dashboard') {
    return <AdminAnalyticsView />
  }

  // Minha Agenda e Atendimento (se Admin tiver professional_id)
  if (activeTab === 'Minha Agenda' && currentUser?.professionalId) {
    return <AdminPersonalAgendaView />
  }

  // Calendário Geral
  if (activeTab === 'Calendário') {
    return (
      <div className="bg-white/0">
        <SchedulerView />
      </div>
    )
  }

  // Agendamentos
  if (activeTab === 'Agendamentos') {
    return <AppointmentsListView />
  }

  // WhatsApp
  if (activeTab === 'WhatsApp') {
    return <WhatsAppView />
  }

  // Auditoria Pós-Execução
  if (activeTab === 'Auditoria') {
    return <PostExecutionAuditView />
  }

  // Financeiro Completo
  if (activeTab === 'Financeiro') {
    return <FinancialView />
  }

  // Clientes
  if (activeTab === 'Clientes') {
    return <ClientsView />
  }

  // Cadastros
  if (activeTab === 'Cadastros') {
    console.log('🔍 AdminPanel - Renderizando aba Cadastros')
    return <RegistrationsView />
  }

  // Configurações Gerais (Governança, Integrações e Regras Financeiras)
  if (activeTab === 'Configurações') {
    return <AdminSettingsView />
  }

  // Programa de Indicação (Afiliados B2B)
  if (activeTab === 'Indicação') {
    return <ReferralView />
  }

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

export default AdminPanel
