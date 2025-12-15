-- ============================================================================
-- CORREÇÃO: Política RLS de INSERT para super_admin (CORRIGIDA)
-- ============================================================================
-- Este script resolve o erro: "new row violates row-level security policy"
--
-- IMPORTANTE: Verifica profiles.role em vez de auth.jwt()->>'role'
-- porque o role está na tabela profiles, não no JWT
-- ============================================================================

-- Garantir que RLS está habilitado
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir (pode estar usando JWT incorretamente)
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;

-- Criar política CORRIGIDA que verifica profiles.role
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

-- Verificar se foi criada
DO $$
BEGIN
  RAISE NOTICE '✅ Política de INSERT criada/atualizada com sucesso!';
  RAISE NOTICE '✅ Agora verifica profiles.role corretamente';
END
$$;
