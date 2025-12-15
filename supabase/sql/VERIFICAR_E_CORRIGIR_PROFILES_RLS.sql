-- ============================================================================
-- VERIFICAÇÃO E CORREÇÃO COMPLETA: Políticas RLS para profiles
-- ============================================================================
-- Este script verifica e corrige todas as políticas RLS da tabela profiles
-- Resolve erro: "new row violates row-level security policy for table "profiles""
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- REMOVER TODAS AS POLÍTICAS EXISTENTES (para recriar corretamente)
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'profiles'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', r.policyname);
    RAISE NOTICE 'Removida política: %', r.policyname;
  END LOOP;
END
$$;

-- ============================================================================
-- POLÍTICAS SELECT
-- ============================================================================

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Admin pode ver todos os profiles do seu clinic_id
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

-- Super admin pode ver todos os profiles
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

-- ============================================================================
-- POLÍTICAS INSERT (CRÍTICO - ESTE É O PROBLEMA)
-- ============================================================================

-- IMPORTANTE: Super admin PRECISA estar primeiro para garantir acesso
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

-- Admin pode criar profiles no seu clinic_id
-- IMPORTANTE: profiles.clinic_id se refere ao clinic_id do registro sendo inserido
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id IS NOT NULL
        AND p.clinic_id = profiles.clinic_id  -- Verifica se o admin pertence à mesma clínica
    )
  );

-- ============================================================================
-- POLÍTICAS UPDATE
-- ============================================================================

-- Usuários podem atualizar seu próprio perfil
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin pode atualizar profiles do seu clinic_id
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

-- Super admin pode atualizar qualquer profile
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

-- ============================================================================
-- VERIFICAÇÃO FINAL
-- ============================================================================

-- Listar todas as políticas criadas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Visualizar'
    WHEN cmd = 'INSERT' THEN 'Criar'
    WHEN cmd = 'UPDATE' THEN 'Atualizar'
    WHEN cmd = 'DELETE' THEN 'Deletar'
    ELSE cmd
  END as acao,
  CASE 
    WHEN with_check LIKE '%super_admin%' THEN 'Super Admin'
    WHEN with_check LIKE '%admin%' OR with_check LIKE '%clinic_owner%' THEN 'Admin'
    WHEN with_check LIKE '%auth.uid()%' THEN 'Próprio Usuário'
    ELSE 'Outro'
  END as tipo_acesso
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Verificar usuário atual e seu role
DO $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  current_user_email text;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum usuário autenticado. Faça login primeiro.';
  ELSE
    SELECT p.role, au.email 
    INTO current_user_role, current_user_email
    FROM public.profiles p
    LEFT JOIN auth.users au ON au.id = p.id
    WHERE p.id = current_user_id;
    
    IF current_user_role IS NULL THEN
      RAISE NOTICE '⚠️ Profile não encontrado para o usuário: %', current_user_id;
      RAISE NOTICE '⚠️ Email (se disponível): %', current_user_email;
      RAISE NOTICE '⚠️ AÇÃO NECESSÁRIA: Crie um profile para este usuário primeiro!';
    ELSE
      RAISE NOTICE '✅ Usuário autenticado: %', current_user_id;
      RAISE NOTICE '✅ Email: %', current_user_email;
      RAISE NOTICE '✅ Role: %', current_user_role;
      
      IF current_user_role = 'super_admin' THEN
        RAISE NOTICE '✅ Super admin detectado - TEM permissão para criar profiles';
      ELSIF current_user_role IN ('admin', 'clinic_owner') THEN
        RAISE NOTICE '✅ Admin detectado - TEM permissão para criar profiles no seu clinic_id';
      ELSE
        RAISE NOTICE '⚠️ Role: % - NÃO tem permissão para criar profiles', current_user_role;
        RAISE NOTICE '⚠️ Apenas super_admin, admin ou clinic_owner podem criar profiles';
      END IF;
    END IF;
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Este script:
-- 1. Remove todas as políticas existentes
-- 2. Recria as políticas corretamente
-- 3. Verifica o usuário atual e suas permissões
--
-- Execute este script no Supabase SQL Editor ANTES de tentar criar profiles
-- ============================================================================
