-- ============================================================================
-- CORREÇÃO CRÍTICA: Remover recursão infinita nas políticas RLS de profiles
-- ============================================================================
-- Problema: Políticas que verificam profiles.clinic_id causam recursão infinita
-- Solução: Permitir que usuários autenticados criem seu próprio profile durante signup
--          e usar função SECURITY DEFINER para admins criarem outros profiles
-- ============================================================================

BEGIN;

-- Remover todas as políticas de INSERT existentes que causam recursão
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Política de INSERT: Usuários autenticados podem criar seu próprio profile
-- Isso permite o signup sem causar recursão (primeiro profile do usuário)
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

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
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'clinic_owner', 'super_admin');
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

-- Política de INSERT para super admin
CREATE POLICY "Super admin can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Super admin pode criar qualquer profile
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
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
