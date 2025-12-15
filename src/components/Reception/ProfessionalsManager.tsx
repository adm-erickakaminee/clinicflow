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

  const handleDelete = async (id: string) => {
    if (!clinicId) {
      toast.error('Clínica não identificada')
      return
    }

    if (!confirm('Tem certeza que deseja remover este profissional?')) {
      return
    }

    try {
      // Buscar o professional_id do profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('professional_id')
        .eq('id', id)
        .single()

      if (profile?.professional_id) {
        // Deletar da tabela professionals
        const { error: profError } = await supabase
          .from('professionals')
          .delete()
          .eq('id', profile.professional_id)
          .eq('clinic_id', clinicId)

        if (profError) throw profError
      }

      // Remover do contexto
      removeProfessional(id)
      toast.success('Profissional removido com sucesso')
    } catch (err) {
      console.error('Erro ao remover profissional:', err)
      toast.error('Erro ao remover profissional')
    }
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
                    onClick={() => handleDelete(prof.id)}
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
    </>
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
  const [draft, setDraft] = useState<SchedulerProfessional>(professional)

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {draft.id ? 'Editar Profissional' : 'Novo Profissional'}
          </p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="space-y-3">
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
            <label className="text-xs font-semibold text-gray-700">Especialidade / Cargo *</label>
            <input
              value={draft.specialty}
              onChange={(e) => setDraft((p) => ({ ...p, specialty: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              placeholder="Ex: Dermatologista"
            />
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
        <div className="flex justify-end gap-2 pt-4 border-t border-white/60">
          <button
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 disabled:opacity-50"
            onClick={() => onSave(draft)}
            disabled={loading || !draft.name || !draft.specialty}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

