import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

type Role = 'admin' | 'clinic_owner' | 'receptionist' | 'professional' | 'client' | 'super_admin'

// Interface para jornada de trabalho do profissional
export interface WorkSchedule {
  days: number[]
  start: string
  end: string
  breakStart?: string
  breakEnd?: string
}

type SchedulerUser = {
  id: string
  role: Role
  clinicId: string | null // UUID (string) ou null para super_admin
  professionalId?: string // UUID opcional
  fullName?: string
  email?: string
  avatarUrl?: string
}
export interface Anamnesis {
  allergies: string[]
  medications: string[]
  surgeries: string
  notes: string // Observações gerais
  complaint?: string
  medicationsText?: string
  conditions?: {
    diabetes?: boolean
    hipertensao?: boolean
    cardiaco?: boolean
    gestante?: boolean
    fumante?: boolean
  }
  updatedAt?: string
  updatedBy?: string
}

export interface Evolution {
  id: string
  date: string // ISO
  professionalId: string
  description: string
  procedure: string
}

export interface MedicalDocument {
  id: string
  name: string
  date: string
  url?: string
}

export type FormType = 'general' | 'invasive' | 'capillary'

export interface Service {
  id: string
  name: string
  duration: number // minutos
  price: number
  tax_rate_percent?: number | null // Taxa de imposto em porcentagem (0-100)
  category?: string
  professionalId?: string | 'all'
  professionalIds?: string[] | null // Array de IDs dos profissionais que podem realizar o serviço
  idealFrequencyDays?: number
}

export type ClinicSettings = {
  businessHours: { start: string; end: string }
  clinicName: string
}

export type PricingSettings = {
  salaryMonthly: number
  fixedMonthly: number
  taxPercent: number
  cardPercent: number
  commissionPercent: number
  profitPercent: number
  hoursPerDay: number
  daysPerMonth: number
}

export interface MedicalForm {
  id: string
  type: FormType
  date: string
  content: Record<string, any>
  signedFileUrl: string | null
  status: 'draft' | 'active' | 'expired'
  professionalId?: string
}

export interface SchedulerClient {
  id: string
  name: string
  mobile: string
  email?: string
  birthDate?: string
  walletBalance: number
  anamnesis?: Anamnesis
  evolutions?: Evolution[]
  documents?: MedicalDocument[]
  healthTags?: string[]
  forms?: MedicalForm[]
  lastName?: string
  phone?: string
  clinicId?: number
  color?: string
}
// export value placeholders for runtime compatibility
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Service = {} as any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SchedulerProfessional = {} as any
// Export de valor somente para satisfazer import runtime (ClientSelector)
// Interface é removida em build, então expomos um placeholder.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const SchedulerClient = {} as any

export type SchedulerProfessional = {
  id: string
  name: string
  specialty: string
  avatar: string
  color?: string
  role?: string
  commissionRate?: number // Percentual (0-100) - usado quando commissionModel é 'commissioned' ou 'hybrid'
  commissionModel?: 'commissioned' | 'rental' | 'hybrid' // Modelo de comissionamento
  rentalBaseCents?: number // Valor fixo mensal em centavos - usado quando commissionModel é 'hybrid' ou 'rental'
  rentalDueDay?: number // Dia do mês (1-28) em que a cobrança fixa mensal vence
  avatarUrl?: string
  workSchedule?: WorkSchedule
  clinicId?: string // Opcional: permite super_admin passar clinicId ao criar
}

type BaseEvent = { id: string; professionalId: string; clinicId: number }
export type SchedulerAppointment = BaseEvent & {
  type: 'appointment'
  start: string // ISO
  end: string // ISO
  clientId: string
  status?: 'pending' | 'confirmed' | 'waiting' | 'in_progress' | 'medical_done' | 'completed' | 'cancelled' | 'requested' | 'confirmado' | 'pendente' | 'cancelado' // Mantém compatibilidade com valores antigos
  title?: string
  patient?: string
  procedure?: string
  durationMinutes?: number
  color?: string
  checkInTime?: string | null // ISO timestamp
  startTime?: string | null // ISO timestamp (quando médico iniciou)
  endTime?: string | null // ISO timestamp (quando médico finalizou)
  medicalNotes?: string | null // Observações finais do médico
}
export type SchedulerBlock = BaseEvent & {
  type: 'block'
  start: string // ISO
  end: string // ISO
  reason?: string
}
export type SchedulerTimeOff = BaseEvent & {
  type: 'time_off'
  startDate: string // ISO date
  endDate: string // ISO date
  notes?: string
}

type SchedulerContextType = {
  currentUser: SchedulerUser | null
  sessionLoading: boolean
  login: (params: { email: string; password: string; mode: 'pro' | 'client' }) => Promise<void>
  logout: () => Promise<void>
  signOut: () => Promise<void>
  updateUserProfile: (data: { fullName?: string; avatarUrl?: string }) => Promise<void>
  appointments: SchedulerAppointment[]
  blocks: SchedulerBlock[]
  timeOffs: SchedulerTimeOff[]
  clients: SchedulerClient[]
  professionals: SchedulerProfessional[]
  services: Service[]
  clinicSettings: ClinicSettings
  pricingSettings: PricingSettings
  addAppointment: (data: Omit<SchedulerAppointment, 'id' | 'type'>) => Promise<{ ok: true } | { ok: false; error: string }>
  addBlock: (data: Omit<SchedulerBlock, 'id' | 'type'>) => { ok: true } | { ok: false; error: string }
  addTimeOff: (data: Omit<SchedulerTimeOff, 'id' | 'type'>) => { ok: true } | { ok: false; error: string }
  removeTimeOff: (id: string) => Promise<void>
  checkAvailability: (start: string, end: string, professionalId: string, excludeAppointmentId?: string) => boolean
  canUser: (action: string, resource: string, professionalId?: string, resourceId?: string) => boolean
  addClient: (client: Omit<SchedulerClient, 'id'>) => Promise<SchedulerClient>
  updateStatus: (id: string, status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'confirmado' | 'pendente' | 'cancelado') => void
  updateAppointment: (id: string, data: Partial<Omit<SchedulerAppointment, 'id' | 'type'>>) => Promise<{ ok: true } | { ok: false; error: string }>
  removeAppointment: (id: string) => Promise<void>
  removeBlock: (id: string) => void
  updateClient: (client: SchedulerClient) => void
  addCashback: (clientId: string, amount: number) => void
  useCashback: (clientId: string, amount: number) => { ok: true } | { ok: false; error: string }
  saveAnamnesis: (clientId: string, data: Anamnesis) => void
  addEvolution: (clientId: string, evolution: Evolution) => void
  addDocument: (clientId: string, doc: MedicalDocument) => void
  saveHealthTags: (clientId: string, tags: string[]) => void
  saveForm: (clientId: string, form: MedicalForm) => void
  addService: (service: Omit<Service, 'id'>) => Promise<Service>
  updateService: (service: Service) => Promise<void>
  removeService: (id: string) => Promise<void>
  addProfessional: (p: Omit<SchedulerProfessional, 'id'>) => Promise<SchedulerProfessional>
  updateProfessional: (p: SchedulerProfessional) => Promise<void>
  removeProfessional: (id: string) => Promise<void>
  updateClinicSettings: (data: Partial<ClinicSettings>) => void
  updatePricingSettings: (data: Partial<PricingSettings>) => void
  updateClinic: (data: { name?: string; phone?: string }) => Promise<void>
  provisionNewClinic: (adminData: { full_name: string; email: string; password: string; useExisting?: boolean; existingAdminId?: string }, clinicData: { name: string; phone?: string }) => Promise<{ ok: true; clinicId: string; adminId: string } | { ok: false; error: string }>
  addAdminToClinic: (clinicId: string, adminData: { full_name: string; email: string; password: string }) => Promise<{ ok: true; adminId: string } | { ok: false; error: string }>
  deleteClinic: (clinicId: string, deactivateOnly?: boolean) => Promise<{ ok: true } | { ok: false; error: string }>
}

const SchedulerContext = createContext<SchedulerContextType | null>(null)

// Mock inicial
const initialUser: SchedulerUser | null = null

const defaultClinicSettings: ClinicSettings = {
  businessHours: { start: '08:00', end: '19:00' },
  clinicName: 'Clínica Exemplo',
}

const defaultPricingSettings: PricingSettings = {
  salaryMonthly: 5000,
  fixedMonthly: 2000,
  taxPercent: 6,
  cardPercent: 2,
  commissionPercent: 0,
  profitPercent: 30,
  hoursPerDay: 8,
  daysPerMonth: 22,
}

// Mock data removido - dados reais vêm do banco

// Apenas "Visão Geral" como padrão - dados reais vêm do banco
const initialProfessionals: SchedulerProfessional[] = [
  { id: 'all', name: 'Visão Geral', specialty: 'Clínica', avatar: '' },
]

