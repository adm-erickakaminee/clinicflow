import { useState, useEffect } from 'react'
import { Bell, LogOut } from 'lucide-react'
import { useScheduler } from '../context/SchedulerContext'
import UserProfileModal from '../components/UserProfileModal'
import { PanelProvider, usePanelContext } from '../context/PanelContext'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { UnifiedCalendar } from '../components/Calendar/UnifiedCalendar'
import { ProfessionalRequestQueueCard } from '../components/Professional/ProfessionalRequestQueueCard'
import { ProfessionalAttendanceCard } from '../components/Professional/ProfessionalAttendanceCard'
import { ProfessionalClientsView } from '../components/Professional/ProfessionalClientsView'
import { ProfessionalAnalyticsView } from '../components/Professional/ProfessionalAnalyticsView'
import { ProfessionalGoalsView } from '../components/Professional/ProfessionalGoalsView'

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

export function ProfessionalPanel() {
  const [activeTabSnapshot, setActiveTabSnapshot] = useState<string | null>(null)

  return (
    <PanelProvider filterType="none" defaultTab="Agenda e Solicitações" defaultFilter="all">
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

          <DashboardBody activeTabSnapshot={activeTabSnapshot} />
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
  
  // Abas para Profissional
  const tabs = [
    'Agenda e Solicitações',
    'Atendimento',
    'Clientes',
    'Relatórios/KPIs',
    'Metas e Finanças',
    'Configurações'
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
}: {
  activeTabSnapshot: string | null
}) {
  const tab = activeTabSnapshot ?? usePanelContext().activeTab

  return (
    <div className="grid grid-cols-1">
      <MainContent />
    </div>
  )
}

function MainContent() {
  const { activeTab } = usePanelContext()
  const { currentUser } = useScheduler()
  const [soloMode, setSoloMode] = useState(false)
  const [gabyConfig, setGabyConfig] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())

  const professionalId = currentUser?.id || ''
  const clinicId = currentUser?.clinicId || ''

  // Carregar configurações da clínica (solo mode, gaby config)
  useEffect(() => {
    const loadSettings = async () => {
      if (!clinicId) return
      try {
        const { data } = await supabase
          .from('organization_settings')
          .select('solo_mode, gaby_config')
          .eq('clinic_id', clinicId)
          .maybeSingle()

        if (data) {
          setSoloMode(Boolean(data.solo_mode))
          setGabyConfig(data.gaby_config || null)
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
      }
    }
    loadSettings()
  }, [clinicId])

  if (!professionalId || !clinicId) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando informações do profissional...</p>
      </div>
    )
  }

  if (activeTab === 'Agenda e Solicitações') {
    return (
      <div className="space-y-6">
        {/* Solicitações */}
        <ProfessionalRequestQueueCard professionalId={professionalId} />

        {/* Agenda */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
          <UnifiedCalendar
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            visibleProfessionals={new Set([professionalId])}
            theme="light"
          />
        </div>
      </div>
    )
  }

  if (activeTab === 'Atendimento') {
    return (
      <ProfessionalAttendanceCard
        professionalId={professionalId}
        clinicId={clinicId}
        soloMode={soloMode}
        gabyConfig={gabyConfig}
      />
    )
  }

  if (activeTab === 'Clientes') {
    return (
      <ProfessionalClientsView
        professionalId={professionalId}
        clinicId={clinicId}
      />
    )
  }

  if (activeTab === 'Relatórios/KPIs') {
    return (
      <ProfessionalAnalyticsView
        professionalId={professionalId}
        clinicId={clinicId}
      />
    )
  }

  if (activeTab === 'Metas e Finanças') {
    return (
      <ProfessionalGoalsView
        profileId={professionalId}
        clinicId={clinicId}
      />
    )
  }

  if (activeTab === 'Configurações') {
    return <ProfessionalSettings />
  }

  return null
}

