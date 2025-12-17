import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useToast } from '../components/ui/Toast'
import { TermsOfService } from '../components/TermsOfService'
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
  // ✅ Campos de endereço separados (obrigatórios para Asaas)
  postalCode: string // CEP
  address: string // Rua/Logradouro
  addressNumber: string // Número
  complement: string // Complemento (opcional)
  province: string // Bairro
  city: string // Cidade
  state: string // Estado (UF)
  cnpj: string
}

export function SignUpView() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()

  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [formData, setFormData] = useState<SignUpData>({
    email: location.state?.email || '',
    password: '',
    confirmPassword: '',
    fullName: '',
    clinicName: '',
    phone: '',
    // ✅ Campos de endereço separados
    postalCode: '',
    address: '',
    addressNumber: '',
    complement: '',
    province: '',
    city: '',
    state: '',
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

  // Função para validar CPF/CNPJ
  const validateCpfCnpj = (value: string): boolean => {
    const cleaned = value.replace(/\D/g, '')
    // CPF tem 11 dígitos, CNPJ tem 14
    return cleaned.length === 11 || cleaned.length === 14
  }

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
    // CPF/CNPJ agora é OBRIGATÓRIO para tokenização no Asaas
    if (!formData.cnpj || !validateCpfCnpj(formData.cnpj)) {
      toast.error('CPF ou CNPJ é obrigatório e deve ser válido (11 ou 14 dígitos)')
      return false
    }
    // ✅ Validar campos de endereço obrigatórios para Asaas
    if (!formData.postalCode || formData.postalCode.replace(/\D/g, '').length !== 8) {
      toast.error('CEP é obrigatório e deve ter 8 dígitos')
      return false
    }
    if (!formData.address || formData.address.length < 3) {
      toast.error('Endereço (rua/logradouro) é obrigatório')
      return false
    }
    if (!formData.addressNumber || formData.addressNumber.length < 1) {
      toast.error('Número do endereço é obrigatório')
      return false
    }
    if (!formData.province || formData.province.length < 2) {
      toast.error('Bairro é obrigatório')
      return false
    }
    if (!formData.city || formData.city.length < 2) {
      toast.error('Cidade é obrigatória')
      return false
    }
    if (!formData.state || formData.state.length !== 2) {
      toast.error('Estado (UF) é obrigatório e deve ter 2 caracteres')
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
    
    if (!termsAccepted) {
      toast.error('Você precisa aceitar o Termo de Adesão para continuar')
      return
    }

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

      // 2. Criar organização com endereço completo (formato JSON para compatibilidade)
      const addressData = {
        postalCode: formData.postalCode.replace(/\D/g, ''),
        address: formData.address,
        addressNumber: formData.addressNumber,
        complement: formData.complement || '',
        province: formData.province,
        city: formData.city,
        state: formData.state.toUpperCase(),
      }
      
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.clinicName,
          email: formData.email,
          phone: formData.phone,
          address: JSON.stringify(addressData), // ✅ Endereço completo em JSON
          cnpj: formData.cnpj || null,
          status: 'pending_setup',
        })
        .select()
        .single()

      if (orgError) throw orgError
      if (!orgData) throw new Error('Erro ao criar organização')

      // 3. Criar perfil do usuário usando função segura que bypassa RLS
      // Nota: O email está em auth.users, não em profiles
      // Usamos a função insert_profile_safe() para evitar recursão infinita nas políticas RLS
      const { data: profileResult, error: profileError } = await supabase.rpc(
        'insert_profile_safe',
        {
          p_id: authData.user.id,
          p_full_name: formData.fullName,
          p_clinic_id: orgData.id,
          p_role: 'admin', // Admin é o role padrão para o dono da clínica
          p_phone: formData.phone || null,
          p_avatar_url: null,
          p_professional_id: null,
        }
      )

      if (profileError) {
        console.error('Erro ao criar perfil via função RPC:', {
          error: profileError,
          message: profileError.message,
          code: profileError.code,
          details: profileError.details,
          hint: profileError.hint,
        })
        
        // Se a função não existir, informar que precisa executar o script SQL
        if (
          profileError.message?.includes('function') || 
          profileError.message?.includes('does not exist') ||
          profileError.code === '42883'
        ) {
          throw new Error(
            'Função insert_profile_safe() não encontrada. ' +
            'Execute o script SQL FIX_PROFILES_RLS_ULTIMA_TENTATIVA.sql no Supabase para criar a função.'
          )
        }
        
        // Se o erro for relacionado a recursão, a função deveria ter evitado isso
        if (profileError.message?.includes('recursion') || profileError.code === '42P17') {
          throw new Error(
            'Erro de recursão detectado mesmo usando função segura. ' +
            'Verifique se a função insert_profile_safe() foi criada corretamente no banco de dados. ' +
            'Erro: ' + profileError.message
          )
        }
        
        // Outros erros
        throw new Error(
          'Erro ao criar perfil: ' + (profileError.message || 'Erro desconhecido') +
          '. Verifique se a função insert_profile_safe() existe no banco de dados.'
        )
      }
      
      // Verificar se o profile foi criado (a função retorna o ID)
      if (!profileResult) {
        // Se a função não retornou nada, verificar se o profile existe
        const { data: checkProfile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', authData.user.id)
          .maybeSingle()
        
        if (!checkProfile) {
          throw new Error('Perfil não foi criado. Tente novamente.')
        }
      }

      // 3.5. Criar registro na tabela professionals para a dona da clínica
      // Isso permite que ela apareça na lista de profissionais e receba agendamentos
      try {
        const { data: professionalData, error: professionalError } = await supabase
          .from('professionals')
          .insert({
            clinic_id: orgData.id,
            name: formData.fullName,
            role: 'Proprietária', // ou outro role apropriado
            color: '#6366f1', // Cor padrão
            commission_rate: 0, // Dona não paga comissão
            avatar_url: null,
          })
          .select()
          .single()

        if (professionalError) {
          console.warn('Aviso: Não foi possível criar registro em professionals:', professionalError)
          // Não falhar o cadastro se não conseguir criar o professional
        } else if (professionalData) {
          // Atualizar o profile com o professional_id
          const { error: updateProfileError } = await supabase
            .from('profiles')
            .update({ professional_id: professionalData.id })
            .eq('id', authData.user.id)

          if (updateProfileError) {
            console.warn('Aviso: Não foi possível atualizar profile com professional_id:', updateProfileError)
          }
        }
      } catch (error) {
        console.warn('Aviso: Erro ao criar professional para admin:', error)
        // Não falhar o cadastro se houver erro
      }

      // 4. Tokenizar cartão de crédito (SEGURANÇA)
      let creditCardToken: string | null = null

      try {
        // Preparar dados do cartão para tokenização
        const expiryParts = cardData.expiry.split('/')
        const expiryMonth = expiryParts[0]?.trim() || ''
        let expiryYear = expiryParts[1]?.trim() || ''
        
        // Converter ano de 2 dígitos para 4 dígitos (ex: "28" -> "2028")
        if (expiryYear.length === 2) {
          const currentYear = new Date().getFullYear()
          const currentCentury = Math.floor(currentYear / 100) * 100
          const yearValue = parseInt(expiryYear, 10)
          expiryYear = String(currentCentury + yearValue)
        }

        // ✅ Usar campos de endereço separados (já coletados no formulário)
        const postalCode = formData.postalCode.replace(/\D/g, '')
        const addressNumber = formData.addressNumber

        // Validar que todos os campos obrigatórios estão presentes antes de enviar
        if (!orgData?.id) {
          throw new Error('ID da organização não encontrado')
        }
        if (!cardData.holderName || !cardData.number || !cardData.expiry || !cardData.cvv) {
          throw new Error('Dados do cartão incompletos')
        }
        if (!formData.fullName || !formData.email || !formData.phone) {
          throw new Error('Dados pessoais incompletos')
        }

        // ✅ Preparar body com todos os campos obrigatórios do Asaas
        const cpfCnpjCleaned = String(formData.cnpj).replace(/\D/g, '')
        
        const tokenizeBody: any = {
          customer: String(orgData.id), // Garantir que é string
          creditCard: {
            holderName: String(cardData.holderName).trim(),
            number: String(cardData.number).replace(/\s/g, ''),
            expiryMonth: String(expiryMonth).trim(),
            expiryYear: String(expiryYear).trim(),
            ccv: String(cardData.cvv).trim(),
          },
          creditCardHolderInfo: {
            name: String(formData.fullName).trim(),
            email: String(formData.email).trim(),
            phone: String(formData.phone).replace(/\D/g, '').trim(),
            cpfCnpj: cpfCnpjCleaned, // ✅ OBRIGATÓRIO - sempre presente após validação
            postalCode: String(postalCode), // ✅ OBRIGATÓRIO
            address: String(formData.address).trim(), // ✅ Rua/Logradouro
            addressNumber: String(addressNumber), // ✅ OBRIGATÓRIO
            complement: String(formData.complement || '').trim(), // Opcional
            province: String(formData.province).trim(), // ✅ Bairro
            city: String(formData.city).trim(), // ✅ Cidade
            state: String(formData.state).trim(), // ✅ Estado/UF
          },
        }
        
        console.log('📋 Dados completos preparados para tokenização:', {
          cpfCnpj: cpfCnpjCleaned,
          postalCode,
          addressNumber,
          hasAllRequiredFields: !!(tokenizeBody.creditCardHolderInfo.cpfCnpj && 
                                   tokenizeBody.creditCardHolderInfo.postalCode && 
                                   tokenizeBody.creditCardHolderInfo.addressNumber),
        })

        console.log('📤 Enviando dados para tokenize-card:', JSON.stringify(tokenizeBody, null, 2))
        console.log('🔍 Verificação CPF/CNPJ no payload:', {
          hasCpfCnpj: !!tokenizeBody.creditCardHolderInfo.cpfCnpj,
          cpfCnpj: tokenizeBody.creditCardHolderInfo.cpfCnpj,
          cpfCnpjLength: tokenizeBody.creditCardHolderInfo.cpfCnpj?.length,
        })

        const { data: tokenizeData, error: tokenizeError } = await supabase.functions.invoke('tokenize-card', {
          body: tokenizeBody,
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
      
      // Mensagem de erro mais detalhada para ajudar no debug
      let errorMessage = err.message || 'Erro ao realizar cadastro. Tente novamente.'
      
      // Se o erro for relacionado a email no profile, dar mensagem específica
      if (err.message?.includes('email') || err.code === '42703') {
        errorMessage = 'Erro de configuração do banco de dados. Entre em contato com o suporte.'
        console.error('Erro relacionado a email no profile:', {
          message: err.message,
          code: err.code,
          details: err.details,
          hint: err.hint,
        })
      }
      
      // Se o erro for de rate limiting, informar ao usuário
      if (err.message?.includes('segundos') || err.message?.includes('segurança')) {
        errorMessage = 'Aguarde alguns segundos antes de tentar novamente. Isso é uma medida de segurança.'
      }
      
      toast.error(errorMessage)
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
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    CPF ou CNPJ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.cnpj}
                    onChange={(e) => {
                      // Formatar CPF/CNPJ automaticamente
                      const cleaned = e.target.value.replace(/\D/g, '')
                      let formatted = cleaned
                      
                      if (cleaned.length <= 11) {
                        // Formatar como CPF: 000.000.000-00
                        formatted = cleaned.replace(/(\d{3})(\d)/, '$1.$2')
                        formatted = formatted.replace(/(\d{3})(\d)/, '$1.$2')
                        formatted = formatted.replace(/(\d{3})(\d{1,2})$/, '$1-$2')
                      } else {
                        // Formatar como CNPJ: 00.000.000/0000-00
                        formatted = cleaned.replace(/^(\d{2})(\d)/, '$1.$2')
                        formatted = formatted.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
                        formatted = formatted.replace(/\.(\d{3})(\d)/, '.$1/$2')
                        formatted = formatted.replace(/(\d{4})(\d)/, '$1-$2')
                      }
                      
                      setFormData({ ...formData, cnpj: formatted })
                    }}
                    placeholder="000.000.000-00 ou 00.000.000/0000-00"
                    maxLength={18}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* ✅ Campos de endereço separados (obrigatórios para Asaas) */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    CEP <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={formData.postalCode}
                      onChange={(e) => {
                        const cleaned = e.target.value.replace(/\D/g, '').slice(0, 8)
                        const formatted = cleaned.replace(/^(\d{5})(\d)/, '$1-$2')
                        setFormData({ ...formData, postalCode: formatted })
                      }}
                      className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="00000-000"
                      maxLength={9}
                      required
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Rua/Logradouro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nome da rua, avenida, etc."
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Número <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.addressNumber}
                    onChange={(e) => setFormData({ ...formData, addressNumber: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="123"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">Complemento</label>
                  <input
                    type="text"
                    value={formData.complement}
                    onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Apto, Bloco, etc. (opcional)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Bairro <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.province}
                    onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nome do bairro"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Cidade <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Nome da cidade"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Estado (UF) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value.toUpperCase().slice(0, 2) })}
                    className="w-full px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
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

              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                    required
                  />
                  <label htmlFor="terms" className="text-sm text-gray-700 flex-1 cursor-pointer">
                    Li e aceito o{' '}
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="text-indigo-600 hover:text-indigo-700 font-medium underline"
                    >
                      Termo de Adesão e Condições de Uso
                    </button>
                    {' '}do CLINIC FLOW
                  </label>
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
                    disabled={loading || !termsAccepted}
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
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-600 mt-6">
          Ao criar sua conta, você concorda com nosso{' '}
          <button
            type="button"
            onClick={() => setTermsOpen(true)}
            className="text-indigo-600 hover:text-indigo-700 font-medium underline"
          >
            Termo de Adesão e Condições de Uso
          </button>
        </p>

        <TermsOfService open={termsOpen} onOpenChange={setTermsOpen} />
      </div>
    </div>
  )
}
