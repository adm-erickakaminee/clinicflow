import { useState } from 'react'
import { PhoneCall, Clock, MessageSquare, CreditCard, CheckCircle2 } from 'lucide-react'

type Slot = { time: string; professional: string }
type Pending = { name: string; contact: string; notes?: string }

export function ReceptionistAnalytics() {
  const [activeTab, setActiveTab] = useState('Análises')
  const agendaStatus = { confirmados: 12, pendentes: 4, cancelados: 2 }
  const total = agendaStatus.confirmados + agendaStatus.pendentes + agendaStatus.cancelados
  const confirmPct = Math.round((agendaStatus.confirmados / total) * 100)
  const pendingPct = Math.round((agendaStatus.pendentes / total) * 100)
  const cancelPct = 100 - confirmPct - pendingPct

  const slotsLivres: Slot[] = [
    { time: '14:10', professional: 'Dra. Ana' },
    { time: '15:30', professional: 'Dr. Marcos' },
    { time: '17:00', professional: 'Dra. Julia' },
  ]

  const listaEspera: Pending[] = [
    { name: 'Patrícia Souza', contact: '(11) 97777-2222', notes: 'Preferência tarde' },
    { name: 'Carlos Lima', contact: '(11) 94444-8899' },
  ]

  const confirmacoes: Pending[] = [
    { name: 'Fernanda Alves', contact: '(11) 95555-1010', notes: 'Consulta 09:30' },
    { name: 'João Vieira', contact: '(11) 93333-4545', notes: 'Retorno 10:15' },
  ]

  const caixaHoje = { total: 'R$ 1.820,00', pix: 'R$ 1.100,00', cartao: 'R$ 520,00', dinheiro: 'R$ 200,00' }
  const topMenu = ['Agendamentos', 'WhatsApp', 'Clientes', 'Análises', 'Outros']

  return (
    <div className="relative min-h-screen bg-[#f3f4f6] text-gray-900 font-sans overflow-hidden">
      {/* Blobs de fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-20 -top-32 h-72 w-72 rounded-full bg-amber-200 blur-3xl opacity-80" />
        <div className="absolute right-10 -top-24 h-64 w-64 rounded-full bg-white blur-2xl opacity-70" />
        <div className="absolute -right-16 bottom-10 h-80 w-80 rounded-full bg-gray-200 blur-3xl opacity-70" />
        <div className="absolute left-16 bottom-24 h-56 w-56 rounded-full bg-amber-100 blur-2xl opacity-70" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard Operacional — Recepção</h1>
            <p className="text-sm text-gray-500">Foco no agora e no amanhã</p>
          </div>
        </div>

        {/* Menu superior */}
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-2xl px-3 py-2 flex items-center gap-2 flex-wrap">
          {topMenu.map((item) => {
            const active = activeTab === item
            return (
              <button
                key={item}
                onClick={() => setActiveTab(item)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition border ${
                  active
                    ? 'bg-gray-900 text-white border-gray-900 shadow-lg shadow-black/10'
                    : 'bg-white/60 text-gray-800 border-white/60 hover:bg-white/80'
                }`}
              >
                {item}
              </button>
            )
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6 items-start">
          {/* Sidebar rápida */}
          <aside className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-4 flex flex-col gap-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Ações rápidas</p>
              {[
                { label: 'Agendamentos', desc: 'Agenda e encaixes' },
                { label: 'Confirmar por Whats', desc: 'Respostas pendentes' },
                { label: 'Lista de Espera', desc: 'Chamar vagas' },
                { label: 'Caixa do Dia', desc: 'Entradas de hoje' },
              ].map((item) => (
                <button
                  key={item.label}
                  className="w-full text-left bg-white/50 hover:bg-white/70 transition rounded-2xl border border-white/50 px-4 py-3 shadow-sm"
                >
                  <p className="text-sm font-semibold text-gray-900">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </button>
              ))}
            </div>
          </aside>

          {/* Conteúdo principal */}
          <div className="space-y-6">
            {/* Linha 1: Fluxo do dia + Slots livres + Caixa */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr,1fr,0.8fr] gap-6">
              {/* Fluxo do dia */}
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-gray-900">Status da Agenda Hoje</p>
                  <span className="text-xs text-gray-500">Agora</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="h-28 w-28 rounded-full bg-white/70 border border-white/50 shadow-inner flex items-center justify-center">
                    <div
                      className="relative h-24 w-24 rounded-full"
                      style={{
                        background: `conic-gradient(#10b981 0% ${confirmPct}%, #f59e0b ${confirmPct}% ${
                          confirmPct + pendingPct
                        }%, #ef4444 ${confirmPct + pendingPct}% 100%)`,
                      }}
                    >
                      <div className="absolute inset-2 rounded-full bg-white/80 backdrop-blur-xl flex items-center justify-center border border-white/60 shadow-sm">
                        <span className="text-sm font-semibold text-gray-900">{total}</span>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-emerald-500" />
                      <span className="text-gray-700">Confirmados: {agendaStatus.confirmados}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-amber-400" />
                      <span className="text-gray-700">Pendentes: {agendaStatus.pendentes}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-red-500" />
                      <span className="text-gray-700">Cancelados: {agendaStatus.cancelados}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Slots livres */}
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-gray-900">Próximos Livres</p>
                  <Clock className="h-5 w-5 text-gray-500" />
                </div>
                <div className="space-y-3">
                  {slotsLivres.map((slot) => (
                    <div
                      key={slot.time + slot.professional}
                      className="flex items-center justify-between rounded-2xl bg-white/60 border border-white/40 px-3 py-2 shadow-sm"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{slot.time}</p>
                        <p className="text-xs text-gray-500">{slot.professional}</p>
                      </div>
                      <button className="text-xs font-semibold text-gray-900 bg-white/70 border border-white/60 rounded-xl px-3 py-1 shadow-sm">
                        Preencher
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Caixa do dia */}
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-gray-900">Caixa do Dia</p>
                  <CreditCard className="h-5 w-5 text-gray-500" />
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between font-semibold text-gray-900">
                    <span>Total</span>
                    <span>{caixaHoje.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Pix</span>
                    <span>{caixaHoje.pix}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Cartão</span>
                    <span>{caixaHoje.cartao}</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-700">
                    <span>Dinheiro</span>
                    <span>{caixaHoje.dinheiro}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Linha 2: Lista de espera e confirmações */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-gray-900">Lista de Espera</p>
                  <CheckCircle2 className="h-5 w-5 text-gray-500" />
                </div>
                <div className="space-y-3">
                  {listaEspera.map((p) => (
                    <div
                      key={p.name}
                      className="rounded-2xl bg-white/60 border border-white/40 px-3 py-2 shadow-sm text-sm"
                    >
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-gray-600">{p.contact}</p>
                      {p.notes && <p className="text-xs text-gray-500 mt-1">{p.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-base font-semibold text-gray-900">Confirmações WhatsApp</p>
                  <MessageSquare className="h-5 w-5 text-gray-500" />
                </div>
                <div className="space-y-3">
                  {confirmacoes.map((c) => (
                    <div
                      key={c.name}
                      className="rounded-2xl bg-white/60 border border-white/40 px-3 py-2 shadow-sm text-sm flex items-center justify-between gap-3"
                    >
                      <div>
                        <p className="font-semibold text-gray-900">{c.name}</p>
                        <p className="text-gray-600">{c.contact}</p>
                        {c.notes && <p className="text-xs text-gray-500 mt-1">{c.notes}</p>}
                      </div>
                      <button className="text-xs font-semibold text-gray-900 bg-white/70 border border-white/60 rounded-xl px-3 py-1 shadow-sm">
                        Enviar
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

