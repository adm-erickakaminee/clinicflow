-- ============================================================================
-- 🔧 SOLUÇÃO FINAL: Permitir que políticas RLS leiam profiles
-- ============================================================================
-- PROBLEMA: A política de organizations usa:
--   EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
--
-- Mas se profiles tem RLS sem política que permita isso, a subquery falha
-- e o INSERT em organizations é bloqueado com erro 403!
--
-- SOLUÇÃO: Criar política em profiles que permite ler o próprio profile
-- ============================================================================

-- PASSO 1: Verificar se profiles tem RLS habilitado
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- PASSO 2: Ver políticas existentes de profiles
SELECT 
  policyname,
  cmd,
  LEFT(qual::text, 150) as "Condição"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- PASSO 3: Criar política que permite ler o próprio profile
-- (Necessária para que a subquery nas políticas de organizations funcione)
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- PASSO 4: Verificar se foi criada
SELECT 
  policyname,
  cmd,
  qual::text as "Condição",
  CASE 
    WHEN qual::text LIKE '%auth.uid() = id%' THEN '✅ CORRETA'
    ELSE '⚠️ VERIFICAR'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
  AND policyname = 'Users can read own profile';

-- PASSO 5: Testar se a subquery funciona agora
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  -- Testar a mesma condição que a política de organizations usa
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
  ) INTO test_result;
  
  IF test_result THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUCESSO: A subquery funciona!';
    RAISE NOTICE '✅ A política de organizations deve permitir INSERT agora!';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️ Subquery retorna FALSE. Verifique se o profile tem role = super_admin';
    RAISE WARNING 'Execute: SELECT id, role FROM profiles WHERE id = auth.uid();';
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Esta política permite que:
-- 1. Usuários leiam seu próprio profile
-- 2. A subquery na política de organizations funcione corretamente
-- 3. O INSERT em organizations seja permitido para super_admin
-- ============================================================================
