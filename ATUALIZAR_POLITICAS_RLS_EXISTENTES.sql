-- ============================================================================
-- 🔧 ATUALIZAR POLÍTICAS RLS EXISTENTES: De JWT para profiles.role
-- ============================================================================
-- Este script ATUALIZA as políticas que já existem, removendo a antiga e 
-- criando a nova que verifica profiles.role em vez de auth.jwt()->>'role'
-- ============================================================================

-- IMPORTANTE: Execute este script se você já executou o super_admin.sql antes
-- e as políticas antigas (que verificam JWT) ainda estão no banco.

-- ============================================================================
-- POLÍTICA 1: SELECT organizations
-- ============================================================================

-- Remover política antiga (se existir)
DROP POLICY IF EXISTS "Super admin read organizations" ON public.organizations;

-- Criar política CORRIGIDA
CREATE POLICY "Super admin read organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- ============================================================================
-- POLÍTICA 2: INSERT organizations (A MAIS IMPORTANTE!)
-- ============================================================================

-- Remover política antiga (se existir)
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;

-- Criar política CORRIGIDA
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

-- ============================================================================
-- POLÍTICA 3: UPDATE organizations
-- ============================================================================

-- Remover política antiga (se existir)
DROP POLICY IF EXISTS "Super admin update organizations" ON public.organizations;

-- Criar política CORRIGIDA
CREATE POLICY "Super admin update organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- ============================================================================
-- VERIFICAÇÃO: Mostrar todas as políticas da tabela organizations
-- ============================================================================

SELECT 
  policyname as "Nome da Política",
  cmd as "Operação",
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check::text, 200)
    WHEN qual IS NOT NULL THEN LEFT(qual::text, 200)
    ELSE 'Sem condição'
  END as "Condição"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY cmd, policyname;

-- ============================================================================
-- VERIFICAÇÃO ESPECÍFICA: Política de INSERT deve verificar profiles.role
-- ============================================================================

DO $$
DECLARE
  insert_policy_text TEXT;
BEGIN
  SELECT with_check::text INTO insert_policy_text
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'Super admin insert organizations'
    AND cmd = 'INSERT';
  
  IF insert_policy_text IS NULL THEN
    RAISE EXCEPTION '❌ ERRO: Política de INSERT não encontrada!';
  ELSIF insert_policy_text LIKE '%profiles%' AND insert_policy_text LIKE '%role%' THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUCESSO: Política de INSERT está CORRIGIDA!';
    RAISE NOTICE '✅ Agora verifica profiles.role corretamente';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️ ATENÇÃO: Política de INSERT ainda pode estar usando JWT. Verifique acima.';
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar, você deve ver:
-- 1. Uma tabela com todas as políticas (3 políticas para super_admin)
-- 2. Mensagem: "✅ SUCESSO: Política de INSERT está CORRIGIDA!"
-- ============================================================================
