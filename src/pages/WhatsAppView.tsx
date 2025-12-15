import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Clock4, AlertTriangle, Phone, MessageCircle } from 'lucide-react'
import { addMonths, format, isSameMonth, isToday, isTomorrow, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useScheduler } from '../context/SchedulerContext'

type TemplateKey = 'confirm' | 'recall' | 'rescue' | 'birthday'

const templates: Record<TemplateKey, string> = {
  confirm: 'Olá [Nome], confirmamos seu horário hoje às [Hora]. Qualquer dúvida, estamos à disposição!',
  recall: 'Olá [Nome], já faz 6 meses da sua última visita! Vamos cuidar da saúde?',
  rescue: 'Olá [Nome], vi que houve um imprevisto. Vamos reagendar?',
  birthday: 'Parabéns [Nome]! Temos um presente para você...',
}

type TabKey = 'confirmations' | 'recalls' | 'rescues' | 'birthdays'

function generateMessage(template: TemplateKey, data: { patient?: string; title?: string; start?: string }, professionalName?: string) {
  const nome = data.patient || data.title || 'Paciente'
  const hora = data.start ? format(new Date(data.start), 'HH:mm') : '[Hora]'
  const medico = professionalName || 'nosso profissional'

  return templates[template].replace('[Nome]', nome).replace('[Hora]', hora).replace('[Medico]', medico)
}

