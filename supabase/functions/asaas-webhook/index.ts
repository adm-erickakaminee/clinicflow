// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'

/**
 * Valida variáveis de ambiente obrigatórias
 * Retorna erro 500 com mensagem clara se alguma estiver faltando
 */
function validateEnvVars(): { supabaseUrl: string; supabaseKey: string; webhookSecret: string | undefined } {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = Deno.env.get('ASAAS_WEBHOOK_SECRET') // Opcional

  const missing: string[] = []
  if (!supabaseUrl) missing.push('SUPABASE_URL')
  if (!supabaseKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')

  if (missing.length > 0) {
    const errorMessage = `❌ Variáveis de ambiente não configuradas: ${missing.join(', ')}\n\n` +
      `Configure no Supabase Dashboard:\n` +
      `1. Vá em Settings → Edge Functions → Secrets\n` +
      `2. Adicione as variáveis: ${missing.join(', ')}\n` +
      `3. Marque para Production, Preview e Development\n\n` +
      `Consulte: DOCS/arquivo/URGENTE_CONFIGURAR_VARIAVEIS.md`
    throw new Error(errorMessage)
  }

  return { supabaseUrl, supabaseKey, webhookSecret }
}

interface AsaasWebhookEvent {
  event: string
  payment?: {
    id: string
    status: string
    value: number
    walletId?: string
  }
  account?: {
    id: string
    walletId?: string
    status: 'pending' | 'approved' | 'rejected'
    cpfCnpj?: string
  }
  data?: any
}

async function handler(req: Request): Promise<Response> {
  try {
    // Validar variáveis de ambiente
    const { supabaseUrl, supabaseKey, webhookSecret } = validateEnvVars()
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verificar assinatura do webhook (se configurado)
    const signature = req.headers.get('asaas-signature')
    if (webhookSecret && signature) {
      // TODO: Implementar verificação de assinatura HMAC
      // Por enquanto, apenas logamos
      console.log('Webhook signature:', signature)
    }

    const event: AsaasWebhookEvent = await req.json()
    console.log('Webhook recebido:', event.event, event)

    // Processar diferentes tipos de eventos
    switch (event.event) {
      case 'PAYMENT_RECEIVED':
      case 'PAYMENT_CONFIRMED':
        // Processar pagamento de assinatura
        if (event.payment) {
          const { id: paymentId, status, value, customer } = event.payment
          
          // Buscar organização pela subscription_id ou payment_id
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id, status, subscription_plan_id, asaas_subscription_id')
            .or(`asaas_subscription_id.eq.${paymentId},id.eq.${paymentId}`)
            .maybeSingle()

          if (!orgError && org) {
            // Se o pagamento foi confirmado e a org está pending_setup ou suspended
            if (status === 'CONFIRMED' && (org.status === 'pending_setup' || org.status === 'suspended')) {
              // Atualizar status para active e armazenar customer_id se disponível
              const updateData: any = {
                status: 'active',
                updated_at: new Date().toISOString(),
              }
              if (customer) {
                updateData.asaas_customer_id = customer // ✅ Armazenar customer_id do webhook
              }
              
              const { error: updateError } = await supabase
                .from('organizations')
                .update(updateData)
                .eq('id', org.id)

              if (updateError) {
                console.error('Erro ao ativar organização:', updateError)
              } else {
                console.log(`✅ Organização ${org.id} ativada após pagamento confirmado`)
              }
            }
            
            // ✅ Também atualizar financial_transactions se o payment_id corresponder
            // Buscar transação que ainda não tem payment_id mas pode ser deste pagamento
            if (paymentId) {
              // Tentar atualizar transações recentes da organização que ainda não têm payment_id
              const { error: updateTxError } = await supabase
                .from('financial_transactions')
                .update({
                  asaas_payment_id: paymentId,
                  asaas_customer_id: customer || null,
                  status: status.toLowerCase(),
                  updated_at: new Date().toISOString(),
                })
                .eq('clinic_id', org.id)
                .is('asaas_payment_id', null)
                .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Últimas 24h
                .limit(1) // Apenas uma transação por vez
              
              if (updateTxError) {
                console.error('Erro ao atualizar transação financeira:', updateTxError)
              } else {
                console.log(`✅ Transação financeira atualizada com payment_id: ${paymentId}`)
              }
            }
          }
        }
        break

      case 'PAYMENT_OVERDUE':
      case 'PAYMENT_DELETED':
        // Suspender organização se pagamento falhou
        if (event.payment) {
          const { id: paymentId } = event.payment
          
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .or(`asaas_subscription_id.eq.${paymentId},id.eq.${paymentId}`)
            .maybeSingle()

          if (!orgError && org) {
            const { error: updateError } = await supabase
              .from('organizations')
              .update({
                status: 'suspended',
                updated_at: new Date().toISOString(),
              })
              .eq('id', org.id)

            if (updateError) {
              console.error('Erro ao suspender organização:', updateError)
            } else {
              console.log(`⚠️ Organização ${org.id} suspensa devido a pagamento falho`)
            }
          }
        }
        break

      case 'ACCOUNT_CREATED':
      case 'ACCOUNT_APPROVED':
      case 'ACCOUNT_REJECTED':
        // Eventos de conta/subconta Asaas
        if (event.account) {
          const { walletId, status, cpfCnpj } = event.account
          
          if (!walletId) {
            console.warn('Webhook sem walletId')
            break
          }

          // Buscar organização ou perfil pelo walletId
          // Primeiro, tentar em organizations
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .select('id')
            .eq('asaas_wallet_id', walletId)
            .maybeSingle()

          if (!orgError && org) {
            // Atualizar status KYC da organização
            const kycStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'in_review'
            const { error: updateError } = await supabase
              .from('organizations')
              .update({
                kyc_status: kycStatus,
                updated_at: new Date().toISOString(),
              })
              .eq('id', org.id)

            if (updateError) {
              console.error('Erro ao atualizar organização:', updateError)
            } else {
              console.log(`✅ Status KYC da organização ${org.id} atualizado para ${kycStatus}`)
            }
          } else {
            // Tentar em profiles
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('id')
              .eq('asaas_wallet_id', walletId)
              .maybeSingle()

            if (!profileError && profile) {
              // Atualizar status KYC do perfil
              const kycStatus = status === 'approved' ? 'approved' : status === 'rejected' ? 'rejected' : 'in_review'
              const { error: updateError } = await supabase
                .from('profiles')
                .update({
                  kyc_status: kycStatus,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', profile.id)

              if (updateError) {
                console.error('Erro ao atualizar perfil:', updateError)
              } else {
                console.log(`✅ Status KYC do perfil ${profile.id} atualizado para ${kycStatus}`)
              }
            } else {
              console.warn(`⚠️ Wallet ID ${walletId} não encontrado em organizations nem profiles`)
            }
          }
        }
        break

      default:
        console.log('Evento não processado:', event.event)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Webhook processado' }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'Erro ao processar webhook',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    )
  }
}

serve(handler)
