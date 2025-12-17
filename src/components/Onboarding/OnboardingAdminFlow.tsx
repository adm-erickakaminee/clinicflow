import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../hooks/useOnboarding'
import { useToast } from '../ui/Toast'
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Settings,
  Users,
  DollarSign,
  CreditCard,
  Calendar,
  BarChart3,
  MessageSquare,
  Loader2,
} from 'lucide-react'

const steps = [
  {
    id: 1,
    title: 'Boas-Vindas e Valor da Gaby',
    icon: Sparkles,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">👋 Bem-vindo ao CLINIC FLOW!</h3>
          <p className="text-gray-700 mb-4">
            A <strong>Gaby</strong> é sua assistente inteligente que vai transformar a gestão da sua clínica, 
            focando em <strong>Rentabilidade e Eficiência</strong>.
          </p>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Relatórios de Desempenho</p>
                <p className="text-sm text-gray-600">Análises em tempo real de faturamento, ocupação e performance dos profissionais</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Otimização de Agenda</p>
                <p className="text-sm text-gray-600">Sugestões inteligentes para maximizar a ocupação e reduzir gaps na agenda</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Gestão de Estoque</p>
                <p className="text-sm text-gray-600">Alertas automáticos quando produtos estão acabando e sugestões de reposição</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'Configuração Essencial',
    icon: Settings,
    content: (
      <div className="space-y-4">
        <p className="text-gray-700 mb-6">
          Para começar a usar o sistema, você precisa configurar os elementos essenciais:
        </p>
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
                <p className="text-xs text-gray-500 italic">
                  Acesse a aba "Cadastros" no painel principal para gerenciar serviços e equipe
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white border-2 border-indigo-200 rounded-xl p-6 hover:border-indigo-400 transition">
            <div className="flex items-start gap-4">
              <div className="bg-indigo-100 p-3 rounded-lg">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-2">Convidar Equipe</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Convide recepcionistas e profissionais para começar a trabalhar na sua clínica
                </p>
                <p className="text-xs text-gray-500 italic">
                  Acesse a aba "Cadastros" no painel principal para convidar membros da equipe
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
          <p className="text-sm text-blue-800">
            <strong>Dica:</strong> Você pode voltar aqui depois e continuar o onboarding. 
            Por enquanto, explore essas configurações!
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Regras Financeiras',
    icon: DollarSign,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">💰 Configuração de Comissões</h3>
          <p className="text-gray-700 mb-4">
            Configure a <strong>taxa de comissão</strong> que os profissionais pagarão à clínica pelos serviços realizados.
          </p>
          <div className="bg-white rounded-xl p-4 mb-4">
            <h4 className="font-semibold text-gray-900 mb-2">Como funciona a Repartição Automática:</h4>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>O sistema calcula automaticamente a divisão do pagamento</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>A clínica recebe a comissão configurada</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>O profissional recebe o restante do valor</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span>A plataforma recebe uma taxa de serviço (5.99%)</span>
              </div>
            </div>
          </div>
          <div className="bg-white/80 rounded-xl p-4">
            <p className="text-sm text-gray-700">
              <strong>Exemplo:</strong> Se um serviço custa R$ 100,00 e a comissão é de 30%:
            </p>
            <ul className="text-sm text-gray-600 mt-2 space-y-1 ml-4">
              <li>• Clínica recebe: R$ 30,00 (30%)</li>
              <li>• Profissional recebe: R$ 64,01 (64.01%)</li>
              <li>• Plataforma recebe: R$ 5,99 (5.99%)</li>
            </ul>
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
          <p className="text-sm text-blue-800">
            <strong>Importante:</strong> Você pode configurar diferentes modelos de comissão por profissional 
            (porcentagem, aluguel fixo ou híbrido) nas configurações.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: 'Conta Asaas e Recebimento',
    icon: CreditCard,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">💳 Sua Conta Asaas</h3>
          <p className="text-gray-700 mb-4">
            A conta da sua clínica no <strong>Asaas</strong> foi criada automaticamente durante o cadastro, 
            com base nos dados fornecidos.
          </p>
          <div className="bg-white rounded-xl p-4 mb-4 space-y-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Credenciais de Acesso</p>
                <p className="text-sm text-gray-600">
                  As credenciais de acesso foram enviadas para o e-mail cadastrado. 
                  <strong className="text-blue-700"> Verifique também a caixa de Spam</strong>.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Destino dos Pagamentos</p>
                <p className="text-sm text-gray-600">
                  Esta conta será usada como o destino principal para receber todos os pagamentos dos clientes.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Distribuição Automática (Split)</p>
                <p className="text-sm text-gray-600">
                  O sistema processa automaticamente a distribuição dos valores entre clínica, profissional e plataforma.
                </p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Atenção:</strong> Certifique-se de acessar sua conta no Asaas e completar a verificação 
              (KYC) se necessário para habilitar os recebimentos.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    title: 'Fluxo Operacional',
    icon: Calendar,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">📅 Demonstração do Fluxo</h3>
          <p className="text-gray-700 mb-6">
            Veja como funciona o fluxo completo de um agendamento:
          </p>
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
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-6">
            <p className="text-sm text-blue-800">
              <strong>💡 Dica:</strong> Todo esse processo é gerenciado pelo sistema, com notificações automáticas 
              e registro completo de todas as etapas.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: 'Gaby: Metas e Automações',
    icon: BarChart3,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-3">🤖 Funcionalidades Avançadas da Gaby</h3>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-5 border-2 border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Metas Financeiras e de Ocupação</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    A Gaby auxilia você a traçar metas inteligentes baseadas em dados históricos e tendências.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Análises preditivas de faturamento</li>
                    <li>• Sugestões de otimização de agenda</li>
                    <li>• Alertas de metas não atingidas</li>
                    <li>• Relatórios de performance em tempo real</li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border-2 border-indigo-200">
              <div className="flex items-start gap-4">
                <div className="bg-indigo-100 p-3 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-2">Automação de WhatsApp</h4>
                  <p className="text-sm text-gray-600 mb-3">
                    A Gaby automatiza a comunicação com seus pacientes via WhatsApp.
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1 ml-4">
                    <li>• Lembretes automáticos de consulta (24h e 2h antes)</li>
                    <li>• Mensagens personalizadas para cada paciente</li>
                    <li>• Confirmação de agendamentos</li>
                    <li>• Follow-up pós-atendimento</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-purple-100 border border-purple-200 rounded-xl p-4 mt-6">
            <p className="text-sm text-purple-800">
              <strong>✨ Explore:</strong> Acesse a aba "Análises" no painel para ver todas as funcionalidades 
              da Gaby em ação e configurar suas preferências.
            </p>
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
      <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
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
                  Iniciar Painel
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

