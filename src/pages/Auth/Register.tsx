import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { ToastContainer, useToast } from '../../components/ui/Toast'

interface RegisterProps {
  onSwitchToLogin?: () => void
}

export function Register({ onSwitchToLogin }: RegisterProps) {
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSignUp = async () => {
    if (!email || !password) {
      toast.error('Preencha email e senha')
      return
    }
    if (password !== confirm) {
      toast.error('As senhas não conferem')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      toast.success('Cadastro realizado! Verifique seu email.')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao cadastrar')
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
              <h1 className="auth-title">Crie sua conta</h1>
            </div>
          </div>
          <p className="auth-subtitle" style={{ color: '#C8D9E1' }}>
            Acesso rápido e seguro com email e senha. Depois você pode usar OTP se preferir.
          </p>
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
                Cadastro
              </p>
              <h2 className="auth-title" style={{ fontSize: '22px' }}>
                Crie sua conta
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

          <div className="space-y-2">
            <label className="auth-label">Confirmar senha</label>
            <input
              type="password"
              className="auth-input"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button className="auth-btn primary" onClick={handleSignUp} disabled={loading}>
            Criar conta
          </button>

          <div className="flex items-center justify-between text-sm" style={{ color: '#C8D9E1' }}>
            <span>Já tem conta?</span>
            <button
              className="text-[#F2B544] font-semibold"
              style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
              onClick={onSwitchToLogin}
            >
              Entrar
            </button>
          </div>

          <p className="auth-footer">Ao continuar, você concorda com os termos e política de privacidade.</p>
        </div>
      </div>

      <ToastContainer toasts={toast.toasts} onClose={toast.removeToast} />
    </div>
  )
}


