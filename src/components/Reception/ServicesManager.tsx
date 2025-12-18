import { useState } from 'react'
import { Plus, Edit2, Trash2, Clock, DollarSign } from 'lucide-react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { useScheduler } from '../../context/SchedulerContext'
import { useToast } from '../ui/Toast'
import type { Service } from '../../context/SchedulerContext'

export function ServicesManager() {
  const { currentUser, services, addService, updateService, removeService } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)

  const clinicId = currentUser?.clinicId

  const handleCreate = () => {
    setEditingService({
      id: '',
      name: '',
      duration: 30,
      price: 0,
      tax_rate_percent: 0,
      category: '',
      professionalId: 'all',
    })
    setModalOpen(true)
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!clinicId) {
      toast.error('Clínica não identificada')
      return
    }

    if (!confirm('Tem certeza que deseja remover este serviço?')) {
      return
    }

    try {
      // Marcar como inativo em vez de deletar (soft delete)
      const { error } = await supabase
        .from('services')
        .update({ is_active: false })
        .eq('id', id)
        .eq('clinic_id', clinicId)

      if (error) throw error

      // Remover do contexto
      removeService(id)
      toast.success('Serviço removido com sucesso')
    } catch (err) {
      console.error('Erro ao remover serviço:', err)
      toast.error('Erro ao remover serviço')
    }
  }

  const handleSave = async (service: Service) => {
    if (!clinicId) {
      toast.error('Clínica não identificada')
      return
    }

    setLoading(true)
    try {
      if (service.id) {
        // Atualizar
        await updateService(service)
        toast.success('Serviço atualizado com sucesso')
      } else {
        // Criar novo
        await addService(service)
        toast.success('Serviço criado com sucesso')
      }
      setModalOpen(false)
      setEditingService(null)
    } catch (err) {
      console.error('Erro ao salvar serviço:', err)
      toast.error('Erro ao salvar serviço')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Gestão de Serviços</h3>
            <p className="text-sm text-gray-500">Cadastre e gerencie os serviços oferecidos pela clínica</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Serviço
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((service) => (
            <div
              key={service.id}
              className="bg-white/80 rounded-2xl border border-white/60 p-4 shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                  {service.category && (
                    <p className="text-xs text-gray-500 mt-1">{service.category}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="p-2 rounded-xl bg-white/80 border border-white/60 text-gray-800 hover:bg-white transition"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="p-2 rounded-xl bg-white/80 border border-white/60 text-red-600 hover:bg-white transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{service.duration} min</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3 w-3" />
                  <span>R$ {service.price.toFixed(2)}</span>
                </div>
                {(service as any).tax_rate_percent !== undefined && (service as any).tax_rate_percent !== null && (service as any).tax_rate_percent > 0 && (
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-500">Imposto: {(service as any).tax_rate_percent}%</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {services.length === 0 && (
            <div className="col-span-full text-center py-8">
              <p className="text-sm text-gray-500">Nenhum serviço cadastrado.</p>
            </div>
          )}
        </div>
      </div>

      {modalOpen && editingService && (
        <ServiceModal
          service={editingService}
          onClose={() => {
            setModalOpen(false)
            setEditingService(null)
          }}
          onSave={handleSave}
          loading={loading}
        />
      )}
    </>
  )
}

function ServiceModal({
  service,
  onSave,
  onClose,
  loading,
}: {
  service: Service
  onSave: (s: Service) => void
  onClose: () => void
  loading: boolean
}) {
  const { professionals } = useScheduler()
  const [draft, setDraft] = useState<Service>(service)

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {draft.id ? 'Editar Serviço' : 'Novo Serviço'}
          </p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Nome do Serviço *</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              placeholder="Ex: Consulta Dermatológica"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Preço (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={draft.price || ''}
                onChange={(e) => setDraft((p) => ({ ...p, price: e.target.value === '' ? 0 : Number(e.target.value) }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Duração (min) *</label>
              <select
                value={draft.duration}
                onChange={(e) => setDraft((p) => ({ ...p, duration: Number(e.target.value) }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              >
                {[15, 30, 45, 60, 75, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Taxa de Imposto (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={(draft as any).tax_rate_percent ?? ''}
                onChange={(e) => setDraft((p) => ({ ...p, tax_rate_percent: e.target.value === '' ? 0 : Number(e.target.value) } as any))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Porcentagem aplicada sobre o valor do serviço (ex: 5 = 5%)</p>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Categoria (opcional)</label>
            <input
              value={draft.category ?? ''}
              onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              placeholder="Ex: Consultas, Procedimentos, etc."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Profissional (opcional)</label>
            <select
              value={draft.professionalId ?? 'all'}
              onChange={(e) =>
                setDraft((p) => ({ ...p, professionalId: e.target.value === 'all' ? 'all' : e.target.value }))
              }
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            >
              <option value="all">Todos os profissionais</option>
              {professionals
                .filter((p) => p.id !== 'all')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
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
            disabled={loading || !draft.name || draft.price < 0 || draft.duration <= 0}
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

