-- ============================================================================
-- CORREÇÃO COMPLETA: Todas as políticas RLS de profiles (SELECT, INSERT, UPDATE)
-- ============================================================================
-- Este script corrige recursão infinita em TODAS as operações (SELECT, INSERT, UPDATE)
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Remover TODAS as políticas existentes (método robusto)
-- ============================================================================
-- Remove todas as políticas conhecidas
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow org members select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile - Simple" ON public.profiles;
DROP POLICY IF EXISTS "Insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;

-- Remove TODAS as políticas restantes (método dinâmico)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
  END LOOP;
END $$;

-- ============================================================================
-- PASSO 2: Criar funções SECURITY DEFINER para evitar recursão
-- ============================================================================

-- Função para verificar se usuário é admin (bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_user_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  PERFORM set_config('row_security', 'on', true);
  
  RETURN COALESCE(user_role IN ('admin', 'clinic_owner', 'super_admin'), false);
END;
$$;

-- Função para obter clinic_id do usuário (bypassa RLS)
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  clinic_uuid uuid;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
  SELECT clinic_id INTO clinic_uuid
  FROM public.profiles
  WHERE id = auth.uid();
  
  PERFORM set_config('row_security', 'on', true);
  
  RETURN clinic_uuid;
END;
$$;

-- Função para verificar se usuário é super admin (bypassa RLS)
CREATE OR REPLACE FUNCTION public.is_user_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  PERFORM set_config('row_security', 'off', true);
  
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  PERFORM set_config('row_security', 'on', true);
  
  RETURN COALESCE(user_role = 'super_admin', false);
END;
$$;

-- ============================================================================
-- PASSO 3: Criar políticas de SELECT (sem recursão)
-- ============================================================================

-- SELECT: Usuários podem ver seu próprio perfil (sem consulta a profiles)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- SELECT: Admin pode ver profiles do seu clinic_id (usando função)
CREATE POLICY "Admins can view profiles in clinic"
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid() OR
    (
      public.is_user_admin() = true
      AND public.get_user_clinic_id() IS NOT NULL
      AND clinic_id = public.get_user_clinic_id()
    )
  );

-- SELECT: Super admin pode ver todos os profiles (usando função)
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid() OR
    public.is_user_super_admin() = true
  );

-- ============================================================================
-- PASSO 4: Criar função para INSERT (bypassa RLS completamente)
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
  SELECT current_setting('row_security', true) INTO old_rls_setting;
  PERFORM set_config('row_security', 'off', true);
  
  INSERT INTO public.profiles (
    id, full_name, clinic_id, role, phone, avatar_url, professional_id,
    payout_model, payout_percentage, fixed_monthly_payout_cents, cpf, bank_account_data
  )
  VALUES (
    p_id, p_full_name, p_clinic_id, p_role, p_phone, p_avatar_url, p_professional_id,
    p_payout_model, p_payout_percentage, p_fixed_monthly_payout_cents, p_cpf, p_bank_account_data
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
  
  PERFORM set_config('row_security', COALESCE(old_rls_setting, 'on'), true);
  RETURN p_id;
EXCEPTION
  WHEN OTHERS THEN
    PERFORM set_config('row_security', COALESCE(old_rls_setting, 'on'), true);
    RAISE;
END;
$$;

-- ============================================================================
-- PASSO 5: Criar política de INSERT (apenas básica, sem recursão)
-- ============================================================================
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PASSO 6: Criar políticas de UPDATE (usando funções)
-- ============================================================================

-- UPDATE: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admin pode atualizar profiles do seu clinic_id (usando função)
CREATE POLICY "Admins can update profiles in clinic"
  ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid() OR
    (
      public.is_user_admin() = true
      AND public.get_user_clinic_id() IS NOT NULL
      AND clinic_id = public.get_user_clinic_id()
    )
  )
  WITH CHECK (
    id = auth.uid() OR
    (
      public.is_user_admin() = true
      AND public.get_user_clinic_id() IS NOT NULL
      AND clinic_id = public.get_user_clinic_id()
    )
  );

-- UPDATE: Super admin pode atualizar qualquer profile (usando função)
CREATE POLICY "Super admin can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    id = auth.uid() OR
    public.is_user_super_admin() = true
  )
  WITH CHECK (
    id = auth.uid() OR
    public.is_user_super_admin() = true
  );

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO: Listar todas as políticas criadas
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
ORDER BY cmd, policyname;
