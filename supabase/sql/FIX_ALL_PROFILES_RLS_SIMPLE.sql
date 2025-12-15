-- ============================================================================
-- CORREÇÃO COMPLETA SIMPLES: Todas as políticas RLS para profiles
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;

-- SELECT: Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- SELECT: Admin pode ver todos os profiles do seu clinic_id
CREATE POLICY "Admins can view profiles in clinic"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = profiles.clinic_id
    )
  );

-- SELECT: Super admin pode ver todos os profiles
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Super admin pode criar qualquer profile
CREATE POLICY "Super admin can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Admin pode criar profiles no seu clinic_id
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id IS NOT NULL
        AND p.clinic_id = profiles.clinic_id
    )
  );

-- UPDATE: Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- UPDATE: Admin pode atualizar profiles do seu clinic_id
CREATE POLICY "Admins can update profiles in clinic"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = profiles.clinic_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = profiles.clinic_id
    )
  );

-- UPDATE: Super admin pode atualizar qualquer profile
CREATE POLICY "Super admin can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd, policyname;
