import { useMemo, useState, useEffect, useCallback } from 'react'
import { Plus, Edit2, Trash2, Database, Building2, Check, ArrowRight, Users, X } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useScheduler, Service, SchedulerProfessional } from '../context/SchedulerContext'
import type { WorkSchedule } from '../context/SchedulerContext'
import { PricingCalculatorModal } from './PricingCalculatorModal'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs'
import { supabase } from '../lib/supabase'
import type { Organization } from '../lib/types'
import { OrganizationDetailsCard } from '../components/admin/OrganizationDetailsCard'

type TabKey = 'professionals' | 'services'

interface Clinic {
  id: string
  name: string
  phone: string | null
  created_at: string
}

interface AdminProfile {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

export function RegistrationsView() {
  console.log('🔍 RegistrationsView - Componente renderizando')
  
  const {
    services,
    professionals,
    clinicSettings,
    currentUser,
    addService,
    updateService,
    removeService,
    addProfessional,
    updateProfessional,
    removeProfessional,
    updateClinic,
    provisionNewClinic,
  } = useScheduler()

  const [tab, setTab] = useState<TabKey>('professionals')
  const [modalService, setModalService] = useState<Service | null>(null)
  const [modalProf, setModalProf] = useState<SchedulerProfessional | null>(null)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [showProfModal, setShowProfModal] = useState(false)
  // Estados antigos de clínica removidos - agora gerenciados pelo OrganizationDetailsCard

  // Estados para provisionamento de clínicas removidos - não são mais necessários nesta view

  const colorOptions = [
    '#6366f1', // indigo
    '#22c55e', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#14b8a6', // teal
    '#a855f7', // purple
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
    '#84cc16', // lime
  ]

  // Filtrar profissionais (remover "Visão Geral")
  const filteredProfessionals = useMemo(
    () => professionals.filter((p) => p.id !== 'all'),
    [professionals]
  )

  // Funções de gerenciamento de clínicas removidas - não são mais necessárias nesta view
  // useEffect(() => {
  //   if (currentUser?.role === 'super_admin') {
  //     loadClinics()
  //   }
  // }, [currentUser?.role])

  // useEffect(() => {
  //   if (showProvisionModal && provisionStep === 1) {
  //     loadAvailableAdmins()
  //   }
  // }, [showProvisionModal, provisionStep])

  // Funções de gerenciamento de clínicas comentadas - não são mais necessárias
  /*
  const loadClinics = async () => {
    // setLoadingClinics(true)
    try {
      console.log('🔄 loadClinics - Buscando clínicas...')
      console.log('🔍 loadClinics - Usuário atual:', {
        userId: currentUser?.id,
        role: currentUser?.role,
        email: currentUser?.email
      })
      
      // Verificar autenticação
      const { data: { session } } = await supabase.auth.getSession()
      console.log('🔍 loadClinics - Sessão:', {
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      })
      
      // Verificar perfil diretamente
      if (session?.user?.id) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('id, role, clinic_id')
          .eq('id', session.user.id)
          .maybeSingle()
        
        console.log('🔍 loadClinics - Perfil verificado:', {
          profileData,
          profileError,
          hasProfile: !!profileData,
          profileRole: profileData?.role
        })
      }
      
      // Tentar buscar de 'organizations' primeiro
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, phone, created_at, status')
        .order('name')

      console.log('🔍 loadClinics - Resultado organizations:', { 
        data, 
        error,
        count: data?.length || 0,
        errorCode: error?.code,
        errorMessage: error?.message,
        errorDetails: error?.details,
        errorHint: error?.hint
      })

      if (!error && data) {
        console.log(`✅ loadClinics - ${data.length} clínica(s) encontrada(s)`)
        console.log('📋 loadClinics - Clínicas:', data)
        setClinics(data as Clinic[])
      } else {
        console.error('❌ loadClinics - Erro ao buscar organizations:', error)
        
        // Se for erro de RLS, informar detalhadamente
        if (error?.code === '42501') {
          console.error('❌ loadClinics - ERRO DE PERMISSÃO RLS!')
          console.error('📝 Código:', error.code)
          console.error('📝 Mensagem:', error.message)
          console.error('💡 SOLUÇÃO: Execute o script EXECUTAR_ESTE_SQL.sql no Supabase SQL Editor')
          
          // Tentar em 'clinics' como fallback
          const { data: clinicsData, error: clinicsError } = await supabase
            .from('clinics')
            .select('id, name, phone, created_at')
            .order('name')

          if (!clinicsError && clinicsData) {
            console.log(`✅ loadClinics - ${clinicsData.length} clínica(s) encontrada(s) no fallback`)
            setClinics(clinicsData as Clinic[])
          } else {
            console.error('❌ loadClinics - Erro ao buscar clinics (fallback):', clinicsError || error)
          }
        } else {
          // Outro tipo de erro
          console.error('❌ loadClinics - Erro desconhecido:', error)
          setClinics([])
        }
      }
    } catch (err) {
      console.error('❌ loadClinics - Exceção:', err)
      setClinics([])
    } finally {
      // setLoadingClinics(false)
    }
  }
  */

  /*
  const loadAvailableAdmins = async () => {
    // setLoadingAdmins(true)
    try {
      console.log('🔄 loadAvailableAdmins - Buscando administradores disponíveis...')
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role, clinic_id')
        .in('role', ['admin', 'clinic_owner'])
        .order('full_name')

      console.log('🔍 loadAvailableAdmins - Resultado:', { data, error, count: data?.length || 0 })

      if (!error && data) {
        console.log(`✅ loadAvailableAdmins - ${data.length} administrador(es) encontrado(s):`, data.map(a => ({ id: a.id, name: a.full_name, role: a.role, clinic_id: a.clinic_id })))
        // Mostrar todos os admins (mesmo que já tenham clínica, podem ser reutilizados)
        setAvailableAdmins(data.map(admin => ({
          id: admin.id,
          full_name: admin.full_name,
          role: admin.role,
        })) as AdminProfile[])
      } else {
        console.error('❌ loadAvailableAdmins - Erro ao carregar administradores:', error)
        setAvailableAdmins([])
      }
    } catch (err) {
      console.error('❌ loadAvailableAdmins - Exceção ao carregar administradores:', err)
      setAvailableAdmins([])
    } finally {
      // setLoadingAdmins(false)
    }
  }
  */

  // Função handleSaveClinic removida - agora gerenciada pelo OrganizationDetailsCard

  /*
  const handleProvisionClinic = async () => {
    if (provisionStep === 1) {
      // Validar dados do admin
      if (provisionAdminData.useExisting) {
        if (!provisionAdminData.existingAdminId) {
          alert('Por favor, selecione um administrador existente.')
          return
        }
      } else {
        if (!provisionAdminData.full_name || !provisionAdminData.email || !provisionAdminData.password) {
          alert('Por favor, preencha todos os campos do administrador.')
          return
        }
        if (provisionAdminData.password.length < 6) {
          alert('A senha deve ter pelo menos 6 caracteres.')
          return
        }
      }
      setProvisionStep(2)
    } else if (provisionStep === 2) {
      // Validar dados da clínica
      if (!provisionClinicData.name.trim()) {
        alert('Por favor, informe o nome da clínica.')
        return
      }
      setProvisionStep(3)
    } else if (provisionStep === 3) {
      // Executar provisionamento
      try {
        const result = await provisionNewClinic(
          {
            full_name: provisionAdminData.full_name,
            email: provisionAdminData.email,
            password: provisionAdminData.password,
            useExisting: provisionAdminData.useExisting,
            existingAdminId: provisionAdminData.existingAdminId || undefined,
          },
          {
            name: provisionClinicData.name,
            phone: provisionClinicData.phone || undefined,
          }
        )

        if (result.ok) {
          alert(`Clínica "${provisionClinicData.name}" provisionada com sucesso!`)
          
          // Recarregar lista de clínicas
          await loadClinics()
          
          // Buscar a clínica recém-criada e abrir o painel de detalhes
          const { data: newClinic } = await supabase
            .from('organizations')
            .select('id, name, phone, created_at')
            .eq('id', result.clinicId)
            .single()
          
          if (newClinic) {
            // Fechar modal de provisionamento
            setShowProvisionModal(false)
            setProvisionStep(1)
            setProvisionAdminData({
              useExisting: false,
              existingAdminId: '',
              full_name: '',
              email: '',
              password: '',
            })
            setProvisionClinicData({
              name: '',
              phone: '',
            })
            
            // Abrir painel de detalhes da nova clínica
            setSelectedClinic({
              id: newClinic.id,
              name: newClinic.name,
              phone: newClinic.phone,
              created_at: newClinic.created_at,
            })
            setShowClinicDetailsPanel(true)
          } else {
            // Se não encontrou, apenas recarregar lista
            setShowProvisionModal(false)
            setProvisionStep(1)
            setProvisionAdminData({
              useExisting: false,
              existingAdminId: '',
              full_name: '',
              email: '',
              password: '',
            })
            setProvisionClinicData({
              name: '',
              phone: '',
            })
          }
        } else {
          alert(`Erro ao provisionar clínica: ${result.error}`)
        }
      } catch (error: any) {
        console.error('Erro ao provisionar clínica:', error)
        alert(`Erro ao provisionar clínica: ${error.message || 'Tente novamente.'}`)
      }
    }
  }
  */

  const isReceptionist = currentUser?.role === 'receptionist'
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'clinic_owner'

  return (
    <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        <Database className="h-6 w-6 text-gray-700" />
        <h2 className="text-xl font-semibold text-gray-900">Cadastros</h2>
      </div>

      {/* Bloco de detalhes da clínica (para admin e recepcionista) */}
      {(isAdmin || isReceptionist) && <OrganizationDetailsCard />}

      {/* Tabs de cadastros */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-white/60 border border-white/40 rounded-2xl p-1 mb-6">
          <TabsTrigger
            value="professionals"
            className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white transition"
          >
            👩‍⚕️ Profissionais
          </TabsTrigger>
          <TabsTrigger
            value="services"
            className="rounded-xl data-[state=active]:bg-gray-900 data-[state=active]:text-white transition"
          >
            💆‍♀️ Serviços
          </TabsTrigger>
        </TabsList>

        {/* ABA A: Profissionais */}
        <TabsContent value="professionals" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Equipe de Profissionais</p>
            <button
              onClick={() => {
                setModalProf({
                  id: '',
                  name: '',
                  specialty: '',
                  avatar: '',
                  color: colorOptions[0],
                  commissionModel: 'commissioned',
                  commissionRate: 0,
                  rentalBaseCents: 0,
                } as SchedulerProfessional)
                setShowProfModal(true)
              }}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition"
            >
              <Plus className="h-4 w-4" /> Novo Profissional
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProfessionals.map((p) => (
              <div
                key={p.id}
                className="rounded-2xl bg-white/70 border border-white/60 p-4 shadow-sm flex items-center gap-3 hover:shadow-md transition"
              >
                <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-sm font-semibold text-gray-700">{p.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-600 truncate">{p.specialty}</p>
                  {((p as any).commissionModel || (p as any).commissionRate !== undefined) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {(() => {
                        const model = (p as any).commissionModel || 'commissioned'
                        const rate = (p as any).commissionRate || 0
                        const rental = (p as any).rentalBaseCents || 0
                        
                        if (model === 'commissioned') {
                          return `Paga: ${rate}% por serviço`
                        } else if (model === 'rental') {
                          return `Paga: R$ ${(rental / 100).toFixed(2)}/mês`
                        } else if (model === 'hybrid') {
                          return `Paga: R$ ${(rental / 100).toFixed(2)}/mês + ${rate}%`
                        }
                        return `Paga: ${rate}% por serviço` // Fallback
                      })()}
                    </p>
                  )}
                  {p.workSchedule && p.workSchedule.days.length > 0 && (
                    <div className="mt-1 flex items-center gap-1">
                      <span className="text-[10px] text-gray-500">Jornada:</span>
                      <span className="text-[10px] font-semibold text-gray-700">
                        {p.workSchedule.start} - {p.workSchedule.end}
                      </span>
                      {p.workSchedule.breakStart && p.workSchedule.breakEnd && (
                        <span className="text-[10px] text-gray-500">
                          (Almoço: {p.workSchedule.breakStart}-{p.workSchedule.breakEnd})
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className="h-4 w-4 rounded-full border border-white/60"
                    style={{ background: p.color || colorOptions[0] }}
                  />
                  <button
                    onClick={() => {
                      setModalProf(p)
                      setShowProfModal(true)
                    }}
                    className="p-2 rounded-xl bg-white/80 border border-white/60 text-gray-800 hover:bg-white transition"
                    title="Editar"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => removeProfessional(p.id)}
                    className="p-2 rounded-xl bg-white/80 border border-white/60 text-red-600 hover:bg-white transition"
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {filteredProfessionals.length === 0 && (
              <div className="col-span-full text-center py-8 text-sm text-gray-500">
                Nenhum profissional cadastrado. Clique em "Novo Profissional" para começar.
              </div>
            )}
          </div>
        </TabsContent>

        {/* ABA B: Serviços */}
        <TabsContent value="services" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Procedimentos e Serviços</p>
            <button
              onClick={() => {
                setModalService({
                  id: '',
                  name: '',
                  price: 0,
                  duration: 30,
                  category: '',
                  professionalId: 'all',
                })
                setShowServiceModal(true)
              }}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition"
            >
              <Plus className="h-4 w-4" /> Novo Serviço
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-xs text-gray-600 border-b border-white/60">
                  <th className="px-3 py-3 font-semibold">Nome</th>
                  <th className="px-3 py-3 font-semibold">Equipe</th>
                  <th className="px-3 py-3 font-semibold">Duração</th>
                  <th className="px-3 py-3 font-semibold">Preço</th>
                  <th className="px-3 py-3 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/60">
                {services.map((s) => {
                  const serviceProfIds = (s as any).professionalIds || []
                  const serviceProfs = serviceProfIds.length > 0
                    ? filteredProfessionals.filter((p) => serviceProfIds.includes(p.id))
                    : filteredProfessionals

                  return (
                    <tr key={s.id} className="text-gray-900 hover:bg-white/40 transition">
                      <td className="px-3 py-3 font-medium">{s.name}</td>
                      <td className="px-3 py-3">
                        {serviceProfIds.length === 0 ? (
                          <span className="text-xs text-gray-500">Todos</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {serviceProfs.slice(0, 3).map((p) => (
                              <div
                                key={p.id}
                                className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden border border-white/60 flex items-center justify-center"
                                title={p.name}
                              >
                                {p.avatar ? (
                                  <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                                ) : (
                                  <span className="text-[10px] font-semibold text-gray-700">{p.name.charAt(0)}</span>
                                )}
                              </div>
                            ))}
                            {serviceProfs.length > 3 && (
                              <span className="text-xs text-gray-500">+{serviceProfs.length - 3}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-gray-600">{s.duration} min</td>
                      <td className="px-3 py-3 font-semibold">R$ {s.price.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => {
                              setModalService(s)
                              setShowServiceModal(true)
                            }}
                            className="p-2 rounded-xl bg-white/80 border border-white/60 text-gray-800 hover:bg-white transition"
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => removeService(s.id)}
                            className="p-2 rounded-xl bg-white/80 border border-white/60 text-red-600 hover:bg-white transition"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {services.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500">
                      Nenhum serviço cadastrado. Clique em "Novo Serviço" para começar.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de Provisionamento de Clínica removido - não é mais necessário nesta view */}
      {/* {showProvisionModal &&
        createPortal(
          <ProvisionClinicModal ... />,
          document.body
        )} */}

      {/* Modal de Profissional */}
      {showProfModal &&
        modalProf &&
        createPortal(
          <ProfessionalModal
            professional={modalProf}
            colors={colorOptions}
            onClose={() => setShowProfModal(false)}
            onSave={async (p) => {
              try {
                if (p.id) {
                  await updateProfessional(p)
                } else {
                  await addProfessional(p)
                }
                setShowProfModal(false)
              } catch (error: any) {
                console.error('❌ Erro ao salvar profissional no RegistrationsView:', error)
                const errorMessage = error?.message || error?.error?.message || 'Erro ao salvar profissional. Tente novamente.'
                alert(`Erro ao salvar profissional: ${errorMessage}`)
              }
            }}
          />,
          document.body
        )}

      {/* Modal de Serviço */}
      {showServiceModal &&
        modalService &&
        createPortal(
          <ServiceModal
            service={modalService}
            professionals={filteredProfessionals}
            onClose={() => setShowServiceModal(false)}
            onSave={async (s) => {
              try {
                if (s.id) {
                  await updateService(s)
                } else {
                  await addService(s)
                }
                setShowServiceModal(false)
              } catch (error) {
                console.error('Erro ao salvar serviço:', error)
                alert('Erro ao salvar serviço. Tente novamente.')
              }
            }}
          />,
          document.body
        )}
    </div>
  )
}

// Componente: Lista de Clínicas (para super_admin)
function ClinicsListView({
  clinics,
  loadingClinics,
  onRefresh,
  onNewClinic,
  onSelectClinic,
}: {
  clinics: Clinic[]
  loadingClinics: boolean
  onRefresh: () => void
  onNewClinic: () => void
  onSelectClinic: (clinic: Clinic) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">Gerenciamento de Clínicas</p>
          <p className="text-xs text-gray-500 mt-1">Visualize e gerencie todas as clínicas do sistema</p>
        </div>
        <button
          onClick={onNewClinic}
          className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition"
        >
          <Plus className="h-4 w-4" /> Cadastrar Nova Clínica
        </button>
      </div>

      {loadingClinics ? (
        <div className="text-center py-8 text-sm text-gray-500">Carregando clínicas...</div>
      ) : clinics.length === 0 ? (
        <div className="text-center py-12 bg-white/40 rounded-2xl border border-white/60">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-900 mb-1">Nenhuma clínica encontrada</p>
          <p className="text-xs text-gray-500 mb-4">
            {currentUser?.role === 'super_admin' 
              ? 'Verifique no console (F12) se há erros de RLS. Se sim, execute o script EXECUTAR_ESTE_SQL.sql no Supabase.'
              : 'Comece criando sua primeira clínica'}
          </p>
          {currentUser?.role === 'super_admin' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4 text-left text-xs text-yellow-800">
              <p className="font-semibold mb-1">⚠️ Possível problema de RLS:</p>
              <ol className="list-decimal list-inside space-y-1 ml-2">
                <li>Abra o console do navegador (F12)</li>
                <li>Verifique os logs de erro</li>
                <li>Execute o script <code className="bg-yellow-100 px-1 rounded">EXECUTAR_ESTE_SQL.sql</code> no Supabase SQL Editor</li>
                <li>Recarregue esta página</li>
              </ol>
            </div>
          )}
          <button
            onClick={onNewClinic}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition mx-auto"
          >
            <Plus className="h-4 w-4" /> Cadastrar Primeira Clínica
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinics.map((clinic) => (
            <div
              key={clinic.id}
              onClick={() => onSelectClinic(clinic)}
              className="rounded-2xl bg-white/70 border border-white/60 p-4 shadow-sm hover:shadow-md transition cursor-pointer active:scale-[0.98]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{clinic.name}</p>
                    {clinic.phone && (
                      <p className="text-xs text-gray-500">{clinic.phone}</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-xs text-gray-500">
                  Criada em: {new Date(clinic.created_at).toLocaleDateString('pt-BR')}
                </div>
                <ArrowRight className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Componente: Modal de Provisionamento (3 Passos)
function ProvisionClinicModal({
  step,
  adminData,
  clinicData,
  availableAdmins,
  loadingAdmins,
  onAdminDataChange,
  onClinicDataChange,
  onNext,
  onBack,
  onClose,
}: {
  step: 1 | 2 | 3
  adminData: {
    useExisting: boolean
    existingAdminId: string
    full_name: string
    email: string
    password: string
  }
  clinicData: { name: string; phone: string }
  availableAdmins: AdminProfile[]
  loadingAdmins: boolean
  onAdminDataChange: (data: any) => void
  onClinicDataChange: (data: any) => void
  onNext: () => void
  onBack: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-2xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg font-semibold text-gray-900">Cadastrar Nova Clínica</p>
            <p className="text-xs text-gray-500 mt-1">Passo {step} de 3</p>
          </div>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex-1 flex items-center">
              <div
                className={`flex items-center justify-center h-8 w-8 rounded-full border-2 transition ${
                  s === step
                    ? 'bg-gray-900 text-white border-gray-900'
                    : s < step
                    ? 'bg-green-500 text-white border-green-500'
                    : 'bg-white text-gray-400 border-gray-300'
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    s < step ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Administrador */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Users className="h-5 w-5 text-gray-700" />
              <p className="text-sm font-semibold text-gray-900">Vincular ou Criar Administrador</p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="useExisting"
                  checked={adminData.useExisting}
                  onChange={(e) => onAdminDataChange({ ...adminData, useExisting: e.target.checked })}
                  className="text-gray-900 focus:ring-gray-900/15"
                />
                <label htmlFor="useExisting" className="text-sm text-gray-900 cursor-pointer">
                  Usar Administrador Existente
                </label>
              </div>

              {adminData.useExisting && (
                <div className="ml-6 space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Selecionar Administrador</label>
                  {loadingAdmins ? (
                    <div className="text-xs text-gray-500">Carregando administradores...</div>
                  ) : availableAdmins.length === 0 ? (
                    <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                      Nenhum administrador disponível. Selecione "Cadastrar Novo Administrador".
                    </div>
                  ) : (
                    <select
                      value={adminData.existingAdminId}
                      onChange={(e) => onAdminDataChange({ ...adminData, existingAdminId: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                    >
                      <option value="">Selecione um administrador</option>
                      {availableAdmins.map((admin) => (
                        <option key={admin.id} value={admin.id}>
                          {admin.full_name || 'Administrador'} ({admin.role})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex items-center gap-3">
                <input
                  type="radio"
                  id="createNew"
                  checked={!adminData.useExisting}
                  onChange={(e) => onAdminDataChange({ ...adminData, useExisting: !e.target.checked })}
                  className="text-gray-900 focus:ring-gray-900/15"
                />
                <label htmlFor="createNew" className="text-sm text-gray-900 cursor-pointer">
                  Cadastrar Novo Administrador
                </label>
              </div>

              {!adminData.useExisting && (
                <div className="ml-6 space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Nome Completo *</label>
                    <input
                      type="text"
                      value={adminData.full_name}
                      onChange={(e) => onAdminDataChange({ ...adminData, full_name: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="Nome do administrador"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={adminData.email}
                      onChange={(e) => onAdminDataChange({ ...adminData, email: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="admin@clinica.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Senha *</label>
                    <input
                      type="password"
                      value={adminData.password}
                      onChange={(e) => onAdminDataChange({ ...adminData, password: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <p className="text-xs text-gray-500">A senha deve ter pelo menos 6 caracteres</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Dados da Clínica */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-gray-700" />
              <p className="text-sm font-semibold text-gray-900">Dados da Clínica</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Nome da Clínica *</label>
                <input
                  type="text"
                  value={clinicData.name}
                  onChange={(e) => onClinicDataChange({ ...clinicData, name: e.target.value })}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="Ex: Clínica Estética Premium"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Telefone (Opcional)</label>
                <input
                  type="tel"
                  value={clinicData.phone}
                  onChange={(e) => onClinicDataChange({ ...clinicData, phone: e.target.value })}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="(11) 99999-9999"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Confirmação */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Check className="h-5 w-5 text-green-500" />
              <p className="text-sm font-semibold text-gray-900">Confirmar Provisionamento</p>
            </div>

            <div className="bg-white/50 rounded-xl border border-white/60 p-4 space-y-3">
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Administrador</p>
                <p className="text-sm text-gray-900">
                  {adminData.useExisting
                    ? availableAdmins.find((a) => a.id === adminData.existingAdminId)?.full_name || 'Administrador Selecionado'
                    : `${adminData.full_name} (${adminData.email})`}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-700 mb-1">Clínica</p>
                <p className="text-sm text-gray-900">{clinicData.name}</p>
                {clinicData.phone && (
                  <p className="text-xs text-gray-500 mt-1">{clinicData.phone}</p>
                )}
              </div>
            </div>

            <div className="text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="font-semibold text-blue-900 mb-1">⚠️ Atenção</p>
              <p>Esta ação irá:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Criar uma nova organização no sistema</li>
                <li>
                  {adminData.useExisting
                    ? 'Vincular o administrador selecionado à nova clínica'
                    : 'Criar uma nova conta de administrador e vinculá-la à clínica'}
                </li>
                <li>Configurar permissões e acesso</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer com botões */}
        <div className="flex justify-between gap-2 pt-4 border-t border-white/60">
          <div>
            {step > 1 && (
              <button
                className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition"
                onClick={onBack}
              >
                Voltar
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 hover:bg-gray-800 transition flex items-center gap-2"
              onClick={onNext}
            >
              {step === 3 ? (
                <>
                  <Check className="h-4 w-4" /> Confirmar e Criar
                </>
              ) : (
                <>
                  Próximo <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ... (mantém ProfessionalModal e ServiceModal do código original)
function ProfessionalModal({
  professional,
  colors,
  onSave,
  onClose,
}: {
  professional: SchedulerProfessional
  colors: string[]
  onSave: (p: SchedulerProfessional) => Promise<void>
  onClose: () => void
}) {
  const { currentUser } = useScheduler()
  const [draft, setDraft] = useState<SchedulerProfessional>(professional)
  const [commissionModel, setCommissionModel] = useState<'commissioned' | 'rental' | 'hybrid'>(
    (professional as any).commissionModel || (professional as any).commission_model || 'commissioned'
  )
  const [commissionRate, setCommissionRate] = useState<number>((professional as any).commissionRate || (professional as any).commission_rate || 0)
  const [rentalBaseCents, setRentalBaseCents] = useState<number>(
    (professional as any).rentalBaseCents || (professional as any).rental_base_cents || 0
  )
  const [payoutModel, setPayoutModel] = useState<'PERCENTUAL' | 'FIXO_MENSAL' | 'HIBRIDO' | 'NENHUM'>(
    (professional as any).payout_model || 'PERCENTUAL'
  )
  const [payoutPercentage, setPayoutPercentage] = useState<number>(
    (professional as any).payout_percentage || (professional as any).payoutPercentage || 50
  )
  const [fixedMonthlyPayoutCents, setFixedMonthlyPayoutCents] = useState<number>(
    (professional as any).fixed_monthly_payout_cents || (professional as any).fixedMonthlyPayoutCents || 0
  )
  const [selectedClinicId, setSelectedClinicId] = useState<string>((professional as any).clinicId || '')
  const [clinics, setClinics] = useState<Array<{ id: string; name: string }>>([])
  const [loadingClinics, setLoadingClinics] = useState(false)
  
  // Estado para email e senha (criação de perfil/login)
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [createLogin, setCreateLogin] = useState<boolean>(false)
  
  // Estado para KYC (Know Your Customer)
  const [cpf, setCpf] = useState<string>((professional as any).cpf || '')
  const [showKYC, setShowKYC] = useState(false)
  const [bankAccountData, setBankAccountData] = useState<{
    bank_code?: string
    agency?: string
    account?: string
    account_digit?: string
    account_type?: 'CHECKING' | 'SAVINGS'
    holder_name?: string
    holder_document?: string
  }>((professional as any).bank_account_data || {
    bank_code: '',
    agency: '',
    account: '',
    account_digit: '',
    account_type: 'CHECKING',
    holder_name: '',
    holder_document: '',
  })
  
  // Estado para jornada de trabalho
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule | null>(
    professional.workSchedule || null
  )

  // Buscar clínicas se for super_admin
  useEffect(() => {
    if (currentUser?.role === 'super_admin' && !currentUser.clinicId) {
      setLoadingClinics(true)
      
      // Tentar buscar de 'organizations' primeiro (tabela principal)
      supabase
        .from('organizations')
        .select('id, name')
        .order('name')
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            console.log('✅ Clínicas encontradas em organizations:', data.length)
            setClinics(data as Array<{ id: string; name: string }>)
            setLoadingClinics(false)
          } else {
            // Se não encontrar em organizations, tentar em clinics
            console.warn('⚠️ Não encontrado em organizations, tentando clinics:', error?.message)
            supabase
              .from('clinics')
              .select('id, name')
              .order('name')
              .then(({ data: clinicsData, error: clinicsError }) => {
                if (!clinicsError && clinicsData) {
                  console.log('✅ Clínicas encontradas em clinics:', clinicsData.length)
                  setClinics(clinicsData as Array<{ id: string; name: string }>)
                } else {
                  console.error('❌ Erro ao buscar clínicas:', clinicsError)
                  console.error('Tentou: organizations e clinics')
                }
                setLoadingClinics(false)
              })
          }
        })
    }
  }, [currentUser])
  
  const weekDays = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Seg' },
    { value: 2, label: 'Ter' },
    { value: 3, label: 'Qua' },
    { value: 4, label: 'Qui' },
    { value: 5, label: 'Sex' },
    { value: 6, label: 'Sáb' },
  ]
  
  const toggleDay = (day: number) => {
    if (!workSchedule) {
      setWorkSchedule({
        days: [day],
        start: '09:00',
        end: '18:00',
      })
      return
    }
    
    const newDays = workSchedule.days.includes(day)
      ? workSchedule.days.filter((d) => d !== day)
      : [...workSchedule.days, day].sort()
    
    setWorkSchedule({
      ...workSchedule,
      days: newDays,
    })
  }
  
  const updateWorkSchedule = (field: keyof WorkSchedule, value: any) => {
    if (!workSchedule) return
    setWorkSchedule({
      ...workSchedule,
      [field]: value,
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {draft.id ? 'Editar Profissional' : 'Novo Profissional'}
          </p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Nome</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
              placeholder="Nome completo"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Cargo / Especialidade</label>
            <input
              value={draft.specialty}
              onChange={(e) => setDraft((p) => ({ ...p, specialty: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
              placeholder="Ex: Dermatologista, Esteticista, etc."
            />
          </div>
          
          {/* Campo para super_admin selecionar clínica - DESABILITADO quando clinicId já está herdado */}
          {currentUser?.role === 'super_admin' && !currentUser.clinicId && !professional.clinicId && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Clínica *</label>
              {loadingClinics ? (
                <div className="text-xs text-gray-500">Carregando clínicas...</div>
              ) : clinics.length === 0 ? (
                <div className="space-y-2">
                  <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl p-3">
                    ⚠️ Nenhuma clínica encontrada. É necessário criar uma clínica primeiro.
                  </div>
                  <div className="text-xs text-gray-600">
                    <p className="mb-2">Opções:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Vá para a aba "Gerenciamento de Clínicas" e crie uma clínica</li>
                      <li>Ou crie uma clínica no painel de administração do Supabase</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  required
                >
                  <option value="">Selecione uma clínica</option>
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              )}
              {clinics.length > 0 && (
                <p className="text-xs text-gray-500">Selecione a clínica onde o profissional atuará</p>
              )}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Cor na Agenda</label>
            <div className="flex items-center gap-2 flex-wrap">
              {colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDraft((p) => ({ ...p, color: c }))}
                  className={`h-10 w-10 rounded-full border-2 transition ${
                    draft.color === c ? 'ring-2 ring-gray-900 scale-110' : 'border-white/60'
                  }`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>
          {/* Modelo de Comissionamento - Profissional PAGA para a Clínica */}
          <div className="space-y-3 pt-3 border-t border-white/60">
            <div>
              <label className="text-xs font-semibold text-gray-700">Modelo de Comissionamento</label>
              <p className="text-xs text-gray-500 mt-1">Configure como o profissional pagará à clínica</p>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="commissionModel"
                  value="commissioned"
                  checked={commissionModel === 'commissioned'}
                  onChange={(e) => setCommissionModel(e.target.value as 'commissioned')}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Por Porcentagem</span>
                  <p className="text-xs text-gray-500">O profissional paga X% do valor de cada serviço realizado para a clínica</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="commissionModel"
                  value="rental"
                  checked={commissionModel === 'rental'}
                  onChange={(e) => setCommissionModel(e.target.value as 'rental')}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Fixo Mensal</span>
                  <p className="text-xs text-gray-500">O profissional paga um valor fixo por mês para a clínica (independente dos serviços)</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="commissionModel"
                  value="hybrid"
                  checked={commissionModel === 'hybrid'}
                  onChange={(e) => setCommissionModel(e.target.value as 'hybrid')}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Híbrido (Fixo Mensal + Porcentagem)</span>
                  <p className="text-xs text-gray-500">O profissional paga um valor fixo mensal + X% sobre cada serviço realizado para a clínica</p>
                </div>
              </label>
            </div>

            {/* Campo: Percentual que o Profissional PAGA (para 'commissioned' e 'hybrid') */}
            {(commissionModel === 'commissioned' || commissionModel === 'hybrid') && (
              <div className="space-y-1 pl-6 pt-2 border-t border-white/40">
                <label className="text-xs font-semibold text-gray-700">
                  {commissionModel === 'hybrid' ? '% sobre Serviços' : '% sobre Serviços'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(Number(e.target.value))}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">
                  {commissionModel === 'hybrid' 
                    ? 'Percentual que o profissional paga à clínica sobre cada serviço realizado (além do valor fixo mensal)'
                    : 'Percentual que o profissional paga à clínica sobre cada serviço realizado (0-100%)'}
                </p>
              </div>
            )}

            {/* Campo: Valor Fixo Mensal que o Profissional PAGA (para 'rental' e 'hybrid') */}
            {(commissionModel === 'rental' || commissionModel === 'hybrid') && (
              <div className="space-y-1 pl-6 pt-2 border-t border-white/40">
                <label className="text-xs font-semibold text-gray-700">Valor Fixo Mensal (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(rentalBaseCents / 100).toFixed(2)}
                  onChange={(e) => {
                    const valueInReais = parseFloat(e.target.value) || 0
                    setRentalBaseCents(Math.round(valueInReais * 100))
                  }}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500">
                  {commissionModel === 'hybrid'
                    ? 'Valor fixo mensal que o profissional paga à clínica (além da porcentagem sobre serviços)'
                    : 'Valor fixo mensal que o profissional paga à clínica (não há porcentagem sobre serviços)'}
                </p>
              </div>
            )}

            {/* Info sobre Taxa da Plataforma */}
            <div className="pl-6 pt-2">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-900 mb-1">ℹ️ Sobre a Taxa da Plataforma</p>
                <p className="text-xs text-blue-700">
                  A clínica também paga uma taxa para a plataforma sobre cada transação. 
                  Essa taxa é configurada separadamente nas configurações gerais da clínica.
                </p>
              </div>
            </div>
          </div>

          {/* Regras de Remuneração do Profissional (Payout) */}
          <div className="space-y-3 pt-3 border-t border-white/60">
            <div>
              <label className="text-xs font-semibold text-gray-700">Regras de Remuneração do Profissional</label>
              <p className="text-xs text-gray-500 mt-1">Configure como a clínica remunera o profissional</p>
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="payoutModel"
                  value="PERCENTUAL"
                  checked={payoutModel === 'PERCENTUAL'}
                  onChange={(e) => setPayoutModel(e.target.value as 'PERCENTUAL')}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Porcentagem</span>
                  <p className="text-xs text-gray-500">A clínica paga X% do valor de cada serviço ao profissional</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="payoutModel"
                  value="FIXO_MENSAL"
                  checked={payoutModel === 'FIXO_MENSAL'}
                  onChange={(e) => setPayoutModel(e.target.value as 'FIXO_MENSAL')}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Fixo Mensal</span>
                  <p className="text-xs text-gray-500">A clínica paga um valor fixo mensal ao profissional</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="payoutModel"
                  value="HIBRIDO"
                  checked={payoutModel === 'HIBRIDO'}
                  onChange={(e) => setPayoutModel(e.target.value as 'HIBRIDO')}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Híbrido</span>
                  <p className="text-xs text-gray-500">A clínica paga valor fixo mensal + X% sobre cada serviço</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition">
                <input
                  type="radio"
                  name="payoutModel"
                  value="NENHUM"
                  checked={payoutModel === 'NENHUM'}
                  onChange={(e) => setPayoutModel(e.target.value as 'NENHUM')}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-900">Nenhum</span>
                  <p className="text-xs text-gray-500">Profissional não recebe remuneração da clínica</p>
                </div>
              </label>
            </div>

            {/* Campo: Percentual de Payout (para 'PERCENTUAL' e 'HIBRIDO') */}
            {(payoutModel === 'PERCENTUAL' || payoutModel === 'HIBRIDO') && (
              <div className="space-y-1 pl-6 pt-2 border-t border-white/40">
                <label className="text-xs font-semibold text-gray-700">Percentual de Remuneração (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={payoutPercentage}
                  onChange={(e) => setPayoutPercentage(Number(e.target.value))}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="50"
                />
                <p className="text-xs text-gray-500">
                  Percentual que a clínica paga ao profissional sobre cada serviço realizado (0-100%)
                </p>
              </div>
            )}

            {/* Campo: Valor Fixo Mensal de Payout (para 'FIXO_MENSAL' e 'HIBRIDO') */}
            {(payoutModel === 'FIXO_MENSAL' || payoutModel === 'HIBRIDO') && (
              <div className="space-y-1 pl-6 pt-2 border-t border-white/40">
                <label className="text-xs font-semibold text-gray-700">Valor Fixo Mensal (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={(fixedMonthlyPayoutCents / 100).toFixed(2)}
                  onChange={(e) => {
                    const valueInReais = parseFloat(e.target.value) || 0
                    setFixedMonthlyPayoutCents(Math.round(valueInReais * 100))
                  }}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  placeholder="0.00"
                />
                <p className="text-xs text-gray-500">
                  {payoutModel === 'HIBRIDO'
                    ? 'Valor fixo mensal que a clínica paga ao profissional (além da porcentagem sobre serviços)'
                    : 'Valor fixo mensal que a clínica paga ao profissional'}
                </p>
              </div>
            )}
          </div>
          
          {/* Seção de Criação de Login (Apenas para novos profissionais) */}
          {!draft.id && (
            <div className="space-y-3 pt-3 border-t border-white/60">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createLogin}
                  onChange={(e) => {
                    setCreateLogin(e.target.checked)
                    if (!e.target.checked) {
                      setEmail('')
                      setPassword('')
                    }
                  }}
                  className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                  id="create-login-checkbox"
                />
                <label htmlFor="create-login-checkbox" className="text-xs font-semibold text-gray-700 cursor-pointer">
                  Criar conta de login para este profissional
                </label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                Se marcado, o profissional poderá fazer login no sistema usando email e senha
              </p>
              
              {createLogin && (
                <div className="space-y-3 ml-6 pl-4 border-l-2 border-gray-200">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Email *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="profissional@exemplo.com"
                      required={createLogin}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Senha * (mínimo 6 caracteres)</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="••••••"
                      minLength={6}
                      required={createLogin}
                    />
                    <p className="text-xs text-gray-500">
                      A senha será usada para o profissional fazer login no sistema
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Seção KYC - Dados Bancários para Profissional */}
          <div className="space-y-3 pt-3 border-t border-white/60">
            <button
              type="button"
              onClick={() => setShowKYC(!showKYC)}
              className="flex items-center justify-between w-full text-left"
            >
              <div>
                <label className="text-xs font-semibold text-gray-700">Dados KYC (Asaas)</label>
                <p className="text-xs text-gray-500 mt-1">
                  CPF e dados bancários para criar subconta Asaas
                </p>
              </div>
              <span className="text-gray-400">{showKYC ? '▼' : '▶'}</span>
            </button>

            {showKYC && (
              <div className="space-y-3 ml-6 pl-4 border-l-2 border-gray-200 bg-blue-50/50 rounded-xl p-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">CPF *</label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => {
                      // Formatar CPF (XXX.XXX.XXX-XX)
                      let value = e.target.value.replace(/\D/g, '')
                      if (value.length <= 11) {
                        value = value.replace(/^(\d{3})(\d)/, '$1.$2')
                        value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                        value = value.replace(/\.(\d{3})(\d)/, '.$1-$2')
                        setCpf(value)
                      }
                    }}
                    className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-gray-200">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Código do Banco</label>
                    <input
                      type="text"
                      value={bankAccountData.bank_code || ''}
                      onChange={(e) => setBankAccountData({ ...bankAccountData, bank_code: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="001"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Agência</label>
                    <input
                      type="text"
                      value={bankAccountData.agency || ''}
                      onChange={(e) => setBankAccountData({ ...bankAccountData, agency: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="0000"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Conta</label>
                    <input
                      type="text"
                      value={bankAccountData.account || ''}
                      onChange={(e) => setBankAccountData({ ...bankAccountData, account: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="00000"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Dígito</label>
                    <input
                      type="text"
                      value={bankAccountData.account_digit || ''}
                      onChange={(e) => setBankAccountData({ ...bankAccountData, account_digit: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="0"
                      maxLength={1}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Tipo de Conta</label>
                    <select
                      value={bankAccountData.account_type || 'CHECKING'}
                      onChange={(e) => setBankAccountData({ ...bankAccountData, account_type: e.target.value as 'CHECKING' | 'SAVINGS' })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                    >
                      <option value="CHECKING">Conta Corrente</option>
                      <option value="SAVINGS">Conta Poupança</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Nome do Titular</label>
                    <input
                      type="text"
                      value={bankAccountData.holder_name || ''}
                      onChange={(e) => setBankAccountData({ ...bankAccountData, holder_name: e.target.value })}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="Nome completo"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">CPF do Titular</label>
                    <input
                      type="text"
                      value={bankAccountData.holder_document || ''}
                      onChange={(e) => {
                        let value = e.target.value.replace(/\D/g, '')
                        if (value.length <= 11) {
                          value = value.replace(/^(\d{3})(\d)/, '$1.$2')
                          value = value.replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
                          value = value.replace(/\.(\d{3})(\d)/, '.$1-$2')
                          setBankAccountData({ ...bankAccountData, holder_document: value })
                        }
                      }}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="000.000.000-00"
                      maxLength={14}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seção de Jornada de Trabalho */}
          <div className="space-y-3 pt-3 border-t border-white/60">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-gray-700">Jornada de Trabalho</label>
              <button
                type="button"
                onClick={() => {
                  if (workSchedule) {
                    setWorkSchedule(null)
                  } else {
                    setWorkSchedule({
                      days: [],
                      start: '09:00',
                      end: '18:00',
                    })
                  }
                }}
                className="text-xs text-gray-600 hover:text-gray-900"
              >
                {workSchedule ? 'Remover jornada' : 'Adicionar jornada'}
              </button>
            </div>
            
            {workSchedule && (
              <div className="space-y-3 rounded-xl bg-white/50 border border-white/60 p-3">
                {/* Seleção de dias */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-700">Dias da Semana</label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {weekDays.map((day) => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => toggleDay(day.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          workSchedule.days.includes(day.value)
                            ? 'bg-gray-900 text-white'
                            : 'bg-white/70 text-gray-700 border border-white/60 hover:bg-white/90'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Horários */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Início</label>
                    <input
                      type="time"
                      value={workSchedule.start}
                      onChange={(e) => updateWorkSchedule('start', e.target.value)}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-700">Fim</label>
                    <input
                      type="time"
                      value={workSchedule.end}
                      onChange={(e) => updateWorkSchedule('end', e.target.value)}
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                    />
                  </div>
                </div>
                
                {/* Intervalo de almoço (opcional) */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!workSchedule?.breakStart && !!workSchedule?.breakEnd}
                      onChange={(e) => {
                        if (!workSchedule) return
                        if (e.target.checked) {
                          setWorkSchedule({
                            ...workSchedule,
                            breakStart: '12:00',
                            breakEnd: '13:00',
                          })
                        } else {
                          setWorkSchedule({
                            ...workSchedule,
                            breakStart: undefined,
                            breakEnd: undefined,
                          })
                        }
                      }}
                      className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                    />
                    <label className="text-xs font-semibold text-gray-700">Intervalo de Almoço</label>
                  </div>
                  
                  {workSchedule.breakStart && workSchedule.breakEnd && (
                    <div className="grid grid-cols-2 gap-3 pl-6">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Início</label>
                        <input
                          type="time"
                          value={workSchedule.breakStart}
                          onChange={(e) => updateWorkSchedule('breakStart', e.target.value)}
                          className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-gray-600">Fim</label>
                        <input
                          type="time"
                          value={workSchedule.breakEnd}
                          onChange={(e) => updateWorkSchedule('breakEnd', e.target.value)}
                          className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 hover:bg-gray-800 transition"
            onClick={async () => {
              // Validar se super_admin selecionou uma clínica
              if (currentUser?.role === 'super_admin' && !currentUser.clinicId) {
                if (!selectedClinicId) {
                  alert('Por favor, selecione uma clínica para o profissional.')
                  return
                }
                if (clinics.length === 0) {
                  alert('Nenhuma clínica disponível. Por favor, crie uma clínica primeiro na aba "Gerenciamento de Clínicas".')
                  return
                }
              }
              
              // Validar email e senha se createLogin estiver marcado
              if (createLogin && (!draft.id)) {
                if (!email || !password) {
                  alert('Por favor, preencha email e senha para criar a conta de login.')
                  return
                }
                if (password.length < 6) {
                  alert('A senha deve ter pelo menos 6 caracteres.')
                  return
                }
                // Validar formato de email básico
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
                if (!emailRegex.test(email)) {
                  alert('Por favor, informe um email válido.')
                  return
                }
              }
              
              // Validar que clinicId existe antes de construir o objeto
              const finalClinicId = (draft as any).clinicId || selectedClinicId || currentUser?.clinicId
              if (!finalClinicId) {
                alert('É necessário associar o profissional a uma clínica.')
                return
              }
              
              // Priorizar clinicId herdado do profissional (do painel), depois o selecionado, depois currentUser
              const professionalData: any = {
                ...draft,
                commissionModel,
                commissionRate: commissionModel === 'rental' ? 0 : commissionRate, // Se rental, não usa percentual
                rentalBaseCents: (commissionModel === 'rental' || commissionModel === 'hybrid') ? rentalBaseCents : 0,
                workSchedule: workSchedule || undefined,
                // ✅ Campos de Payout (Remuneração do Profissional)
                payout_model: payoutModel,
                payout_percentage: (payoutModel === 'PERCENTUAL' || payoutModel === 'HIBRIDO') ? payoutPercentage : null,
                fixed_monthly_payout_cents: (payoutModel === 'FIXO_MENSAL' || payoutModel === 'HIBRIDO') ? fixedMonthlyPayoutCents : 0,
                // ✅ Campos KYC (Know Your Customer)
                cpf: cpf || null,
                bank_account_data: bankAccountData || null,
                // ✅ Herdar clinic_id: primeiro do draft (já vem do painel), depois selected, depois currentUser
                clinicId: finalClinicId,
                // ✅ Adicionar email e senha se createLogin estiver marcado (apenas para novos profissionais)
                ...(createLogin && !draft.id && email && password ? { email, password } : {}),
              }
              
              console.log('📤 Enviando profissional:', { 
                ...professionalData, 
                password: professionalData.password ? '***' : undefined,
                createLogin,
                hasEmail: !!email,
                hasPassword: !!password
              })
              
              try {
                await onSave(professionalData)
              } catch (error: any) {
                console.error('❌ Erro ao salvar profissional no modal:', error)
                const errorMessage = error?.message || error?.error?.message || 'Erro desconhecido ao salvar profissional.'
                alert(`Erro ao salvar profissional: ${errorMessage}`)
                throw error // Re-throw para não fechar o modal se houver erro
              }
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}

function ServiceModal({
  service,
  onSave,
  onClose,
  professionals,
}: {
  service: Service
  onSave: (s: Service) => Promise<void>
  onClose: () => void
  professionals: SchedulerProfessional[]
}) {
  const [draft, setDraft] = useState<Service>(service)
  const [showCalc, setShowCalc] = useState(false)
  const [selectedProfIds, setSelectedProfIds] = useState<string[]>(
    (service as any).professionalIds || []
  )

  const handleToggleProfessional = (profId: string) => {
    setSelectedProfIds((prev) => {
      if (prev.includes(profId)) {
        return prev.filter((id) => id !== profId)
      } else {
        return [...prev, profId]
      }
    })
  }

  const handleSave = async () => {
    const serviceData = {
      ...draft,
      professionalIds: selectedProfIds.length > 0 ? selectedProfIds : null,
      // ✅ Herdar clinic_id do service (vem do painel)
      clinicId: (service as any).clinicId,
    } as any
    await onSave(serviceData)
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
        <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between">
            <p className="text-lg font-semibold text-gray-900">{draft.id ? 'Editar Serviço' : 'Novo Serviço'}</p>
            <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Nome do Serviço</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                placeholder="Ex: Limpeza de Pele"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Preço (R$)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={draft.price}
                    onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) }))}
                    className="flex-1 rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCalc(true)}
                    className="px-3 py-2 rounded-xl bg-white/80 border border-white/60 text-xs font-semibold text-gray-900 shadow-sm hover:bg-white transition"
                    title="Calculadora de Preço"
                  >
                    🪄
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Duração (Minutos)</label>
                <select
                  value={draft.duration}
                  onChange={(e) => setDraft((p) => ({ ...p, duration: Number(e.target.value) }))}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                >
                  {[15, 30, 45, 60, 75, 90, 120].map((d) => (
                    <option key={d} value={d}>
                      {d} min
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Quem Realiza?</label>
              <div className="rounded-xl bg-white/70 border border-white/60 p-3 max-h-48 overflow-y-auto space-y-2">
                {professionals.length === 0 ? (
                  <p className="text-xs text-gray-500">Nenhum profissional cadastrado ainda.</p>
                ) : (
                  professionals.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 cursor-pointer hover:bg-white/50 p-2 rounded-lg transition"
                    >
                      <input
                        type="checkbox"
                        checked={selectedProfIds.includes(p.id)}
                        onChange={() => handleToggleProfessional(p.id)}
                        className="rounded border-white/60 text-gray-900 focus:ring-gray-900/15"
                      />
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-6 w-6 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                          {p.avatar ? (
                            <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-semibold text-gray-700">{p.name.charAt(0)}</span>
                          )}
                        </div>
                        <span className="text-sm text-gray-900">{p.name}</span>
                        <span className="text-xs text-gray-500">({p.specialty})</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500">
                {selectedProfIds.length === 0
                  ? 'Se nenhum for selecionado, o serviço será disponível para todos os profissionais da clínica.'
                  : `${selectedProfIds.length} profissional(is) selecionado(s).`}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 hover:bg-gray-800 transition"
              onClick={handleSave}
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
      <PricingCalculatorModal
        open={showCalc}
        onClose={() => setShowCalc(false)}
        durationMinutes={draft.duration}
        onApply={(price) => {
          setDraft((p) => ({ ...p, price: Number(price.toFixed(2)) }))
          setShowCalc(false)
        }}
      />
    </>
  )
}

// Painel de Detalhes da Clínica (com abas para Profissionais e Serviços)
function ClinicDetailsPanel({
  clinic,
  onBack,
  onRefreshClinics,
}: {
  clinic: Clinic
  onBack: () => void
  onRefreshClinics: () => void
}) {
  const {
    addProfessional,
    updateProfessional,
    removeProfessional,
    addService,
    updateService,
    removeService,
    addAdminToClinic,
    deleteClinic,
  } = useScheduler()

  const [clinicDetails, setClinicDetails] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [panelTab, setPanelTab] = useState<'details' | 'professionals' | 'services'>('details')
  const [clinicProfessionals, setClinicProfessionals] = useState<SchedulerProfessional[]>([])
  const [clinicServices, setClinicServices] = useState<Service[]>([])
  const [clinicAdmin, setClinicAdmin] = useState<{ id: string; full_name: string | null; email: string | null } | null>(null)
  const [showProfModal, setShowProfModal] = useState(false)
  const [showServiceModal, setShowServiceModal] = useState(false)
  const [modalProf, setModalProf] = useState<SchedulerProfessional | null>(null)
  const [modalService, setModalService] = useState<Service | null>(null)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [adminFormData, setAdminFormData] = useState({
    full_name: '',
    email: '',
    password: '',
  })
  const [deleteMode, setDeleteMode] = useState<'deactivate' | 'delete'>('deactivate')

  const colorOptions = [
    '#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6',
    '#a855f7', '#ec4899', '#06b6d4', '#f97316', '#84cc16',
  ]

  // Carregar dados da clínica
  useEffect(() => {
    const loadDetails = async () => {
      console.log('🔄 ClinicDetailsPanel - Iniciando carregamento para clínica:', clinic.id)
      setLoading(true)
      try {
        // Carregar detalhes completos
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', clinic.id)
          .single()

        console.log('🔄 ClinicDetailsPanel - Dados da organização:', orgData)
        if (orgData) {
          setClinicDetails(orgData as Organization)
        }

        // Carregar administrador da clínica (profile com role='admin')
        // IMPORTANTE: clinic_id deve ser uma string UUID, não number
        console.log('🔍 ClinicDetailsPanel - Buscando admin da clínica:', clinic.id, 'Tipo:', typeof clinic.id)
        
        const { data: adminProfile, error: adminError } = await supabase
          .from('profiles')
          .select('id, full_name, clinic_id, role')
          .eq('clinic_id', clinic.id)
          .eq('role', 'admin')
          .maybeSingle()

        console.log('🔍 ClinicDetailsPanel - Resultado da busca do admin:', { 
          adminProfile, 
          adminError,
          clinicIdProcurado: clinic.id,
          adminClinicId: adminProfile?.clinic_id,
          tiposIguais: typeof clinic.id === typeof adminProfile?.clinic_id
        })

        if (adminProfile) {
          console.log('✅ ClinicDetailsPanel - Admin encontrado:', adminProfile)
          setClinicAdmin({
            id: adminProfile.id,
            full_name: adminProfile.full_name,
            email: null, // Email está em auth.users, não em profiles
          })
        } else {
          console.warn('⚠️ ClinicDetailsPanel - Nenhum admin encontrado para a clínica:', clinic.id)
          console.warn('⚠️ ClinicDetailsPanel - Verificando todos os admins no sistema...')
          
          // Debug: verificar todos os profiles com role='admin' para ver se algum tem clinic_id errado
          const { data: allAdmins, error: allAdminsError } = await supabase
            .from('profiles')
            .select('id, full_name, clinic_id, role')
            .eq('role', 'admin')
          
          console.log('🔍 ClinicDetailsPanel - Todos os admins encontrados:', allAdmins)
          console.log('🔍 ClinicDetailsPanel - Erro ao buscar todos admins:', allAdminsError)
          
          if (allAdmins && allAdmins.length > 0) {
            console.log('🔍 ClinicDetailsPanel - Comparando clinic_ids:')
            allAdmins.forEach((admin: any) => {
              const saoIguais = String(admin.clinic_id) === String(clinic.id)
              console.log(`  - Admin "${admin.full_name}": clinic_id = "${admin.clinic_id}" (${typeof admin.clinic_id}) vs clinic.id = "${clinic.id}" (${typeof clinic.id}) => ${saoIguais ? '✅ IGUAIS' : '❌ DIFERENTES'}`)
            })
          }
          setClinicAdmin(null)
        }

        // Carregar profissionais da clínica
        const { data: profsData } = await supabase
          .from('professionals')
          .select('*')
          .eq('clinic_id', clinic.id)

        if (profsData) {
          const mappedProfs: SchedulerProfessional[] = profsData.map((p: any) => ({
            id: p.id,
            name: p.name || '',
            specialty: p.specialty || '',
            avatar: p.avatar_url || undefined,
            color: p.color || colorOptions[0],
            workSchedule: p.work_schedule || undefined,
            commissionModel: (p.commission_model as 'commissioned' | 'rental' | 'hybrid') || 'commissioned',
            commissionRate: p.commission_rate || 0,
            rentalBaseCents: p.rental_base_cents || 0,
            clinicId: clinic.id, // ✅ Herdar clinic_id
          }))
          setClinicProfessionals(mappedProfs)
        }

        // Carregar serviços da clínica
        const { data: servicesData } = await supabase
          .from('services')
          .select('*')
          .eq('clinic_id', clinic.id)

        if (servicesData) {
          const mappedServices: Service[] = servicesData.map((s: any) => ({
            id: s.id,
            name: s.name || '',
            duration: s.duration_minutes || 60,
            price: Number(s.price) || 0,
            professionalIds: s.professional_ids || [],
            clinicId: clinic.id, // ✅ Herdar clinic_id
          }))
          setClinicServices(mappedServices)
        }
      } catch (err) {
        console.error('Erro ao carregar detalhes da clínica:', err)
      } finally {
        setLoading(false)
      }
    }

    loadDetails()
  }, [clinic.id])

  // Função para recarregar os dados
  const reloadDetails = useCallback(async () => {
    setLoading(true)
    try {
      // Carregar detalhes completos
      const { data: orgData } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', clinic.id)
        .single()

      if (orgData) {
        setClinicDetails(orgData as Organization)
      }

      // Carregar administrador da clínica (profile com role='admin')
      console.log('🔄 RELOAD - Buscando admin da clínica:', clinic.id, 'Tipo:', typeof clinic.id)
      
      const { data: adminProfile, error: adminError } = await supabase
        .from('profiles')
        .select('id, full_name, clinic_id, role')
        .eq('clinic_id', clinic.id)
        .eq('role', 'admin')
        .maybeSingle()

      console.log('🔄 RELOAD - Resultado da busca do admin:', { 
        adminProfile, 
        adminError,
        clinicIdProcurado: clinic.id,
        adminClinicId: adminProfile?.clinic_id
      })

      if (adminProfile) {
        console.log('✅ RELOAD - Admin encontrado:', adminProfile)
        setClinicAdmin({
          id: adminProfile.id,
          full_name: adminProfile.full_name,
          email: null,
        })
      } else {
        console.warn('⚠️ RELOAD - Nenhum admin encontrado para a clínica:', clinic.id)
        console.warn('⚠️ RELOAD - Tipo do clinic.id:', typeof clinic.id)
        
        // Debug: verificar todos os profiles com role='admin'
        const { data: allAdmins, error: allAdminsError } = await supabase
          .from('profiles')
          .select('id, full_name, clinic_id, role')
          .eq('role', 'admin')
        
        console.log('🔍 RELOAD - Todos os admins encontrados no sistema:', allAdmins)
        console.log('🔍 RELOAD - Erro ao buscar todos admins:', allAdminsError)
        
        if (allAdmins && allAdmins.length > 0) {
          console.log('🔍 RELOAD - Comparando clinic_ids:')
          allAdmins.forEach((admin: any) => {
            const saoIguais = String(admin.clinic_id) === String(clinic.id)
            console.log(`  - Admin "${admin.full_name}": clinic_id = "${admin.clinic_id}" (${typeof admin.clinic_id}) vs clinic.id = "${clinic.id}" (${typeof clinic.id}) => ${saoIguais ? '✅ IGUAIS' : '❌ DIFERENTES'}`)
          })
        }
        setClinicAdmin(null)
      }

      // Recarregar profissionais e serviços também
      const { data: profsData } = await supabase
        .from('professionals')
        .select('*')
        .eq('clinic_id', clinic.id)

      if (profsData) {
        const mappedProfs: SchedulerProfessional[] = profsData.map((p: any) => ({
          id: p.id,
          name: p.name || '',
          specialty: p.specialty || '',
          avatar: p.avatar_url || undefined,
          color: p.color || colorOptions[0],
          workSchedule: p.work_schedule || undefined,
          commissionModel: (p.commission_model as 'commissioned' | 'rental' | 'hybrid') || 'commissioned',
          commissionRate: p.commission_rate || 0,
          rentalBaseCents: p.rental_base_cents || 0,
          clinicId: clinic.id,
        }))
        setClinicProfessionals(mappedProfs)
      }

      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinic.id)

      if (servicesData) {
        const mappedServices: Service[] = servicesData.map((s: any) => ({
          id: s.id,
          name: s.name || '',
          duration: s.duration_minutes || 60,
          price: Number(s.price) || 0,
          professionalIds: s.professional_ids || [],
          clinicId: clinic.id,
        }))
        setClinicServices(mappedServices)
      }
    } catch (err) {
      console.error('Erro ao recarregar detalhes da clínica:', err)
    } finally {
      setLoading(false)
    }
  }, [clinic.id, colorOptions])

  const handleNewProfessional = () => {
    setModalProf({
      id: '',
      name: '',
      specialty: '',
      avatar: undefined,
      color: colorOptions[0],
      commissionModel: 'commissioned',
      commissionRate: 0,
      rentalBaseCents: 0,
      clinicId: clinic.id, // ✅ Herdar clinic_id automaticamente
    } as SchedulerProfessional)
    setShowProfModal(true)
  }

  const handleEditProfessional = (prof: SchedulerProfessional) => {
    setModalProf({ ...prof, clinicId: clinic.id }) // ✅ Garantir clinic_id
    setShowProfModal(true)
  }

  const handleSaveProfessional = async (p: SchedulerProfessional) => {
    try {
      console.log('🔄 ClinicDetailsPanel - handleSaveProfessional chamado:', {
        hasId: !!p.id,
        name: p.name,
        hasEmail: !!(p as any).email,
        hasPassword: !!(p as any).password,
        clinicId: clinic.id
      })
      
      const professionalData = {
        ...p,
        clinicId: clinic.id, // ✅ Forçar clinic_id herdado
      } as any

      if (p.id) {
        console.log('🔄 ClinicDetailsPanel - Atualizando profissional existente...')
        await updateProfessional(professionalData)
      } else {
        console.log('🔄 ClinicDetailsPanel - Criando novo profissional...')
        await addProfessional(professionalData)
      }
      
      console.log('✅ ClinicDetailsPanel - Profissional salvo com sucesso, recarregando lista...')
      setShowProfModal(false)
      
      // Recarregar profissionais
      const { data: profsData, error: reloadError } = await supabase
        .from('professionals')
        .select('*')
        .eq('clinic_id', clinic.id)
      
      if (reloadError) {
        console.error('❌ ClinicDetailsPanel - Erro ao recarregar profissionais:', reloadError)
        // Não bloquear, apenas logar o erro
      }
      
      if (profsData) {
        const mappedProfs: SchedulerProfessional[] = profsData.map((p: any) => ({
          id: p.id,
          name: p.name || '',
          specialty: p.specialty || '',
          avatar: p.avatar_url || undefined,
          color: p.color || colorOptions[0],
          workSchedule: p.work_schedule || undefined,
          commissionModel: (p.commission_model as 'commissioned' | 'rental' | 'hybrid') || 'commissioned',
          commissionRate: p.commission_rate || 0,
          rentalBaseCents: p.rental_base_cents || 0,
          clinicId: clinic.id,
        }))
        setClinicProfessionals(mappedProfs)
        console.log('✅ ClinicDetailsPanel - Lista de profissionais recarregada:', mappedProfs.length)
      }
    } catch (error: any) {
      console.error('❌ ClinicDetailsPanel - Erro ao salvar profissional:', error)
      console.error('❌ Detalhes do erro:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        error: error
      })
      const errorMessage = error?.message || error?.error?.message || 'Erro desconhecido ao salvar profissional.'
      alert(`Erro ao salvar profissional: ${errorMessage}`)
      // Não fechar o modal em caso de erro para que o usuário possa corrigir
    }
  }

  const handleNewService = () => {
    setModalService({
      id: '',
      name: '',
      duration: 60,
      price: 0,
      professionalIds: [],
      clinicId: clinic.id, // ✅ Herdar clinic_id automaticamente
    } as Service)
    setShowServiceModal(true)
  }

  const handleEditService = (service: Service) => {
    setModalService({ ...service, clinicId: clinic.id }) // ✅ Garantir clinic_id
    setShowServiceModal(true)
  }

  const handleSaveService = async (s: Service) => {
    try {
      const serviceData = {
        ...s,
        clinicId: clinic.id, // ✅ Forçar clinic_id herdado
      } as any

      if (s.id) {
        await updateService(serviceData)
      } else {
        await addService(serviceData)
      }
      setShowServiceModal(false)
      // Recarregar serviços
      const { data: servicesData } = await supabase
        .from('services')
        .select('*')
        .eq('clinic_id', clinic.id)
      if (servicesData) {
        const mappedServices: Service[] = servicesData.map((s: any) => ({
          id: s.id,
          name: s.name || '',
          duration: s.duration_minutes || 60,
          price: Number(s.price) || 0,
          professionalIds: s.professional_ids || [],
          clinicId: clinic.id,
        }))
        setClinicServices(mappedServices)
      }
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error)
      alert('Erro ao salvar serviço. Tente novamente.')
    }
  }

  // Handlers para criar admin e excluir clínica
  const handleCreateAdmin = async () => {
    if (!adminFormData.full_name || !adminFormData.email || !adminFormData.password) {
      alert('Por favor, preencha todos os campos.')
      return
    }

    if (adminFormData.password.length < 6) {
      alert('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    try {
      const result = await addAdminToClinic(clinic.id, adminFormData)

      if (result.ok) {
        alert('Administrador criado e vinculado à clínica com sucesso!')
        setShowAdminModal(false)
        setAdminFormData({ full_name: '', email: '', password: '' })
        // Recarregar detalhes para mostrar o novo admin
        await reloadDetails()
      } else {
        alert(`Erro ao criar administrador: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Erro ao criar administrador:', error)
      alert(`Erro ao criar administrador: ${error.message || 'Tente novamente.'}`)
    }
  }

  const handleDeleteClinic = async () => {
    const confirmMessage = deleteMode === 'deactivate' 
      ? `Tem certeza que deseja DESATIVAR a clínica "${clinic.name}"?`
      : `Tem certeza que deseja EXCLUIR permanentemente a clínica "${clinic.name}"? Esta ação não pode ser desfeita!`

    if (!confirm(confirmMessage)) {
      return
    }

    try {
      const result = await deleteClinic(clinic.id, deleteMode === 'deactivate')

      if (result.ok) {
        alert(
          deleteMode === 'deactivate' 
            ? 'Clínica desativada com sucesso!'
            : 'Clínica excluída com sucesso!'
        )
        // Fechar painel e recarregar lista
        onBack()
        onRefreshClinics()
      } else {
        alert(`Erro ao processar clínica: ${result.error}`)
      }
    } catch (error: any) {
      console.error('Erro ao processar clínica:', error)
      alert(`Erro ao processar clínica: ${error.message || 'Tente novamente.'}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center py-8 text-sm text-gray-500">Carregando detalhes da clínica...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl p-6 m-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-white/60 rounded-lg transition"
              >
                <ArrowRight className="h-5 w-5 text-gray-600 rotate-180" />
              </button>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                  <Building2 className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{clinic.name}</h1>
                  {clinic.phone && (
                    <p className="text-sm text-gray-500">{clinic.phone}</p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-red-700 transition"
                title="Excluir/Desativar clínica"
              >
                <Trash2 className="h-4 w-4" />
                Excluir
              </button>
              <button
                onClick={reloadDetails}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
                title="Recarregar dados da clínica"
              >
                <Database className="h-4 w-4" />
                {loading ? 'Carregando...' : 'Recarregar'}
              </button>
            </div>
          </div>
        </div>

        {/* Abas */}
        <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as any)}>
          <TabsList className="mb-6">
            <TabsTrigger value="details">Detalhes</TabsTrigger>
            <TabsTrigger value="professionals">Profissionais ({clinicProfessionals.length})</TabsTrigger>
            <TabsTrigger value="services">Serviços ({clinicServices.length})</TabsTrigger>
          </TabsList>

          {/* Aba: Detalhes */}
          <TabsContent value="details" className="space-y-6">
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Informações Básicas</h3>
              <div className="bg-white/60 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Nome:</span>
                  <span className="text-gray-900 font-medium">{clinicDetails?.name || clinic.name}</span>
                </div>
                {clinicDetails?.email && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Email:</span>
                    <span className="text-gray-900 font-medium">{clinicDetails.email}</span>
                  </div>
                )}
                {clinicDetails?.phone && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Telefone:</span>
                    <span className="text-gray-900 font-medium">{clinicDetails.phone}</span>
                  </div>
                )}
                {clinicDetails?.address && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Endereço:</span>
                    <span className="text-gray-900 font-medium">{clinicDetails.address}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Criada em:</span>
                  <span className="text-gray-900 font-medium">
                    {new Date(clinic.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Status:</span>
                  <span className="text-gray-900 font-medium">
                    {clinicDetails?.status || 'active'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-white/40">
                  <span className="text-gray-600">Administrador:</span>
                  <div className="flex items-center gap-2">
                    {clinicAdmin ? (
                      <span className="text-gray-900 font-medium">{clinicAdmin.full_name || 'Sem nome'}</span>
                    ) : (
                      <>
                        <span className="text-gray-500 italic">Nenhum administrador cadastrado</span>
                        <button
                          onClick={() => setShowAdminModal(true)}
                          className="px-3 py-1 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition flex items-center gap-1"
                        >
                          <Plus className="h-3 w-3" />
                          Criar Admin
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Estatísticas</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{clinicProfessionals.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Profissionais</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{clinicServices.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Serviços</p>
                </div>
                <div className="bg-white/60 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">
                    {clinicDetails?.status || 'active'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Status</p>
                </div>
              </div>
            </section>
          </TabsContent>

          {/* Aba: Profissionais */}
          <TabsContent value="professionals" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Profissionais da Clínica</p>
              <button
                onClick={handleNewProfessional}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition"
              >
                <Plus className="h-4 w-4" /> Novo Profissional
              </button>
            </div>

            {clinicProfessionals.length === 0 ? (
              <div className="text-center py-12 bg-white/40 rounded-2xl border border-white/60">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900 mb-1">Nenhum profissional cadastrado</p>
                <p className="text-xs text-gray-500 mb-4">Comece adicionando profissionais para esta clínica</p>
                <button
                  onClick={handleNewProfessional}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition mx-auto"
                >
                  <Plus className="h-4 w-4" /> Cadastrar Primeiro Profissional
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clinicProfessionals.map((prof) => (
                  <div
                    key={prof.id}
                    className="rounded-xl bg-white/70 border border-white/60 p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ backgroundColor: prof.color }}
                      >
                        {prof.avatar ? (
                          <img src={prof.avatar} alt={prof.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          prof.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{prof.name}</p>
                        <p className="text-xs text-gray-500">{prof.specialty}</p>
                        {((prof as any).commissionModel || (prof as any).commissionRate !== undefined) && (
                          <p className="text-xs text-gray-500 mt-1">
                            {(() => {
                              const model = (prof as any).commissionModel || 'commissioned'
                              const rate = (prof as any).commissionRate || 0
                              const rental = (prof as any).rentalBaseCents || 0
                              
                              if (model === 'commissioned') {
                                return `Paga: ${rate}% por serviço`
                              } else if (model === 'rental') {
                                return `Paga: R$ ${(rental / 100).toFixed(2)}/mês`
                              } else if (model === 'hybrid') {
                                return `Paga: R$ ${(rental / 100).toFixed(2)}/mês + ${rate}%`
                              }
                              return `Paga: ${rate}% por serviço`
                            })()}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditProfessional(prof)}
                        className="p-2 hover:bg-white/60 rounded-lg transition"
                      >
                        <Edit2 className="h-4 w-4 text-gray-600" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm('Tem certeza que deseja remover este profissional?')) {
                            await removeProfessional(prof.id)
                            setClinicProfessionals(clinicProfessionals.filter((p) => p.id !== prof.id))
                          }
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </TabsContent>

          {/* Aba: Serviços */}
          <TabsContent value="services" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Serviços da Clínica</p>
              <button
                onClick={handleNewService}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition"
              >
                <Plus className="h-4 w-4" /> Novo Serviço
              </button>
            </div>

            {clinicServices.length === 0 ? (
              <div className="text-center py-12 bg-white/40 rounded-2xl border border-white/60">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-semibold text-gray-900 mb-1">Nenhum serviço cadastrado</p>
                <p className="text-xs text-gray-500 mb-4">Comece adicionando serviços para esta clínica</p>
                <button
                  onClick={handleNewService}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2 hover:bg-gray-800 transition mx-auto"
                >
                  <Plus className="h-4 w-4" /> Cadastrar Primeiro Serviço
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {clinicServices.map((service) => {
                  const serviceProfIds = (service as any).professionalIds || []
                  const serviceProfs = serviceProfIds.length > 0
                    ? clinicProfessionals.filter((p) => serviceProfIds.includes(p.id))
                    : clinicProfessionals

                  return (
                    <div
                      key={service.id}
                      className="rounded-xl bg-white/70 border border-white/60 p-4 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-gray-600">
                          <span>⏱️ {service.duration} min</span>
                          <span>💰 R$ {service.price.toFixed(2)}</span>
                          <div className="flex items-center gap-2">
                            <span>👥</span>
                            {serviceProfIds.length === 0 ? (
                              <span className="text-gray-500">Todos os profissionais</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {serviceProfs.slice(0, 3).map((prof) => (
                                  <div
                                    key={prof.id}
                                    className="h-6 w-6 rounded-full border border-white/60 flex items-center justify-center overflow-hidden"
                                    style={{ backgroundColor: prof.color + '40' }}
                                    title={prof.name}
                                  >
                                    {prof.avatar ? (
                                      <img src={prof.avatar} alt={prof.name} className="h-full w-full object-cover" />
                                    ) : (
                                      <span className="text-[10px] font-semibold text-gray-700">{prof.name.charAt(0)}</span>
                                    )}
                                  </div>
                                ))}
                                {serviceProfs.length > 3 && (
                                  <span className="text-gray-500">+{serviceProfs.length - 3}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditService(service)}
                          className="p-2 hover:bg-white/60 rounded-lg transition"
                          title="Editar serviço"
                        >
                          <Edit2 className="h-4 w-4 text-gray-600" />
                        </button>
                        <button
                          onClick={async () => {
                            if (confirm('Tem certeza que deseja remover este serviço?')) {
                              await removeService(service.id)
                              setClinicServices(clinicServices.filter((s) => s.id !== service.id))
                            }
                          }}
                          className="p-2 hover:bg-red-50 rounded-lg transition"
                          title="Excluir serviço"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

          </TabsContent>

        </Tabs>

        {/* Modais Globais */}
        {/* Modal de Profissional */}
        {showProfModal && modalProf && createPortal(
          <ProfessionalModal
            professional={modalProf}
            colors={colorOptions}
            onSave={handleSaveProfessional}
            onClose={() => {
              setShowProfModal(false)
              setModalProf(null)
            }}
          />,
          document.body
        )}

        {/* Modal de Serviço */}
        {showServiceModal && modalService && createPortal(
          <ServiceModal
            service={modalService}
            professionals={clinicProfessionals}
            onSave={handleSaveService}
            onClose={() => {
              setShowServiceModal(false)
              setModalService(null)
            }}
          />,
          document.body
        )}
        {/* Modal de Criar Admin */}
        {showAdminModal && createPortal(
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Criar Administrador</h2>
                  <button
                    onClick={() => {
                      setShowAdminModal(false)
                      setAdminFormData({ full_name: '', email: '', password: '' })
                    }}
                    className="p-1 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Nome Completo *
                    </label>
                    <input
                      type="text"
                      value={adminFormData.full_name}
                      onChange={(e) => setAdminFormData({ ...adminFormData, full_name: e.target.value })}
                      className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="Nome do administrador"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={adminFormData.email}
                      onChange={(e) => setAdminFormData({ ...adminFormData, email: e.target.value })}
                      className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Senha * (mínimo 6 caracteres)
                    </label>
                    <input
                      type="password"
                      value={adminFormData.password}
                      onChange={(e) => setAdminFormData({ ...adminFormData, password: e.target.value })}
                      className="w-full rounded-xl bg-white border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
                      placeholder="••••••"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-blue-800">
                    <p className="font-semibold mb-1">ℹ️ Informação:</p>
                    <p>O administrador será criado e automaticamente vinculado à clínica "{clinic.name}".</p>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => {
                      setShowAdminModal(false)
                      setAdminFormData({ full_name: '', email: '', password: '' })
                    }}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateAdmin}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 hover:bg-gray-800 transition"
                  >
                    Criar Admin
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

          {/* Modal de Excluir/Desativar Clínica */}
          {showDeleteModal && createPortal(
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Excluir/Desativar Clínica</h2>
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="p-1 hover:bg-gray-100 rounded-lg transition"
                  >
                    <X className="h-5 w-5 text-gray-600" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                    <p className="font-semibold mb-1">⚠️ Atenção:</p>
                    <p>Esta ação afetará a clínica "{clinic.name}".</p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="deactivate"
                        checked={deleteMode === 'deactivate'}
                        onChange={() => setDeleteMode('deactivate')}
                        className="text-gray-900 focus:ring-gray-900/15"
                      />
                      <div>
                        <span className="text-sm font-semibold text-gray-900">Desativar (Recomendado)</span>
                        <p className="text-xs text-gray-600">A clínica será desativada, mas os dados serão preservados. Pode ser reativada posteriormente.</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="deleteMode"
                        value="delete"
                        checked={deleteMode === 'delete'}
                        onChange={() => setDeleteMode('delete')}
                        className="text-gray-900 focus:ring-gray-900/15"
                      />
                      <div>
                        <span className="text-sm font-semibold text-red-600">Excluir Permanentemente</span>
                        <p className="text-xs text-gray-600">A clínica e seus dados serão excluídos permanentemente. Esta ação não pode ser desfeita!</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="flex-1 px-4 py-2 rounded-xl bg-gray-100 text-gray-900 text-sm font-semibold hover:bg-gray-200 transition"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteClinic}
                    className={`flex-1 px-4 py-2 rounded-xl text-white text-sm font-semibold shadow-lg shadow-black/10 transition ${
                      deleteMode === 'delete' 
                        ? 'bg-red-600 hover:bg-red-700' 
                        : 'bg-orange-600 hover:bg-orange-700'
                    }`}
                  >
                    {deleteMode === 'delete' ? 'Excluir Permanentemente' : 'Desativar Clínica'}
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </div>
  )
}
