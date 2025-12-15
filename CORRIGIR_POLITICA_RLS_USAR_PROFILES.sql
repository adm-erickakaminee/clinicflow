-- ============================================================================
-- 🔧 CORREÇÃO CRÍTICA: Política RLS deve verificar profiles.role, não JWT
-- ============================================================================
-- PROBLEMA: A política está verificando auth.jwt()->>'role', mas o role está
-- na tabela profiles, não no JWT do Supabase Auth.
-- 
-- SOLUÇÃO: Mudar a política para verificar profiles.role
-- ============================================================================

-- Passo 1: Remover política antiga (que verifica JWT)
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;

-- Passo 2: Criar política CORRIGIDA (que verifica profiles.role)
CREATE POLICY "Super admin insert organizations"
  ON public.organizations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Passo 3: Verificar se foi criada corretamente
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'organizations' 
      AND policyname = 'Super admin insert organizations'
  ) INTO policy_exists;
  
  IF policy_exists THEN
    RAISE NOTICE '✅ SUCESSO: Política corrigida criada!';
    RAISE NOTICE '✅ Agora verifica profiles.role em vez de JWT';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Política não foi criada.';
  END IF;
END
$$;

-- Passo 4: Mostrar a política criada
SELECT 
  policyname as "Nome da Política",
  cmd as "Operação",
  LEFT(with_check::text, 200) as "Condição WITH CHECK"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations' 
  AND policyname = 'Super admin insert organizations';

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Esta política agora verifica se o usuário tem role = 'super_admin' na 
-- tabela profiles, que é onde o role realmente está armazenado.
-- ============================================================================
