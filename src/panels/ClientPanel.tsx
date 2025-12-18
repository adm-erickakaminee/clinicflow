import { useState, useEffect, useMemo, useCallback } from "react";
import { Bell, LogOut, Clock, CheckCircle2, Circle } from "lucide-react";
import { useScheduler } from "../context/SchedulerContext";
import UserProfileModal from "../components/UserProfileModal";
import { supabase } from "../lib/supabase";
import { format, differenceInMinutes } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "../components/ui/Toast";
import { ClientBookingView } from "../pages/Client/ClientBookingView";

// Validação de email
const validateEmail = (email: string): boolean => {
  if (!email) return true; // Email opcional
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

// Validação de telefone
const validatePhone = (phone: string): boolean => {
  if (!phone) return false; // Telefone obrigatório
  return /^[\d\s()+-]{10,}$/.test(phone.replace(/\s/g, ""));
};

export function ClientPanel() {
  const { currentUser, signOut, updateUserProfile, clients } = useScheduler();
  const toast = useToast();
  const [profileModal, setProfileModal] = useState(false);
  const [cashbackBalance, setCashbackBalance] = useState<number>(0);
  const [currentAppointment, setCurrentAppointment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Obter clientId - sempre usar o ID do usuário logado (client.id = auth.uid())
  const clientId = currentUser?.id;

  // Buscar dados reais do banco de dados
  const loadClientData = useCallback(async () => {
    if (!clientId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Buscar clinic_id do cliente
      const { data: clientData } = await supabase
        .from("clients")
        .select("clinic_id")
        .eq("id", clientId)
        .maybeSingle();

      const clinicId = clientData?.clinic_id || currentUser?.clinicId;

      // 2. Buscar saldo de cashback (client_wallet conforme schema - precisa clinic_id)
      if (clinicId) {
        const { data: wallet, error: walletError } = await supabase
          .from("client_wallet")
          .select("balance_cents")
          .eq("client_id", clientId)
          .eq("clinic_id", clinicId)
          .maybeSingle();

        if (walletError && walletError.code !== "PGRST116") {
          console.error("Erro ao buscar wallet:", walletError);
        } else if (wallet) {
          setCashbackBalance(wallet.balance_cents || 0);
        } else {
          setCashbackBalance(0);
        }
      } else {
        setCashbackBalance(0);
      }

      // 3. Buscar agendamento em andamento (in_progress ou medical_done)
      const { data: inProgressAppt, error: apptError } = await supabase
        .from("appointments")
        .select(
          `
          *,
          service:services(id, name, price),
          professional:profiles!appointments_professional_id_fkey(id, full_name)
        `
        )
        .eq("client_id", clientId)
        .in("status", ["waiting", "in_progress", "medical_done"])
        .order("start_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (apptError && apptError.code !== "PGRST116") {
        console.error("Erro ao buscar agendamento em andamento:", apptError);
      } else if (inProgressAppt) {
        setCurrentAppointment(inProgressAppt);
      } else {
        setCurrentAppointment(null);
      }
    } catch (err) {
      console.error("Erro ao carregar dados do cliente:", err);
      toast.error("Erro ao carregar seus dados. Por favor, recarregue a página.");
    } finally {
      setLoading(false);
    }
  }, [clientId, currentUser?.clinicId, toast]);

  // Carregar dados iniciais
  useEffect(() => {
    loadClientData();
  }, [loadClientData]);

  // Realtime subscription para appointments
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel("client-appointments")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          console.log("🔔 Mudança no agendamento recebida:", payload);

          // Recarregar dados quando houver mudanças
          loadClientData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId, loadClientData]);

  // Realtime subscription para wallet
  useEffect(() => {
    if (!clientId) return;

    const channel = supabase
      .channel("client-wallet")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "client_wallet",
          filter: `client_id=eq.${clientId}`,
        },
        (payload) => {
          console.log("💰 Mudança no wallet recebida:", payload);

          if (payload.eventType === "UPDATE" && payload.new) {
            setCashbackBalance((payload.new as any).balance_cents || 0);
          } else if (payload.eventType === "INSERT" && payload.new) {
            setCashbackBalance((payload.new as any).balance_cents || 0);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const client = useMemo(() => {
    return clients.find((c) => c.id === clientId);
  }, [clients, clientId]);

  const userName = currentUser?.fullName || client?.name || "Usuário";
  const userRole = currentUser?.role || "";
  const avatarUrl = currentUser?.avatarUrl || "";
  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2);

  const cashbackFormatted = (cashbackBalance / 100).toFixed(2);
  const [showBookingModal, setShowBookingModal] = useState(false);

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-[#ffb3a7] via-[#ffc78f] to-[#ffe7a3] text-gray-900 font-sans overflow-hidden">
      {/* Blobs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-[#ff8fa3] blur-3xl opacity-70 animate-pulse" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[#ffd27f] blur-[120px] opacity-80 animate-pulse" />
        <div className="absolute -right-28 bottom-6 h-[28rem] w-[28rem] rounded-full bg-[#ffeab5] blur-[120px] opacity-80 animate-pulse" />
        <div className="absolute left-10 bottom-10 h-64 w-64 rounded-full bg-white/50 blur-[90px] opacity-70" />
      </div>

      <div className="relative max-w-7xl mx-auto px-6 py-8 space-y-6">
        <Header
          userName={userName}
          userRole={userRole}
          avatarUrl={avatarUrl}
          initials={initials}
          cashbackBalance={cashbackFormatted}
          onProfileClick={() => setProfileModal(true)}
          onLogout={() => signOut()}
        />

        {loading ? (
          <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
            <p className="text-sm text-gray-600">Carregando dados...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Botão de Agendar Novo Serviço */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowBookingModal(true)}
                className="px-6 py-3 rounded-xl bg-purple-600 text-white font-semibold hover:bg-purple-700 transition shadow-lg"
              >
                + Agendar Novo Serviço
              </button>
            </div>

            {/* Bloco 1: Status do Atendimento Atual */}
            {currentAppointment ? (
              <CurrentAppointmentCard appointment={currentAppointment} />
            ) : (
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
                <p className="text-sm text-gray-600">Nenhum agendamento em andamento no momento.</p>
              </div>
            )}

            {/* Bloco 2: Informações do Cliente */}
            {clientId ? (
              <ClientInfoCard
                client={
                  client || {
                    id: clientId,
                    name: currentUser?.fullName || "Cliente",
                    email: currentUser?.email || "",
                    phone: (currentUser as any)?.phone || "",
                  }
                }
                clientId={clientId}
                onUpdate={async (updatedClient) => {
                  // Validações
                  if (!validatePhone(updatedClient.phone)) {
                    toast.error("Telefone inválido. Use pelo menos 10 dígitos.");
                    throw new Error("Telefone inválido");
                  }

                  if (updatedClient.email && !validateEmail(updatedClient.email)) {
                    toast.error("Email inválido.");
                    throw new Error("Email inválido");
                  }

                  try {
                    // Buscar clinic_id do cliente
                    const { data: clientData } = await supabase
                      .from("clients")
                      .select("clinic_id")
                      .eq("id", clientId)
                      .single();

                    const clinicId = clientData?.clinic_id || currentUser?.clinicId;

                    // Atualizar no banco (tabela clients)
                    const { error: clientError } = await supabase
                      .from("clients")
                      .update({
                        full_name: updatedClient.name,
                        email: updatedClient.email || null,
                        phone: updatedClient.phone,
                      })
                      .eq("id", clientId);

                    if (clientError) {
                      // Se registro não existe, criar
                      if (clientError.code === "PGRST116" || clientError.code === "42P01") {
                        const { error: insertError } = await supabase.from("clients").insert({
                          id: clientId,
                          clinic_id: clinicId || currentUser?.clinicId || "",
                          full_name: updatedClient.name,
                          email: updatedClient.email || null,
                          phone: updatedClient.phone,
                        });

                        if (insertError) throw insertError;
                      } else {
                        throw clientError;
                      }
                    }

                    // Também atualizar no profile
                    const { error: profileError } = await supabase
                      .from("profiles")
                      .update({
                        full_name: updatedClient.name,
                        phone: updatedClient.phone,
                      })
                      .eq("id", clientId);

                    if (profileError && profileError.code !== "PGRST116") {
                      console.warn("Erro ao atualizar profile:", profileError);
                      // Não é crítico, continuar
                    }

                    toast.success("Informações atualizadas com sucesso!");
                  } catch (err: any) {
                    console.error("Erro ao atualizar cliente:", err);
                    const message =
                      err.message || "Erro ao atualizar informações. Tente novamente.";
                    toast.error(message);
                    throw err;
                  }
                }}
              />
            ) : (
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
                <p className="text-sm text-gray-600">Aguardando identificação do cliente...</p>
              </div>
            )}
          </div>
        )}
      </div>

      {profileModal && (
        <UserProfileModal
          isOpen={profileModal}
          onClose={() => setProfileModal(false)}
          user={{
            name: currentUser?.fullName || "",
            email: currentUser?.email || "",
            role: currentUser?.role || "",
            avatarUrl: avatarUrl,
          }}
          onSave={async (name, avatar) => {
            try {
              await updateUserProfile({ fullName: name, avatarUrl: avatar });
              await new Promise((resolve) => setTimeout(resolve, 100));
              setProfileModal(false);
              toast.success("Perfil atualizado com sucesso!");
            } catch (error) {
              console.error("Erro ao salvar perfil:", error);
              toast.error("Erro ao salvar perfil. Tente novamente.");
              throw error;
            }
          }}
          onLogout={async () => {
            await signOut();
          }}
        />
      )}

      {/* Modal de Agendamento */}
      {showBookingModal && (
        <ClientBookingView
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => {
            loadClientData(); // Recarregar dados após agendamento
          }}
        />
      )}
    </div>
  );
}

