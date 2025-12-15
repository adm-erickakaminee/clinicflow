// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const apiKey = Deno.env.get('ASAAS_API_KEY')
    const baseUrl = Deno.env.get('ASAAS_BASE_URL') || 'https://api.asaas.com/v3'
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ 
          error: 'ASAAS_API_KEY não configurada',
          status: 'missing',
          message: 'Configure a variável ASAAS_API_KEY no Supabase Dashboard (Settings → Edge Functions → Secrets)'
        }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' } 
        }
      )
    }
    
    // Verificar formato da chave
    const isValidFormat = apiKey.startsWith('$aact_')
    const keyLength = apiKey.length
    const keyPreview = apiKey.substring(0, 12) + '...' + apiKey.substring(keyLength - 4)
    
    // Testar chamada à API do Asaas (endpoint simples)
    let apiTestResult = null
    try {
      const testResponse = await fetch(`${baseUrl}/myAccount`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'ClinicFlow/1.0',
          'access_token': apiKey,
        },
      })
      
      apiTestResult = {
        status: testResponse.status,
        ok: testResponse.ok,
        message: testResponse.ok ? 'API Key válida e funcionando!' : `Erro: ${testResponse.status} ${testResponse.statusText}`
      }
    } catch (apiError: any) {
      apiTestResult = {
        status: 'error',
        ok: false,
        message: apiError.message || 'Erro ao testar API'
      }
    }
    
    return new Response(
      JSON.stringify({ 
        status: 'ok',
        configured: true,
        format_valid: isValidFormat,
        key_length: keyLength,
        key_preview: keyPreview,
        base_url: baseUrl,
        api_test: apiTestResult,
        instructions: {
          configured: '✅ API KEY configurada',
          format: isValidFormat ? '✅ Formato válido' : '⚠️ Formato pode estar incorreto (deve começar com $aact_)',
          api_test: apiTestResult?.ok ? '✅ API Key válida e funcionando' : '❌ Erro ao testar API - verifique a chave'
        }
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Erro desconhecido',
        status: 'error'
      }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' } 
      }
    )
  }
})
