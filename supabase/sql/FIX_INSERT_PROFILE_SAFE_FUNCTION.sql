-- ============================================================================
-- CORREÇÃO: Remover TODAS as versões de insert_profile_safe e criar UMA versão definitiva
-- ============================================================================
-- Este script resolve o erro PGRST203 (múltiplas funções com mesmo nome)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Remover TODAS as versões existentes da função
-- ============================================================================
-- Remove todas as versões possíveis (com diferentes assinaturas)
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text, uuid);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text, uuid, text, integer);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text, uuid, text, integer, integer);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text, uuid, text, integer, integer, integer);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text, uuid, text, integer, integer, integer, text);
DROP FUNCTION IF EXISTS public.insert_profile_safe(uuid, text, uuid, text, text, text, uuid, text, integer, integer, integer, text, jsonb);

-- Remove usando CASCADE para garantir que todas as dependências sejam removidas
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT 
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as function_args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'insert_profile_safe'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', r.function_name, r.function_args);
  END LOOP;
END $$;

-- ============================================================================
-- PASSO 2: Criar UMA ÚNICA versão definitiva da função
-- ============================================================================
-- CORREÇÃO CRÍTICA: p_phone deve ser TEXT, não UUID!
CREATE OR REPLACE FUNCTION public.insert_profile_safe(
  p_id uuid,
  p_full_name text,
  p_clinic_id uuid,
  p_role text,
  p_phone text DEFAULT NULL,  -- ✅ CORRIGIDO: text, não uuid
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
  -- Desabilitar RLS temporariamente
  SELECT current_setting('row_security', true) INTO old_rls_setting;
  PERFORM set_config('row_security', 'off', true);
  
  -- Inserir ou atualizar o perfil
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
  
  -- Reabilitar RLS
  PERFORM set_config('row_security', COALESCE(old_rls_setting, 'on'), true);
  
  RETURN p_id;
EXCEPTION
  WHEN OTHERS THEN
    -- Reabilitar RLS mesmo em caso de erro
    PERFORM set_config('row_security', COALESCE(old_rls_setting, 'on'), true);
    RAISE;
END;
$$;

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO: Listar a função criada
-- ============================================================================
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as function_arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'insert_profile_safe';