function Header({
  userName,
  userRole,
  avatarUrl,
  initials,
  cashbackBalance,
  onProfileClick,
  onLogout,
}: {
  userName: string;
  userRole: string;
  avatarUrl: string;
  initials: string;
  cashbackBalance: string;
  onProfileClick: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Olá, {userName} 👋</h1>
        <p className="text-sm text-gray-500">{userRole}</p>
      </div>
      <div className="flex items-center gap-3">
        {/* Saldo de Cashback */}
        <div className="px-4 py-2 rounded-2xl bg-green-500/20 border border-green-500/30 shadow-lg">
          <p className="text-xs text-green-700 font-semibold">Cashback</p>
          <p className="text-lg font-bold text-green-700">R$ {cashbackBalance}</p>
        </div>

        <button className="h-11 w-11 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg flex items-center justify-center text-gray-700">
          <Bell className="h-5 w-5" />
        </button>

        <div
          className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/70 border border-white/60 shadow cursor-pointer hover:bg-white/90 transition"
          onClick={onProfileClick}
        >
          <div className="h-10 w-10 rounded-full overflow-hidden bg-gray-200 border border-white/60 shadow-inner flex items-center justify-center text-sm font-semibold text-gray-700">
            {avatarUrl ? (
              <img src={avatarUrl} alt={userName} className="h-full w-full object-cover" />
            ) : (
              initials
            )}
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-sm font-semibold text-gray-900">{userName}</span>
            <span className="text-xs text-gray-500">Perfil</span>
          </div>
        </div>

        <button
          className="h-11 px-4 rounded-2xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-lg text-sm font-semibold text-gray-800 flex items-center gap-2"
          onClick={onLogout}
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </div>
  );
}

