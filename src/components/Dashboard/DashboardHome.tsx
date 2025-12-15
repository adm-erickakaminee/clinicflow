import { useMemo } from 'react'
import { PatientFlowWidget } from '../PatientFlow/PatientFlowWidget'

interface Stat {
  label: string
  value: string
  trend?: string
  variant?: 'primary' | 'success' | 'warning'
}

export function DashboardHome() {
  const stats: Stat[] = useMemo(
    () => [
      { label: 'Atendimentos hoje', value: '18', trend: '+12%', variant: 'primary' },
      { label: 'Satisfação', value: '4.9', trend: 'NPS', variant: 'success' },
      { label: 'No-shows', value: '2', trend: '-30%', variant: 'warning' },
    ],
    []
  )

  return (
    <div className="min-h-screen bg-[rgba(248,250,252,0.7)] px-4 py-6 text-[#0f172a]">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex flex-col gap-2">
          <p className="text-sm text-slate-500">ClinicFlow • Visão Geral</p>
          <h1 className="text-2xl font-semibold text-[#011126]">Dashboard Premium</h1>
        </header>

        {/* Bento Grid */}
        <div className="grid gap-4 md:grid-cols-12">
          {/* Card principal com gráficos rápidos */}
          <div className="md:col-span-7 rounded-3xl glass-surface soft-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-slate-500">Produtividade</p>
                <h2 className="text-xl font-semibold text-[#011126]">Resumo diário</h2>
              </div>
              <button className="px-4 py-2 text-sm font-medium rounded-full bg-[#011126] text-white hover:opacity-90 transition">
                Ver detalhes
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl p-4 bg-white/70 border border-white/60 soft-shadow transition hover:-translate-y-1 hover:shadow-xl"
                >
                  <p className="text-xs uppercase tracking-wide text-slate-500">{s.label}</p>
                  <div className="flex items-baseline gap-2 mt-2">
                    <span className="text-2xl font-semibold text-[#011126]">{s.value}</span>
                    {s.trend && (
                      <span
                        className={
                          s.variant === 'success'
                            ? 'text-emerald-600 text-xs'
                            : s.variant === 'warning'
                              ? 'text-amber-600 text-xs'
                              : 'text-sky-600 text-xs'
                        }
                      >
                        {s.trend}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card lateral com gradiente */}
          <div className="md:col-span-5 rounded-3xl soft-shadow p-[1px] bg-gradient-to-br from-[#011126] via-[#88B0BF] to-[#A62F03]">
            <div className="rounded-[calc(var(--radius-card)+2px)] h-full bg-white/80 p-6 flex flex-col gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Gaby Insights</p>
                <h3 className="text-xl font-semibold text-[#011126]">Alertas e recomendações</h3>
              </div>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl p-4 bg-gradient-to-r from-[#F2B544]/80 to-[#D96B0B]/70 text-[#011126] soft-shadow">
                  <p className="font-semibold">Retenção</p>
                  <p className="text-sm">3 clientes sem retorno há mais de 45 dias.</p>
                </div>
                <div className="rounded-2xl p-4 bg-gradient-to-r from-[#88B0BF]/80 to-[#011126]/80 text-white soft-shadow">
                  <p className="font-semibold">Preço / Margem</p>
                  <p className="text-sm">2 serviços com margem abaixo do mínimo.</p>
                </div>
              </div>
              <button className="mt-auto px-4 py-3 rounded-2xl bg-[#011126] text-white font-semibold hover:opacity-90 transition">
                Ver todos os alertas
              </button>
            </div>
          </div>

          {/* Linha inferior de cards */}
          <div className="md:col-span-4 rounded-3xl glass-surface soft-shadow p-6 flex flex-col gap-3">
            <h4 className="text-lg font-semibold text-[#011126]">Agenda rápida</h4>
            <div className="space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between rounded-2xl bg-white/70 border border-white/60 px-4 py-3">
                <span>09:00 • Consulta</span>
                <span className="text-[#011126] font-semibold">Ana</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/70 border border-white/60 px-4 py-3">
                <span>10:30 • Retorno</span>
                <span className="text-[#011126] font-semibold">Bruno</span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-white/70 border border-white/60 px-4 py-3">
                <span>11:30 • Avaliação</span>
                <span className="text-[#011126] font-semibold">Clara</span>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 rounded-3xl glass-surface soft-shadow p-6 flex flex-col gap-4">
            <h4 className="text-lg font-semibold text-[#011126]">Financeiro</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase text-slate-500">MRR</p>
                <p className="text-2xl font-semibold text-[#011126]">R$ 48k</p>
              </div>
              <span className="px-3 py-1 text-xs font-semibold rounded-full bg-[#88B0BF]/30 text-[#011126]">
                +8% vs mês anterior
              </span>
            </div>
            <div className="rounded-2xl bg-white/70 border border-white/60 p-4">
              <p className="text-sm text-slate-600">Fee Ledger pendente</p>
              <p className="text-lg font-semibold text-[#011126]">R$ 3.200</p>
            </div>
          </div>

          <div className="md:col-span-4 rounded-3xl glass-surface soft-shadow p-6 flex flex-col gap-4">
            <h4 className="text-lg font-semibold text-[#011126]">Equipe</h4>
            <div className="space-y-3 text-sm text-slate-700">
              {['Dra. Ana', 'Dr. Lucas', 'Dra. Camila'].map((name) => (
                <div
                  key={name}
                  className="flex items-center justify-between rounded-2xl bg-white/70 border border-white/60 px-4 py-3 hover:-translate-y-[2px] transition"
                >
                  <span>{name}</span>
                  <span className="text-xs text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                    Online
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Fluxo de Atendimento */}
          <div className="md:col-span-12">
            <PatientFlowWidget />
          </div>
        </div>
      </div>
    </div>
  )
}


