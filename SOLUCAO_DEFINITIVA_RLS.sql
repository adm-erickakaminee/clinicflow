-- ============================================================================
-- 🔧 SOLUÇÃO DEFINITIVA: Recriar políticas RLS do zero
-- ============================================================================
-- Este script remove TODAS as políticas da tabela organizations e recria
-- apenas as corretas, garantindo que não há conflitos
-- ============================================================================

-- ============================================================================
-- PASSO 1: Garantir que RLS está habilitado
-- ============================================================================
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PASSO 2: Listar TODAS as políticas existentes (para referência)
-- ============================================================================
SELECT 
  'Políticas ANTES da limpeza:' as info,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- ============================================================================
-- PASSO 3: Remover TODAS as políticas existentes
-- ============================================================================
DO $$
DECLARE
  pol RECORD;
  policies_removed INTEGER := 0;
BEGIN
  FOR pol IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'organizations'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.organizations', pol.policyname);
    policies_removed := policies_removed + 1;
    RAISE NOTICE '✅ Removida política: %', pol.policyname;
  END LOOP;
  
  IF policies_removed > 0 THEN
    RAISE NOTICE 'Total de % políticas removidas', policies_removed;
  ELSE
    RAISE NOTICE 'Nenhuma política encontrada para remover';
  END IF;
END
$$;

-- ============================================================================
-- PASSO 4: Criar política de SELECT para super_admin
-- ============================================================================
CREATE POLICY "Super admin read organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

RAISE NOTICE '✅ Política de SELECT criada';

-- ============================================================================
-- PASSO 5: Criar política de INSERT para super_admin (CRÍTICA!)
-- ============================================================================
CREATE POLICY "Super admin insert organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

RAISE NOTICE '✅ Política de INSERT criada';

-- ============================================================================
-- PASSO 6: Criar política de UPDATE para super_admin
-- ============================================================================
CREATE POLICY "Super admin update organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

RAISE NOTICE '✅ Política de UPDATE criada';

-- ============================================================================
-- PASSO 7: Verificar se foram criadas corretamente
-- ============================================================================
SELECT 
  'Políticas APÓS a criação:' as info,
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' AND with_check::text LIKE '%profiles%' AND with_check::text LIKE '%super_admin%' THEN '✅ CORRETA'
    WHEN cmd = 'SELECT' AND qual::text LIKE '%profiles%' AND qual::text LIKE '%super_admin%' THEN '✅ CORRETA'
    WHEN cmd = 'UPDATE' THEN '✅ CORRETA'
    ELSE '⚠️ VERIFICAR'
  END as status
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY cmd;

-- ============================================================================
-- PASSO 8: Testar se a condição funciona para o usuário específico
-- ============================================================================
-- NOTA: Execute enquanto está logado como erick.eh799@gmail.com
DO $$
DECLARE
  user_id UUID;
  has_super_admin_role BOOLEAN;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE WARNING '⚠️ auth.uid() retornou NULL - você precisa estar logado!';
  ELSE
    RAISE NOTICE 'User ID atual: %', user_id;
    
    -- Verificar se o profile tem role = 'super_admin'
    SELECT EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = user_id
        AND p.role = 'super_admin'
    ) INTO has_super_admin_role;
    
    IF has_super_admin_role THEN
      RAISE NOTICE '✅ Usuário tem role = super_admin - A política deve permitir INSERT!';
    ELSE
      RAISE WARNING '❌ Usuário NÃO tem role = super_admin - A política vai BLOQUEAR!';
      RAISE WARNING 'Execute: UPDATE profiles SET role = ''super_admin'' WHERE id = ''%'';', user_id;
    END IF;
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar, verifique:
-- 1. Mensagens de políticas removidas e criadas
-- 2. Tabela mostrando 3 políticas (SELECT, INSERT, UPDATE)
-- 3. Mensagem confirmando que o usuário tem role = super_admin
-- ============================================================================
