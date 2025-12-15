import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ToastContainer, useToast } from '../../components/ui/Toast'

interface LoginProps {
  onSwitchToRegister?: () => void
}

export function Login({ onSwitchToRegister }: LoginProps) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) toast.success('Sessão ativa')
    })
  }, [toast])

  const handleLogin = async () => {
    if (!email || !password) {
      toast.error('Preencha email e senha')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      toast.success('Login realizado')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao entrar'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-grid">
        <div className="auth-side">
          <div className="flex items-center gap-3">
            <img 
              src="/FAVCON.png" 
              alt="ClinicFlow" 
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: '#88B0BF' }}>
                ClinicFlow
              </p>
              <h1 className="auth-title">Login com email</h1>
            </div>
          </div>
          <div className="space-y-3">
            <p className="auth-subtitle" style={{ color: '#C8D9E1' }}>
              Acesse seu painel com email e senha. Segurança com RLS.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase" style={{ color: '#88B0BF' }}>
                  Status
                </p>
                <p className="font-semibold">Online</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase" style={{ color: '#88B0BF' }}>
                  Proteção
                </p>
                <p className="font-semibold">RLS + Email</p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="h-2 w-10 rounded-full" style={{ background: '#F2B544' }} />
            <span className="h-2 w-10 rounded-full" style={{ background: '#88B0BF' }} />
            <span className="h-2 w-10 rounded-full" style={{ background: '#D96B0B' }} />
          </div>
        </div>

        <div className="auth-card space-y-6">
          <div className="flex items-center gap-3">
            <img 
              src="/FAVCON.png" 
              alt="ClinicFlow" 
              className="h-12 w-12 object-contain"
            />
            <div>
              <p className="text-xs uppercase tracking-wide" style={{ color: '#88B0BF' }}>
                Bem-vindo
              </p>
              <h2 className="auth-title" style={{ fontSize: '22px' }}>
                Entre com email e senha
              </h2>
            </div>
          </div>

          <div className="space-y-2">
            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
            />
          </div>

          <div className="space-y-2">
            <label className="auth-label">Senha</label>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="auth-btn primary" onClick={handleLogin} disabled={loading}>
            Entrar
          </button>

          <div className="flex items-center justify-between text-sm" style={{ color: '#C8D9E1' }}>
            <span>Não tem conta?</span>
            <button
              className="text-[#F2B544] font-semibold"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={onSwitchToRegister}
            >
              Criar conta
            </button>
          </div>

          <p className="auth-footer">
            Ao continuar, você concorda com os termos e política de privacidade. Protegido com RLS.
          </p>
        </div>
      </div>

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  )
}


