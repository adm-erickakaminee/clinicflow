-- ============================================================================
-- 🔧 FORÇAR RECRIAÇÃO: Remover TODAS as políticas e criar apenas as corretas
-- ============================================================================
-- Este script remove TODAS as políticas da tabela organizations e recria
-- apenas as políticas corretas para super_admin
-- ============================================================================

-- PASSO 1: Garantir RLS habilitado
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes (para começar do zero)
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'organizations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
    RAISE NOTICE 'Removida política: %', pol.policyname;
  END LOOP;
END
$$;

-- PASSO 3: Criar política de SELECT para super_admin
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

-- PASSO 4: Criar política de INSERT para super_admin (A MAIS IMPORTANTE!)
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

-- PASSO 5: Criar política de UPDATE para super_admin
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

-- PASSO 6: Verificar se foram criadas corretamente
SELECT 
  policyname as "Nome",
  cmd as "Operação",
  CASE 
    WHEN cmd = 'INSERT' AND with_check::text LIKE '%profiles%' AND with_check::text LIKE '%super_admin%' THEN '✅ CORRETA'
    ELSE '⚠️ VERIFICAR'
  END as "Status",
  LEFT(with_check::text, 200) as "Condição"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
  AND policyname LIKE 'Super admin%'
ORDER BY cmd;

-- PASSO 7: Verificar se NÃO há outras políticas que possam estar bloqueando
SELECT 
  COUNT(*) as "Total de políticas na tabela",
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ OK (apenas 3 políticas do super_admin)'
    WHEN COUNT(*) > 3 THEN '⚠️ ATENÇÃO: Há mais políticas além das do super_admin'
    ELSE '❌ ERRO: Faltam políticas'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar, você deve ver:
-- 1. Mensagens "Removida política: ..." para cada política removida
-- 2. Uma tabela com 3 políticas (SELECT, INSERT, UPDATE) todas com status "✅ CORRETA"
-- 3. Uma linha mostrando "✅ OK (apenas 3 políticas do super_admin)"
-- ============================================================================
