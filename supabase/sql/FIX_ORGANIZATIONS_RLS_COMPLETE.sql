-- ============================================================================
-- CORREÇÃO COMPLETA: Políticas RLS para organizations
-- ============================================================================
-- Este script garante que super_admin possa ver TODAS as organizações
-- ============================================================================

-- Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes (para recriar corretamente)
DROP POLICY IF EXISTS "Admins can view own clinic" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update own clinic" ON public.organizations;
DROP POLICY IF EXISTS "Super admin can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admin can update all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;

-- SELECT: Admin pode ver sua própria clínica
CREATE POLICY "Admins can view own clinic"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = organizations.id
    )
  );

-- SELECT: Super admin pode ver TODAS as organizações (CRÍTICO)
CREATE POLICY "Super admin can view all organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- UPDATE: Admin pode atualizar sua própria clínica
CREATE POLICY "Admins can update own clinic"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = organizations.id
    )
  );

-- UPDATE: Super admin pode atualizar qualquer organização
CREATE POLICY "Super admin can update all organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- INSERT: Super admin pode criar organizações
CREATE POLICY "Super admin insert organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN 'Visualizar'
    WHEN cmd = 'INSERT' THEN 'Criar'
    WHEN cmd = 'UPDATE' THEN 'Atualizar'
    WHEN cmd = 'DELETE' THEN 'Deletar'
    ELSE cmd
  END as acao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
ORDER BY cmd, policyname;

-- Testar se o usuário atual pode ver organizações
DO $$
DECLARE
  current_user_id uuid;
  current_user_role text;
  org_count integer;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum usuário autenticado';
  ELSE
    SELECT p.role
    INTO current_user_role
    FROM public.profiles p
    WHERE p.id = current_user_id;
    
    IF current_user_role IS NULL THEN
      RAISE NOTICE '⚠️ Profile não encontrado para o usuário: %', current_user_id;
    ELSE
      RAISE NOTICE '✅ Usuário: %', current_user_id;
      RAISE NOTICE '✅ Role: %', current_user_role;
      
      -- Tentar contar organizações
      BEGIN
        SELECT COUNT(*) INTO org_count
        FROM public.organizations;
        
        IF current_user_role = 'super_admin' THEN
          RAISE NOTICE '✅ Super admin - DEVE ver TODAS as organizações';
          RAISE NOTICE '✅ Organizações encontradas: %', org_count;
        ELSIF current_user_role IN ('admin', 'clinic_owner') THEN
          RAISE NOTICE '✅ Admin - DEVE ver apenas sua própria clínica';
          RAISE NOTICE '✅ Organizações encontradas: %', org_count;
        ELSE
          RAISE NOTICE '⚠️ Role: % - Verifique as políticas', current_user_role;
        END IF;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE '❌ Erro ao contar organizações: %', SQLERRM;
        RAISE NOTICE '⚠️ Isso indica problema de permissão RLS';
      END;
    END IF;
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Execute este script para garantir que super_admin possa ver todas as clínicas
-- ============================================================================
