import { useMemo, useRef, useState, useEffect } from "react";
import { User, Plus } from "lucide-react";
import { SchedulerClient, useScheduler } from "../../context/SchedulerContext";

type Props = {
  value?: string;
  onSelect: (clientId: string, name: string) => void;
};

export function ClientSelector({ onSelect }: Props) {
  const { clients, addClient, currentUser } = useScheduler();
  const [query, setQuery] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [newClient, setNewClient] = useState({ name: "", lastName: "", phone: "" });
  const [open, setOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const blurTimeout = useRef<number | null>(null);

  // Debug: log dos clientes carregados
  useEffect(() => {
    console.log("🔍 ClientSelector - Clientes carregados:", clients.length, clients);
  }, [clients]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const result = clients
      .filter((c) => {
        const name = c.name || "";
        return name.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const nameA = a.name || "";
        const nameB = b.name || "";
        return nameA.localeCompare(nameB, "pt", { sensitivity: "base" });
      });
    console.log("🔍 ClientSelector - Clientes filtrados:", result.length, "query:", query);
    return result;
  }, [clients, query]);

  const grouped = useMemo(() => {
    const groups: Record<string, SchedulerClient[]> = {};
    filtered.forEach((c) => {
      const name = c.name || "";
      if (name.length === 0) return; // Pular clientes sem nome
      const letter = name.charAt(0).toUpperCase();
      if (!groups[letter]) groups[letter] = [];
      groups[letter].push(c);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const hasCreateOption = query.trim().length > 0 && filtered.length === 0;

  const handleCreate = async () => {
    if (!currentUser?.clinicId) {
      alert("Erro: Clínica não definida. Não é possível criar cliente.");
      return;
    }

    if (!newClient.name && !query) {
      alert("Por favor, informe o nome do cliente.");
      return;
    }

    setIsCreating(true);
    try {
      const created = await addClient({
        name: newClient.name || query,
        lastName: newClient.lastName,
        phone: newClient.phone,
        mobile: newClient.phone || "",
        walletBalance: 0,
      });
      onSelect(created.id, created.name);
      setAddingNew(false);
      setQuery(created.name);
      setOpen(false);
      setNewClient({ name: "", lastName: "", phone: "" });
    } catch (error: any) {
      console.error("Erro ao criar cliente:", error);
      alert(`Erro ao criar cliente: ${error?.message || "Erro desconhecido"}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2 relative">
      <label className="text-sm font-semibold text-gray-900">Cliente</label>
      <div className="relative">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            setAddingNew(false);
            setOpen(true);
          }}
          onBlur={() => {
            blurTimeout.current = window.setTimeout(() => setOpen(false), 100);
          }}
          type="text"
          placeholder="Buscar cliente"
          className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
        />
        <User className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
      </div>

      {!addingNew && open && (
        <div
          className="absolute left-0 right-0 top-[76px] bg-white/95 backdrop-blur-xl border border-white/60 shadow-xl rounded-xl p-2 space-y-1 max-h-48 overflow-y-auto text-sm z-30"
          onMouseDown={(e) => {
            // evita o blur do input fechar antes do clique
            e.preventDefault();
          }}
        >
          {grouped.length === 0 && clients.length > 0 && query.length === 0 && (
            <p className="text-xs text-gray-500 px-2 py-1">
              Digite para buscar clientes ({clients.length} cadastrados)
            </p>
          )}
          {grouped.map(([letter, list]) => (
            <div key={letter} className="space-y-1">
              <p className="text-[11px] font-semibold text-gray-500 px-1">{letter}</p>
              {list.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="w-full text-left px-2 py-1 rounded-md hover:bg-white flex items-center gap-2"
                  onClick={() => {
                    const clientName = c.name || "Cliente sem nome";
                    onSelect(c.id, clientName);
                    setQuery(clientName);
                    setOpen(false);
                  }}
                >
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-semibold text-gray-900">
                    {c.name || "Cliente sem nome"}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {hasCreateOption && (
            <button
              type="button"
              className="w-full text-left px-2 py-2 rounded-md hover:bg-white font-semibold text-gray-900 flex items-center gap-2"
              onClick={() => {
                setAddingNew(true);
                setNewClient((prev) => ({ ...prev, name: query }));
                setOpen(false);
              }}
            >
              <Plus className="h-4 w-4" />
              Cadastrar novo: {query}
            </button>
          )}

          {!grouped.length && !hasCreateOption && (
            <div className="px-2 py-2">
              {clients.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Nenhum cliente cadastrado. Digite um nome para criar um novo cliente.
                </p>
              ) : (
                <p className="text-xs text-gray-500">Nenhum cliente encontrado com "{query}".</p>
              )}
            </div>
          )}
        </div>
      )}

      {addingNew && (
        <div className="bg-white/80 backdrop-blur-xl border border-white/60 shadow-xl rounded-xl p-3 space-y-2">
          <p className="text-sm font-semibold text-gray-900">Novo cliente</p>
          <input
            value={newClient.name}
            onChange={(e) => setNewClient((p) => ({ ...p, name: e.target.value }))}
            className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
            placeholder="Nome"
          />
          <input
            value={newClient.lastName}
            onChange={(e) => setNewClient((p) => ({ ...p, lastName: e.target.value }))}
            className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
            placeholder="Sobrenome"
          />
          <input
            value={newClient.phone}
            onChange={(e) => setNewClient((p) => ({ ...p, phone: maskPhone(e.target.value) }))}
            className="w-full rounded-lg bg-white/70 border border-white/60 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20"
            placeholder="WhatsApp"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              className="text-sm font-semibold text-gray-600 hover:text-gray-800"
              onClick={() => setAddingNew(false)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="h-10 px-4 rounded-lg bg-gray-900 text-white text-sm font-semibold shadow hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              onClick={handleCreate}
              disabled={isCreating}
            >
              {isCreating ? "Salvando..." : "Salvar Cliente Rápido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  const part1 = digits.slice(0, 2);
  const part2 = digits.slice(2, 7);
  const part3 = digits.slice(7, 11);
  if (digits.length <= 2) return `(${part1}`;
  if (digits.length <= 7) return `(${part1}) ${part2}`;
  return `(${part1}) ${part2}-${part3}`;
}
