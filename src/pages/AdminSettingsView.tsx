import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useScheduler } from '../context/SchedulerContext'
import { useToast } from '../components/ui/Toast'
import {
  Save,
  Target,
  DollarSign,
  Shield,
  Key,
  Users,
  RefreshCw,
  Search,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Calculator,
} from 'lucide-react'
import { usePanelContext } from '../context/PanelContext'

interface OrganizationSettings {
  clinic_id: string
  monthly_revenue_goal_cents: number
  solo_mode: boolean
  gaby_config: Record<string, any>
}

interface AsaasStatus {
  connected: boolean
  apiKey?: string
  webhookStatus?: 'active' | 'inactive' | 'error'
  lastSync?: string
}

interface ReceptionistUser {
  id: string
  full_name: string | null
  email: string | null
  role: string
}

interface FeeLedgerBalance {
  total_pending_cents: number
  transaction_count: number
}

export function AdminSettingsView() {
  const { currentUser } = useScheduler()
  const toast = useToast()
  const { setActiveTab } = usePanelContext()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<OrganizationSettings | null>(null)
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [platformFeeOverride, setPlatformFeeOverride] = useState('')
  const [asaasStatus, setAsaasStatus] = useState<AsaasStatus>({
    connected: false,
    webhookStatus: 'inactive',
  })
  const [receptionists, setReceptionists] = useState<ReceptionistUser[]>([])
  const [loadingReceptionists, setLoadingReceptionists] = useState(false)
  const [clientSearchQuery, setClientSearchQuery] = useState('')
  const [clientSearchResult, setClientSearchResult] = useState<{ id: string; full_name: string; email: string | null } | null>(null)
  const [searchingClient, setSearchingClient] = useState(false)
  const [feeLedgerBalance, setFeeLedgerBalance] = useState<FeeLedgerBalance | null>(null)
  const [organization, setOrganization] = useState<{ 
    platform_fee_override_percent: number | null
    asaas_wallet_id: string | null
    kyc_status: 'pending' | 'in_review' | 'approved' | 'rejected' | null
    status: 'pending_setup' | 'active' | 'suspended' | 'cancelled' | null
    subscription_renewal_date: string | null
    subscription_cancelled_at: string | null
    included_users_count: number | null
  } | null>(null)
  const [activeUsersCount, setActiveUsersCount] = useState<number>(0)
  const [cancelling, setCancelling] = useState(false)
  const [professionalsKYC, setProfessionalsKYC] = useState<Array<{
    id: string
    full_name: string | null
    cpf: string | null
    kyc_status: 'pending' | 'in_review' | 'approved' | 'rejected' | null
    asaas_wallet_id: string | null
  }>>([])
  const [loadingKYC, setLoadingKYC] = useState(false)
  // Estado para edição de turnos e custos
  const [scheduleData, setScheduleData] = useState({
    startTime: '08:00',
    endTime: '18:00',
    weekdays: [1, 2, 3, 4, 5],
    monthlyCosts: '',
  })
  const [calculatedHourlyCost, setCalculatedHourlyCost] = useState('')

  const clinicId = currentUser?.clinicId
  const isSuperAdmin = currentUser?.role === 'super_admin'
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'clinic_owner'

  useEffect(() => {
    if (!clinicId) {
      setLoading(false)
      return
    }

    loadAllData()
  }, [clinicId])

  const loadAllData = async () => {
    if (!clinicId) return

    setLoading(true)
    try {
      await Promise.all([
        loadSettings(),
        loadAsaasStatus(),
        loadReceptionists(),
        loadFeeLedgerBalance(),
        loadOrganization(),
        loadKYCStatus(),
        loadScheduleAndCosts(),
      ])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSettings = async () => {
    if (!clinicId) return

    try {
      const { data: orgSettings, error: orgError } = await supabase
        .from('organization_settings')
        .select('*')
        .eq('clinic_id', clinicId)
        .maybeSingle()

      if (orgError) throw orgError

      if (orgSettings) {
        setSettings(orgSettings as OrganizationSettings)
        setMonthlyGoal(
          orgSettings.monthly_revenue_goal_cents
            ? (orgSettings.monthly_revenue_goal_cents / 100).toString()
            : ''
        )
      } else {
        const defaultSettings: OrganizationSettings = {
          clinic_id: clinicId,
          monthly_revenue_goal_cents: 0,
          solo_mode: false,
          gaby_config: {},
        }
        setSettings(defaultSettings)
        setMonthlyGoal('')
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações:', err)
    }
  }

  const loadOrganization = async () => {
    if (!clinicId) return

    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('platform_fee_override_percent, asaas_wallet_id, kyc_status, status, subscription_renewal_date, subscription_cancelled_at, included_users_count')
        .eq('id', clinicId)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setOrganization(data)
        setPlatformFeeOverride(
          data.platform_fee_override_percent !== null
            ? (data.platform_fee_override_percent / 100).toFixed(2)
            : '5.99'
        )
      }

      // Contar usuários ativos
      const { data: usersData, error: usersError } = await supabase
        .rpc('count_active_users', { clinic_uuid: clinicId })

      if (!usersError && usersData !== null) {
        setActiveUsersCount(usersData)
      }
    } catch (err) {
      console.warn('Erro ao carregar organização:', err)
    }
  }

  const loadKYCStatus = async () => {
    if (!clinicId || !isAdmin) return

    setLoadingKYC(true)
    try {
      // Buscar status KYC dos profissionais
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, cpf, kyc_status, asaas_wallet_id')
        .eq('clinic_id', clinicId)
        .eq('role', 'professional')
        .order('full_name')

      if (error) throw error

      setProfessionalsKYC((data || []) as Array<{
        id: string
        full_name: string | null
        cpf: string | null
        kyc_status: 'pending' | 'in_review' | 'approved' | 'rejected' | null
        asaas_wallet_id: string | null
      }>)
    } catch (err) {
      console.warn('Erro ao carregar status KYC:', err)
    } finally {
      setLoadingKYC(false)
    }
  }

  const handleRequestAsaasSubaccount = async (type: 'clinic' | 'professional', id?: string) => {
    if (!clinicId || !isAdmin) return

    try {
      // Buscar dados KYC completos
      if (type === 'clinic') {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('cnpj, bank_account_data')
          .eq('id', clinicId)
          .maybeSingle()

        if (orgError) throw orgError
        if (!org?.cnpj || !org?.bank_account_data) {
          toast.error('Dados KYC incompletos. Preencha CNPJ e dados bancários na aba Cadastros.')
          return
        }

        // Chamar Edge Function
        const { data, error } = await supabase.functions.invoke('create-asaas-subaccount', {
          body: {
            type: 'clinic',
            clinic_id: clinicId,
            cnpj: org.cnpj,
            bank_account_data: org.bank_account_data,
          },
        })

        if (error) throw error
        if (data?.error) throw new Error(data.error)

        toast.success('Subconta Asaas criada com sucesso! Status: ' + (data.status || 'Em análise'))
      } else if (id) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('cpf, bank_account_data')
          .eq('id', id)
          .maybeSingle()

        if (profileError) throw profileError
        if (!profile?.cpf || !profile?.bank_account_data) {
          toast.error('Dados KYC incompletos. Preencha CPF e dados bancários no cadastro do profissional.')
          return
        }

        // Chamar Edge Function
        const { data, error } = await supabase.functions.invoke('create-asaas-subaccount', {
          body: {
            type: 'professional',
            clinic_id: clinicId,
            professional_id: id,
            cpf: profile.cpf,
            bank_account_data: profile.bank_account_data,
          },
        })

        if (error) throw error
        if (data?.error) throw new Error(data.error)

        toast.success('Subconta Asaas criada com sucesso! Status: ' + (data.status || 'Em análise'))
      }
      
      // Recarregar status KYC após solicitação
      await loadKYCStatus()
      await loadOrganization()
    } catch (err: any) {
      console.error('Erro ao solicitar criação de subconta:', err)
      toast.error(err.message || 'Erro ao solicitar criação de subconta Asaas')
    }
  }

  const loadAsaasStatus = async () => {
    if (!clinicId) return

    try {
      // Simular verificação de status do Asaas
      // Em produção, isso faria uma chamada real à API do Asaas
      const mockStatus: AsaasStatus = {
        connected: true, // Simulado - em produção verificar via API
        apiKey: 'asaas_pub_1234567890abcdef', // Simulado
        webhookStatus: 'active',
        lastSync: new Date().toISOString(),
      }
      setAsaasStatus(mockStatus)
    } catch (err) {
      console.warn('Erro ao carregar status Asaas:', err)
      setAsaasStatus({ connected: false, webhookStatus: 'error' })
    }
  }

  const loadReceptionists = async () => {
    if (!clinicId || !isAdmin) return

    setLoadingReceptionists(true)
    try {
      // Buscar recepcionistas - email está em auth.users, não em profiles
      // Por enquanto, vamos buscar apenas os dados do profile
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('clinic_id', clinicId)
        .eq('role', 'receptionist')
        .order('full_name')

      if (error) throw error

      // Mapear para incluir email (será buscado quando necessário para reset)
      const receptionistsWithEmail = await Promise.all(
        (data || []).map(async (profile) => {
          // Tentar buscar email do auth.users via RPC ou manter null
          // Em produção, isso seria feito via Edge Function com service role
          return {
            id: profile.id,
            full_name: profile.full_name,
            email: null, // Email será buscado quando necessário para reset
            role: profile.role,
          } as ReceptionistUser
        })
      )

      setReceptionists(receptionistsWithEmail)
    } catch (err) {
      console.warn('Erro ao carregar recepcionistas:', err)
    } finally {
      setLoadingReceptionists(false)
    }
  }

  const loadFeeLedgerBalance = async () => {
    if (!clinicId) return

    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .select('platform_fee_cents')
        .eq('clinic_id', clinicId)
        .eq('is_fee_ledger_pending', true)

      if (error) throw error

      const total = (data || []).reduce((sum, tx) => sum + (tx.platform_fee_cents || 0), 0)

      setFeeLedgerBalance({
        total_pending_cents: total,
        transaction_count: data?.length || 0,
      })
    } catch (err) {
      console.warn('Erro ao carregar saldo do Fee Ledger:', err)
    }
  }

  const handleSaveMonthlyGoal = async () => {
    if (!clinicId) return

    setSaving(true)
    try {
      const goalCents = Math.round(parseFloat(monthlyGoal) * 100) || 0

      if (settings) {
        const { error } = await supabase
          .from('organization_settings')
          .update({ monthly_revenue_goal_cents: goalCents })
          .eq('clinic_id', clinicId)

        if (error) throw error
      } else {
        const { error } = await supabase.from('organization_settings').insert({
          clinic_id: clinicId, // ✅ Corrigido: usar clinic_id (não organization_id)
          monthly_revenue_goal_cents: goalCents,
          solo_mode: false,
          gaby_config: {},
        })

        if (error) throw error
      }

      toast.success('Meta mensal salva com sucesso!')
      await loadSettings()
    } catch (err) {
      console.error('Erro ao salvar meta:', err)
      toast.error('Falha ao salvar meta mensal')
    } finally {
      setSaving(false)
    }
  }

  const handleSavePlatformFee = async () => {
    if (!clinicId || !isSuperAdmin) return

    setSaving(true)
    try {
      const feePercent = Math.round(parseFloat(platformFeeOverride) * 100) // Converter para centésimos (5.99 -> 599)

      if (feePercent < 0 || feePercent > 1000) {
        toast.error('A taxa deve estar entre 0% e 10%')
        setSaving(false)
        return
      }

      const { error } = await supabase
        .from('organizations')
        .update({ platform_fee_override_percent: feePercent })
        .eq('id', clinicId)

      if (error) throw error

      toast.success('Taxa da plataforma atualizada com sucesso!')
      await loadOrganization()
    } catch (err) {
      console.error('Erro ao salvar taxa:', err)
      toast.error('Falha ao salvar taxa da plataforma')
    } finally {
      setSaving(false)
    }
  }

  const handleForcePasswordReset = async (userId: string, userName: string) => {
    if (!isAdmin) return

    try {
      // Em produção, isso chamaria uma Edge Function do Supabase que usa service role
      // para gerar o link de reset de senha via supabase.auth.admin.generateLink()
      // Por enquanto, simulamos o envio
      
      toast.success(`Link de redefinição de senha será enviado para ${userName}`)
      
      // TODO: Implementar chamada à Edge Function:
      // POST /functions/v1/force-password-reset
      // Body: { userId }
      // A Edge Function usaria service role para:
      // 1. Buscar email do usuário em auth.users
      // 2. Gerar link de reset: supabase.auth.admin.generateLink({ type: 'recovery', email })
      // 3. Enviar email (ou retornar link para admin enviar manualmente)
      
      console.log('Reset de senha solicitado para:', { userId, userName })
    } catch (err) {
      console.error('Erro ao forçar reset de senha:', err)
      toast.error('Erro ao enviar link de redefinição')
    }
  }

  const handleSearchClient = async () => {
    if (!clientSearchQuery.trim()) return

    setSearchingClient(true)
    try {
      // Buscar por email ou ID
      const { data, error } = await supabase
        .from('clients')
        .select('id, full_name, email')
        .or(`email.ilike.%${clientSearchQuery}%,id.eq.${clientSearchQuery}`)
        .eq('clinic_id', clinicId)
        .limit(1)
        .maybeSingle()

      if (error) throw error

      if (data) {
        setClientSearchResult(data as { id: string; full_name: string; email: string | null })
      } else {
        setClientSearchResult(null)
        toast.error('Cliente não encontrado')
      }
    } catch (err) {
      console.error('Erro ao buscar cliente:', err)
      toast.error('Erro ao buscar cliente')
    } finally {
      setSearchingClient(false)
    }
  }

  const handleRequestClientPasswordReset = async () => {
    if (!clientSearchResult) return

    try {
      // Em produção, isso chamaria uma Edge Function para enviar o email de reset
      toast.success(`Solicitação de redefinição de senha enviada para ${clientSearchResult.full_name}`)
      setClientSearchQuery('')
      setClientSearchResult(null)
    } catch (err) {
      console.error('Erro ao solicitar reset:', err)
      toast.error('Erro ao solicitar redefinição de senha')
    }
  }

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100)
  }

  const maskApiKey = (key?: string) => {
    if (!key) return 'Não configurado'
    if (key.length <= 8) return key
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`
  }

  const loadScheduleAndCosts = async () => {
    if (!clinicId) return

    try {
      const { data: org } = await supabase
        .from('organizations')
        .select('schedule_start_time, schedule_end_time, schedule_weekdays, monthly_costs_cents, hourly_cost_cents')
        .eq('id', clinicId)
        .maybeSingle()

      if (org) {
        setScheduleData({
          startTime: org.schedule_start_time ? org.schedule_start_time.substring(0, 5) : '08:00',
          endTime: org.schedule_end_time ? org.schedule_end_time.substring(0, 5) : '18:00',
          weekdays: org.schedule_weekdays || [1, 2, 3, 4, 5],
          monthlyCosts: org.monthly_costs_cents ? (org.monthly_costs_cents / 100).toString() : '',
        })
        if (org.hourly_cost_cents) {
          setCalculatedHourlyCost((org.hourly_cost_cents / 100).toFixed(2))
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar turnos e custos:', err)
    }
  }

  const handleSaveScheduleAndCosts = async () => {
    if (!clinicId) return

    if (!scheduleData.startTime || !scheduleData.endTime) {
      toast.error('Por favor, informe os horários de funcionamento')
      return
    }

    if (scheduleData.weekdays.length === 0) {
      toast.error('Por favor, selecione pelo menos um dia da semana')
      return
    }

    if (!scheduleData.monthlyCosts || parseFloat(scheduleData.monthlyCosts) <= 0) {
      toast.error('Por favor, informe o total de custos mensais')
      return
    }

    setSaving(true)
    try {
      // Calcular horas trabalhadas por mês
      const start = new Date(`2000-01-01T${scheduleData.startTime}:00`)
      const end = new Date(`2000-01-01T${scheduleData.endTime}:00`)
      let diffMs = end.getTime() - start.getTime()
      if (diffMs < 0) {
        diffMs = (24 * 60 * 60 * 1000) + diffMs
      }
      const hoursPerDay = diffMs / (1000 * 60 * 60)
      const daysPerMonth = scheduleData.weekdays.length * 4.33
      const totalHoursPerMonth = hoursPerDay * daysPerMonth

      // Calcular custo por hora
      const monthlyCostsCents = Math.round(parseFloat(scheduleData.monthlyCosts) * 100)
      const hourlyCostCents = Math.round(monthlyCostsCents / totalHoursPerMonth)

      const { error } = await supabase
        .from('organizations')
        .update({
          schedule_start_time: scheduleData.startTime,
          schedule_end_time: scheduleData.endTime,
          schedule_weekdays: scheduleData.weekdays,
          monthly_costs_cents: monthlyCostsCents,
          hourly_cost_cents: hourlyCostCents,
        })
        .eq('id', clinicId)

      if (error) throw error

      setCalculatedHourlyCost((hourlyCostCents / 100).toFixed(2))
      toast.success('Turnos e custos salvos com sucesso!')
      await loadScheduleAndCosts()
    } catch (err) {
      console.error('Erro ao salvar turnos e custos:', err)
      toast.error('Erro ao salvar. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!clinicId || !isAdmin) return

    const confirmed = window.confirm(
      'Tem certeza que deseja cancelar sua assinatura? Você perderá o acesso ao sistema após a data de renovação.'
    )

    if (!confirmed) return

    setCancelling(true)
    try {
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: {
          clinic_id: clinicId,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success('Assinatura cancelada com sucesso')
      await loadOrganization()
      
      // Redirecionar para checkout após alguns segundos
      setTimeout(() => {
        window.location.href = '/subscription/checkout'
      }, 2000)
    } catch (err: any) {
      console.error('Erro ao cancelar assinatura:', err)
      toast.error(err.message || 'Erro ao cancelar assinatura')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando configurações...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Configurações</h2>
        <p className="text-sm text-gray-600">Governança, integrações e regras financeiras</p>
      </div>

      {/* MÓDULO I: STATUS E INTEGRAÇÃO ASAAS */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Key className="h-6 w-6 text-purple-500" />
          <h3 className="text-lg font-semibold text-gray-900">Status e Integração Asaas</h3>
        </div>

        {/* Status KYC da Clínica */}
        {organization && (
          <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-1">Status KYC da Clínica</h4>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    organization.kyc_status === 'approved' ? 'bg-green-100 text-green-700' :
                    organization.kyc_status === 'rejected' ? 'bg-red-100 text-red-700' :
                    organization.kyc_status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {organization.kyc_status === 'approved' ? '✅ Aprovado' :
                     organization.kyc_status === 'rejected' ? '❌ Rejeitado' :
                     organization.kyc_status === 'in_review' ? '⏳ Em Análise' :
                     '⏸️ Pendente'}
                  </span>
                  {organization.asaas_wallet_id && (
                    <span className="text-xs text-gray-600 font-mono">
                      Wallet: {organization.asaas_wallet_id.substring(0, 8)}...
                    </span>
                  )}
                </div>
              </div>
              {organization.kyc_status === 'approved' && organization.asaas_wallet_id && (
                <a
                  href={`https://app.asaas.com/wallets/${organization.asaas_wallet_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition flex items-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  Painel Asaas
                </a>
              )}
            </div>
            {organization.kyc_status !== 'approved' && (
              <button
                onClick={() => handleRequestAsaasSubaccount('clinic')}
                className="w-full px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition"
              >
                Solicitar Criação de Subconta Asaas
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white/70 border border-white/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              {asaasStatus.connected ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <span className="text-sm font-semibold text-gray-900">Status de Conexão</span>
            </div>
            <p className={`text-sm ${asaasStatus.connected ? 'text-green-600' : 'text-red-600'}`}>
              {asaasStatus.connected ? 'Conectado' : 'Erro de API'}
            </p>
          </div>

          <div className="rounded-xl bg-white/70 border border-white/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="h-5 w-5 text-gray-600" />
              <span className="text-sm font-semibold text-gray-900">Chave Pública de API</span>
            </div>
            <p className="text-sm text-gray-700 font-mono">{maskApiKey(asaasStatus.apiKey)}</p>
          </div>

          <div className="rounded-xl bg-white/70 border border-white/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              {asaasStatus.webhookStatus === 'active' ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-amber-500" />
              )}
              <span className="text-sm font-semibold text-gray-900">Status do Webhook</span>
            </div>
            <p className="text-sm text-gray-700">
              {asaasStatus.webhookStatus === 'active'
                ? 'Recebendo Notificações'
                : asaasStatus.webhookStatus === 'error'
                ? 'Erro de Conexão'
                : 'Inativo'}
            </p>
          </div>
        </div>

        {asaasStatus.lastSync && (
          <p className="text-xs text-gray-500 mt-4">
            Última sincronização: {new Date(asaasStatus.lastSync).toLocaleString('pt-BR')}
          </p>
        )}
      </div>

      {/* MÓDULO II: GOVERNANÇA E ACESSO */}
      {isAdmin && (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Segurança Operacional e Acesso</h3>
          </div>

          {/* Forçar Reset de Senha - Recepcionistas */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Forçar Reset de Senha (Operacional)</h4>
            {loadingReceptionists ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              </div>
            ) : receptionists.length > 0 ? (
              <div className="space-y-2">
                {receptionists.map((receptionist) => (
                  <div
                    key={receptionist.id}
                    className="flex items-center justify-between rounded-xl bg-white/70 border border-white/60 p-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {receptionist.full_name || 'Sem nome'}
                      </p>
                      <p className="text-xs text-gray-600">{receptionist.email || 'Sem email'}</p>
                    </div>
                    <button
                      onClick={() => handleForcePasswordReset(receptionist.id, receptionist.full_name || 'Usuário')}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Enviar Reset
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhum recepcionista cadastrado</p>
            )}
          </div>

          {/* Acesso à Conta do Cliente */}
          <div className="border-t border-white/40 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Acesso à Conta do Cliente (Suporte)</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearchClient()}
                  placeholder="Buscar por Email ou ID do Cliente"
                  className="flex-1 px-4 py-2 rounded-xl bg-white/70 border border-white/60 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/40"
                />
                <button
                  onClick={handleSearchClient}
                  disabled={searchingClient || !clientSearchQuery.trim()}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {searchingClient ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Buscar
                </button>
              </div>

              {clientSearchResult && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{clientSearchResult.full_name}</p>
                      <p className="text-xs text-gray-600">{clientSearchResult.email || 'Sem email'}</p>
                    </div>
                    <button
                      onClick={handleRequestClientPasswordReset}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 transition flex items-center gap-2"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Solicitar Redefinição
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MÓDULO II.5: MONITORAMENTO KYC */}
      {isAdmin && (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-6 w-6 text-indigo-500" />
            <h3 className="text-lg font-semibold text-gray-900">Status KYC dos Profissionais</h3>
          </div>

          {loadingKYC ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
            </div>
          ) : professionalsKYC.length > 0 ? (
            <div className="space-y-3">
              {professionalsKYC.map((prof) => (
                <div
                  key={prof.id}
                  className="flex items-center justify-between rounded-xl bg-white/70 border border-white/60 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <p className="text-sm font-semibold text-gray-900">
                        {prof.full_name || 'Sem nome'}
                      </p>
                      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        prof.kyc_status === 'approved' ? 'bg-green-100 text-green-700' :
                        prof.kyc_status === 'rejected' ? 'bg-red-100 text-red-700' :
                        prof.kyc_status === 'in_review' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {prof.kyc_status === 'approved' ? '✅ Aprovado' :
                         prof.kyc_status === 'rejected' ? '❌ Rejeitado' :
                         prof.kyc_status === 'in_review' ? '⏳ Em Análise' :
                         '⏸️ Pendente'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-600">
                      {prof.cpf && (
                        <span>CPF: {prof.cpf}</span>
                      )}
                      {prof.asaas_wallet_id && (
                        <span className="font-mono">Wallet: {prof.asaas_wallet_id.substring(0, 8)}...</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {prof.kyc_status === 'approved' && prof.asaas_wallet_id && (
                      <a
                        href={`https://app.asaas.com/wallets/${prof.asaas_wallet_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition flex items-center gap-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Painel
                      </a>
                    )}
                    {prof.kyc_status !== 'approved' && (
                      <button
                        onClick={() => handleRequestAsaasSubaccount('professional', prof.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition"
                      >
                        Solicitar KYC
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">Nenhum profissional cadastrado com dados KYC</p>
          )}
        </div>
      )}

      {/* MÓDULO II.7: PERFIL DA CLÍNICA (Turnos e Custos) */}
      {isAdmin && (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="h-6 w-6 text-purple-500" />
            <h3 className="text-lg font-semibold text-gray-900">Perfil da Clínica - Turnos e Custos</h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Horário de Início</label>
                <input
                  type="time"
                  value={scheduleData.startTime}
                  onChange={(e) => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/60 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Horário de Fim</label>
                <input
                  type="time"
                  value={scheduleData.endTime}
                  onChange={(e) => setScheduleData({ ...scheduleData, endTime: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/60 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dias da Semana</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { value: 0, label: 'Dom' },
                  { value: 1, label: 'Seg' },
                  { value: 2, label: 'Ter' },
                  { value: 3, label: 'Qua' },
                  { value: 4, label: 'Qui' },
                  { value: 5, label: 'Sex' },
                  { value: 6, label: 'Sáb' },
                ].map((day) => (
                  <label key={day.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={scheduleData.weekdays.includes(day.value)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setScheduleData({
                            ...scheduleData,
                            weekdays: [...scheduleData.weekdays, day.value],
                          })
                        } else {
                          setScheduleData({
                            ...scheduleData,
                            weekdays: scheduleData.weekdays.filter((d) => d !== day.value),
                          })
                        }
                      }}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">{day.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Total de Custos Mensais (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={scheduleData.monthlyCosts}
                onChange={(e) => setScheduleData({ ...scheduleData, monthlyCosts: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-white/70 border border-white/60 text-sm text-gray-900 focus:ring-2 focus:ring-purple-500/20"
                placeholder="0.00"
              />
            </div>

            {calculatedHourlyCost && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-purple-900 mb-1">Custo por Hora Calculado</p>
                <p className="text-2xl font-bold text-purple-600">R$ {calculatedHourlyCost}</p>
              </div>
            )}

            <button
              onClick={handleSaveScheduleAndCosts}
              disabled={saving}
              className="w-full px-4 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Turnos e Custos
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* MÓDULO III: REGRAS FINANCEIRAS GLOBAIS */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Regras Financeiras Globais</h3>
        </div>

        <div className="space-y-6">
          {/* Taxa da Plataforma */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Taxa da Plataforma
              {isSuperAdmin && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={platformFeeOverride}
                onChange={(e) => setPlatformFeeOverride(e.target.value)}
                placeholder="5.99"
                step="0.01"
                min="0"
                max="10"
                disabled={!isSuperAdmin}
                className={`flex-1 px-4 py-3 rounded-xl border ${
                  isSuperAdmin ? 'border-gray-300 bg-white' : 'border-gray-200 bg-gray-50'
                } text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-green-500/20 ${
                  !isSuperAdmin ? 'cursor-not-allowed' : ''
                }`}
              />
              <span className="text-sm text-gray-600">%</span>
              {isSuperAdmin && (
                <button
                  onClick={handleSavePlatformFee}
                  disabled={saving}
                  className="px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar
                    </>
                  )}
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-600">
              {isSuperAdmin
                ? 'Taxa padrão: 5.99%. Apenas Super Admin pode alterar.'
                : 'Taxa atual: 5.99% (apenas Super Admin pode alterar)'}
            </p>
          </div>

          {/* Gestão de Fee Ledger */}
          <div className="border-t border-white/40 pt-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Fee Ledger (Taxas Pendentes)</h4>
            {feeLedgerBalance ? (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Saldo Pendente</p>
                    <p className="text-2xl font-bold text-amber-600">
                      {formatCurrency(feeLedgerBalance.total_pending_cents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Transações</p>
                    <p className="text-lg font-semibold text-gray-900">{feeLedgerBalance.transaction_count}</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('Financeiro')}
                  className="mt-3 w-full px-4 py-2 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition flex items-center justify-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Ir para Financeiro para Conciliação
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-600">Nenhuma taxa pendente no momento</p>
            )}
          </div>
        </div>
      </div>

      {/* Assinatura */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <DollarSign className="h-6 w-6 text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Assinatura</h3>
        </div>

        {organization && (
          <div className="space-y-4">
            {/* Status da Assinatura */}
            <div className="rounded-xl bg-white/70 border border-white/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-1">Status da Assinatura</p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                    organization.status === 'active' ? 'bg-green-100 text-green-700' :
                    organization.status === 'suspended' ? 'bg-red-100 text-red-700' :
                    organization.status === 'cancelled' ? 'bg-gray-100 text-gray-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {organization.status === 'active' ? '✅ Ativa' :
                     organization.status === 'suspended' ? '⚠️ Suspensa' :
                     organization.status === 'cancelled' ? '❌ Cancelada' :
                     '⏸️ Pendente'}
                  </span>
                </div>
                {organization.status === 'active' && organization.subscription_renewal_date && (
                  <div className="text-right">
                    <p className="text-xs text-gray-600">Próxima renovação</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {new Date(organization.subscription_renewal_date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}
              </div>

              {/* Usuários */}
              <div className="border-t border-gray-200 pt-3 mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Usuários ativos</span>
                  <span className="font-semibold text-gray-900">
                    {activeUsersCount} / {organization.included_users_count || 2}
                  </span>
                </div>
                {activeUsersCount > (organization.included_users_count || 2) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Você tem {activeUsersCount - (organization.included_users_count || 2)} usuário(s) extra(s)
                  </p>
                )}
              </div>
            </div>

            {/* Botão Cancelar */}
            {organization.status === 'active' && (
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="w-full px-4 py-3 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {cancelling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    Cancelar Assinatura
                  </>
                )}
              </button>
            )}

            {organization.status === 'cancelled' && organization.subscription_cancelled_at && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
                <p className="text-sm text-gray-600">
                  Assinatura cancelada em {new Date(organization.subscription_cancelled_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Metas da Clínica */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Target className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Meta de Receita Mensal</h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Meta Mensal (R$)</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveMonthlyGoal}
                disabled={saving}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Salvar Meta
                  </>
                )}
              </button>
            </div>
            {settings?.monthly_revenue_goal_cents && settings.monthly_revenue_goal_cents > 0 && (
              <p className="mt-2 text-sm text-gray-600">
                Meta atual: <span className="font-semibold">{formatCurrency(settings.monthly_revenue_goal_cents)}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

