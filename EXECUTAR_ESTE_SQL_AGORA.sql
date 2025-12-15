-- ============================================================================
-- 🔧 SOLUÇÃO DEFINITIVA: Política RLS CORRIGIDA para super_admin
-- ============================================================================
-- PROBLEMA ENCONTRADO: A política estava verificando auth.jwt()->>'role',
-- mas o role está na tabela profiles, não no JWT!
--
-- SOLUÇÃO: Mudar para verificar profiles.role
-- ============================================================================

-- Passo 1: Garantir que RLS está habilitado
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Passo 2: Remover política antiga (que verifica JWT incorretamente)
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;

-- Passo 3: Criar política CORRIGIDA (verifica profiles.role)
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

-- Passo 4: Verificar se foi criada corretamente
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
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ SUCESSO: Política corrigida criada!';
    RAISE NOTICE '✅ Agora verifica profiles.role em vez de JWT';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
  ELSE
    RAISE EXCEPTION '❌ ERRO: Política não foi criada.';
  END IF;
END
$$;

-- Passo 5: Mostrar a política criada
SELECT 
  policyname as "Nome da Política",
  cmd as "Operação",
  LEFT(with_check::text, 300) as "Condição (deve verificar profiles.role)"
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'organizations' 
  AND policyname = 'Super admin insert organizations';

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- IMPORTANTE: Certifique-se de que seu profile tem role = 'super_admin':
-- 
-- Para verificar: SELECT id, email, role FROM profiles WHERE id = auth.uid();
-- Para atualizar: UPDATE profiles SET role = 'super_admin' WHERE id = 'SEU-USER-ID';
-- ============================================================================
