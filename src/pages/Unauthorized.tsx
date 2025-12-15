import { useNavigate } from 'react-router-dom'
import { AlertCircle } from 'lucide-react'

export function Unauthorized() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Não Autorizado</h1>
        <p className="text-gray-600 mb-6">
          Seu perfil não possui permissão de acesso ou não foi configurado corretamente.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => navigate('/login')}
            className="w-full px-4 py-2 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
          >
            Voltar para Login
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition"
          >
            Ir para Início
          </button>
        </div>
      </div>
    </div>
  )
}
