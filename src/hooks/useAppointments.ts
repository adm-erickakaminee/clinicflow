import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import type {
  AppointmentWithRelations,
  ProfessionalWithServices,
  CalendarEvent,
  CalendarResource,
  Service,
} from "../lib/types";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface UseAppointmentsOptions {
  startDate: Date;
  endDate: Date;
}

interface UseAppointmentsReturn {
  appointments: AppointmentWithRelations[];
  events: CalendarEvent[];
  resources: CalendarResource[];
  professionals: ProfessionalWithServices[];
  services: Service[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateAppointment: (
    id: string,
    data: Partial<AppointmentWithRelations>
  ) => Promise<{ success: boolean; error?: string }>;
  optimisticUpdate: (
    id: string,
    data: Partial<AppointmentWithRelations>
  ) => AppointmentWithRelations | null;
  rollbackUpdate: (previous: AppointmentWithRelations | null) => void;
}

export function useAppointments({
  startDate,
  endDate,
}: UseAppointmentsOptions): UseAppointmentsReturn {
  const [appointments, setAppointments] = useState<AppointmentWithRelations[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalWithServices[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Buscar profissionais com seus serviços
  const fetchProfessionals = useCallback(async () => {
    try {
      // Primeiro tenta buscar com relacionamentos
      // Nota: Não buscar email (está em auth.users, não em profiles)
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          id,
          full_name,
          role,
          clinic_id,
          professional_id,
          phone,
          avatar_url,
          created_at,
          updated_at,
          professional_services (
            service:services (*)
          )
        `
        )
        .eq("role", "professional");

      if (error) {
        // Se a tabela professional_services não existir, busca só os profiles
        console.warn("Buscando profissionais sem serviços:", error.message);
        const { data: profilesOnly } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, clinic_id, professional_id, phone, avatar_url, created_at, updated_at"
          )
          .eq("role", "professional");

        return (profilesOnly || []) as unknown as ProfessionalWithServices[];
      }

      return (data || []) as unknown as ProfessionalWithServices[];
    } catch (err) {
      console.error("Erro ao buscar profissionais:", err);
      return [];
    }
  }, []);

  // Buscar serviços
  const fetchServices = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("services").select("*").eq("is_active", true);

      if (error) {
        // Tabela pode não existir ainda
        console.warn("Serviços não disponíveis:", error.message);
        return [];
      }

      return (data || []) as Service[];
    } catch (err) {
      console.error("Erro ao buscar serviços:", err);
      return [];
    }
  }, []);

  // Buscar agendamentos com relacionamentos
  const fetchAppointments = useCallback(async () => {
    try {
      // Tenta buscar com todos os relacionamentos
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          *,
          professional:profiles!appointments_professional_id_fkey (*),
          client:clients!appointments_client_id_fkey (*),
          service:services!appointments_service_id_fkey (*)
        `
        )
        .gte("start_time", startDate.toISOString())
        .lte("end_time", endDate.toISOString())
        .order("start_time", { ascending: true });

      if (error) {
        // Se houver erro com relacionamentos, tenta buscar só os appointments
        console.warn("Buscando agendamentos sem relacionamentos:", error.message);
        const { data: appointmentsOnly, error: simpleError } = await supabase
          .from("appointments")
          .select("*")
          .gte("start_time", startDate.toISOString())
          .lte("end_time", endDate.toISOString())
          .order("start_time", { ascending: true });

        if (simpleError) {
          console.error("Erro ao buscar agendamentos:", simpleError);
          return [];
        }

        return (appointmentsOnly || []) as AppointmentWithRelations[];
      }

      return (data || []) as AppointmentWithRelations[];
    } catch (err) {
      console.error("Erro ao buscar agendamentos:", err);
      return [];
    }
  }, [startDate, endDate]);

  // Função principal de fetch
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Usar Promise.allSettled para não falhar se uma das queries falhar
      const results = await Promise.allSettled([
        fetchAppointments(),
        fetchProfessionals(),
        fetchServices(),
      ]);

      const appointmentsData = results[0].status === "fulfilled" ? results[0].value : [];
      const professionalsData = results[1].status === "fulfilled" ? results[1].value : [];
      const servicesData = results[2].status === "fulfilled" ? results[2].value : [];

      setAppointments(appointmentsData);
      setProfessionals(professionalsData);
      setServices(servicesData);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar dados";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAppointments, fetchProfessionals, fetchServices]);

  // Atualizar agendamento
  const updateAppointment = useCallback(
    async (
      id: string,
      data: Partial<AppointmentWithRelations>
    ): Promise<{ success: boolean; error?: string }> => {
      // Remover campos de relacionamento antes de enviar
      const { professional, client, service, ...updateData } = data;

      const { error } = await supabase
        .from("appointments")
        .update({
          ...updateData,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    },
    []
  );

  // Atualização otimista e rollback
  const optimisticUpdate = useCallback((id: string, data: Partial<AppointmentWithRelations>) => {
    let previous: AppointmentWithRelations | null = null;

    setAppointments((prev) => {
      return prev.map((apt) => {
        if (apt.id === id) {
          previous = apt;
          return { ...apt, ...data };
        }
        return apt;
      });
    });

    return previous;
  }, []);

  const rollbackUpdate = useCallback((previous: AppointmentWithRelations | null) => {
    if (!previous) return;
    setAppointments((prev) => prev.map((apt) => (apt.id === previous.id ? previous : apt)));
  }, []);

  // Buscar agendamento específico (para merge incremental via Realtime)
  const fetchAppointmentById = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        *,
        professional:profiles!appointments_professional_id_fkey (*),
        client:clients!appointments_client_id_fkey (*),
        service:services!appointments_service_id_fkey (*)
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.warn("Erro ao buscar agendamento para merge incremental:", error.message);
      return null;
    }

    return data as AppointmentWithRelations;
  }, []);

  // Mesclar atualizações do Realtime sem refetch completo
  const handleRealtimeChange = useCallback(
    async (payload: RealtimePostgresChangesPayload<AppointmentWithRelations>) => {
      if (payload.eventType === "DELETE" && payload.old) {
        setAppointments((prev) => prev.filter((apt) => apt.id !== payload.old.id));
        return;
      }

      if ((payload.eventType === "INSERT" || payload.eventType === "UPDATE") && payload.new?.id) {
        const fullRecord = await fetchAppointmentById(payload.new.id);
        const merged = fullRecord || (payload.new as AppointmentWithRelations);

        setAppointments((prev) => {
          const exists = prev.some((apt) => apt.id === merged.id);
          if (exists) {
            return prev.map((apt) => (apt.id === merged.id ? { ...apt, ...merged } : apt));
          }
          return [...prev, merged];
        });
      }
    },
    [fetchAppointmentById]
  );

  // Configurar Realtime subscription
  useEffect(() => {
    // Fetch inicial
    refetch();

    // Configurar canal Realtime
    const channel = supabase
      .channel("appointments-changes")
      .on<AppointmentWithRelations>(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        handleRealtimeChange
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch, handleRealtimeChange]);

  // Converter appointments para eventos do calendário
  const events: CalendarEvent[] = appointments.map((apt) => ({
    id: apt.id,
    title: apt.client?.full_name || "Cliente não informado",
    start: new Date(apt.start_time),
    end: new Date(apt.end_time),
    resourceId: apt.professional_id || "",
    status: apt.status,
    color: apt.service?.color || "#3b82f6",
    appointment: apt,
  }));

  // Converter profissionais para recursos do calendário
  const resources: CalendarResource[] = professionals.map((prof) => ({
    id: prof.id,
    title: prof.full_name || "Profissional",
    avatar: prof.avatar_url,
    services: prof.professional_services?.map((ps) => ps.service.id) || [],
  }));

  return {
    appointments,
    events,
    resources,
    professionals,
    services,
    isLoading,
    error,
    refetch,
    updateAppointment,
    optimisticUpdate,
    rollbackUpdate,
  };
}
