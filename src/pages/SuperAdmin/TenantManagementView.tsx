import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../components/ui/Toast'
import {
  Building2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  Settings,
  Loader2,
  UserCheck,
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  status: 'pending_setup' | 'active' | 'suspended' | 'cancelled' | null
  subscription_plan_id: string | null
  subscription_renewal_date: string | null
  platform_fee_override_percent: number | null
  included_users_count: number | null
  created_at: string
}

interface SubscriptionPlan {
  id: string
  name: string
  base_price_cents: number
}

export function TenantManagementView() {
  const toast = useToast()
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [userCounts, setUserCounts] = useState<Map<string, number>>(new Map())
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([loadOrganizations(), loadPlans(), loadUserCounts()])
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      toast.error('Erro ao carregar clínicas')
    } finally {
      setLoading(false)
    }
  }

  const loadOrganizations = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, status, subscription_plan_id, subscription_renewal_date, platform_fee_override_percent, included_users_count, created_at')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrganizations((data || []) as Organization[])
    } catch (err) {
      console.error('Erro ao carregar organizações:', err)
    }
  }

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('id, name, base_price_cents')
        .eq('is_active', true)

      if (error) throw error
      setPlans((data || []) as SubscriptionPlan[])
    } catch (err) {
      console.error('Erro ao carregar planos:', err)
    }
  }

  const loadUserCounts = async () => {
    try {
      // Buscar contagem de usuários por clínica usando a função do banco ou query direta
      const { data: allOrgs } = await supabase
        .from('organizations')
        .select('id')

      if (!allOrgs) return

      const counts = new Map<string, number>()

      // Para cada clínica, contar usuários ativos
      for (const org of allOrgs) {
        try {
          const { data: countData, error: countError } = await supabase.rpc('count_active_users', {
            clinic_uuid: org.id,
          })

          if (!countError && countData !== null) {
            counts.set(org.id, countData)
          } else {
            // Fallback: contar diretamente
            const { data: profiles, error: profilesError } = await supabase
              .from('profiles')
              .select('id')
              .eq('clinic_id', org.id)
              .in('role', ['admin', 'clinic_owner', 'receptionist', 'professional'])

            if (!profilesError && profiles) {
              counts.set(org.id, profiles.length)
            }
          }
        } catch (err) {
          console.warn(`Erro ao contar usuários da clínica ${org.id}:`, err)
        }
      }

      setUserCounts(counts)
    } catch (err) {
      console.error('Erro ao carregar contagem de usuários:', err)
    }
  }

  const handleForceSubscription = async (clinicId: string) => {
    setProcessing(clinicId)
    try {
      // Buscar plano padrão
      const defaultPlan = plans[0]
      if (!defaultPlan) {
        toast.error('Nenhum plano ativo encontrado')
        return
      }

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          clinic_id: clinicId,
          plan_id: defaultPlan.id,
        },
      })

      if (error) throw error
      if (data?.error) throw new Error(data.error)

      toast.success('Assinatura criada com sucesso!')
      await loadOrganizations()
    } catch (err: any) {
      console.error('Erro ao forçar assinatura:', err)
      toast.error(err.message || 'Erro ao criar assinatura')
    } finally {
      setProcessing(null)
    }
  }

  const handleChangeStatus = async (clinicId: string, newStatus: 'active' | 'suspended' | 'pending_setup') => {
    setProcessing(clinicId)
    try {
      const { error } = await supabase
        .from('organizations')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', clinicId)

      if (error) throw error

      toast.success(`Status alterado para ${newStatus}`)
      await loadOrganizations()
    } catch (err: any) {
      console.error('Erro ao alterar status:', err)
      toast.error('Erro ao alterar status')
    } finally {
      setProcessing(null)
    }
  }

  const handleUpdateFeeOverride = async (clinicId: string, feePercent: number) => {
    setProcessing(clinicId)
    try {
      const feeCents = Math.round(feePercent * 100) // Converter para centésimos (5.00 -> 500)

      if (feeCents < 0 || feeCents > 1000) {
        toast.error('A taxa deve estar entre 0% e 10%')
        setProcessing(null)
        return
      }

      const { error } = await supabase
        .from('organizations')
        .update({
          platform_fee_override_percent: feeCents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', clinicId)

      if (error) throw error

      toast.success('Taxa atualizada com sucesso!')
      await loadOrganizations()
    } catch (err: any) {
      console.error('Erro ao atualizar taxa:', err)
      toast.error('Erro ao atualizar taxa')
    } finally {
      setProcessing(null)
    }
  }

  const handleImpersonate = async (clinicId: string) => {
    // TODO: Implementar impersonate via Edge Function
    toast.info('Funcionalidade de impersonate em desenvolvimento')
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('pt-BR')
  }

  const getStatusBadge = (status: string | null) => {
    const statusMap = {
      active: { color: 'bg-green-100 text-green-700', icon: CheckCircle, label: 'Ativa' },
      suspended: { color: 'bg-red-100 text-red-700', icon: XCircle, label: 'Suspensa' },
      pending_setup: { color: 'bg-yellow-100 text-yellow-700', icon: Clock, label: 'Pendente' },
      cancelled: { color: 'bg-gray-100 text-gray-700', icon: XCircle, label: 'Cancelada' },
    }

    const statusInfo = statusMap[status as keyof typeof statusMap] || {
      color: 'bg-gray-100 text-gray-700',
      icon: AlertCircle,
      label: status || 'Desconhecido',
    }

    const Icon = statusInfo.icon

    return (
      <span className={`text-xs font-semibold px-2 py-1 rounded-lg flex items-center gap-1 ${statusInfo.color}`}>
        <Icon className="h-3 w-3" />
        {statusInfo.label}
      </span>
    )
  }

  const filteredOrgs = useMemo(() => {
    if (filterStatus === 'all') return organizations
    return organizations.filter((org) => org.status === filterStatus)
  }, [organizations, filterStatus])

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Gestão de Clínicas</h2>
          <p className="text-sm text-gray-600">Controle de tenants, status e taxas</p>
        </div>

        {/* Filtro de Status */}
        <div className="flex items-center gap-2">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas</option>
            <option value="active">Ativas</option>
            <option value="pending_setup">Pendentes</option>
            <option value="suspended">Suspensas</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Tabela de Clínicas */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Clínica</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Status</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Usuários</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Renovação</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-gray-900">Taxa</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrgs.length > 0 ? (
                filteredOrgs.map((org) => {
                  const userCount = userCounts.get(org.id) || 0
                  const includedUsers = org.included_users_count || 2
                  const hasExtraUsers = userCount > includedUsers

                  return (
                    <tr key={org.id} className="border-b border-gray-100 hover:bg-white/50">
                      <td className="py-4 px-4">
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{org.name}</p>
                          <p className="text-xs text-gray-500">ID: {org.id.substring(0, 8)}...</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(org.status)}</td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-gray-600" />
                          <span className="text-sm text-gray-900">
                            {userCount} / {includedUsers}
                          </span>
                          {hasExtraUsers && (
                            <span className="text-xs text-amber-600 font-semibold">
                              (+{userCount - includedUsers} extra)
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-900">{formatDate(org.subscription_renewal_date)}</p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-900">
                          {org.platform_fee_override_percent !== null
                            ? `${(org.platform_fee_override_percent / 100).toFixed(2)}%`
                            : '5.99% (padrão)'}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Forçar Assinatura */}
                          {(org.status === 'pending_setup' || org.status === 'suspended') && (
                            <button
                              onClick={() => handleForceSubscription(org.id)}
                              disabled={processing === org.id}
                              className="px-3 py-1.5 rounded-lg bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition disabled:opacity-50 flex items-center gap-1"
                              title="Forçar Cobrança de Assinatura"
                            >
                              {processing === org.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <DollarSign className="h-3 w-3" />
                              )}
                              Assinar
                            </button>
                          )}

                          {/* Alterar Status */}
                          <select
                            value={org.status || 'pending_setup'}
                            onChange={(e) =>
                              handleChangeStatus(org.id, e.target.value as 'active' | 'suspended' | 'pending_setup')
                            }
                            disabled={processing === org.id}
                            className="px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-900 focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                          >
                            <option value="pending_setup">Pendente</option>
                            <option value="active">Ativar</option>
                            <option value="suspended">Suspender</option>
                          </select>

                          {/* Override de Taxa */}
                          <button
                            onClick={() => {
                              const newFee = prompt(
                                'Digite a nova taxa (ex: 5.99 para 5.99%):',
                                org.platform_fee_override_percent
                                  ? (org.platform_fee_override_percent / 100).toString()
                                  : '5.99'
                              )
                              if (newFee) {
                                handleUpdateFeeOverride(org.id, parseFloat(newFee))
                              }
                            }}
                            disabled={processing === org.id}
                            className="px-3 py-1.5 rounded-lg bg-purple-500 text-white text-xs font-semibold hover:bg-purple-600 transition disabled:opacity-50 flex items-center gap-1"
                            title="Override de Taxa (Apenas Super Admin)"
                          >
                            <Settings className="h-3 w-3" />
                            Taxa
                          </button>

                          {/* Impersonate */}
                          <button
                            onClick={() => handleImpersonate(org.id)}
                            className="px-3 py-1.5 rounded-lg bg-indigo-500 text-white text-xs font-semibold hover:bg-indigo-600 transition flex items-center gap-1"
                            title="Logar como Admin desta clínica"
                          >
                            <UserCheck className="h-3 w-3" />
                            Login
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-sm text-gray-600">
                    Nenhuma clínica encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
