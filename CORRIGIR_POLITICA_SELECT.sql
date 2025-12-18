-- ============================================================================
-- CORRIGIR POLÍTICA DE SELECT PARA ORGANIZAÇÕES
-- ============================================================================
-- Execute este script se a organização é criada mas não pode ser buscada
-- ============================================================================

-- 1. Remover política antiga se existir
DROP POLICY IF EXISTS "Users can view own organization during signup" ON public.organizations;

-- 2. Criar política de SELECT melhorada
CREATE POLICY "Users can view own organization during signup"
  ON public.organizations
  FOR SELECT
  USING (
    -- Usuário autenticado pode ver organizações
    auth.uid() IS NOT NULL
    AND (
      -- Se não tem profile ainda, pode ver organizações criadas recentemente (últimos 10 minutos)
      -- Isso cobre o período entre criar organização e criar profile
      (
        NOT EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
        )
        AND created_at > NOW() - INTERVAL '10 minutes'
      )
      -- OU se tem profile, segue as políticas normais
      OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND (
          p.clinic_id = organizations.id
          OR p.role = 'super_admin'
        )
      )
      -- OU se o usuário acabou de criar (verificação por email ou timestamp)
      OR (
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
        AND created_at > NOW() - INTERVAL '10 minutes'
      )
    )
  );

-- 3. Verificar se a política foi criada
SELECT 
  policyname,
  cmd as command,
  qual as using_expression
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
  AND policyname = 'Users can view own organization during signup';

-- 4. Verificar se RLS está habilitado na tabela
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'organizations';

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Após executar, teste o cadastro novamente
-- ============================================================================

