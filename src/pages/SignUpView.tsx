import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useToast } from "../components/ui/Toast";
import { TermsOfService } from "../components/TermsOfService";
import {
  Building2,
  Mail,
  Lock,
  User,
  Phone,
  MapPin,
  CreditCard,
  Calendar,
  CheckCircle2,
  Loader2,
  ArrowLeft,
} from "lucide-react";

interface SignUpData {
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  clinicName: string;
  phone: string;
  // ✅ Campos de endereço separados (obrigatórios para Asaas)
  postalCode: string; // CEP
  address: string; // Rua/Logradouro
  addressNumber: string; // Número
  complement: string; // Complemento (opcional)
  province: string; // Bairro
  city: string; // Cidade
  state: string; // Estado (UF)
  cnpj: string;
}

interface TokenizeCardBody {
  customer: string;
  creditCard: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  };
  creditCardHolderInfo: {
    name: string;
    email: string;
    phone: string;
    cpfCnpj: string;
    postalCode: string;
    address: string;
    addressNumber: string;
    complement: string;
    province: string;
    city: string;
    state: string;
  };
}

export function SignUpView() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [formData, setFormData] = useState<SignUpData>({
    email: location.state?.email || "",
    password: "",
    confirmPassword: "",
    fullName: "",
    clinicName: "",
    phone: "",
    // ✅ Campos de endereço separados
    postalCode: "",
    address: "",
    addressNumber: "",
    complement: "",
    province: "",
    city: "",
    state: "",
    cnpj: "",
  });

  const [cardData, setCardData] = useState({
    holderName: "",
    number: "",
    expiry: "",
    cvv: "",
  });

  useEffect(() => {
    // Se já tiver email no state, preencher automaticamente
    if (location.state?.email) {
      setFormData((prev) => ({ ...prev, email: location.state.email }));
    }
  }, [location.state]);

  // Função para validar CPF/CNPJ
  const validateCpfCnpj = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, "");
    // CPF tem 11 dígitos, CNPJ tem 14
    return cleaned.length === 11 || cleaned.length === 14;
  };

  const validateStep1 = (): boolean => {
    // Validação mais rigorosa de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email || !emailRegex.test(formData.email)) {
      toast.error("Email inválido. Use um formato válido como: seuemail@exemplo.com");
      return false;
    }

    // Verificar se não é um domínio conhecido como bloqueado pelo Supabase
    const blockedDomains = ["email.com", "test.com", "example.com", "mail.com"];
    const emailDomain = formData.email.split("@")[1]?.toLowerCase();
    if (emailDomain && blockedDomains.includes(emailDomain)) {
      toast.error(
        "Este domínio de email pode ser bloqueado. " +
          "Use um email real como Gmail, Outlook ou outro provedor válido."
      );
      return false;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error("Senha deve ter pelo menos 6 caracteres");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error("As senhas não conferem");
      return false;
    }
    if (!formData.fullName || formData.fullName.length < 3) {
      toast.error("Nome completo é obrigatório");
      return false;
    }
    if (!formData.clinicName || formData.clinicName.length < 3) {
      toast.error("Nome da clínica é obrigatório");
      return false;
    }
    if (!formData.phone || formData.phone.length < 10) {
      toast.error("Telefone inválido");
      return false;
    }
    // CPF/CNPJ agora é OBRIGATÓRIO para tokenização no Asaas
    if (!formData.cnpj || !validateCpfCnpj(formData.cnpj)) {
      toast.error("CPF ou CNPJ é obrigatório e deve ser válido (11 ou 14 dígitos)");
      return false;
    }
    // ✅ Validar campos de endereço obrigatórios para Asaas
    if (!formData.postalCode || formData.postalCode.replace(/\D/g, "").length !== 8) {
      toast.error("CEP é obrigatório e deve ter 8 dígitos");
      return false;
    }
    if (!formData.address || formData.address.length < 3) {
      toast.error("Endereço (rua/logradouro) é obrigatório");
      return false;
    }
    if (!formData.addressNumber || formData.addressNumber.length < 1) {
      toast.error("Número do endereço é obrigatório");
      return false;
    }
    if (!formData.province || formData.province.length < 2) {
      toast.error("Bairro é obrigatório");
      return false;
    }
    if (!formData.city || formData.city.length < 2) {
      toast.error("Cidade é obrigatória");
      return false;
    }
    if (!formData.state || formData.state.length !== 2) {
      toast.error("Estado (UF) é obrigatório e deve ter 2 caracteres");
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (!cardData.holderName || cardData.holderName.length < 3) {
      toast.error("Nome no cartão é obrigatório");
      return false;
    }
    if (!cardData.number || cardData.number.replace(/\s/g, "").length < 13) {
      toast.error("Número do cartão inválido");
      return false;
    }
    if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      toast.error("Data de validade inválida (MM/AA)");
      return false;
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      toast.error("CVV inválido");
      return false;
    }
    return true;
  };

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, "");
    const match = cleaned.match(/.{1,4}/g);
    return match ? match.join(" ") : cleaned;
  };

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + "/" + cleaned.slice(2, 4);
    }
    return cleaned;
  };

  const handleStep1Next = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSignUp = async () => {
    if (!validateStep2()) return;

    if (!termsAccepted) {
      toast.error("Você precisa aceitar o Termo de Adesão para continuar");
      return;
    }

    setLoading(true);
    try {
      // 1. Criar usuário no Supabase Auth
      // ✅ Validação adicional antes de enviar para Supabase
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error("Email inválido. Use um formato válido como: seuemail@exemplo.com");
      }

      // Normalizar email (lowercase, trim)
      const normalizedEmail = formData.email.toLowerCase().trim();

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (authError) {
        // Tratamento específico para erros de email
        if (authError.message?.includes("invalid") || authError.code === "email_address_invalid") {
          throw new Error(
            "Email inválido ou bloqueado pelo Supabase. " +
              "Use um email real de um provedor válido (Gmail, Outlook, etc.). " +
              'Emails de teste como "teste@email.com" podem ser bloqueados.'
          );
        }
        if (
          authError.message?.includes("already registered") ||
          authError.code === "user_already_registered"
        ) {
          throw new Error("Este email já está cadastrado. Use outro email ou faça login.");
        }
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Erro ao criar usuário. Tente novamente.");
      }

      // ✅ IMPORTANTE: Não tentar fazer login automático se email precisa ser confirmado
      // A função RPC funciona com p_user_id mesmo sem sessão estabelecida
      // Se o Supabase estiver configurado para exigir confirmação de email,
      // o login automático falhará com "Email not confirmed"
      const session = authData.session;
      const needsEmailConfirmation = !session;

      if (needsEmailConfirmation) {
        console.log(
          "ℹ️ Sessão não estabelecida após signUp (email precisa ser confirmado). " +
            "A função RPC funcionará com p_user_id."
        );
      } else {
        console.log("✅ Sessão estabelecida após signUp:", session.user.id);
      }

      // ✅ Usar o user_id do signUp diretamente
      // A função RPC agora aceita p_user_id como parâmetro opcional
      // Isso resolve o problema de sessão não estabelecida após signUp
      const userId = authData.user.id;
      console.log("✅ Usuário criado:", userId, authData.user.email);

      // 2. Criar organização com endereço completo (formato JSON para compatibilidade)
      // ✅ USAR FUNÇÃO RPC que bypassa RLS (resolve erro de política RLS)
      const addressData = {
        postalCode: formData.postalCode.replace(/\D/g, ""),
        address: formData.address,
        addressNumber: formData.addressNumber,
        complement: formData.complement || "",
        province: formData.province,
        city: formData.city,
        state: formData.state.toUpperCase(),
      };

      // ✅ CRÍTICO: Criar organização usando função RPC (bypassa RLS)
      // A função RPC DEVE existir no banco de dados para funcionar
      let orgId: string | null = null;

      console.log("📤 Tentando criar organização via função RPC...", {
        clinicName: formData.clinicName,
        email: normalizedEmail,
        userId: authData.user.id,
        hasAddress: !!addressData,
        addressData: addressData,
      });

      // ✅ Usar o usuário que acabou de ser criado
      // A função RPC verifica auth.uid() internamente, que deve estar disponível após signUp
      // Se a sessão não estiver estabelecida, a função RPC vai falhar e reportar o erro
      try {
        const rpcPayload = {
          p_name: formData.clinicName,
          p_email: normalizedEmail,
          p_phone: formData.phone,
          p_address: addressData, // JSONB
          p_cnpj: formData.cnpj || null,
          p_status: "pending_setup",
          p_user_id: userId, // ✅ Passar user_id explicitamente (resolve problema de sessão)
        };

        console.log("📋 Payload para função RPC:", JSON.stringify(rpcPayload, null, 2));
        console.log(
          "🔍 Tipo de p_address:",
          typeof rpcPayload.p_address,
          Array.isArray(rpcPayload.p_address)
        );

        // ✅ Chamar função RPC
        console.log('📞 Chamando supabase.rpc("create_organization_during_signup", ...)');
        const rpcResponse = await supabase.rpc("create_organization_during_signup", rpcPayload);

        console.log("📥 Resposta da função RPC:", {
          hasData: !!rpcResponse.data,
          hasError: !!rpcResponse.error,
          data: rpcResponse.data,
          error: rpcResponse.error,
        });

        const { data: rpcData, error: rpcError } = rpcResponse;

        // ✅ Verificar erro da função RPC
        if (rpcError) {
          console.error("❌ Erro na função RPC:", {
            code: rpcError.code,
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            fullError: rpcError,
          });

          // Log completo do erro para debug
          console.error("🔍 Debug completo do erro RPC:", JSON.stringify(rpcError, null, 2));

          // ✅ Verificar se é erro de função não encontrada
          const errorMessageLower = (rpcError.message || "").toLowerCase();
          const errorCode = rpcError.code || "";

          console.log("🔍 Análise do erro:", {
            code: errorCode,
            message: errorMessageLower,
            isFunctionNotFound:
              errorCode === "42883" ||
              errorCode === "PGRST202" ||
              (errorMessageLower.includes("function") &&
                (errorMessageLower.includes("does not exist") ||
                  errorMessageLower.includes("not found") ||
                  errorMessageLower.includes("não existe") ||
                  errorMessageLower.includes("could not find"))),
          });

          // Detectar se a função não existe (vários códigos possíveis)
          const functionNotFound =
            rpcError.code === "42883" || // function does not exist (PostgreSQL)
            rpcError.code === "PGRST202" || // function not found in schema cache (PostgREST)
            rpcError.code === "P0001" || // função não encontrada
            (rpcError.message?.toLowerCase().includes("function") &&
              (rpcError.message?.toLowerCase().includes("does not exist") ||
                rpcError.message?.toLowerCase().includes("not found") ||
                rpcError.message?.toLowerCase().includes("não existe") ||
                rpcError.message?.toLowerCase().includes("could not find")));

          if (functionNotFound) {
            const errorMsg =
              "🚨 FUNÇÃO RPC NÃO ENCONTRADA NO BANCO DE DADOS\n\n" +
              `Código do erro: ${errorCode}\n` +
              "A função create_organization_during_signup não existe no banco de dados.\n\n" +
              "📋 AÇÃO NECESSÁRIA (URGENTE):\n" +
              "1. Acesse: https://supabase.com/dashboard → Seu Projeto → SQL Editor\n" +
              "2. Execute PRIMEIRO (se necessário): Clinic/LIMPAR_FUNCAO_ANTIGA.sql\n" +
              "3. Execute DEPOIS: Clinic/supabase/migrations/fix_organizations_insert_during_signup.sql\n" +
              "4. Verifique se funcionou executando:\n" +
              "   SELECT proname FROM pg_proc WHERE proname = 'create_organization_during_signup';\n\n" +
              "📖 Documentação completa: DOCS/EXECUTAR_MIGRATION_URGENTE.md\n\n" +
              "⚠️ O cadastro não funcionará até que a migration seja executada!";

            console.error(errorMsg);
            throw new Error(errorMsg);
          }

          // Verificar se é erro de autenticação/sessão
          if (
            rpcError.message?.includes("não autenticado") ||
            rpcError.message?.includes("not authenticated") ||
            rpcError.message?.includes("session") ||
            rpcError.message?.includes("auth.uid")
          ) {
            throw new Error(
              "Erro de autenticação: A sessão não foi estabelecida após o cadastro. " +
                "Isso pode acontecer se o email precisa ser confirmado. " +
                "Verifique seu email e confirme o cadastro antes de continuar, ou tente fazer login novamente."
            );
          }

          // Outros erros da função RPC
          throw new Error(
            `Erro na função RPC create_organization_during_signup: ${rpcError.message || "Erro desconhecido"}. ` +
              `Código: ${rpcError.code || "N/A"}. ` +
              "Verifique se a função existe e está configurada corretamente no Supabase."
          );
        }

        // ✅ Verificar se retornou dados
        if (!rpcData) {
          throw new Error(
            "Função RPC retornou null ou undefined. " +
              "Verifique se a função create_organization_during_signup está retornando o ID corretamente."
          );
        }

        // ✅ Validar que é um UUID válido
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(String(rpcData))) {
          throw new Error(
            `Função RPC retornou valor inválido: ${rpcData}. ` +
              "Esperado: UUID válido. Verifique se a função está retornando organizations.id corretamente."
          );
        }

        orgId = String(rpcData);
        console.log("✅ Organização criada via função RPC:", orgId);
      } catch (rpcErr: unknown) {
        // ✅ NÃO tentar fallback - sempre falhará por RLS
        // A função RPC é OBRIGATÓRIA para funcionar
        console.error("❌ Erro ao criar organização via RPC:", rpcErr);

        const errorMessage = rpcErr instanceof Error ? rpcErr.message : String(rpcErr);

        // Re-throw com mensagem clara
        if (errorMessage.includes("FUNÇÃO RPC NÃO ENCONTRADA")) {
          throw rpcErr instanceof Error ? rpcErr : new Error(errorMessage);
        }

        // Outros erros também devem ser reportados claramente
        throw new Error(
          `Falha ao criar organização: ${errorMessage || "Erro desconhecido"}. ` +
            "A função RPC create_organization_during_signup é obrigatória. " +
            "Execute a migration fix_organizations_insert_during_signup.sql no Supabase SQL Editor."
        );
      }

      // Buscar dados completos da organização criada
      // ⚠️ Se não houver sessão (email não confirmado), usar dados mínimos diretamente
      // A organização foi criada com sucesso, então temos todos os dados necessários
      console.log("📥 Preparando dados da organização criada:", orgId);
      let orgData: any = null;

      // Se não há sessão, usar dados mínimos diretamente (mais rápido e confiável)
      if (needsEmailConfirmation) {
        console.log("ℹ️ Email não confirmado, usando dados mínimos da organização criada");
        orgData = {
          id: orgId,
          name: formData.clinicName,
          email: normalizedEmail,
          phone: formData.phone,
          address: JSON.stringify(addressData),
          cnpj: formData.cnpj || null,
          status: "pending_setup",
          asaas_customer_id: null,
          asaas_wallet_id: null,
        };
        console.log("✅ Dados da organização preparados:", {
          id: orgData.id,
          name: orgData.name,
          email: orgData.email,
        });
      } else {
        // Se há sessão, tentar buscar dados completos
        console.log("📥 Buscando dados completos da organização criada:", orgId);
        const { data: fetchedOrgData, error: orgFetchError } = await supabase
          .from("organizations")
          .select("*")
          .eq("id", orgId)
          .single();

        if (orgFetchError) {
          // ⚠️ Se falhar por RLS, tentar usar função RPC como fallback
          console.warn(
            "⚠️ Não foi possível buscar organização diretamente, tentando função RPC:",
            orgFetchError
          );

          // Tentar buscar via função RPC (bypassa RLS) - opcional
          try {
            const { data: rpcOrgData, error: rpcOrgError } = await supabase.rpc(
              "get_organization_by_id",
              { p_org_id: orgId }
            );

            if (
              !rpcOrgError &&
              rpcOrgData &&
              (Array.isArray(rpcOrgData) ? rpcOrgData.length > 0 : rpcOrgData)
            ) {
              // Função RPC funcionou!
              orgData = Array.isArray(rpcOrgData) ? rpcOrgData[0] : rpcOrgData;
              console.log("✅ Organização encontrada via função RPC:", {
                id: orgData.id,
                name: orgData.name,
                email: orgData.email,
                status: orgData.status,
              });
            } else {
              // Função RPC não existe ou falhou, usar dados mínimos
              throw new Error("Função RPC não disponível ou falhou");
            }
          } catch (rpcError) {
            // Se a função RPC não existir ou falhar, criar objeto mínimo
            console.warn("⚠️ Função RPC não disponível ou falhou, usando dados mínimos:", rpcError);

            orgData = {
              id: orgId,
              name: formData.clinicName,
              email: normalizedEmail,
              phone: formData.phone,
              address: JSON.stringify(addressData),
              cnpj: formData.cnpj || null,
              status: "pending_setup",
              asaas_customer_id: null,
              asaas_wallet_id: null,
            };

            console.log(
              "✅ Usando dados mínimos da organização (organização foi criada com sucesso):",
              {
                id: orgData.id,
                name: orgData.name,
                email: orgData.email,
              }
            );
          }
        } else if (fetchedOrgData) {
          orgData = fetchedOrgData;
          console.log("✅ Organização encontrada:", {
            id: orgData.id,
            name: orgData.name,
            email: orgData.email,
            status: orgData.status,
          });
        } else {
          // Fallback: criar objeto mínimo mesmo se não houver erro
          orgData = {
            id: orgId,
            name: formData.clinicName,
            email: normalizedEmail,
            phone: formData.phone,
            address: JSON.stringify(addressData),
            cnpj: formData.cnpj || null,
            status: "pending_setup",
            asaas_customer_id: null,
            asaas_wallet_id: null,
          };
          console.log("⚠️ Organização não encontrada, usando dados mínimos");
        }
      }

      // 3. Criar perfil do usuário usando função segura que bypassa RLS
      // Nota: O email está em auth.users, não em profiles
      // Usamos a função insert_profile_safe() para evitar recursão infinita nas políticas RLS
      const { data: profileResult, error: profileError } = await supabase.rpc(
        "insert_profile_safe",
        {
          p_id: authData.user.id,
          p_full_name: formData.fullName,
          p_clinic_id: orgData.id, // ✅ Usar orgData.id (já validado acima)
          p_role: "admin", // Admin é o role padrão para o dono da clínica
          p_phone: formData.phone || null,
          p_avatar_url: null,
          p_professional_id: null,
        }
      );

      if (profileError) {
        console.error("Erro ao criar perfil via função RPC:", {
          error: profileError,
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        });

        // Se a função não existir, informar que precisa executar o script SQL
        if (
          profileError.message?.includes("function") ||
          profileError.message?.includes("does not exist") ||
          profileError.code === "42883"
        ) {
          throw new Error(
            "Função insert_profile_safe() não encontrada. " +
              "Execute o script SQL FIX_PROFILES_RLS_ULTIMA_TENTATIVA.sql no Supabase para criar a função."
          );
        }

        // Se o erro for relacionado a recursão, a função deveria ter evitado isso
        if (profileError.message?.includes("recursion") || profileError.code === "42P17") {
          throw new Error(
            "Erro de recursão detectado mesmo usando função segura. " +
              "Verifique se a função insert_profile_safe() foi criada corretamente no banco de dados. " +
              "Erro: " +
              profileError.message
          );
        }

        // Outros erros
        throw new Error(
          "Erro ao criar perfil: " +
            (profileError.message || "Erro desconhecido") +
            ". Verifique se a função insert_profile_safe() existe no banco de dados."
        );
      }

      // Verificar se o profile foi criado (a função retorna o ID)
      if (!profileResult) {
        // Se a função não retornou nada, verificar se o profile existe
        const { data: checkProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (!checkProfile) {
          throw new Error("Perfil não foi criado. Tente novamente.");
        }
      }

      // 3.5. Criar registro na tabela professionals para a dona da clínica
      // Isso permite que ela apareça na lista de profissionais e receba agendamentos
      try {
        const { data: professionalData, error: professionalError } = await supabase
          .from("professionals")
          .insert({
            clinic_id: orgData.id,
            name: formData.fullName,
            role: "Proprietária", // ou outro role apropriado
            color: "#6366f1", // Cor padrão
            commission_rate: 0, // Dona não paga comissão
            avatar_url: null,
          })
          .select()
          .single();

        if (professionalError) {
          console.warn(
            "Aviso: Não foi possível criar registro em professionals:",
            professionalError
          );
          // Não falhar o cadastro se não conseguir criar o professional
        } else if (professionalData) {
          // Atualizar o profile com o professional_id
          const { error: updateProfileError } = await supabase
            .from("profiles")
            .update({ professional_id: professionalData.id })
            .eq("id", authData.user.id);

          if (updateProfileError) {
            console.warn(
              "Aviso: Não foi possível atualizar profile com professional_id:",
              updateProfileError
            );
          }
        }
      } catch (error) {
        console.warn("Aviso: Erro ao criar professional para admin:", error);
        // Não falhar o cadastro se houver erro
      }

      // 4. Criar conta no ASAAS (OBRIGATÓRIO antes de criar assinatura)
      // ✅ Esta etapa é crítica: a função create-subscription exige asaas_customer_id
      let asaasCustomerId: string | null = null;
      let asaasWalletId: string | null = null;

      try {
        // Validar que temos todos os dados necessários para criar conta ASAAS
        const cnpjCleaned = formData.cnpj.replace(/\D/g, "");
        if (!cnpjCleaned || (cnpjCleaned.length !== 11 && cnpjCleaned.length !== 14)) {
          throw new Error("CPF/CNPJ inválido para criar conta ASAAS");
        }

        // Preparar dados para criar subconta ASAAS
        const asaasSubaccountPayload = {
          type: "clinic" as const,
          clinic_id: orgData.id,
          cnpj: cnpjCleaned,
          // Dados bancários são opcionais e podem ser preenchidos depois
        };

        console.log("📤 Criando conta ASAAS para clínica:", {
          clinic_id: orgData.id,
          clinic_name: formData.clinicName,
          cnpj: cnpjCleaned,
        });

        const { data: asaasSubaccountData, error: asaasSubaccountError } =
          await supabase.functions.invoke("create-asaas-subaccount", {
            body: asaasSubaccountPayload,
          });

        if (asaasSubaccountError) {
          // Erro crítico: sem conta ASAAS, não podemos criar assinatura
          throw new Error(
            `Erro ao criar conta ASAAS: ${asaasSubaccountError.message || "Erro desconhecido"}. ` +
              "A conta ASAAS é obrigatória para processar pagamentos. Tente novamente ou entre em contato com o suporte."
          );
        }

        if (!asaasSubaccountData || !asaasSubaccountData.wallet_id) {
          throw new Error(
            "Conta ASAAS criada mas wallet_id não foi retornado. " +
              "Verifique se a função create-asaas-subaccount está funcionando corretamente."
          );
        }

        // ✅ Prioridade 1: Usar customer_id do response (mais rápido e confiável)
        asaasCustomerId = asaasSubaccountData.customer_id || null;
        asaasWalletId = asaasSubaccountData.wallet_id || null;

        // ✅ Prioridade 2: Se não veio no response, buscar do banco com retry
        if (!asaasCustomerId) {
          console.log("⚠️ customer_id não veio no response, buscando do banco com retry...");

          const maxRetries = 3;
          const retryDelay = 1000; // 1 segundo entre tentativas

          for (let attempt = 1; attempt <= maxRetries; attempt++) {
            console.log(`🔄 Tentativa ${attempt}/${maxRetries} de buscar customer_id do banco...`);

            const { data: updatedOrg, error: fetchError } = await supabase
              .from("organizations")
              .select("asaas_customer_id, asaas_wallet_id")
              .eq("id", orgData.id)
              .maybeSingle();

            if (fetchError) {
              console.warn(`⚠️ Erro ao buscar organização (tentativa ${attempt}):`, fetchError);
            } else if (updatedOrg?.asaas_customer_id) {
              asaasCustomerId = updatedOrg.asaas_customer_id;
              asaasWalletId = updatedOrg.asaas_wallet_id || asaasWalletId;
              console.log("✅ customer_id encontrado no banco:", asaasCustomerId);
              break;
            }

            // Se não encontrou e ainda há tentativas, aguardar antes de tentar novamente
            if (attempt < maxRetries) {
              console.log(`⏳ Aguardando ${retryDelay}ms antes da próxima tentativa...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
        }

        // ✅ Validação final: se ainda não temos customer_id, lançar erro
        if (!asaasCustomerId) {
          throw new Error(
            "Conta ASAAS criada mas customer_id não foi encontrado após múltiplas tentativas. " +
              "A conta ASAAS foi criada com sucesso, mas houve um problema ao recuperar o customer_id. " +
              "Tente novamente ou entre em contato com o suporte."
          );
        }

        console.log("✅ Conta ASAAS criada com sucesso:", {
          customer_id: asaasCustomerId,
          wallet_id: asaasWalletId,
          status: asaasSubaccountData.status,
        });

        // Atualizar orgData com os IDs do ASAAS para uso posterior
        orgData.asaas_customer_id = asaasCustomerId;
        orgData.asaas_wallet_id = asaasWalletId;
      } catch (asaasError: unknown) {
        // Erro crítico: sem conta ASAAS, não podemos continuar
        console.error("❌ Erro crítico ao criar conta ASAAS:", asaasError);
        const errorMessage = asaasError instanceof Error ? asaasError.message : String(asaasError);
        throw new Error(
          `Falha ao criar conta ASAAS: ${errorMessage || "Erro desconhecido"}. ` +
            "A conta ASAAS é obrigatória para processar pagamentos. " +
            "Verifique se todos os dados estão corretos e tente novamente."
        );
      }

      // 5. Tokenizar cartão de crédito (SEGURANÇA)
      let creditCardToken: string | null = null;

      try {
        // Preparar dados do cartão para tokenização
        const expiryParts = cardData.expiry.split("/");
        const expiryMonth = expiryParts[0]?.trim() || "";
        let expiryYear = expiryParts[1]?.trim() || "";

        // Converter ano de 2 dígitos para 4 dígitos (ex: "28" -> "2028")
        if (expiryYear.length === 2) {
          const currentYear = new Date().getFullYear();
          const currentCentury = Math.floor(currentYear / 100) * 100;
          const yearValue = parseInt(expiryYear, 10);
          expiryYear = String(currentCentury + yearValue);
        }

        // ✅ Usar campos de endereço separados (já coletados no formulário)
        const postalCode = formData.postalCode.replace(/\D/g, "");
        const addressNumber = formData.addressNumber;

        // Validar que todos os campos obrigatórios estão presentes antes de enviar
        if (!orgData?.id) {
          throw new Error("ID da organização não encontrado");
        }
        if (!cardData.holderName || !cardData.number || !cardData.expiry || !cardData.cvv) {
          throw new Error("Dados do cartão incompletos");
        }
        if (!formData.fullName || !normalizedEmail || !formData.phone) {
          throw new Error("Dados pessoais incompletos");
        }

        // ✅ Preparar body com todos os campos obrigatórios do Asaas
        const cpfCnpjCleaned = String(formData.cnpj).replace(/\D/g, "");

        const tokenizeBody: TokenizeCardBody = {
          customer: String(orgData.id), // Garantir que é string
          creditCard: {
            holderName: String(cardData.holderName).trim(),
            number: String(cardData.number).replace(/\s/g, ""),
            expiryMonth: String(expiryMonth).trim(),
            expiryYear: String(expiryYear).trim(),
            ccv: String(cardData.cvv).trim(),
          },
          creditCardHolderInfo: {
            name: String(formData.fullName).trim(),
            email: normalizedEmail, // ✅ Usar email normalizado
            phone: String(formData.phone).replace(/\D/g, "").trim(),
            cpfCnpj: cpfCnpjCleaned, // ✅ OBRIGATÓRIO - sempre presente após validação
            postalCode: String(postalCode), // ✅ OBRIGATÓRIO
            address: String(formData.address).trim(), // ✅ Rua/Logradouro
            addressNumber: String(addressNumber), // ✅ OBRIGATÓRIO
            complement: String(formData.complement || "").trim(), // Opcional
            province: String(formData.province).trim(), // ✅ Bairro
            city: String(formData.city).trim(), // ✅ Cidade
            state: String(formData.state).trim(), // ✅ Estado/UF
          },
        };

        console.log("📋 Dados completos preparados para tokenização:", {
          cpfCnpj: cpfCnpjCleaned,
          postalCode,
          addressNumber,
          hasAllRequiredFields: !!(
            tokenizeBody.creditCardHolderInfo.cpfCnpj &&
            tokenizeBody.creditCardHolderInfo.postalCode &&
            tokenizeBody.creditCardHolderInfo.addressNumber
          ),
        });

        console.log("📤 Enviando dados para tokenize-card:", JSON.stringify(tokenizeBody, null, 2));
        console.log("🔍 Verificação CPF/CNPJ no payload:", {
          hasCpfCnpj: !!tokenizeBody.creditCardHolderInfo.cpfCnpj,
          cpfCnpj: tokenizeBody.creditCardHolderInfo.cpfCnpj,
          cpfCnpjLength: tokenizeBody.creditCardHolderInfo.cpfCnpj?.length,
        });

        const { data: tokenizeData, error: tokenizeError } = await supabase.functions.invoke(
          "tokenize-card",
          {
            body: tokenizeBody,
          }
        );

        if (tokenizeError) {
          console.warn(
            "Erro ao tokenizar cartão, tentando criar assinatura sem token:",
            tokenizeError
          );
          // Continuar sem token (pode ser PIX ou erro temporário)
        } else if (tokenizeData?.creditCardToken) {
          creditCardToken = tokenizeData.creditCardToken;
        }
      } catch (tokenizeErr: unknown) {
        console.warn("Erro ao tokenizar cartão:", tokenizeErr);
        // Continuar sem token - pode ser que o Asaas não esteja configurado para tokenização
        // Nesse caso, a assinatura será criada via PIX
      }

      // 6. Criar assinatura com trial de 7 dias (usando token se disponível)
      // ✅ Validar que temos customer_id do ASAAS antes de criar assinatura
      if (!asaasCustomerId) {
        throw new Error(
          "Erro crítico: customer_id do ASAAS não encontrado. " +
            "Não é possível criar assinatura sem conta ASAAS válida."
        );
      }

      console.log("📤 Criando assinatura com trial de 7 dias:", {
        clinic_id: orgData.id,
        asaas_customer_id: asaasCustomerId,
        has_credit_card_token: !!creditCardToken,
      });

      const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke(
        "create-subscription",
        {
          body: {
            clinic_id: orgData.id,
            trial_days: 7,
            credit_card_token: creditCardToken || undefined, // Token tokenizado (seguro) ou undefined para PIX
          },
        }
      );

      if (subscriptionError) {
        console.error("❌ Erro ao criar assinatura:", subscriptionError);
        throw new Error(
          `Erro ao criar assinatura: ${subscriptionError.message || "Erro desconhecido"}. ` +
            "Verifique se a conta ASAAS foi criada corretamente e tente novamente."
        );
      }

      if (subscriptionData?.error) {
        console.error("❌ Erro retornado pela função create-subscription:", subscriptionData.error);
        throw new Error(
          `Erro ao criar assinatura: ${subscriptionData.error}. ` +
            "Verifique se a conta ASAAS foi criada corretamente e tente novamente."
        );
      }

      if (!subscriptionData?.subscription_id) {
        throw new Error(
          "Assinatura criada mas subscription_id não foi retornado. " +
            "Verifique se a função create-subscription está funcionando corretamente."
        );
      }

      console.log("✅ Assinatura criada com sucesso:", {
        subscription_id: subscriptionData.subscription_id,
        trial_days: subscriptionData.trial_days,
        next_due_date: subscriptionData.next_due_date,
      });

      // ✅ Mensagem diferente se email precisa ser confirmado
      if (needsEmailConfirmation) {
        toast.success(
          "🎉 Cadastro realizado! Verifique seu email para confirmar sua conta e começar a usar o sistema."
        );
      } else {
        toast.success("Cadastro realizado com sucesso!");
      }

      // Aguardar um pouco antes de redirecionar
      setTimeout(() => {
        navigate("/login", {
          state: {
            message: needsEmailConfirmation
              ? "🎉 Oiee! Quase tudo pronto! Acabei de te enviar um e-mail. Clica no link lá para eu validar seu acesso e começarmos a configurar sua clínica! 😊"
              : "Cadastro realizado! Você já pode fazer login.",
            email: normalizedEmail,
            needsConfirmation: needsEmailConfirmation,
          },
        });
      }, 2000);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err));
      const errorCode =
        err && typeof err === "object" && "code" in err && typeof err.code === "string"
          ? err.code
          : undefined;

      console.error("❌ Erro no cadastro:", {
        message: error.message,
        code: errorCode,
        stack: error.stack,
        name: error.name,
      });

      // Mensagem de erro mais detalhada para ajudar no debug
      let errorMessage = error.message || "Erro ao realizar cadastro. Tente novamente.";

      // Categorizar erros por tipo para mensagens mais específicas
      if (
        error.message?.includes("Email inválido") ||
        errorCode === "email_address_invalid" ||
        error.message?.includes("invalid email")
      ) {
        // Erros relacionados a email inválido
        errorMessage =
          "Email inválido ou bloqueado. " +
          "O Supabase pode bloquear emails de teste ou domínios específicos. " +
          "Use um email real de um provedor válido (Gmail, Outlook, Yahoo, etc.). " +
          "Se o problema persistir, verifique as configurações de email no Supabase Dashboard.";
      } else if (
        error.message?.includes("already registered") ||
        errorCode === "user_already_registered"
      ) {
        // Email já cadastrado
        errorMessage =
          "Este email já está cadastrado. " + "Use outro email ou faça login com este email.";
      } else if (
        error.message?.includes("ASAAS") ||
        error.message?.includes("Asaas") ||
        error.message?.includes("asaas")
      ) {
        // Erros relacionados ao ASAAS
        if (error.message?.includes("customer_id") || error.message?.includes("conta ASAAS")) {
          errorMessage =
            "Erro ao criar conta no ASAAS. " +
            "Verifique se todos os dados estão corretos (CNPJ, endereço completo) e tente novamente. " +
            "Se o problema persistir, entre em contato com o suporte.";
        } else if (
          error.message?.includes("assinatura") ||
          error.message?.includes("subscription")
        ) {
          errorMessage =
            "Erro ao criar assinatura. " +
            "A conta ASAAS foi criada, mas houve um problema ao processar a assinatura. " +
            "Tente novamente ou entre em contato com o suporte.";
        } else {
          errorMessage =
            "Erro na integração com ASAAS. " +
            "Verifique se a API Key do ASAAS está configurada corretamente. " +
            "Se o problema persistir, entre em contato com o suporte.";
        }
      } else if (error.message?.includes("email") || errorCode === "42703") {
        // Erros relacionados a email no profile
        errorMessage = "Erro de configuração do banco de dados. Entre em contato com o suporte.";
        const errorDetails =
          err && typeof err === "object" && "details" in err && typeof err.details === "string"
            ? err.details
            : undefined;
        const errorHint =
          err && typeof err === "object" && "hint" in err && typeof err.hint === "string"
            ? err.hint
            : undefined;
        console.error("Erro relacionado a email no profile:", {
          message: error.message,
          code: errorCode,
          details: errorDetails,
          hint: errorHint,
        });
      } else if (
        error.message?.includes("organização") ||
        error.message?.includes("organization") ||
        errorCode === "42501" ||
        error.message?.includes("row-level security")
      ) {
        // Erros relacionados à criação de organização ou RLS
        if (
          error.message?.includes("FUNÇÃO_RPC_NAO_EXISTE") ||
          error.message?.includes("migration")
        ) {
          errorMessage = error.message; // Usar mensagem específica sobre migration
        } else if (errorCode === "42501" || error.message?.includes("row-level security")) {
          errorMessage =
            "Erro de permissão (RLS): Não é possível criar organização durante o cadastro. " +
            "Execute a migration fix_organizations_insert_during_signup.sql no Supabase SQL Editor. " +
            "Esta migration cria a função necessária para permitir criação de organizações durante o cadastro.";
        } else {
          errorMessage =
            "Erro ao criar organização. " +
            "Verifique se você tem permissão para criar uma nova clínica. " +
            "Se o problema persistir, entre em contato com o suporte.";
        }
      } else if (error.message?.includes("perfil") || error.message?.includes("profile")) {
        // Erros relacionados à criação de perfil
        errorMessage =
          "Erro ao criar perfil de usuário. " +
          "Verifique se a função insert_profile_safe() existe no banco de dados. " +
          "Se o problema persistir, entre em contato com o suporte.";
      } else if (error.message?.includes("segundos") || error.message?.includes("segurança")) {
        // Erros de rate limiting
        errorMessage =
          "Aguarde alguns segundos antes de tentar novamente. Isso é uma medida de segurança.";
      } else if (error.message?.includes("tokenizar") || error.message?.includes("cartão")) {
        // Erros na tokenização do cartão (não crítico, pode continuar com PIX)
        console.warn("⚠️ Erro ao tokenizar cartão (não crítico):", error.message);
        // Não alterar errorMessage aqui, pois o erro pode ter sido em outra etapa
      }

      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffb3a7] via-[#ffc78f] to-[#ffe7a3] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center justify-center gap-3 mb-4">
            <img src="/FAVCON.png" alt="ClinicFlow" className="h-12 w-12 object-contain" />
            <span className="text-2xl font-bold text-gray-900">ClinicFlow</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crie sua conta</h1>
          <p className="text-gray-700">Comece seus 7 dias grátis agora mesmo</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div
            className={`flex items-center gap-2 ${step >= 1 ? "text-indigo-600" : "text-gray-400"}`}
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 1 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : "1"}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Dados da Conta</span>
          </div>
          <div className={`h-1 w-16 ${step >= 2 ? "bg-indigo-600" : "bg-gray-200"}`} />
          <div
            className={`flex items-center gap-2 ${step >= 2 ? "text-indigo-600" : "text-gray-400"}`}
          >
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              2
            </div>
            <span className="text-sm font-medium hidden sm:inline">Pagamento</span>
          </div>
        </div>

        {/* Form Card */}
        <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white/60 shadow-2xl p-8 md:p-10">
          {step === 1 ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Dados da Conta</h2>
                <p className="text-gray-600">Preencha seus dados para começar</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Mínimo 6 caracteres"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Confirmar Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Digite novamente"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Seu nome completo"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome da Clínica
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.clinicName}
                      onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Nome da sua clínica"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Telefone</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="(11) 99999-9999"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    CPF ou CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => {
                      // Formatar CPF/CNPJ automaticamente
                      const cleaned = e.target.value.replace(/\D/g, "");
                      let formatted = cleaned;

                      if (cleaned.length <= 11) {
                        // Formatar como CPF: 000.000.000-00
                        formatted = cleaned.replace(/(\d{3})(\d)/, "$1.$2");
                        formatted = formatted.replace(/(\d{3})(\d)/, "$1.$2");
                        formatted = formatted.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
                      } else {
                        // Formatar como CNPJ: 00.000.000/0000-00
                        formatted = cleaned.replace(/^(\d{2})(\d)/, "$1.$2");
                        formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
                        formatted = formatted.replace(/\.(\d{3})(\d)/, ".$1/$2");
                        formatted = formatted.replace(/(\d{4})(\d)/, "$1-$2");
                      }

                      setFormData({ ...formData, cnpj: formatted });
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* ✅ Campos de endereço separados (obrigatórios para Asaas) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    CEP <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 8);
                        const formatted = cleaned.replace(/^(\d{5})(\d)/, "$1-$2");
                        setFormData({ ...formData, postalCode: formatted });
                      }}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="00000-000"
                      maxLength={9}
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Rua/Logradouro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nome da rua, avenida, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.addressNumber}
                    onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="123"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Complemento
                  </label>
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Apto, Bloco, etc. (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nome do bairro"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nome da cidade"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Estado (UF) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })
                    }
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Calendar className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">7 Dias Grátis</h4>
                    <p className="text-sm text-gray-700">
                      Seu cartão será cadastrado, mas a cobrança só acontecerá após 7 dias. Você
                      pode cancelar a qualquer momento.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={handleStep1Next}
                className="w-full px-6 py-4 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition shadow-lg"
              >
                Continuar
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Dados do Cartão</h2>
                <p className="text-gray-600">Seus dados estão seguros e criptografados</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Nome no Cartão
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={cardData.holderName}
                      onChange={(e) =>
                        setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })
                      }
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="NOME COMO NO CARTÃO"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Número do Cartão
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={cardData.number}
                      onChange={(e) => {
                        const formatted = formatCardNumber(e.target.value.replace(/\D/g, ""));
                        setCardData({ ...cardData, number: formatted });
                      }}
                      maxLength={19}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                      placeholder="0000 0000 0000 0000"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Validade
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={cardData.expiry}
                        onChange={(e) => {
                          const formatted = formatExpiry(e.target.value);
                          setCardData({ ...cardData, expiry: formatted });
                        }}
                        maxLength={5}
                        className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                        placeholder="MM/AA"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-900 mb-2">CVV</label>
                    <input
                      type="text"
                      value={cardData.cvv}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, "").slice(0, 4);
                        setCardData({ ...cardData, cvv: cleaned });
                      }}
                      maxLength={4}
                      className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono"
                      placeholder="123"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">Pagamento Seguro</h4>
                    <p className="text-sm text-gray-700">
                      Seus dados são processados de forma segura. A cobrança só acontecerá após 7
                      dias de teste grátis.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 flex-1 cursor-pointer">
                    Li e aceito o{" "}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium underline"
                    >
                      Termo de Adesão e Condições de Uso
                    </button>{" "}
                    do CLINIC FLOW
                  </label>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setStep(1)}
                    className="flex-1 px-6 py-4 rounded-xl border border-gray-300 bg-white text-gray-900 font-semibold hover:bg-gray-50 transition"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSignUp}
                    disabled={loading || !termsAccepted}
                    className="flex-1 px-6 py-4 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Finalizar Cadastro"
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Ao criar sua conta, você concorda com nosso{" "}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="text-indigo-600 hover:text-indigo-700 font-medium underline"
          >
            Termo de Adesão e Condições de Uso
          </button>
        </p>

        <TermsOfService open={termsOpen} onOpenChange={setTermsOpen} />
      </div>
    </div>
  );
}
