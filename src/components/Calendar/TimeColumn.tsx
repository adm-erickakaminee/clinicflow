import { useMemo } from "react";
import { format, setHours, setMinutes, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TimeColumnProps {
  startHour?: number;
  endHour?: number;
  intervalMinutes?: number;
  theme?: "light" | "dark";
  selectedDate?: Date;
}

export function TimeColumn({
  startHour = 7,
  endHour = 20,
  intervalMinutes = 30,
  theme = "dark",
  selectedDate,
}: TimeColumnProps) {
  const timeSlots = useMemo(() => {
    const slots: Date[] = [];
    const baseDate = startOfDay(selectedDate || new Date());

    for (let hour = startHour; hour <= endHour; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        if (hour === endHour && minute > 0) break;
        slots.push(setMinutes(setHours(baseDate, hour), minute));
      }
    }

    return slots;
  }, [startHour, endHour, intervalMinutes, selectedDate]);

  const bgClass = theme === "light" ? "bg-white" : "bg-slate-900";
  const borderClass = theme === "light" ? "border-gray-200" : "border-slate-700";
  const textClass = theme === "light" ? "text-gray-600" : "text-slate-500";

  return (
    <div className={`flex flex-col sticky left-0 z-10 ${bgClass} border-r ${borderClass}`}>
      {/* Header vazio para alinhar com os recursos */}
      <div
        className={`h-16 border-b ${borderClass} flex items-center justify-center ${theme === "light" ? "bg-white" : "bg-slate-900"}`}
      >
        <span
          className={`text-xs font-semibold ${theme === "light" ? "text-gray-700" : "text-slate-500"}`}
        >
          Hora
        </span>
      </div>

      {/* Slots de tempo */}
      {timeSlots.map((time, index) => (
        <div
          key={index}
          className={`h-16 border-b ${theme === "light" ? "border-gray-100" : "border-slate-800"} flex items-start justify-end pr-3 pt-1`}
        >
          <span className={`text-xs ${textClass} font-mono`}>
            {format(time, "HH:mm", { locale: ptBR })}
          </span>
        </div>
      ))}
    </div>
  );
}
