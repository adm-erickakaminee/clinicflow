import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import clsx from "clsx";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CalendarEvent } from "../../lib/types";

interface AppointmentCardProps {
  event: CalendarEvent;
  isDragging?: boolean;
  theme?: "light" | "dark";
}

export function AppointmentCard({ event, isDragging, theme = "dark" }: AppointmentCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: event.id,
    data: {
      event,
      type: "appointment",
    },
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        zIndex: isDragging ? 1000 : 1,
      }
    : undefined;

  // Calcular duração em minutos
  const durationMinutes = Math.round((event.end.getTime() - event.start.getTime()) / 60000);

  // Cards amarelos no tema claro (como no print)
  const cardClass =
    theme === "light"
      ? "bg-amber-100 border-amber-300 border-l-4 border-l-amber-400"
      : clsx("border-l-4", {
          "border-l-amber-500 bg-amber-500/10": event.status === "pending",
          "border-l-emerald-500 bg-emerald-500/10": event.status === "confirmed",
          "border-l-slate-500 bg-slate-500/10": event.status === "completed",
          "border-l-red-500 bg-red-500/10 opacity-50": event.status === "cancelled",
        });

  const textColor = theme === "light" ? "text-gray-900" : "text-slate-200";
  const secondaryTextColor = theme === "light" ? "text-gray-700" : "text-slate-400";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={clsx(
        "rounded-xl p-2 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-sm",
        "hover:shadow-md hover:scale-[1.01]",
        cardClass,
        {
          "shadow-lg scale-105 opacity-90": isDragging,
          "ring-2 ring-blue-500": isDragging,
        }
      )}
    >
      {/* Nome do cliente e horário */}
      <div className="flex items-start justify-between mb-1">
        <span className={`text-sm font-semibold ${textColor} truncate flex-1`}>{event.title}</span>
        <span className={`text-xs ${secondaryTextColor} ml-2 whitespace-nowrap`}>
          {format(event.start, "HH:mm", { locale: ptBR })} · {durationMinutes} min
        </span>
      </div>
    </div>
  );
}
