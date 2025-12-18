import { useMemo, useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { useScheduler, Service, SchedulerProfessional } from "../context/SchedulerContext";
import { PricingCalculatorModal } from "./PricingCalculatorModal";

type TabKey = "services" | "team" | "clinic";

export function SettingsView() {
  const {
    services,
    professionals,
    clinicSettings,
    addService,
    updateService,
    removeService,
    addProfessional,
    updateProfessional,
    removeProfessional,
    updateClinicSettings,
  } = useScheduler();

  const [tab, setTab] = useState<TabKey>("services");
  const [modalService, setModalService] = useState<Service | null>(null);
  const [modalProf, setModalProf] = useState<SchedulerProfessional | null>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showProfModal, setShowProfModal] = useState(false);

  const [serviceFilterProf, setServiceFilterProf] = useState<"all" | string>("all");

  const sortedServices = useMemo(() => {
    const list =
      serviceFilterProf === "all"
        ? services
        : services.filter(
            (s) =>
              !s.professionalId ||
              s.professionalId === "all" ||
              s.professionalId === serviceFilterProf
          );
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt", { sensitivity: "base" }));
  }, [services, serviceFilterProf]);

  const colorOptions = ["#6366f1", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#a855f7"];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[260px,1fr] gap-4">
      {/* Tabs */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-4 space-y-2">
        {[
          { key: "services", label: "Serviços & Procedimentos" },
          { key: "team", label: "Gestão de Equipe" },
          { key: "clinic", label: "Dados da Clínica" },
        ].map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key as TabKey)}
              className={`w-full text-left px-3 py-3 rounded-2xl border transition ${
                active
                  ? "bg-gray-900 text-white border-gray-900 shadow-lg"
                  : "bg-white/70 text-gray-900 border-white/60 hover:bg-white"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-5 space-y-4">
        {tab === "services" && (
          <>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Serviços & Procedimentos</p>
              <button
                onClick={() => {
                  setModalService({
                    id: "",
                    name: "",
                    price: 0,
                    duration: 30,
                    category: "",
                    professionalId: "all",
                  });
                  setShowServiceModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Novo Serviço
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-700">
              <span>Profissional:</span>
              <select
                value={serviceFilterProf}
                onChange={(e) => setServiceFilterProf(e.target.value as any)}
                className="rounded-xl bg-white/70 border border-white/60 px-3 py-1.5 text-sm text-gray-900"
              >
                <option value="all">Todos</option>
                {professionals
                  .filter((p) => p.id !== "all")
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="text-xs text-gray-600">
                    <th className="px-2 py-2">Nome</th>
                    <th className="px-2 py-2">Profissional</th>
                    <th className="px-2 py-2">Categoria</th>
                    <th className="px-2 py-2">Duração</th>
                    <th className="px-2 py-2">Freq. ideal</th>
                    <th className="px-2 py-2">Preço</th>
                    <th className="px-2 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/60">
                  {sortedServices.map((s) => (
                    <tr key={s.id} className="text-gray-900">
                      <td className="px-2 py-2">{s.name}</td>
                      <td className="px-2 py-2">
                        {s.professionalId === "all"
                          ? "Todos"
                          : professionals.find((p) => p.id === s.professionalId)?.name || "—"}
                      </td>
                      <td className="px-2 py-2">{s.category || "—"}</td>
                      <td className="px-2 py-2">{s.duration} min</td>
                      <td className="px-2 py-2">
                        {s.idealFrequencyDays ? `${s.idealFrequencyDays} dias` : "—"}
                      </td>
                      <td className="px-2 py-2">R$ {s.price.toFixed(2)}</td>
                      <td className="px-2 py-2 text-right flex gap-2 justify-end">
                        <button
                          onClick={() => {
                            setModalService(s);
                            setShowServiceModal(true);
                          }}
                          className="p-2 rounded-xl bg-white/80 border border-white/60 text-gray-800 hover:bg-white"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => removeService(s.id)}
                          className="p-2 rounded-xl bg-white/80 border border-white/60 text-red-600 hover:bg-white"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {sortedServices.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-4 text-center text-gray-500">
                        Nenhum serviço cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "team" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-900">Gestão de Equipe</p>
              <button
                onClick={() => {
                  setModalProf({
                    id: "",
                    name: "",
                    specialty: "",
                    avatar: "",
                    color: colorOptions[0],
                  });
                  setShowProfModal(true);
                }}
                className="px-4 py-2 rounded-xl bg-gray-900 text-white text-sm font-semibold shadow-lg shadow-black/10 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Novo Profissional
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {professionals
                .filter((p) => p.id !== "all")
                .map((p) => (
                  <div
                    key={p.id}
                    className="rounded-2xl bg-white/70 border border-white/60 p-3 shadow-sm flex items-center gap-3"
                  >
                    <div className="h-10 w-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center">
                      {p.avatar ? (
                        <img src={p.avatar} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-sm font-semibold">{p.name.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-600">{p.specialty}</p>
                    </div>
                    <span
                      className="h-4 w-4 rounded-full"
                      style={{ background: p.color || "#6366f1" }}
                    />
                    <button
                      onClick={() => {
                        setModalProf(p);
                        setShowProfModal(true);
                      }}
                      className="p-2 rounded-xl bg-white/80 border border-white/60 text-gray-800 hover:bg-white"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => removeProfessional(p.id)}
                      className="p-2 rounded-xl bg-white/80 border border-white/60 text-red-600 hover:bg-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              {professionals.filter((p) => p.id !== "all").length === 0 && (
                <p className="text-sm text-gray-600">Nenhum profissional cadastrado.</p>
              )}
            </div>
          </div>
        )}

        {tab === "clinic" && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-gray-900">Dados da Clínica</p>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-700">Nome da clínica</label>
              <input
                value={clinicSettings.clinicName}
                onChange={(e) => updateClinicSettings({ clinicName: e.target.value })}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Abertura</label>
                <input
                  type="time"
                  value={clinicSettings.businessHours.start}
                  onChange={(e) =>
                    updateClinicSettings({
                      businessHours: { ...clinicSettings.businessHours, start: e.target.value },
                    })
                  }
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-700">Fechamento</label>
                <input
                  type="time"
                  value={clinicSettings.businessHours.end}
                  onChange={(e) =>
                    updateClinicSettings({
                      businessHours: { ...clinicSettings.businessHours, end: e.target.value },
                    })
                  }
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                />
              </div>
            </div>
            <div className="text-xs text-gray-500">
              As alterações são salvas imediatamente e impactam a validação do calendário.
            </div>
          </div>
        )}
      </div>

      {showServiceModal &&
        modalService &&
        createPortal(
          <ServiceModal
            service={modalService}
            professionals={professionals}
            onClose={() => setShowServiceModal(false)}
            onSave={(s) => {
              if (s.id) updateService(s);
              else addService(s);
              setShowServiceModal(false);
            }}
          />,
          document.body
        )}

      {showProfModal &&
        modalProf &&
        createPortal(
          <ProfessionalModal
            professional={modalProf}
            colors={colorOptions}
            onClose={() => setShowProfModal(false)}
            onSave={(p) => {
              if (p.id) updateProfessional(p);
              else addProfessional(p);
              setShowProfModal(false);
            }}
          />,
          document.body
        )}
    </div>
  );
}

function ServiceModal({
  service,
  onSave,
  onClose,
  professionals,
}: {
  service: Service;
  onSave: (s: Service) => void;
  onClose: () => void;
  professionals: SchedulerProfessional[];
}) {
  const [draft, setDraft] = useState<Service>(service);
  const [showCalc, setShowCalc] = useState(false);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {draft.id ? "Editar serviço" : "Novo serviço"}
          </p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Nome</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Preço (R$)</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={draft.price}
                  onChange={(e) => setDraft((p) => ({ ...p, price: Number(e.target.value) }))}
                  className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
                />
                <button
                  type="button"
                  onClick={() => setShowCalc(true)}
                  className="px-3 py-2 rounded-xl bg-white/80 border border-white/60 text-xs font-semibold text-gray-900 shadow-sm"
                >
                  🪄
                </button>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-700">Duração (min)</label>
              <select
                value={draft.duration}
                onChange={(e) => setDraft((p) => ({ ...p, duration: Number(e.target.value) }))}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
              >
                {[15, 30, 45, 60, 75, 90].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Categoria</label>
            <input
              value={draft.category ?? ""}
              onChange={(e) => setDraft((p) => ({ ...p, category: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Frequência ideal (dias)</label>
            <input
              type="number"
              value={draft.idealFrequencyDays ?? ""}
              onChange={(e) =>
                setDraft((p) => ({ ...p, idealFrequencyDays: Number(e.target.value) || undefined }))
              }
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Profissional (opcional)</label>
            <select
              value={draft.professionalId ?? "all"}
              onChange={(e) =>
                setDraft((p) => ({
                  ...p,
                  professionalId: e.target.value === "all" ? "all" : e.target.value,
                }))
              }
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            >
              <option value="all">Todos</option>
              {professionals
                .filter((p) => p.id !== "all")
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
            </select>
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
            onClick={() => onSave(draft)}
          >
            Salvar
          </button>
        </div>
      </div>
      <PricingCalculatorModal
        open={showCalc}
        onClose={() => setShowCalc(false)}
        durationMinutes={draft.duration}
        onApply={(price) => {
          setDraft((p) => ({ ...p, price: Number(price.toFixed(2)) }));
          setShowCalc(false);
        }}
      />
    </div>
  );
}

function ProfessionalModal({
  professional,
  colors,
  onSave,
  onClose,
}: {
  professional: SchedulerProfessional;
  colors: string[];
  onSave: (p: SchedulerProfessional) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<SchedulerProfessional>(professional);
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur flex items-center justify-center px-4">
      <div className="relative bg-white/90 backdrop-blur-xl border border-white/60 shadow-2xl rounded-2xl w-full max-w-lg p-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-lg font-semibold text-gray-900">
            {draft.id ? "Editar profissional" : "Novo profissional"}
          </p>
          <button className="text-sm text-gray-500 hover:text-gray-700" onClick={onClose}>
            Fechar
          </button>
        </div>
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Nome</label>
            <input
              value={draft.name}
              onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Cargo / Especialidade</label>
            <input
              value={draft.specialty}
              onChange={(e) => setDraft((p) => ({ ...p, specialty: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">
              Avatar (URL ou deixe vazio)
            </label>
            <input
              value={draft.avatar}
              onChange={(e) => setDraft((p) => ({ ...p, avatar: e.target.value }))}
              className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-700">Cor na agenda</label>
            <div className="flex items-center gap-2">
              {colors.map((c) => (
                <button
                  key={c}
                  onClick={() => setDraft((p) => ({ ...p, color: c }))}
                  className={`h-8 w-8 rounded-full border ${draft.color === c ? "ring-2 ring-gray-900" : ""}`}
                  style={{ background: c }}
                />
              ))}
            </div>
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
            onClick={() => onSave(draft)}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
}
