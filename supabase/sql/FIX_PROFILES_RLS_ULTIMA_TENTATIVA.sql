-- ============================================================================
-- SOLUÇÃO FINAL: Remover recursão infinita - Abordagem mais agressiva
-- ============================================================================
-- Esta versão desabilita temporariamente RLS na tabela durante o INSERT
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Remover TODAS as políticas de INSERT existentes
-- ============================================================================
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem inserir dados em seu proprio profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir dados em seu próprio profile" ON public.profiles;

-- ============================================================================
-- PASSO 2: Criar função SECURITY DEFINER que desabilita RLS temporariamente
-- ============================================================================
CREATE OR REPLACE FUNCTION public.insert_profile_safe(
  p_id uuid,
  p_full_name text,
  p_clinic_id uuid,
  p_role text,
  p_phone text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL,
  p_payout_model text DEFAULT NULL,
  p_payout_percentage integer DEFAULT NULL,
  p_fixed_monthly_payout_cents integer DEFAULT NULL,
  p_cpf text DEFAULT NULL,
  p_bank_account_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_rls_setting text;
BEGIN
  -- Salvar configuração atual de RLS
  SELECT current_setting('row_security', true) INTO old_rls_setting;
  
  -- Desabilita RLS completamente para esta sessão
  PERFORM set_config('row_security', 'off', true);
  
  -- Insere o profile diretamente, bypassando TODAS as políticas RLS
  -- Usa apenas colunas que existem no schema (não inclui email)
  INSERT INTO public.profiles (
    id,
    full_name,
    clinic_id,
    role,
    phone,
    avatar_url,
    professional_id,
    payout_model,
    payout_percentage,
    fixed_monthly_payout_cents,
    cpf,
    bank_account_data
  )
  VALUES (
    p_id,
    p_full_name,
    p_clinic_id,
    p_role,
    p_phone,
    p_avatar_url,
    p_professional_id,
    p_payout_model,
    p_payout_percentage,
    p_fixed_monthly_payout_cents,
    p_cpf,
    p_bank_account_data
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    clinic_id = COALESCE(EXCLUDED.clinic_id, profiles.clinic_id),
    role = COALESCE(EXCLUDED.role, profiles.role),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    professional_id = COALESCE(EXCLUDED.professional_id, profiles.professional_id),
    payout_model = COALESCE(EXCLUDED.payout_model, profiles.payout_model),
    payout_percentage = COALESCE(EXCLUDED.payout_percentage, profiles.payout_percentage),
    fixed_monthly_payout_cents = COALESCE(EXCLUDED.fixed_monthly_payout_cents, profiles.fixed_monthly_payout_cents),
    cpf = COALESCE(EXCLUDED.cpf, profiles.cpf),
    bank_account_data = COALESCE(EXCLUDED.bank_account_data, profiles.bank_account_data),
    updated_at = NOW();
  
  -- Restaurar configuração original de RLS
  PERFORM set_config('row_security', COALESCE(old_rls_setting, 'on'), true);
  
  RETURN p_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Em caso de erro, restaurar RLS antes de relançar
    PERFORM set_config('row_security', COALESCE(old_rls_setting, 'on'), true);
    RAISE;
END;
$$;

-- ============================================================================
-- PASSO 3: Criar APENAS política básica para signup (sem recursão)
-- ============================================================================
-- Esta é a única política de INSERT - muito simples, sem consultas a profiles
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PASSO 4: Para admins criarem outros profiles, usar apenas a função RPC
-- ============================================================================
-- Não criamos políticas adicionais que possam causar recursão
-- Admins devem usar a função insert_profile_safe() via RPC

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO: Listar políticas criadas
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK'
    WHEN qual IS NOT NULL THEN 'USING'
    ELSE 'N/A'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================================================
-- INSTRUÇÕES DE USO:
-- ============================================================================
-- 1. Para signup (primeiro profile):
--    - Use a função RPC: SELECT public.insert_profile_safe(...)
--    - OU use INSERT direto (a política básica permite se id = auth.uid())
--
-- 2. Para admins criarem outros profiles:
--    - Use APENAS a função RPC: SELECT public.insert_profile_safe(...)
--    - NÃO use INSERT direto (não há política que permita isso sem recursão)
--
-- Esta abordagem elimina completamente o risco de recursão porque:
-- - A função RPC desabilita RLS antes de inserir
-- - A política básica não consulta profiles (apenas verifica id = auth.uid())
-- - Não há políticas adicionais que possam causar recursão
