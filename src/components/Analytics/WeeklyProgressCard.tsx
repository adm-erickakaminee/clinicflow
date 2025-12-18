import { useMemo } from "react";
import { startOfWeek, endOfWeek, eachDayOfInterval, isToday, getDay } from "date-fns";
import { useScheduler } from "../../context/SchedulerContext";
import { useDashboardContext } from "../../panels/ReceptionistPanel";

// Iniciais dos dias da semana em português
const dayInitials = ["D", "S", "T", "Q", "Q", "S", "S"];

export function WeeklyProgressCard() {
  const { appointments = [] } = useScheduler();
  const { selectedProfessional } = useDashboardContext();

  // Filtrar agendamentos por profissional selecionado
  const filteredAppointments = useMemo(() => {
    if (selectedProfessional === "all") {
      return appointments;
    }
    return appointments.filter((apt) => apt.professionalId === selectedProfessional);
  }, [appointments, selectedProfessional]);

  // Calcular dados da semana atual (Domingo a Sábado)
  const weekData = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 }); // Domingo
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 }); // Sábado
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

    // Array de 7 posições (Domingo a Sábado)
    const dailyCounts = weekDays.map((day) => {
      const dayStart = new Date(day);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(day);
      dayEnd.setHours(23, 59, 59, 999);

      const count = filteredAppointments.filter((apt) => {
        const aptDate = new Date(apt.start);
        return aptDate >= dayStart && aptDate <= dayEnd && apt.status !== "cancelado";
      }).length;

      const dayIndex = getDay(day); // 0 = Domingo, 6 = Sábado
      return {
        date: new Date(day),
        count,
        dayName: dayInitials[dayIndex], // Inicial do dia
        isToday: isToday(day),
        dayIndex,
      };
    });

    // Calcular total e média
    const total = dailyCounts.reduce((sum, day) => sum + day.count, 0);
    const daysPassed = dailyCounts.filter((day) => day.date <= now).length;
    const average = daysPassed > 0 ? Math.round(total / daysPassed) : 0;

    // Encontrar o maior valor para normalizar as barras
    const maxCount = Math.max(...dailyCounts.map((d) => d.count), 1); // Mínimo 1 para evitar divisão por zero

    return {
      dailyCounts,
      total,
      average,
      maxCount,
    };
  }, [filteredAppointments]);

  return (
    <div className="rounded-3xl bg-white/40 backdrop-blur-xl border border-white/40 shadow-sm p-6 space-y-5 min-h-[420px]">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
            Performance Semanal
          </p>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-gray-800">{weekData.average}</span>
            <span className="text-sm text-gray-600 font-medium">Média de agendamentos/dia</span>
          </div>
        </div>
      </div>

      {/* Container do Gráfico com Linhas de Grade */}
      <div className="relative">
        {/* Linhas de Grade (Grid Lines) - Atrás das barras */}
        <div
          className="absolute inset-0 flex flex-col justify-between z-0"
          style={{ height: "224px" }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="w-full border-t border-gray-200/30" />
          ))}
        </div>

        {/* Gráfico de Barras Verticais */}
        <div className="relative flex items-end justify-between h-56 gap-1 z-10">
          {weekData.dailyCounts.map((day, index) => {
            const heightPercent =
              weekData.maxCount > 0
                ? Math.max((day.count / weekData.maxCount) * 100, 5) // Mínimo 5% para barras vazias serem visíveis
                : 5;

            const isActive = day.isToday;

            return (
              <div
                key={index}
                className="flex flex-col items-center flex-1 h-full justify-end relative"
              >
                {/* Tag Flutuante (Tooltip) - Apenas no dia de hoje */}
                {isActive && day.count > 0 && (
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded-lg shadow-md z-20 whitespace-nowrap">
                    {day.count}
                  </div>
                )}

                {/* Valor numérico acima da barra (dias anteriores) */}
                {!isActive && day.count > 0 && (
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-semibold text-gray-600 z-20">
                    {day.count}
                  </div>
                )}

                {/* Barra Vertical */}
                <div
                  className={`w-4 rounded-full transition-all duration-500 ease-out relative ${
                    isActive
                      ? "bg-gradient-to-t from-orange-300 to-orange-500 shadow-lg shadow-orange-500/30"
                      : "bg-gray-300/50"
                  }`}
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: "8px", // Altura mínima para barras vazias
                  }}
                >
                  {/* Indicador visual no topo da barra ativa */}
                  {isActive && (
                    <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full bg-orange-500 border-2 border-white shadow-sm" />
                  )}
                </div>

                {/* Eixo X - Inicial do dia (abaixo da barra) */}
                <div className="mt-2 text-xs font-semibold text-gray-500">{day.dayName}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer com informações adicionais */}
      <div className="flex items-center justify-between pt-3 border-t border-white/40">
        <div className="text-xs text-gray-600">
          <span className="font-semibold">Total da semana:</span> {weekData.total} atendimentos
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gray-300/50" />
            <span className="text-xs text-gray-600">Dias anteriores</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-gradient-to-t from-orange-300 to-orange-500" />
            <span className="text-xs text-gray-600">Hoje</span>
          </div>
        </div>
      </div>
    </div>
  );
}
