import { useMemo, useState } from "react";

type Appointment = {
  time: string;
  client: string;
  service: string;
  status: "confirmado" | "recepcao" | "livre";
  alert?: string;
  avatar?: string;
};

export function ProfessionalHome() {
  const [showValue, setShowValue] = useState(true);

  const nextAppointment: Appointment = useMemo(
    () => ({
      time: "14:30",
      client: "Marina Costa",
      service: "Lipo enzimática",
      status: "confirmado",
      alert: "Aniversário hoje 🎉",
      avatar:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=200&q=60",
    }),
    []
  );

  const dayAgenda: Appointment[] = useMemo(
    () => [
      { time: "09:00", client: "Slot Livre", service: "", status: "livre" },
      { time: "10:00", client: "Carlos Pereira", service: "Botox", status: "confirmado" },
      { time: "11:30", client: "Slot Livre", service: "", status: "livre" },
      { time: "13:00", client: "Fernanda Lima", service: "Bioestimulador", status: "recepcao" },
      { time: "14:30", client: "Marina Costa", service: "Lipo enzimática", status: "confirmado" },
      { time: "16:00", client: "João Viana", service: "Peeling", status: "confirmado" },
      { time: "17:30", client: "Slot Livre", service: "", status: "livre" },
    ],
    []
  );

  return (
    <div className="min-h-screen bg-[#F8F9FC] text-gray-900 flex">
      {/* Sidebar fixa */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-72 flex-col gap-2 bg-white border-r border-gray-100 shadow-sm p-5">
        <div>
          <p className="text-xs text-gray-500">Menu</p>
          <p className="text-sm font-semibold text-gray-900">Navegação</p>
        </div>
        <div className="space-y-2 mt-3">
          {[
            { label: "Agendamentos", desc: "Sua agenda e encaixes" },
            { label: "Análises", desc: "Indicadores e desempenho" },
            { label: "Clientes", desc: "Dados e histórico" },
            { label: "Financeiro", desc: "Cobranças e repasses" },
          ].map((item) => (
            <button
              key={item.label}
              className="w-full text-left bg-gray-50 hover:bg-gray-100 transition rounded-xl border border-gray-100 px-4 py-3"
            >
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{item.desc}</p>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 md:pl-80">
        {/* Top bar */}
        <div className="relative flex items-center justify-between px-4 py-3 md:pt-4">
          <div>
            <p className="text-xs text-gray-500">Bem-vinda</p>
            <p className="text-sm font-semibold text-gray-900">Dra. Ana</p>
          </div>
        </div>

        <div className="p-4 grid gap-4">
          {/* Header */}
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-4">
            <p className="text-sm text-gray-500">Olá, Dra. Ana 👋</p>
            <p className="text-lg font-semibold text-gray-900">
              Vamos fazer um ótimo trabalho hoje.
            </p>
          </div>

          {/* Meta card */}
          <div className="bg-amber-400 rounded-[1.5rem] shadow-sm border border-amber-200 p-4 flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-amber-900/80">Valor ganho hoje</p>
              <p className="text-3xl font-black text-amber-950 tracking-tight">
                {showValue ? "R$ 450,00" : "••••••"}
              </p>
              <p className="text-sm text-amber-900/80">4 de 6 atendimentos</p>
            </div>
            <button
              className="text-xs font-semibold text-amber-950 bg-white/70 rounded-full px-3 py-2 shadow-sm"
              onClick={() => setShowValue((v) => !v)}
            >
              {showValue ? "Ocultar" : "Mostrar"}
            </button>
          </div>

          {/* Próximo atendimento */}
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl overflow-hidden bg-gray-100">
                {nextAppointment.avatar ? (
                  <img
                    src={nextAppointment.avatar}
                    alt={nextAppointment.client}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-xs text-gray-500">Próximo atendimento</p>
                <p className="text-lg font-semibold text-gray-900">{nextAppointment.client}</p>
                <p className="text-sm text-gray-600">
                  {nextAppointment.service} • {nextAppointment.time}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    nextAppointment.status === "confirmado"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                      : "bg-blue-50 text-blue-700 border border-blue-100"
                  }`}
                >
                  {nextAppointment.status === "confirmado" ? "Confirmado" : "Na Recepção"}
                </span>
                {nextAppointment.alert && (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
                    {nextAppointment.alert}
                  </span>
                )}
              </div>
            </div>
            <button className="w-full h-12 bg-gray-900 text-white rounded-xl font-semibold">
              INICIAR ATENDIMENTO
            </button>
          </div>

          {/* Agenda do dia */}
          <div className="bg-white rounded-[1.5rem] shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-base font-semibold text-gray-900">Agenda do Dia</p>
              <span className="text-xs text-gray-500">Hoje</span>
            </div>
            <div className="space-y-3">
              {dayAgenda.map((item, idx) => (
                <div key={`${item.time}-${idx}`} className="flex items-center gap-3">
                  <div className="w-14 text-sm font-semibold text-gray-700">{item.time}</div>
                  <div className="flex-1 border-b border-dashed border-gray-200 pb-2">
                    {item.status === "livre" ? (
                      <div className="text-sm text-gray-400 italic">Slot Livre</div>
                    ) : (
                      <>
                        <p className="text-sm font-semibold text-gray-900">{item.client}</p>
                        <p className="text-xs text-gray-500">{item.service}</p>
                      </>
                    )}
                  </div>
                  {item.status !== "livre" && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-1 rounded-full ${
                        item.status === "confirmado"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                          : "bg-blue-50 text-blue-700 border border-blue-100"
                      }`}
                    >
                      {item.status === "confirmado" ? "Confirmado" : "Na Recepção"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FAB */}
        <button className="fixed bottom-5 right-5 h-14 w-14 rounded-full bg-gray-900 text-white shadow-lg shadow-black/10 flex items-center justify-center text-sm font-semibold">
          +
        </button>
      </div>
    </div>
  );
}
