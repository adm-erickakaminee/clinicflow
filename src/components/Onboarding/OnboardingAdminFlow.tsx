import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../hooks/useOnboarding'
import { useToast } from '../ui/Toast'
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Calculator,
  Target,
  Settings,
  Users,
  DollarSign,
  CreditCard,
  Calendar,
  MessageSquare,
  Loader2,
  HelpCircle,
} from 'lucide-react'

// Imagens da Gaby para cada passo
const gabyImages = {
  welcome: '/gaby-welcome.png',
  config: '/gaby-config.png',
  finances: '/gaby-finances.png',
  security: '/gaby-security.png',
  demo: '/gaby-demo.png',
  success: '/gaby-success.png',
  default: '/gaby-default.png',
}

const steps = [
  {
    id: 1,
    title: 'Boas-Vindas Pessoal e Valor da Gaby',
    icon: Sparkles,
    gabyImage: gabyImages.welcome,
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img 
              src={gabyImages.welcome} 
              alt="Gaby - Boas-vindas" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Oiee! Eu sou a Gaby, sua assistente pessoal! 👋
                  </h3>
                  <p className="text-gray-700 leading-relaxed">
                    Vou te ajudar a transformar sua clínica em um negócio ainda mais rentável e eficiente! 
                    Estou aqui para te guiar em cada passo e garantir que você aproveite ao máximo todas as funcionalidades do CLINIC FLOW.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 text-lg">O que eu posso fazer por você:</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="font-semibold text-gray-900">Rentabilidade</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Vou te mostrar relatórios de desempenho em tempo real e ajudar você a maximizar seus lucros
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="font-semibold text-gray-900">Otimização</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Sugiro melhorias na sua agenda para reduzir gaps e aumentar a ocupação
                  </p>
                </div>
                <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <p className="font-semibold text-gray-900">Gestão Inteligente</p>
                  </div>
                  <p className="text-sm text-gray-600">
                    Alertas automáticos de estoque, precificação e retenção de clientes
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Configuração Financeira Base',
    icon: Calculator,
    gabyImage: gabyImages.config,
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img 
              src={gabyImages.config} 
              alt="Gaby - Configuração" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calculator className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Vamos calcular o custo real da sua hora de trabalho! 💰
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Para definirmos metas e preços justos, preciso que você me informe:
                  </p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span><strong>Turno da Clínica:</strong> Horários de funcionamento</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span><strong>Custos Fixos:</strong> Aluguel, energia, água, internet, etc.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 mt-1">•</span>
                      <span><strong>Custos Variáveis:</strong> Materiais, produtos, comissões, etc.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-blue-200 rounded-xl p-6 hover:border-blue-400 transition">
              <div className="flex items-start gap-4">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Calculator className="h-6 w-6 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Calcular Meu Custo/Hora</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure os custos da sua clínica para eu calcular o custo real por hora de trabalho
                  </p>
                  <button
                    onClick={() => {
                      // Redirecionar para configurações financeiras
                      window.location.href = '/admin/dashboard?tab=Configurações&section=financial'
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-lg"
                  >
                    <Calculator className="h-4 w-4" />
                    Calcular Meu Custo/Hora
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900 mb-1">💡 Dica da Gaby:</p>
                  <p className="text-sm text-yellow-800">
                    Com essas informações, vou calcular automaticamente o custo real da sua hora de trabalho. 
                    Isso é fundamental para definirmos preços justos e metas realistas!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Definição de Metas Estratégicas',
    icon: Target,
    gabyImage: gabyImages.finances,
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img 
              src={gabyImages.finances} 
              alt="Gaby - Metas" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Target className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Onde queremos chegar este mês? 🎯
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Minhas análises e sugestões serão embasadas nas metas que você definir. 
                    Vamos traçar objetivos claros para sua clínica:
                  </p>
                  <ul className="space-y-2 text-gray-700 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span><strong>Meta de Faturamento:</strong> Quanto você quer faturar este mês?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span><strong>Meta de Ocupação:</strong> Qual percentual de ocupação da agenda você deseja?</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-emerald-600 mt-1">•</span>
                      <span><strong>Meta por Profissional:</strong> Metas individuais para cada membro da equipe</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-emerald-200 rounded-xl p-6 hover:border-emerald-400 transition">
              <div className="flex items-start gap-4">
                <div className="bg-emerald-100 p-3 rounded-lg">
                  <Target className="h-6 w-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Definir Metas</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Configure suas metas financeiras e de ocupação para eu te ajudar a alcançá-las
                  </p>
                  <button
                    onClick={() => {
                      // Redirecionar para configurações de metas
                      window.location.href = '/admin/dashboard?tab=Configurações&section=goals'
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg"
                  >
                    <Target className="h-4 w-4" />
                    Definir Metas
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">💡 Dica da Gaby:</p>
                  <p className="text-sm text-blue-800">
                    Com metas definidas, vou te alertar quando você estiver perto de alcançá-las ou quando precisar 
                    de ajustes na estratégia. Vamos juntos transformar sua clínica!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: 'Cadastros Essenciais',
    icon: Settings,
    gabyImage: gabyImages.config,
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img 
              src={gabyImages.config} 
              alt="Gaby - Cadastros" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Settings className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Vamos configurar os elementos essenciais! ⚙️
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Para começar a usar o sistema, você precisa cadastrar:
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 hover:border-indigo-400 transition">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <Settings className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Cadastrar Primeiro Serviço</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Defina os serviços oferecidos pela sua clínica (ex: Consulta, Procedimento, Tratamento)
                    </p>
                    <button
                      onClick={() => {
                        // Redirecionar para cadastros - aba serviços
                        window.location.href = '/admin/dashboard?tab=Cadastros&section=services'
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg"
                    >
                      <Settings className="h-4 w-4" />
                      Cadastrar Serviço
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 hover:border-indigo-400 transition">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-100 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Convidar Membros da Equipe</h4>
                    <p className="text-sm text-gray-600 mb-4">
                      Convide recepcionistas e profissionais para começar a trabalhar na sua clínica
                    </p>
                    <button
                      onClick={() => {
                        // Redirecionar para cadastros - aba profissionais
                        window.location.href = '/admin/dashboard?tab=Cadastros&section=professionals'
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg"
                    >
                      <Users className="h-4 w-4" />
                      Convidar Membro
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">💡 Dica da Gaby:</p>
                  <p className="text-sm text-blue-800">
                    Não se preocupe! Você pode voltar aqui depois e continuar o onboarding. 
                    Por enquanto, explore essas configurações e quando terminar, volte para continuar!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: 'Regras de Pagamento e Split',
    icon: DollarSign,
    gabyImage: gabyImages.finances,
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img 
              src={gabyImages.finances} 
              alt="Gaby - Finanças" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6 border-2 border-emerald-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Vamos configurar as regras de pagamento! 💳
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Configure a <strong>taxa de comissão</strong> que os profissionais pagarão à clínica. 
                    Eu vou calcular e distribuir automaticamente todos os pagamentos!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-emerald-200">
              <h4 className="font-semibold text-gray-900 mb-4 text-lg">Como funciona o Split de Pagamento:</h4>
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-red-100 p-2 rounded-lg">
                      <span className="text-red-600 font-bold text-sm">1</span>
                    </div>
                    <p className="font-semibold text-gray-900">Desconto de Taxas de Gateway</p>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    Primeiro, desconto as taxas da operadora de cartão (ex: 2.99% para crédito, 1.99% para débito)
                  </p>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-6 w-6 text-emerald-400" />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <span className="text-blue-600 font-bold text-sm">2</span>
                    </div>
                    <p className="font-semibold text-gray-900">Split do Profissional</p>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    Retiro a porcentagem configurada do Profissional (do valor líquido após gateway) 
                    e envio <strong>diretamente para a conta Asaas/bancária do Profissional</strong>
                  </p>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-6 w-6 text-emerald-400" />
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <span className="text-purple-600 font-bold text-sm">3</span>
                    </div>
                    <p className="font-semibold text-gray-900">Taxa da Plataforma</p>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    Retiro a taxa de serviço da plataforma (5.99% do valor original)
                  </p>
                </div>

                <div className="flex justify-center">
                  <ArrowDown className="h-6 w-6 text-emerald-400" />
                </div>

                <div className="bg-emerald-50 rounded-lg p-4 border-2 border-emerald-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <span className="text-emerald-600 font-bold text-sm">4</span>
                    </div>
                    <p className="font-semibold text-gray-900">Repasse para a Clínica</p>
                  </div>
                  <p className="text-sm text-gray-600 ml-11">
                    O valor restante é depositado <strong>diretamente na conta da Clínica</strong>
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 border-2 border-emerald-200">
              <h4 className="font-semibold text-gray-900 mb-3">Exemplo Prático:</h4>
              <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
                <p className="text-gray-700"><strong>Pagamento recebido:</strong> R$ 100,00</p>
                <p className="text-gray-600">1. Taxa Gateway (2.99%): -R$ 2,99 → <strong>Líquido: R$ 97,01</strong></p>
                <p className="text-gray-600">2. Comissão Profissional (30%): -R$ 29,10 → <strong>Vai para conta do Profissional</strong></p>
                <p className="text-gray-600">3. Taxa Plataforma (5.99%): -R$ 5,99</p>
                <p className="text-gray-700 font-semibold">4. Clínica recebe: <strong>R$ 61,92</strong></p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">💡 Dica da Gaby:</p>
                  <p className="text-sm text-blue-800">
                    Você pode configurar diferentes modelos de comissão por profissional (porcentagem, aluguel fixo ou híbrido) 
                    nas configurações. Tudo é calculado e transferido automaticamente!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: 'Conta Asaas e Acesso',
    icon: CreditCard,
    gabyImage: gabyImages.security,
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img 
              src={gabyImages.security} 
              alt="Gaby - Segurança" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Sua conta no Asaas está pronta! 🎉
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    A conta da sua clínica no <strong>Asaas</strong> foi criada automaticamente durante o cadastro, 
                    com base nos dados fornecidos.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Credenciais de Acesso</h4>
                    <p className="text-sm text-gray-600 mb-2">
                      Vou te enviar as credenciais de acesso para o e-mail cadastrado.
                    </p>
                    <p className="text-sm font-semibold text-blue-700">
                      ⚠️ Confira também na caixa de <strong>Spam</strong>!
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Destino dos Pagamentos</h4>
                    <p className="text-sm text-gray-600">
                      Esta conta será usada como o destino principal para receber todos os pagamentos dos clientes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 border-2 border-blue-200">
                <div className="flex items-start gap-4">
                  <CheckCircle2 className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 mb-2">Distribuição Automática (Split)</h4>
                    <p className="text-sm text-gray-600">
                      Eu processo automaticamente a distribuição dos valores entre clínica, profissional e plataforma. 
                      Tudo acontece de forma transparente e segura!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-yellow-900 mb-1">⚠️ Atenção da Gaby:</p>
                  <p className="text-sm text-yellow-800">
                    Certifique-se de acessar sua conta no Asaas e completar a verificação (KYC) se necessário 
                    para habilitar os recebimentos. Sem isso, os pagamentos podem ficar pendentes!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 7,
    title: 'Demonstração do Fluxo e Automatização',
    icon: Calendar,
    gabyImage: gabyImages.demo,
    content: (
      <div className="space-y-6">
        <div className="flex items-start gap-6">
          <div className="flex-shrink-0">
            <img 
              src={gabyImages.demo} 
              alt="Gaby - Demonstração" 
              className="w-32 h-32 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border-2 border-purple-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    Veja como funciona na prática! 🎬
                  </h3>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Vou te mostrar o fluxo completo de um agendamento e como eu automatizo tudo para você:
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-white rounded-xl p-5 border-2 border-purple-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <span className="text-2xl font-bold text-purple-600">1</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Check-in</h4>
                    <p className="text-sm text-gray-600">Cliente chega e é recebido pela recepcionista</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <ArrowDown className="h-6 w-6 text-purple-400" />
              </div>
              <div className="bg-white rounded-xl p-5 border-2 border-purple-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <span className="text-2xl font-bold text-purple-600">2</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Preenchimento de Anamnese</h4>
                    <p className="text-sm text-gray-600">Profissional preenche o prontuário e anamnese do paciente</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-center">
                <ArrowDown className="h-6 w-6 text-purple-400" />
              </div>
              <div className="bg-white rounded-xl p-5 border-2 border-purple-200">
                <div className="flex items-center gap-4 mb-3">
                  <div className="bg-purple-100 p-3 rounded-lg">
                    <span className="text-2xl font-bold text-purple-600">3</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">Check-out e Pagamento</h4>
                    <p className="text-sm text-gray-600">Cliente realiza o pagamento e recebe o recibo</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6 mt-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-3">Automação de WhatsApp</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Eu automatizo toda a comunicação com seus pacientes via WhatsApp:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span><strong>Lembretes automáticos:</strong> 24h e 2h antes da consulta</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span><strong>Mensagens personalizadas:</strong> Para cada paciente</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span><strong>Confirmação de agendamentos:</strong> Automática</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span><strong>Follow-up pós-atendimento:</strong> Para aumentar a retenção</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <HelpCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-900 mb-1">💡 Dica da Gaby:</p>
                  <p className="text-sm text-blue-800">
                    Todo esse processo é gerenciado por mim, com notificações automáticas e registro completo 
                    de todas as etapas. Você só precisa focar no que importa: cuidar dos seus pacientes!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
]

function ArrowDown({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

export function OnboardingAdminFlow() {
  const navigate = useNavigate()
  const toast = useToast()
  const { markOnboardingAsSeen } = useOnboarding()
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleting, setIsCompleting] = useState(false)

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const success = await markOnboardingAsSeen()
      if (success) {
        toast.success('Onboarding concluído! Bem-vindo ao CLINIC FLOW!')
        // Redirecionar para o dashboard do admin
        navigate('/admin/dashboard')
      } else {
        toast.error('Erro ao finalizar onboarding. Tente novamente.')
        setIsCompleting(false)
      }
    } catch (error) {
      console.error('Erro ao completar onboarding:', error)
      toast.error('Erro ao finalizar onboarding. Tente novamente.')
      setIsCompleting(false)
    }
  }

  const currentStepData = steps[currentStep - 1]
  const Icon = currentStepData.icon

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 rounded-xl">
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Onboarding CLINIC FLOW</h1>
                <p className="text-sm text-gray-600">Passo {currentStep} de {steps.length}</p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentStepData.title}</h2>
          </div>
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 flex items-center justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="px-6 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition ${
                  index + 1 === currentStep
                    ? 'bg-purple-600 w-8'
                    : index + 1 < currentStep
                    ? 'bg-purple-300'
                    : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-lg flex items-center gap-2"
            >
              Próximo
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  Finalizar Onboarding e Acessar Dashboard
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
