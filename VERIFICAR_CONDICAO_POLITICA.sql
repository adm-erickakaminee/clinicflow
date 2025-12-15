-- ============================================================================
-- 🔍 VERIFICAR: Condição exata da política de INSERT
-- ============================================================================

-- Ver a condição WITH CHECK da política de INSERT
SELECT 
  policyname,
  cmd,
  with_check::text as "Condição WITH CHECK (deve verificar profiles.role)",
  CASE 
    WHEN with_check::text LIKE '%profiles%' 
     AND with_check::text LIKE '%super_admin%' 
     AND with_check::text LIKE '%auth.uid()%'
    THEN '✅ CORRETA - Verifica profiles.role'
    WHEN with_check::text LIKE '%jwt%'
    THEN '❌ INCORRETA - Ainda verifica JWT'
    ELSE '⚠️ VERIFICAR MANUALMENTE'
  END as "Status"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations' 
  AND cmd = 'INSERT'
  AND policyname = 'Super admin insert organizations';

-- Ver TODAS as condições das políticas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' THEN qual::text
    WHEN cmd = 'INSERT' THEN with_check::text
    WHEN cmd = 'UPDATE' THEN (qual::text || ' | WITH CHECK: ' || with_check::text)
    ELSE NULL
  END as "Condição Completa"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations'
ORDER BY cmd;
