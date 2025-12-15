-- ============================================================================
-- CORREÇÃO CRÍTICA: Permitir que super_admin crie profiles
-- ============================================================================
-- Este script corrige o erro 42501 ao tentar criar profiles
-- Erro: "new row violates row-level security policy for table "profiles""
-- ============================================================================

-- Verificar políticas existentes
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Remover políticas conflitantes ou incorretas
DROP POLICY IF EXISTS "Super admin can insert any profile" ON public.profiles;
DROP POLICY IF EXISTS "Super admin insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;

-- Criar política para super_admin (CORRIGIDA)
-- IMPORTANTE: Usa EXISTS para verificar o role no profiles, não no JWT
CREATE POLICY "Super admin can insert any profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Criar política para admin criar profiles no seu clinic_id
-- IMPORTANTE: profiles.clinic_id se refere ao clinic_id do registro sendo inserido
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id IS NOT NULL
        AND p.clinic_id = profiles.clinic_id  -- Verifica se o admin pertence à mesma clínica
    )
  );

-- Verificar se foram criadas
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;

-- Testar se o usuário atual pode inserir
DO $$
DECLARE
  current_user_id uuid;
  current_user_role text;
BEGIN
  SELECT auth.uid() INTO current_user_id;
  
  IF current_user_id IS NULL THEN
    RAISE NOTICE '⚠️ Nenhum usuário autenticado';
  ELSE
    SELECT role INTO current_user_role
    FROM public.profiles
    WHERE id = current_user_id;
    
    IF current_user_role IS NULL THEN
      RAISE NOTICE '⚠️ Profile não encontrado para o usuário: %', current_user_id;
    ELSE
      RAISE NOTICE '✅ Usuário autenticado: %', current_user_id;
      RAISE NOTICE '✅ Role: %', current_user_role;
      
      IF current_user_role = 'super_admin' THEN
        RAISE NOTICE '✅ Super admin detectado - deve ter permissão para criar profiles';
      ELSIF current_user_role IN ('admin', 'clinic_owner') THEN
        RAISE NOTICE '✅ Admin detectado - deve ter permissão para criar profiles no seu clinic_id';
      ELSE
        RAISE NOTICE '⚠️ Role não tem permissão para criar profiles: %', current_user_role;
      END IF;
    END IF;
  END IF;
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Execute este script no Supabase SQL Editor
-- Depois, tente criar o administrador novamente
-- ============================================================================
