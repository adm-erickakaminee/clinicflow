import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useScheduler } from "../context/SchedulerContext";
import { useToast } from "../components/ui/Toast";
import {
  Users,
  DollarSign,
  TrendingUp,
  Target,
  Link as LinkIcon,
  Copy,
  CheckCircle2,
  Building2,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReferralRule {
  id: string;
  platform_referral_percentage: number;
  platform_wallet_id: string;
}

interface Referral {
  id: string;
  referring_clinic_id: string;
  referred_clinic_id: string;
  created_at: string;
  referred_clinic?: {
    id: string;
    name: string;
    created_at: string;
  };
}

interface ReferredClinicStats {
  clinic_id: string;
  clinic_name: string;
  total_revenue_cents: number;
  referral_count: number;
  last_transaction_date: string | null;
}

interface ReferralMetrics {
  totalReferredClinics: number;
  totalRevenueFromReferred: number;
  totalReferralEarnings: number;
  activeReferrals: number;
  goalCount: number;
}

export function ReferralView() {
  const { currentUser } = useScheduler();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [referralRule, setReferralRule] = useState<ReferralRule | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [metrics, setMetrics] = useState<ReferralMetrics>({
    totalReferredClinics: 0,
    totalRevenueFromReferred: 0,
    totalReferralEarnings: 0,
    activeReferrals: 0,
    goalCount: 0,
  });
  const [referralLink, setReferralLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [referredClinicsStats, setReferredClinicsStats] = useState<ReferredClinicStats[]>([]);

  const clinicId = currentUser?.clinicId;

  useEffect(() => {
    if (clinicId) {
      loadAllData();
      generateReferralLink();
    }
  }, [clinicId]);

  const loadAllData = async () => {
    if (!clinicId) return;

    setLoading(true);
    try {
      // Carregar regras primeiro
      await loadReferralRule();

      // Carregar referrals
      await loadReferrals();

      // Carregar métricas e stats (loadMetrics busca dados do banco diretamente)
      await Promise.all([loadMetrics(), loadReferredClinicsStats()]);
    } catch (err) {
      console.warn("Erro ao carregar dados de indicação:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadReferralRule = async () => {
    try {
      const { data, error } = await supabase.from("referral_rules").select("*").maybeSingle();

      if (error) {
        console.warn("Erro ao carregar regras de indicação:", error);
        return;
      }

      setReferralRule(data);
    } catch (err) {
      console.warn("Aviso ao carregar regras:", err);
    }
  };

  const loadReferrals = async () => {
    if (!clinicId) return;

    try {
      const { data, error } = await supabase
        .from("referrals")
        .select(
          `
          id,
          referring_clinic_id,
          referred_clinic_id,
          created_at,
          referred_clinic:organizations!referred_clinic_id(
            id,
            name,
            created_at
          )
        `
        )
        .eq("referring_clinic_id", clinicId)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Erro ao carregar indicações:", error);
        return;
      }

      setReferrals((data || []) as unknown as Referral[]);
    } catch (err) {
      console.warn("Aviso ao carregar indicações:", err);
    }
  };

  const loadMetrics = async () => {
    if (!clinicId) return;

    try {
      // 1. Buscar referrals novamente para garantir dados atualizados
      const { data: referralData } = await supabase
        .from("referrals")
        .select("referred_clinic_id")
        .eq("referring_clinic_id", clinicId);

      const currentReferralsCount = (referralData || []).length;
      const referredClinicIds = (referralData || []).map((r) => r.referred_clinic_id);

      // 3. Faturamento total das clínicas indicadas (últimos 30 dias)
      let totalRevenueFromReferred = 0;
      if (referredClinicIds.length > 0) {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: transactions } = await supabase
          .from("financial_transactions")
          .select("amount_cents")
          .in("organization_id", referredClinicIds)
          .eq("status", "completed")
          .gte("created_at", thirtyDaysAgo.toISOString());

        totalRevenueFromReferred = (transactions || []).reduce(
          (sum, t) => sum + (t.amount_cents || 0),
          0
        );
      }

      // 4. Rendimento de Indicação (estimado - baseado na regra de 2.33%)
      // NOTA: O cálculo real seria feito no backend ao processar o split do Asaas
      // Aqui fazemos uma estimativa baseada no faturamento das indicadas
      const referralPercentage = referralRule?.platform_referral_percentage || 233; // 2.33%
      const estimatedReferralEarnings = Math.round(
        (totalRevenueFromReferred * referralPercentage) / 10000
      );

      // 5. Meta de clínicas indicadas
      const { data: settings } = await supabase
        .from("organization_settings")
        .select("referral_goal_count")
        .eq("clinic_id", clinicId)
        .maybeSingle();

      setMetrics({
        totalReferredClinics: currentReferralsCount,
        totalRevenueFromReferred,
        totalReferralEarnings: estimatedReferralEarnings,
        activeReferrals: currentReferralsCount,
        goalCount: settings?.referral_goal_count || 0,
      });
    } catch (err) {
      console.warn("Aviso ao carregar métricas:", err);
    }
  };

  const loadReferredClinicsStats = async () => {
    if (!clinicId) return;

    try {
      const { data: referralData } = await supabase
        .from("referrals")
        .select("referred_clinic_id")
        .eq("referring_clinic_id", clinicId);

      const referredClinicIds = (referralData || []).map((r) => r.referred_clinic_id);

      if (referredClinicIds.length === 0) {
        setReferredClinicsStats([]);
        return;
      }

      // Buscar informações das clínicas indicadas
      const { data: clinics } = await supabase
        .from("organizations")
        .select("id, name, created_at")
        .in("id", referredClinicIds);

      // Para cada clínica, calcular faturamento total
      const statsPromises = (clinics || []).map(async (clinic) => {
        const { data: transactions } = await supabase
          .from("financial_transactions")
          .select("amount_cents, created_at")
          .eq("clinic_id", clinic.id)
          .eq("status", "completed")
          .order("created_at", { ascending: false })
          .limit(1);

        const totalRevenue = (transactions || []).reduce(
          (sum, t) => sum + (t.amount_cents || 0),
          0
        );

        const lastTransaction = transactions?.[0]?.created_at || null;

        return {
          clinic_id: clinic.id,
          clinic_name: clinic.name || "Clínica",
          total_revenue_cents: totalRevenue,
          referral_count: 1,
          last_transaction_date: lastTransaction,
        };
      });

      const stats = await Promise.all(statsPromises);
      setReferredClinicsStats(stats);
    } catch (err) {
      console.warn("Aviso ao carregar estatísticas das clínicas:", err);
    }
  };

  const generateReferralLink = () => {
    if (!clinicId) return;

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/signup?ref=${clinicId}`;
    setReferralLink(link);
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setLinkCopied(true);
      toast.success("Link copiado para a área de transferência!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      toast.error("Erro ao copiar link");
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(cents / 100);
  };

  const referralPercentage = referralRule?.platform_referral_percentage || 233;
  const referralPercentageFormatted = (referralPercentage / 100).toFixed(2);

  if (loading) {
    return (
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-gray-400 animate-pulse" />
            <span className="text-sm text-gray-600">Carregando dados de indicação...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* A. REGRAS E LINKS DE INDICAÇÃO */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <LinkIcon className="h-6 w-6 text-blue-500" />
          <h2 className="text-xl font-semibold text-gray-900">Regras e Links de Indicação</h2>
        </div>

        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong className="font-semibold text-gray-900">Como funciona:</strong>
              <br />
              Quando você indica uma nova clínica e ela se cadastra através do seu link único, você
              recebe <strong>{referralPercentageFormatted}%</strong> da taxa da plataforma (5.99%)
              sobre todas as transações dessa clínica indicada.
              <br />
              <br />
              <strong className="text-emerald-600">Importante:</strong> Este repasse{" "}
              <strong>não sai do faturamento da clínica indicada</strong>. O valor é descontado da
              taxa da plataforma, garantindo que a clínica indicada não tenha nenhum custo
              adicional.
            </p>
          </div>

          <div className="bg-white/80 border border-white/60 rounded-2xl p-4">
            <label className="text-xs font-semibold text-gray-700 mb-2 block">
              Seu Link Único de Indicação
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-900"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-700 transition flex items-center gap-2"
              >
                {linkCopied ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copiar
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Compartilhe este link com outras clínicas. Quando elas se cadastrarem, você começará a
              receber o repasse automaticamente.
            </p>
          </div>
        </div>
      </div>

      {/* B. PERFORMANCE E RENTABILIDADE */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Total de Clínicas Indicadas */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-blue-100 flex items-center justify-center">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Clínicas Indicadas</p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalReferredClinics}</p>
            </div>
          </div>
          {metrics.goalCount > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>Meta: {metrics.goalCount}</span>
                <span>{Math.round((metrics.totalReferredClinics / metrics.goalCount) * 100)}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all"
                  style={{
                    width: `${Math.min((metrics.totalReferredClinics / metrics.goalCount) * 100, 100)}%`,
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Faturamento Total das Indicadas */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Faturamento (30d)</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.totalRevenueFromReferred)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Total faturado pelas clínicas indicadas nos últimos 30 dias
          </p>
        </div>

        {/* Rendimento de Indicação */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-purple-100 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Rendimento Estimado</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.totalReferralEarnings)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Estimativa baseada em {referralPercentageFormatted}% do faturamento
          </p>
        </div>

        {/* Projeção de Crescimento */}
        <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center">
              <Target className="h-6 w-6 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Projeção Mensal</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(metrics.totalReferralEarnings * 1.1)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">Projeção com crescimento de 10% (estimativa)</p>
        </div>
      </div>

      {/* C. LISTA DE CLÍNICAS INDICADAS */}
      <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <Building2 className="h-6 w-6 text-gray-700" />
          <h3 className="text-lg font-semibold text-gray-900">Clínicas Indicadas</h3>
        </div>

        {referrals.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-sm text-gray-500 mb-2">Nenhuma clínica indicada ainda</p>
            <p className="text-xs text-gray-400">
              Compartilhe seu link de indicação para começar a receber repasses
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral) => {
              const clinicStats = referredClinicsStats.find(
                (s) => s.clinic_id === referral.referred_clinic_id
              );

              return (
                <div
                  key={referral.id}
                  className="rounded-2xl bg-white/70 border border-white/60 p-4 hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                        <Building2 className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-gray-900">
                          {referral.referred_clinic?.name || "Clínica Indicada"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Indicada em{" "}
                          {format(new Date(referral.created_at), "dd 'de' MMMM 'de' yyyy", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(clinicStats?.total_revenue_cents || 0)}
                      </p>
                      <p className="text-xs text-gray-500">Faturamento total</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
