-- ============================================================================
-- 🔧 CORREÇÃO: Permitir que super_admin crie profiles para outros usuários
-- ============================================================================
-- PROBLEMA: A política atual só permite criar o próprio profile (id = auth.uid())
-- Mas o super_admin precisa criar profiles para os administradores das clínicas
-- ============================================================================

-- Verificar políticas atuais de INSERT
SELECT 
  policyname,
  cmd,
  with_check::text as "WITH CHECK"
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'INSERT'
ORDER BY policyname;

-- ============================================================================
-- SOLUÇÃO: Criar política que permite super_admin criar qualquer profile
-- ============================================================================

-- Remover política antiga (se existir)
DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;

-- Criar política para super_admin inserir profiles
CREATE POLICY "Super admin can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    -- Permite se o usuário é super_admin
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Criar política para super_admin atualizar profiles
DROP POLICY IF EXISTS "Super admin can update profiles" ON public.profiles;

CREATE POLICY "Super admin can update profiles"
  ON public.profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- ============================================================================
-- IMPORTANTE: Manter a política existente para usuários criarem seu próprio profile
-- (por exemplo, durante o signup normal)
-- ============================================================================

-- Se a política "Allow authenticated users to insert profiles" já existe,
-- ela deve permitir que usuários criem seu próprio profile.
-- Se não existe, criar:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' 
      AND policyname = 'Allow authenticated users to insert profiles'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert profiles"
      ON public.profiles
      FOR INSERT
      TO authenticated
      WITH CHECK (id = auth.uid());
  END IF;
END
$$;

-- ============================================================================
-- Verificar políticas finais
-- ============================================================================
SELECT 
  policyname,
  cmd,
  LEFT(COALESCE(qual::text, with_check::text), 200) as "Condição"
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd IN ('INSERT', 'UPDATE')
  AND policyname LIKE '%super_admin%'
ORDER BY cmd, policyname;

-- ============================================================================
-- TESTE: Verificar se a condição funciona
-- ============================================================================
DO $$
DECLARE
  test_result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
  ) INTO test_result;
  
  IF test_result THEN
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '✅ Política criada com sucesso!';
    RAISE NOTICE '✅ Super admin pode criar profiles para outros usuários agora';
    RAISE NOTICE '═══════════════════════════════════════════════════════════';
    RAISE NOTICE '';
  ELSE
    RAISE WARNING '⚠️ Verifique se você está logado como super_admin';
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Agora o super_admin pode:
-- 1. Criar profiles para outros usuários (necessário para provisionar clínicas)
-- 2. E os usuários normais ainda podem criar seu próprio profile (durante signup)
-- ============================================================================
