-- ============================================================================
-- 🔍 VERIFICAR: Se o usuário consegue ler o próprio profile
-- ============================================================================
-- Se a tabela profiles tem RLS e não há política que permita o usuário ler
-- seu próprio profile, a política de organizations não conseguirá verificar
-- o role, causando o erro 403!
-- ============================================================================

-- Verificar se profiles tem RLS habilitado
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado (não deveria bloquear)'
  END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- Ver TODAS as políticas da tabela profiles
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual IS NOT NULL THEN LEFT(qual::text, 200)
    ELSE NULL
  END as "USING",
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check::text, 200)
    ELSE NULL
  END as "WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- Verificar se há política que permite usuário ler seu próprio profile
SELECT 
  COUNT(*) FILTER (
    WHERE cmd = 'SELECT' 
      AND (qual::text LIKE '%auth.uid()%' OR qual::text LIKE '%true%' OR qual::text IS NULL)
  ) as "Políticas SELECT que permitem ler próprio profile",
  CASE 
    WHEN COUNT(*) FILTER (
      WHERE cmd = 'SELECT' 
        AND (qual::text LIKE '%auth.uid()%' OR qual::text LIKE '%true%' OR qual::text IS NULL)
    ) > 0 
    THEN '✅ OK - Usuário pode ler seu próprio profile'
    WHEN (SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'profiles') = false
    THEN '⚠️ RLS desabilitado - não deveria bloquear'
    ELSE '❌ PROBLEMA - Usuário NÃO pode ler seu próprio profile!'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

-- ============================================================================
-- SOLUÇÃO: Se não houver política que permita ler o próprio profile,
-- crie uma política temporária:
-- ============================================================================
/*
-- Descomente se necessário:
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);
*/
