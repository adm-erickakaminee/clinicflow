import { useEffect, useState } from "react";
import { format, differenceInHours } from "date-fns";
import { supabase } from "../../lib/supabase";
import { Button } from "../../components/ui/Button";
import { useToast } from "../../components/ui/Toast";

interface Appointment {
  id: string;
  start_time: string;
  end_time: string;
  status: string;
  service?: { name?: string };
  professional?: { full_name?: string };
}

export function ClientDashboard() {
  const toast = useToast();
  const [userId, setUserId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [cashbackCents, setCashbackCents] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null));
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!userId) return;
      setLoading(true);
      try {
        const { data: appts } = await supabase
          .from("appointments")
          .select(
            "id, start_time, end_time, status, service:services (name), professional:profiles (full_name)"
          )
          .eq("client_id", userId)
          .order("start_time", { ascending: true });
        setAppointments((appts as Appointment[]) || []);

        // cashback: tenta buscar de wallet; fallback zero
        const { data: wallet } = await supabase
          .from("client_wallet")
          .select("balance_cents")
          .eq("client_id", userId)
          .maybeSingle();

        if (wallet && "balance_cents" in wallet) {
          setCashbackCents(wallet.balance_cents as number);
        } else {
          setCashbackCents(0);
        }
      } catch (err) {
        console.warn(err);
        toast.error("Falha ao carregar dados do cliente");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [userId, toast]);

  const handleCancel = async (apt: Appointment) => {
    const hoursDiff = differenceInHours(new Date(apt.start_time), new Date());
    if (hoursDiff < 24) {
      toast.error("Cancelamento a <24h não devolve o sinal (Regra Gaby)");
      return;
    }

    const { error } = await supabase
      .from("appointments")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", apt.id)
      .eq("client_id", userId || "");

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Agendamento cancelado");
      setAppointments((prev) =>
        prev.map((a) => (a.id === apt.id ? { ...a, status: "cancelled" } : a))
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400 text-sm">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-4 max-w-xl mx-auto space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Carteira Cashback</p>
          <p className="text-lg font-semibold">R$ {(cashbackCents / 100).toFixed(2)}</p>
        </div>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-200">Meus agendamentos</h2>
        {appointments.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">
            Nenhum agendamento encontrado.
          </div>
        ) : (
          appointments.map((apt) => (
            <div
              key={apt.id}
              className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 space-y-2"
            >
              <div className="flex justify-between text-xs text-slate-400">
                <span>{format(new Date(apt.start_time), "dd/MM HH:mm")}</span>
                <span className="px-2 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  {apt.status}
                </span>
              </div>
              <p className="text-sm text-white">{apt.service?.name || "Serviço"}</p>
              <p className="text-xs text-slate-400">
                Profissional: {apt.professional?.full_name || "A definir"}
              </p>
              {apt.status !== "cancelled" && (
                <Button variant="ghost" size="sm" onClick={() => handleCancel(apt)}>
                  Cancelar
                </Button>
              )}
            </div>
          ))
        )}
      </section>
    </div>
  );
}
