import { DragOverlay as DndDragOverlay } from "@dnd-kit/core";
import type { CalendarEvent } from "../../lib/types";
import { AppointmentCard } from "./AppointmentCard";

interface DragOverlayProps {
  activeEvent: CalendarEvent | null;
}

export function DragOverlay({ activeEvent }: DragOverlayProps) {
  return (
    <DndDragOverlay dropAnimation={null}>
      {activeEvent && (
        <div className="w-[260px] opacity-90 shadow-2xl">
          <AppointmentCard event={activeEvent} isDragging />
        </div>
      )}
    </DndDragOverlay>
  );
}
