import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useToast } from "../../components/ui/Toast";
import { Button } from "../../components/ui/Button";

type Step = "service" | "professional" | "slot" | "confirm";

interface Service {
  id: string;
  name: string;
  price: number | null;
}

interface Professional {
  id: string;
  full_name: string | null;
  professional_services?: { service_id: string }[];
}

interface Slot {
  start: Date;
  end: Date;
}

export function BookingFlow() {
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("service");
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const bookingFeeCents = 3000; // R$30 sinal

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserId(data.user?.id || null);
    });
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: svc } = await supabase.from("services").select("*").eq("is_active", true);
        setServices((svc as Service[]) || []);
        const { data: prof } = await supabase
          .from("profiles")
          .select("id, full_name, professional_services (service_id)")
          .eq("role", "professional");
        setProfessionals((prof as Professional[]) || []);
      } catch (err) {
        console.error(err);
        toast.error("Falha ao carregar serviços/profissionais");
      }
    };
    load();
  }, [toast]);

  useEffect(() => {
    if (!serviceId) return;
    const now = new Date();
    const futureSlots: Slot[] = [];
    for (let i = 1; i <= 5; i++) {
      const start = new Date(now.getTime() + i * 60 * 60 * 1000);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      futureSlots.push({ start, end });
    }
    setSlots(futureSlots);
  }, [serviceId]);

  const filteredProfessionals = useMemo(() => {
    if (!serviceId) return professionals;
    return professionals.filter((p) =>
      (p.professional_services || []).some((ps) => ps.service_id === serviceId)
    );
  }, [professionals, serviceId]);

  const handlePayAndConfirm = async () => {
    if (!userId || !serviceId || !professionalId || !selectedSlot) return;
    setLoading(true);
    try {
      // Buscar clinic_id do profissional
      const { data: profData, error: profError } = await supabase
        .from("profiles")
        .select("clinic_id")
        .eq("id", professionalId)
        .single();

      if (profError || !profData?.clinic_id) {
        throw new Error("Erro ao buscar dados do profissional");
      }

      const clinicId = profData.clinic_id;

      // Simula pagamento do sinal (booking fee) via função secure
      const { error: payError } = await supabase.functions.invoke("process-payment", {
        body: {
          clinic_id: clinicId,
          professional_id: professionalId,
          amount_cents: bookingFeeCents,
          platform_fee_percent: 0.06,
          commission_model: "commissioned",
          payment_method: "pix",
        },
      });
      if (payError) throw payError;

      // Cria agendamento com status confirmed
      const { error: insertError } = await supabase.from("appointments").insert({
        clinic_id: clinicId,
        client_id: userId,
        professional_id: professionalId,
        service_id: serviceId,
        start_time: selectedSlot.start.toISOString(),
        end_time: selectedSlot.end.toISOString(),
        status: "confirmed",
      });
      if (insertError) throw insertError;

      toast.success("Agendamento confirmado! Sinal pago.");
      setStep("service");
      setServiceId(null);
      setProfessionalId(null);
      setSelectedSlot(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao confirmar agendamento";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-4 max-w-xl mx-auto">
      <h1 className="text-lg font-semibold mb-4">Agendamento Self-Service</h1>

      {step === "service" && (
        <div className="space-y-3">
          <h2 className="text-sm text-slate-300">Escolha um serviço</h2>
          {services.map((svc) => (
            <button
              key={svc.id}
              className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/70 p-3"
              onClick={() => {
                setServiceId(svc.id);
                setStep("professional");
              }}
            >
              <p className="text-sm font-semibold">{svc.name}</p>
              <p className="text-xs text-slate-400">
                {svc.price ? `R$ ${(svc.price || 0).toFixed(2)}` : "Consulte"}
              </p>
            </button>
          ))}
        </div>
      )}

      {step === "professional" && (
        <div className="space-y-3">
          <h2 className="text-sm text-slate-300">Escolha um profissional</h2>
          {filteredProfessionals.map((prof) => (
            <button
              key={prof.id}
              className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/70 p-3"
              onClick={() => {
                setProfessionalId(prof.id);
                setStep("slot");
              }}
            >
              <p className="text-sm font-semibold">{prof.full_name || "Profissional"}</p>
            </button>
          ))}
          <Button variant="ghost" onClick={() => setStep("service")}>
            Voltar
          </Button>
        </div>
      )}

      {step === "slot" && (
        <div className="space-y-3">
          <h2 className="text-sm text-slate-300">Escolha um horário</h2>
          {slots.map((slot, idx) => (
            <button
              key={idx}
              className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/70 p-3"
              onClick={() => {
                setSelectedSlot(slot);
                setStep("confirm");
              }}
            >
              <p className="text-sm font-semibold">
                {format(slot.start, "dd/MM HH:mm")} - {format(slot.end, "HH:mm")}
              </p>
            </button>
          ))}
          <Button variant="ghost" onClick={() => setStep("professional")}>
            Voltar
          </Button>
        </div>
      )}

      {step === "confirm" && selectedSlot && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-sm text-slate-300 mb-2">Confirme seu agendamento</p>
            <p className="text-sm text-white">
              Horário: {format(selectedSlot.start, "dd/MM HH:mm")} -{" "}
              {format(selectedSlot.end, "HH:mm")}
            </p>
            <p className="text-sm text-slate-400">
              Sinal (booking fee): R$ {(bookingFeeCents / 100).toFixed(2)}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Button variant="default" onClick={handlePayAndConfirm} disabled={loading}>
              {loading ? "Processando..." : "Pagar sinal e confirmar"}
            </Button>
            <Button variant="ghost" onClick={() => setStep("slot")}>
              Voltar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
