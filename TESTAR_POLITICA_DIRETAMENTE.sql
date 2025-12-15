-- ============================================================================
-- 🧪 TESTE: Verificar se a política RLS está funcionando
-- ============================================================================
-- Execute este script enquanto está logado como erick.eh799@gmail.com
-- para testar se a política está realmente permitindo o INSERT
-- ============================================================================

-- Teste 1: Verificar auth.uid()
SELECT 
  auth.uid() as "User ID atual",
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ NULL - você não está logado!'
    ELSE '✅ OK - usuário autenticado'
  END as "Status";

-- Teste 2: Verificar se o profile tem role = 'super_admin'
SELECT 
  p.id,
  p.role,
  CASE 
    WHEN p.role = 'super_admin' THEN '✅ É super_admin'
    ELSE '❌ NÃO é super_admin'
  END as "Status"
FROM public.profiles p
WHERE p.id = auth.uid();

-- Teste 3: Testar a condição exata da política
SELECT 
  EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
  ) as "Política deve permitir INSERT",
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    ) THEN '✅ TRUE - INSERT deve ser permitido!'
    ELSE '❌ FALSE - INSERT será bloqueado!'
  END as "Resultado";

-- Teste 4: Tentar fazer um INSERT de teste (pode falhar se a política não estiver correta)
-- DESCOMENTE as linhas abaixo para testar:
/*
INSERT INTO public.organizations (name, phone)
VALUES ('TESTE - Apagar depois', '11999999999')
RETURNING id, name;
-- Se funcionar, delete o registro de teste:
-- DELETE FROM public.organizations WHERE name = 'TESTE - Apagar depois';
*/

-- ============================================================================
-- RESULTADO ESPERADO:
-- - Teste 1: User ID não deve ser NULL
-- - Teste 2: role deve ser 'super_admin'
-- - Teste 3: Deve retornar TRUE
-- ============================================================================
