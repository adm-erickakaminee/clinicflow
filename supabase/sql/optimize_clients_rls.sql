-- ============================================================================
-- OTIMIZAÇÃO RLS: TABELA CLIENTS
-- ============================================================================
-- Este script otimiza as políticas RLS da tabela clients
-- removendo subqueries ineficientes e usando a função auxiliar otimizada
-- ============================================================================

BEGIN;

-- ============================================================================
-- REMOVER POLÍTICAS ANTIGAS (COM SUBQUERIES INEFICIENTES)
-- ============================================================================

DROP POLICY IF EXISTS "select clients by clinic" ON public.clients;
DROP POLICY IF EXISTS "update clients by clinic" ON public.clients;
DROP POLICY IF EXISTS "delete clients by clinic" ON public.clients;
DROP POLICY IF EXISTS "insert clients by clinic" ON public.clients;

-- Remover TODAS as políticas de clients para garantir limpeza completa
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename = 'clients'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.clients', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- CRIAR POLÍTICAS OTIMIZADAS (USANDO FUNÇÃO AUXILIAR)
-- ============================================================================

-- SELECT: Permitir leitura de clientes da mesma organização
CREATE POLICY "Allow org members select clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = clients.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

-- INSERT: Permitir criação de clientes na mesma organização
CREATE POLICY "Allow org members insert clients"
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = clients.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

-- UPDATE: Permitir atualização de clientes da mesma organização
CREATE POLICY "Allow org members update clients"
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = clients.clinic_id
        OR uoar.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = clients.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

-- DELETE: Permitir exclusão de clientes da mesma organização
CREATE POLICY "Allow org members delete clients"
  ON public.clients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_organization_and_role() uoar
      WHERE uoar.organization_id = clients.clinic_id
        OR uoar.role = 'super_admin'
    )
  );

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO PÓS-EXECUÇÃO
-- ============================================================================

-- Verificar políticas criadas
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN (qual::text LIKE '%SELECT%FROM%profiles%' OR with_check::text LIKE '%SELECT%FROM%profiles%') THEN '⚠️ SUBQUERY DETECTADA'
    WHEN (qual::text LIKE '%user_organization_and_role%' OR with_check::text LIKE '%user_organization_and_role%') THEN '✅ OTIMIZADA (função auxiliar)'
    ELSE 'VERIFICAR'
  END AS status,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'clients'
ORDER BY policyname;
