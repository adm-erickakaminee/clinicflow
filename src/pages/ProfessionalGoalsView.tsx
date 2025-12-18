import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useScheduler } from "../context/SchedulerContext";
import { useToast } from "../components/ui/Toast";
import { Target, Eye, Edit2 } from "lucide-react";

interface ProfessionalGoal {
  id: string;
  profile_id: string;
  clinic_id: string;
  monthly_cost_cents: number;
  monthly_income_goal_cents: number;
  target_hourly_rate_cents: number;
  profile?: {
    full_name: string | null;
    role: string;
  };
}

export function ProfessionalGoalsView() {
  const { currentUser } = useScheduler();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<ProfessionalGoal[]>([]);

  const clinicId = currentUser?.clinicId;

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }

    loadGoals();
  }, [clinicId]);

  const loadGoals = async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("professional_goals")
        .select(
          `
          *,
          profile:profiles!professional_goals_profile_id_fkey(full_name, role)
        `
        )
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setGoals((data as ProfessionalGoal[]) || []);
    } catch (err) {
      console.error("Erro ao carregar metas:", err);
      toast.error("Falha ao carregar metas individuais");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600">Carregando metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Metas Individuais</h2>
        <p className="text-sm text-gray-600">
          Visão tabular de todas as metas dos profissionais para auditoria e coaching
        </p>
      </div>

      {goals.length === 0 ? (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-8 text-center">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Nenhuma meta encontrada</p>
          <p className="text-sm text-gray-600">
            Os profissionais ainda não configuraram suas metas individuais
          </p>
        </div>
      ) : (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Profissional
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Custo Mensal
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Meta de Receita
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Taxa Horária Alvo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">
                          {goal.profile?.full_name || "N/A"}
                        </p>
                        <p className="text-xs text-gray-600 capitalize">
                          {goal.profile?.role || "N/A"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      {formatCurrency(goal.monthly_cost_cents)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                      {formatCurrency(goal.monthly_income_goal_cents)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      {formatCurrency(goal.target_hourly_rate_cents)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                          title="Visualizar detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-lg"
                          title="Editar meta"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Resumo */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white/60 border border-white/40 shadow-xl p-4">
            <p className="text-xs text-gray-600 mb-1">Total de Profissionais</p>
            <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
          </div>
          <div className="rounded-2xl bg-white/60 border border-white/40 shadow-xl p-4">
            <p className="text-xs text-gray-600 mb-1">Meta Total de Receita</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(goals.reduce((sum, g) => sum + g.monthly_income_goal_cents, 0))}
            </p>
          </div>
          <div className="rounded-2xl bg-white/60 border border-white/40 shadow-xl p-4">
            <p className="text-xs text-gray-600 mb-1">Custo Total Mensal</p>
            <p className="text-2xl font-bold text-gray-900">
              {formatCurrency(goals.reduce((sum, g) => sum + g.monthly_cost_cents, 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
