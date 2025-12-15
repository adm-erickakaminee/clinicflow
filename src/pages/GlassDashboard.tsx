import { Bell, Settings, Phone, Mail } from 'lucide-react'

type Member = {
  name: string
  role: string
  progress: number
  avatar: string
}

export function GlassDashboard() {
  const members: Member[] = [
    {
      name: 'Ana Souza',
      role: 'Dermato',
      progress: 82,
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=60',
    },
    {
      name: 'Marcos Silva',
      role: 'Esteticista',
      progress: 64,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&q=60',
    },
    {
      name: 'Julia Prado',
      role: 'Fisioterapeuta',
      progress: 45,
      avatar: 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=100&q=60',
    },
    {
      name: 'Renata Lima',
      role: 'Enfermeira',
      progress: 71,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=60',
    },
  ]

  const metricProgress = 68

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
            <h1 className="text-2xl font-semibold tracking-tight">Dashboard da Clínica</h1>
            <p className="text-sm text-gray-500">Visual clean e sofisticado (glass)</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="h-11 w-11 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg flex items-center justify-center text-gray-700">
              <Bell className="h-5 w-5" />
            </button>
            <button className="h-11 w-11 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg flex items-center justify-center text-gray-700">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[320px,1.2fr,0.9fr] gap-6 items-start">
          {/* Sidebar: navegação + membros */}
          <aside className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-4 flex flex-col gap-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-800">Menu</p>
              {[
                { label: 'Agendamentos', desc: 'Agenda e encaixes' },
                { label: 'Análises', desc: 'Indicadores e desempenho' },
                { label: 'Clientes', desc: 'Dados e histórico' },
                { label: 'Financeiro', desc: 'Cobranças e repasses' },
                { label: 'Configurações', desc: 'Preferências' },
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

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-800">Equipe</p>
              {members.map((m) => (
                <div
                  key={m.name}
                  className="flex items-center gap-3 rounded-2xl bg-white/50 border border-white/40 p-3 shadow-sm"
                >
                  <img
                    src={m.avatar}
                    alt={m.name}
                    className="h-10 w-10 rounded-full object-cover border border-white/60 shadow"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">{m.name}</p>
                    <p className="text-xs text-gray-500">{m.role}</p>
                    <div className="mt-2 h-2 w-full bg-white/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full"
                        style={{ width: `${m.progress}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-700">{m.progress}%</span>
                </div>
              ))}
            </div>
          </aside>

          {/* Coluna central */}
          <div className="flex flex-col gap-6">
            {/* Header métrico glass */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 grid grid-cols-1 lg:grid-cols-[240px,1fr,200px] gap-6 items-center">
              <div className="flex items-center gap-3">
                <img
                  src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=120&q=60"
                  alt="Pro"
                  className="h-14 w-14 rounded-full object-cover border border-white/60 shadow"
                />
                <div>
                  <p className="text-sm text-gray-600">Profissional</p>
                  <p className="text-lg font-semibold text-gray-900">Dra. Ana</p>
                  <p className="text-xs text-gray-500">Dermatologista</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/50 border border-white/40 rounded-2xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500">Agendamentos Mês</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">128</p>
                </div>
                <div className="bg-white/50 border border-white/40 rounded-2xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500">Faturamento</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">R$ 15.000</p>
                </div>
                <div className="bg-white/50 border border-white/40 rounded-2xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500">Meta Mensal</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{metricProgress}%</p>
                  <div className="mt-2 h-2 w-full bg-white/70 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full"
                      style={{ width: `${metricProgress}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button className="h-11 px-4 rounded-2xl bg-white/50 border border-white/40 shadow-sm text-sm font-semibold text-gray-800">
                  Notas
                </button>
                <button className="h-11 px-4 rounded-2xl bg-gray-900 text-white shadow-lg text-sm font-semibold">
                  Ações
                </button>
              </div>
            </div>

            {/* Resumo visual / calendário */}
            <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-base font-semibold text-gray-900">Resumo / Agenda Visual</p>
                <span className="text-xs text-gray-500">Mês Atual</span>
              </div>
              <div className="grid grid-cols-7 gap-2 text-center text-sm text-gray-700">
                {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d) => (
                  <div key={d} className="text-xs text-gray-500">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 28 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-14 rounded-2xl bg-white/60 border border-white/40 flex items-center justify-center shadow-sm hover:shadow"
                  >
                    <span className="text-sm font-semibold">{i + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Coluna direita: perfil */}
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src="https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=160&q=60"
                alt="Paciente"
                className="h-14 w-14 rounded-2xl object-cover border border-white/60 shadow"
              />
              <div>
                <p className="text-sm text-gray-500">Perfil detalhado</p>
                <p className="text-lg font-semibold text-gray-900">Marina Costa</p>
                <p className="text-xs text-gray-500">Cliente Premium</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 text-sm">
              <div className="flex items-center gap-2 text-gray-700">
                <Phone className="h-4 w-4 text-gray-500" />
                <span>(11) 98888-7777</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700">
                <Mail className="h-4 w-4 text-gray-500" />
                <span>marina.costa@email.com</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white/60 border border-white/40 rounded-2xl p-3 shadow-sm">
                <p className="text-xs text-gray-500">Visitas</p>
                <p className="text-xl font-semibold text-gray-900">18</p>
              </div>
              <div className="bg-white/60 border border-white/40 rounded-2xl p-3 shadow-sm">
                <p className="text-xs text-gray-500">Retenção</p>
                <p className="text-xl font-semibold text-gray-900">92%</p>
              </div>
              <div className="bg-white/60 border border-white/40 rounded-2xl p-3 shadow-sm">
                <p className="text-xs text-gray-500">Risco</p>
                <p className="text-xl font-semibold text-gray-900">Baixo</p>
              </div>
            </div>

            <div className="bg-white/50 border border-white/40 rounded-2xl p-3 shadow-sm">
              <p className="text-xs text-gray-500">Notas recentes</p>
              <p className="text-sm text-gray-800 mt-1">
                Preferência por sessões no período da tarde. Sensível a ácidos, evitar peelings
                profundos.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

