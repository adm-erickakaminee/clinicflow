-- ============================================================================
-- CORREÇÃO CRÍTICA: Remover recursão infinita nas políticas RLS de profiles
-- ============================================================================
-- Problema: Políticas que verificam profiles.clinic_id causam recursão infinita
--           quando um novo usuário tenta criar seu primeiro profile
-- Solução: Permitir que usuários autenticados criem seu próprio profile primeiro
--          e usar funções SECURITY DEFINER para admins criarem outros profiles
-- ============================================================================

BEGIN;

-- Remover todas as políticas de INSERT existentes que causam recursão
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuarios podem inserir dados em seu proprio profile" ON public.profiles;
DROP POLICY IF EXISTS "Usuários podem inserir dados em seu próprio profile" ON public.profiles;

-- Política de INSERT: Usuários autenticados podem criar seu próprio profile
-- Isso permite o signup sem causar recursão (primeiro profile do usuário)
-- IMPORTANTE: Esta política deve ser a primeira e mais permissiva para signup
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

-- Função auxiliar para verificar se usuário é admin (bypassa RLS usando SECURITY DEFINER)
-- IMPORTANTE: Desabilita RLS explicitamente para evitar recursão
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
  -- Desabilita RLS temporariamente para evitar recursão infinita
  SET LOCAL row_security = off;
  
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role IN ('admin', 'clinic_owner', 'super_admin'), false);
END;
$$;

-- Função auxiliar para obter clinic_id do usuário (bypassa RLS usando SECURITY DEFINER)
-- IMPORTANTE: Desabilita RLS explicitamente para evitar recursão
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
  -- Desabilita RLS temporariamente para evitar recursão infinita
  SET LOCAL row_security = off;
  
  SELECT clinic_id INTO clinic_uuid
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN clinic_uuid;
END;
$$;

-- Política de INSERT: Admin pode criar profiles no seu clinic_id
-- Usa as funções SECURITY DEFINER para evitar recursão
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Permite criar próprio profile (já coberto pela política acima, mas mantemos para clareza)
    id = auth.uid() OR
    -- Permite admin criar outros profiles na mesma clínica (usando função que bypassa RLS)
    (
      public.is_user_admin() = true
      AND public.get_user_clinic_id() IS NOT NULL
      AND clinic_id = public.get_user_clinic_id()
    )
  );

-- Função auxiliar para verificar se usuário é super admin (bypassa RLS usando SECURITY DEFINER)
-- IMPORTANTE: Desabilita RLS explicitamente para evitar recursão
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
  -- Desabilita RLS temporariamente para evitar recursão infinita
  SET LOCAL row_security = off;
  
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN COALESCE(user_role = 'super_admin', false);
END;
$$;

-- Política de INSERT para super admin (usando função SECURITY DEFINER)
-- Nota: Esta política só funciona se o usuário já tiver um profile como super_admin
-- Para criar o primeiro super_admin, use o Supabase Dashboard ou desabilite RLS temporariamente
CREATE POLICY "Super admin can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Super admin pode criar qualquer profile
    -- Usa função SECURITY DEFINER para evitar recursão (não consulta profiles diretamente)
    public.is_user_super_admin() = true
  );

COMMIT;

-- Verificar políticas criadas
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
