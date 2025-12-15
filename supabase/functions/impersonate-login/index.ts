// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.3'
import { z } from 'https://esm.sh/zod@3.22.4'
import { create, getNumericDate, Payload } from 'https://deno.land/x/djwt@v2.9.1/mod.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const jwtSecret = Deno.env.get('SUPABASE_JWT_SECRET')!
const supabase = createClient(supabaseUrl, serviceRole)

const schema = z.object({
  super_admin_id: z.string().uuid(),
  target_user_id: z.string().uuid(),
  target_organization_id: z.string().uuid(),
  two_fa_code: z.string().min(4),
})

async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  try {
    const body = await req.json()
    const parsed = schema.parse(body)

    // Simulação de 2FA: somente valida presença; em produção, validar código TOTP.
    if (!parsed.two_fa_code || parsed.two_fa_code.length < 4) {
      throw new Error('2FA inválido')
    }

    // Registrar auditoria antes de emitir token
    const { error: auditError } = await supabase.from('audit_logs').insert({
      super_admin_id: parsed.super_admin_id,
      target_user_id: parsed.target_user_id,
      target_organization_id: parsed.target_organization_id,
      action: 'impersonate',
    })
    if (auditError) {
      throw new Error(`Falha ao registrar auditoria: ${auditError.message}`)
    }

    const payload: Payload = {
      sub: parsed.target_user_id,
      role: 'super_admin', // mantém poder total; ajuste conforme necessidade
      impersonating: true,
      target_org: parsed.target_organization_id,
      iss: 'impersonate-login',
      exp: getNumericDate(60 * 30), // 30 min
    }

    const jwt = await create({ alg: 'HS256', typ: 'JWT' }, payload, jwtSecret)

    return new Response(JSON.stringify({ token: jwt, expires_in: 1800 }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (err: any) {
    console.error('impersonate-login error', err)
    return new Response(
      JSON.stringify({ error: err?.message || 'Erro ao gerar token' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }
}

serve(handler)


