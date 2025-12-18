import { useState } from "react";
import { Plus, X } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useToast } from "../ui/Toast";

interface QuickClientFormProps {
  clinicId: string;
  professionalId?: string;
  onSuccess?: () => void;
}

export function QuickClientForm({ clinicId, onSuccess }: QuickClientFormProps) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    phone: "",
    email: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.full_name.trim() || !formData.phone.trim()) {
      toast.error("Nome e telefone são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      // Para cadastro rápido pelo profissional, vamos criar diretamente em clients
      // O sistema pode criar o auth.user depois quando o cliente fizer login pela primeira vez
      // Por enquanto, gerar um UUID temporário para o cliente
      const { error: clientError } = await supabase
        .from("clients")
        .insert({
          clinic_id: clinicId,
          full_name: formData.full_name,
          phone: formData.phone,
          email: formData.email || null,
        })
        .select()
        .single();

      if (clientError) {
        // Se já existir cliente com mesmo telefone/clínica, atualizar
        if (clientError.code === "23505") {
          // Unique constraint violation - tentar atualizar
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id")
            .eq("clinic_id", clinicId)
            .eq("phone", formData.phone)
            .maybeSingle();

          if (existingClient) {
            const { error: updateError } = await supabase
              .from("clients")
              .update({
                full_name: formData.full_name,
                email: formData.email || null,
              })
              .eq("id", existingClient.id);

            if (updateError) throw updateError;
            toast.success("Cliente atualizado com sucesso!");
          } else {
            throw clientError;
          }
        } else {
          throw clientError;
        }
      } else {
        toast.success("Cliente cadastrado com sucesso!");
      }

      setFormData({ full_name: "", phone: "", email: "" });
      setIsOpen(false);
      onSuccess?.();
    } catch (err: any) {
      console.error("Erro ao cadastrar cliente:", err);
      toast.error(err.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full px-4 py-3 rounded-xl bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Cadastrar Cliente Rápido
      </button>
    );
  }

  return (
    <div className="bg-white/80 rounded-xl p-4 border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-900">Cadastro Rápido de Cliente</h4>
        <button
          onClick={() => {
            setIsOpen(false);
            setFormData({ full_name: "", phone: "", email: "" });
          }}
          className="text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Nome Completo *</label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full rounded-lg bg-white/70 border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
            placeholder="Nome do cliente"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Telefone *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full rounded-lg bg-white/70 border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
            placeholder="(00) 00000-0000"
            required
          />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-1 block">Email (opcional)</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full rounded-lg bg-white/70 border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/20 focus:outline-none"
            placeholder="email@exemplo.com"
          />
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              setFormData({ full_name: "", phone: "", email: "" });
            }}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-200 text-gray-800 text-sm font-semibold hover:bg-gray-300 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-semibold hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Cadastrando..." : "Cadastrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
