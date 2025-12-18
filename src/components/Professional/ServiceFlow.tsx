import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { z } from "zod";
import { evolutionSchema } from "../../schemas/evolutionSchema";
import type { AppointmentWithRelations } from "../../lib/types";
import { Button } from "../ui/Button";
import { useToast } from "../ui/Toast";
import { PatientRecord } from "./PatientRecord";
import { QuickCheckoutModal } from "../Checkout/QuickCheckoutModal";
import type { CheckoutItem } from "../../hooks/useCheckoutCalculator";
import { supabase } from "../../lib/supabase";
import { checkRetentionAlert, type GabyConfig } from "../../gaby/alerts";

interface ServiceFlowProps {
  appointment: AppointmentWithRelations;
  organizationId: string;
  soloMode?: boolean;
  gabyConfig?: GabyConfig;
}

type Step = "start" | "notes" | "services" | "evolution" | "final";

export function ServiceFlow({
  appointment,
  organizationId,
  soloMode = false,
  gabyConfig,
}: ServiceFlowProps) {
  const [step, setStep] = useState<Step>("start");
  const [evolutionText, setEvolutionText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [quickCheckoutOpen, setQuickCheckoutOpen] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);

  const toast = useToast();

  const checkoutItems: CheckoutItem[] = useMemo(() => {
    if (!appointment.service) return [];
    return [
      {
        id: appointment.service.id,
        name: appointment.service.name,
        price_cents: Math.round((appointment.service.price || 0) * 100),
        quantity: 1,
        type: "service",
      },
    ];
  }, [appointment.service]);

  // Fetch rápido de alertas/histórico (tolerante a falhas)
  useEffect(() => {
    const loadAux = async () => {
      try {
        // Buscar regras da Gaby para a clínica (não por client_id - gaby_rules não tem client_id)
        const { data: alertRows } = await supabase
          .from("gaby_rules")
          .select("rule_type, rule_config")
          .eq("clinic_id", organizationId) // organizationId é o clinic_id
          .limit(3);
        const { data: historyRows } = await supabase
          .from("appointments")
          .select("start_time, status, notes")
          .eq("client_id", appointment.client_id)
          .order("start_time", { ascending: false })
          .limit(5);

        // Processar alertas da Gaby (rule_config contém as regras)
        const alertList = (alertRows || []).map((r) => {
          const config = r.rule_config || {};
          return `${r.rule_type || "Regra"}: ${JSON.stringify(config)}`;
        });
        const histList = (historyRows || []).map(
          (r) =>
            `${format(new Date(r.start_time), "dd/MM")} • ${r.status}${
              r.notes ? ` • ${r.notes}` : ""
            }`
        );

        // Retenção: usa última visita e ciclo configurado (fallback 45)
        if (historyRows && historyRows.length > 0) {
          const lastVisit = new Date(historyRows[0].start_time);
          const retentionMsg = checkRetentionAlert(
            lastVisit,
            gabyConfig?.retention_cycle_days ?? 45
          );
          if (retentionMsg) {
            alertList.unshift(retentionMsg);
          }
        }

        setAlerts(alertList);
        setHistory(histList);
      } catch (err) {
        console.warn("Falha ao carregar alertas/histórico", err);
      }
    };
    if (appointment.client_id) {
      loadAux();
    }
  }, [appointment.client_id]);

  const canFinalize = evolutionText.trim().length > 0 && !isSaving;

  const handleFinalize = async () => {
    try {
      evolutionSchema.parse({ evolution: evolutionText });
    } catch (err) {
      const msg = err instanceof z.ZodError ? err.issues[0]?.message : "Evolução obrigatória";
      toast.error(msg);
      return;
    }

    setIsSaving(true);
    try {
      // Registrar evolução (tabela opcional)
      const { error: evoError } = await supabase.from("appointment_evolutions").insert({
        appointment_id: appointment.id,
        professional_id: appointment.professional_id,
        evolution_text: evolutionText, // ✅ Campo correto é evolution_text
        clinic_id: organizationId, // ✅ Mudado de organization_id para clinic_id
      });

      if (evoError) {
        console.warn(
          "Fallback para notes do appointment, tabela evolution indisponível:",
          evoError.message
        );
        await supabase
          .from("appointments")
          .update({ notes: evolutionText, updated_at: new Date().toISOString() })
          .eq("id", appointment.id);
      }

      // Atualizar status do agendamento
      await supabase
        .from("appointments")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", appointment.id);

      if (soloMode) {
        setQuickCheckoutOpen(true);
      } else {
        toast.success("Atendimento finalizado!");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao finalizar atendimento";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-5 gap-2 text-xs text-slate-400">
        {(["start", "notes", "services", "evolution", "final"] as Step[]).map((s) => (
          <div
            key={s}
            className={`flex items-center justify-center rounded-full px-2 py-1 ${
              step === s ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-300"
            }`}
          >
            {s}
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-4 space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-slate-400">Cliente</p>
            <p className="text-sm font-semibold text-white">
              {appointment.client?.full_name || "Cliente"}
            </p>
            <p className="text-xs text-slate-500">
              {appointment.service?.name || "Serviço"} •{" "}
              {format(new Date(appointment.start_time), "HH:mm")}
            </p>
          </div>
          <div className="text-xs text-slate-400 text-right">Sala • {appointment.status}</div>
        </div>

        <PatientRecord alerts={alerts} history={history} photos={[]} />

        <div className="space-y-3">
          <div className="flex gap-2">
            <Button variant="default" className="flex-1" onClick={() => setStep("services")}>
              Add Serviço na Sala
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => setStep("notes")}>
              Prontuário
            </Button>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Evolução (obrigatório)</label>
            <textarea
              className="w-full min-h-[120px] rounded-xl border border-slate-800 bg-slate-800/70 px-3 py-2 text-sm text-white"
              value={evolutionText}
              onChange={(e) => setEvolutionText(e.target.value)}
              placeholder="Descreva a evolução do atendimento..."
            />
            <p className="text-xs text-slate-500">Obrigatório para finalizar.</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="ghost"
            className="w-full sm:w-auto justify-center"
            onClick={() => setStep("start")}
          >
            Voltar
          </Button>
          <Button
            variant="default"
            className="w-full sm:w-auto justify-center"
            onClick={handleFinalize}
            disabled={!canFinalize}
          >
            {isSaving ? "Salvando..." : "Finalizar Atendimento"}
          </Button>
        </div>
      </div>

      {soloMode && (
        <QuickCheckoutModal
          open={quickCheckoutOpen}
          onClose={() => setQuickCheckoutOpen(false)}
          clinicId={organizationId} // ✅ organizationId é o clinic_id neste contexto
          appointmentId={appointment.id}
          clientId={appointment.client_id || undefined}
          items={checkoutItems}
          cashbackMultiplier={gabyConfig?.cashback_multiplier ?? 3}
          onSuccess={() => {
            setQuickCheckoutOpen(false);
            toast.success("Checkout concluído (Modo Solo)");
          }}
        />
      )}
    </div>
  );
}
