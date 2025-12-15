-- ============================================================================
-- CORREÇÃO: Permitir que super_admin veja TODAS as organizações
-- ============================================================================
-- O problema: super_admin não consegue ver a lista de clínicas
-- Solução: Adicionar política para super_admin ver todas as organizations
-- ============================================================================

-- Habilitar RLS (garantir que está habilitado)
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Verificar políticas existentes
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
ORDER BY cmd, policyname;

-- Remover política de super_admin se existir (para recriar corretamente)
DROP POLICY IF EXISTS "Super admin can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admin full access organizations" ON public.organizations;

-- Criar política para super_admin ver TODAS as organizações
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

-- Verificar se foi criada
SELECT 
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
  AND cmd = 'SELECT'
ORDER BY policyname;

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
      RAISE NOTICE '✅ Usuário autenticado: %', current_user_id;
      RAISE NOTICE '✅ Role: %', current_user_role;
      
      -- Tentar contar organizações (para testar a política)
      SELECT COUNT(*) INTO org_count
      FROM public.organizations;
      
      IF current_user_role = 'super_admin' THEN
        RAISE NOTICE '✅ Super admin detectado';
        RAISE NOTICE '✅ Você DEVE poder ver TODAS as organizações';
        RAISE NOTICE '✅ Organizações no banco: %', org_count;
      ELSIF current_user_role IN ('admin', 'clinic_owner') THEN
        RAISE NOTICE '✅ Admin detectado';
        RAISE NOTICE '✅ Você DEVE poder ver apenas sua própria clínica';
      ELSE
        RAISE NOTICE '⚠️ Role: % - Verifique as políticas', current_user_role;
      END IF;
    END IF;
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Execute este script para garantir que super_admin possa ver todas as clínicas
-- ============================================================================
