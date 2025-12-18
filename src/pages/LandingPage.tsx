import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { TermsOfService } from "../components/TermsOfService";
import {
  Calendar,
  Users,
  DollarSign,
  BarChart3,
  Shield,
  Zap,
  CheckCircle2,
  ArrowRight,
  Star,
  Mail,
  Clock,
} from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);

  const handleGetStarted = () => {
    navigate("/signup");
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      navigate("/signup", { state: { email } });
    }
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-[#ffb3a7] via-[#ffc78f] to-[#ffe7a3]">
      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 py-4 sm:py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <img
              src="/FAVCON.png"
              alt="ClinicFlow"
              className="h-8 w-8 sm:h-12 sm:w-12 object-contain"
            />
            <span className="text-lg sm:text-2xl font-bold text-gray-900 whitespace-nowrap">
              ClinicFlow
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <a
              href="#features"
              className="hidden sm:inline-block text-gray-700 hover:text-gray-900 font-medium text-sm"
            >
              Recursos
            </a>
            <a
              href="#pricing"
              className="hidden sm:inline-block text-gray-700 hover:text-gray-900 font-medium text-sm"
            >
              Preços
            </a>
            <button
              onClick={() => navigate("/login")}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-gray-700 hover:text-gray-900 transition whitespace-nowrap"
            >
              Entrar
            </button>
            <button
              onClick={handleGetStarted}
              className="px-3 sm:px-6 py-1.5 sm:py-2.5 rounded-xl bg-gray-900 text-white text-xs sm:text-sm font-semibold hover:bg-gray-800 transition shadow-lg whitespace-nowrap"
            >
              <span className="hidden sm:inline">Começar Agora</span>
              <span className="sm:hidden">Começar</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto space-y-6 sm:space-y-8">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg">
              <Star className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-xs sm:text-sm font-semibold text-gray-900">
                7 dias grátis • Cancele quando quiser
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-gray-900 leading-tight px-2">
              Gerencie sua clínica com
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
                inteligência e simplicidade
              </span>
            </h1>

            <p className="text-base sm:text-xl md:text-2xl text-gray-700 max-w-2xl mx-auto leading-relaxed px-2">
              Sistema completo de gestão para clínicas e consultórios. Agendamentos, financeiro,
              pacientes e muito mais em uma única plataforma.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 pt-4 px-4">
              <button
                onClick={handleGetStarted}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-gray-900 text-white text-base sm:text-lg font-semibold hover:bg-gray-800 transition shadow-xl flex items-center justify-center gap-2 group"
              >
                Começar Teste Grátis
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => {
                  document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 rounded-2xl bg-white/80 backdrop-blur-sm border border-white/60 text-gray-900 text-base sm:text-lg font-semibold hover:bg-white transition shadow-lg"
              >
                Ver Recursos
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 pt-6 sm:pt-8 text-xs sm:text-sm text-gray-600 px-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <span>Setup em 5 minutos</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
                <span>Suporte 24/7</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="relative px-4 sm:px-6 py-12 sm:py-20 bg-white/40 backdrop-blur-sm"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Tudo que sua clínica precisa
            </h2>
            <p className="text-base sm:text-xl text-gray-700 max-w-2xl mx-auto px-2">
              Recursos poderosos para transformar a gestão da sua clínica
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white/60 p-8 shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white mb-6 shadow-lg">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="relative px-4 sm:px-6 py-12 sm:py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Preços Simples e Transparentes
            </h2>
            <p className="text-base sm:text-xl text-gray-700 max-w-2xl mx-auto px-2">
              Um plano único, sem pegadinhas. Comece grátis e pague apenas quando estiver
              satisfeito.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="rounded-3xl bg-white/80 backdrop-blur-sm border border-white/60 p-8 md:p-12 shadow-2xl">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-2">Plano Base</h3>
                  <p className="text-gray-600">Tudo que você precisa para começar</p>
                </div>
                <div className="text-right">
                  <div className="text-5xl font-bold text-gray-900">
                    R$ <span className="text-6xl">69</span>,90
                  </div>
                  <p className="text-gray-600">/mês</p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                {pricingFeatures.map((item, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle2 className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-lg">{item}</span>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-gray-200">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="h-6 w-6 text-indigo-600" />
                    <h4 className="text-xl font-bold text-gray-900">7 Dias Grátis</h4>
                  </div>
                  <p className="text-gray-700">
                    Teste todos os recursos sem compromisso. A cobrança só acontece após 7 dias, e
                    você pode cancelar a qualquer momento.
                  </p>
                </div>

                <button
                  onClick={handleGetStarted}
                  className="w-full px-8 py-4 rounded-2xl bg-gray-900 text-white text-lg font-semibold hover:bg-gray-800 transition shadow-xl flex items-center justify-center gap-2 group"
                >
                  Começar Teste Grátis Agora
                  <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-4 sm:px-6 py-12 sm:py-20 bg-white/40 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 px-2">
            Pronto para transformar sua clínica?
          </h2>
          <p className="text-base sm:text-xl text-gray-700 mb-6 sm:mb-8 px-2">
            Junte-se a centenas de clínicas que já confiam no ClinicFlow
          </p>

          <form onSubmit={handleEmailSubmit} className="max-w-md mx-auto flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Seu melhor email"
              className="flex-1 px-6 py-4 rounded-2xl border border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <button
              type="submit"
              className="px-8 py-4 rounded-2xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition shadow-lg"
            >
              Começar
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative px-4 sm:px-6 py-8 sm:py-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/FAVCON.png" alt="ClinicFlow" className="h-10 w-10 object-contain" />
                <span className="text-xl font-bold">ClinicFlow</span>
              </div>
              <p className="text-gray-400 text-sm">
                Sistema completo de gestão para clínicas e consultórios.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#features" className="hover:text-white transition">
                    Recursos
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition">
                    Preços
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Segurança
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Sobre
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Contato
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href="#" className="hover:text-white transition">
                    Central de Ajuda
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition">
                    Documentação
                  </a>
                </li>
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  <span>suporte@clinicflow.com</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800 text-center text-sm text-gray-400 space-y-2">
            <p>
              &copy; 2025 CLINIC FLOW - Erick Henrique Akamine Leite (CNPJ: 32.937.677/0001-47).
              Todos os direitos reservados.
            </p>
            <p>
              <button
                onClick={() => setTermsOpen(true)}
                className="text-indigo-400 hover:text-indigo-300 underline"
              >
                Termo de Adesão e Condições de Uso
              </button>
            </p>
          </div>
        </div>
      </footer>
      <TermsOfService open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  );
}

const features = [
  {
    icon: <Calendar className="h-7 w-7" />,
    title: "Agendamento Inteligente",
    description:
      "Sistema de agendamento completo com lembretes automáticos, confirmações e gestão de disponibilidade em tempo real.",
  },
  {
    icon: <Users className="h-7 w-7" />,
    title: "Gestão de Pacientes",
    description:
      "Prontuário eletrônico completo, histórico de atendimentos, evoluções e muito mais em um só lugar.",
  },
  {
    icon: <DollarSign className="h-7 w-7" />,
    title: "Financeiro Integrado",
    description:
      "Controle total sobre receitas, comissões, taxas e relatórios financeiros detalhados para sua clínica.",
  },
  {
    icon: <BarChart3 className="h-7 w-7" />,
    title: "Relatórios e Analytics",
    description:
      "Dashboards completos com métricas de performance, KPIs e insights para tomar decisões baseadas em dados.",
  },
  {
    icon: <Shield className="h-7 w-7" />,
    title: "Segurança e Conformidade",
    description:
      "Dados protegidos com criptografia de ponta a ponta e conformidade total com LGPD e normas de saúde.",
  },
  {
    icon: <Zap className="h-7 w-7" />,
    title: "Integrações",
    description:
      "Conecte com sistemas de pagamento, prontuários eletrônicos e outras ferramentas que sua clínica já usa.",
  },
];

const pricingFeatures = [
  "Até 2 usuários incluídos (Admin + Recepcionista)",
  "Agendamento ilimitado",
  "Gestão completa de pacientes",
  "Sistema financeiro integrado",
  "Relatórios e analytics",
  "Suporte por email e chat",
  "Atualizações automáticas",
  "Backup diário dos dados",
  "Usuários adicionais: R$ 29,90/mês cada",
  "Taxa de agendamento",
];
