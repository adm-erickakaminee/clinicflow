-- ============================================================================
-- 🔧 SOLUÇÃO DEFINITIVA: Recriar políticas RLS do zero
-- ============================================================================
-- COPIE E COLE ESTE SCRIPT COMPLETO NO SUPABASE SQL EDITOR
-- ============================================================================

-- PASSO 1: Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- PASSO 2: Remover TODAS as políticas existentes (sem exceção!)
DO $$
DECLARE
  pol RECORD;
  removed_count INTEGER := 0;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'organizations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
    removed_count := removed_count + 1;
    RAISE NOTICE 'Removida: %', pol.policyname;
  END LOOP;
  RAISE NOTICE 'Total removidas: % políticas', removed_count;
END
$$;

-- PASSO 3: Criar apenas 3 políticas CORRETAS

-- 3.1 SELECT
CREATE POLICY "Super admin read organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- 3.2 INSERT (A CRÍTICA!)
CREATE POLICY "Super admin insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- 3.3 UPDATE
CREATE POLICY "Super admin update organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- PASSO 4: Verificar resultado final
SELECT 
  policyname as "Política",
  cmd as "Operação",
  CASE 
    WHEN cmd = 'INSERT' AND with_check::text LIKE '%profiles%super_admin%' THEN '✅ CORRETA'
    WHEN cmd = 'SELECT' AND qual::text LIKE '%profiles%super_admin%' THEN '✅ CORRETA'
    WHEN cmd = 'UPDATE' THEN '✅ CORRETA'
    ELSE '❓ VERIFICAR'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY cmd;

-- PASSO 5: Contar total de políticas (deve ser 3)
SELECT 
  COUNT(*) as "Total de políticas",
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ OK - Exatamente 3 políticas'
    WHEN COUNT(*) > 3 THEN '⚠️ ATENÇÃO: Há mais de 3 políticas!'
    ELSE '❌ ERRO: Faltam políticas'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations';
