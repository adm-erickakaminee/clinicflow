import { useState, useEffect } from "react";
import { Building2, Save, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { useScheduler } from "../../context/SchedulerContext";
import { useToast } from "../ui/Toast";

interface OrganizationData {
  id: string;
  name: string;
  slug: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  cnpj: string | null;
  asaas_wallet_id: string | null;
  kyc_status: "pending" | "in_review" | "approved" | "rejected" | null;
  bank_account_data: {
    bank_code?: string;
    agency?: string;
    account?: string;
    account_digit?: string;
    account_type?: "CHECKING" | "SAVINGS";
    holder_name?: string;
    holder_document?: string;
  } | null;
}

export function OrganizationDetailsCard() {
  const { currentUser } = useScheduler();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [formData, setFormData] = useState<Partial<OrganizationData>>({
    name: "",
    slug: "",
    phone: "",
    email: "",
    address: "",
    cnpj: "",
  });
  const [showKYC, setShowKYC] = useState(false);

  const isAdmin = currentUser?.role === "admin" || currentUser?.role === "clinic_owner";
  const isReceptionist = currentUser?.role === "receptionist";

  useEffect(() => {
    if (!currentUser?.clinicId) {
      setLoading(false);
      return;
    }

    loadOrganization();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.clinicId]);

  const loadOrganization = async () => {
    if (!currentUser?.clinicId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select(
          "id, name, slug, phone, email, address, cnpj, asaas_wallet_id, kyc_status, bank_account_data"
        )
        .eq("id", currentUser.clinicId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setOrganization(data);
        setFormData({
          name: data.name || "",
          slug: data.slug || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          cnpj: data.cnpj || "",
          bank_account_data: data.bank_account_data || {
            bank_code: "",
            agency: "",
            account: "",
            account_digit: "",
            account_type: "CHECKING",
            holder_name: "",
            holder_document: "",
          },
        });
      }
    } catch (err) {
      console.error("Erro ao carregar dados da organização:", err);
      toast.error("Erro ao carregar informações da clínica");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.clinicId || !isAdmin) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("organizations")
        .update({
          name: formData.name || null,
          slug: formData.slug || null,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          cnpj: formData.cnpj || null,
          bank_account_data: formData.bank_account_data || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentUser.clinicId);

      if (error) throw error;

      toast.success("Informações da clínica atualizadas com sucesso!");
      await loadOrganization(); // Recarregar dados atualizados
    } catch (err) {
      console.error("Erro ao salvar dados da organização:", err);
      toast.error("Erro ao salvar alterações");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
        </div>
      </div>
    );
  }

  if (!organization && !isAdmin && !isReceptionist) {
    return null;
  }

  return (
    <div className="rounded-3xl bg-white/60 backdrop-blur-xl border border-white/40 shadow-xl p-6 mb-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg">
          <Building2 className="h-6 w-6 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Detalhes da Clínica</h2>
          <p className="text-sm text-gray-600">
            {isAdmin ? "Gerencie as informações da sua clínica" : "Informações da clínica"}
          </p>
        </div>
      </div>

      {isReceptionist && !isAdmin ? (
        // Modo somente leitura para recepcionista
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">
                Nome da Clínica
              </label>
              <p className="text-sm text-gray-900 font-medium">
                {organization?.name || "Não informado"}
              </p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Telefone</label>
              <p className="text-sm text-gray-900">{organization?.phone || "Não informado"}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">E-mail</label>
              <p className="text-sm text-gray-900">{organization?.email || "Não informado"}</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">CNPJ</label>
              <p className="text-sm text-gray-900">{organization?.cnpj || "Não informado"}</p>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Endereço</label>
              <p className="text-sm text-gray-900">{organization?.address || "Não informado"}</p>
            </div>
            {organization?.slug && (
              <div>
                <label className="text-xs font-semibold text-gray-500 mb-1 block">
                  URL de Agendamento
                </label>
                <p className="text-sm text-gray-900 font-mono">{organization.slug}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Modo de edição para admin
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                Nome da Clínica <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                placeholder="Ex: Clínica Beleza & Saúde"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">Telefone</label>
              <input
                type="tel"
                value={formData.phone || ""}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                placeholder="(00) 00000-0000"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">E-mail</label>
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                placeholder="contato@clinica.com"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">CNPJ</label>
              <input
                type="text"
                value={formData.cnpj || ""}
                onChange={(e) => {
                  // Formatar CNPJ (XX.XXX.XXX/XXXX-XX)
                  let value = e.target.value.replace(/\D/g, "");
                  if (value.length <= 14) {
                    value = value.replace(/^(\d{2})(\d)/, "$1.$2");
                    value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
                    value = value.replace(/\.(\d{3})(\d)/, ".$1/$2");
                    value = value.replace(/(\d{4})(\d)/, "$1-$2");
                    setFormData({ ...formData, cnpj: value });
                  }
                }}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                placeholder="00.000.000/0000-00"
                maxLength={18}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-2 block">
                URL de Agendamento (Slug)
              </label>
              <input
                type="text"
                value={formData.slug || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  })
                }
                className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition font-mono"
                placeholder="clinica-beleza-saude"
              />
              <p className="text-xs text-gray-500 mt-1">
                URL amigável para agendamentos online (apenas letras, números e hífens)
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-700 mb-2 block">Endereço</label>
              <textarea
                value={formData.address || ""}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition resize-none"
                rows={2}
                placeholder="Rua, número, bairro, cidade - CEP"
              />
            </div>
          </div>

          {/* Seção KYC - Dados Bancários para Asaas */}
          <div className="pt-4 border-t border-white/60">
            <button
              type="button"
              onClick={() => setShowKYC(!showKYC)}
              className="flex items-center justify-between w-full text-left mb-3"
            >
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Dados Bancários (KYC - Asaas)
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Necessário para criar subconta Asaas e receber pagamentos
                </p>
              </div>
              <span className="text-gray-400">{showKYC ? "▼" : "▶"}</span>
            </button>

            {showKYC && (
              <div className="space-y-4 bg-blue-50/50 rounded-xl p-4 border border-blue-200/50">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Código do Banco
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_data?.bank_code || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_account_data: {
                            ...formData.bank_account_data,
                            bank_code: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                      placeholder="001 (Banco do Brasil)"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Agência
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_data?.agency || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_account_data: {
                            ...formData.bank_account_data,
                            agency: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                      placeholder="0000"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">Conta</label>
                    <input
                      type="text"
                      value={formData.bank_account_data?.account || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_account_data: {
                            ...formData.bank_account_data,
                            account: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                      placeholder="00000"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Dígito da Conta
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_data?.account_digit || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_account_data: {
                            ...formData.bank_account_data,
                            account_digit: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                      placeholder="0"
                      maxLength={1}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Tipo de Conta
                    </label>
                    <select
                      value={formData.bank_account_data?.account_type || "CHECKING"}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_account_data: {
                            ...formData.bank_account_data,
                            account_type: e.target.value as "CHECKING" | "SAVINGS",
                          },
                        })
                      }
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                    >
                      <option value="CHECKING">Conta Corrente</option>
                      <option value="SAVINGS">Conta Poupança</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      Nome do Titular
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_data?.holder_name || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_account_data: {
                            ...formData.bank_account_data,
                            holder_name: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                      placeholder="Nome completo do titular"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-700 mb-2 block">
                      CPF/CNPJ do Titular
                    </label>
                    <input
                      type="text"
                      value={formData.bank_account_data?.holder_document || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          bank_account_data: {
                            ...formData.bank_account_data,
                            holder_document: e.target.value,
                          },
                        })
                      }
                      className="w-full rounded-xl bg-white/70 border border-white/60 px-4 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/40 transition"
                      placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    />
                  </div>
                </div>

                {organization?.asaas_wallet_id && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-green-900 mb-1">
                      ✅ Subconta Asaas Criada
                    </p>
                    <p className="text-xs text-green-700 font-mono">
                      {organization.asaas_wallet_id}
                    </p>
                  </div>
                )}

                {organization?.kyc_status && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-700">Status KYC:</span>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                        organization.kyc_status === "approved"
                          ? "bg-green-100 text-green-700"
                          : organization.kyc_status === "rejected"
                            ? "bg-red-100 text-red-700"
                            : organization.kyc_status === "in_review"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {organization.kyc_status === "approved"
                        ? "Aprovado"
                        : organization.kyc_status === "rejected"
                          ? "Rejeitado"
                          : organization.kyc_status === "in_review"
                            ? "Em Análise"
                            : "Pendente"}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/40">
            <button
              onClick={handleSave}
              disabled={saving || !formData.name?.trim()}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-semibold shadow-lg shadow-amber-500/20 hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
