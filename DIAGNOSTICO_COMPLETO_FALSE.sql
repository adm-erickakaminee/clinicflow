-- ============================================================================
-- 🔍 DIAGNÓSTICO COMPLETO: Por que a condição retorna FALSE
-- ============================================================================

-- PASSO 1: Verificar auth.uid() atual
SELECT 
  auth.uid() as "User ID atual",
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NULL - Você não está logado no SQL Editor!'
    ELSE '✅ OK - Usuário autenticado'
  END as "Status";

-- PASSO 2: Verificar se o profile existe e tem o role correto
SELECT 
  u.id as "User ID",
  u.email as "Email",
  p.id as "Profile ID",
  p.role as "Role",
  CASE 
    WHEN p.id IS NULL THEN '❌ Profile não existe!'
    WHEN p.role = 'super_admin' THEN '✅ Role correto'
    ELSE '❌ Role incorreto: ' || p.role
  END as "Status"
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.id = auth.uid()
   OR u.email = 'erick.eh799@gmail.com';

-- PASSO 3: Testar se consegue ler o próprio profile (teste direto)
SELECT 
  'Teste 1: Ler próprio profile' as "Teste",
  CASE 
    WHEN EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid()) 
    THEN '✅ CONSEGUE ler'
    ELSE '❌ NÃO consegue ler (problema de RLS)'
  END as "Resultado";

-- PASSO 4: Testar a condição completa (igual à política)
SELECT 
  'Teste 2: Condição da política' as "Teste",
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
  ) as "Resultado",
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    ) THEN '✅ TRUE - Deve permitir INSERT'
    ELSE '❌ FALSE - INSERT será bloqueado'
  END as "Status";

-- PASSO 5: Ver TODAS as políticas de profiles (para ver se alguma está bloqueando)
SELECT 
  policyname,
  cmd,
  LEFT(qual::text, 200) as "USING",
  LEFT(with_check::text, 200) as "WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'profiles'
ORDER BY cmd, policyname;

-- PASSO 6: Verificar se profiles tem RLS habilitado
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';
