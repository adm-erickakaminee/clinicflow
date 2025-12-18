import { useState } from 'react'
import { Plus, Edit2, Trash2, User } from 'lucide-react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useScheduler } from '../../context/SchedulerContext'
import { useToast } from '../ui/Toast'
import type { SchedulerProfessional } from '../../context/SchedulerContext'

export function ProfessionalsManager() {
  const { currentUser, professionals, addProfessional, updateProfessional, removeProfessional } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProfessional, setEditingProfessional] = useState<SchedulerProfessional | null>(null)

  const clinicId = currentUser?.clinicId

  const handleCreate = () => {
    setEditingProfessional({
      id: '',
      name: '',
      specialty: '',
      avatar: '',
      color: '#6366f1',
    })
    setModalOpen(true)
  }

  const handleEdit = (prof: SchedulerProfessional) => {
    setEditingProfessional(prof)
    setModalOpen(true)
  }

  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [professionalToDelete, setProfessionalToDelete] = useState<{ id: string; name: string; isPaidSlot?: boolean } | null>(null)

  const handleDelete = async () => {
    if (!clinicId || !professionalToDelete) {
      toast.error('Clínica não identificada')
      return
    }

    setLoading(true)
    try {
      // Buscar o professional_id do profile e verificar se é vaga paga
      const { data: profile } = await supabase
        .from('profiles')
        .select('professional_id, asaas_wallet_id')
        .eq('id', professionalToDelete.id)
        .maybeSingle()

      if (profile?.professional_id) {
        // Se for vaga paga (tem asaas_wallet_id e não é a dona), cancelar recorrência no Asaas
        const isPaidSlot = profile.asaas_wallet_id && professionalToDelete.isPaidSlot
        if (isPaidSlot) {
          try {
            // TODO: Chamar Edge Function para cancelar recorrência no Asaas
            // Por enquanto, apenas log
            console.log('⚠️ Vaga paga detectada - recorrência deve ser cancelada no Asaas:', {
              professionalId: profile.professional_id,
              walletId: profile.asaas_wallet_id
            })
            toast.info('Cancelando recorrência da vaga paga no Asaas...')
          } catch (asaasError) {
            console.error('Erro ao cancelar recorrência Asaas:', asaasError)
            // Continuar com exclusão mesmo se falhar cancelamento
          }
        }

        // Deletar da tabela professionals
        const { error: profError } = await supabase
          .from('professionals')
          .delete()
          .eq('id', profile.professional_id)
          .eq('clinic_id', clinicId)

        if (profError) throw profError
      }

      // Remover do contexto
      removeProfessional(professionalToDelete.id)
      toast.success('Profissional removido com sucesso')
      setDeleteModalOpen(false)
      setProfessionalToDelete(null)
    } catch (err) {
      console.error('Erro ao remover profissional:', err)
      toast.error('Erro ao remover profissional')
    } finally {
      setLoading(false)
    }
  }

  const openDeleteModal = (prof: SchedulerProfessional) => {
    // Verificar se é vaga paga (pode ser verificado via asaas_wallet_id ou outro campo)
    const isPaidSlot = false // TODO: Implementar lógica para verificar se é vaga paga
    setProfessionalToDelete({ id: prof.id, name: prof.name, isPaidSlot })
    setDeleteModalOpen(true)
  }

  const handleSave = async (prof: SchedulerProfessional) => {
    if (!clinicId) {
      toast.error('Clínica não identificada')
      return
    }

    setLoading(true)
    try {
      if (prof.id) {
        // Atualizar
        await updateProfessional(prof)
        toast.success('Profissional atualizado com sucesso')
      } else {
        // Criar novo
        await addProfessional(prof)
        toast.success('Profissional criado com sucesso')
      }
      setModalOpen(false)
      setEditingProfessional(null)
    } catch (err) {
      console.error('Erro ao salvar profissional:', err)
      toast.error('Erro ao salvar profissional')
    } finally {
      setLoading(false)
    }
  }

  const colorOptions = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7', '#ec4899', '#8b5cf6']

  return (
    <>
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gestão de Profissionais</h3>
            <p className="text-sm text-gray-500">Cadastre e gerencie os profissionais da clínica</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Profissional
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {professionals
            .filter((p) => p.id !== 'all')
            .map((prof) => (
              <div
                key={prof.id}
                className="bg-white/80 rounded-2xl border border-white/60 p-4 shadow-sm flex items-center gap-3"
              >
                <div className="h-12 w-12 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                  {prof.avatar ? (
                    <img src={prof.avatar} alt={prof.name} className="h-full w-full object-cover" />
                  ) : (
                    <User className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{prof.name}</p>
                  <p className="text-xs text-gray-600 truncate">{prof.specialty || 'Sem especialidade'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-white/60"
                    style={{ background: prof.color || '#6366f1' }}
                  />
                  <button
                    onClick={() => handleEdit(prof)}
                    className="p-2 rounded-xl bg-white/80 border border-white/60 text-gray-800 hover:bg-white transition"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => openDeleteModal(prof)}
                    className="p-2 rounded-xl bg-white/80 border border-white/60 text-red-600 hover:bg-white transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          {professionals.filter((p) => p.id !== 'all').length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-sm text-gray-500">Nenhum profissional cadastrado.</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && editingProfessional && (
        <ProfessionalModal
          professional={editingProfessional}
          colors={colorOptions}
          onClose={() => {
            setModalOpen(false)
            setEditingProfessional(null)
          }}
          onSave={handleSave}
          loading={loading}
        />
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteModalOpen && professionalToDelete && (
        <DeleteProfessionalModal
          professionalName={professionalToDelete.name}
          isPaidSlot={professionalToDelete.isPaidSlot}
          onConfirm={handleDelete}
          onCancel={() => {
            setDeleteModalOpen(false)
            setProfessionalToDelete(null)
          }}
          loading={loading}
        />
      )}
    </>
  )
}

function DeleteProfessionalModal({
  professionalName,
  isPaidSlot,
  onConfirm,
  onCancel,
  loading,
}: {
  professionalName: string
  isPaidSlot?: boolean
  onConfirm: () => void
  onCancel: () => void
  loading: boolean
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center px-4">
      <div className="relative bg-white border border-gray-200 shadow-2xl rounded-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
            <Trash2 className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Excluir Profissional</h3>
            <p className="text-sm text-gray-600">Esta ação não pode ser desfeita</p>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-sm text-gray-900 mb-2">
            Tem certeza que deseja remover <strong>{professionalName}</strong>?
          </p>
          {isPaidSlot && (
            <p className="text-sm text-yellow-800 mt-2">
              ⚠️ Esta é uma vaga paga (R$ 29,90/mês). A recorrência será cancelada no próximo ciclo.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-white/60">
          <button
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold"
            onClick={onCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold shadow-lg shadow-black/10 disabled:opacity-50"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Excluindo...' : 'Sim, excluir'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

function ProfessionalModal({
  professional,
  colors,
  onSave,
  onClose,
  loading,
}: {
  professional: SchedulerProfessional
  colors: string[]
  onSave: (p: SchedulerProfessional) => void
  onClose: () => void
  loading: boolean
}) {
  // Inicializar work_schedule se não existir
  const initializeWorkSchedule = () => {
    const existing = (professional as any)?.work_schedule
    if (existing && typeof existing === 'object') {
      return existing
    }
    // Padrão: Seg-Sex 09:00-18:00
    const defaultSchedule = {
      enabled: true,
      startTime: '09:00',
      endTime: '18:00',
      hasBreak: true,
      breakStart: '12:00',
      breakEnd: '13:00',
    }
    return {
      1: defaultSchedule, // Segunda
      2: defaultSchedule, // Terça
      3: defaultSchedule, // Quarta
      4: defaultSchedule, // Quinta
      5: defaultSchedule, // Sexta
      6: { enabled: false, startTime: '09:00', endTime: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' }, // Sábado
      0: { enabled: false, startTime: '09:00', endTime: '18:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' }, // Domingo
    }
  }

  const [draft, setDraft] = useState<SchedulerProfessional & { 
    email?: string
    password?: string
    cpf?: string
    whatsapp?: string
    commissionModel?: 'commissioned' | 'rental' | 'hybrid'
    commissionRate?: number
    rentalBaseCents?: number
    rentalDueDay?: number
    work_schedule?: Record<number, {
      enabled: boolean
      startTime: string
      endTime: string
      hasBreak: boolean
      breakStart: string
      breakEnd: string
    }>
  }>({
    ...professional,
    commissionModel: (professional as any).commissionModel || 'commissioned',
    commissionRate: (professional as any).commissionRate || 0,
    rentalBaseCents: (professional as any).rentalBaseCents || 0,
    rentalDueDay: (professional as any).rentalDueDay || 5,
    work_schedule: initializeWorkSchedule(),
  })

  const isHybrid = draft.commissionModel === 'hybrid'
  const isRental = draft.commissionModel === 'rental'

  return createPortal(
    <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center px-4 overflow-y-auto py-8">
      <div className="relative bg-white border border-gray-200 shadow-2xl rounded-2xl w-full max-w-2xl p-6 space-y-4 my-auto">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {draft.id ? 'Editar Profissional' : 'Novo Profissional'}
          </p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>
        
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Dados Básicos */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 border-b border-gray-200 pb-2">
              Dados Básicos
            </h4>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Nome Completo *</label>
              <input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                placeholder="Ex: Dr. João Silva"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Cargo / Especialidade *</label>
              <input
                value={draft.specialty}
                onChange={(e) => setDraft((p) => ({ ...p, specialty: e.target.value }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                placeholder="Ex: Dermatologista"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">CPF *</label>
                <input
                  value={draft.cpf || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setDraft((p) => ({ ...p, cpf: value }))
                  }}
                  maxLength={11}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                  placeholder="00000000000"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">WhatsApp *</label>
                <input
                  value={draft.whatsapp || ''}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '')
                    setDraft((p) => ({ ...p, whatsapp: value }))
                  }}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                  placeholder="11999999999"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">E-mail *</label>
                <input
                  type="email"
                  value={draft.email || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, email: e.target.value }))}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                  placeholder="profissional@email.com"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Senha *</label>
                <input
                  type="password"
                  value={draft.password || ''}
                  onChange={(e) => setDraft((p) => ({ ...p, password: e.target.value }))}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Avatar (URL - opcional)</label>
              <input
                value={draft.avatar}
                onChange={(e) => setDraft((p) => ({ ...p, avatar: e.target.value }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                placeholder="https://..."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Cor na Agenda</label>
              <div className="flex items-center gap-2 flex-wrap">
                {colors.map((c) => (
                  <button
                    key={c}
                    onClick={() => setDraft((p) => ({ ...p, color: c }))}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      draft.color === c ? 'ring-2 ring-gray-900 scale-110' : 'border-white/60'
                    }`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Comissionamento - O que o PROFISSIONAL PAGA para a CLÍNICA */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Comissionamento</h4>
              <p className="text-xs text-gray-500 mt-1">Configure o que este profissional <strong>paga para a clínica</strong> sobre cada serviço</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Tipo *</label>
              <select
                value={draft.commissionModel || 'commissioned'}
                onChange={(e) => setDraft((p) => ({ 
                  ...p, 
                  commissionModel: e.target.value as 'commissioned' | 'rental' | 'hybrid' 
                }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              >
                <option value="commissioned">Porcentagem (%)</option>
                <option value="rental">Fixo Mensal (R$)</option>
                <option value="hybrid">Híbrido (Fixo + %)</option>
              </select>
            </div>

            {/* Campos condicionais baseados no modelo */}
            {(draft.commissionModel === 'commissioned' || isHybrid) && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">
                  Percentual que o Profissional Paga para a Clínica (%) {isHybrid ? '(Split em Tempo Real)' : '*'}
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={draft.commissionRate || 0}
                  onChange={(e) => setDraft((p) => ({ ...p, commissionRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                  placeholder="Ex: 30"
                />
                <p className="text-xs text-gray-500">
                  Ex: 30% = o profissional paga 30% para a clínica e recebe 70% do valor líquido
                </p>
              </div>
            )}

            {(isRental || isHybrid) && (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">
                    Valor Fixo Mensal (R$) {isHybrid ? '(Cobrança Ativa)' : '*'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.rentalBaseCents ? (draft.rentalBaseCents / 100).toFixed(2) : ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0
                      setDraft((p) => ({ ...p, rentalBaseCents: Math.round(value * 100) }))
                    }}
                    className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                    placeholder="Ex: 500.00"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-700">Dia de Vencimento (1-28) *</label>
                  <input
                    type="number"
                    min="1"
                    max="28"
                    value={draft.rentalDueDay || 5}
                    onChange={(e) => setDraft((p) => ({ ...p, rentalDueDay: parseInt(e.target.value) || 5 }))}
                    className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                    placeholder="Ex: 5"
                  />
                  <p className="text-xs text-gray-500">
                    Data em que a cobrança fixa será gerada automaticamente
                  </p>
                </div>
              </>
            )}

            {/* Explicação do modelo híbrido */}
            {isHybrid && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-xs text-gray-700">
                <p className="font-semibold mb-1">💡 Como funciona o Híbrido:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li><strong>Split em Tempo Real:</strong> A cada serviço, você recebe a % configurada direto na sua conta.</li>
                  <li><strong>Cobrança Fixa:</strong> No dia {draft.rentalDueDay || 5} de cada mês, será gerado um link de pagamento de R$ {draft.rentalBaseCents ? (draft.rentalBaseCents / 100).toFixed(2) : '0.00'}.</li>
                </ul>
              </div>
            )}
          </div>

          {/* Jornada de Trabalho - Horários por Dia */}
          <div className="space-y-3 pt-4 border-t border-gray-200">
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Jornada de Trabalho</h4>
              <p className="text-xs text-gray-500 mt-1">Configure os horários de trabalho para cada dia da semana</p>
            </div>
            
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6, 0].map((dayIndex) => {
                const dayNames = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']
                const schedule = draft.work_schedule?.[dayIndex] || {
                  enabled: false,
                  startTime: '09:00',
                  endTime: '18:00',
                  hasBreak: false,
                  breakStart: '12:00',
                  breakEnd: '13:00',
                }

                return (
                  <div key={dayIndex} className="border border-gray-200 rounded-xl p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={schedule.enabled}
                          onChange={(e) => {
                            setDraft((p) => ({
                              ...p,
                              work_schedule: {
                                ...(p.work_schedule || {}),
                                [dayIndex]: { ...schedule, enabled: e.target.checked },
                              },
                            }))
                          }}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm font-medium text-gray-900">{dayNames[dayIndex]}</span>
                      </label>
                      {schedule.enabled && (
                        <button
                          type="button"
                          onClick={() => {
                            setDraft((p) => ({
                              ...p,
                              work_schedule: {
                                ...(p.work_schedule || {}),
                                [dayIndex]: { ...schedule, enabled: false },
                              },
                            }))
                          }}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Remover jornada
                        </button>
                      )}
                    </div>

                    {schedule.enabled && (
                      <div className="space-y-2 pl-6">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="text-xs text-gray-600">Início</label>
                            <input
                              type="time"
                              value={schedule.startTime}
                              onChange={(e) => {
                                setDraft((p) => ({
                                  ...p,
                                  work_schedule: {
                                    ...(p.work_schedule || {}),
                                    [dayIndex]: { ...schedule, startTime: e.target.value },
                                  },
                                }))
                              }}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                              style={{ fontSize: '16px' }}
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Fim</label>
                            <input
                              type="time"
                              value={schedule.endTime}
                              onChange={(e) => {
                                setDraft((p) => ({
                                  ...p,
                                  work_schedule: {
                                    ...(p.work_schedule || {}),
                                    [dayIndex]: { ...schedule, endTime: e.target.value },
                                  },
                                }))
                              }}
                              className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                              style={{ fontSize: '16px' }}
                            />
                          </div>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={schedule.hasBreak}
                            onChange={(e) => {
                              setDraft((p) => ({
                                ...p,
                                work_schedule: {
                                  ...(p.work_schedule || {}),
                                  [dayIndex]: { ...schedule, hasBreak: e.target.checked },
                                },
                              }))
                            }}
                            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <span className="text-xs text-gray-700">Intervalo de Almoço</span>
                        </label>

                        {schedule.hasBreak && (
                          <div className="grid grid-cols-2 gap-2 pl-6">
                            <div>
                              <label className="text-xs text-gray-600">Início</label>
                              <input
                                type="time"
                                value={schedule.breakStart}
                                onChange={(e) => {
                                  setDraft((p) => ({
                                    ...p,
                                    work_schedule: {
                                      ...(p.work_schedule || {}),
                                      [dayIndex]: { ...schedule, breakStart: e.target.value },
                                    },
                                  }))
                                }}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                style={{ fontSize: '16px' }}
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-600">Fim</label>
                              <input
                                type="time"
                                value={schedule.breakEnd}
                                onChange={(e) => {
                                  setDraft((p) => ({
                                    ...p,
                                    work_schedule: {
                                      ...(p.work_schedule || {}),
                                      [dayIndex]: { ...schedule, breakEnd: e.target.value },
                                    },
                                  }))
                                }}
                                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
                                style={{ fontSize: '16px' }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
          <button
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 disabled:opacity-50"
            onClick={() => {
              // Preparar payload com todos os campos necessários
              const payload: any = {
                ...draft,
                commissionModel: draft.commissionModel,
                commissionRate: draft.commissionRate,
                rentalBaseCents: draft.rentalBaseCents,
                rentalDueDay: draft.rentalDueDay,
                work_schedule: draft.work_schedule,
                email: draft.email,
                password: draft.password,
                cpf: draft.cpf,
                whatsapp: draft.whatsapp,
              }
              onSave(payload)
            }}
            disabled={
              loading || 
              !draft.name || 
              !draft.specialty || 
              !draft.email || 
              !draft.password || 
              !draft.cpf || 
              !draft.whatsapp ||
              ((draft.commissionModel === 'commissioned' || isHybrid) && (!draft.commissionRate || draft.commissionRate <= 0)) ||
              ((isRental || isHybrid) && (!draft.rentalBaseCents || draft.rentalBaseCents <= 0))
            }
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

