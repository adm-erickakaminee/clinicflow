-- ============================================================================
-- 🔧 PROBLEMA IDENTIFICADO: Tabela profiles pode estar bloqueando a verificação
-- ============================================================================
-- A política de organizations verifica: EXISTS (SELECT 1 FROM profiles WHERE ...)
-- Mas se profiles tem RLS e não há política que permita essa verificação,
-- a subquery falha e o INSERT é bloqueado!
-- ============================================================================

-- ============================================================================
-- PASSO 1: Verificar se profiles tem RLS habilitado
-- ============================================================================
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- ============================================================================
-- PASSO 2: Ver TODAS as políticas da tabela profiles
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN LEFT(qual::text, 150)
    ELSE NULL
  END as "USING",
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check::text, 150)
    ELSE NULL
  END as "WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- ============================================================================
-- PASSO 3: Criar política que permite verificar o próprio profile
-- ============================================================================
-- Esta política permite que a subquery na política de organizations funcione
-- Ela permite que qualquer usuário autenticado leia seu próprio profile

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can read own profile for RLS checks" ON public.profiles;

-- Criar política que permite ler o próprio profile
CREATE POLICY "Users can read own profile for RLS checks"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ============================================================================
-- PASSO 4: Verificar se foi criada
-- ============================================================================
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%auth.uid() = id%' THEN '✅ CORRETA'
    ELSE '⚠️ VERIFICAR'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND policyname = 'Users can read own profile for RLS checks';

-- ============================================================================
-- PASSO 5: Testar se a condição funciona
-- ============================================================================
-- Execute enquanto está logado como erick.eh799@gmail.com
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
  ) INTO test_result;
  
  IF test_result THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUCESSO: A condição funciona!';
    RAISE NOTICE '✅ A política de organizations deve permitir INSERT agora';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️ A condição retorna FALSE. Verifique se o profile tem role = super_admin';
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Esta política permite que a subquery na política de organizations consiga
-- verificar o role do usuário. Sem ela, a subquery falha e o INSERT é bloqueado.
-- ============================================================================
