-- ============================================================================
-- 🔍 DIAGNÓSTICO COMPLETO: Verificar por que a política RLS não está funcionando
-- ============================================================================

-- ============================================================================
-- PASSO 1: Verificar se RLS está habilitado
-- ============================================================================
SELECT 
  tablename,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Habilitado'
    ELSE '❌ RLS Desabilitado'
  END as "Status RLS"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- ============================================================================
-- PASSO 2: Ver TODAS as políticas da tabela organizations
-- ============================================================================
SELECT 
  policyname as "Nome",
  cmd as "Operação",
  CASE 
    WHEN qual IS NOT NULL THEN LEFT(qual::text, 150)
    ELSE NULL
  END as "USING (SELECT)",
  CASE 
    WHEN with_check IS NOT NULL THEN LEFT(with_check::text, 200)
    ELSE NULL
  END as "WITH CHECK (INSERT)",
  CASE
    WHEN cmd = 'INSERT' AND with_check::text LIKE '%profiles%' AND with_check::text LIKE '%super_admin%' THEN '✅ CORRETA'
    WHEN cmd = 'INSERT' AND with_check::text LIKE '%jwt%' THEN '❌ ANTIGA (verifica JWT)'
    WHEN cmd = 'INSERT' THEN '⚠️ VERIFICAR'
    ELSE ''
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY cmd, policyname;

-- ============================================================================
-- PASSO 3: Verificar se o usuário específico existe e tem o role correto
-- ============================================================================
SELECT 
  u.id as "User ID",
  u.email as "Email",
  p.role as "Role no Profile",
  p.clinic_id as "Clinic ID",
  CASE 
    WHEN p.role = 'super_admin' THEN '✅ É super_admin'
    ELSE '❌ NÃO é super_admin'
  END as "Status"
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'erick.eh799@gmail.com'
   OR u.id = '75a52773-0ce0-4878-b977-e18e9a0ef1d5';

-- ============================================================================
-- PASSO 4: Testar se a política está realmente funcionando
-- ============================================================================
-- NOTA: Este passo simula o que a política deveria fazer
-- Execute enquanto está logado como o usuário em questão
SELECT 
  auth.uid() as "auth.uid() atual",
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
  ) as "Deve permitir INSERT (true = sim, false = não)";

-- ============================================================================
-- PASSO 5: Verificar se há políticas conflitantes ou que bloqueiam
-- ============================================================================
SELECT 
  COUNT(*) as "Total de políticas",
  COUNT(*) FILTER (WHERE cmd = 'INSERT') as "Políticas INSERT",
  COUNT(*) FILTER (WHERE cmd = 'SELECT') as "Políticas SELECT",
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') as "Políticas UPDATE",
  COUNT(*) FILTER (WHERE cmd = 'DELETE') as "Políticas DELETE"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations';

-- ============================================================================
-- PASSO 6: Verificar se há alguma política que bloqueia tudo
-- ============================================================================
-- Se houver uma política que bloqueia INSERT para todos, ela pode estar 
-- sobrescrevendo a política do super_admin
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN qual::text LIKE '%false%' OR with_check::text LIKE '%false%' THEN '⚠️ BLOQUEIA TUDO'
    ELSE '✅ OK'
  END as "Atenção"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
  AND (qual::text LIKE '%false%' OR with_check::text LIKE '%false%');