function ProfessionalSettings() {
  const { currentUser } = useScheduler()
  const toast = useToast()
  const [cashbackEnabled, setCashbackEnabled] = useState(false)
  const [cashbackPercent, setCashbackPercent] = useState<number>(0)
  const [cashbackFixed, setCashbackFixed] = useState<number>(0)
  const [cashbackMode, setCashbackMode] = useState<'percent' | 'fixed'>('percent')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser?.id) return
      setLoading(true)
      try {
        // Buscar configurações de cashback do profissional
        const { data } = await supabase
          .from('profiles')
          .select('cashback_enabled, cashback_percent, cashback_fixed_cents, cashback_mode')
          .eq('id', currentUser.id)
          .maybeSingle()

        if (data) {
          setCashbackEnabled(data.cashback_enabled || false)
          setCashbackPercent(data.cashback_percent || 0)
          setCashbackFixed((data.cashback_fixed_cents || 0) / 100)
          setCashbackMode(data.cashback_mode || 'percent')
        }
      } catch (err) {
        console.error('Erro ao carregar configurações:', err)
        toast.error('Erro ao carregar configurações')
      } finally {
        setLoading(false)
      }
    }
    loadSettings()
  }, [currentUser?.id, toast])

  const handleSave = async () => {
    if (!currentUser?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          cashback_enabled: cashbackEnabled,
          cashback_percent: cashbackMode === 'percent' ? cashbackPercent : null,
          cashback_fixed_cents: cashbackMode === 'fixed' ? Math.round(cashbackFixed * 100) : null,
          cashback_mode: cashbackMode,
        })
        .eq('id', currentUser.id)

      if (error) throw error
      toast.success('Configurações salvas com sucesso!')
    } catch (err: any) {
      console.error('Erro ao salvar configurações:', err)
      toast.error(err.message || 'Erro ao salvar configurações')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando configurações...</p>
      </div>
    )
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Configurações de Cashback</h2>
        <p className="text-sm text-gray-600">
          Configure como você deseja dar cashback aos seus clientes em cada atendimento
        </p>
      </div>

      <div className="space-y-4">
        {/* Ativar/Desativar Cashback */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/70 border border-white/60">
          <div>
            <p className="text-sm font-semibold text-gray-900">Ativar Cashback</p>
            <p className="text-xs text-gray-500">Dar cashback aos clientes após cada atendimento</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={cashbackEnabled}
              onChange={(e) => setCashbackEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-900/10 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
          </label>
        </div>

        {cashbackEnabled && (
          <>
            {/* Modo de Cashback */}
            <div className="p-4 rounded-xl bg-white/70 border border-white/60">
              <p className="text-sm font-semibold text-gray-900 mb-3">Forma de Cálculo</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setCashbackMode('percent')}
                  className={`flex-1 px-4 py-3 rounded-xl border transition ${
                    cashbackMode === 'percent'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white/60 text-gray-800 border-white/60 hover:bg-white/80'
                  }`}
                >
                  <p className="text-sm font-semibold">Percentual</p>
                  <p className="text-xs mt-1 opacity-80">% do valor do serviço</p>
                </button>
                <button
                  onClick={() => setCashbackMode('fixed')}
                  className={`flex-1 px-4 py-3 rounded-xl border transition ${
                    cashbackMode === 'fixed'
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white/60 text-gray-800 border-white/60 hover:bg-white/80'
                  }`}
                >
                  <p className="text-sm font-semibold">Valor Fixo</p>
                  <p className="text-xs mt-1 opacity-80">Valor fixo em R$</p>
                </button>
              </div>
            </div>

            {/* Valor do Cashback */}
            {cashbackMode === 'percent' ? (
              <div className="p-4 rounded-xl bg-white/70 border border-white/60">
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Percentual de Cashback (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={cashbackPercent}
                  onChange={(e) => setCashbackPercent(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="Ex: 5"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Exemplo: Se o serviço custar R$ 100 e você configurar 5%, o cliente receberá R$ 5,00 de cashback
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-white/70 border border-white/60">
                <label className="text-sm font-semibold text-gray-900 mb-2 block">
                  Valor Fixo de Cashback (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashbackFixed}
                  onChange={(e) => setCashbackFixed(parseFloat(e.target.value) || 0)}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="Ex: 10.00"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Valor fixo que será dado ao cliente independente do valor do serviço
                </p>
              </div>
            )}

            {/* Informação sobre regra de uso */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm font-semibold text-amber-900 mb-2">ℹ️ Regra de Uso do Cashback</p>
              <p className="text-xs text-amber-800">
                Os clientes podem usar até 33% do valor do serviço em cashback. Por exemplo: para usar R$ 100,00 de cashback, 
                o cliente precisa gastar pelo menos R$ 300,00 em serviços.
              </p>
            </div>
          </>
        )}

        {/* Botão Salvar */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
      </div>
    </div>
  )
}

export default ProfessionalPanel
