import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useToast } from '../ui/Toast'

type Props = {
  isOpen: boolean
  onClose: () => void
  appointmentId: string
  patientName: string
  onSave: (medicalNotes: string) => Promise<void>
}

export function FinishAppointmentModal({ isOpen, onClose, patientName, onSave }: Props) {
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  if (!isOpen) return null

  const handleSave = async () => {
    if (!notes.trim()) {
      toast.error('Por favor, adicione observações sobre o atendimento')
      return
    }

    setSaving(true)
    try {
      await onSave(notes)
      toast.success('Atendimento finalizado com sucesso!')
      setNotes('')
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Erro ao finalizar atendimento')
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="relative w-full max-w-lg rounded-3xl bg-white/80 backdrop-blur-xl border border-white/60 shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Resumo do Atendimento</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-gray-600">
            Paciente: <span className="font-semibold text-gray-900">{patientName}</span>
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">
            Observações / Evolução do dia
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Descreva o atendimento, procedimentos realizados, evolução do paciente..."
            className="w-full h-32 rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 resize-none"
          />
        </div>

        <div className="flex items-center gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !notes.trim()}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/60 border-t-transparent rounded-full animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar e Liberar Paciente'
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

