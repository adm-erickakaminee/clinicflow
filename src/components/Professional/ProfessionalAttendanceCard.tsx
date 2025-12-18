import { useState, useEffect } from "react";
import { Calendar, Clock, User, Activity } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "../ui/Toast";
import { ServiceFlow } from "./ServiceFlow";
import type { AppointmentWithRelations } from "../../lib/types";

interface ProfessionalAttendanceCardProps {
  professionalId: string;
  clinicId: string;
  soloMode?: boolean;
  gabyConfig?: any;
}

export function ProfessionalAttendanceCard({
  professionalId,
  clinicId,
  soloMode = false,
  gabyConfig,
}: ProfessionalAttendanceCardProps) {
  const toast = useToast();
  const [currentAppointment, setCurrentAppointment] = useState<AppointmentWithRelations | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCurrentAppointment = async () => {
      if (!professionalId) {
        setLoading(false);
        return;
      }

      try {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const todayEnd = new Date(todayStart);
        todayEnd.setHours(23, 59, 59, 999);

        // Buscar agendamentos em andamento ou esperando (waiting, in_progress)
        const { data, error } = await supabase
          .from("appointments")
          .select(
            `
            *,
            client:clients (*),
            professional:profiles (*),
            service:services (*)
          `
          )
          .eq("professional_id", professionalId)
          .in("status", ["waiting", "in_progress"])
          .gte("start_time", todayStart.toISOString())
          .lte("end_time", todayEnd.toISOString())
          .order("start_time", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("Erro ao carregar atendimento:", error);
          return;
        }

        setCurrentAppointment(data as AppointmentWithRelations | null);
      } catch (err) {
        console.error("Erro ao carregar atendimento:", err);
        toast.error("Erro ao carregar atendimento em andamento");
      } finally {
        setLoading(false);
      }
    };

    loadCurrentAppointment();

    // Realtime subscription
    if (!professionalId) return;

    const channel = supabase
      .channel("professional-attendance")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `professional_id=eq.${professionalId}`,
        },
        () => {
          loadCurrentAppointment();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId, toast]);

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando atendimento...</p>
      </div>
    );
  }

  if (!currentAppointment) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Atendimento em Andamento</h3>
        </div>
        <p className="text-sm text-gray-500">Nenhum atendimento em andamento no momento.</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Atendimento em Andamento</h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
          {currentAppointment.status === "waiting" ? "Aguardando" : "Em Atendimento"}
        </span>
      </div>

      <div className="bg-white/80 rounded-xl p-4 border border-gray-200 space-y-3">
        <div className="flex items-start gap-3">
          <User className="h-5 w-5 text-gray-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-gray-900 text-lg">
              {currentAppointment.client?.full_name || "Cliente"}
            </p>
            {currentAppointment.client?.phone && (
              <p className="text-sm text-gray-600">{currentAppointment.client.phone}</p>
            )}
          </div>
        </div>

        {currentAppointment.service && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <p className="text-sm font-medium text-gray-900">{currentAppointment.service.name}</p>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <p className="text-sm text-gray-600">
            {format(new Date(currentAppointment.start_time), "dd/MM/yyyy 'às' HH:mm", {
              locale: ptBR,
            })}
          </p>
        </div>
      </div>

      <ServiceFlow
        appointment={currentAppointment}
        organizationId={clinicId}
        soloMode={soloMode}
        gabyConfig={gabyConfig}
      />
    </div>
  );
}
