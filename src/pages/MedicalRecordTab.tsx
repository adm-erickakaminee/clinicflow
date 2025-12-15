import { useEffect, useMemo, useState } from 'react'
import { FileText, Upload, X, AlertTriangle } from 'lucide-react'
import { createPortal } from 'react-dom'
import type { Anamnesis, MedicalDocument, MedicalForm, FormType } from '../context/SchedulerContext'

type Props = {
  client: {
    id: string
    name: string
    anamnesis?: Anamnesis
    documents?: MedicalDocument[]
    healthTags?: string[]
    forms?: MedicalForm[]
  }
  canEdit: boolean
  onSave: (data: Anamnesis) => void
  onAddDocument: (doc: MedicalDocument) => void
  onAddEvolution?: () => void
  onSaveHealthTags: (tags: string[]) => void
  onSaveForm: (form: MedicalForm) => void
}

const defaultConditions = { diabetes: false, hipertensao: false, cardiaco: false, gestante: false, fumante: false }

export function MedicalRecordTab({ client, canEdit, onSave, onAddDocument, onSaveHealthTags, onSaveForm }: Props) {
  const [anamnesis, setAnamnesis] = useState<Anamnesis>(() => ({
    allergies: client.anamnesis?.allergies || [],
    medications: client.anamnesis?.medications || [],
    surgeries: client.anamnesis?.surgeries || '',
    notes: client.anamnesis?.notes || '',
    complaint: client.anamnesis?.complaint || '',
    medicationsText: client.anamnesis?.medicationsText || '',
    conditions: { ...defaultConditions, ...(client.anamnesis?.conditions || {}) },
    updatedAt: client.anamnesis?.updatedAt,
    updatedBy: client.anamnesis?.updatedBy,
  }))
  const [newTag, setNewTag] = useState('')
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const [uploadName, setUploadName] = useState('')
  const [healthTags, setHealthTags] = useState<string[]>(client.healthTags || [])
  const [selectedModel, setSelectedModel] = useState<FormType>('general')
  const [formDraft, setFormDraft] = useState<Record<string, any>>({})
  const [savingForm, setSavingForm] = useState(false)

  useEffect(() => {
    setAnamnesis({
      allergies: client.anamnesis?.allergies || [],
      medications: client.anamnesis?.medications || [],
      surgeries: client.anamnesis?.surgeries || '',
      notes: client.anamnesis?.notes || '',
      complaint: client.anamnesis?.complaint || '',
      medicationsText: client.anamnesis?.medicationsText || '',
      conditions: { ...defaultConditions, ...(client.anamnesis?.conditions || {}) },
      updatedAt: client.anamnesis?.updatedAt,
      updatedBy: client.anamnesis?.updatedBy,
    })
    setDirty(false)
    setHealthTags(client.healthTags || [])
  }, [client])

  const documents = client.documents ?? []

  const handleAddTag = () => {
    if (!newTag.trim()) return
    setAnamnesis((prev) => ({ ...prev, allergies: [...(prev.allergies || []), newTag.trim()] }))
    setNewTag('')
    setDirty(true)
  }

  const handleSave = async () => {
    if (!dirty) return
    setSaving(true)
    await Promise.resolve(onSave(anamnesis))
    setSaving(false)
    setDirty(false)
  }

  const handleAddDoc = () => {
    if (!uploadName.trim()) return
    onAddDocument({
      id: '',
      name: uploadName.trim(),
      date: new Date().toISOString(),
      url: '#',
    })
    setUploadName('')
  }

  const handleSaveTags = () => {
    onSaveHealthTags(healthTags)
  }

  const handleSaveForm = async (status: 'draft' | 'active') => {
    setSavingForm(true)
    await Promise.resolve(
      onSaveForm({
        id: String(Date.now()),
        type: selectedModel,
        date: new Date().toISOString(),
        content: formDraft,
        signedFileUrl: status === 'active' ? '#pdf' : null,
        status: status === 'active' ? 'active' : 'draft',
        professionalId: undefined,
      })
    )
    setSavingForm(false)
  }

  const lastSigned = useMemo(() => {
    const actives = (client.forms || []).filter((f) => f.status === 'active' && f.signedFileUrl)
    if (!actives.length) return null
    return actives.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0]
  }, [client.forms])

  const needsRenew = useMemo(() => {
    if (!lastSigned) return true
    const diff = Date.now() - new Date(lastSigned.date).getTime()
    const days = diff / (1000 * 60 * 60 * 24)
    return days > 180
  }, [lastSigned])

  const timeline = useMemo(() => [...(client.forms || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [client.forms])

  const conditionsList = useMemo(
    () => [
      { key: 'diabetes', label: 'Diabetes' },
      { key: 'hipertensao', label: 'Hipertensão' },
      { key: 'cardiaco', label: 'Cardíaco' },
      { key: 'gestante', label: 'Gestante' },
      { key: 'fumante', label: 'Fumante' },
    ],
    []
  )

  const healthTagOptions = ['Diabetes', 'Hipertensão', 'Marca-passo', 'Lactante']

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      {/* Alertas e tags globais */}
      <div className="xl:col-span-3 space-y-3">
        {needsRenew && (
          <div className="rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">
              A ficha deste cliente está desatualizada
              {lastSigned ? ` (última: ${new Date(lastSigned.date).toLocaleDateString()})` : ''}. Por favor, atualize.
            </p>
          </div>
        )}
        <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Alertas de Saúde</p>
            {canEdit && (
              <button
                onClick={handleSaveTags}
                className="px-3 py-1.5 rounded-xl bg-gray-900 text-white text-xs font-semibold shadow-sm"
              >
                Salvar tags
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {healthTags.map((t, idx) => (
              <span
                key={idx}
                className="px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-700 text-xs font-semibold flex items-center gap-1"
              >
                {t}
                {canEdit && (
                  <button
                    onClick={() => setHealthTags((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-amber-600 hover:text-amber-800"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {canEdit && (
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => {
                    const val = e.target.value
                    if (val && !healthTags.includes(val)) setHealthTags((prev) => [...prev, val])
                  }}
                  defaultValue=""
                  className="rounded-xl bg-white/70 border border-white/60 px-3 py-1.5 text-xs text-gray-900"
                >
                  <option value="">+ Adicionar</option>
                  {healthTagOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Anamnese Digital */}
      <div className="xl:col-span-2 space-y-3">
        <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Anamnese Digital</p>
            <div className="text-[11px] text-gray-500">
              Última atualização:{' '}
              {anamnesis.updatedAt
                ? `${new Date(anamnesis.updatedAt).toLocaleString()} • ${anamnesis.updatedBy ?? ''}`
                : '—'}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Queixa Principal</p>
            <textarea
              disabled={!canEdit}
              value={anamnesis.complaint}
              onChange={(e) => {
                setAnamnesis((p) => ({ ...p, complaint: e.target.value }))
                setDirty(true)
              }}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Histórico de Saúde</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {conditionsList.map((c) => (
                <label key={c.key} className="flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    disabled={!canEdit}
                    checked={!!anamnesis.conditions?.[c.key as keyof typeof defaultConditions]}
                    onChange={(e) => {
                      setAnamnesis((p) => ({
                        ...p,
                        conditions: { ...p.conditions, [c.key]: e.target.checked },
                      }))
                      setDirty(true)
                    }}
                    className="rounded border-gray-300"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Alergias (tags)</p>
            <div className="flex flex-wrap gap-2">
              {(anamnesis.allergies || []).map((tag, idx) => (
                <span key={idx} className="px-2 py-1 rounded-lg border border-amber-200 bg-amber-100 text-amber-800 text-xs font-semibold">
                  {tag}
                </span>
              ))}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddTag()
                    }
                  }}
                  placeholder="Digite e Enter"
                  className="flex-1 rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                />
                <button
                  onClick={handleAddTag}
                  className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10"
                >
                  Adicionar
                </button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Medicamentos em uso</p>
            <textarea
              disabled={!canEdit}
              value={anamnesis.medicationsText}
              onChange={(e) => {
                setAnamnesis((p) => ({ ...p, medicationsText: e.target.value }))
                setDirty(true)
              }}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              rows={3}
            />
          </div>

          {canEdit && (
            <div className="flex justify-end">
              <button
                onClick={handleSave}
                disabled={!dirty || saving}
                className={`px-4 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-black/10 ${
                  dirty ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Documentação & Arquivo morto */}
      <div className="space-y-3">
        <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-900">Documentação & Assinatura</p>
          <button
            onClick={() => setShowPrint(true)}
            className="w-full px-4 py-3 rounded-xl bg-white/80 border border-white/60 text-sm font-semibold text-gray-900 shadow-sm flex items-center gap-2 justify-center"
          >
            📄 Gerar ficha para assinatura
          </button>
          <button
            onClick={() => setShowPrint(true)}
            className="w-full px-4 py-3 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-2 justify-center"
          >
            📤 Enviar por WhatsApp
          </button>
        </div>

        <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-gray-700" />
            <p className="text-sm font-semibold text-gray-900">Documentos assinados</p>
          </div>
          <div className="flex gap-2">
            <input
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Nome do arquivo"
              className="flex-1 rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
            <button
              onClick={handleAddDoc}
              className="px-3 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10"
            >
              Upload
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm shadow-sm">
                <div className="flex items-center gap-2 text-gray-800">
                  <FileText className="h-4 w-4" />
                  <div>
                    <p className="font-semibold">{doc.name}</p>
                    <p className="text-[11px] text-gray-500">{new Date(doc.date).toLocaleString()}</p>
                  </div>
                </div>
                <a className="text-xs font-semibold text-gray-900 underline" href={doc.url || '#'} target="_blank" rel="noreferrer">
                  Abrir
                </a>
              </div>
            ))}
            {documents.length === 0 && <p className="text-sm text-gray-600">Nenhum documento enviado.</p>}
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Nova ficha (Template)</p>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-700">Selecionar modelo</p>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as FormType)}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            >
              <option value="general">Padrão / Corporal</option>
              <option value="invasive">Estética Invasiva (Facial)</option>
              <option value="capillary">Capilar (Tricologia)</option>
            </select>
          </div>
          <div className="space-y-2">
            {selectedModel === 'general' && (
              <div className="space-y-2 text-sm text-gray-800">
                <CheckboxRow label="Má circulação / varizes" field="circulacao" formDraft={formDraft} setFormDraft={setFormDraft} />
                <CheckboxRow label="Retenção de líquido" field="retencao" formDraft={formDraft} setFormDraft={setFormDraft} />
                <TextareaRow label="Observações corporais" field="obsCorpo" formDraft={formDraft} setFormDraft={setFormDraft} />
              </div>
            )}
            {selectedModel === 'invasive' && (
              <div className="space-y-2 text-sm text-gray-800">
                <CheckboxRow label="Botox anterior" field="botox" formDraft={formDraft} setFormDraft={setFormDraft} />
                <CheckboxRow label="Preenchimentos prévios" field="preenchimento" formDraft={formDraft} setFormDraft={setFormDraft} />
                <CheckboxRow label="Uso de ácidos" field="acidos" formDraft={formDraft} setFormDraft={setFormDraft} />
                <CheckboxRow label="Roacutan atual" field="roacutan" formDraft={formDraft} setFormDraft={setFormDraft} />
                <TextareaRow label="Objetivo do paciente" field="objetivo" formDraft={formDraft} setFormDraft={setFormDraft} />
              </div>
            )}
            {selectedModel === 'capillary' && (
              <div className="space-y-2 text-sm text-gray-800">
                <CheckboxRow label="Queda de cabelo" field="queda" formDraft={formDraft} setFormDraft={setFormDraft} />
                <CheckboxRow label="Oleosidade" field="oleosidade" formDraft={formDraft} setFormDraft={setFormDraft} />
                <CheckboxRow label="Químicas usadas" field="quimicas" formDraft={formDraft} setFormDraft={setFormDraft} />
                <CheckboxRow label="Questões de tireoide" field="tireoide" formDraft={formDraft} setFormDraft={setFormDraft} />
                <TextareaRow label="Notas capilares" field="notasCapilar" formDraft={formDraft} setFormDraft={setFormDraft} />
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleSaveForm('draft')}
              disabled={savingForm}
              className="px-4 py-2 rounded-xl bg-white/80 border border-white/60 text-sm font-semibold text-gray-900 shadow-sm"
            >
              {savingForm ? 'Salvando...' : 'Salvar rascunho'}
            </button>
            <button
              onClick={() => handleSaveForm('active')}
              disabled={savingForm}
              className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-500/20"
            >
              {savingForm ? 'Gerando...' : 'Gerar PDF para assinatura'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Histórico completo</p>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {timeline.map((f) => (
              <div key={f.id} className="rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm shadow-sm flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {f.type} • {f.status}
                  </p>
                  <p className="text-[11px] text-gray-500">{new Date(f.date).toLocaleString()}</p>
                </div>
                {f.signedFileUrl ? (
                  <a href={f.signedFileUrl} className="text-xs font-semibold text-gray-900 underline" target="_blank" rel="noreferrer">
                    PDF
                  </a>
                ) : (
                  <span className="text-[11px] text-gray-500">Sem PDF</span>
                )}
              </div>
            ))}
            {timeline.length === 0 && <p className="text-sm text-gray-600">Sem fichas anteriores.</p>}
          </div>
        </div>
      </div>

      {showPrint &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6 print:p-0">
              <button className="absolute right-3 top-3 text-gray-500" onClick={() => setShowPrint(false)}>
                <X className="h-5 w-5" />
              </button>
              <div className="print:bg-white print:text-black">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-semibold text-gray-900">Clínica Exemplo</p>
                    <p className="text-sm text-gray-600">Ficha de Anamnese</p>
                  </div>
                  <p className="text-sm text-gray-600">Data: {new Date().toLocaleDateString()}</p>
                </div>
                <div className="space-y-2 text-sm text-gray-800">
                  <p><strong>Paciente:</strong> {client.name}</p>
                  <p><strong>Queixa:</strong> {anamnesis.complaint || '—'}</p>
                  <p><strong>Alergias:</strong> {(anamnesis.allergies || []).join(', ') || '—'}</p>
                  <p><strong>Medicamentos:</strong> {anamnesis.medicationsText || '—'}</p>
                  <p><strong>Observações:</strong> {anamnesis.notes || '—'}</p>
                </div>
                <div className="mt-6 h-24 border-t border-dashed border-gray-300 flex items-end">
                  <p className="text-sm text-gray-600">Assinatura do paciente</p>
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10"
                  >
                    Imprimir / Salvar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}

function CheckboxRow({
  label,
  field,
  formDraft,
  setFormDraft,
}: {
  label: string
  field: string
  formDraft: Record<string, any>
  setFormDraft: React.Dispatch<React.SetStateAction<Record<string, any>>>
}) {
  const checked = !!formDraft[field]
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setFormDraft((p) => ({ ...p, [field]: e.target.checked }))}
        className="rounded border-gray-300"
      />
      {label}
    </label>
  )
}

function TextareaRow({
  label,
  field,
  formDraft,
  setFormDraft,
}: {
  label: string
  field: string
  formDraft: Record<string, any>
  setFormDraft: React.Dispatch<React.SetStateAction<Record<string, any>>>
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <textarea
        value={formDraft[field] || ''}
        onChange={(e) => setFormDraft((p) => ({ ...p, [field]: e.target.value }))}
        className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
        rows={3}
      />
    </div>
  )
}

