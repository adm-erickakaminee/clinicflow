import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabase";
import { useScheduler } from "../context/SchedulerContext";
import { useToast } from "../components/ui/Toast";
import { DollarSign, Filter, Download } from "lucide-react";

interface Transaction {
  id: string;
  amount_cents: number;
  clinic_share_cents: number;
  platform_fee_cents: number;
  professional_share_cents: number;
  payment_method: string | null;
  status: string;
  is_fee_ledger_pending: boolean;
  is_admin_audited: boolean;
  created_at: string;
  appointment_id: string | null;
  professional_id: string | null;
  professional?: {
    full_name: string | null;
  };
  appointment?: {
    client_id: string | null;
    client?: {
      full_name: string | null;
    };
  };
}

export function FinancialView() {
  const { currentUser } = useScheduler();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterAudited, setFilterAudited] = useState<string>("all");

  const clinicId = currentUser?.clinicId;

  useEffect(() => {
    if (!clinicId) {
      setLoading(false);
      return;
    }

    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId, filterStatus, filterAudited]);

  const loadTransactions = async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      let query = supabase
        .from("financial_transactions")
        .select(
          `
          id,
          amount_cents,
          clinic_share_cents,
          platform_fee_cents,
          professional_share_cents,
          payment_method,
          status,
          is_fee_ledger_pending,
          is_admin_audited,
          created_at,
          appointment_id,
          professional_id,
          professional:profiles!financial_transactions_professional_id_fkey(full_name),
          appointment:appointments!financial_transactions_appointment_id_fkey(
            client_id,
            client:clients!appointments_client_id_fkey(full_name)
          )
        `
        )
        .eq("clinic_id", clinicId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (filterStatus !== "all") {
        query = query.eq("status", filterStatus);
      }

      if (filterAudited === "pending") {
        query = query.eq("is_admin_audited", false);
      } else if (filterAudited === "audited") {
        query = query.eq("is_admin_audited", true);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions((data as unknown as Transaction[]) || []);
    } catch (err) {
      console.error("Erro ao carregar transações:", err);
      toast.error("Falha ao carregar transações financeiras");
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

  const totals = transactions.reduce(
    (acc, tx) => {
      acc.total += tx.amount_cents;
      acc.clinicShare += tx.clinic_share_cents;
      acc.platformFee += tx.platform_fee_cents;
      return acc;
    },
    { total: 0, clinicShare: 0, platformFee: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Financeiro Completo</h2>
          <p className="text-sm text-gray-600">Visão detalhada de todas as transações</p>
        </div>
        <button className="px-4 py-2 bg-gray-900 text-white rounded-xl font-semibold text-sm hover:bg-gray-800 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Exportar
        </button>
      </div>

      {/* Totais */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white/60 border border-white/40 shadow-xl p-4">
          <p className="text-xs text-gray-600 mb-1">Faturamento Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</p>
        </div>
        <div className="rounded-2xl bg-green-50 border border-green-200 shadow-xl p-4">
          <p className="text-xs text-green-700 mb-1">Lucro da Clínica</p>
          <p className="text-2xl font-bold text-green-900">{formatCurrency(totals.clinicShare)}</p>
        </div>
        <div className="rounded-2xl bg-blue-50 border border-blue-200 shadow-xl p-4">
          <p className="text-xs text-blue-700 mb-1">Taxas da Plataforma</p>
          <p className="text-2xl font-bold text-blue-900">{formatCurrency(totals.platformFee)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-semibold text-gray-700">Filtros:</span>
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold"
        >
          <option value="all">Todos os Status</option>
          <option value="pending">Pendente</option>
          <option value="completed">Completo</option>
          <option value="billed">Cobrado</option>
        </select>
        <select
          value={filterAudited}
          onChange={(e) => setFilterAudited(e.target.value)}
          className="px-3 py-2 rounded-xl border border-gray-300 bg-white text-sm font-semibold"
        >
          <option value="all">Todas as Auditorias</option>
          <option value="pending">Pendente de Auditoria</option>
          <option value="audited">Auditadas</option>
        </select>
      </div>

      {/* Tabela de Transações */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Data
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Cliente / Profissional
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Valor Total
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Lucro Clínica
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Taxa Plataforma
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                  Auditoria
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {tx.appointment?.client?.full_name || "N/A"}
                      </p>
                      <p className="text-gray-600 text-xs">{tx.professional?.full_name || "N/A"}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                    {formatCurrency(tx.amount_cents)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">
                    {formatCurrency(tx.clinic_share_cents)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-blue-600">
                    {formatCurrency(tx.platform_fee_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        tx.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : tx.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {tx.status}
                    </span>
                    {tx.is_fee_ledger_pending && (
                      <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                        Fee Pendente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {tx.is_admin_audited ? (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                        Auditada
                      </span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                        Pendente
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {transactions.length === 0 && !loading && (
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-8 text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900">Nenhuma transação encontrada</p>
          <p className="text-sm text-gray-600">Ajuste os filtros para ver mais resultados</p>
        </div>
      )}
    </div>
  );
}