export function WhatsAppView() {
  const { appointments = [], clients = [], professionals = [] } = useScheduler()
  const [tab, setTab] = useState<TabKey>('confirmations')
  const [filter, setFilter] = useState<'today' | 'tomorrow' | 'pending'>('today')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [message, setMessage] = useState('')

  const profMap = useMemo(() => {
    const map = new Map<string, string>()
    professionals.forEach((p) => map.set(p.id, p.name))
    return map
  }, [professionals])

  const clientMap = useMemo(() => {
    const map = new Map<string, { name: string; phone?: string; birthday?: string }>()
    clients.forEach((c) => map.set(c.id, { name: c.name, phone: c.mobile || c.phone, birthday: (c as any).birthday }))
    return map
  }, [clients])

  // Auxiliares
  const confirmAppointments = useMemo(() => {
    return appointments
      .filter((a) => {
        const d = new Date(a.start)
        if (filter === 'today') return isToday(d)
        if (filter === 'tomorrow') return isTomorrow(d)
        if (filter === 'pending') return a.status === 'pending' || a.status === 'pendente'
        return true
      })
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [appointments, filter])

  const recallAppointments = useMemo(() => {
    // mock: clientes sem visita há 6 meses (usamos start mais antigo)
    const sixMonthsAgo = subMonths(new Date(), 6)
    const recalls: any[] = []
    const clientLast = new Map<string, Date>()
    appointments.forEach((a) => {
      const d = new Date(a.start)
      const last = clientLast.get(a.clientId)
      if (!last || d > last) clientLast.set(a.clientId, d)
    })
    clientLast.forEach((last, clientId) => {
      if (last < sixMonthsAgo) {
        recalls.push({
          id: `recall-${clientId}`,
          clientId,
          start: addMonths(last, 6).toISOString(),
          patient: clientMap.get(clientId)?.name ?? 'Paciente',
          professionalId: appointments.find((a) => a.clientId === clientId)?.professionalId,
        })
      }
    })
    return recalls
  }, [appointments, clientMap])

  const rescueAppointments = useMemo(() => {
    const futureByClient = new Map<string, boolean>()
    const now = new Date()
    appointments.forEach((a) => {
      if (new Date(a.start) > now) futureByClient.set(a.clientId, true)
    })
    return appointments
      .filter((a) => (a.status === 'cancelled' || a.status === 'cancelado') && !futureByClient.get(a.clientId))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
  }, [appointments])

  const birthdayList = useMemo(() => {
    const today = new Date()
    return clients
      .filter((c) => {
        const bday = (c as any).birthday
        if (!bday) return false
        const d = new Date(bday)
        return isSameMonth(d, today)
      })
      .map((c) => ({
        id: `bday-${c.id}`,
        clientId: c.id,
        patient: c.name,
        start: new Date().toISOString(),
      }))
  }, [clients])

  const dataset = useMemo(() => {
    switch (tab) {
      case 'confirmations':
        return confirmAppointments
      case 'recalls':
        return recallAppointments
      case 'rescues':
        return rescueAppointments
      case 'birthdays':
        return birthdayList
      default:
        return []
    }
  }, [tab, confirmAppointments, recallAppointments, rescueAppointments, birthdayList])

  useEffect(() => {
    if (!dataset.length) {
      setSelectedId(null)
      setMessage('')
      return
    }
    setSelectedId(dataset[0].id)
  }, [dataset])

  useEffect(() => {
    const selected = dataset.find((a) => a.id === selectedId)
    if (!selected) {
      setMessage('')
      return
    }
    const professionalName = selected.professionalId ? profMap.get(selected.professionalId) : undefined
    const tpl: TemplateKey =
      tab === 'confirmations'
        ? 'confirm'
        : tab === 'recalls'
        ? 'recall'
        : tab === 'rescues'
        ? 'rescue'
        : 'birthday'
    setMessage(generateMessage(tpl, selected, professionalName))
  }, [dataset, selectedId, tab, profMap])

  const selected = dataset.find((a) => a.id === selectedId)
  const selectedClient = selected ? clientMap.get(selected.clientId) : undefined
  const phoneDigits = selectedClient?.phone ? selectedClient.phone.replace(/\D/g, '') : ''
  const professionalName = selected ? (selected.professionalId ? profMap.get(selected.professionalId) : undefined) : undefined

  const handleOpenWhatsapp = () => {
    if (!selected || !phoneDigits) return
    const encoded = encodeURIComponent(message)
    window.open(`https://wa.me/55${phoneDigits}?text=${encoded}`, '_blank')
  }

  const tabConfig: { key: TabKey; label: string; count: number }[] = [
    { key: 'confirmations', label: 'Confirmações', count: confirmAppointments.length },
    { key: 'recalls', label: 'Retornos', count: recallAppointments.length },
    { key: 'rescues', label: 'Resgate', count: rescueAppointments.length },
    { key: 'birthdays', label: 'Aniversariantes', count: birthdayList.length },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[380px,1fr] gap-6">
      {/* Coluna esquerda */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-900">Painel de Mensagens</p>
            <p className="text-xs text-gray-500">Selecione o tipo e o paciente</p>
          </div>
          <Clock4 className="h-5 w-5 text-gray-600" />
        </div>

        <div className="flex gap-2 flex-wrap">
          {tabConfig.map((t) => {
            const active = tab === t.key
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
                  active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/70 text-gray-800 border-white/70 hover:bg-white'
                }`}
              >
                {t.label} ({t.count})
              </button>
            )
          })}
        </div>

        {tab === 'confirmations' && (
          <div className="flex gap-2">
            {[
              { key: 'today', label: 'Hoje' },
              { key: 'tomorrow', label: 'Amanhã' },
              { key: 'pending', label: 'Pendentes' },
            ].map((f) => {
              const active = filter === f.key
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key as any)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
                    active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white/70 text-gray-800 border-white/70 hover:bg-white'
                  }`}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {dataset.map((apt) => {
            const client = clientMap.get(apt.clientId)
            const hasPhone = !!client?.phone
            const hour = apt.start ? format(new Date(apt.start), 'HH:mm') : ''
            const active = selectedId === apt.id
            return (
              <button
                key={apt.id}
                onClick={() => setSelectedId(apt.id)}
                className={`w-full text-left rounded-2xl border px-3 py-3 flex items-center gap-3 transition shadow-sm ${
                  active ? 'bg-white border-white shadow-lg ring-2 ring-gray-900/10' : 'bg-white/70 border-white/60 hover:bg-white'
                }`}
              >
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                  {client?.name?.charAt(0) ?? 'P'}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{client?.name ?? apt.patient ?? 'Paciente'}</p>
                  <p className="text-xs text-gray-500">{hour}</p>
                </div>
                {!hasPhone && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {hasPhone && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </button>
            )
          })}
          {dataset.length === 0 && <p className="text-sm text-gray-600">Nenhum item neste filtro.</p>}
        </div>
      </div>

      {/* Coluna direita */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-4">
        {selected ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-900">{selectedClient?.name ?? selected.patient ?? 'Paciente'}</p>
                <p className="text-xs text-gray-500">
                  {selected.start
                    ? format(new Date(selected.start), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })
                    : 'Data não definida'}
                  {professionalName ? ` • ${professionalName}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <Phone className="h-4 w-4" />
                <span>{selectedClient?.phone ?? 'Sem telefone'}</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Pré-visualização</p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full h-40 rounded-2xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 shadow-inner"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleOpenWhatsapp}
                disabled={!phoneDigits}
                className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl text-sm font-semibold shadow-lg transition ${
                  phoneDigits
                    ? 'bg-emerald-500 text-white hover:brightness-95'
                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                }`}
              >
                <MessageCircle className="h-5 w-5" />
                Abrir no WhatsApp
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">Selecione um item na lista.</p>
        )}
      </div>
    </div>
  )
}


