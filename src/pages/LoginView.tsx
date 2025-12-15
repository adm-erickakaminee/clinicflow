import { useEffect, useState } from 'react'
import { Mail, Lock, Phone, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { useScheduler } from '../context/SchedulerContext'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../components/ui/Toast'

type Tab = 'pro' | 'client'

export function LoginView() {
  const { login, currentUser, sessionLoading } = useScheduler()
  const navigate = useNavigate()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('pro')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [keep, setKeep] = useState(true)
  const [showPass, setShowPass] = useState(false)

  // Função helper para determinar a rota baseada no role do usuário
  const getRouteByRole = (role: string | undefined): string => {
    switch (role) {
      case 'super_admin':
        return '/sa/dashboard'
      case 'admin':
      case 'clinic_owner':
        return '/admin/dashboard'
      case 'receptionist':
      case 'recepcionista':
        return '/reception/dashboard'
      case 'professional':
        return '/app/schedule'
      case 'client':
        return '/client/dashboard'
      default:
        return '/unauthorized'
    }
  }

  useEffect(() => {
    if (!sessionLoading && currentUser) {
      const route = (getRouteByRole(currentUser.role) || '/unauthorized').trim().replace(/\s+/g, '')
      console.log('🔄 LoginView - Redirecionando usuário baseado no role:', {
        role: currentUser.role,
        route,
        routeLength: route.length,
        userId: currentUser.id
      })
      navigate(route, { replace: true })
    }
  }, [currentUser, sessionLoading, navigate])

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Por favor, preencha email e senha')
      return
    }
    
    // Validar formato de email se for modo pro
    if (tab === 'pro' && !email.includes('@')) {
      toast.error('Por favor, insira um email válido')
      return
    }
    
    try {
      console.log('🔄 Tentando fazer login...', { email: email.substring(0, 3) + '***', mode: tab })
      await login({ email: email.trim(), password, mode: tab })
      console.log('✅ Login bem-sucedido, aguardando redirecionamento...')
      // O navigate será feito automaticamente pelo useEffect quando currentUser for definido
    } catch (error: any) {
      console.error('❌ Erro completo no login:', error)
      
      // Extrair mensagem de erro de forma mais robusta
      let errorMessage = 'Erro ao fazer login. Verifique suas credenciais.'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error?.message) {
        errorMessage = error.error.message
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast.error(errorMessage)
    }
  }

  return (
    <div className="min-h-screen relative bg-gradient-to-br from-[#ffb3a7] via-[#ffc78f] to-[#ffe7a3] flex items-center justify-center overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 -top-24 h-96 w-96 rounded-full bg-[#ff8fa3] blur-3xl opacity-70 animate-pulse" />
        <div className="absolute right-0 top-10 h-72 w-72 rounded-full bg-[#ffd27f] blur-[120px] opacity-80 animate-pulse" />
        <div className="absolute -right-28 bottom-6 h-[28rem] w-[28rem] rounded-full bg-[#ffeab5] blur-[120px] opacity-80 animate-pulse" />
        <div className="absolute left-10 bottom-10 h-64 w-64 rounded-full bg-white/50 blur-[90px] opacity-70" />
      </div>

      <div className="relative w-full max-w-4xl mx-4">
        <div className="bg-white/60 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 lg:p-10">
          {/* Logo e Nome ClinicFlow */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/40">
            <img 
              src="/FAVCON.png" 
              alt="ClinicFlow" 
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold" style={{ color: '#88B0BF' }}>
                ClinicFlow
              </p>
              <h1 className="text-2xl font-bold text-gray-900">Bem-vindo</h1>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-900">Acesso</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setTab('pro')}
                  className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-semibold transition ${
                    tab === 'pro' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-500/20' : 'bg-white/70 text-gray-800 border-white/60'
                  }`}
                >
                  Sou Profissional
                </button>
                <button
                  onClick={() => setTab('client')}
                  className={`flex-1 px-4 py-3 rounded-2xl border text-sm font-semibold transition ${
                    tab === 'client' ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-white/70 text-gray-800 border-white/60'
                  }`}
                >
                  Sou Cliente
                </button>
              </div>
              <p className="text-xs text-gray-600">Escolha o tipo de acesso para continuar.</p>
            </div>

            <div className="hidden lg:flex items-center justify-end pr-4">
              <div className="rounded-2xl bg-white/70 border border-white/60 shadow-lg px-4 py-3 text-sm text-gray-700 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Acesso seguro e rápido
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">{tab === 'pro' ? 'E-mail' : 'Celular ou E-mail'}</label>
                <div className="relative">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type={tab === 'pro' ? 'email' : 'text'}
                    placeholder={tab === 'pro' ? 'profissional@clinica.com' : 'seuemail@exemplo.com'}
                    className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 pl-10"
                  />
                  {tab === 'pro' ? (
                    <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  ) : (
                    <Phone className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-700">Senha</label>
                <div className="relative">
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    type={showPass ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="w-full rounded-xl bg-white/70 border border-white/60 px-3 py-3 text-sm text-gray-900 focus:ring-2 focus:ring-gray-900/15 pl-10 pr-10"
                  />
                  <Lock className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {tab === 'pro' && (
                <label className="inline-flex items-center gap-2 text-xs text-gray-700">
                  <input type="checkbox" checked={keep} onChange={(e) => setKeep(e.target.checked)} className="rounded border-gray-300" />
                  Manter conectado
                </label>
              )}

              {tab === 'client' && (
                <p className="text-xs text-indigo-600 font-semibold cursor-pointer hover:underline">Primeiro acesso? Cadastre-se</p>
              )}

              <button
                onClick={handleLogin}
                className={`w-full mt-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg shadow-black/10 ${
                  tab === 'pro' ? 'bg-indigo-600 text-white hover:brightness-95' : 'bg-emerald-500 text-white hover:brightness-95'
                }`}
              >
                {tab === 'pro' ? 'Acessar Painel' : 'Acessar Meu Espaço'}
              </button>
            </div>

            <div className="hidden lg:flex items-center justify-center">
              <div className="rounded-3xl bg-white/60 border border-white/40 shadow-xl p-6 space-y-3 max-w-sm text-gray-800">
                <p className="text-sm font-semibold">Diferencie os acessos</p>
                <p className="text-xs text-gray-600">
                  Profissionais entram no painel administrativo. Clientes acessam o portal de fidelidade.
                </p>
                <div className="rounded-2xl bg-white/80 border border-white/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-indigo-600">Painel</p>
                  <p className="text-xs text-gray-600">Agendamentos, financeiro, equipe.</p>
                </div>
                <div className="rounded-2xl bg-white/80 border border-white/60 p-3 space-y-2">
                  <p className="text-xs font-semibold text-emerald-600">Portal do Cliente</p>
                  <p className="text-xs text-gray-600">Fidelidade, histórico, confirmações.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

