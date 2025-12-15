import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
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
} from 'lucide-react'

interface SignUpData {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  clinicName: string
  phone: string
  address: string
  cnpj: string
}

export function SignUpView() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<SignUpData>({
    email: location.state?.email || '',
    password: '',
    confirmPassword: '',
    fullName: '',
    clinicName: '',
    phone: '',
    address: '',
    cnpj: '',
  })

  const [cardData, setCardData] = useState({
    holderName: '',
    number: '',
    expiry: '',
    cvv: '',
  })

  useEffect(() => {
    // Se já tiver email no state, preencher automaticamente
    if (location.state?.email) {
      setFormData((prev) => ({ ...prev, email: location.state.email }))
    }
  }, [location.state])

  const validateStep1 = (): boolean => {
    if (!formData.email || !formData.email.includes('@')) {
      toast.error('Email inválido')
      return false
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error('Senha deve ter pelo menos 6 caracteres')
      return false
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não conferem')
      return false
    }
    if (!formData.fullName || formData.fullName.length < 3) {
      toast.error('Nome completo é obrigatório')
      return false
    }
    if (!formData.clinicName || formData.clinicName.length < 3) {
      toast.error('Nome da clínica é obrigatório')
      return false
    }
    if (!formData.phone || formData.phone.length < 10) {
      toast.error('Telefone inválido')
      return false
    }
    return true
  }

  const validateStep2 = (): boolean => {
    if (!cardData.holderName || cardData.holderName.length < 3) {
      toast.error('Nome no cartão é obrigatório')
      return false
    }
    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 13) {
      toast.error('Número do cartão inválido')
      return false
    }
    if (!cardData.expiry || !/^\d{2}\/\d{2}$/.test(cardData.expiry)) {
      toast.error('Data de validade inválida (MM/AA)')
      return false
    }
    if (!cardData.cvv || cardData.cvv.length < 3) {
      toast.error('CVV inválido')
      return false
    }
    return true
  }

  const formatCardNumber = (value: string) => {
    const cleaned = value.replace(/\s/g, '')
    const match = cleaned.match(/.{1,4}/g)
    return match ? match.join(' ') : cleaned
  }

  const formatExpiry = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    if (cleaned.length >= 2) {
      return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4)
    }
    return cleaned
  }

  const handleStep1Next = () => {
    if (validateStep1()) {
      setStep(2)
    }
  }

  const handleSignUp = async () => {
    if (!validateStep2()) return

    setLoading(true)
    try {
      // 1. Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
          },
        },
      })

      if (authError) throw authError
      if (!authData.user) throw new Error('Erro ao criar usuário')

      // 2. Criar organização
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.clinicName,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          cnpj: formData.cnpj || null,
          status: 'pending_setup',
        })
        .select()
        .single()

      if (orgError) throw orgError
      if (!orgData) throw new Error('Erro ao criar organização')

      // 3. Criar perfil do usuário
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        email: formData.email,
        full_name: formData.fullName,
        clinic_id: orgData.id,
        role: 'clinic_owner',
      })

      if (profileError) throw profileError

      // 4. Tokenizar cartão de crédito (SEGURANÇA)
      let creditCardToken: string | null = null

      try {
        // Preparar dados do cartão para tokenização
        const expiryParts = cardData.expiry.split('/')
        const expiryMonth = expiryParts[0]
        const expiryYear = expiryParts[1]

        // Extrair CEP do endereço (se disponível) - formato: "Rua, 123 - CEP 12345-678"
        const cepMatch = formData.address.match(/\d{5}-?\d{3}/)
        const postalCode = cepMatch ? cepMatch[0].replace(/-/g, '') : undefined

        // Extrair número do endereço
        const addressNumberMatch = formData.address.match(/\d+/)
        const addressNumber = addressNumberMatch ? addressNumberMatch[0] : undefined

        const { data: tokenizeData, error: tokenizeError } = await supabase.functions.invoke('tokenize-card', {
          body: {
            customer: orgData.id, // Usar clinic_id temporariamente (será atualizado quando criar customer no Asaas)
            creditCard: {
              holderName: cardData.holderName,
              number: cardData.number.replace(/\s/g, ''),
              expiryMonth: expiryMonth,
              expiryYear: expiryYear,
              ccv: cardData.cvv,
            },
            creditCardHolderInfo: {
              name: formData.fullName,
              email: formData.email,
              cpfCnpj: formData.cnpj ? formData.cnpj.replace(/\D/g, '') : undefined,
              postalCode: postalCode,
              addressNumber: addressNumber,
              phone: formData.phone.replace(/\D/g, ''),
            },
          },
        })

        if (tokenizeError) {
          console.warn('Erro ao tokenizar cartão, tentando criar assinatura sem token:', tokenizeError)
          // Continuar sem token (pode ser PIX ou erro temporário)
        } else if (tokenizeData?.creditCardToken) {
          creditCardToken = tokenizeData.creditCardToken
        }
      } catch (tokenizeErr: any) {
        console.warn('Erro ao tokenizar cartão:', tokenizeErr)
        // Continuar sem token - pode ser que o Asaas não esteja configurado para tokenização
        // Nesse caso, a assinatura será criada via PIX
      }

      // 5. Criar assinatura com trial de 7 dias (usando token se disponível)
      const { data: subscriptionData, error: subscriptionError } = await supabase.functions.invoke(
        'create-subscription',
        {
          body: {
            clinic_id: orgData.id,
            trial_days: 7,
            credit_card_token: creditCardToken, // Token tokenizado (seguro)
          },
        }
      )

      if (subscriptionError) throw subscriptionError
      if (subscriptionData?.error) throw new Error(subscriptionData.error)

      toast.success('Cadastro realizado com sucesso! Verifique seu email para confirmar.')
      
      // Aguardar um pouco antes de redirecionar
      setTimeout(() => {
        navigate('/login', {
          state: {
            message: 'Cadastro realizado! Verifique seu email para confirmar sua conta.',
          },
        })
      }, 2000)
    } catch (err: any) {
      console.error('Erro no cadastro:', err)
      toast.error(err.message || 'Erro ao realizar cadastro. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ffb3a7] via-[#ffc78f] to-[#ffe7a3] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 text-gray-700 hover:text-gray-900 mb-4 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm font-medium">Voltar</span>
          </button>
          <div className="flex items-center justify-center gap-3 mb-4">
            <img 
              src="/FAVCON.png" 
              alt="ClinicFlow" 
              className="h-12 w-12 object-contain"
            />
            <span className="text-2xl font-bold text-gray-900">ClinicFlow</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Crie sua conta</h1>
          <p className="text-gray-700">Comece seus 7 dias grátis agora mesmo</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-8">
          <div className={`flex items-center gap-2 ${step >= 1 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 1
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {step > 1 ? <CheckCircle2 className="h-5 w-5" /> : '1'}
            </div>
            <span className="text-sm font-medium hidden sm:inline">Dados da Conta</span>
          </div>
          <div className={`h-1 w-16 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          <div className={`flex items-center gap-2 ${step >= 2 ? 'text-indigo-600' : 'text-gray-400'}`}>
            <div
              className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold ${
                step >= 2
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-200 text-gray-500'
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
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Confirmar Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Digite novamente"
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nome Completo</label>
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
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nome da Clínica</label>
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
                  <label className="block text-sm font-semibold text-gray-900 mb-2">CNPJ (Opcional)</label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="00.000.000/0000-00"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Endereço</label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Endereço completo"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mt-6">
                <div className="flex items-start gap-3">
                  <Calendar className="h-6 w-6 text-indigo-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-1">7 Dias Grátis</h4>
                    <p className="text-sm text-gray-700">
                      Seu cartão será cadastrado, mas a cobrança só acontecerá após 7 dias. Você pode cancelar a
                      qualquer momento.
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
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Nome no Cartão</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={cardData.holderName}
                      onChange={(e) => setCardData({ ...cardData, holderName: e.target.value.toUpperCase() })}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="NOME COMO NO CARTÃO"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Número do Cartão</label>
                  <div className="relative">
                    <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={cardData.number}
                      onChange={(e) => {
                        const formatted = formatCardNumber(e.target.value.replace(/\D/g, ''))
                        setCardData({ ...cardData, number: formatted })
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
                    <label className="block text-sm font-semibold text-gray-900 mb-2">Validade</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                      <input
                        type="text"
                        value={cardData.expiry}
                        onChange={(e) => {
                          const formatted = formatExpiry(e.target.value)
                          setCardData({ ...cardData, expiry: formatted })
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
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 4)
                        setCardData({ ...cardData, cvv: cleaned })
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
                      Seus dados são processados de forma segura. A cobrança só acontecerá após 7 dias de teste
                      grátis.
                    </p>
                  </div>
                </div>
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
                  disabled={loading}
                  className="flex-1 px-6 py-4 rounded-xl bg-gray-900 text-white font-semibold hover:bg-gray-800 transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Finalizar Cadastro'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Ao criar sua conta, você concorda com nossos{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Termos de Uso
          </a>{' '}
          e{' '}
          <a href="#" className="text-indigo-600 hover:text-indigo-700 font-medium">
            Política de Privacidade
          </a>
        </p>
      </div>
    </div>
  )
}