export function SchedulerProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<SchedulerUser | null>(initialUser)
  const [sessionLoading, setSessionLoading] = useState(true) // Iniciar como true para indicar que está carregando
  // ✅ Ref para acessar currentUser dentro do callback sem problemas de closure
  const currentUserRef = React.useRef<SchedulerUser | null>(initialUser)
  
  // Atualizar ref sempre que currentUser mudar
  React.useEffect(() => {
    currentUserRef.current = currentUser
  }, [currentUser])

  const [appointments, setAppointments] = useState<SchedulerAppointment[]>([])
  const [blocks, setBlocks] = useState<SchedulerBlock[]>([])
  const [timeOffs, setTimeOffs] = useState<SchedulerTimeOff[]>([])
  const [clients, setClients] = useState<SchedulerClient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [clinicSettings, setClinicSettings] = useState<ClinicSettings>(defaultClinicSettings)
  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(() => {
    try {
      const stored = localStorage.getItem('clinicflow_pricing')
      return stored ? (JSON.parse(stored) as PricingSettings) : defaultPricingSettings
    } catch {
      return defaultPricingSettings
    }
  })

  const login = async ({ email, password, mode }: { email: string; password: string; mode: 'pro' | 'client' }) => {
    try {
      console.log('🔐 Iniciando login...', { email, mode })
      
      // ✅ LIMPEZA DE CACHE NO LOGIN: Limpar dados antigos antes de fazer login
      console.log('🧹 Limpando cache/localStorage antes do login...')
      localStorage.removeItem('clinicflow_user')
      setCurrentUser(null)
      
      setSessionLoading(true)
      
      if (!email || !password) {
        setSessionLoading(false)
        throw new Error('Email e senha são obrigatórios')
      }
      
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      
      if (authError) {
        console.error('❌ Erro na autenticação:', authError)
        throw new Error(authError.message || 'Credenciais inválidas. Verifique seu email e senha.')
      }
      
      if (!authData.user) {
        console.error('❌ Usuário não retornado após autenticação')
        throw new Error('Falha na autenticação. Tente novamente.')
      }
      
      console.log('✅ Autenticação bem-sucedida')
      console.log('ℹ️ O perfil será carregado automaticamente pelo onAuthStateChange')
      
      // O loadUserProfile será chamado automaticamente pelo onAuthStateChange quando SIGNED_IN for disparado
      // Não precisamos fazer nada aqui, apenas retornar
      setSessionLoading(false)
    } catch (error: any) {
      console.error('❌ Erro completo no login:', error)
      setSessionLoading(false)
      // Re-throw com mensagem mais clara
      if (error?.message) {
        throw error
      }
      throw new Error('Erro ao fazer login. Verifique suas credenciais e tente novamente.')
    }
  }
  const logout = async () => {
    await supabase.auth.signOut()
    localStorage.removeItem('clinicflow_user')
    setCurrentUser(null)
    setAppointments([])
    setBlocks([])
    setTimeOffs([])
    setClients([])
    setServices([])
    setProfessionals([])
    // força voltar para login
    window.location.replace('/login')
  }

  const signOut = async () => {
    await logout()
  }

  const updateUserProfile = async (data: { fullName?: string; avatarUrl?: string }) => {
    if (!currentUser?.id) {
      throw new Error('Usuário não encontrado')
    }
    
    const updates: any = {}
    if (data.fullName !== undefined) updates.full_name = data.fullName
    if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl
    if (Object.keys(updates).length === 0) return

    // Fazer update sem .single() primeiro
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUser.id)

    if (updateError) {
      console.error('Erro ao atualizar perfil:', updateError)
      throw new Error(`Erro ao salvar: ${updateError.message}`)
    }

    // Recarregar dados atualizados do banco usando .maybeSingle() que é mais seguro
    const { data: updatedProfile, error: fetchError } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (fetchError) {
      console.error('Erro ao buscar perfil atualizado:', fetchError)
      // Mesmo com erro ao buscar, atualizamos com os dados que tentamos salvar
      setCurrentUser((prev: SchedulerUser | null) =>
        prev
          ? {
              ...prev,
              fullName: data.fullName ?? prev.fullName,
              avatarUrl: data.avatarUrl ?? prev.avatarUrl,
            }
          : prev
      )
      return
    }

    // Atualizar estado local com dados do banco
    const newUserData = {
      ...currentUser,
      fullName: updatedProfile?.full_name ?? currentUser.fullName,
      avatarUrl: updatedProfile?.avatar_url ?? currentUser.avatarUrl,
    }
    
    setCurrentUser(newUserData)
    localStorage.setItem('clinicflow_user', JSON.stringify(newUserData))
    
    console.log('Perfil atualizado:', {
      fullName: newUserData.fullName,
      avatarUrl: newUserData.avatarUrl,
    })
  }
  const [professionals, setProfessionals] = useState<SchedulerProfessional[]>(initialProfessionals)

  useEffect(() => {
    const load = async () => {
      // Super admin pode ter clinicId selecionado (quando está trabalhando com uma clínica específica)
      // Se não tiver clinicId, não carregamos dados (super admin pode selecionar uma clínica depois)
      if (currentUser?.role === 'super_admin') {
        if (!currentUser?.clinicId || typeof currentUser.clinicId !== 'string') {
          console.log('🔍 Super admin sem clinicId selecionado - não carregando dados')
          return
        }
        // Se super admin tiver clinicId, carregar dados dessa clínica
        console.log('🔍 Super admin com clinicId selecionado - carregando dados da clínica:', currentUser.clinicId)
      }
      
      // Verificar se clinicId existe e é válido (UUID string)
      // IMPORTANTE: Super admin pode não ter clinicId, mas ainda assim precisa carregar dados se tiver um selecionado
      // Para outros roles, clinicId é obrigatório
      if (!currentUser) {
        console.log('ℹ️ load - Sem currentUser, não carregando dados')
        return
      }
      
      if (currentUser.role !== 'super_admin') {
        if (!currentUser.clinicId || typeof currentUser.clinicId !== 'string') {
          console.warn('⚠️ load - clinicId inválido ou ausente (não é super_admin):', currentUser.clinicId)
          // Para não-super_admin, não carregar dados sem clinicId
          return
        }
      } else {
        // Super admin: só carregar dados se tiver clinicId selecionado
        if (!currentUser.clinicId || typeof currentUser.clinicId !== 'string') {
          console.log('ℹ️ load - Super admin sem clinicId selecionado - dados não serão carregados até selecionar uma clínica')
          // Para super_admin sem clinicId, definir estados vazios mas não bloquear a renderização
          setServices([])
          setProfessionals([{ id: 'all', name: 'Visão Geral', specialty: 'Clínica', avatar: '' }])
          setClients([])
          setAppointments([])
          setBlocks([])
          setTimeOffs([])
          return
        }
      }
      
      const clinicId = currentUser.clinicId // UUID string do banco
      console.log('📥 Carregando dados para clinicId:', clinicId)
      
      try {
        const [svcRes, profRes, cliRes, appRes, blkRes, toRes, setRes] = await Promise.all([
          // Buscar serviços por clinic_id (único identificador após remoção de organization_id)
          supabase.from('services').select('*').eq('clinic_id', clinicId),
          supabase.from('professionals').select('*').eq('clinic_id', clinicId),
          // Buscar clientes por clinic_id (tabela clients usa clinic_id conforme insert_sample_data.sql)
          supabase.from('clients').select('*').eq('clinic_id', clinicId),
          // Buscar agendamentos por clinic_id (único identificador após remoção de organization_id)
          supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('start_time', { ascending: true }),
          supabase.from('blocks').select('*').eq('clinic_id', clinicId),
          supabase.from('time_offs').select('*').eq('clinic_id', clinicId),
          supabase.from('clinic_settings').select('*').eq('clinic_id', clinicId).maybeSingle(),
        ])
        
        // Tratar cada resultado individualmente, ignorando erros
        if (!svcRes.error && svcRes.data) {
          // Mapear serviços do banco para o formato esperado
          const mappedServices: Service[] = svcRes.data.map((s: Record<string, unknown>) => ({
            id: s.id as string,
            name: s.name as string,
            duration: (s.duration_minutes as number) || (s.duration as number) || 30, // Backend: duration_minutes -> Frontend: duration
            price: s.price as number,
            tax_rate_percent: (s.tax_rate_percent as number | null) ?? null, // Taxa de imposto em porcentagem
            // category não existe na tabela services - removido
            category: undefined, // Mantido como undefined para compatibilidade com interface
            professionalIds: (s.professional_ids as string[] | null) || null,
            professionalId: (s.professional_id as string) || 'all',
            idealFrequencyDays: s.ideal_frequency_days as number | undefined,
          }))
          setServices(mappedServices)
        } else if (svcRes.error) {
          console.warn('Erro ao carregar services:', svcRes.error.message)
        }
        
        if (!profRes.error && profRes.data) {
          // Mapear profissionais do banco para frontend
          // CORRIGIDO: Filtrar qualquer profissional que corresponda ao perfil do super_admin atual
          // O super_admin nunca deve aparecer como profissional na lista
          const professionalsData: SchedulerProfessional[] = profRes.data
            .filter((p: Record<string, unknown>) => {
              // Se o usuário atual é super_admin, verificar se este profissional corresponde ao perfil dele
              if (currentUser?.role === 'super_admin' && currentUser?.id) {
                // Excluir se:
                // 1. O ID do profissional corresponde ao ID do perfil do super_admin
                // 2. O ID do profissional corresponde ao professional_id do perfil do super_admin (se existir)
                if (p.id === currentUser.id || (currentUser.professionalId && p.id === currentUser.professionalId)) {
                  console.log('🚫 SchedulerContext - Excluindo perfil do super_admin da lista de profissionais:', {
                    professionalId: p.id,
                    professionalName: p.name,
                    currentUserId: currentUser.id,
                    currentUserProfessionalId: currentUser.professionalId
                  })
                  return false
                }
              }
              return true
            })
            .map((p: any) => ({
              id: p.id,
              name: p.name || p.nome, // Backend: name -> Frontend: name
              specialty: p.specialty || p.especialidade, // Backend: specialty -> Frontend: specialty
              avatar: p.avatar_url || p.url_do_avatar || p.avatar || '', // Backend: avatar_url -> Frontend: avatar
              color: p.color || p.cor, // Backend: color -> Frontend: color
              role: p.role || p.specialty, // Backend: role (nome unificado, não mais cargo) -> Frontend: role
              commissionModel: (p.commission_model as 'commissioned' | 'rental' | 'hybrid') || 'commissioned',
              commissionRate: p.commission_rate || 0, // Backend: commission_rate (nome unificado, não mais taxa_de_comissao) -> Frontend: commissionRate
              rentalBaseCents: p.rental_base_cents || 0,
              avatarUrl: p.avatar_url || p.url_do_avatar, // Backend: avatar_url -> Frontend: avatarUrl
              workSchedule: p.work_schedule || undefined, // Backend: work_schedule -> Frontend: workSchedule
            }))
          
          // Adicionar "Visão Geral" no início se não existir
          const hasAllView = professionalsData.some((p) => p.id === 'all')
          
          // ✅ REMOVIDO: Profissionais fictícios não devem aparecer no calendário
          
          if (!hasAllView) {
            const finalProfessionals = [
              { id: 'all', name: 'Visão Geral', specialty: 'Clínica', avatar: '' },
              ...professionalsData,
            ]
            console.log('📋 SchedulerContext - Definindo profissionais (sem all):', {
              total: finalProfessionals.length,
              ids: finalProfessionals.map(p => p.id),
              names: finalProfessionals.map(p => p.name)
            })
            setProfessionals(finalProfessionals)
          } else {
            setProfessionals(professionalsData)
          }
          
          console.log('✅ SchedulerContext - Profissionais carregados:', {
            total: profRes.data.length,
            filtrados: professionalsData.length,
            currentUserRole: currentUser?.role,
            currentUserId: currentUser?.id
          })
        } else if (profRes.error) {
          console.warn('Erro ao carregar professionals:', profRes.error.message)
          // ✅ REMOVIDO: Não adicionar profissionais fictícios em caso de erro
          setProfessionals([
            { id: 'all', name: 'Visão Geral', specialty: 'Clínica', avatar: '' },
          ])
        } else {
          // Caso não haja erro mas também não haja dados (array vazio)
          // ✅ REMOVIDO: Não adicionar profissionais fictícios quando não há dados
          setProfessionals([
            { id: 'all', name: 'Visão Geral', specialty: 'Clínica', avatar: '' },
          ])
        }
        
        if (!cliRes.error && cliRes.data) {
          // Mapear clientes do banco para o formato esperado pelo frontend
          const mappedClients: SchedulerClient[] = cliRes.data.map((c: Record<string, unknown>) => ({
            id: c.id as string,
            name: ((c.full_name || c.name) as string) || '', // Backend: full_name -> Frontend: name
            mobile: ((c.phone || c.mobile) as string) || '', // Backend: phone -> Frontend: mobile
            phone: ((c.phone || c.mobile) as string) || '', // Backend: phone -> Frontend: phone (compatibilidade)
            email: (c.email as string) || undefined,
            birthDate: ((c.birth_date || c.birthDate) as string) || undefined,
            walletBalance: ((c.wallet_balance || c.walletBalance) as number) || 0,
            clinicId: c.clinic_id ? (parseInt(((c.clinic_id as string) || '1').toString().slice(0, 8).replace(/-/g, ''), 16) || 1) : undefined,
            color: (c.color as string) || undefined,
            // Campos opcionais que podem não existir no banco
            anamnesis: c.anamnesis as SchedulerClient['anamnesis'] | undefined,
            evolutions: c.evolutions as SchedulerClient['evolutions'] | undefined,
            documents: c.documents as SchedulerClient['documents'] | undefined,
            healthTags: ((c.health_tags || c.healthTags) as string[]) || undefined,
            forms: c.forms as SchedulerClient['forms'] | undefined,
            lastName: ((c.last_name || c.lastName) as string) || undefined,
          }))
          setClients(mappedClients)
          console.log('✅ Clientes carregados do banco:', mappedClients.length)
          if (mappedClients.length > 0) {
            console.log('📋 Primeiro cliente exemplo:', mappedClients[0])
          }
        } else if (cliRes.error) {
          console.warn('❌ Erro ao carregar clients:', cliRes.error.message)
          console.warn('❌ Detalhes do erro:', cliRes.error)
          // Fallback: tentar buscar novamente (sem organization_id, apenas clinic_id)
          if (cliRes.error.message?.includes('clinic_id')) {
            console.log('🔄 Tentando buscar clients novamente...')
            const { data: orgClients, error: orgError } = await supabase
              .from('clients')
              .select('*')
              .eq('clinic_id', clinicId)
            if (!orgError && orgClients) {
              const mappedClients: SchedulerClient[] = orgClients.map((c: any) => ({
                id: c.id,
                name: c.full_name || c.name || '',
                mobile: c.phone || c.mobile || '',
                phone: c.phone || c.mobile || '',
                email: c.email || undefined,
                birthDate: c.birth_date || c.birthDate || undefined,
                walletBalance: c.wallet_balance || c.walletBalance || 0,
                clinicId: c.clinic_id || undefined,
                color: c.color || undefined,
                anamnesis: c.anamnesis || undefined,
                evolutions: c.evolutions || undefined,
                documents: c.documents || undefined,
                healthTags: c.health_tags || c.healthTags || undefined,
                forms: c.forms || undefined,
                lastName: c.last_name || c.lastName || undefined,
              }))
              setClients(mappedClients)
              console.log('✅ Clientes carregados por clinic_id (fallback):', mappedClients.length)
            }
          }
        }
        
        if (!appRes.error && appRes.data) {
          console.log('📥 ========================================')
          console.log('📥 Agendamentos brutos do banco:', appRes.data.length)
          console.log('📥 ========================================')
          
          if (appRes.data.length > 0) {
            console.log('📥 Primeiro agendamento bruto:', {
              id: appRes.data[0].id,
              professional_id: appRes.data[0].professional_id,
              client_id: appRes.data[0].client_id,
              service_id: appRes.data[0].service_id,
              start_time: appRes.data[0].start_time,
              clinic_id: appRes.data[0].clinic_id
            })
            
            const professionalIdsFromDb = appRes.data.map((a: Record<string, unknown>) => ({
              appointmentId: a.id,
              professional_id: a.professional_id,
              isNull: a.professional_id === null || a.professional_id === undefined,
              client_id: a.client_id,
              start_time: a.start_time
            }))
            
            console.log('📥 ========================================')
            console.log('📥 TODOS OS PROFESSIONAL_IDS DOS AGENDAMENTOS:')
            console.log('📥 ========================================')
            console.table(professionalIdsFromDb)
            
            const nullCount = professionalIdsFromDb.filter((a: any) => a.isNull).length
            if (nullCount > 0) {
              console.error('❌ ========================================')
              console.error('❌ PROBLEMA CRÍTICO DETECTADO!')
              console.error('❌ ========================================')
              console.error('❌ Agendamentos com professional_id NULL no banco:', nullCount, 'de', professionalIdsFromDb.length)
              console.error('❌ IDs dos agendamentos com professional_id NULL:')
              professionalIdsFromDb.filter((a: { isNull: boolean }) => a.isNull).forEach((a) => {
                console.error('   -', a.appointmentId, '| Cliente:', a.client_id, '| Horário:', a.start_time)
              })
              console.error('❌ ========================================')
              console.error('❌ AÇÃO NECESSÁRIA:')
              console.error('❌ 1. Execute o script SQL: fix_appointments_professional_id_urgent.sql')
              console.error('❌ 2. Ou atualize manualmente no banco de dados')
              console.error('❌ ========================================')
            } else {
              console.log('✅ Todos os agendamentos têm professional_id válido no banco')
            }
          } else {
            console.warn('⚠️ Nenhum agendamento encontrado no banco de dados')
          }
          
          // Criar mapa de profile_id -> professional_id para mapeamento eficiente
          // ESTRATÉGIA MELHORADA: 
          // 1. Se appointments.professional_id já é um ID de professionals, usar diretamente
          // 2. Se appointments.professional_id é um profile_id, buscar o professional correspondente
          // 3. Buscar todos os profiles e professionals de uma vez
          const profileIds = [...new Set(appRes.data.map((apt: any) => apt.professional_id).filter(Boolean))]
          const profileToProfessionalMap = new Map<string, string>()
          
          // Primeiro, verificar se os professional_ids dos appointments já são IDs de professionals
          // Buscar todos os professionals primeiro
          const { data: allProfessionals, error: profsError } = await supabase
            .from('professionals')
            .select('id, name')
            .eq('clinic_id', clinicId)
          
          if (!profsError && allProfessionals && allProfessionals.length > 0) {
            // Criar mapa de professional IDs para verificação rápida
            const professionalIdsSet = new Set(allProfessionals.map((p: { id: string }) => p.id))
            
            // Verificar quais professional_ids dos appointments já são IDs válidos de professionals
            profileIds.forEach((profileId: string) => {
              if (professionalIdsSet.has(profileId)) {
                // Já é um ID de professional, usar diretamente
                profileToProfessionalMap.set(profileId, profileId)
                console.log('✅ professional_id já é um ID válido de professional:', profileId)
              }
            })
            
            // Agora, para os que não foram encontrados, tentar mapear via profiles
            const unmappedProfileIds = profileIds.filter(id => !profileToProfessionalMap.has(id))
            
            if (unmappedProfileIds.length > 0) {
              try {
                // Buscar todos os profiles que ainda não foram mapeados
                const { data: profiles, error: profilesError } = await supabase
                  .from('profiles')
                  .select('id, full_name, professional_id')
                  .in('id', unmappedProfileIds)
                
                if (!profilesError && profiles) {
                  // Estratégia 1: Se o profile tem professional_id, usar diretamente
                  profiles.forEach((profile: any) => {
                    if (profile.professional_id && professionalIdsSet.has(profile.professional_id)) {
                      profileToProfessionalMap.set(profile.id, profile.professional_id)
                      console.log('✅ Mapeado via profile.professional_id:', profile.id, '->', profile.professional_id)
                    }
                  })
                  
                  // Estratégia 2: Para os que ainda não foram mapeados, tentar por nome
                  const stillUnmapped = profiles.filter((p: { id: string }) => !profileToProfessionalMap.has(p.id))
                  stillUnmapped.forEach((profile: { id: string; full_name?: string }) => {
                    const matchingProf = allProfessionals.find((prof: { name?: string }) => 
                      prof.name && profile.full_name && 
                      (prof.name.toLowerCase().includes(profile.full_name.toLowerCase()) ||
                       profile.full_name.toLowerCase().includes(prof.name.toLowerCase()))
                    )
                    
                    if (matchingProf) {
                      profileToProfessionalMap.set(profile.id, matchingProf.id)
                      console.log('✅ Mapeado por nome:', profile.id, '->', matchingProf.id, `(${profile.full_name} -> ${matchingProf.name})`)
                    }
                  })
                  
                  // Estratégia 3: Para os que ainda não foram mapeados, usar o primeiro professional como fallback
                  const finalUnmapped = profiles.filter((p: { id: string }) => !profileToProfessionalMap.has(p.id))
                  if (finalUnmapped.length > 0 && allProfessionals.length > 0) {
                    const firstProfId = allProfessionals[0].id
                    finalUnmapped.forEach((profile: { id: string }) => {
                      profileToProfessionalMap.set(profile.id, firstProfId)
                      console.warn('⚠️ Usando primeiro professional como fallback para profile_id:', profile.id, '->', firstProfId)
                    })
                  }
                }
              } catch (err) {
                console.warn('⚠️ Erro ao criar mapa profile_id -> professional_id:', err)
              }
            }
            
            console.log('📋 Mapa profile_id -> professional_id criado:', {
              totalMappings: profileToProfessionalMap.size,
              totalProfessionals: allProfessionals.length,
              mappings: Array.from(profileToProfessionalMap.entries()).slice(0, 10) // Limitar para não poluir
            })
            
            // Verificar se há professional_ids nos appointments que não estão no mapa
            const unmappedIds = profileIds.filter(id => !profileToProfessionalMap.has(id))
            if (unmappedIds.length > 0) {
              console.warn('⚠️ Professional_ids dos appointments que NÃO foram mapeados:', unmappedIds)
            }
          } else if (profsError) {
            console.warn('⚠️ Erro ao buscar professionals para mapeamento:', profsError)
          }
          
          // Criar mapas para buscar dados relacionados (clientes e serviços)
          const clientMap = new Map<string, string>() // client_id -> client name
          const serviceMap = new Map<string, string>() // service_id -> service name
          
          // Buscar nomes dos clientes
          if (cliRes.data && Array.isArray(cliRes.data)) {
            cliRes.data.forEach((client: Record<string, unknown>) => {
              clientMap.set(client.id as string, ((client.full_name || client.name) as string) || 'Cliente')
            })
          }
          
          // Buscar nomes dos serviços
          if (svcRes.data && Array.isArray(svcRes.data)) {
            svcRes.data.forEach((service: any) => {
              serviceMap.set(service.id, service.name || 'Serviço')
            })
          }
          
          // Mapear agendamentos do backend para formato do frontend
          const mappedAppointments: SchedulerAppointment[] = appRes.data.map((apt: Record<string, unknown>) => {
            // Mapear profile_id (do banco) para professional_id (do frontend)
            let professionalId: string = 'all' // Default quando professional_id é null
            
            console.log('🔍 Mapeando agendamento:', {
              appointmentId: apt.id as string,
              professional_id_from_db: apt.professional_id as string,
              mapSize: profileToProfessionalMap.size,
              hasInMap: apt.professional_id ? profileToProfessionalMap.has(apt.professional_id as string) : false
            })
            
            if (apt.professional_id) {
              // Estratégia melhorada de mapeamento:
              // 1. Primeiro, verificar se já está no mapa (mapeamento via profiles)
              professionalId = profileToProfessionalMap.get(apt.professional_id as string) || ''
              
              console.log('🔍 Após verificar mapa:', {
                appointmentId: apt.id as string,
                professionalIdFromMap: professionalId,
                professional_id_from_db: apt.professional_id as string
              })
              
              // 2. Se não encontrou no mapa, verificar se o professional_id do banco
              // já é um ID válido de professional (pode ser que appointments.professional_id
              // já seja o ID direto da tabela professionals)
              if (!professionalId && profRes.data && Array.isArray(profRes.data)) {
                const directProf = profRes.data.find((p: { id: string }) => p.id === (apt.professional_id as string))
                if (directProf) {
                  professionalId = directProf.id
                  console.log('✅ SchedulerContext - professional_id já é um ID válido de professional:', {
                    appointmentId: apt.id as string,
                    professionalId: professionalId,
                    professionalName: (directProf as { name?: string }).name
                  })
                } else {
                  console.warn('⚠️ SchedulerContext - professional_id não encontrado diretamente na lista:', {
                    appointmentId: apt.id as string,
                    professional_id_from_db: apt.professional_id as string,
                    availableProfessionalIds: profRes.data.map((p: { id: string }) => p.id).slice(0, 5)
                  })
                }
              }
              
              // 3. Se ainda não encontrou, usar o ID original (pode ser um profile_id que será mapeado depois)
              // IMPORTANTE: Não usar 'all' aqui, pois isso faria todos os agendamentos caírem na primeira coluna
              if (!professionalId) {
                professionalId = apt.professional_id as string
                console.warn('⚠️ SchedulerContext - professional_id não mapeado, usando ID original:', {
                  appointmentId: apt.id as string,
                  professionalIdFromDb: apt.professional_id as string,
                  mapSize: profileToProfessionalMap.size,
                  mapKeys: Array.from(profileToProfessionalMap.keys()).slice(0, 3)
                })
              } else {
                console.log('✅ SchedulerContext - professional_id mapeado com sucesso:', {
                  appointmentId: apt.id as string,
                  professionalIdFromDb: apt.professional_id as string,
                  professionalIdMapped: professionalId
                })
              }
            } else {
              // Se professional_id é null no banco, usar 'all'
              console.warn('⚠️ Agendamento sem professional_id no banco, usando "all":', {
                appointmentId: apt.id as string,
                client_id: apt.client_id as string,
                start_time: apt.start_time as string
              })
              professionalId = 'all'
            }
            
            // Buscar nome do cliente
            const clientName = apt.client_id ? (clientMap.get(apt.client_id as string) || 'Cliente') : 'Cliente'
            
            // Buscar nome do serviço
            const serviceName = apt.service_id ? (serviceMap.get(apt.service_id as string) || undefined) : undefined
            
            // Calcular duração em minutos
            let durationMinutes = (apt.duration_minutes as number) || 30
            if (!durationMinutes && apt.start_time && apt.end_time) {
              const start = new Date(apt.start_time as string)
              const end = new Date(apt.end_time as string)
              durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
            }
            
            return {
              id: apt.id as string,
              type: 'appointment' as const,
              professionalId: professionalId,
              clinicId: parseInt(((apt.clinic_id as string) || '1').toString().slice(0, 8).replace(/-/g, ''), 16) || 1, // Converter UUID para número
              start: apt.start_time as string,
              end: apt.end_time as string,
              clientId: (apt.client_id as string) || '',
              status: apt.status as SchedulerAppointment['status'],
              title: serviceName || (apt.notes as string) || 'Procedimento', // Usar nome do serviço se disponível
              patient: clientName, // Usar nome do cliente
              procedure: serviceName || (apt.notes as string) || undefined, // Usar nome do serviço se disponível
              durationMinutes: durationMinutes,
              color: 'bg-purple-200',
            } as SchedulerAppointment
          })
          
          setAppointments(mappedAppointments)
          console.log('✅ Agendamentos carregados e mapeados:', mappedAppointments.length)
          if (mappedAppointments.length > 0) {
            console.log('📋 Primeiro agendamento exemplo:', mappedAppointments[0])
            console.log('📋 Todos os professionalIds mapeados:', mappedAppointments.map(a => ({ id: a.id, professionalId: a.professionalId, patient: a.patient })))
            
            // Log detalhado sobre o mapeamento
            const allCount = mappedAppointments.filter(a => a.professionalId === 'all').length
            const mappedCount = mappedAppointments.filter(a => a.professionalId !== 'all').length
            console.log('📊 Estatísticas de mapeamento:', {
              total: mappedAppointments.length,
              mapeados: mappedCount,
              comoAll: allCount,
              percentualMapeado: ((mappedCount / mappedAppointments.length) * 100).toFixed(1) + '%'
            })
            
            // Se muitos estão como 'all', mostrar detalhes e ALERTAR
            if (allCount > 0) {
              const allAppointments = mappedAppointments.filter(a => a.professionalId === 'all')
              console.error('❌ PROBLEMA CRÍTICO: Agendamentos marcados como "all" (professional_id NULL no banco):', allAppointments.map(a => ({
                id: a.id,
                patient: a.patient,
                start: a.start,
                clientId: a.clientId
              })))
              console.error('❌ AÇÃO NECESSÁRIA: Execute o script SQL fix_existing_appointments_professional_id.sql para corrigir os agendamentos existentes')
            }
          } else {
            console.warn('⚠️ Nenhum agendamento foi carregado do banco de dados')
          }
        } else if (appRes.error) {
          console.warn('❌ Erro ao carregar appointments:', appRes.error.message)
          console.warn('❌ Detalhes do erro:', appRes.error)
          console.warn('❌ Código do erro:', appRes.error.code)
          
          // Fallback: se a busca principal falhou, tentar novamente com clinic_id
          // (Removido fallback para organization_id pois a coluna foi removida)
          console.log('🔄 Tentando buscar appointments por clinic_id como fallback...')
          const { data: clinicAppts, error: clinicError } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', clinicId)
            .order('start_time', { ascending: true })
          
          if (!clinicError && clinicAppts) {
            console.log('✅ Agendamentos encontrados por clinic_id:', clinicAppts.length)
            // Criar mapas para buscar dados relacionados
            const clientMap = new Map<string, string>()
            const serviceMap = new Map<string, string>()
            if (cliRes.data && Array.isArray(cliRes.data)) {
              cliRes.data.forEach((client: Record<string, unknown>) => {
                clientMap.set(client.id as string, ((client.full_name || client.name) as string) || 'Cliente')
              })
            }
            if (svcRes.data && Array.isArray(svcRes.data)) {
              svcRes.data.forEach((service: Record<string, unknown>) => {
                serviceMap.set(service.id as string, (service.name as string) || 'Serviço')
              })
            }
            
            const mappedAppointments: SchedulerAppointment[] = clinicAppts.map((apt: Record<string, unknown>) => {
              const clientName = apt.client_id ? (clientMap.get(apt.client_id as string) || 'Cliente') : 'Cliente'
              const serviceName = apt.service_id ? (serviceMap.get(apt.service_id as string) || undefined) : undefined
              let durationMinutes = (apt.duration_minutes as number) || 30
              if (!durationMinutes && apt.start_time && apt.end_time) {
                const start = new Date(apt.start_time as string)
                const end = new Date(apt.end_time as string)
                durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60))
              }
              
              return {
                id: apt.id as string,
                type: 'appointment' as const,
                professionalId: (apt.professional_id as string) || 'all',
                clinicId: parseInt(((apt.clinic_id as string) || '1').toString().slice(0, 8).replace(/-/g, ''), 16) || 1,
                start: apt.start_time as string,
                end: apt.end_time as string,
                clientId: (apt.client_id as string) || '',
                status: apt.status as SchedulerAppointment['status'],
                title: serviceName || (apt.notes as string) || 'Procedimento',
                patient: clientName,
                procedure: serviceName || (apt.notes as string) || undefined,
                durationMinutes: durationMinutes,
                color: 'bg-purple-200',
              } as SchedulerAppointment
            })
            setAppointments(mappedAppointments)
            console.log('✅ Agendamentos carregados por clinic_id:', mappedAppointments.length)
          } else if (clinicError) {
            console.error('❌ Erro ao buscar por clinic_id:', clinicError.message)
          }
        }
        
        // Processar blocks, time_offs e clinic_settings
        if (!blkRes.error && blkRes.data) {
          setBlocks(blkRes.data as SchedulerBlock[])
        } else if (blkRes.error) {
          console.warn('Erro ao carregar blocks:', blkRes.error.message)
        }
        
        if (!toRes.error && toRes.data) {
          setTimeOffs(toRes.data as SchedulerTimeOff[])
        } else if (toRes.error) {
          console.warn('Erro ao carregar time_offs:', toRes.error.message)
        }
        
        if (!setRes.error && setRes.data) {
          setClinicSettings(setRes.data as ClinicSettings)
        } else if (setRes.error) {
          console.warn('Erro ao carregar clinic_settings:', setRes.error.message)
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }
    load()
  }, [currentUser?.clinicId])


  const canUser = (action: string, resource: string, professionalId?: string, resourceId?: string) => {
    const role = currentUser?.role
    if (!role) return false
    
    // Super admin tem acesso total
    if (role === 'super_admin') return true
    
    // ============================================================================
    // ADMINISTRADOR (admin/clinic_owner)
    // ============================================================================
    // CRUD completo dentro do clinic_id
    if (role === 'admin' || role === 'clinic_owner') {
      // Admin tem acesso total dentro do seu clinic_id
      // Validação de clinic_id é feita pelas políticas RLS no banco
      return true
    }

    // ============================================================================
    // RECEPCIONISTA (receptionist)
    // ============================================================================
    // Pode gerenciar agendamentos e visualizar informações
    if (role === 'receptionist') {
      const allowedActions = ['create', 'update', 'read', 'delete', 'block', 'time_off']
      const allowedResources = ['appointment', 'client', 'slot', 'schedule', 'professional', 'service']
      return allowedActions.includes(action) && allowedResources.includes(resource)
    }

    // ============================================================================
    // PROFISSIONAL (professional)
    // ============================================================================
    if (role === 'professional') {
      // Profissional só pode trabalhar na própria agenda
      if (professionalId && currentUser?.professionalId && professionalId !== currentUser.professionalId) {
        return false
      }

      // Agenda e Agendamentos: apenas os seus (professional_id = seu ID)
      if (resource === 'appointment') {
        // Verificar se o agendamento pertence ao profissional
        // Isso será validado no backend, mas aqui fazemos uma verificação básica
        if (action === 'read' || action === 'update' || action === 'delete') {
          // Se temos resourceId, precisaria buscar no banco, mas por agora confiamos no RLS
          return true
        }
        return false // Profissional não pode criar agendamentos (apenas visualizar/editar seus)
      }

      // Clientes: apenas os que têm agendamentos com ele
      if (resource === 'client') {
        // Validação completa feita no RLS (apenas clientes com appointments)
        if (action === 'read' || action === 'update') return true
        return false
      }

      // Perfil Pessoal: apenas o próprio
      if (resource === 'professional' || resource === 'profile') {
        if (action === 'read' || action === 'update') {
          // Verificar se está acessando o próprio perfil
          if (resourceId && currentUser?.id && resourceId !== currentUser.id) return false
          return true
        }
        return false
      }

      // Relatórios: apenas os próprios dados
      if (resource === 'report' || resource === 'financial') {
        if (action === 'read') return true
        return false
      }

      // Serviços: apenas visualizar (não pode criar/editar/excluir)
      if (resource === 'service') {
        if (action === 'read') return true
        return false
      }

      // Bloqueios e Afastamentos: apenas os próprios
      if (resource === 'block' || resource === 'time_off') {
        // Validação de professional_id feita acima
        return true
      }

      return false
    }

    // ============================================================================
    // CLIENTE (client)
    // ============================================================================
    if (role === 'client') {
      // Agendamentos: apenas os seus (client_id = seu ID)
      if (resource === 'appointment') {
        if (action === 'read' || action === 'create' || action === 'update' || action === 'delete') {
          // Validação completa feita no RLS
          return true
        }
        return false
      }

      // Perfil Pessoal: apenas o próprio
      if (resource === 'client' || resource === 'profile') {
        if (action === 'read' || action === 'update') {
          // Verificar se está acessando o próprio perfil
          if (resourceId && currentUser?.id && resourceId !== currentUser.id) return false
          return true
        }
        return false
      }

      // Histórico: apenas o próprio
      if (resource === 'history') {
        if (action === 'read') return true
        return false
      }

      // Informações Públicas: visualizar profissionais e serviços
      if (resource === 'professional' || resource === 'service') {
        if (action === 'read') return true
        return false
      }

      // Slots: pode ler para agendar
      if (resource === 'slot') {
        if (action === 'read') return true
        return false
      }

      return false
    }

    return false
  }

  const checkAvailability = (start: string, end: string, professionalId: string, excludeAppointmentId?: string) => {
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()
    if (endMs <= startMs) {
      console.warn('⚠️ checkAvailability - Horário inválido: fim antes do início')
      return false
    }

    // ============================================================================
    // A. RESTRIÇÃO DE TURNO (Hard Constraint) - Verificar workSchedule
    // ============================================================================
    const professional = professionals.find((p) => p.id === professionalId)
    if (professional && professional.workSchedule) {
      const workSchedule = professional.workSchedule
      const startDate = new Date(start)
      const endDate = new Date(end)
      
      // 1. Verificar se o dia da semana está nos days de trabalho
      const dayOfWeek = startDate.getDay() // 0 = Domingo, 6 = Sábado
      if (!workSchedule.days.includes(dayOfWeek)) {
        console.warn(`⚠️ checkAvailability - Dia ${dayOfWeek} não está no turno do profissional`)
        return false
      }
      
      // 2. Verificar se o horário está dentro do intervalo de trabalho (start - end)
      const [workStartHour, workStartMin] = workSchedule.start.split(':').map(Number)
      const [workEndHour, workEndMin] = workSchedule.end.split(':').map(Number)
      
      const workStartMs = new Date(startDate).setHours(workStartHour, workStartMin, 0, 0)
      const workEndMs = new Date(endDate).setHours(workEndHour, workEndMin, 0, 0)
      
      if (startMs < workStartMs || endMs > workEndMs) {
        console.warn(`⚠️ checkAvailability - Horário fora do turno (${workSchedule.start} - ${workSchedule.end})`)
        return false
      }
      
      // 3. Verificar se não se sobrepõe ao intervalo de almoço/break
      if (workSchedule.breakStart && workSchedule.breakEnd) {
        const [breakStartHour, breakStartMin] = workSchedule.breakStart.split(':').map(Number)
        const [breakEndHour, breakEndMin] = workSchedule.breakEnd.split(':').map(Number)
        
        const breakStartMs = new Date(startDate).setHours(breakStartHour, breakStartMin, 0, 0)
        const breakEndMs = new Date(endDate).setHours(breakEndHour, breakEndMin, 0, 0)
        
        // Verificar se o agendamento se sobrepõe ao intervalo
        if (startMs < breakEndMs && endMs > breakStartMs) {
          console.warn(`⚠️ checkAvailability - Horário se sobrepõe ao intervalo (${workSchedule.breakStart} - ${workSchedule.breakEnd})`)
          return false
        }
      }
    }

    // ============================================================================
    // B. RESTRIÇÃO DE CONFLITO (Double Booking)
    // ============================================================================
    const overlaps = (aStart: number, aEnd: number) =>
      Math.max(startMs, aStart) < Math.min(endMs, aEnd)

    // Verificar conflitos com agendamentos existentes
    // EXCEÇÃO: Ignorar agendamentos cancelados ou falta
    const hasAppt = appointments.some(
      (a) => {
        // Ignorar o próprio agendamento se estiver sendo editado
        if (excludeAppointmentId && a.id === excludeAppointmentId) return false
        
        // Ignorar agendamentos cancelados ou falta
        const cancelledStatuses = ['cancelado', 'cancelled', 'falta']
        if (cancelledStatuses.includes(a.status?.toLowerCase() || '')) return false
        
        return (
          a.professionalId === professionalId &&
          overlaps(new Date(a.start).getTime(), new Date(a.end).getTime())
        )
      }
    )
    
    // Verificar conflitos com blocos
    const hasBlock = blocks.some(
      (b) =>
        b.professionalId === professionalId &&
        overlaps(new Date(b.start).getTime(), new Date(b.end).getTime())
    )
    
    // Verificar conflitos com time offs
    const inTimeOff = timeOffs.some((t) => {
      const s = new Date(t.startDate).setHours(0, 0, 0, 0)
      const e = new Date(t.endDate).setHours(23, 59, 59, 999)
      return professionalId === t.professionalId && startMs <= e && endMs >= s
    })

    if (hasAppt) {
      console.warn('⚠️ checkAvailability - Conflito com agendamento existente')
      return false
    }
    if (hasBlock) {
      console.warn('⚠️ checkAvailability - Conflito com bloco existente')
      return false
    }
    if (inTimeOff) {
      console.warn('⚠️ checkAvailability - Conflito com período de folga')
      return false
    }

    return true
  }

  // Função auxiliar para mapear status do frontend (português) para backend (inglês)
  const mapStatusToBackend = (status?: string): 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'requested' => {
    if (!status) return 'pending'
    const statusMap: Record<string, 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'requested'> = {
      'agendado': 'pending',
      'pendente': 'pending',
      'confirmado': 'confirmed',
      'atendimento': 'in_progress',
      'concluído': 'completed',
      'concluido': 'completed',
      'cancelado': 'cancelled',
      'falta': 'cancelled',
      'pending': 'pending',
      'confirmed': 'confirmed',
      'in_progress': 'in_progress',
      'waiting': 'in_progress',
      'medical_done': 'completed',
      'completed': 'completed',
      'finalized': 'completed',
      'cancelled': 'cancelled',
      'requested': 'requested',
      'solicitado': 'requested',
    }
    return statusMap[status.toLowerCase()] || 'pending'
  }

  const addAppointment = async (data: Omit<SchedulerAppointment, 'id' | 'type'>) => {
    if (!canUser('create', 'appointment', data.professionalId)) {
      console.error('❌ addAppointment - Acesso negado:', { role: currentUser?.role, professionalId: data.professionalId })
      return { ok: false, error: 'Acesso negado' }
    }
    
    if (!currentUser?.clinicId) {
      console.error('❌ addAppointment - Sem clinicId:', { currentUser })
      return { ok: false, error: 'Clínica não definida' }
    }
    
    // SEM VALIDAÇÕES DE HORÁRIO - Pode agendar quando quiser
    
    // ============================================================================
    // CONSTRUÇÃO DO PAYLOAD - SEM VALIDAÇÕES RESTRITIVAS
    // ============================================================================
    
    // Usar o professionalId que vier, sem validações
    // Se não for um UUID válido, tentar salvar como NULL no banco
    const finalProfessionalId = data.professionalId || null
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isUuid = finalProfessionalId && typeof finalProfessionalId === 'string' && uuidRegex.test(finalProfessionalId)
    const professionalIdForDatabase = isUuid ? finalProfessionalId : null
    
    const payload: any = {
      clinic_id: currentUser.clinicId, // Campo necessário para o banco
      professional_id: professionalIdForDatabase, // Pode ser NULL ou UUID válido
      client_id: data.clientId || null, // Opcional
      service_id: (data as { serviceId?: string }).serviceId || null,
      start_time: data.start,
      end_time: data.end,
      status: mapStatusToBackend(data.status),
      notes: (data as any).notes || (data as any).procedure || null,
    }
    
    // Apenas verificar clinic_id (necessário para o banco)
    if (!payload.clinic_id) {
      console.error('❌ addAppointment - clinic_id é necessário')
      return { ok: false, error: 'Clínica não definida. Por favor, faça login novamente.' }
    }
    
    console.log('📤 addAppointment - Payload:', payload)
    console.log('📤 addAppointment - currentUser:', { role: currentUser?.role, clinicId: currentUser?.clinicId })
    console.log('📤 addAppointment - Mapeamento:', { 
      professionalId: data.professionalId, 
      finalProfessionalId: finalProfessionalId,
      professionalIdForDatabase: professionalIdForDatabase
    })
    
    try {
      const { data: inserted, error } = await supabase
        .from('appointments')
        .insert([payload])
        .select()
        .single()
      
      if (error) {
        console.error('❌ addAppointment - Erro do Supabase:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          payload
        })
        return { ok: false, error: error.message || 'Erro ao criar agendamento' }
      }
      
      if (inserted) {
        console.log('✅ addAppointment - Dados inseridos no banco:', inserted)
        
        // IMPORTANTE: Manter o professionalId original do frontend (ID da tabela professionals)
        // Este é o ID que o frontend usa para identificar o profissional
        // O profileId foi usado apenas para salvar no banco (foreign key)
        const finalProfessionalId = data.professionalId // Sempre usar o ID original do frontend
        
        // Mapear resposta do backend para formato do frontend
        const mappedAppointment: SchedulerAppointment = {
          id: inserted.id,
          type: 'appointment',
          professionalId: finalProfessionalId, // Usar o ID correto da tabela professionals
          clinicId: parseInt((inserted.clinic_id || '1').toString().slice(0, 8).replace(/-/g, ''), 16) || 1, // Converter UUID para número (compatibilidade)
          start: inserted.start_time,
          end: inserted.end_time,
          clientId: inserted.client_id || data.clientId,
          status: inserted.status as any,
          title: (data as { title?: string; procedure?: string }).title || (data as { title?: string; procedure?: string }).procedure || 'Procedimento',
          patient: (data as { patient?: string; clientQuery?: string }).patient || (data as { patient?: string; clientQuery?: string }).clientQuery || 'Paciente',
          procedure: (data as any).procedure || null,
          durationMinutes: (data as any).durationMinutes || 30,
          color: (data as any).color || 'bg-purple-200',
        }
        
        setAppointments((prev) => [...prev, mappedAppointment])
        console.log('✅ addAppointment - Agendamento criado com sucesso e adicionado ao estado:', mappedAppointment)
        console.log('📋 addAppointment - Total de agendamentos no estado:', [...appointments, mappedAppointment].length)
        
        // IMPORTANTE: Recarregar agendamentos do banco para garantir sincronização
        // Isso garante que mesmo se houver algum problema de cache ou RLS, os dados estarão atualizados
        try {
          const { data: reloadedAppts, error: reloadError } = await supabase
            .from('appointments')
            .select('*')
            .eq('clinic_id', currentUser.clinicId)
            .order('start_time', { ascending: true })
          
          if (!reloadError && reloadedAppts) {
            console.log('🔄 addAppointment - Recarregando agendamentos do banco:', reloadedAppts.length)
            
            // Criar mapa de profile_id -> professional_id (mesma lógica do carregamento inicial)
            const profileIds = [...new Set(reloadedAppts.map((apt: Record<string, unknown>) => apt.professional_id as string).filter(Boolean))]
            const profileToProfessionalMap = new Map<string, string>()
            
            if (profileIds.length > 0) {
              try {
                const { data: profiles } = await supabase
                  .from('profiles')
                  .select('id, full_name')
                  .in('id', profileIds)
                
                if (profiles) {
                  const { data: professionals } = await supabase
                    .from('professionals')
                    .select('id, name')
                    .eq('clinic_id', currentUser.clinicId)
                  
                  if (professionals) {
                    profiles.forEach((profile: any) => {
                      const matchingProf = professionals.find((prof: any) => 
                        prof.name && profile.full_name && 
                        (prof.name.toLowerCase().includes(profile.full_name.toLowerCase()) ||
                         profile.full_name.toLowerCase().includes(prof.name.toLowerCase()))
                      )
                      
                      if (matchingProf) {
                        profileToProfessionalMap.set(profile.id, matchingProf.id)
                      }
                    })
                    
                    if (professionals.length > 0) {
                      const firstProfId = professionals[0].id
                      profiles.forEach((profile: any) => {
                        if (!profileToProfessionalMap.has(profile.id)) {
                          profileToProfessionalMap.set(profile.id, firstProfId)
                        }
                      })
                    }
                  }
                }
              } catch (err) {
                console.warn('⚠️ Erro ao criar mapa no reload:', err)
              }
            }
            
            const reloadedMapped: SchedulerAppointment[] = reloadedAppts.map((apt: Record<string, unknown>) => {
              let professionalId = 'all'
              
              if (apt.professional_id) {
                professionalId = profileToProfessionalMap.get(apt.professional_id as string) || (apt.professional_id as string)
              }
              
              return {
                id: apt.id as string,
                type: 'appointment' as const,
                professionalId: professionalId,
                clinicId: parseInt(((apt.clinic_id as string) || '1').toString().slice(0, 8).replace(/-/g, ''), 16) || 1,
                start: apt.start_time as string,
                end: apt.end_time as string,
                clientId: (apt.client_id as string) || '',
                status: apt.status as SchedulerAppointment['status'],
                title: (apt.notes as string) || (apt.procedure as string) || 'Procedimento',
                patient: (apt.notes as string) || 'Paciente',
                procedure: (apt.notes as string) || undefined,
                durationMinutes: (apt.duration_minutes as number) || 30,
                color: 'bg-purple-200',
              }
            })
            
            setAppointments(reloadedMapped)
            console.log('✅ addAppointment - Agendamentos recarregados do banco:', reloadedMapped.length)
          } else if (reloadError) {
            console.warn('⚠️ addAppointment - Erro ao recarregar agendamentos:', reloadError.message)
            // Não falhar, pois já adicionamos ao estado local
          }
        } catch (reloadErr) {
          console.warn('⚠️ addAppointment - Erro ao recarregar agendamentos:', reloadErr)
          // Não falhar, pois já adicionamos ao estado local
        }
        
        return { ok: true as const }
      }
      
      return { ok: false, error: 'Nenhum dado retornado' }
    } catch (err) {
      console.error('❌ addAppointment - Erro inesperado:', err)
      return { ok: false, error: err instanceof Error ? err.message : 'Erro inesperado ao criar agendamento' }
    }
  }

  const addBlock = (data: Omit<SchedulerBlock, 'id' | 'type'>) => {
    if (!canUser('block', 'schedule', data.professionalId)) return { ok: false, error: 'Acesso negado' }
    const ok = checkAvailability(data.start, data.end, data.professionalId)
    if (!ok) return { ok: false, error: 'Horário indisponível' }
    const payload: any = {
      ...data,
      clinic_id: currentUser?.clinicId,
      professional_id: data.professionalId,
      start_time: data.start,
      end_time: data.end,
    }
    supabase.from('blocks').insert(payload).then(({ data: inserted }) => {
      if (inserted) setBlocks((prev: SchedulerBlock[]) => [...prev, ...(inserted as SchedulerBlock[])])
    })
    return { ok: true as const }
  }

  const addTimeOff = (data: Omit<SchedulerTimeOff, 'id' | 'type'>) => {
    if (!canUser('time_off', 'schedule', data.professionalId)) return { ok: false, error: 'Acesso negado' }
    const payload: any = {
      ...data,
      clinic_id: currentUser?.clinicId,
      professional_id: data.professionalId,
    }
    supabase.from('time_offs').insert(payload).then(({ data: inserted }) => {
      if (inserted) setTimeOffs((prev: SchedulerTimeOff[]) => [...prev, ...(inserted as SchedulerTimeOff[])])
    })
    return { ok: true as const }
  }

  const removeTimeOff = async (id: string) => {
    const { error } = await supabase.from('time_offs').delete().eq('id', id)
    if (error) throw error
    setTimeOffs((prev) => prev.filter((t) => t.id !== id))
  }

  const addClient = async (client: Omit<SchedulerClient, 'id'> & { id?: string }) => {
    // Permitir criação apenas para admin, clinic_owner e super_admin
    const allowedRoles = ['admin', 'clinic_owner', 'super_admin']
    if (!currentUser?.role || !allowedRoles.includes(currentUser.role)) {
      throw new Error('Permissão negada. Apenas administradores podem cadastrar clientes.')
    }
    
    // Super admin precisa ter clinicId para criar clientes em uma clínica específica
    if (currentUser.role === 'super_admin' && !currentUser.clinicId) {
      throw new Error('Super admin precisa estar associado a uma clínica para criar clientes.')
    }
    
    // Outros roles também precisam de clinicId
    if (currentUser.role !== 'super_admin' && !currentUser.clinicId) {
      throw new Error('Sem clínica definida')
    }
    
    // Mapear campos do frontend para backend
    // Tabela clients usa: clinic_id (NOT NULL), full_name (não name), phone (não mobile)
    // Baseado no insert_sample_data.sql, a tabela usa clinic_id
    const fullName = client.name || `${client.name || ''} ${client.lastName || ''}`.trim() || 'Cliente'
    
    if (!fullName || fullName.trim() === '') {
      throw new Error('Nome do cliente é obrigatório')
    }
    
    const payload: any = {
      clinic_id: currentUser.clinicId, // Tabela clients requer clinic_id (NOT NULL)
      full_name: fullName, // Frontend: name -> Backend: full_name
      phone: client.mobile || client.phone || null, // Frontend: mobile/phone -> Backend: phone
      email: client.email || null,
    }
    
    // ✅ clients usa apenas clinic_id (organization_id foi removida)
    
    // Adicionar birth_date se fornecido
    if (client.birthDate) {
      payload.birth_date = client.birthDate
    }
    
    console.log('📤 addClient - Payload enviado:', payload)
    const { data, error } = await supabase.from('clients').insert(payload).select('*').single()
    
    if (error) {
      console.error('❌ Erro ao criar cliente:', error)
      console.error('Payload que causou erro:', payload)
      throw error
    }
    
    console.log('✅ Cliente criado com sucesso:', data)
    
    // Mapear resposta do backend para frontend
    const mapped: SchedulerClient = {
      id: data.id,
      name: data.full_name || data.name || '', // Backend: full_name -> Frontend: name
      mobile: data.phone || data.mobile || '', // Backend: phone -> Frontend: mobile
      email: data.email,
      birthDate: data.birth_date || data.birthDate,
      walletBalance: data.wallet_balance || 0,
      clinicId: data.clinic_id,
      phone: data.phone,
    }
    
    setClients((prev: SchedulerClient[]) => [...prev, mapped])
    return mapped
  }

  const updateStatus = (
    id: string,
    status: 'confirmed' | 'pending' | 'cancelled' | 'completed' | 'confirmado' | 'pendente' | 'cancelado'
  ) => {
    supabase.from('appointments').update({ status }).eq('id', id).then(() => {
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status: status as SchedulerAppointment['status'] } : apt))
      )
    })
  }

  const updateAppointment = async (id: string, data: Partial<Omit<SchedulerAppointment, 'id' | 'type'>>) => {
    if (!canUser('update', 'appointment', data.professionalId)) {
      console.error('❌ updateAppointment - Acesso negado:', { role: currentUser?.role, professionalId: data.professionalId })
      return { ok: false, error: 'Acesso negado' }
    }
    
    if (!currentUser?.clinicId) {
      console.error('❌ updateAppointment - Sem clinicId:', { currentUser })
      return { ok: false, error: 'Clínica não definida' }
    }
    
    // Buscar agendamento atual
    const currentAppointment = appointments.find((a) => a.id === id)
    if (!currentAppointment) {
      return { ok: false, error: 'Agendamento não encontrado' }
    }
    
    // SEM VALIDAÇÕES DE HORÁRIO OU DISPONIBILIDADE
    
    // ============================================================================
    // CONSTRUÇÃO DO PAYLOAD - SEM VALIDAÇÕES RESTRITIVAS
    // ============================================================================
    
    // Preparar payload de atualização
    const payload: any = {}
    
    if (data.start) payload.start_time = data.start
    if (data.end) payload.end_time = data.end
    
    // Atualizar professional_id se fornecido (sem validações)
    if (data.professionalId !== undefined) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      const isUuid = data.professionalId && typeof data.professionalId === 'string' && uuidRegex.test(data.professionalId)
      // Se for UUID válido, salvar. Caso contrário, salvar como NULL
      payload.professional_id = isUuid ? data.professionalId : null
    }
    // Se data.professionalId não foi fornecido, não atualizar (manter o atual)
    
    if (data.clientId) payload.client_id = data.clientId
    if (data.status) payload.status = mapStatusToBackend(data.status)
    const dataWithExtras = data as { serviceId?: string; notes?: string; procedure?: string }
    if (dataWithExtras.serviceId !== undefined) payload.service_id = dataWithExtras.serviceId || null
    if (dataWithExtras.notes !== undefined) payload.notes = dataWithExtras.notes || dataWithExtras.procedure || null
    
    console.log('📤 updateAppointment - Payload:', payload)
    
    try {
      const { data: updated, error } = await supabase
        .from('appointments')
        .update(payload)
        .eq('id', id)
        .select()
        .single()
      
      if (error) {
        console.error('❌ updateAppointment - Erro do Supabase:', error)
        return { ok: false, error: error.message || 'Erro ao atualizar agendamento' }
      }
      
      if (updated) {
        // Atualizar estado local
        setAppointments((prev: SchedulerAppointment[]) =>
          prev.map((apt: SchedulerAppointment) =>
            apt.id === id
              ? {
                  ...apt,
                  ...data,
                  professionalId: data.professionalId || apt.professionalId,
                  start: data.start || apt.start,
                  end: data.end || apt.end,
                  status: data.status || apt.status,
                }
              : apt
          )
        )
        console.log('✅ updateAppointment - Agendamento atualizado com sucesso')
        return { ok: true as const }
      }
      
      return { ok: false, error: 'Nenhum dado retornado' }
    } catch (err) {
      console.error('❌ updateAppointment - Erro inesperado:', err)
      return { ok: false, error: err instanceof Error ? err.message : 'Erro inesperado ao atualizar agendamento' }
    }
  }

  const removeAppointment = async (id: string) => {
    // Verificar se o agendamento existe e obter professional_id
    const appointment = appointments.find((a) => a.id === id)
    const professionalId = appointment?.professionalId

    if (!canUser('delete', 'appointment', professionalId, id)) {
      console.error('❌ removeAppointment - Acesso negado:', { 
        role: currentUser?.role, 
        professionalId,
        appointmentId: id 
      })
      throw new Error('Acesso negado')
    }
    
    try {
      const { error } = await supabase.from('appointments').delete().eq('id', id)
      
      if (error) {
        console.error('❌ removeAppointment - Erro do Supabase:', error)
        throw new Error(error.message || 'Erro ao excluir agendamento')
      }
      
      setAppointments((prev) => prev.filter((a) => a.id !== id))
      console.log('✅ removeAppointment - Agendamento excluído com sucesso')
    } catch (err) {
      console.error('❌ removeAppointment - Erro:', err)
      throw err
    }
  }

  const removeBlock = (id: string) => {
    supabase.from('blocks').delete().eq('id', id).then(() => {
      setBlocks((prev: SchedulerBlock[]) => prev.filter((b: SchedulerBlock) => b.id !== id))
    })
  }

  const updateClient = async (client: SchedulerClient) => {
    // Validar permissão
    if (!canUser('update', 'client', undefined, client.id)) {
      console.error('❌ updateClient - Acesso negado:', { role: currentUser?.role, clientId: client.id })
      throw new Error('Permissão negada. Você não tem permissão para editar este cliente.')
    }

    const payload = { ...client, clinic_id: client.clinicId } as any
    const { error } = await supabase.from('clients').update(payload).eq('id', client.id)
    if (error) throw error
    setClients((prev) => prev.map((c) => (c.id === client.id ? { ...c, ...client } : c)))
  }

  const addCashback = (clientId: string, amount: number) => {
    setClients((prev: SchedulerClient[]) =>
      prev.map((c: SchedulerClient) => (c.id === clientId ? { ...c, walletBalance: (c.walletBalance || 0) + amount } : c))
    )
  }

  const useCashback = (clientId: string, amount: number) => {
    let ok: { ok: true } | { ok: false; error: string } = { ok: true }
    setClients((prev: SchedulerClient[]) =>
      prev.map((c: SchedulerClient) => {
        if (c.id !== clientId) return c
        const balance = c.walletBalance || 0
        if (balance < amount) {
          ok = { ok: false, error: 'Saldo insuficiente' }
          return c
        }
        return { ...c, walletBalance: balance - amount }
      })
    )
    return ok
  }

  const saveAnamnesis = (clientId: string, data: Anamnesis) => {
    if (!currentUser) return
    const meta = { updatedAt: new Date().toISOString(), updatedBy: `Profissional ${currentUser.professionalId ?? currentUser.id}` }
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, anamnesis: { ...data, ...meta } } : c)))
  }

  const addEvolution = (clientId: string, evolution: Evolution) => {
    setClients((prev: SchedulerClient[]) =>
      prev.map((c: SchedulerClient) => {
        if (c.id !== clientId) return c
        const evols = c.evolutions ?? []
        return { ...c, evolutions: [...evols, { ...evolution, id: evolution.id || String(Date.now()) }] }
      })
    )
  }

  const addDocument = (clientId: string, doc: MedicalDocument) => {
    setClients((prev: SchedulerClient[]) =>
      prev.map((c: SchedulerClient) => {
        if (c.id !== clientId) return c
        const docs = c.documents ?? []
        const item = { ...doc, id: doc.id || String(Date.now()), date: doc.date || new Date().toISOString() }
        return { ...c, documents: [...docs, item] }
      })
    )
  }

  const saveHealthTags = (clientId: string, tags: string[]) => {
    setClients((prev: SchedulerClient[]) => prev.map((c: SchedulerClient) => (c.id === clientId ? { ...c, healthTags: tags } : c)))
  }

  const saveForm = (clientId: string, form: MedicalForm) => {
    setClients((prev: SchedulerClient[]) =>
      prev.map((c: SchedulerClient) => {
        if (c.id !== clientId) return c
        const forms = c.forms ?? []
        const exists = forms.find((f: MedicalForm) => f.id === form.id)
        const updatedForm: MedicalForm = {
          ...form,
          id: form.id || String(Date.now()),
          date: form.date || new Date().toISOString(),
        }
        if (exists) {
          return { ...c, forms: forms.map((f) => (f.id === form.id ? updatedForm : f)) }
        }
        return { ...c, forms: [...forms, updatedForm] }
      })
    )
  }

  const addService = async (service: Omit<Service, 'id'>) => {
    // Validar permissão usando canUser
    if (!canUser('create', 'service')) {
      console.error('❌ addService - Acesso negado:', { role: currentUser?.role })
      throw new Error('Permissão negada. Apenas administradores podem cadastrar serviços.')
    }
    
    if (!currentUser) {
      throw new Error('Usuário não autenticado')
    }
    
    // Super admin precisa ter clinicId para criar serviços em uma clínica específica
    if (currentUser.role === 'super_admin' && !currentUser.clinicId) {
      throw new Error('Super admin precisa estar associado a uma clínica para criar serviços.')
    }
    
    // Outros roles também precisam de clinicId
    if (currentUser.role !== 'super_admin' && !currentUser.clinicId) {
      throw new Error('Sem clínica definida')
    }
    
    // Preparar payload: converter professionalIds para array de UUIDs
    // Mapear campos corretos: duration -> duration_minutes
    // NOTA: A tabela services não tem coluna 'category', então NÃO incluímos no payload (removido completamente)
    // NOTA: A tabela services requer clinic_id (NOT NULL) - organization_id foi removida
    const payload: any = {
      name: service.name,
      duration_minutes: service.duration, // Backend: duration_minutes (não duration!)
      price: service.price,
      tax_rate_percent: service.tax_rate_percent ?? null, // Taxa de imposto em porcentagem
      // category REMOVIDO COMPLETAMENTE - não existe na tabela services
      clinic_id: currentUser.clinicId, // ✅ Campo obrigatório (único identificador após remoção de organization_id)
      is_active: true, // Ativo por padrão
    }
    
    // Se professionalIds existe e não está vazio, usar ele; senão null
    if (service.professionalIds && service.professionalIds.length > 0) {
      payload.professional_ids = service.professionalIds
    } else {
      payload.professional_ids = null
    }
    
    // NOTA: Não incluímos professional_id (singular) no payload
    // A tabela usa professional_ids (plural) como array
    
    console.log('📤 addService - Payload enviado:', payload)
    const { data, error } = await supabase.from('services').insert(payload).select('*').single()
    if (error) {
      console.error('❌ Erro ao criar serviço:', error)
      console.error('Payload que causou erro:', payload)
      throw error
    }
    console.log('✅ Serviço criado com sucesso:', data)
    
    // Mapear resposta do banco para o formato esperado
    const mapped: Service = {
      id: data.id,
      name: data.name,
      duration: data.duration_minutes || data.duration, // Backend: duration_minutes -> Frontend: duration
      price: data.price,
      tax_rate_percent: data.tax_rate_percent ?? null, // Taxa de imposto em porcentagem
      // category não existe na tabela services - removido
      category: undefined, // Mantido como undefined para compatibilidade com interface
      professionalIds: data.professional_ids || null,
      professionalId: data.professional_id || 'all',
      idealFrequencyDays: data.ideal_frequency_days,
    }
    
    setServices((prev) => [...prev, mapped])
    return mapped
  }

  const updateService = async (service: Service) => {
    // Validar permissão
    if (!canUser('update', 'service', undefined, service.id)) {
      console.error('❌ updateService - Acesso negado:', { role: currentUser?.role, serviceId: service.id })
      throw new Error('Permissão negada. Apenas administradores podem editar serviços.')
    }

    const payload: any = {
      name: service.name,
      duration_minutes: service.duration, // Backend: duration_minutes (não duration!)
      price: service.price,
      tax_rate_percent: service.tax_rate_percent ?? null, // Taxa de imposto em porcentagem
      // category REMOVIDO COMPLETAMENTE - não existe na tabela services
    }
    
    // Atualizar professional_ids se fornecido
    if (service.professionalIds !== undefined) {
      payload.professional_ids = service.professionalIds && service.professionalIds.length > 0 
        ? service.professionalIds 
        : null
    }
    
    console.log('📤 updateService - Payload enviado:', payload)
    const { error } = await supabase.from('services').update(payload).eq('id', service.id)
    if (error) {
      console.error('❌ Erro ao atualizar serviço:', error)
      console.error('Payload que causou erro:', payload)
      throw error
    }
    console.log('✅ Serviço atualizado com sucesso')
    
    setServices((prev: Service[]) => prev.map((s: Service) => (s.id === service.id ? { ...s, ...service } : s)))
  }

  const removeService = async (id: string) => {
    // Validar permissão
    if (!canUser('delete', 'service', undefined, id)) {
      console.error('❌ removeService - Acesso negado:', { role: currentUser?.role, serviceId: id })
      throw new Error('Permissão negada. Apenas administradores podem excluir serviços.')
    }

    const { error } = await supabase.from('services').delete().eq('id', id)
    if (error) throw error
    setServices((prev: Service[]) => prev.filter((s: Service) => s.id !== id))
  }

  const addProfessional = async (p: Omit<SchedulerProfessional, 'id'> & { email?: string; password?: string }) => {
    if (!currentUser) {
      throw new Error('Usuário não autenticado')
    }

    console.log('🔍 addProfessional - Iniciando criação atômica...', {
      role: currentUser.role,
      clinicId: currentUser.clinicId,
      professionalName: p.name,
    })

    // Validar permissão usando canUser
    if (!canUser('create', 'professional')) {
      console.error('❌ addProfessional - Acesso negado:', { role: currentUser.role })
      throw new Error('Permissão negada. Apenas administradores podem cadastrar profissionais.')
    }

    // Determinar clinicId: usar do objeto profissional se fornecido, senão do currentUser
    const clinicId = (p as any).clinicId || currentUser.clinicId

    // Verificar clinicId (obrigatório para criar profissionais)
    if (!clinicId) {
      if (currentUser.role === 'super_admin') {
        throw new Error('Super admin: é necessário selecionar uma clínica ao criar o profissional.')
      }
      throw new Error('Sem clínica definida. É necessário estar associado a uma clínica para criar profissionais.')
    }

    let profileUserId: string | null = null
    let professionalData: any = null

    try {
      // ============================================================================
      // PASSO 1: Criar Profile de Login (OPCIONAL - se email/senha fornecidos)
      // ============================================================================
      if (p.email && p.password) {
        console.log('🔄 addProfessional - Criando usuário de autenticação...', { email: p.email })
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: p.email,
          password: p.password,
        })

        if (authError || !authData.user) {
          console.error('❌ addProfessional - Erro ao criar usuário:', authError)
          throw new Error(`Erro ao criar conta do profissional: ${authError?.message || 'Email já cadastrado ou senha inválida'}`)
        }

        profileUserId = authData.user.id
        console.log('✅ addProfessional - Usuário criado:', profileUserId)

        // Criar profile com link para professional (será atualizado após criar professional)
        const profilePayload: any = {
          id: profileUserId,
          full_name: p.name,
          role: 'professional',
          clinic_id: clinicId,
          // professional_id será atualizado no passo 2
        }
        
        // Adicionar campos de payout se fornecidos
        if ((p as any).payout_model) {
          profilePayload.payout_model = (p as any).payout_model
        }
        if ((p as any).payout_percentage !== undefined) {
          profilePayload.payout_percentage = (p as any).payout_percentage
        }
        if ((p as any).fixed_monthly_payout_cents !== undefined) {
          profilePayload.fixed_monthly_payout_cents = (p as any).fixed_monthly_payout_cents
        }
        
        // Adicionar CPF (obrigatório para criar conta Asaas)
        if ((p as any).cpf) {
          profilePayload.cpf = (p as any).cpf
        }
        // Adicionar WhatsApp
        if ((p as any).whatsapp) {
          profilePayload.phone = (p as any).whatsapp
        }
        
        // Usar função RPC segura para evitar recursão infinita nas políticas RLS
        const { error: profileError } = await supabase.rpc('insert_profile_safe', {
          p_id: profileUserId,
          p_full_name: profilePayload.full_name || '',
          p_clinic_id: profilePayload.clinic_id,
          p_role: profilePayload.role || 'professional',
          p_phone: (p as any).whatsapp || profilePayload.phone || null,
          p_avatar_url: profilePayload.avatar_url || null,
          p_professional_id: null, // Será atualizado depois quando criar o registro em professionals
          p_cpf: (p as any).cpf || null,
        })

        if (profileError) {
          console.error('❌ addProfessional - Erro ao criar profile:', profileError)
          // Tentar limpar usuário criado (opcional)
          throw new Error(`Erro ao criar perfil: ${profileError.message}`)
        }

        console.log('✅ addProfessional - Profile criado:', profileUserId)
      } else {
        console.log('ℹ️ addProfessional - Email/senha não fornecidos, profissional será criado sem login inicial')
      }

      // ============================================================================
      // PASSO 2: Criar Registro Operacional em professionals
      // ============================================================================
      const professionalPayload: any = {
        name: p.name,
        specialty: p.specialty,
        clinic_id: clinicId,
        color: p.color || '#6366f1',
        work_schedule: (p as any).work_schedule || null, // Jornada de trabalho por dia
        role: p.role || p.specialty,
        commission_model: (p as any).commissionModel || 'commissioned',
        commission_rate: (p as any).commissionRate || 0,
        rental_base_cents: (p as any).rentalBaseCents || 0,
        rental_due_day: (p as any).rentalDueDay || 5, // Dia de vencimento da cobrança fixa
      }

      // Mapear avatar
      if ((p as any).avatarUrl) {
        professionalPayload.avatar_url = (p as any).avatarUrl
      } else if (p.avatar) {
        professionalPayload.avatar_url = p.avatar
      }

      // Adicionar work_schedule se fornecido (pode vir como work_schedule ou workSchedule)
      if ((p as any).work_schedule) {
        professionalPayload.work_schedule = (p as any).work_schedule
      } else if (p.workSchedule) {
        professionalPayload.work_schedule = p.workSchedule
      }

      console.log('📤 addProfessional - Criando registro em professionals...')

      const { data: newProfessional, error: professionalError } = await supabase
        .from('professionals')
        .insert([professionalPayload])
        .select()
        .single()

      if (professionalError || !newProfessional) {
        console.error('❌ addProfessional - Erro ao criar professional:', professionalError)
        
        // Rollback: Se criamos profile, tentar limpar
        if (profileUserId) {
          console.warn('⚠️ addProfessional - Limpando profile criado devido a falha...')
          await supabase.from('profiles').delete().eq('id', profileUserId)
        }
        
        throw new Error(`Falha ao cadastrar profissional: ${professionalError?.message || 'Erro desconhecido'}`)
      }

      professionalData = newProfessional
      console.log('✅ addProfessional - Professional criado:', professionalData.id)

      // ============================================================================
      // PASSO 3: Linkar Profile com Professional (se profile foi criado)
      // ============================================================================
      if (profileUserId) {
        console.log('🔄 addProfessional - Linkando profile com professional...', {
          profileId: profileUserId,
          professionalId: professionalData.id,
        })

        // Atualizar profile com professional_id e campos de payout (se fornecidos)
        const profileUpdatePayload: any = {
          professional_id: professionalData.id,
        }
        
        // Adicionar campos de payout se fornecidos
        if ((p as any).payout_model) {
          profileUpdatePayload.payout_model = (p as any).payout_model
        }
        if ((p as any).payout_percentage !== undefined) {
          profileUpdatePayload.payout_percentage = (p as any).payout_percentage
        }
        if ((p as any).fixed_monthly_payout_cents !== undefined) {
          profileUpdatePayload.fixed_monthly_payout_cents = (p as any).fixed_monthly_payout_cents
        }
        
        // Adicionar campos KYC se fornecidos
        if ((p as any).cpf !== undefined) {
          profileUpdatePayload.cpf = (p as any).cpf
        }
        if ((p as any).bank_account_data !== undefined) {
          profileUpdatePayload.bank_account_data = (p as any).bank_account_data
        }
        
        const { error: linkError } = await supabase
          .from('profiles')
          .update(profileUpdatePayload)
          .eq('id', profileUserId)

        if (linkError) {
          console.error('❌ addProfessional - Erro ao linkar profile:', linkError)
          // Não lançar erro aqui - o professional já foi criado, podemos atualizar depois
          console.warn('⚠️ addProfessional - Profile criado mas não foi possível linkar. Pode ser atualizado manualmente.')
        } else {
          console.log('✅ addProfessional - Profile linkado com professional com sucesso')
        }
      }

      // ============================================================================
      // PASSO 4: Criar Conta Asaas Automaticamente (apenas com CPF e Nome)
      // ============================================================================
      if ((p as any).cpf && profileUserId) {
        try {
          console.log('🔄 addProfessional - Criando conta Asaas para profissional...', {
            professionalId: professionalData.id,
            profileId: profileUserId,
            cpf: (p as any).cpf
          })

          // Chamar Edge Function para criar subaccount no Asaas
          // Nota: Dados bancários serão coletados depois pelo profissional quando precisar sacar
          const { data: asaasData, error: asaasError } = await supabase.functions.invoke('create-asaas-subaccount', {
            body: {
              type: 'professional',
              clinic_id: clinicId,
              professional_id: profileUserId,
              cpf: (p as any).cpf,
              // Dados bancários mínimos - o profissional completa depois
              bank_account_data: {
                bank_code: '001', // Placeholder
                agency: '0000',
                account: '00000',
                account_digit: '0',
                account_type: 'CHECKING',
                holder_name: p.name,
                holder_document: (p as any).cpf,
              },
            },
          })

          if (asaasError) {
            console.warn('⚠️ addProfessional - Erro ao criar conta Asaas (não bloqueia cadastro):', asaasError)
            // Não bloquear o cadastro se falhar criar conta Asaas
            // O profissional pode criar depois quando precisar
          } else if (asaasData?.walletId) {
            console.log('✅ addProfessional - Conta Asaas criada:', asaasData.walletId)
            // Atualizar profile com wallet_id
            await supabase
              .from('profiles')
              .update({ asaas_wallet_id: asaasData.walletId })
              .eq('id', profileUserId)
          }
        } catch (asaasErr) {
          console.warn('⚠️ addProfessional - Erro ao criar conta Asaas (não bloqueia cadastro):', asaasErr)
          // Não bloquear o cadastro
        }
      } else {
        console.log('ℹ️ addProfessional - CPF não fornecido ou profile não criado, conta Asaas será criada depois')
      }

      // ============================================================================
      // PASSO 5: Mapear e Retornar
      // ============================================================================
      const mapped: SchedulerProfessional = {
        id: professionalData.id,
        name: professionalData.name,
        specialty: professionalData.specialty,
        avatar: professionalData.avatar_url || '',
        color: professionalData.color,
        role: professionalData.role || professionalData.specialty,
        commissionRate: professionalData.commission_rate || 0,
        commissionModel: (professionalData.commission_model as 'commissioned' | 'rental' | 'hybrid') || 'commissioned',
        rentalBaseCents: professionalData.rental_base_cents || 0,
        rentalDueDay: professionalData.rental_due_day || 5,
        avatarUrl: professionalData.avatar_url,
        workSchedule: professionalData.work_schedule || undefined,
      }

      setProfessionals((prev: SchedulerProfessional[]) => [...prev, mapped])
      console.log('✅ addProfessional - Profissional criado atomicamente com sucesso!', {
        professionalId: professionalData.id,
        profileId: profileUserId || 'não criado (sem email/senha)',
      })

      // Se for super_admin e usou um clinicId diferente do atual, atualizar currentUser.clinicId
      if (currentUser?.role === 'super_admin' && clinicId && currentUser.clinicId !== clinicId) {
        const updatedUser = {
          ...currentUser,
          clinicId: clinicId,
        }
        setCurrentUser(updatedUser)
        localStorage.setItem('clinicflow_user', JSON.stringify(updatedUser))
      }

      return mapped
    } catch (error: any) {
      console.error('❌ addProfessional - Erro na criação atômica:', error)
      
      // Rollback adicional se necessário
      if (professionalData?.id) {
        console.warn('⚠️ addProfessional - Tentando limpar professional criado...')
        await supabase.from('professionals').delete().eq('id', professionalData.id)
      }
      
      throw error
    }
  }

  const updateProfessional = async (p: SchedulerProfessional) => {
    // Validar permissão
    if (!canUser('update', 'professional', undefined, p.id)) {
      console.error('❌ updateProfessional - Acesso negado:', { 
        role: currentUser?.role, 
        professionalId: p.id 
      })
      throw new Error('Permissão negada. Você não tem permissão para editar este profissional.')
    }

    // Mapear campos do frontend para backend (usar nomes unificados: commission_rate, role)
    const payload: any = {
      name: p.name, // Backend: name
      specialty: p.specialty, // Backend: specialty
      color: p.color, // Backend: color
      role: p.role || p.specialty, // Backend: role (nome unificado, não mais cargo)
      commission_model: (p as any).commissionModel || 'commissioned',
      commission_rate: (p as any).commissionRate || 0, // Backend: commission_rate (nome unificado, não mais taxa_de_comissao)
      rental_base_cents: (p as any).rentalBaseCents || 0,
      rental_due_day: (p as any).rentalDueDay || 5,
      work_schedule: (p as any).work_schedule || null, // Jornada de trabalho por dia
    }
    
    // Atualizar avatar
    if ((p as any).avatarUrl) {
      payload.avatar_url = (p as any).avatarUrl // Backend: avatar_url
    } else if (p.avatar) {
      payload.avatar_url = p.avatar
    }
    
    // Atualizar work_schedule se fornecido
    if (p.workSchedule !== undefined) {
      payload.work_schedule = p.workSchedule || null
    }
    
    const { error } = await supabase.from('professionals').update(payload).eq('id', p.id)
    if (error) {
      console.error('Erro ao atualizar profissional:', error)
      console.error('Payload enviado:', payload)
      throw error
    }
    
    // Atualizar campos de payout e KYC na tabela profiles (se o profissional tiver um profile vinculado)
    if ((p as any).payout_model || (p as any).payout_percentage !== undefined || (p as any).fixed_monthly_payout_cents !== undefined ||
        (p as any).cpf !== undefined || (p as any).bank_account_data !== undefined) {
      // Buscar profile_id vinculado ao professional
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id')
        .eq('professional_id', p.id)
        .maybeSingle()
      
      if (profileData?.id) {
        const profilePayload: any = {}
        if ((p as any).payout_model !== undefined) {
          profilePayload.payout_model = (p as any).payout_model
        }
        if ((p as any).payout_percentage !== undefined) {
          profilePayload.payout_percentage = (p as any).payout_percentage
        }
        if ((p as any).fixed_monthly_payout_cents !== undefined) {
          profilePayload.fixed_monthly_payout_cents = (p as any).fixed_monthly_payout_cents
        }
        
        // Adicionar campos KYC se fornecidos
        if ((p as any).cpf !== undefined) {
          profilePayload.cpf = (p as any).cpf
        }
        if ((p as any).bank_account_data !== undefined) {
          profilePayload.bank_account_data = (p as any).bank_account_data
        }
        
        if (Object.keys(profilePayload).length > 0) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update(profilePayload)
            .eq('id', profileData.id)
          
          if (profileError) {
            console.warn('Aviso ao atualizar payout/KYC no profile:', profileError)
            // Não lançar erro - payout/KYC são opcionais
          }
        }
      }
    }
    
    setProfessionals((prev: SchedulerProfessional[]) => prev.map((prof: SchedulerProfessional) => (prof.id === p.id ? { ...prof, ...p } : prof)))
  }

  const removeProfessional = async (id: string) => {
    // Validar permissão
    if (!canUser('delete', 'professional', undefined, id)) {
      console.error('❌ removeProfessional - Acesso negado:', { role: currentUser?.role, professionalId: id })
      throw new Error('Permissão negada. Apenas administradores podem excluir profissionais.')
    }

    const { error } = await supabase.from('professionals').delete().eq('id', id)
    if (error) throw error
    setProfessionals((prev: SchedulerProfessional[]) => prev.filter((p: SchedulerProfessional) => p.id !== id))
  }

  const updateClinicSettings = (data: Partial<ClinicSettings>) => {
    setClinicSettings((prev) => ({ ...prev, ...data }))
  }

  const updatePricingSettings = (data: Partial<PricingSettings>) => {
    setPricingSettings((prev) => ({ ...prev, ...data }))
  }

  const updateClinic = async (data: { name?: string; phone?: string }) => {
    // Super admin pode não ter clinicId, mas precisa passar clinicId no objeto
    const clinicId = (data as { clinicId?: string }).clinicId || currentUser?.clinicId
    
    if (!clinicId) {
      throw new Error('Sem clínica definida. É necessário estar associado a uma clínica.')
    }
    
    const payload: any = {}
    if (data.name !== undefined) payload.name = data.name
    if (data.phone !== undefined) payload.phone = data.phone
    
    if (Object.keys(payload).length === 0) return
    
    console.log('📤 updateClinic - Payload:', payload, 'clinicId:', clinicId)
    
    // Tentar atualizar em 'organizations' primeiro (tabela principal), se falhar tentar 'clinics'
    let error = null
    let result = await supabase.from('organizations').update(payload).eq('id', clinicId)
    
    if (result.error) {
      console.warn('⚠️ Erro ao atualizar em organizations, tentando clinics:', result.error.message)
      // Tentar em clinics
      result = await supabase.from('clinics').update(payload).eq('id', clinicId)
      error = result.error
    } else {
      error = result.error
    }
    
    if (error) {
      console.error('❌ Erro ao atualizar clínica:', error)
      console.error('Payload:', payload)
      console.error('clinicId:', clinicId)
      throw error
    }
    
    console.log('✅ Clínica atualizada com sucesso')
    
    // Atualizar clinicSettings local também
  }

  const provisionNewClinic = async (
    adminData: { full_name: string; email: string; password: string; useExisting?: boolean; existingAdminId?: string },
    clinicData: { name: string; phone?: string }
  ): Promise<{ ok: true; clinicId: string; adminId: string } | { ok: false; error: string }> => {
    // Validação: apenas super_admin pode provisionar clínicas
    if (currentUser?.role !== 'super_admin') {
      console.error('❌ provisionNewClinic - Acesso negado: apenas super_admin pode provisionar clínicas')
      return { ok: false, error: 'Acesso negado. Apenas super_admin pode provisionar clínicas.' }
    }

    try {
      let adminUserId: string
      let createdAuthUser: { id: string } | null = null // Rastrear usuário criado para cleanup

      // ============================================================================
      // PASSO 1: Criar ou vincular Administrador
      // ============================================================================
      if (adminData.useExisting && adminData.existingAdminId) {
        // Usar administrador existente
        adminUserId = adminData.existingAdminId
        console.log('✅ provisionNewClinic - Usando administrador existente:', adminUserId)
        
        // Verificar se o profile existe
        const { data: existingProfile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', adminUserId)
          .maybeSingle()
        
        if (profileError || !existingProfile) {
          console.error('❌ provisionNewClinic - Profile do administrador não encontrado:', profileError)
          return { ok: false, error: 'Administrador selecionado não encontrado. Por favor, selecione outro.' }
        }
      } else {
        // Criar novo administrador via auth.signUp
        console.log('🔄 provisionNewClinic - Criando novo administrador...', { email: adminData.email })
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: adminData.email,
          password: adminData.password,
        })

        if (authError || !authData.user) {
          console.error('❌ provisionNewClinic - Erro ao criar usuário:', authError)
          
          // Tratamento específico para rate limiting
          if (authError?.status === 429 || authError?.message?.includes('48 seconds')) {
            return { 
              ok: false, 
              error: 'Muitas tentativas de cadastro. Por favor, aguarde 1 minuto antes de tentar novamente. (Rate limit: 48 segundos)' 
            }
          }
          
          // Tratamento para email já cadastrado
          if (authError?.message?.includes('already registered') || authError?.message?.includes('already exists')) {
            return { 
              ok: false, 
              error: 'Este email já está cadastrado. Se você já tem uma conta, use a opção "Usar administrador existente".' 
            }
          }
          
          return { 
            ok: false, 
            error: authError?.message || 'Erro ao criar conta do administrador. Verifique se o email já não está cadastrado.' 
          }
        }

        adminUserId = authData.user.id
        createdAuthUser = { id: adminUserId } // Salvar para possível cleanup
        console.log('✅ provisionNewClinic - Usuário criado com sucesso:', adminUserId)
      }

      // ============================================================================
      // PASSO 2: Criar a Clínica (Organization)
      // ============================================================================
      console.log('🔄 provisionNewClinic - Criando organização...', clinicData)
      
      const { data: newOrganization, error: orgError } = await supabase
        .from('organizations')
        .insert([
          {
            name: clinicData.name,
            phone: clinicData.phone || null,
          },
        ])
        .select()
        .single()

      if (orgError || !newOrganization) {
        console.error('❌ provisionNewClinic - Erro ao criar organização:', orgError)
        console.error('❌ Detalhes do erro:', {
          message: orgError?.message,
          code: orgError?.code,
          details: orgError?.details,
          hint: orgError?.hint,
        })
        
        // Verificar JWT do usuário atual para debug
        const { data: { user: authUser } } = await supabase.auth.getUser()
        const { data: currentProfile } = await supabase
          .from('profiles')
          .select('id, role, clinic_id')
          .eq('id', authUser?.id || '')
          .maybeSingle()
        
        console.error('🔍 DEBUG - Usuário atual:', {
          userId: authUser?.id,
          email: authUser?.email,
          profileRole: currentProfile?.role,
          currentUserRole: currentUser?.role,
        })
        
        // Tratamento específico para erro de RLS (403)
        if (orgError?.code === '42501' || orgError?.code === 'PGRST301' || orgError?.message?.includes('row-level security') || orgError?.message?.includes('permission denied')) {
          const isSuperAdmin = currentProfile?.role === 'super_admin'
          
          const errorMsg = `Erro de permissão RLS ao criar organização.

🔍 DIAGNÓSTICO:
- Código do erro: ${orgError?.code || 'N/A'}
- Usuário atual: ${authUser?.email || 'N/A'}
- User ID: ${authUser?.id || 'N/A'}
- Role no profile: ${currentProfile?.role || 'NÃO ENCONTRADO'}
- É super_admin? ${isSuperAdmin ? '✅ SIM' : '❌ NÃO'}

💡 SOLUÇÕES:
1. Execute o SQL corrigido: CORRIGIR_POLITICA_RLS_USAR_PROFILES.sql no Supabase
2. Verifique se seu profile tem role = 'super_admin' executando:
   SELECT id, email, role FROM profiles WHERE id = '${authUser?.id}';
3. Se o role não for 'super_admin', atualize:
   UPDATE profiles SET role = 'super_admin' WHERE id = '${authUser?.id}';`
          
          return { 
            ok: false, 
            error: errorMsg
          }
        }
        
        // Se falhou e criamos um usuário novo, tentar limpar (opcional)
        if (createdAuthUser) {
          console.warn('⚠️ provisionNewClinic - Organização não criada, mas usuário foi criado. Tentando limpar...')
          // Nota: Não podemos deletar via client-side (precisa de admin API key)
          // O usuário pode precisar ser removido manualmente se necessário
          console.warn('⚠️ Usuário criado que precisa ser removido manualmente:', createdAuthUser.id)
        }
        
        // Mensagem de erro mais detalhada
        const detailedError = `Erro ao criar organização.

Código: ${orgError?.code || 'N/A'}
Mensagem: ${orgError?.message || 'N/A'}

🔍 DIAGNÓSTICO:
- User ID: ${authUser?.id || 'N/A'}
- Email: ${authUser?.email || 'N/A'}
- Role no profile: ${currentProfile?.role || 'NÃO ENCONTRADO'}
- É super_admin? ${currentProfile?.role === 'super_admin' ? '✅ SIM' : '❌ NÃO'}

💡 AÇÕES:
1. Execute: SOLUCAO_DEFINITIVA_RLS.sql no Supabase
2. Verifique: SELECT * FROM pg_policies WHERE tablename = 'organizations';
3. Se necessário, atualize role: UPDATE profiles SET role = 'super_admin' WHERE id = '${authUser?.id}';`
        
        return { 
          ok: false, 
          error: detailedError
        }
      }

      const clinicId = newOrganization.id
      console.log('✅ provisionNewClinic - Organização criada com sucesso:', clinicId)

      // ============================================================================
      // PASSO 3: Criar Profile do Admin vinculado à clínica
      // ============================================================================
      if (!adminData.useExisting) {
        // Só criar profile se criamos um novo usuário
        console.log('🔄 provisionNewClinic - PASSO 3: Criando profile do administrador...', {
          userId: adminUserId,
          full_name: adminData.full_name,
          clinicId,
          clinicName: clinicData.name,
        })

        // Verificar se o profile já existe (pode ter sido criado automaticamente pelo Supabase)
        console.log('🔍 provisionNewClinic - Verificando se profile já existe...')
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id, clinic_id, role, full_name')
          .eq('id', adminUserId)
          .maybeSingle()

        console.log('🔍 provisionNewClinic - Resultado da verificação:', {
          existingProfile,
          checkError,
          hasError: !!checkError,
          errorCode: checkError?.code,
        })

        // Se houver erro na verificação (exceto "não encontrado"), reportar
        if (checkError && checkError.code !== 'PGRST116') {
          console.error('❌ provisionNewClinic - Erro ao verificar profile:', checkError)
        }

        let profileCreated = false
        let profileError = null

        if (existingProfile) {
          // Profile já existe, atualizar
          console.log('🔄 provisionNewClinic - Profile já existe, atualizando...', existingProfile)
          
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({
              full_name: adminData.full_name,
              role: 'admin',
              clinic_id: clinicId,
            })
            .eq('id', adminUserId)
            .select()
            .single()

          profileError = updateError
          if (updateError) {
            console.error('❌ provisionNewClinic - Erro ao atualizar profile:', {
              error: updateError,
              code: updateError.code,
              message: updateError.message,
              details: updateError.details,
              hint: updateError.hint,
            })
          } else {
            console.log('✅ provisionNewClinic - Profile atualizado com sucesso:', updatedProfile)
            profileCreated = true
          }
        } else {
          // Profile não existe, criar novo
          console.log('🆕 provisionNewClinic - Criando novo profile...', {
            id: adminUserId,
            full_name: adminData.full_name,
            role: 'admin',
            clinic_id: clinicId,
          })

          const { data: insertedProfile, error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: adminUserId, // FK para auth.users.id
                full_name: adminData.full_name,
                role: 'admin',
                clinic_id: clinicId, // ✅ Único identificador (organization_id removida)
              },
            ])
            .select()
            .single()

          profileError = insertError
          if (insertError) {
            console.error('❌ provisionNewClinic - Erro ao criar profile:', {
              error: insertError,
              code: insertError.code,
              message: insertError.message,
              details: insertError.details,
              hint: insertError.hint,
            })
          } else {
            console.log('✅ provisionNewClinic - Profile criado com sucesso:', insertedProfile)
            profileCreated = true
          }
        }

        // Verificar se o profile foi realmente criado/atualizado
        if (profileCreated) {
          console.log('🔍 provisionNewClinic - Verificando se profile foi salvo corretamente...')
          const { data: verifyProfile, error: verifyError } = await supabase
            .from('profiles')
            .select('id, full_name, role, clinic_id')
            .eq('id', adminUserId)
            .maybeSingle()

          if (verifyError) {
            console.error('❌ provisionNewClinic - Erro ao verificar profile criado:', verifyError)
            profileCreated = false
            profileError = verifyError
          } else if (!verifyProfile) {
            console.error('❌ provisionNewClinic - Profile não foi encontrado após criação!')
            profileCreated = false
            profileError = { code: 'PROFILE_NOT_FOUND', message: 'Profile não foi encontrado após tentativa de criação' }
          } else {
            console.log('✅ provisionNewClinic - Profile verificado com sucesso:', verifyProfile)
          }
        }

        // Se houve erro, tentar limpar e retornar erro detalhado
        if (!profileCreated || profileError) {
          console.error('❌ provisionNewClinic - Falha ao criar/atualizar profile')
          
          let detailedError = profileError?.message || 'Erro ao criar/atualizar perfil do administrador.'
          
          if (profileError?.code === '42501') {
            detailedError = `Erro de permissão RLS na tabela profiles: ${profileError.message}

🔍 DIAGNÓSTICO:
- Código: ${profileError.code}
- Mensagem: ${profileError.message}
- Detalhes: ${profileError.details || 'N/A'}
- Dica: ${profileError.hint || 'N/A'}

💡 SOLUÇÃO:
Execute o script SQL: rls_complete_access_control.sql no Supabase
Isso permite que super_admin crie profiles para outros usuários.`
          } else if (profileError?.code === '23505') {
            detailedError = `Já existe um perfil para este usuário: ${profileError.message}`
          } else if (profileError?.code === '23503') {
            detailedError = `Erro de chave estrangeira: ${profileError.message}. Verifique se a clínica existe.`
          } else {
            detailedError += `\n\nCódigo: ${profileError?.code || 'N/A'}\nDetalhes: ${profileError?.details || 'N/A'}`
          }
          
          // Tentar limpar: deletar organização criada
          console.warn('⚠️ provisionNewClinic - Tentando limpar organização criada...')
          await supabase.from('organizations').delete().eq('id', clinicId)
          
          return { ok: false, error: detailedError }
        }

        console.log('✅ provisionNewClinic - Profile do administrador criado/atualizado com sucesso')
      } else {
        // Se está usando admin existente, atualizar o profile para vincular à nova clínica
        console.log('🔄 provisionNewClinic - Atualizando profile existente para vincular à nova clínica...')
        
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            clinic_id: clinicId, // ✅ Único identificador (organization_id removida)
            role: 'admin', // Garantir que é admin
          })
          .eq('id', adminUserId)

        if (updateError) {
          console.error('❌ provisionNewClinic - Erro ao atualizar profile:', updateError)
          
          // Mensagem de erro mais detalhada para RLS
          let detailedError = updateError.message || 'Erro ao vincular administrador à clínica.'
          
          if (updateError.code === '42501') {
            detailedError = `Erro de permissão RLS na tabela profiles (UPDATE): ${updateError.message}

💡 SOLUÇÃO:
Execute o script SQL: FIX_PROFILES_INSERT_SUPER_ADMIN.sql
para permitir que super_admin atualize profiles de outros usuários.`
          }
          
          // Tentar limpar: deletar organização criada
          await supabase.from('organizations').delete().eq('id', clinicId)
          
          return { ok: false, error: detailedError }
        }

        console.log('✅ provisionNewClinic - Profile atualizado com sucesso')
      }

      console.log('✅ provisionNewClinic - Clínica provisionada com sucesso!', {
        clinicId,
        adminId: adminUserId,
        clinicName: clinicData.name,
      })

      return { ok: true, clinicId, adminId: adminUserId }
    } catch (error: any) {
      console.error('❌ provisionNewClinic - Erro inesperado:', error)
      return { ok: false, error: error.message || 'Erro inesperado ao provisionar clínica. Tente novamente.' }
    }
  }

  // Adicionar administrador a uma clínica existente
  const addAdminToClinic = async (
    clinicId: string,
    adminData: { full_name: string; email: string; password: string }
  ): Promise<{ ok: true; adminId: string } | { ok: false; error: string }> => {
    try {
      console.log('🔄 addAdminToClinic - Criando administrador para clínica:', clinicId)

      // Verificar se a clínica existe
      const { data: clinicExists, error: clinicError } = await supabase
        .from('organizations')
        .select('id')
        .eq('id', clinicId)
        .maybeSingle()

      if (clinicError || !clinicExists) {
        return { ok: false, error: 'Clínica não encontrada.' }
      }

      // Verificar se já existe admin para esta clínica
      const { data: existingAdmin } = await supabase
        .from('profiles')
        .select('id')
        .eq('clinic_id', clinicId)
        .eq('role', 'admin')
        .maybeSingle()

      if (existingAdmin) {
        return { ok: false, error: 'Esta clínica já possui um administrador. Desvincule o administrador atual antes de adicionar um novo.' }
      }

      // Criar novo usuário via auth.signUp
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminData.email,
        password: adminData.password,
      })

      if (authError || !authData.user) {
        console.error('❌ addAdminToClinic - Erro ao criar usuário:', authError)
        
        if (authError?.status === 429 || authError?.message?.includes('48 seconds')) {
          return { 
            ok: false, 
            error: 'Muitas tentativas de cadastro. Por favor, aguarde 1 minuto antes de tentar novamente.' 
          }
        }
        
        if (authError?.message?.includes('already registered') || authError?.message?.includes('already exists')) {
          return { 
            ok: false, 
            error: 'Este email já está cadastrado.' 
          }
        }
        
        return { 
          ok: false, 
          error: authError?.message || 'Erro ao criar conta do administrador.' 
        }
      }

      const adminUserId = authData.user.id
      console.log('✅ addAdminToClinic - Usuário criado:', adminUserId)

      // Verificar se o profile já existe (pode ter sido criado automaticamente ou em tentativa anterior)
      console.log('🔍 addAdminToClinic - Verificando se profile existe para:', adminUserId)
      
      const { data: existingProfile, error: checkError } = await supabase
        .from('profiles')
        .select('id, clinic_id, role, full_name')
        .eq('id', adminUserId)
        .maybeSingle()

      console.log('🔍 addAdminToClinic - Resultado da verificação:', { 
        existingProfile, 
        checkError,
        hasError: !!checkError,
        errorCode: checkError?.code,
        errorMessage: checkError?.message
      })

      // Se houver erro na verificação e não for "não encontrado", pode ser problema de RLS
      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ addAdminToClinic - Erro ao verificar profile existente:', checkError)
        return {
          ok: false,
          error: `Erro ao verificar perfil: ${checkError.message || 'Erro de permissão RLS. Verifique as políticas de acesso.'}`
        }
      }

      let profileError = null
      let operation = ''
      
      if (existingProfile) {
        // Profile já existe, atualizar
        operation = 'atualizar'
        console.log('🔄 addAdminToClinic - Profile já existe, atualizando...', existingProfile)
        
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            full_name: adminData.full_name,
            role: 'admin',
            clinic_id: clinicId,
          })
          .eq('id', adminUserId)
          .select()
          .single()

        profileError = updateError
        if (updateError) {
          console.error('❌ addAdminToClinic - Erro ao atualizar profile:', {
            error: updateError,
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint
          })
        } else {
          console.log('✅ addAdminToClinic - Profile atualizado com sucesso:', updatedProfile)
        }
      } else {
        // Profile não existe, criar novo
        operation = 'criar'
        console.log('🆕 addAdminToClinic - Criando novo profile...', {
          id: adminUserId,
          full_name: adminData.full_name,
          role: 'admin',
          clinic_id: clinicId
        })
        
        const { data: insertedProfile, error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: adminUserId,
              full_name: adminData.full_name,
              role: 'admin',
              clinic_id: clinicId,
            },
          ])
          .select()
          .single()

        profileError = insertError
        if (insertError) {
          console.error('❌ addAdminToClinic - Erro ao criar profile:', {
            error: insertError,
            code: insertError.code,
            message: insertError.message,
            details: insertError.details,
            hint: insertError.hint
          })
        } else {
          console.log('✅ addAdminToClinic - Profile criado com sucesso:', insertedProfile)
        }
      }

      if (profileError) {
        // Não tentar deletar usuário via admin API (requer permissões especiais)
        // O usuário permanecerá no sistema, mas sem profile vinculado
        console.error('❌ addAdminToClinic - Falha ao ' + operation + ' profile. ID do usuário:', adminUserId)
        console.error('❌ addAdminToClinic - Detalhes do erro:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint
        })
        
        let errorMessage = `Erro ao ${operation} perfil do administrador: ${profileError.message || 'Erro desconhecido'}`
        
        if (profileError.code === '42501') {
          errorMessage = `Erro de permissão RLS ao ${operation} profile. Verifique se você tem permissão para criar/atualizar administradores.\n\n` +
            `Código: ${profileError.code}\n` +
            `Mensagem: ${profileError.message}\n` +
            `Dica: ${profileError.hint || 'Execute o script rls_complete_access_control.sql no Supabase'}`
        } else if (profileError.code === '23505') {
          errorMessage = 'Já existe um perfil para este usuário. Por favor, tente novamente ou entre em contato com o suporte.'
        } else if (profileError.code === '23503') {
          errorMessage = `Erro de chave estrangeira: ${profileError.message}. Verifique se a clínica existe.`
        } else {
          errorMessage += `\n\nCódigo: ${profileError.code || 'N/A'}\nDetalhes: ${profileError.details || 'N/A'}`
        }
        
        return { 
          ok: false, 
          error: errorMessage
        }
      }

      console.log('✅ addAdminToClinic - Administrador criado e vinculado com sucesso')
      return { ok: true, adminId: adminUserId }
    } catch (error: any) {
      console.error('❌ addAdminToClinic - Erro inesperado:', error)
      return { ok: false, error: error.message || 'Erro inesperado ao adicionar administrador.' }
    }
  }

  // Excluir ou desativar clínica
  const deleteClinic = async (
    clinicId: string,
    deactivateOnly: boolean = true
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      console.log('🔄 deleteClinic - Processando clínica:', clinicId, deactivateOnly ? '(desativar)' : '(excluir)')

      if (deactivateOnly) {
        // Apenas desativar (soft delete) - atualizar status
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ status: 'inactive' })
          .eq('id', clinicId)

        if (updateError) {
          console.error('❌ deleteClinic - Erro ao desativar clínica:', updateError)
          return { 
            ok: false, 
            error: updateError.code === '42501' 
              ? 'Erro de permissão RLS. Verifique se você tem permissão para desativar clínicas.'
              : updateError.message || 'Erro ao desativar clínica.'
          }
        }

        console.log('✅ deleteClinic - Clínica desativada com sucesso')
        return { ok: true }
      } else {
        // Hard delete - excluir completamente
        // Primeiro, desvincular profissionais e serviços (se houver cascade, não precisa)
        // Depois, excluir a organização
        
        const { error: deleteError } = await supabase
          .from('organizations')
          .delete()
          .eq('id', clinicId)

        if (deleteError) {
          console.error('❌ deleteClinic - Erro ao excluir clínica:', deleteError)
          return { 
            ok: false, 
            error: deleteError.code === '42501' 
              ? 'Erro de permissão RLS. Verifique se você tem permissão para excluir clínicas.'
              : deleteError.message || 'Erro ao excluir clínica. Pode haver dados vinculados que impedem a exclusão.'
          }
        }

        console.log('✅ deleteClinic - Clínica excluída com sucesso')
        return { ok: true }
      }
    } catch (error: any) {
      console.error('❌ deleteClinic - Erro inesperado:', error)
      return { ok: false, error: error.message || 'Erro inesperado ao processar clínica.' }
    }
  }

  const value = useMemo(
    () => ({
      currentUser,
      sessionLoading,
      login,
      signOut,
      appointments,
      blocks,
      timeOffs,
      clients,
      professionals,
      services,
      clinicSettings,
      addAppointment,
      addBlock,
      addTimeOff,
      checkAvailability,
      canUser,
      addClient,
      updateStatus,
      updateAppointment,
      removeAppointment,
      removeBlock,
      updateClient,
      addCashback,
      useCashback,
      saveAnamnesis,
      addEvolution,
      addDocument,
      saveHealthTags,
      saveForm,
      addService,
      updateService,
      removeService,
      addProfessional,
      updateProfessional,
      removeProfessional,
      updateClinicSettings,
      pricingSettings,
      updatePricingSettings,
      updateClinic,
      provisionNewClinic,
      addAdminToClinic,
      deleteClinic,
      removeTimeOff,
      logout,
      updateUserProfile,
    }),
    [
      appointments,
      blocks,
      timeOffs,
      clients,
      professionals,
      services,
      clinicSettings,
      pricingSettings,
      currentUser,
      signOut,
      sessionLoading,
    ]
  )

  useEffect(() => {
    // Função auxiliar para carregar perfil do usuário autenticado
    const loadUserProfile = async (authUser: any) => {
      console.log('🔄 loadUserProfile - Iniciando...', { userId: authUser?.id, email: authUser?.email })
      
      if (!authUser?.id) {
        console.warn('⚠️ loadUserProfile - Usuário não fornecido')
        return null
      }

      try {
        // Buscar perfil - tenta com is_super_admin, se falhar busca sem
        let profile: any = null
        let profileError: any = null
        
        console.log('🔄 loadUserProfile - Buscando perfil com is_super_admin...')
        
        // Adicionar timeout para evitar que a query trave indefinidamente
        let profileWithFlag: any = null
        let errorWithFlag: any = null
        
        try {
          console.log('🔄 loadUserProfile - Executando query no Supabase...')
          
          // Adicionar timeout de 3 segundos - se demorar mais, criar usuário básico
          const queryWithTimeout = Promise.race([
            supabase
              .from('profiles')
              .select('role, clinic_id, professional_id, full_name, avatar_url')
              .eq('id', authUser.id)
              .maybeSingle(),
            new Promise<{ data: null; error: { message: string; code: string } }>((resolve) => 
              setTimeout(() => resolve({ 
                data: null, 
                error: { message: 'Query timeout após 3 segundos - possível problema de RLS', code: 'TIMEOUT' } 
              }), 3000)
            )
          ])
          
          const result = await queryWithTimeout as any
          
          console.log('📋 loadUserProfile - Query retornou:', { 
            hasData: !!result?.data, 
            hasError: !!result?.error,
            errorMessage: result?.error?.message,
            errorCode: result?.error?.code,
            errorDetails: result?.error?.details,
            errorHint: result?.error?.hint
          })
          
          profileWithFlag = result?.data
          errorWithFlag = result?.error
        } catch (err: any) {
          console.error('❌ loadUserProfile - Erro ao executar query:', err)
          errorWithFlag = err
        }

        console.log('📋 loadUserProfile - Resultado da busca:', { 
          profileWithFlag: !!profileWithFlag, 
          errorWithFlag: errorWithFlag?.message || null,
          hasRole: !!profileWithFlag?.role,
          hasClinicId: !!profileWithFlag?.clinic_id,
          errorCode: errorWithFlag?.code
        })

        if (errorWithFlag && (errorWithFlag.message?.includes('is_super_admin') || errorWithFlag.code === 'PGRST116')) {
          console.log('🔄 loadUserProfile - Coluna is_super_admin não existe ou erro, buscando sem ela...')
          // Coluna não existe, busca sem ela
          console.log('🔄 loadUserProfile - Executando query sem is_super_admin...')
          const { data: data2, error: error2 } = await supabase
            .from('profiles')
            .select('role, clinic_id, professional_id, full_name, avatar_url')
            .eq('id', authUser.id)
            .maybeSingle()
          
          console.log('📋 loadUserProfile - Query sem is_super_admin retornou:', { 
            hasData: !!data2, 
            hasError: !!error2,
            errorMessage: error2?.message,
            errorCode: error2?.code
          })
          
          profile = data2
          profileError = error2
          
          console.log('📋 loadUserProfile - Resultado da busca sem is_super_admin:', { 
            profile: !!profile, 
            profileError: profileError?.message || null 
          })
        } else {
          profile = profileWithFlag
          profileError = errorWithFlag
        }

        if (profileError) {
          console.error('❌ Erro ao buscar perfil:', profileError)
          // CORRIGIDO: Verificar localStorage antes de criar usuário básico
          // Se o usuário já foi identificado como super_admin, preservar seus dados
          let preservedUser: SchedulerUser | null = null
          try {
            const storedUser = localStorage.getItem('clinicflow_user')
            if (storedUser) {
              const parsed = JSON.parse(storedUser)
              if (parsed.id === authUser.id && parsed.role === 'super_admin') {
                // Preservar dados do super_admin do localStorage
                preservedUser = {
                  id: authUser.id,
                  role: 'super_admin',
                  clinicId: parsed.clinicId || null,
                  email: authUser.email || parsed.email || '',
                  fullName: parsed.fullName || authUser.email?.split('@')[0] || 'Usuário Admin',
                  avatarUrl: parsed.avatarUrl || '',
                  professionalId: parsed.professionalId,
                }
                console.log('✅ loadUserProfile - Preservando dados do super_admin do localStorage:', preservedUser)
                setCurrentUser(preservedUser)
                localStorage.setItem('clinicflow_user', JSON.stringify(preservedUser))
                return preservedUser
              }
            }
          } catch (e) {
            console.warn('Erro ao ler localStorage:', e)
          }
          
          // CORRIGIDO: Não criar usuário com role padrão 'professional'
          // Retornar null e deixar sessionLoading = true até que o role seja confirmado
          console.warn('⚠️ Erro ao buscar perfil - não definindo role padrão. Aguardando confirmação do banco.')
          setCurrentUser(null)
          localStorage.removeItem('clinicflow_user') // Limpar localStorage incorreto
          return null
        }

        if (!profile) {
          console.warn('⚠️ Perfil não encontrado para usuário:', authUser.id)
          // CORRIGIDO: Verificar localStorage antes de criar usuário básico
          let preservedUser: SchedulerUser | null = null
          try {
            const storedUser = localStorage.getItem('clinicflow_user')
            if (storedUser) {
              const parsed = JSON.parse(storedUser)
              if (parsed.id === authUser.id && parsed.role === 'super_admin') {
                // Preservar dados do super_admin do localStorage
                preservedUser = {
                  id: authUser.id,
                  role: 'super_admin',
                  clinicId: parsed.clinicId || null,
                  email: authUser.email || parsed.email || '',
                  fullName: parsed.fullName || authUser.email?.split('@')[0] || 'Usuário Admin',
                  avatarUrl: parsed.avatarUrl || '',
                  professionalId: parsed.professionalId,
                }
                console.log('✅ loadUserProfile - Preservando dados do super_admin do localStorage (sem perfil no banco):', preservedUser)
                setCurrentUser(preservedUser)
                localStorage.setItem('clinicflow_user', JSON.stringify(preservedUser))
                return preservedUser
              }
            }
          } catch (e) {
            console.warn('Erro ao ler localStorage:', e)
          }
          
          // CORRIGIDO: Não criar usuário com role padrão 'professional'
          // Retornar null e deixar sessionLoading = true até que o role seja confirmado
          console.warn('⚠️ Perfil não encontrado - não definindo role padrão. Aguardando confirmação do banco.')
          setCurrentUser(null)
          localStorage.removeItem('clinicflow_user') // Limpar localStorage incorreto
          return null
        }

        // CORRIGIDO: Verificar múltiplas formas de identificar super_admin
        // 1. Flag is_super_admin no banco
        // 2. Role 'super_admin' no banco
        // 3. Verificar localStorage para preservar role se o usuário já foi identificado como super_admin antes
        const isSuperAdminFlag = profile?.is_super_admin === true
        const roleFromDb = (profile.role as Role) || null
        
        // Verificar localStorage primeiro para preservar role de super_admin após reload
        let preservedRole: Role | null = null
        let preservedData: { fullName?: string; avatarUrl?: string; clinicId?: string | null } | null = null
        try {
          const storedUser = localStorage.getItem('clinicflow_user')
          if (storedUser) {
            const parsed = JSON.parse(storedUser)
            // Se o usuário já foi identificado como super_admin antes, preservar esse role E seus dados
            if (parsed.role === 'super_admin' && parsed.id === authUser.id) {
              preservedRole = 'super_admin'
              preservedData = {
                fullName: parsed.fullName,
                avatarUrl: parsed.avatarUrl,
                clinicId: parsed.clinicId
              }
              console.log('🔍 loadUserProfile - Preservando role e dados do super_admin do localStorage:', preservedData)
            }
          }
        } catch (e) {
          console.warn('Erro ao ler localStorage:', e)
        }
        
        // Determinar se é super_admin (prioridade: flag > role no banco > localStorage)
        const isSuperAdmin = isSuperAdminFlag || roleFromDb === 'super_admin' || preservedRole === 'super_admin'
        
        // ✅ VERIFICAÇÃO SÍNCRONA DE ROLE: Priorizar SEMPRE o banco de dados sobre localStorage
        // Determinar role final (prioridade: super_admin > role do banco > NÃO usar localStorage para evitar dados antigos)
        // CRÍTICO: Para evitar bugs de role incorreto, SEMPRE priorizar o banco de dados
        let finalRole: Role | null = null

        if (isSuperAdmin || preservedRole === 'super_admin') {
          finalRole = 'super_admin'
          console.log('✅ loadUserProfile - Role determinado: super_admin (flag ou preserved)')
        } else if (roleFromDb && ['admin', 'clinic_owner', 'receptionist', 'professional', 'client'].includes(roleFromDb)) {
          // ✅ PRIORIDADE 1: Sempre usar role do banco se existir e for válido
          finalRole = roleFromDb
          console.log('✅ loadUserProfile - Usando role do banco de dados:', finalRole)
        } else if (preservedRole && ['admin', 'clinic_owner', 'receptionist', 'professional', 'client'].includes(preservedRole)) {
          // ✅ PRIORIDADE 2: Usar preservedRole (do contexto interno) apenas se não houver no banco
          finalRole = preservedRole
          console.log('✅ loadUserProfile - Usando preservedRole (contexto interno):', finalRole)
        } else {
          // ❌ NÃO usar localStorage para preservar role - pode ter dados antigos/incorretos
          // Se não houver role confirmado no banco, retornar null
          console.error('❌ loadUserProfile - Role não encontrado no banco de dados!')
          console.error('❌ Dados disponíveis:', { 
            roleFromDb, 
            preservedRole, 
            isSuperAdmin,
            profileData: profile ? { role: profile.role, clinic_id: profile.clinic_id } : null
          })
          setCurrentUser(null)
          localStorage.removeItem('clinicflow_user')
          return null
        }
        
        // ✅ VALIDAÇÃO FINAL: Garantir que o role foi determinado corretamente
        if (!finalRole) {
          console.error('❌ loadUserProfile - Falha crítica: finalRole não foi determinado!')
          setCurrentUser(null)
          localStorage.removeItem('clinicflow_user')
          return null
        }
        
        console.log('🔍 loadUserProfile - Detecção de role:', {
          isSuperAdminFlag,
          roleFromDb,
          preservedRole,
          isSuperAdmin,
          finalRole
        })
        
        // Para super_admin, tentar preservar clinicId do localStorage (se foi selecionado anteriormente)
        let clinicIdForSuperAdmin = null
        if (isSuperAdmin) {
          try {
            const storedUser = localStorage.getItem('clinicflow_user')
            if (storedUser) {
              const parsed = JSON.parse(storedUser)
              if (parsed.clinicId && parsed.role === 'super_admin') {
                clinicIdForSuperAdmin = parsed.clinicId
                console.log('🔍 Preservando clinicId do localStorage para super_admin:', clinicIdForSuperAdmin)
              }
            }
          } catch (e) {
            console.warn('Erro ao ler localStorage:', e)
          }
        }
        
        // IMPORTANTE: Para super_admin, clinicId pode ser null, mas ainda assim deve definir currentUser
        // Isso permite que o usuário seja considerado autenticado e possa navegar
        const clinicId = isSuperAdmin ? (clinicIdForSuperAdmin || preservedData?.clinicId || profile.clinic_id || null) : (profile.clinic_id || null)
        
        // CORRIGIDO: Usar fallbacks seguros para full_name e avatar_url
        // Prioridade: banco > localStorage (se super_admin) > email > padrão
        const fullName = profile.full_name || 
                        (isSuperAdmin && preservedData?.fullName) || 
                        authUser.email?.split('@')[0] || 
                        (isSuperAdmin ? 'Usuário Admin' : 'Usuário')
        
        const avatarUrl = profile.avatar_url || 
                         (isSuperAdmin && preservedData?.avatarUrl) || 
                         ''
        
        const userData: SchedulerUser = {
          id: authUser.id,
          role: finalRole, // Usar finalRole (garante que super_admin não vira professional)
          clinicId: clinicId, // Pode ser null para super_admin
          professionalId: profile.professional_id || undefined,
          fullName: fullName, // Fallback seguro
          email: authUser.email || '',
          avatarUrl: avatarUrl, // Fallback seguro
        }
        
        console.log('✅ loadUserProfile - Usuário carregado:', userData)
        console.log('📋 loadUserProfile - clinicId:', clinicId, 'isSuperAdmin:', isSuperAdmin, 'finalRole:', finalRole)
        
        // SEMPRE definir currentUser, mesmo se clinicId for null (para super_admin)
        // Isso permite que o usuário seja considerado autenticado
        console.log('💾 loadUserProfile - Salvando currentUser no estado e localStorage...')
        setCurrentUser(userData)
        localStorage.setItem('clinicflow_user', JSON.stringify(userData))
        console.log('✅ loadUserProfile - currentUser salvo com sucesso')
        
        return userData
      } catch (error) {
        console.error('❌ loadUserProfile - Erro inesperado:', error)
        // CORRIGIDO: Não criar usuário com role padrão em caso de erro
        console.error('❌ loadUserProfile - Erro inesperado. Não definindo role padrão.')
        setCurrentUser(null)
        localStorage.removeItem('clinicflow_user')
        return null
      }
    }

    // Carregar sessão persistida na inicialização
    const initializeSession = async () => {
      console.log('🔄 Inicializando sessão...')
      setSessionLoading(true)
      
      try {
        // PRIMEIRO: Tentar ler a sessão persistida do storage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.warn('⚠️ Erro ao ler sessão:', sessionError)
          setCurrentUser(null)
          setSessionLoading(false)
          return
        }

        if (session?.user) {
          console.log('✅ Sessão encontrada, carregando perfil do usuário:', session.user.id)
          const loadedUser = await loadUserProfile(session.user)
          if (!loadedUser) {
            console.warn('⚠️ Não foi possível carregar perfil, mas usuário está autenticado')
            // CORRIGIDO: Não definir role padrão 'professional'
            // Manter sessionLoading = true até que o perfil seja carregado
            console.warn('⚠️ Não foi possível carregar perfil. Mantendo sessionLoading = true.')
            setCurrentUser(null)
            localStorage.removeItem('clinicflow_user')
            setSessionLoading(false) // Finalizar loading mesmo sem perfil
          }
        } else {
          console.log('ℹ️ Nenhuma sessão encontrada')
          setCurrentUser(null)
          localStorage.removeItem('clinicflow_user')
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar sessão:', error)
        setCurrentUser(null)
      } finally {
        setSessionLoading(false)
      }
    }

    // Executar inicialização imediatamente
    initializeSession()

    // Listener para mudanças de autenticação
    // ✅ CORREÇÃO: Evitar recarregar perfil em TOKEN_REFRESHED se já estiver carregado (evita reload no mobile)
    let hasLoadedUser = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔔 Auth state change:', event, session?.user?.id, 'hasLoadedUser:', hasLoadedUser, 'currentUser:', !!currentUser)
      
      if (event === 'SIGNED_OUT') {
        console.log('👋 Usuário deslogado')
        setCurrentUser(null)
        localStorage.removeItem('clinicflow_user')
        hasLoadedUser = false // Reset flag ao deslogar
      } else if (event === 'SIGNED_IN') {
        // ✅ Sempre carregar em SIGNED_IN (novo login)
        hasLoadedUser = false // Reset para forçar reload em novo login
        if (session?.user) {
          console.log('✅ Novo login detectado, carregando perfil...', { userId: session.user.id })
          setSessionLoading(true)
          try {
            const loadedUser = await loadUserProfile(session.user)
            if (!loadedUser) {
              console.error('❌ onAuthStateChange - Não foi possível carregar perfil do banco de dados!')
              setCurrentUser(null)
              localStorage.removeItem('clinicflow_user')
            } else {
              console.log('✅ onAuthStateChange - Usuário carregado com sucesso:', loadedUser)
              hasLoadedUser = true
            }
          } catch (error) {
            console.error('❌ onAuthStateChange - Erro ao carregar perfil:', error)
            setCurrentUser(null)
            localStorage.removeItem('clinicflow_user')
          } finally {
            setSessionLoading(false)
          }
        }
      } else if (event === 'INITIAL_SESSION') {
        // ✅ Apenas na primeira vez (INITIAL_SESSION) - carregar se não tiver usuário
        // Usar ref para verificar estado atual sem problemas de closure
        if (session?.user && !currentUserRef.current && !hasLoadedUser) {
          console.log('✅ Sessão inicial detectada, carregando perfil...', { userId: session.user.id })
          setSessionLoading(true)
          try {
            const loadedUser = await loadUserProfile(session.user)
            if (!loadedUser) {
              console.error('❌ onAuthStateChange - Não foi possível carregar perfil do banco de dados!')
              setCurrentUser(null)
              localStorage.removeItem('clinicflow_user')
            } else {
              console.log('✅ onAuthStateChange - Usuário carregado com sucesso:', loadedUser)
              hasLoadedUser = true
            }
          } catch (error) {
            console.error('❌ onAuthStateChange - Erro ao carregar perfil:', error)
            setCurrentUser(null)
            localStorage.removeItem('clinicflow_user')
          } finally {
            setSessionLoading(false)
          }
        } else if (currentUserRef.current || hasLoadedUser) {
          // ✅ Já tem usuário carregado, não recarregar
          console.log('ℹ️ onAuthStateChange - Usuário já carregado, ignorando INITIAL_SESSION')
        }
      } else if (event === 'TOKEN_REFRESHED') {
        // ✅ CORREÇÃO CRÍTICA: NUNCA recarregar perfil em TOKEN_REFRESHED
        // Isso evita reloads desnecessários quando a página volta ao foco no mobile
        // O token refresh é apenas para renovar a autenticação, não para recarregar dados
        console.log('ℹ️ onAuthStateChange - Token refreshed, mantendo usuário atual (sem reload)')
        // Não fazer nada - apenas manter o usuário atual
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return <SchedulerContext.Provider value={value}>{children}</SchedulerContext.Provider>
}

export function useScheduler() {
  const ctx = useContext(SchedulerContext)
  if (!ctx) throw new Error('useScheduler deve ser usado dentro de SchedulerProvider')
  return ctx
}

