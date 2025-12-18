import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOnboarding } from '../../hooks/useOnboarding'
import { useToast } from '../ui/Toast'
import { usePanelContext } from '../../context/PanelContext'
import { useScheduler } from '../../context/SchedulerContext'
import { supabase } from '../../lib/supabase'
import { GabyTooltip } from './GabyTooltip'
import {
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ArrowDown,
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
  Hand,
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

interface OnboardingAdminFlowProps {
  onPause?: () => void
}


// Função para criar os steps com acesso aos handlers
const createSteps = (
  handlePauseAndNavigate: (tab: string) => void,
  monthlyGoal: string,
  setMonthlyGoal: (value: string) => void,
  handleSaveGoal: () => void,
  hasCostsConfigured: boolean,
  hasServices: boolean,
  hasTeam: boolean,
  emailChecked: boolean,
  setEmailChecked: (checked: boolean) => void,
  // Novos handlers para Passo 2
  scheduleData: {
    startTime: string
    endTime: string
    weekdays: number[]
    monthlyCosts: string
  },
  setScheduleData: (data: {
    startTime: string
    endTime: string
    weekdays: number[]
    monthlyCosts: string
  }) => void,
  handleSaveSchedule: () => void,
  calculatedHourlyCost: string,
  // Handler para verificar limite de equipe
  teamCount: number,
  teamLimit: number,
  // Handlers para modais inline
  setServiceModalOpen: (open: boolean) => void,
  setProfessionalModalOpen: (open: boolean) => void
) => [
  {
    id: 1,
    title: 'Seja bem vindo(a)',
    icon: Sparkles,
    gabyImage: gabyImages.welcome,
    content: (
      <div className="space-y-6">
        <div className="flex items-center justify-center mb-6">
          <div className="relative">
            <img 
              src={gabyImages.welcome} 
              alt="Gaby acenando" 
              className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 object-contain animate-bounce mx-auto"
              style={{
                animation: 'wave 2s ease-in-out infinite',
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
            <style>{`
              @keyframes wave {
                0%, 100% { transform: rotate(0deg) translateY(0px); }
                25% { transform: rotate(-10deg) translateY(-5px); }
                75% { transform: rotate(10deg) translateY(-5px); }
              }
            `}</style>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-purple-200 text-center">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-purple-100 p-2 rounded-lg mx-auto">
              <Hand className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg sm:text-2xl font-bold text-gray-900 mb-3">
              Oiee! Eu sou a Gaby, sua nova assistente pessoal. 💁‍♀️
            </h3>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed text-base sm:text-lg mb-4 sm:mb-6">
              Estou aqui para tirar o peso da gestão das suas costas e te ajudar a focar no que importa: 
              sua <strong>rentabilidade e eficiência</strong>. Vamos configurar tudo juntinhos?
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 2,
    title: 'O Coração da Clínica (Custo/Hora e Turnos)',
    icon: Calculator,
    gabyImage: gabyImages.config,
    content: (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
            <img 
              src={gabyImages.config} 
              alt="Gaby - Configuração" 
              className="w-48 h-48 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Calculator className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Oiee! Vamos configurar sua jornada! ⏱️
                  </h3>
                  <p className="text-sm sm:text-base text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                    Preencha seus horários e custos aqui embaixo que eu já calculo seu custo por hora agora mesmo!
                  </p>
                </div>
              </div>
            </div>

            {/* Formulário de Turnos e Custos */}
            <div className="bg-white border-2 border-blue-200 rounded-xl p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Horários */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">Horários de Funcionamento</h4>
                <div className="grid md:grid-cols-2 gap-4">
                  <GabyTooltip message="Horário que sua clínica abre. Exemplo: 08:00">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horário Início
                      </label>
                      <input
                        type="time"
                        value={scheduleData.startTime}
                        onChange={(e) => setScheduleData({ ...scheduleData, startTime: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                  </GabyTooltip>
                  <GabyTooltip message="Horário que sua clínica fecha. Exemplo: 18:00">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Horário Fim
                      </label>
                      <input
                        type="time"
                        value={scheduleData.endTime}
                        onChange={(e) => setScheduleData({ ...scheduleData, endTime: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none"
                      />
                    </div>
                  </GabyTooltip>
                </div>
              </div>

              {/* Dias da Semana */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Dias da Semana
                </label>
                <GabyTooltip message="Selecione os dias da semana que sua clínica funciona">
                  <div className="grid grid-cols-7 gap-2">
                    {[
                      { label: 'Dom', value: 0 },
                      { label: 'Seg', value: 1 },
                      { label: 'Ter', value: 2 },
                      { label: 'Qua', value: 3 },
                      { label: 'Qui', value: 4 },
                      { label: 'Sex', value: 5 },
                      { label: 'Sáb', value: 6 },
                    ].map((day) => (
                      <label
                        key={day.value}
                        className={`flex flex-col items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition ${
                          scheduleData.weekdays.includes(day.value)
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={scheduleData.weekdays.includes(day.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setScheduleData({
                                ...scheduleData,
                                weekdays: [...scheduleData.weekdays, day.value],
                              })
                            } else {
                              setScheduleData({
                                ...scheduleData,
                                weekdays: scheduleData.weekdays.filter((d) => d !== day.value),
                              })
                            }
                          }}
                          className="sr-only"
                        />
                        <span className="text-sm font-medium">{day.label}</span>
                      </label>
                    ))}
                  </div>
                </GabyTooltip>
              </div>

              {/* Custos Mensais */}
              <div>
                <GabyTooltip message="Some todos os seus custos mensais: aluguel, energia, água, internet, salários, materiais, etc. Eu vou calcular o custo por hora automaticamente!">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total de Custos Mensais (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-medium">R$</span>
                      <input
                        type="number"
                        value={scheduleData.monthlyCosts}
                        onChange={(e) => setScheduleData({ ...scheduleData, monthlyCosts: e.target.value })}
                        placeholder="0,00"
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none text-lg"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </GabyTooltip>
              </div>

              {/* Cálculo do Custo/Hora */}
              {calculatedHourlyCost && (
                <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-4">
                  <div className="flex items-center gap-3">
                    <Calculator className="h-6 w-6 text-emerald-600" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-900">Seu Custo por Hora:</p>
                      <p className="text-2xl font-bold text-emerald-700">R$ {calculatedHourlyCost}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Botão Salvar */}
              <button
                onClick={handleSaveSchedule}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition shadow-lg"
              >
                <Calculator className="h-4 w-4" />
                Salvar e Calcular Custo/Hora
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Card de resumo se já configurado */}
            {hasCostsConfigured && (
              <div className="bg-emerald-50 border-2 border-emerald-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  <h4 className="font-semibold text-gray-900">Custos e Turnos Configurados!</h4>
                </div>
                <p className="text-sm text-gray-600">
                  Seus dados foram salvos. Você pode editar nas configurações a qualquer momento.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 3,
    title: 'Onde queremos chegar? (Metas)',
    icon: Target,
    gabyImage: gabyImages.finances,
    content: (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
            <img 
              src={gabyImages.finances} 
              alt="Gaby - Metas" 
              className="w-48 h-48 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-emerald-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Agora que sei seus custos, me diga: qual sua meta de faturamento para este mês? 🚀
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                    Vou usar esse número para monitorar sua ocupação e te avisar se estivermos saindo do trilho!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-emerald-200 rounded-xl p-6">
              <h4 className="font-semibold text-gray-900 mb-4">Meta de Faturamento Mensal</h4>
              <div className="space-y-4">
                <GabyTooltip message="Digite quanto você quer faturar este mês. Eu vou monitorar seu progresso e te avisar se estivermos abaixo ou acima da meta!">
                  <div className="relative">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Valor da Meta (R$)
                    </label>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-medium">R$</span>
                      <input
                        type="number"
                        value={monthlyGoal}
                        onChange={(e) => setMonthlyGoal(e.target.value)}
                        placeholder="0,00"
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-lg"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </GabyTooltip>
                <button
                  onClick={handleSaveGoal}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg"
                >
                  <Target className="h-4 w-4" />
                  Definir Metas Estratégicas
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 4,
    title: 'Mãos à obra! (Serviços e Equipe)',
    icon: Settings,
    gabyImage: gabyImages.config,
    content: (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
            <img 
              src={gabyImages.config} 
              alt="Gaby - Cadastros" 
              className="w-48 h-48 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-indigo-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Hora de dar vida ao sistema! 👩‍⚕️
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                    Cadastre os serviços que você oferece e convide sua recepcionista ou outros profissionais. 
                    No cadastro da recepcionista, eu te explico tudinho sobre as permissões dela.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Card de Serviços */}
              <div className={`bg-white border-2 rounded-xl p-6 transition ${
                hasServices 
                  ? 'border-emerald-200 bg-emerald-50' 
                  : 'border-indigo-200 hover:border-indigo-400'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    hasServices ? 'bg-emerald-100' : 'bg-indigo-100'
                  }`}>
                    <Settings className={`h-6 w-6 ${
                      hasServices ? 'text-emerald-600' : 'text-indigo-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">Cadastrar Primeiro Serviço</h4>
                      {hasServices && <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {hasServices 
                        ? 'Serviço cadastrado! Você pode adicionar mais nas configurações.'
                        : 'Defina os serviços oferecidos pela sua clínica. Eu vou sugerir preços baseados no seu custo/hora!'
                      }
                    </p>
                    <GabyTooltip message="Ao cadastrar um serviço, eu já vou preencher o custo por hora que você configurou. Você pode adicionar impostos, despesas específicas do serviço, e eu vou sugerir um preço ideal para você!">
                      <button
                        onClick={() => setServiceModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg"
                      >
                        <Settings className="h-4 w-4" />
                        {hasServices ? 'Adicionar Mais Serviços' : 'Cadastrar Primeiro Serviço'}
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </GabyTooltip>
                  </div>
                </div>
              </div>

              {/* Card de Equipe */}
              <div className={`bg-white border-2 rounded-xl p-6 transition ${
                hasTeam 
                  ? 'border-emerald-200 bg-emerald-50' 
                  : teamCount >= teamLimit
                  ? 'border-red-200 bg-red-50'
                  : 'border-indigo-200 hover:border-indigo-400'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    hasTeam ? 'bg-emerald-100' : teamCount >= teamLimit ? 'bg-red-100' : 'bg-indigo-100'
                  }`}>
                    <Users className={`h-6 w-6 ${
                      hasTeam ? 'text-emerald-600' : teamCount >= teamLimit ? 'text-red-600' : 'text-indigo-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-semibold text-gray-900">Convidar Minha Equipe</h4>
                      {hasTeam && <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />}
                      {teamCount >= teamLimit && <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />}
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {teamCount >= teamLimit
                        ? `Limite de ${teamLimit} profissionais atingido (incluindo você).`
                        : hasTeam
                        ? 'Equipe cadastrada! Você pode adicionar mais membros nas configurações.'
                        : 'Convide recepcionistas e profissionais. Eu explico as permissões de cada função!'
                      }
                    </p>
                    {teamCount >= teamLimit ? (
                      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                        <p className="text-sm font-semibold text-yellow-900 mb-1">
                          Limite do Plano Atingido
                        </p>
                        <p className="text-sm text-yellow-800">
                          Para adicionar mais membros à equipe, o valor é de <strong>R$ 29,90</strong> por novo acesso.
                        </p>
                      </div>
                    ) : (
                      <GabyTooltip message="A recepcionista pode fazer check-in, check-out e gerenciar a agenda. Os profissionais podem acessar seus agendamentos e prontuários. Vou te explicar tudo durante o cadastro!">
                        <button
                          onClick={() => setProfessionalModalOpen(true)}
                          disabled={teamCount >= teamLimit}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Users className="h-4 w-4" />
                          {hasTeam ? 'Adicionar Mais Membros' : 'Convidar Minha Equipe'}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </GabyTooltip>
                    )}
                  </div>
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
    title: 'Transparência Total (Como você recebe)',
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
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-emerald-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-emerald-100 p-2 rounded-lg">
                  <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Aqui a mágica acontece! 💸
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                    A divisão funciona assim: <strong>1º</strong> Descontamos a taxa do cartão → <strong>2º</strong> Sua parte ou do profissional cai na conta → <strong>3º</strong> Taxa da plataforma → <strong>4º</strong> O que sobrar é o lucro da clínica!
                  </p>
                </div>
              </div>
            </div>

            {/* Infográfico Visual do Fluxo - Otimizado para Mobile */}
            <div className="bg-white rounded-xl p-3 sm:p-6 border-2 border-emerald-200 overflow-x-auto">
              <h4 className="font-semibold text-gray-900 mb-4 sm:mb-6 text-base sm:text-lg text-center">
                Fluxo do Dinheiro
              </h4>
              <div className="space-y-3 sm:space-y-4 min-w-0">
                {/* Cliente */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                  <div className="bg-blue-100 rounded-xl p-3 sm:p-4 border-2 border-blue-300 text-center w-full sm:w-auto sm:min-w-[200px]">
                    <p className="font-bold text-blue-900 text-base sm:text-lg">Cliente</p>
                    <p className="text-xs sm:text-sm text-blue-700">Paga R$ 100,00</p>
                  </div>
                  <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400 rotate-90 sm:rotate-0" />
                </div>

                {/* Taxa Cartão */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                  <ArrowDown className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-400 sm:hidden" />
                  <div className="bg-red-100 rounded-xl p-3 sm:p-4 border-2 border-red-300 text-center w-full sm:w-auto sm:min-w-[200px]">
                    <p className="font-bold text-red-900 text-sm sm:text-base">Taxa Cartão</p>
                    <p className="text-xs sm:text-sm text-red-700">-R$ 2,99 (2.99%)</p>
                    <p className="text-xs text-red-600 mt-1">Líquido: R$ 97,01</p>
                  </div>
                  <ArrowRight className="h-6 w-6 sm:h-8 sm:w-8 text-emerald-400 rotate-90 sm:rotate-0" />
                </div>

                {/* Split: Profissional e Plataforma */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3 sm:gap-4">
                  <div className="bg-purple-100 rounded-xl p-3 sm:p-4 border-2 border-purple-300 text-center flex-1 sm:flex-1">
                    <p className="font-bold text-purple-900 text-sm sm:text-base">Profissional</p>
                    <p className="text-xs sm:text-sm text-purple-700">-R$ 65,81 (70%)</p>
                    <p className="text-xs text-purple-600 mt-1">Vai direto para conta dele</p>
                  </div>
                  <div className="bg-orange-100 rounded-xl p-3 sm:p-4 border-2 border-orange-300 text-center flex-1 sm:flex-1">
                    <p className="font-bold text-orange-900 text-sm sm:text-base">Plataforma</p>
                    <p className="text-xs sm:text-sm text-orange-700">-R$ 5,99 (5.99%)</p>
                  </div>
                </div>

                {/* Clínica */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4">
                  <ArrowDown className="h-4 w-4 sm:h-6 sm:w-6 text-emerald-400 sm:hidden" />
                  <div className="bg-emerald-100 rounded-xl p-3 sm:p-4 border-2 border-emerald-300 text-center w-full sm:w-auto sm:min-w-[200px]">
                    <p className="font-bold text-emerald-900 text-base sm:text-lg">Sua Clínica</p>
                    <p className="text-xs sm:text-sm text-emerald-700">Recebe R$ 28,20 (30%)</p>
                    <p className="text-xs text-emerald-600 mt-1">Cai limpinho na conta</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-emerald-200 rounded-xl p-6">
              <GabyTooltip message="Configure a porcentagem de comissão que cada profissional paga à clínica. Você pode ter diferentes modelos: porcentagem, aluguel fixo ou híbrido. Tudo é calculado e transferido automaticamente!">
                <button
                  onClick={() => handlePauseAndNavigate('Configurações')}
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition shadow-lg"
                >
                  <DollarSign className="h-4 w-4" />
                  Entendi, vamos configurar as taxas
                  <ArrowRight className="h-4 w-4" />
                </button>
              </GabyTooltip>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 6,
    title: 'Seu banco está pronto! (Asaas)',
    icon: CreditCard,
    gabyImage: gabyImages.security,
    content: (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
            <img 
              src={gabyImages.security} 
              alt="Gaby - Segurança" 
              className="w-48 h-48 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-blue-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Surpresa! Já criei sua conta no Asaas! 🏦
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                    Já criei sua conta no Asaas com os dados que você me deu. É por lá que você vai gerenciar seus recebimentos. 
                    Dá uma olhadinha no seu e-mail (e na caixa de spam também!) para pegar suas credenciais de acesso.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <HelpCircle className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-900 mb-2">
                    ⚠️ Importante:
                  </p>
                  <p className="text-sm text-yellow-800 mb-4">
                    O acesso pode não chegar no mesmo momento. Pode levar até <strong>24 horas</strong> para você receber as credenciais. 
                    Fique tranquilo, elas vão chegar!
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white border-2 border-blue-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id="email-checked"
                  checked={emailChecked}
                  onChange={(e) => setEmailChecked(e.target.checked)}
                  className="mt-1 h-4 w-4 sm:h-5 sm:w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <GabyTooltip message="Marque esta opção quando você já tiver verificado seu e-mail (incluindo a caixa de spam) e recebido as credenciais de acesso ao Asaas.">
                    <label htmlFor="email-checked" className="block text-sm font-medium text-gray-900 cursor-pointer">
                      Já vi meu e-mail
                    </label>
                  </GabyTooltip>
                  <p className="text-xs text-gray-500 mt-1">
                    Confirme que você já verificou seu e-mail e recebeu as credenciais
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
    title: 'O Dia a Dia (Operação e WhatsApp)',
    icon: Calendar,
    gabyImage: gabyImages.demo,
    content: (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
          <div className="flex-shrink-0 w-full sm:w-auto flex justify-center sm:justify-start">
            <img 
              src={gabyImages.demo} 
              alt="Gaby - Demonstração" 
              className="w-48 h-48 sm:w-40 sm:h-40 md:w-48 md:h-48 object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).src = gabyImages.default
              }}
            />
          </div>
          <div className="flex-1 space-y-4 w-full">
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl sm:rounded-2xl p-4 sm:p-6 border-2 border-purple-200">
              <div className="flex items-start gap-3 mb-4">
                <div className="bg-purple-100 p-2 rounded-lg">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-2">
                    Tudo pronto! 📱
                  </h3>
                  <p className="text-sm sm:text-base text-gray-700 leading-relaxed mb-4">
                    No dia a dia, eu vou criar lembretes de WhatsApp para você enviar aos seus pacientes. Você pode revisar e enviar quando quiser! 
                    Na agenda, você verá como é fácil fazer o Check-in, ver a Anamnese e fazer o Check-out com um clique!
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
                  <h4 className="font-semibold text-gray-900 mb-3">Lembretes de WhatsApp</h4>
                  <p className="text-sm text-gray-700 mb-3">
                    Eu crio lembretes de WhatsApp para você revisar e enviar quando quiser:
                  </p>
                  <ul className="space-y-2 text-sm text-gray-600 ml-4">
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span><strong>Lembretes criados:</strong> 24h e 2h antes da consulta (você envia quando quiser)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span><strong>Mensagens personalizadas:</strong> Criadas para cada paciente, você revisa e envia</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-indigo-600 mt-1">•</span>
                      <span><strong>Confirmação de agendamentos:</strong> Mensagens prontas para você enviar</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
  },
]

export function OnboardingAdminFlow({ onPause }: OnboardingAdminFlowProps = {}) {
  const navigate = useNavigate()
  const toast = useToast()
  const { markOnboardingAsSeen } = useOnboarding()
  const { currentUser } = useScheduler()
  
  // Usar PanelContext (agora sempre disponível pois está dentro do PanelProvider)
  const { setActiveTab } = usePanelContext()
  // Recuperar passo salvo do sessionStorage se existir
  const savedStep = sessionStorage.getItem('onboarding_step')
  const [currentStep, setCurrentStep] = useState(savedStep ? parseInt(savedStep, 10) : 1)
  const [isCompleting, setIsCompleting] = useState(false)
  const [monthlyGoal, setMonthlyGoal] = useState('')
  const [emailChecked, setEmailChecked] = useState(false)
  const [hasCostsConfigured, setHasCostsConfigured] = useState(false)
  const [hasServices, setHasServices] = useState(false)
  const [hasTeam, setHasTeam] = useState(false)
  const [teamCount, setTeamCount] = useState(2) // ✅ Começa com 2 (dona + 1 profissional já contabilizado)
  const teamLimit = 2 // Limite do plano inicial
  const [serviceModalOpen, setServiceModalOpen] = useState(false)
  const [professionalModalOpen, setProfessionalModalOpen] = useState(false)
  
  // Estado do formulário de turnos e custos (Passo 2)
  const [scheduleData, setScheduleData] = useState({
    startTime: '08:00',
    endTime: '18:00',
    weekdays: [1, 2, 3, 4, 5], // Segunda a Sexta por padrão
    monthlyCosts: '',
  })
  const [calculatedHourlyCost, setCalculatedHourlyCost] = useState('')

  // Carregar dados da organização
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser?.clinicId) return

      try {
        // Carregar meta mensal
        const { data: settings } = await supabase
          .from('organization_settings')
          .select('monthly_revenue_goal_cents')
          .eq('clinic_id', currentUser.clinicId)
          .maybeSingle()

        if (settings?.monthly_revenue_goal_cents) {
          setMonthlyGoal((settings.monthly_revenue_goal_cents / 100).toString())
        }

        // Verificar se tem custos configurados (simplificado - pode melhorar)
        setHasCostsConfigured(true) // TODO: Verificar se realmente tem custos configurados

        // Verificar se tem serviços
        const { data: services } = await supabase
          .from('services')
          .select('id')
          .limit(1)

        setHasServices((services?.length || 0) > 0)

        // Verificar se tem equipe (profissionais ou recepcionistas) e contar total
        const { data: team } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('clinic_id', currentUser.clinicId)
          .in('role', ['professional', 'receptionist', 'recepcionista', 'admin', 'clinic_owner'])

        const teamMembers = (team || []).length
        setHasTeam(teamMembers > 2) // Mais de 2 porque já contamos dona + 1
        // ✅ Contabilização correta: começa com 2 (dona + 1 já contabilizado)
        setTeamCount(Math.max(teamMembers, 2)) // Mínimo 2 (dona + 1)

        // Carregar dados de turnos e custos se existirem
        const { data: org } = await supabase
          .from('organizations')
          .select('schedule_start_time, schedule_end_time, schedule_weekdays, monthly_costs_cents, hourly_cost_cents')
          .eq('id', currentUser.clinicId)
          .maybeSingle()

        if (org) {
          if (org.schedule_start_time && org.schedule_end_time) {
            setScheduleData({
              startTime: org.schedule_start_time.substring(0, 5), // HH:mm
              endTime: org.schedule_end_time.substring(0, 5),
              weekdays: org.schedule_weekdays || [],
              monthlyCosts: org.monthly_costs_cents ? (org.monthly_costs_cents / 100).toString() : '',
            })
            setHasCostsConfigured(true)
          }
          if (org.hourly_cost_cents) {
            setCalculatedHourlyCost((org.hourly_cost_cents / 100).toFixed(2))
          }
        }
      } catch (error) {
        console.error('Erro ao carregar dados:', error)
      }
    }

    loadData()
  }, [currentUser?.clinicId])

  // Função para pausar onboarding e navegar
  const handlePauseAndNavigate = (tab: string) => {
    if (onPause) onPause()
    // Tentar usar setActiveTab se disponível, senão apenas navegar
    if (setActiveTab) {
      setActiveTab(tab)
    }
    sessionStorage.setItem('onboarding_paused', 'true')
    sessionStorage.setItem('onboarding_step', currentStep.toString())
    sessionStorage.setItem('onboarding_target_tab', tab) // Salvar a aba desejada
    setTimeout(() => {
      navigate('/admin/dashboard', { replace: false })
    }, 100)
  }

  // Função para salvar turnos e custos (Passo 2)
  const handleSaveSchedule = async () => {
    if (!currentUser?.clinicId) {
      toast.error('Erro: Clínica não encontrada')
      return
    }

    if (!scheduleData.startTime || !scheduleData.endTime) {
      toast.error('Por favor, informe os horários de funcionamento')
      return
    }

    if (scheduleData.weekdays.length === 0) {
      toast.error('Por favor, selecione pelo menos um dia da semana')
      return
    }

    if (!scheduleData.monthlyCosts || parseFloat(scheduleData.monthlyCosts) <= 0) {
      toast.error('Por favor, informe o total de custos mensais')
      return
    }

    try {
      // Calcular horas trabalhadas por mês
      const start = new Date(`2000-01-01T${scheduleData.startTime}:00`)
      const end = new Date(`2000-01-01T${scheduleData.endTime}:00`)
      let diffMs = end.getTime() - start.getTime()
      if (diffMs < 0) {
        // Se o horário de fim é menor que o de início, assumir que passa da meia-noite
        diffMs = (24 * 60 * 60 * 1000) + diffMs
      }
      const hoursPerDay = diffMs / (1000 * 60 * 60)
      const daysPerMonth = scheduleData.weekdays.length * 4.33 // Aproximação: semanas no mês
      const totalHoursPerMonth = hoursPerDay * daysPerMonth

      // Calcular custo por hora
      const monthlyCostsCents = Math.round(parseFloat(scheduleData.monthlyCosts) * 100)
      const hourlyCostCents = Math.round(monthlyCostsCents / totalHoursPerMonth)

      // Salvar na tabela organizations
      const { error } = await supabase
        .from('organizations')
        .update({
          schedule_start_time: scheduleData.startTime,
          schedule_end_time: scheduleData.endTime,
          schedule_weekdays: scheduleData.weekdays,
          monthly_costs_cents: monthlyCostsCents,
          hourly_cost_cents: hourlyCostCents,
        })
        .eq('id', currentUser.clinicId)

      if (error) throw error

      setCalculatedHourlyCost((hourlyCostCents / 100).toFixed(2))
      setHasCostsConfigured(true)
      toast.success('Turnos e custos salvos! Custo por hora calculado.')
    } catch (error) {
      console.error('Erro ao salvar turnos e custos:', error)
      toast.error('Erro ao salvar. Tente novamente.')
    }
  }

  // Função para salvar meta e calcular preços/ações necessárias
  const handleSaveGoal = async () => {
    if (!currentUser?.clinicId || !monthlyGoal) {
      toast.error('Por favor, informe a meta de faturamento')
      return
    }

    try {
      const goalCents = Math.round(parseFloat(monthlyGoal) * 100)
      const goalValue = parseFloat(monthlyGoal)

      // 1. Salvar meta em organization_settings
      const { error: settingsError } = await supabase
        .from('organization_settings')
        .upsert({
          clinic_id: currentUser.clinicId,
          monthly_revenue_goal_cents: goalCents,
        })

      if (settingsError) throw settingsError

      // 2. Buscar custo por hora e serviços existentes
      const { data: org } = await supabase
        .from('organizations')
        .select('hourly_cost_cents, schedule_weekdays, schedule_start_time, schedule_end_time')
        .eq('id', currentUser.clinicId)
        .maybeSingle()

      const { data: services } = await supabase
        .from('services')
        .select('id, name, price, duration_minutes')
        .eq('clinic_id', currentUser.clinicId)
        .eq('is_active', true)

      // 3. Calcular ações necessárias
      const hourlyCost = org?.hourly_cost_cents ? org.hourly_cost_cents / 100 : 0
      const servicesList = services || []
      const avgServicePrice = servicesList.length > 0
        ? servicesList.reduce((sum, s) => sum + (s.price || 0), 0) / servicesList.length
        : 0

      // Calcular quantos serviços precisam ser vendidos
      const servicesNeeded = avgServicePrice > 0 ? Math.ceil(goalValue / avgServicePrice) : 0

      // Calcular horas necessárias (se tiver custo/hora)
      let hoursNeeded = 0
      if (hourlyCost > 0 && avgServicePrice > 0) {
        // Assumir que cada serviço gera lucro = preço - custo/hora * duração
        const avgDuration = servicesList.length > 0
          ? servicesList.reduce((sum, s) => sum + (s.duration_minutes || 60), 0) / servicesList.length
          : 60
        const profitPerService = avgServicePrice - (hourlyCost * (avgDuration / 60))
        if (profitPerService > 0) {
          hoursNeeded = Math.ceil((goalValue / profitPerService) * (avgDuration / 60))
        }
      }

      // 4. Criar registro de meta com cálculos
      const goalData = {
        clinic_id: currentUser.clinicId,
        goal_month: new Date().toISOString().slice(0, 7), // YYYY-MM
        target_revenue_cents: goalCents,
        current_revenue_cents: 0,
        services_needed: servicesNeeded,
        hours_needed: hoursNeeded,
        avg_service_price_cents: Math.round(avgServicePrice * 100),
        hourly_cost_cents: org?.hourly_cost_cents || 0,
        calculated_at: new Date().toISOString(),
      }

      // Tentar inserir em uma tabela de metas (se existir) ou salvar em organization_settings como JSON
      const { error: goalError } = await supabase
        .from('organization_settings')
        .update({
          monthly_revenue_goal_cents: goalCents,
          goal_calculations: goalData, // Salvar cálculos como JSONB
        })
        .eq('clinic_id', currentUser.clinicId)

      if (goalError) {
        console.warn('Erro ao salvar cálculos da meta:', goalError)
        // Continuar mesmo se falhar salvar cálculos
      }

      // 5. Mostrar resumo para o usuário
      const summary = []
      if (servicesNeeded > 0) {
        summary.push(`${servicesNeeded} serviços vendidos`)
      }
      if (hoursNeeded > 0) {
        summary.push(`${Math.ceil(hoursNeeded)} horas trabalhadas`)
      }
      if (avgServicePrice > 0 && avgServicePrice < goalValue / 20) {
        summary.push(`Considere aumentar o preço médio dos serviços (atual: R$ ${avgServicePrice.toFixed(2)})`)
      }

      toast.success(
        `Meta salva! Para atingir R$ ${goalValue.toFixed(2)}: ${summary.join(', ')}.`
      )
    } catch (error) {
      console.error('Erro ao salvar meta:', error)
      toast.error('Erro ao salvar meta. Tente novamente.')
    }
  }

  // Criar steps com acesso aos handlers
  const steps = createSteps(
    handlePauseAndNavigate,
    monthlyGoal,
    setMonthlyGoal,
    handleSaveGoal,
    hasCostsConfigured,
    hasServices,
    hasTeam,
    emailChecked,
    setEmailChecked,
    scheduleData,
    setScheduleData,
    handleSaveSchedule,
    calculatedHourlyCost,
    teamCount,
    teamLimit,
    setServiceModalOpen,
    setProfessionalModalOpen
  )

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
      sessionStorage.setItem('onboarding_step', (currentStep + 1).toString())
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      sessionStorage.setItem('onboarding_step', (currentStep - 1).toString())
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      const success = await markOnboardingAsSeen()
      if (success) {
        sessionStorage.removeItem('onboarding_paused')
        sessionStorage.removeItem('onboarding_step')
        toast.success('Onboarding concluído! Bem-vindo ao CLINIC FLOW!')
        
        // ✅ Aguardar um pouco para garantir que o toast seja exibido
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // ✅ Recarregar a página para garantir que o estado seja atualizado
        // Isso força o AdminPanel a re-verificar o onboarding
        window.location.href = '/admin/dashboard'
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
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-start sm:items-center justify-center p-0 sm:p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-none sm:rounded-2xl sm:rounded-3xl shadow-2xl max-w-5xl w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-h-[90vh] flex flex-col my-0 sm:my-2 sm:my-0">
        {/* Header - Ajustado para mobile */}
        <div className="border-b border-gray-200 p-4 sm:p-6 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 sm:p-3 rounded-xl">
                <Icon className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
              </div>
              <div>
                <h1 className="text-base sm:text-2xl font-bold text-gray-900">Onboarding CLINIC FLOW</h1>
                <p className="text-xs sm:text-sm text-gray-600">Passo {currentStep} de {steps.length}</p>
              </div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-1.5 sm:h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-indigo-600 h-1.5 sm:h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-3xl font-bold text-gray-900 mb-2">{currentStepData.title}</h2>
          </div>
          {currentStepData.content}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-3 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0">
          <button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl border border-gray-300 bg-white text-gray-700 font-semibold hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 order-first sm:order-none">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-2 sm:h-2 rounded-full transition ${
                  index + 1 === currentStep
                    ? 'bg-purple-600 w-6 sm:w-8'
                    : index + 1 < currentStep
                    ? 'bg-purple-300 w-2'
                    : 'bg-gray-300 w-2'
                }`}
              />
            ))}
          </div>

          {currentStep < steps.length ? (
            <button
              onClick={handleNext}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-lg flex items-center justify-center gap-2 text-sm sm:text-base"
            >
              {currentStep === 1 ? 'Vamos lá, Gaby!' : 'Próximo'}
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={isCompleting}
              className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:from-purple-700 hover:to-indigo-700 transition shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 text-sm sm:text-base"
            >
              {isCompleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finalizando...
                </>
              ) : (
                <>
                  Gaby, vamos começar!
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Modal Inline de Cadastro de Serviço */}
      {serviceModalOpen && (
        <InlineServiceModal
          currentUser={currentUser}
          hourlyCostCents={calculatedHourlyCost ? Math.round(parseFloat(calculatedHourlyCost) * 100) : 0}
          onClose={() => {
            setServiceModalOpen(false)
            // Recarregar serviços para atualizar hasServices
            if (currentUser?.clinicId) {
              supabase
                .from('services')
                .select('id')
                .eq('clinic_id', currentUser.clinicId)
                .limit(1)
                .then(({ data }) => {
                  setHasServices((data?.length || 0) > 0)
                })
            }
          }}
          onSuccess={() => {
            setHasServices(true)
            toast.success('Serviço cadastrado com sucesso!')
          }}
        />
      )}

      {/* Modal Inline de Cadastro de Profissional */}
      {professionalModalOpen && (
        <InlineProfessionalModal
          currentUser={currentUser}
          teamCount={teamCount}
          teamLimit={teamLimit}
          onClose={() => {
            setProfessionalModalOpen(false)
            // Recarregar equipe para atualizar hasTeam e teamCount
            if (currentUser?.clinicId) {
              supabase
                .from('profiles')
                .select('id, role')
                .eq('clinic_id', currentUser.clinicId)
                .in('role', ['professional', 'receptionist', 'recepcionista', 'admin', 'clinic_owner'])
                .then(({ data }) => {
                  const count = (data || []).length
                  setHasTeam(count > 2)
                  setTeamCount(Math.max(count, 2))
                })
            }
          }}
          onSuccess={() => {
            setHasTeam(true)
            setTeamCount((prev) => Math.min(prev + 1, teamLimit))
            toast.success('Profissional cadastrado com sucesso!')
          }}
        />
      )}
    </div>
  )
}

// Componente Modal Inline para Cadastro de Serviço
function InlineServiceModal({
  currentUser,
  hourlyCostCents,
  onClose,
  onSuccess,
}: {
  currentUser: any
  hourlyCostCents: number
  onClose: () => void
  onSuccess: () => void
}) {
  const { addService } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const hourlyCost = hourlyCostCents / 100
  const [formData, setFormData] = useState({
    name: '',
    duration: 60,
    supplyCost: '', // ✅ Mudado para string para permitir apagar o "0"
    tax_rate_percent: '', // ✅ Mudado para string para permitir apagar o "0"
    category: '',
    price: '', // ✅ Mudado para string para permitir apagar o "0"
  })

  // Calcular preço sugerido baseado em: custo/hora + insumo + impostos + margem
  const calculateSuggestedPrice = useMemo(() => {
    const supplyCostNum = parseFloat(formData.supplyCost.toString()) || 0
    const taxRateNum = parseFloat(formData.tax_rate_percent.toString()) || 0
    
    if (hourlyCost <= 0 && supplyCostNum <= 0) return 0

    // Custo base = (custo/hora * duração em horas) + custo de insumo
    const durationHours = formData.duration / 60
    const hourlyCostForService = hourlyCost * durationHours
    const totalCost = hourlyCostForService + supplyCostNum

    // Margem de lucro sugerida: 50% (1.5x o custo)
    const priceWithMargin = totalCost * 1.5

    // Ajustar para incluir impostos (se houver)
    // Se a taxa de imposto é X%, o preço final deve ser: preço_sugerido / (1 - X/100)
    if (taxRateNum > 0) {
      return priceWithMargin / (1 - taxRateNum / 100)
    }

    return priceWithMargin
  }, [hourlyCost, formData.duration, formData.supplyCost, formData.tax_rate_percent])

  // Atualizar preço sugerido quando os campos mudarem (apenas na primeira vez ou se o preço estiver vazio/zerado)
  useEffect(() => {
    const currentPrice = parseFloat(formData.price.toString()) || 0
    if (calculateSuggestedPrice > 0 && currentPrice === 0) {
      setFormData((prev) => ({ ...prev, price: calculateSuggestedPrice.toFixed(2) }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateSuggestedPrice])

  const handleSave = async () => {
    // ✅ Validação melhorada: verificar todos os campos necessários
    if (!currentUser?.clinicId) {
      toast.error('Erro: Clínica não encontrada')
      return
    }
    
    if (!formData.name || formData.name.trim() === '') {
      toast.error('Por favor, informe o nome do serviço')
      return
    }
    
    if (!formData.duration || formData.duration <= 0) {
      toast.error('Por favor, informe a duração do serviço')
      return
    }
    
    const priceNum = parseFloat(formData.price.toString()) || 0
    if (priceNum <= 0 || isNaN(priceNum)) {
      toast.error('Por favor, informe um preço válido para o serviço')
      return
    }

    setLoading(true)
    try {
      await addService({
        name: formData.name.trim(),
        duration: formData.duration,
        price: priceNum,
        tax_rate_percent: parseFloat(formData.tax_rate_percent.toString()) || 0,
        category: formData.category || '',
        professionalId: 'all',
      } as any)
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao salvar serviço:', err)
      toast.error('Erro ao salvar serviço')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white/95 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Cadastrar Serviço</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome do Serviço *</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Consulta Dermatológica"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Duração (min) *</label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              >
                {[15, 30, 45, 60, 75, 90, 120].map((d) => (
                  <option key={d} value={d}>
                    {d} min
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Custo de Insumo (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.supplyCost}
                onChange={(e) => setFormData({ ...formData, supplyCost: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">Custo de materiais/insumos por serviço</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">Taxa de Imposto (%)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={formData.tax_rate_percent}
                onChange={(e) => setFormData({ ...formData, tax_rate_percent: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="0"
              />
              <p className="text-xs text-gray-500 mt-1">Ex: 5% para ISS</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Categoria</label>
              <input
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="Opcional"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Preço Sugerido (R$) *</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full mt-1 px-3 py-2 border-2 border-indigo-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-indigo-50"
              />
              {calculateSuggestedPrice > 0 && (
                <div className="mt-2 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                  <p className="text-xs font-semibold text-indigo-900 mb-1">💡 Cálculo da Sugestão:</p>
                  <div className="text-xs text-indigo-700 space-y-1">
                    {hourlyCost > 0 && (
                      <p>• Custo/hora (R$ {hourlyCost.toFixed(2)}/h) × {formData.duration}min = R$ {(hourlyCost * (formData.duration / 60)).toFixed(2)}</p>
                    )}
                    {(parseFloat(formData.supplyCost.toString()) || 0) > 0 && (
                      <p>• Custo de insumo: R$ {(parseFloat(formData.supplyCost.toString()) || 0).toFixed(2)}</p>
                    )}
                    {hourlyCost > 0 || (parseFloat(formData.supplyCost.toString()) || 0) > 0 ? (
                      <>
                        <p>• Custo total: R$ {((hourlyCost * (formData.duration / 60)) + (parseFloat(formData.supplyCost.toString()) || 0)).toFixed(2)}</p>
                        <p>• Margem de lucro (50%): R$ {(((hourlyCost * (formData.duration / 60)) + (parseFloat(formData.supplyCost.toString()) || 0)) * 1.5).toFixed(2)}</p>
                        {(parseFloat(formData.tax_rate_percent.toString()) || 0) > 0 && (
                          <p>• Ajuste para impostos ({(parseFloat(formData.tax_rate_percent.toString()) || 0)}%): R$ {calculateSuggestedPrice.toFixed(2)}</p>
                        )}
                      </>
                    ) : null}
                    <p className="font-bold text-indigo-900 mt-2 text-sm">💰 Preço Final Sugerido: R$ {calculateSuggestedPrice.toFixed(2)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-medium"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !formData.name || !formData.name.trim() || (parseFloat(formData.price.toString()) || 0) <= 0}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente Modal Inline para Cadastro de Profissional
function InlineProfessionalModal({
  currentUser,
  teamCount,
  teamLimit,
  onClose,
  onSuccess,
}: {
  currentUser: any
  teamCount: number
  teamLimit: number
  onClose: () => void
  onSuccess: () => void
}) {
  const { addProfessional } = useScheduler()
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    specialty: '',
    email: '',
    password: '',
    cpf: '',
    whatsapp: '',
    commissionModel: 'commissioned' as 'commissioned' | 'rental' | 'hybrid',
    commissionRate: 30, // 30% para a clínica
  })

  const handleSave = async () => {
    if (!currentUser?.clinicId || !formData.name || !formData.specialty) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    if (teamCount >= teamLimit) {
      toast.error(`Limite de ${teamLimit} profissionais atingido`)
      return
    }

    setLoading(true)
    try {
      await addProfessional({
        id: '',
        name: formData.name,
        specialty: formData.specialty,
        avatar: '',
        color: '#6366f1',
        email: formData.email || undefined,
        password: formData.password || undefined,
        cpf: formData.cpf || undefined,
        whatsapp: formData.whatsapp || undefined,
        commissionModel: formData.commissionModel,
        commissionRate: formData.commissionRate,
      } as any)
      onSuccess()
      onClose()
    } catch (err) {
      console.error('Erro ao salvar profissional:', err)
      toast.error('Erro ao salvar profissional')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white/95 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md p-4 sm:p-6 space-y-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Cadastrar Profissional</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Nome Completo *</label>
            <input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Cargo/Especialidade *</label>
            <input
              value={formData.specialty}
              onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              placeholder="Ex: Fisioterapeuta, Recepcionista"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Senha</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700">CPF</label>
              <input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">WhatsApp</label>
              <input
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Comissionamento</label>
            <select
              value={formData.commissionModel}
              onChange={(e) => setFormData({ ...formData, commissionModel: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
            >
              <option value="commissioned">Porcentagem (%)</option>
              <option value="rental">Fixo Mensal (R$)</option>
              <option value="hybrid">Híbrido (Fixo + %)</option>
            </select>
          </div>
          {formData.commissionModel === 'commissioned' || formData.commissionModel === 'hybrid' ? (
            <div>
              <label className="text-sm font-medium text-gray-700">
                Taxa para a Clínica (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.commissionRate || ''}
                onChange={(e) => setFormData({ ...formData, commissionRate: e.target.value === '' ? 0 : Number(e.target.value) })}
                className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ex: 30 = a clínica recebe 30% e o profissional recebe 70%
              </p>
            </div>
          ) : null}
        </div>
        {teamCount >= teamLimit && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
            <p className="text-sm text-yellow-800">
              Limite de {teamLimit} profissionais atingido. Para adicionar mais, o valor é de R$ 29,90 por novo acesso.
            </p>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-medium"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !formData.name || !formData.specialty || teamCount >= teamLimit}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-medium disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
