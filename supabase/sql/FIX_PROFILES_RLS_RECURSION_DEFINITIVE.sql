-- ============================================================================
-- SOLUÇÃO DEFINITIVA: Remover recursão infinita nas políticas RLS de profiles
-- ============================================================================
-- Problema: Políticas RLS que verificam profiles causam recursão infinita
--           quando um novo usuário tenta criar seu primeiro profile
-- Solução: Usar função SECURITY DEFINER para fazer INSERT bypassando RLS
--          e simplificar políticas para evitar qualquer consulta a profiles
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
-- PASSO 2: Criar função SECURITY DEFINER para inserir profile (bypassa RLS)
-- ============================================================================
-- Esta função insere apenas as colunas essenciais, deixando outras com valores padrão
-- do banco de dados (como payout_model, payout_percentage, etc.)
CREATE OR REPLACE FUNCTION public.insert_profile_safe(
  p_id uuid,
  p_full_name text,
  p_clinic_id uuid,
  p_role text,
  p_phone text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_professional_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Desabilita RLS explicitamente para evitar qualquer recursão
  -- IMPORTANTE: Esta função executa com privilégios de superusuário (SECURITY DEFINER)
  -- e desabilita RLS completamente, bypassando todas as políticas
  PERFORM set_config('row_security', 'off', true);
  
  -- Insere o profile diretamente, bypassando todas as políticas RLS
  -- Apenas colunas essenciais são inseridas; outras usam valores padrão do schema
  INSERT INTO public.profiles (
    id,
    full_name,
    clinic_id,
    role,
    phone,
    avatar_url,
    professional_id
    -- Não incluir created_at e updated_at se tiverem DEFAULT NOW()
    -- Não incluir campos opcionais que têm valores padrão (payout_model, etc.)
  )
  VALUES (
    p_id,
    p_full_name,
    p_clinic_id,
    p_role,
    p_phone,
    p_avatar_url,
    p_professional_id
  )
  ON CONFLICT (id) DO UPDATE
  SET
    full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
    clinic_id = COALESCE(EXCLUDED.clinic_id, profiles.clinic_id),
    role = COALESCE(EXCLUDED.role, profiles.role),
    phone = COALESCE(EXCLUDED.phone, profiles.phone),
    avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
    professional_id = COALESCE(EXCLUDED.professional_id, profiles.professional_id),
    updated_at = NOW();
  
  -- Reabilita RLS após a operação (boa prática)
  PERFORM set_config('row_security', 'on', true);
  
  RETURN p_id;
END;
$$;

-- ============================================================================
-- PASSO 3: Criar política SIMPLES que permite apenas inserir próprio profile
--          Esta política NÃO consulta profiles, evitando recursão
-- ============================================================================
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================================
-- PASSO 4: Criar políticas para admins usando função SECURITY DEFINER
--          (mas apenas para SELECT/UPDATE, não INSERT)
-- ============================================================================

-- Função auxiliar para verificar se usuário é admin (bypassa RLS)
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
  -- Desabilita RLS para evitar recursão
  PERFORM set_config('row_security', 'off', true);
  
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Reabilita RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN COALESCE(user_role IN ('admin', 'clinic_owner', 'super_admin'), false);
END;
$$;

-- Função auxiliar para obter clinic_id do usuário (bypassa RLS)
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
  SET LOCAL row_security = off;
  
  SELECT clinic_id INTO clinic_uuid
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN clinic_uuid;
END;
$$;

-- Política para admins inserirem outros profiles (usando função, não consulta direta)
-- NOTA: Esta política só funciona se o admin já tiver um profile
-- Para signup inicial, use a função insert_profile_safe() ou a política "Users can insert own profile"
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Permite criar próprio profile (já coberto pela política acima)
    id = auth.uid() OR
    -- Permite admin criar outros profiles (usando função que bypassa RLS)
    (
      public.is_user_admin() = true
      AND public.get_user_clinic_id() IS NOT NULL
      AND clinic_id = public.get_user_clinic_id()
    )
  );

-- Função auxiliar para verificar se usuário é super admin (bypassa RLS)
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
  -- Desabilita RLS para evitar recursão
  PERFORM set_config('row_security', 'off', true);
  
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Reabilita RLS
  PERFORM set_config('row_security', 'on', true);
  
  RETURN COALESCE(user_role = 'super_admin', false);
END;
$$;

-- Política para super admin (usando função, não consulta direta)
CREATE POLICY "Super admin can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.is_user_super_admin() = true
  );

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
-- Para signup (primeiro profile do usuário):
--   1. Use a política "Users can insert own profile" (já configurada)
--   2. OU use a função: SELECT public.insert_profile_safe(...)
--
-- Para admins criarem outros profiles:
--   1. Use a política "Admins can insert profiles in clinic" (já configurada)
--   2. OU use a função: SELECT public.insert_profile_safe(...)
--
-- A função insert_profile_safe() bypassa completamente o RLS e é a forma
-- mais segura de inserir profiles sem risco de recursão.
