import { useMemo, useState, useEffect, useCallback } from "react";
import {
  Search,
  Plus,
  Wallet2,
  AlertTriangle,
  Activity,
  Calendar,
  Stethoscope,
  Edit2,
} from "lucide-react";
import { format, isAfter } from "date-fns";
import { AppointmentModal } from "./SchedulerView";
import { useScheduler, type SchedulerClient } from "../context/SchedulerContext";
import { MedicalRecordTab } from "./MedicalRecordTab";

type TabKey = "overview" | "medical" | "history";

interface AppointmentModalData {
  mode: "create" | "edit";
  profId: string;
  time: string;
  date: Date;
  event?: {
    id: string;
    professionalId: string;
    clinicId: number;
    clientId: string;
    patient: string;
    start: string;
    end: string;
    type: "appointment";
  };
}

export function ClientsView() {
  const {
    clients = [],
    appointments = [],
    professionals = [],
    saveAnamnesis,
    addEvolution,
    addDocument,
    addClient,
    updateClient,
    currentUser,
    saveHealthTags,
    saveForm,
  } = useScheduler();

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<AppointmentModalData | null>(null);
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<SchedulerClient | null>(null);

  // Atualizar selectedId quando clients mudar
  useEffect(() => {
    if (clients.length > 0 && !selectedId) {
      setSelectedId(clients[0]?.id ?? null);
    }
  }, [clients, selectedId]);

  const filtered = useMemo(() => {
    return clients
      .filter((c) => {
        const name = c.name || "";
        return name.toLowerCase().includes(query.toLowerCase());
      })
      .sort((a, b) => {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return nameA.localeCompare(nameB, "pt", { sensitivity: "base" });
      });
  }, [clients, query]);

  const selected = filtered.find((c) => c.id === selectedId) ?? filtered[0];

  const clientAppointments = useMemo(
    () =>
      appointments
        .filter((a) => a.clientId === selected?.id)
        .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [appointments, selected]
  );

  const nextAppointment = clientAppointments.find((a) => isAfter(new Date(a.start), new Date()));
  const completed = clientAppointments.filter((a) => a.status === "completed");
  // Note: SchedulerAppointment doesn't have a 'value' field, using 0 as default
  const ltv = completed.reduce((sum) => sum + 0, 0);
  const freq = clientAppointments.length;

  const isAdminView = currentUser?.role === "admin" || currentUser?.role === "clinic_owner";
  const loyaltyLevel = ltv > 2000 ? "Ouro" : ltv > 1000 ? "Prata" : "Bronze";

  const handleNewAppointment = () => {
    if (!selected) return;
    const profId = professionals.find((p) => p.id !== "all")?.id ?? "";
    const patientName = selected.name || "";

    // Obter clinicId do contexto e converter UUID (string) para number
    // BaseEvent requer clinicId como number, mas currentUser.clinicId é string (UUID)
    // Usar a mesma lógica de conversão do SchedulerContext
    const clinicIdNumber = currentUser?.clinicId
      ? parseInt(
          ((currentUser.clinicId as string) || "1").toString().slice(0, 8).replace(/-/g, ""),
          16
        ) || 1
      : 1;

    // Criar objeto event com todas as propriedades obrigatórias do BaseEvent
    const now = new Date();
    const startDate = new Date(now);
    startDate.setHours(9, 0, 0, 0);
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + 30);

    setModalData({
      mode: "create",
      profId: profId || "",
      time: "09:00",
      date: new Date(),
      event: {
        id: "", // ID temporário - será gerado ao salvar
        professionalId: profId || "",
        clinicId: clinicIdNumber,
        clientId: selected.id,
        patient: patientName,
        start: startDate.toISOString(),
        end: endDate.toISOString(),
        type: "appointment",
      },
    });
    setModalOpen(true);
  };

  const handleAddEvolution = useCallback(() => {
    if (!selected) return;
    // Generate ID using timestamp in callback to avoid impure function during render
    const timestamp = Date.now();
    const evo = {
      id: String(timestamp),
      date: new Date().toISOString(),
      professionalId: professionals.find((p) => p.id !== "all")?.id ?? "",
      description: "Evolução adicionada",
      procedure: "Consulta",
    };
    addEvolution(selected.id, evo);
  }, [selected, professionals, addEvolution]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px,1fr] gap-6">
      {/* Lista */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-4 flex flex-col gap-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-white/70 border border-white/60 shadow-inner">
          <Search className="h-4 w-4 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar cliente"
            className="flex-1 bg-transparent text-sm text-gray-800 outline-none"
          />
        </div>

        <div className="space-y-2 max-h-[70vh] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-600">
              {query ? "Nenhum cliente encontrado." : "Nenhum cliente cadastrado."}
            </div>
          ) : (
            filtered.map((c) => {
              const active = selected?.id === c.id;
              const hasBalance = (c.walletBalance || 0) > 0;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`w-full text-left rounded-2xl border px-3 py-3 flex items-center gap-3 transition shadow-sm ${
                    active
                      ? "bg-white border-white shadow-lg ring-2 ring-gray-900/10"
                      : "bg-white/70 border-white/60 hover:bg-white"
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600">
                    {(c.name || "C").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {c.name || "Cliente sem nome"}
                    </p>
                    <p className="text-xs text-gray-500">{c.mobile || c.phone || "Sem telefone"}</p>
                  </div>
                  {hasBalance ? (
                    <Wallet2 className="h-4 w-4 text-amber-500" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-gray-300" />
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          className="h-11 rounded-2xl bg-gray-900 text-white font-semibold shadow-lg shadow-black/10 flex items-center justify-center gap-2"
          onClick={() => {
            setEditingClient(null);
            setClientModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>

      {/* Detalhe */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-5 space-y-4">
        {!selected ? (
          <div className="h-full flex items-center justify-center text-gray-600 text-sm">
            Selecione um cliente para visualizar.
          </div>
        ) : (
          <>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center text-base font-semibold text-gray-700">
                  {(selected.name || "C").charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-base font-semibold text-gray-900">
                    {selected.name || "Cliente sem nome"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selected.email ?? selected.mobile ?? selected.phone ?? "Sem contato"}
                  </p>
                </div>
              </div>
              <button
                className="text-xs font-semibold text-gray-700 px-3 py-2 rounded-xl bg-white/80 border border-white/60 flex items-center gap-1"
                onClick={() => {
                  setEditingClient(selected);
                  setClientModalOpen(true);
                }}
              >
                <Edit2 className="h-3 w-3" />
                Editar
              </button>

              <div className="rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-black text-white px-4 py-3 shadow-lg w-full lg:w-80">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wide">Wallet</span>
                  <Wallet2 className="h-4 w-4" />
                </div>
                <p className="text-[13px] mt-1 opacity-80">Saldo Cashback</p>
                <p className="text-2xl font-semibold">
                  R$ {selected.walletBalance?.toFixed(2) ?? "0,00"}
                </p>
                {isAdminView && (
                  <button className="mt-2 text-xs font-semibold text-white/90 underline underline-offset-4">
                    Ajustar manualmente
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              {[
                { key: "overview", label: "Resumo & Métricas" },
                { key: "medical", label: "Prontuário" },
                { key: "history", label: "Histórico" },
              ].map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as TabKey)}
                  className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition ${
                    tab === t.key
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white/70 text-gray-800 border-white/70 hover:bg-white"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {isAdminView ? (
                  <MetricCard
                    icon={<Activity className="h-4 w-4 text-emerald-600" />}
                    label="LTV"
                    value={`R$ ${ltv.toFixed(2)}`}
                  />
                ) : (
                  <MetricCard
                    icon={<Activity className="h-4 w-4 text-emerald-600" />}
                    label="Nível de Fidelidade"
                    value={loyaltyLevel}
                  />
                )}
                <MetricCard
                  icon={<Stethoscope className="h-4 w-4 text-blue-600" />}
                  label="Frequência"
                  value={`${freq} visitas`}
                />
                <MetricCard
                  icon={<Calendar className="h-4 w-4 text-amber-600" />}
                  label="Próximo agendamento"
                  value={
                    nextAppointment
                      ? `${format(new Date(nextAppointment.start), "dd/MM 'às' HH:mm")} • ${nextAppointment.procedure ?? "Consulta"}`
                      : "Nenhum agendamento futuro"
                  }
                />
                {/* Cards extras para recepção */}
                {!isAdminView && (
                  <>
                    <Card title="Tags de Comportamento">
                      <TagList
                        items={["Pontual", "Prefere WhatsApp"]}
                        empty="Sem tags."
                        color="blue"
                      />
                    </Card>
                    <Card title="Preferências">
                      <p className="text-sm text-gray-700">
                        Prefere contato por Whats. Café sem açúcar.
                      </p>
                    </Card>
                    <Card title="Pendências">
                      <div className="space-y-1 text-sm text-gray-800">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300" /> Termo
                          Assinado?
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" className="rounded border-gray-300" /> Doc Enviado?
                        </label>
                      </div>
                    </Card>
                  </>
                )}
                <div className="md:col-span-3 flex justify-end">
                  <button
                    onClick={handleNewAppointment}
                    className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10"
                  >
                    Novo Agendamento
                  </button>
                </div>
              </div>
            )}

            {tab === "medical" && selected && (
              <MedicalRecordTab
                client={selected}
                canEdit={isAdminView}
                onSave={(data) => saveAnamnesis(selected.id, data)}
                onAddDocument={(doc) => addDocument(selected.id, doc)}
                onAddEvolution={isAdminView ? () => handleAddEvolution() : undefined}
                onSaveHealthTags={(tags) => saveHealthTags(selected.id, tags)}
                onSaveForm={(form) => saveForm(selected.id, form)}
              />
            )}

            {tab === "history" && (
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {clientAppointments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl bg-white/70 border border-white/60 px-3 py-3 flex items-center justify-between shadow-sm"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {format(new Date(a.start), "dd/MM/yyyy 'às' HH:mm")}
                      </p>
                      <p className="text-xs text-gray-500">
                        {a.procedure ?? a.title ?? "Procedimento"}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                ))}
                {clientAppointments.length === 0 && (
                  <p className="text-sm text-gray-600">Nenhum agendamento encontrado.</p>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <AppointmentModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        professionals={professionals
          .filter((p) => p.id !== "all")
          .map((p) => ({
            id: p.id,
            name: p.name,
            avatar: p.avatarUrl || p.avatar || "",
          }))}
        initialData={modalData}
        onSave={() => setModalOpen(false)}
      />

      {clientModalOpen && (
        <ClientModal
          client={editingClient}
          onClose={() => {
            setClientModalOpen(false);
            setEditingClient(null);
          }}
          onSave={(data) => {
            if (editingClient?.id) {
              updateClient({ ...editingClient, ...data, name: data.name || "" });
              setSelectedId(editingClient.id);
            } else {
              addClient({
                name: data.name || "",
                mobile: data.mobile || "",
                email: data.email || undefined,
                birthDate: data.birthDate || undefined,
                walletBalance: 0,
              })
                .then((created) => {
                  setSelectedId(created.id);
                })
                .catch((error) => {
                  console.error("Erro ao criar cliente:", error);
                  alert(`Erro ao criar cliente: ${error?.message || "Erro desconhecido"}`);
                });
            }
            setClientModalOpen(false);
            setEditingClient(null);
          }}
        />
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-2">
      <div className="flex items-center gap-2 text-gray-600 text-xs">
        {icon}
        <span>{label}</span>
      </div>
      <p className="text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/60 border border-white/60 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        {action}
      </div>
      {children}
    </div>
  );
}

function TagList({
  items,
  empty,
  color = "amber",
}: {
  items: string[];
  empty: string;
  color?: "amber" | "blue";
}) {
  if (!items.length) return <p className="text-sm text-gray-600">{empty}</p>;
  const colorMap =
    color === "amber"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item, idx) => (
        <span key={idx} className={`px-2 py-1 rounded-lg border text-xs font-semibold ${colorMap}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const map: Record<string, string> = {
    confirmed: "bg-emerald-50 text-emerald-700 border-emerald-100",
    confirmando: "bg-emerald-50 text-emerald-700 border-emerald-100",
    confirmado: "bg-emerald-50 text-emerald-700 border-emerald-100",
    pending: "bg-amber-50 text-amber-700 border-amber-100",
    pendente: "bg-amber-50 text-amber-700 border-amber-100",
    cancelled: "bg-slate-200 text-slate-600 border-slate-300",
    cancelado: "bg-slate-200 text-slate-600 border-slate-300",
    completed: "bg-blue-50 text-blue-700 border-blue-100",
  };
  const cls = map[status || ""] ?? "bg-white text-gray-700 border-white";
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${cls}`}>
      {status ?? "—"}
    </span>
  );
}

interface ClientFormData {
  name: string;
  email: string;
  mobile: string;
  birthDate: string;
}

function ClientModal({
  client,
  onClose,
  onSave,
}: {
  client: SchedulerClient | null;
  onClose: () => void;
  onSave: (data: ClientFormData) => void;
}) {
  const [form, setForm] = useState({
    name: client?.name ?? "",
    email: client?.email ?? "",
    mobile: client?.mobile ?? "",
    birthDate: client?.birthDate ?? "",
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-xl sm:rounded-2xl w-full max-w-lg p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {client ? "Editar cliente" : "Novo cliente"}
          </p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="space-y-3">
          <Input
            label="Nome"
            value={form.name}
            onChange={(v) => setForm((p) => ({ ...p, name: v }))}
          />
          <Input
            label="Email"
            value={form.email}
            onChange={(v) => setForm((p) => ({ ...p, email: v }))}
          />
          <Input
            label="WhatsApp"
            value={form.mobile}
            onChange={(v) => setForm((p) => ({ ...p, mobile: v }))}
          />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-gray-700">Data de aniversário</p>
            <input
              type="date"
              value={form.birthDate || ""}
              onChange={(e) => setForm((p) => ({ ...p, birthDate: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2.5 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 min-h-[44px]"
              style={{ fontSize: "16px" }} // ✅ Previne zoom no iOS
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 text-sm font-semibold"
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10"
            onClick={() => onSave(form)}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-gray-700">{label}</p>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
      />
    </div>
  );
}
