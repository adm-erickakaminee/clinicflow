import { useEffect, useMemo, useState } from "react";
import { startOfDay, endOfDay, format } from "date-fns";
import { supabase } from "../lib/supabase";
import type { AppointmentWithRelations, Profile } from "../lib/types";
import { Button } from "../components/ui/Button";
import { ServiceFlow } from "../components/Professional/ServiceFlow";
import { Loader2 } from "lucide-react";
import { PatientFlowWidget } from "../components/PatientFlow/PatientFlowWidget";

interface DayAgendaItem extends AppointmentWithRelations {}

export function ProfessionalDashboard() {
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [agenda, setAgenda] = useState<DayAgendaItem[]>([]);
  const [selected, setSelected] = useState<DayAgendaItem | null>(null);
  const [soloMode, setSoloMode] = useState(false);
  const [gabyConfig, setGabyConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Obter usuário autenticado
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
        setError(error.message);
        return;
      }
      const uid = data.user?.id || null;
      setUserId(uid);
    });
  }, []);

  // Carregar perfil e settings
  useEffect(() => {
    const loadProfile = async () => {
      if (!userId) return;
      try {
        // Não buscar email (está em auth.users, não em profiles)
        const { data: prof, error: profError } = await supabase
          .from("profiles")
          .select(
            "id, full_name, role, clinic_id, professional_id, phone, avatar_url, created_at, updated_at"
          )
          .eq("id", userId)
          .maybeSingle();

        if (profError) {
          setError(profError.message);
          return;
        }
        setProfile(prof as Profile);

        if (prof?.clinic_id) {
          const { data: settings } = await supabase
            .from("organization_settings")
            .select("solo_mode, gaby_config")
            .eq("clinic_id", prof.clinic_id) // ✅ Mudado de organization_id para clinic_id
            .maybeSingle();
          setSoloMode(Boolean(settings?.solo_mode));
          setGabyConfig(settings?.gaby_config || null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar perfil";
        setError(msg);
      }
    };
    loadProfile();
  }, [userId]);

  // Carregar agenda do dia (filtrada por profissional)
  useEffect(() => {
    const loadAgenda = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      try {
        const start = startOfDay(new Date()).toISOString();
        const end = endOfDay(new Date()).toISOString();

        const { data, error: aptError } = await supabase
          .from("appointments")
          .select(
            `
            *,
            client:clients (*),
            service:services (*),
            professional:profiles (*)
          `
          )
          .eq("professional_id", userId)
          .gte("start_time", start)
          .lte("end_time", end)
          .order("start_time", { ascending: true });

        if (aptError) {
          setError(aptError.message);
          return;
        }

        setAgenda((data || []) as AppointmentWithRelations[]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro ao carregar agenda";
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadAgenda();
  }, [userId]);

  const headerTitle = useMemo(() => {
    if (!profile) return "Dashboard do Profissional";
    return `Olá, ${profile.full_name || "Profissional"}`;
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          <p className="text-slate-400 text-sm">Carregando agenda...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-lg font-semibold">Erro</p>
          <p className="text-sm text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400">Hoje • {format(new Date(), "dd/MM")}</p>
            <h1 className="text-lg font-semibold">{headerTitle}</h1>
          </div>
          <div className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
            Modo Solo {soloMode ? "Ativo" : "Off"}
          </div>
        </div>
      </header>

      <main className="px-3 py-4 space-y-4 max-w-xl mx-auto">
        {/* Fluxo de Atendimento */}
        <section className="space-y-3">
          <PatientFlowWidget />
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Agenda do dia</h2>
          {agenda.length === 0 ? (
            <div className="rounded-2xl border border-slate-900 bg-slate-900/60 p-4 text-sm text-slate-400">
              Nenhum agendamento para hoje.
            </div>
          ) : (
            <div className="space-y-3">
              {agenda.map((apt) => (
                <button
                  key={apt.id}
                  className="w-full text-left rounded-2xl border border-slate-900 bg-slate-900/80 p-4 shadow-sm shadow-black/20 active:scale-[0.99] transition"
                  onClick={() => setSelected(apt)}
                >
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>
                      {format(new Date(apt.start_time), "HH:mm")} —{" "}
                      {format(new Date(apt.end_time), "HH:mm")}
                    </span>
                    <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-white mt-1">
                    {apt.client?.full_name || "Cliente"}
                  </p>
                  <p className="text-xs text-slate-500">{apt.service?.name || "Serviço"} • Sala</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {selected && (
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-200">Fluxo de Atendimento</h3>
              <Button variant="ghost" onClick={() => setSelected(null)} size="sm">
                Fechar
              </Button>
            </div>
            <ServiceFlow
              appointment={selected}
              organizationId={profile?.clinic_id || ""} // clinic_id agora é o único identificador
              soloMode={soloMode}
              gabyConfig={gabyConfig || undefined}
            />
          </section>
        )}
      </main>
    </div>
  );
}
