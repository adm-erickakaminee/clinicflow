import { useState, useEffect, useMemo } from "react";
import { Clock, User, Calendar, CheckCircle2, CreditCard, Play, FileText, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useScheduler } from "../../context/SchedulerContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "../ui/Toast";
import { QuickCheckoutModal } from "../Checkout/QuickCheckoutModal";
import type { CheckoutItem } from "../../hooks/useCheckoutCalculator";
import { createPortal } from "react-dom";

interface ActiveAppointment {
  id: string;
  client_id: string;
  professional_id: string | null;
  service_id: string | null;
  start_time: string;
  end_time: string;
  status: "pending" | "confirmed" | "waiting" | "in_progress" | "medical_done";
  checkInTime: string | null;
  startTime: string | null;
  endTime: string | null;
  medicalNotes: string | null;
  notes: string | null;
  client?: {
    full_name: string;
    phone: string | null;
  };
  professional?: {
    full_name: string;
  };
  service?: {
    name: string;
    price: number | null;
  };
}

export function AttendanceFlowCard() {
  const { currentUser, updateAppointment } = useScheduler();
  const toast = useToast();
  const [activeAppointments, setActiveAppointments] = useState<ActiveAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ActiveAppointment | null>(null);
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [notesAppointment, setNotesAppointment] = useState<ActiveAppointment | null>(null);
  const [notesText, setNotesText] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const clinicId = currentUser?.clinicId;

  const loadActiveAppointments = async () => {
    if (!clinicId) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("appointments")
        .select(
          `
          id,
          client_id,
          professional_id,
          service_id,
          start_time,
          end_time,
          status,
          checkInTime,
          startTime,
          endTime,
          medicalNotes,
          notes,
          client:clients!appointments_client_id_fkey(id, full_name, phone),
          professional:profiles!appointments_professional_id_fkey(id, full_name),
          service:services!appointments_service_id_fkey(id, name, price)
        `
        )
        .eq("clinic_id", clinicId)
        .in("status", ["pending", "confirmed", "waiting", "in_progress", "medical_done"])
        .order("start_time", { ascending: true });

      // Se houver erro, verificar se é um erro crítico
      if (error) {
        // Códigos de erro que NÃO devem mostrar notificação (ausência de dados, relacionamentos vazios, etc.)
        const silentErrorCodes = ["PGRST116", "42P01", "42703", "42883"];
        const silentErrorMessages = ["no rows", "relation", "column", "does not exist"];

        const isSilentError =
          (error.code && silentErrorCodes.includes(error.code)) ||
          (error.message &&
            silentErrorMessages.some((msg) => error.message.toLowerCase().includes(msg)));

        if (!isSilentError) {
          // Só mostrar erro para problemas críticos (permissão, conexão, etc.)
          console.error("Erro ao carregar agendamentos ativos:", error);
          toast.error("Erro ao carregar agendamentos ativos");
        }
        setActiveAppointments([]);
        setLoading(false);
        return;
      }

      // Mapear dados do Supabase para o formato esperado
      // Se data for null ou undefined, usar array vazio
      const mapped = (data || []).map((apt: any) => ({
        id: apt.id,
        client_id: apt.client_id,
        professional_id: apt.professional_id,
        service_id: apt.service_id,
        start_time: apt.start_time,
        end_time: apt.end_time,
        status: apt.status,
        checkInTime: apt.checkInTime,
        startTime: apt.startTime,
        endTime: apt.endTime,
        medicalNotes: apt.medicalNotes,
        notes: apt.notes,
        client: Array.isArray(apt.client) ? apt.client[0] : apt.client,
        professional: Array.isArray(apt.professional) ? apt.professional[0] : apt.professional,
        service: Array.isArray(apt.service) ? apt.service[0] : apt.service,
      })) as ActiveAppointment[];

      setActiveAppointments(mapped);
    } catch (err) {
      // Em caso de exceção, verificar se é um erro crítico
      const error = err as any;
      const silentErrorCodes = ["PGRST116", "42P01", "42703", "42883"];
      const silentErrorMessages = ["no rows", "relation", "column", "does not exist"];

      const isSilentError =
        (error?.code && silentErrorCodes.includes(error.code)) ||
        (error?.message &&
          silentErrorMessages.some((msg: string) => error.message.toLowerCase().includes(msg)));

      if (!isSilentError) {
        console.error("Erro ao carregar agendamentos ativos:", err);
        toast.error("Erro ao carregar agendamentos ativos");
      }
      setActiveAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActiveAppointments();

    // Realtime subscription
    if (!clinicId) return;

    const channel = supabase
      .channel("active-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `clinic_id=eq.${clinicId}`,
        },
        (payload) => {
          // Recarregar se status mudou para/de estados do fluxo
          const newStatus = (payload.new as any)?.status;
          const oldStatus = (payload.old as any)?.status;
          const flowStatuses = ["pending", "confirmed", "waiting", "in_progress", "medical_done"];

          if (newStatus && flowStatuses.includes(newStatus)) {
            loadActiveAppointments();
          } else if (oldStatus && flowStatuses.includes(oldStatus)) {
            loadActiveAppointments();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId, toast]);

  const handleCheckIn = async (appointment: ActiveAppointment) => {
    if (processingIds.has(appointment.id)) return;

    setProcessingIds((prev) => new Set(prev).add(appointment.id));

    try {
      // Atualizar status para 'waiting' e registrar checkInTime
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "waiting",
          checkInTime: new Date().toISOString(),
        })
        .eq("id", appointment.id);

      if (error) throw error;

      toast.success("Check-in realizado!");
      await loadActiveAppointments();
    } catch (err) {
      console.error("Erro ao realizar check-in:", err);
      toast.error("Erro ao realizar check-in");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(appointment.id);
        return next;
      });
    }
  };

  const handleStartAppointment = async (appointment: ActiveAppointment) => {
    if (processingIds.has(appointment.id)) return;

    setProcessingIds((prev) => new Set(prev).add(appointment.id));

    try {
      // Atualizar status para 'in_progress' e registrar startTime
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "in_progress",
          startTime: new Date().toISOString(),
        })
        .eq("id", appointment.id);

      if (error) throw error;

      toast.success("Atendimento iniciado!");
      await loadActiveAppointments();
    } catch (err) {
      console.error("Erro ao iniciar atendimento:", err);
      toast.error("Erro ao iniciar atendimento");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(appointment.id);
        return next;
      });
    }
  };

  const handleFinishMedical = async (appointment: ActiveAppointment) => {
    if (processingIds.has(appointment.id)) return;

    setProcessingIds((prev) => new Set(prev).add(appointment.id));

    try {
      // Atualizar status para 'medical_done' e registrar endTime
      const { error } = await supabase
        .from("appointments")
        .update({
          status: "medical_done",
          endTime: new Date().toISOString(),
        })
        .eq("id", appointment.id);

      if (error) throw error;

      toast.success("Atendimento médico finalizado!");
      await loadActiveAppointments();
    } catch (err) {
      console.error("Erro ao finalizar atendimento médico:", err);
      toast.error("Erro ao finalizar atendimento médico");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(appointment.id);
        return next;
      });
    }
  };

  const handleOpenNotes = (appointment: ActiveAppointment) => {
    setNotesAppointment(appointment);
    setNotesText(appointment.medicalNotes || appointment.notes || "");
    setNotesModalOpen(true);
  };

  const handleSaveNotes = async () => {
    if (!notesAppointment) return;

    setSavingNotes(true);
    try {
      const { error } = await supabase
        .from("appointments")
        .update({
          medicalNotes: notesText.trim() || null,
          notes: notesText.trim() || null,
        })
        .eq("id", notesAppointment.id);

      if (error) throw error;

      toast.success("Observações salvas!");
      setNotesModalOpen(false);
      setNotesAppointment(null);
      setNotesText("");
      await loadActiveAppointments();
    } catch (err) {
      console.error("Erro ao salvar observações:", err);
      toast.error("Erro ao salvar observações");
    } finally {
      setSavingNotes(false);
    }
  };

  const handleFinalizeAndPay = async (appointment: ActiveAppointment) => {
    if (!appointment.service) {
      toast.error("Serviço não encontrado para este agendamento");
      return;
    }

    setSelectedAppointment(appointment);
    setCheckoutOpen(true);
  };

  const handleCheckoutSuccess = async () => {
    if (!selectedAppointment) return;

    try {
      // Atualizar status para completed após checkout bem-sucedido
      const result = await updateAppointment(selectedAppointment.id, {
        status: "completed",
      });

      if (result.ok) {
        toast.success("Agendamento finalizado!");
        await loadActiveAppointments();
      }
    } catch (err) {
      console.error("Erro ao finalizar agendamento:", err);
    } finally {
      setCheckoutOpen(false);
      setSelectedAppointment(null);
    }
  };

  // Preparar itens para checkout
  const checkoutItems: CheckoutItem[] = useMemo(() => {
    if (!selectedAppointment?.service) return [];

    return [
      {
        id: selectedAppointment.service_id || selectedAppointment.id,
        name: selectedAppointment.service.name,
        price_cents: selectedAppointment.service.price || 0,
        quantity: 1,
        type: "service",
      },
    ];
  }, [selectedAppointment]);

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando fluxo de atendimento...</p>
      </div>
    );
  }

  if (activeAppointments.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="h-6 w-6 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900">Fluxo de Atendimento</h3>
        </div>
        <p className="text-sm text-gray-500">Nenhum agendamento em andamento no momento.</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Pendente",
          className: "bg-gray-50 text-gray-700 border border-gray-100",
        };
      case "confirmed":
        return {
          label: "Confirmado",
          className: "bg-emerald-50 text-emerald-700 border border-emerald-100",
        };
      case "waiting":
        return {
          label: "Aguardando",
          className: "bg-amber-50 text-amber-700 border border-amber-100",
        };
      case "in_progress":
        return {
          label: "Em Atendimento",
          className: "bg-blue-50 text-blue-700 border border-blue-100",
        };
      case "medical_done":
        return {
          label: "Atendimento Concluído",
          className: "bg-purple-50 text-purple-700 border border-purple-100",
        };
      default:
        return {
          label: status,
          className: "bg-gray-50 text-gray-700 border border-gray-100",
        };
    }
  };

  return (
    <>
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="h-6 w-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900">Fluxo de Atendimento</h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold">
            {activeAppointments.length} {activeAppointments.length === 1 ? "ativo" : "ativos"}
          </span>
        </div>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activeAppointments.map((appointment) => {
            const isProcessing = processingIds.has(appointment.id);
            const statusBadge = getStatusBadge(appointment.status);

            // Determinar quais ações estão disponíveis baseado no status
            const canCheckIn =
              appointment.status === "confirmed" || appointment.status === "pending";
            const canStartAppointment = appointment.status === "waiting";
            const canFinishMedical = appointment.status === "in_progress";
            const canFinalize = appointment.status === "medical_done";
            const canAddNotes = ["waiting", "in_progress", "medical_done"].includes(
              appointment.status
            );

            return (
              <div
                key={appointment.id}
                className="bg-white/80 rounded-xl p-4 border border-gray-200"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <p className="font-semibold text-gray-900">
                          {appointment.client?.full_name || "Cliente"}
                        </p>
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${statusBadge.className}`}
                        >
                          {statusBadge.label}
                        </span>
                      </div>
                      {appointment.client?.phone && (
                        <p className="text-sm text-gray-600">{appointment.client.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Service */}
                  {appointment.service && (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <p className="text-sm font-medium text-gray-900">
                        {appointment.service.name}
                      </p>
                      {appointment.service.price && (
                        <span className="text-sm text-gray-500">
                          • R$ {(appointment.service.price / 100).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Professional */}
                  {appointment.professional && (
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      <p className="text-sm text-gray-600">{appointment.professional.full_name}</p>
                    </div>
                  )}

                  {/* Time Info */}
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      {format(new Date(appointment.start_time), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                    {appointment.checkInTime && (
                      <span className="text-xs text-gray-500">
                        • Check-in: {format(new Date(appointment.checkInTime), "HH:mm")}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                    {canCheckIn && (
                      <button
                        onClick={() => handleCheckIn(appointment)}
                        disabled={isProcessing}
                        className="flex-1 min-w-[120px] px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {isProcessing ? "Processando..." : "Check-in"}
                      </button>
                    )}
                    {canStartAppointment && (
                      <button
                        onClick={() => handleStartAppointment(appointment)}
                        disabled={isProcessing}
                        className="flex-1 min-w-[120px] px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <Play className="h-4 w-4" />
                        {isProcessing ? "Processando..." : "Iniciar Atendimento"}
                      </button>
                    )}
                    {canFinishMedical && (
                      <button
                        onClick={() => handleFinishMedical(appointment)}
                        disabled={isProcessing}
                        className="flex-1 min-w-[120px] px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {isProcessing ? "Processando..." : "Finalizar Médico"}
                      </button>
                    )}
                    {canAddNotes && (
                      <button
                        onClick={() => handleOpenNotes(appointment)}
                        disabled={isProcessing}
                        className="px-4 py-2 rounded-lg bg-gray-600 text-white text-sm font-semibold hover:bg-gray-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <FileText className="h-4 w-4" />
                        Observações
                      </button>
                    )}
                    {canFinalize && (
                      <button
                        onClick={() => handleFinalizeAndPay(appointment)}
                        disabled={isProcessing}
                        className="flex-1 min-w-[120px] px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <CreditCard className="h-4 w-4" />
                        Finalizar e Pagar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal */}
      {checkoutOpen && selectedAppointment && clinicId && (
        <QuickCheckoutModal
          open={checkoutOpen}
          onClose={() => {
            setCheckoutOpen(false);
            setSelectedAppointment(null);
          }}
          clinicId={clinicId} // ✅ Padronizado: clinicId
          appointmentId={selectedAppointment.id}
          clientId={selectedAppointment.client_id}
          items={checkoutItems}
          onSuccess={handleCheckoutSuccess}
        />
      )}

      {/* Notes Modal */}
      {notesModalOpen &&
        notesAppointment &&
        createPortal(
          <div className="fixed inset-0 z-50 bg-white/95 flex items-center justify-center px-4">
            <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-gray-900">Observações do Atendimento</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {notesAppointment.client?.full_name || "Cliente"} •{" "}
                    {notesAppointment.service?.name || "Serviço"}
                  </p>
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700 transition"
                  onClick={() => {
                    setNotesModalOpen(false);
                    setNotesAppointment(null);
                    setNotesText("");
                  }}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">
                  Observações e Notas Médicas
                </label>
                <textarea
                  value={notesText}
                  onChange={(e) => setNotesText(e.target.value)}
                  className="w-full min-h-[200px] rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 resize-none"
                  placeholder="Digite observações sobre o atendimento, evolução do paciente, procedimentos realizados, etc..."
                />
                <p className="text-xs text-gray-500">
                  Essas observações ficarão registradas no prontuário do paciente.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-white/60">
                <button
                  className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold"
                  onClick={() => {
                    setNotesModalOpen(false);
                    setNotesAppointment(null);
                    setNotesText("");
                  }}
                  disabled={savingNotes}
                >
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 disabled:opacity-50"
                  onClick={handleSaveNotes}
                  disabled={savingNotes}
                >
                  {savingNotes ? "Salvando..." : "Salvar Observações"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