function CurrentAppointmentCard({ appointment }: { appointment: any }) {
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    // Usar startTime conforme schema do banco (camelCase)
    const startTime = appointment.startTime;
    if (!startTime) return;

    const calculateTime = () => {
      const start = new Date(startTime);
      const now = new Date();
      const diff = differenceInMinutes(now, start);
      setTimerSeconds(Math.max(0, diff * 60));
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, [appointment.startTime]);

  const serviceName = appointment.service?.name || "Serviço";
  const professionalName = appointment.professional?.full_name || "Profissional";
  const servicePrice = (appointment.service?.price || 0) / 100; // Converter centavos para reais
  const formattedPrice = `R$ ${servicePrice.toFixed(2)}`;

  // Timeline steps - usando campos do schema correto
  const checkInTime = appointment.checkInTime || null;
  const startTime = appointment.startTime || null;

  const steps = [
    { key: "checkin", label: "Check-in", completed: !!checkInTime },
    { key: "start", label: "Início", completed: !!startTime },
    {
      key: "notes",
      label: "Observações/Anamnese",
      completed: appointment.status === "medical_done",
    },
    {
      key: "checkout",
      label: "Check-out/Pagamento",
      completed: appointment.status === "completed",
    },
    { key: "review", label: "Avaliação", completed: false }, // TODO: Implementar quando tiver tabela appointment_ratings
  ];

  const activeStepIndex = steps.findIndex((s) => !s.completed);
  const currentStep = activeStepIndex === -1 ? steps.length - 1 : activeStepIndex;

  const formatTimer = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  return (
    <div className="bg-gray-900 rounded-3xl p-6 text-white shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <p className="text-sm text-gray-400 mb-1">Serviço</p>
          <p className="text-lg font-semibold">{serviceName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Profissional</p>
          <p className="text-lg font-semibold">{professionalName}</p>
        </div>
        <div>
          <p className="text-sm text-gray-400 mb-1">Valor</p>
          <p className="text-lg font-semibold">{formattedPrice}</p>
        </div>
      </div>

      {/* Timer */}
      {startTime && (
        <div className="mb-6 flex items-center gap-3 bg-gray-800/50 rounded-2xl p-4">
          <Clock className="h-6 w-6 text-orange-400" />
          <div>
            <p className="text-sm text-gray-400">Tempo de atendimento</p>
            <p className="text-2xl font-bold text-orange-400">{formatTimer(timerSeconds)}</p>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = step.completed;
            const progress = index <= currentStep ? 100 : 0;

            return (
              <div key={step.key} className="flex-1 flex flex-col items-center relative">
                {/* Linha conectora */}
                {index < steps.length - 1 && (
                  <div className="absolute top-5 left-[60%] w-full h-1 bg-gray-700 z-0">
                    <div
                      className="h-full bg-orange-500 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}

                {/* Círculo do step */}
                <div
                  className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isCompleted
                      ? "bg-orange-500 border-orange-500"
                      : isActive
                        ? "bg-orange-500/20 border-orange-500 ring-4 ring-orange-500/20"
                        : "bg-gray-800 border-gray-700"
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <Circle className="h-5 w-5 text-gray-400" />
                  )}
                </div>

                {/* Label */}
                <p
                  className={`mt-2 text-xs text-center max-w-[100px] ${
                    isActive || isCompleted ? "text-orange-400 font-semibold" : "text-gray-400"
                  }`}
                >
                  {step.label}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ClientInfoCard({
  client,
  clientId: propClientId,
  onUpdate,
}: {
  client: any;
  clientId: string | undefined;
  onUpdate: (client: any) => Promise<void>;
}) {
  const { currentUser } = useScheduler();
  const toast = useToast();
  const clientId = propClientId || currentUser?.id || client.id;
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [formData, setFormData] = useState({
    name: client.name || client.full_name || "",
    email: client.email || "",
    phone: client.phone || client.mobile || "",
  });
  const [anamnesis, setAnamnesis] = useState<any>(null);
  const [appointmentHistory, setAppointmentHistory] = useState<any[]>([]);
  const [topServices, setTopServices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Carregar dados reais do banco
  useEffect(() => {
    const loadClientData = async () => {
      if (!clientId) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        // 1. Buscar anamnese (se existir tabela client_anamnesis)
        try {
          const { data: anamnesisData } = await supabase
            .from("client_anamnesis")
            .select("*")
            .eq("client_id", clientId)
            .maybeSingle();

          if (anamnesisData) {
            setAnamnesis(anamnesisData);
          }
        } catch (err) {
          // Tabela pode não existir ainda, ignorar
          console.warn("Tabela client_anamnesis não disponível:", err);
        }

        // 2. Buscar histórico de agendamentos concluídos
        const { data: historyData, error: historyError } = await supabase
          .from("appointments")
          .select(
            `
            id,
            start_time,
            status,
            cashback_earned_cents,
            service:services(id, name, price),
            professional:profiles!appointments_professional_id_fkey(id, full_name)
          `
          )
          .eq("client_id", clientId)
          .eq("status", "completed")
          .order("start_time", { ascending: false })
          .limit(20);

        if (historyError) {
          console.error("Erro ao buscar histórico:", historyError);
        } else {
          setAppointmentHistory(historyData || []);
        }

        // 3. Calcular serviços mais executados com cashback
        const { data: servicesData, error: servicesError } = await supabase
          .from("appointments")
          .select(
            `
            service_id,
            cashback_earned_cents,
            service:services(id, name)
          `
          )
          .eq("client_id", clientId)
          .eq("status", "completed")
          .not("service_id", "is", null);

        if (servicesError) {
          console.error("Erro ao buscar serviços:", servicesError);
        } else if (servicesData) {
          // Agrupar por service_id e calcular totais
          const serviceMap = new Map<
            string,
            { name: string; count: number; cashback_earned_cents: number }
          >();

          servicesData.forEach((apt: any) => {
            if (!apt.service_id || !apt.service) return;

            const existing = serviceMap.get(apt.service_id) || {
              name: apt.service.name,
              count: 0,
              cashback_earned_cents: 0,
            };

            existing.count++;
            existing.cashback_earned_cents += apt.cashback_earned_cents || 0;

            serviceMap.set(apt.service_id, existing);
          });

          // Converter para array e ordenar por count
          const topServicesList = Array.from(serviceMap.values())
            .map((svc, idx) => ({ id: `svc-${idx}`, ...svc }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

          setTopServices(topServicesList);
        }
      } catch (err) {
        console.error("Erro ao carregar dados do cliente:", err);
        toast.error("Erro ao carregar histórico. Tente recarregar a página.");
      } finally {
        setLoadingData(false);
      }
    };

    loadClientData();
  }, [clientId, toast]);

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Minhas Informações</h2>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition"
          >
            Editar
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Nome *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
              placeholder="opcional"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Telefone *</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 focus:outline-none"
              required
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={async () => {
                if (!formData.name.trim()) {
                  toast.error("Nome é obrigatório");
                  return;
                }

                if (!formData.phone.trim()) {
                  toast.error("Telefone é obrigatório");
                  return;
                }

                setIsUpdating(true);
                try {
                  await onUpdate(formData);
                  setIsEditing(false);
                } catch (err) {
                  // Erro já foi tratado no onUpdate
                } finally {
                  setIsUpdating(false);
                }
              }}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? "Salvando..." : "Salvar"}
            </button>
            <button
              onClick={() => {
                setFormData({
                  name: client.name || client.full_name || "",
                  email: client.email || "",
                  phone: client.phone || client.mobile || "",
                });
                setIsEditing(false);
              }}
              disabled={isUpdating}
              className="px-4 py-2 rounded-xl bg-white/70 border border-white/60 text-gray-800 text-sm font-semibold hover:bg-white transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Nome</p>
            <p className="text-base font-semibold text-gray-900">
              {client.name || client.full_name || "Não informado"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-base font-semibold text-gray-900">
              {client.email || "Não informado"}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Telefone</p>
            <p className="text-base font-semibold text-gray-900">
              {client.phone || client.mobile || "Não informado"}
            </p>
          </div>
        </div>
      )}

      {/* Ficha de Anamnese */}
      <div className="mt-8 pt-8 border-t border-white/60">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ficha de Anamnese</h3>
        {loadingData ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : anamnesis ? (
          <div className="space-y-3 bg-white/40 rounded-xl p-4 border border-white/60">
            {anamnesis.allergies && anamnesis.allergies.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Alergias</p>
                <p className="text-sm text-gray-600">
                  {Array.isArray(anamnesis.allergies)
                    ? anamnesis.allergies.join(", ")
                    : anamnesis.allergies}
                </p>
              </div>
            )}
            {anamnesis.medications && anamnesis.medications.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Medicamentos</p>
                <p className="text-sm text-gray-600">
                  {Array.isArray(anamnesis.medications)
                    ? anamnesis.medications.join(", ")
                    : anamnesis.medications}
                </p>
              </div>
            )}
            {anamnesis.notes && (
              <div>
                <p className="text-sm font-semibold text-gray-700">Observações</p>
                <p className="text-sm text-gray-600">{anamnesis.notes}</p>
              </div>
            )}
            {!anamnesis.allergies?.length && !anamnesis.medications?.length && !anamnesis.notes && (
              <p className="text-sm text-gray-500">Nenhuma informação de anamnese cadastrada.</p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhuma informação de anamnese cadastrada.</p>
        )}
      </div>

      {/* Histórico de Agendamentos */}
      <div className="mt-6 pt-6 border-t border-white/60">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Histórico de Agendamentos</h3>
        {loadingData ? (
          <p className="text-sm text-gray-500">Carregando...</p>
        ) : appointmentHistory.length > 0 ? (
          <div className="space-y-2">
            {appointmentHistory.map((apt: any) => (
              <div key={apt.id} className="bg-white/40 rounded-xl p-3 border border-white/60">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {apt.service?.name || "Serviço"}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(new Date(apt.start_time), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Profissional: {apt.professional?.full_name || "Não informado"}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700">
                    Concluído
                  </span>
                </div>
                {apt.cashback_earned_cents > 0 ? (
                  <div className="mt-2 pt-2 border-t border-white/60">
                    <p className="text-xs text-gray-500">Cashback ganho:</p>
                    <p className="text-sm font-semibold text-green-600">
                      + R$ {(apt.cashback_earned_cents / 100).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-white/60">
                    <p className="text-xs text-gray-400 italic">Sem cashback neste atendimento</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">Nenhum agendamento no histórico.</p>
        )}
      </div>

      {/* Serviços Mais Executados */}
      {topServices.length > 0 && (
        <div className="mt-6 pt-6 border-t border-white/60">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Serviços Mais Executados</h3>
          <div className="space-y-2">
            {topServices.map((service, index) => (
              <div key={service.id} className="bg-white/40 rounded-xl p-3 border border-white/60">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{service.name}</p>
                      <p className="text-xs text-gray-500">
                        {service.count} vez{service.count > 1 ? "es" : ""}
                      </p>
                    </div>
                  </div>
                </div>
                {service.cashback_earned_cents > 0 ? (
                  <div className="mt-2 pt-2 border-t border-white/60">
                    <p className="text-xs text-gray-500">Cashback total ganho:</p>
                    <p className="text-sm font-semibold text-green-600">
                      + R$ {(service.cashback_earned_cents / 100).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <div className="mt-2 pt-2 border-t border-white/60">
                    <p className="text-xs text-gray-400 italic">Sem cashback acumulado</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ClientPanel;
