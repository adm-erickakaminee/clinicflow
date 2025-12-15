import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export function LoginOtp() {
  const toast = useToast()
  const [phone, setPhone] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  const sendOtp = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone })
      if (error) throw error
      setOtpSent(true)
      toast.success('Código enviado via SMS/WhatsApp')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao enviar OTP'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
      if (error) throw error
      toast.success('Login realizado')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao validar OTP'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900/80 p-5 space-y-4">
        <h1 className="text-lg font-semibold">Login sem senha</h1>
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Telefone (com DDI)</label>
          <input
            className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+55XXXXXXXXXXX"
          />
        </div>
        {otpSent && (
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Código OTP</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="123456"
            />
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="default" className="flex-1" onClick={sendOtp} disabled={loading}>
            Enviar código
          </Button>
          <Button
            variant="ghost"
            className="flex-1"
            onClick={verifyOtp}
            disabled={!otpSent || loading}
          >
            Entrar
          </Button>
        </div>
      </div>
    </div>
  )
}


