-- ============================================================================
-- CORREÇÃO COMPLETA: Política RLS de INSERT para super_admin na tabela organizations
-- ============================================================================
-- Este script resolve o erro: "new row violates row-level security policy for table 'organizations'"
--
-- INSTRUÇÕES:
-- 1. Copie TODO este script
-- 2. Vá ao Supabase Dashboard > SQL Editor
-- 3. Cole o script completo
-- 4. Clique em "Run" ou pressione Cmd/Ctrl + Enter
-- 5. Verifique se aparece a mensagem de sucesso
-- ============================================================================

-- Passo 1: Garantir que RLS está habilitado na tabela organizations
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Passo 2: Criar a política de INSERT para super_admin
DO $$
BEGIN
  -- Verificar se a política já existe e removê-la se necessário (para garantir idempotência)
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'organizations' 
      AND policyname = 'Super admin insert organizations'
  ) THEN
    DROP POLICY "Super admin insert organizations" ON public.organizations;
    RAISE NOTICE '⚠️ Política antiga removida. Criando nova...';
  END IF;

  -- Criar a política de INSERT
  CREATE POLICY "Super admin insert organizations"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.jwt()->>'role' = 'super_admin');
  
  RAISE NOTICE '✅ Política de INSERT para super_admin criada com sucesso na tabela organizations';
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Erro ao criar política: %', SQLERRM;
    RAISE;
END
$$;

-- Passo 3: Verificar se a política foi criada corretamente
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'organizations' 
    AND policyname = 'Super admin insert organizations';
  
  IF policy_count > 0 THEN
    RAISE NOTICE '✅ VERIFICAÇÃO: Política encontrada no banco de dados!';
  ELSE
    RAISE WARNING '⚠️ VERIFICAÇÃO: Política NÃO encontrada. Algo deu errado.';
  END IF;
END
$$;

-- Passo 4: Mostrar todas as políticas da tabela organizations (para debug)
SELECT 
  policyname as "Nome da Política",
  cmd as "Operação",
  CASE 
    WHEN qual IS NOT NULL THEN 'USING: ' || qual::text
    ELSE ''
  END || CASE 
    WHEN with_check IS NOT NULL THEN ' | WITH CHECK: ' || with_check::text
    ELSE ''
  END as "Condição"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY policyname;
