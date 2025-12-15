-- ============================================================
-- CORREÇÃO URGENTE: Recursão infinita em profiles
-- ============================================================
-- Execute este script IMEDIATAMENTE no Supabase SQL Editor
-- ============================================================

-- 1. Criar função helper que bypassa RLS para verificar role
-- Esta função usa SECURITY DEFINER para evitar recursão
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

-- 2. Remover TODAS as políticas de SELECT que causam recursão
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;

-- 3. Criar políticas de SELECT usando a função helper (SEM recursão)

-- Política 1: Usuário vê seu próprio perfil (sem recursão)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Política 2: Super admin vê todos (usando função, sem recursão)
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (public.get_user_role() = 'super_admin');

-- Política 3: Admin vê perfis da mesma clínica
-- Precisamos pegar o clinic_id do admin primeiro, então usamos função também
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

-- 4. Atualizar políticas de INSERT/UPDATE para usar função helper também

-- Remover políticas de INSERT antigas
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

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
    AND clinic_id = public.get_user_clinic_id()
  );

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
    id = auth.uid()
    OR
    (
      public.get_user_role() IN ('admin', 'clinic_owner')
      AND profiles.clinic_id IS NOT NULL
      AND profiles.clinic_id = public.get_user_clinic_id()
    )
  )
  WITH CHECK (
    id = auth.uid()
    OR
    (
      public.get_user_role() IN ('admin', 'clinic_owner')
      AND profiles.clinic_id IS NOT NULL
      AND profiles.clinic_id = public.get_user_clinic_id()
    )
  );

-- 5. Verificar se funcionou
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

-- 6. Testar função helper
SELECT 
  public.get_user_role() as meu_role,
  public.get_user_clinic_id() as meu_clinic_id;
