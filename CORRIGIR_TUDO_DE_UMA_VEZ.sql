-- ============================================================================
-- 🔧 CORREÇÃO COMPLETA: Resolver todos os problemas de RLS de uma vez
-- ============================================================================

-- ============================================================================
-- PARTE 1: Garantir que profiles permite leitura do próprio profile
-- ============================================================================

-- Verificar se RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover política antiga se existir
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

-- Criar política que permite ler o próprio profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ============================================================================
-- PARTE 2: Verificar e garantir que o usuário tem role = 'super_admin'
-- ============================================================================

-- Ver o role atual (substitua pelo seu email ou user ID)
DO $$
DECLARE
  current_user_id UUID;
  current_role TEXT;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE WARNING '⚠️ auth.uid() é NULL - você precisa estar logado!';
  ELSE
    SELECT role INTO current_role
    FROM public.profiles
    WHERE id = current_user_id;
    
    RAISE NOTICE 'User ID: %', current_user_id;
    RAISE NOTICE 'Role atual: %', COALESCE(current_role, 'NULL (profile não encontrado)');
    
    IF current_role IS NULL THEN
      RAISE EXCEPTION '❌ Profile não encontrado para o usuário %!', current_user_id;
    ELSIF current_role != 'super_admin' THEN
      RAISE WARNING '⚠️ Role atual: % (não é super_admin)', current_role;
      RAISE WARNING 'Execute: UPDATE profiles SET role = ''super_admin'' WHERE id = ''%'';', current_user_id;
    ELSE
      RAISE NOTICE '✅ Role está correto: super_admin';
    END IF;
  END IF;
END
$$;

-- ============================================================================
-- PARTE 3: Garantir que a política de organizations está correta
-- ============================================================================

-- Remover e recriar política de INSERT (garantir que está correta)
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;

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

-- ============================================================================
-- PARTE 4: Teste final - verificar se tudo está funcionando
-- ============================================================================

DO $$
DECLARE
  test_result BOOLEAN;
  user_id UUID;
  user_role TEXT;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    RAISE EXCEPTION '❌ auth.uid() é NULL. Você precisa estar logado no Supabase!';
  END IF;
  
  -- Verificar se consegue ler o próprio profile
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  IF user_role IS NULL THEN
    RAISE EXCEPTION '❌ Não consegue ler o próprio profile! Problema com RLS de profiles.';
  END IF;
  
  -- Testar a condição da política
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'super_admin'
  ) INTO test_result;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE 'Role no profile: %', user_role;
  RAISE NOTICE 'Condição retorna: %', test_result;
  
  IF test_result THEN
    RAISE NOTICE '✅ SUCESSO: Tudo configurado corretamente!';
    RAISE NOTICE '✅ A política deve permitir INSERT agora!';
  ELSE
    RAISE WARNING '❌ A condição ainda retorna FALSE';
    RAISE WARNING 'Execute: UPDATE profiles SET role = ''super_admin'' WHERE id = ''%'';', user_id;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END
$$;

-- ============================================================================
-- ✅ FIM DO SCRIPT
-- ============================================================================
-- Este script:
-- 1. Garante que profiles permite leitura do próprio profile
-- 2. Verifica se o usuário tem role = 'super_admin'
-- 3. Recria a política de organizations
-- 4. Testa se tudo está funcionando
-- ============================================================================
