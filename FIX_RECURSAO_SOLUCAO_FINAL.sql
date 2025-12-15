-- ============================================================
-- SOLUÇÃO DEFINITIVA: Eliminar recursão em profiles
-- ============================================================
-- Estratégia: Permitir que qualquer política RLS possa ler
-- o próprio perfil do usuário sem causar recursão
-- ============================================================

-- 1. DESABILITAR temporariamente RLS em profiles para quebrar o ciclo
-- ATENÇÃO: Isso é apenas temporário para permitir a correção
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 2. Remover TODAS as políticas antigas de profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in clinic" ON public.profiles;

-- 3. REABILITAR RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Criar políticas de SELECT que NÃO causam recursão
-- A chave é usar auth.uid() diretamente, sem subconsultas complexas

-- Política 1: Usuário pode ver seu próprio perfil (sem recursão)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Criar função helper que bypassa RLS para verificar role
-- Esta função deve ser criada ANTES das políticas que a usam
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  user_role text;
BEGIN
  -- Esta função bypassa RLS (SECURITY DEFINER)
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN COALESCE(user_role, '');
END;
$$;

-- Política 2: Super admin pode ver todos usando função helper (SEM recursão)
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;

CREATE POLICY "Super admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.get_user_role() = 'super_admin');

-- Criar função helper para clinic_id também
CREATE OR REPLACE FUNCTION public.get_user_clinic_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
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

-- Política 3: Admin pode ver perfis da mesma clínica (usando função helper)
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;

CREATE POLICY "Admins can view profiles in clinic"
  ON public.profiles
  FOR SELECT
  USING (
    -- Se for o próprio perfil, sempre permitir
    id = auth.uid()
    OR
    -- Se for admin/clinic_owner da mesma clínica
    (
      public.get_user_role() IN ('admin', 'clinic_owner')
      AND profiles.clinic_id IS NOT NULL
      AND profiles.clinic_id = public.get_user_clinic_id()
    )
  );

-- 5. Criar/Recriar políticas de INSERT
-- INSERT policies não devem ter recursão porque não leem durante inserção

-- Remover políticas de INSERT antigas
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;

-- Recriar usando função helper
CREATE POLICY "Users can insert own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Super admin can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (public.get_user_role() = 'super_admin');

CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    public.get_user_role() IN ('admin', 'clinic_owner')
    AND clinic_id IS NOT NULL
  );

-- 6. Criar/Recriar políticas de UPDATE

-- Remover políticas de UPDATE antigas
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles in clinic" ON public.profiles;

-- Recriar usando função helper
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Super admin can update all profiles"
  ON public.profiles
  FOR UPDATE
  USING (public.get_user_role() = 'super_admin');

CREATE POLICY "Admins can update profiles in clinic"
  ON public.profiles
  FOR UPDATE
  USING (
    public.get_user_role() IN ('admin', 'clinic_owner')
    AND clinic_id IS NOT NULL
  )
  WITH CHECK (
    public.get_user_role() IN ('admin', 'clinic_owner')
    AND clinic_id IS NOT NULL
  );

-- 7. Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  CASE cmd
    WHEN 'SELECT' THEN '✅ Visualizar'
    WHEN 'INSERT' THEN '✅ Criar'
    WHEN 'UPDATE' THEN '✅ Atualizar'
    WHEN 'DELETE' THEN '✅ Deletar'
  END as acao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- 8. Testar se a função helper funciona
SELECT 
  public.get_user_role() as meu_role,
  CASE 
    WHEN public.get_user_role() = 'super_admin' THEN '✅ É SUPER ADMIN'
    ELSE '⚠️ Role: ' || public.get_user_role()
  END as status;
