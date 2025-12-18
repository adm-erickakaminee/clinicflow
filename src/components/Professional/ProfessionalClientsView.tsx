import { useState, useEffect } from "react";
import { User, Search, Phone, Mail } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../ui/Toast";
import { QuickClientForm } from "./QuickClientForm";
import type { Client } from "../../lib/types";

interface ProfessionalClientsViewProps {
  professionalId: string;
  clinicId: string;
}

export function ProfessionalClientsView({
  professionalId,
  clinicId,
}: ProfessionalClientsViewProps) {
  const toast = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadClients = async () => {
    if (!professionalId || !clinicId) {
      setLoading(false);
      return;
    }

    try {
      // Buscar apenas clientes que têm agendamentos com este profissional
      // Conforme RLS: profissionais veem apenas clientes com quem têm agendamentos
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("clinic_id", clinicId)
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Erro ao carregar clientes:", error);
        toast.error("Erro ao carregar clientes");
        return;
      }

      // Filtrar apenas clientes que têm agendamentos com este profissional
      const { data: appointments } = await supabase
        .from("appointments")
        .select("client_id")
        .eq("professional_id", professionalId)
        .eq("clinic_id", clinicId);

      const clientIdsWithAppointments = new Set((appointments || []).map((apt) => apt.client_id));

      const filteredClients = (data || []).filter((client) =>
        clientIdsWithAppointments.has(client.id)
      );

      setClients(filteredClients);
    } catch (err) {
      console.error("Erro ao carregar clientes:", err);
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, [professionalId, clinicId, toast]);

  const filteredClients = clients.filter(
    (client) =>
      client.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone?.includes(searchQuery) ||
      client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6">
        <p className="text-sm text-gray-600">Carregando clientes...</p>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl rounded-3xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <User className="h-6 w-6 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Meus Clientes</h3>
        </div>
        <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-sm font-semibold">
          {clients.length} {clients.length === 1 ? "cliente" : "clientes"}
        </span>
      </div>

      {/* Cadastro Rápido */}
      <QuickClientForm
        clinicId={clinicId}
        professionalId={professionalId}
        onSuccess={loadClients}
      />

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar por nome, telefone ou email..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/70 border border-gray-300 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
        />
      </div>

      {/* Lista de Clientes */}
      {filteredClients.length === 0 ? (
        <div className="text-center py-8">
          <User className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">
            {searchQuery ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado ainda"}
          </p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white/80 rounded-xl p-4 border border-gray-200 hover:border-gray-300 transition"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <p className="font-semibold text-gray-900">{client.full_name}</p>
                  </div>

                  {client.phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3" />
                      <span>{client.phone}</span>
                    </div>
                  )}

                  {client.email && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-3 w-3" />
                      <span>{client.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
