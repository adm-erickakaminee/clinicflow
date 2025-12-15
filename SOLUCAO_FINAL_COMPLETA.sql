-- ============================================================================
-- 🔧 SOLUÇÃO FINAL COMPLETA: Corrigir tudo de uma vez
-- ============================================================================

-- ============================================================================
-- PARTE 1: Garantir que profiles permite leitura (necessário para subquery)
-- ============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas que podem estar bloqueando
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to select profiles" ON public.profiles;

-- Criar política que permite ler o próprio profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- ============================================================================
-- PARTE 2: Verificar e atualizar role para super_admin (se necessário)
-- ============================================================================

-- IMPORTANTE: Execute enquanto está logado como erick.eh799@gmail.com
-- ou substitua o email abaixo pelo seu email

DO $$
DECLARE
  user_email TEXT := 'erick.eh799@gmail.com';  -- Mude aqui se necessário
  user_id UUID;
  current_role TEXT;
BEGIN
  -- Buscar user ID pelo email
  SELECT id INTO user_id
  FROM auth.users
  WHERE email = user_email;
  
  IF user_id IS NULL THEN
    -- Tentar usar auth.uid() se estiver logado
    user_id := auth.uid();
    
    IF user_id IS NULL THEN
      RAISE EXCEPTION '❌ Usuário não encontrado. Altere o email no script ou faça login no Supabase.';
    END IF;
  END IF;
  
  -- Verificar role atual
  SELECT role INTO current_role
  FROM public.profiles
  WHERE id = user_id;
  
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE 'Role atual: %', COALESCE(current_role, 'NULL');
  
  -- Se não tem profile, criar
  IF current_role IS NULL THEN
    INSERT INTO public.profiles (id, role, clinic_id)
    VALUES (user_id, 'super_admin', NULL)
    ON CONFLICT (id) DO NOTHING;
    
    RAISE NOTICE '✅ Profile criado com role = super_admin';
  -- Se role não é super_admin, atualizar
  ELSIF current_role != 'super_admin' THEN
    UPDATE public.profiles
    SET role = 'super_admin'
    WHERE id = user_id;
    
    RAISE NOTICE '✅ Role atualizado para super_admin (era: %)', current_role;
  ELSE
    RAISE NOTICE '✅ Role já está correto: super_admin';
  END IF;
END
$$;

-- ============================================================================
-- PARTE 3: Recriar política de organizations (garantir que está correta)
-- ============================================================================

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
-- PARTE 4: TESTE FINAL
-- ============================================================================

DO $$
DECLARE
  test_result BOOLEAN;
  user_id UUID;
  user_role TEXT;
BEGIN
  user_id := auth.uid();
  
  IF user_id IS NULL THEN
    -- Tentar buscar pelo email
    SELECT id INTO user_id FROM auth.users WHERE email = 'erick.eh799@gmail.com';
    
    IF user_id IS NULL THEN
      RAISE EXCEPTION '❌ Não conseguiu identificar o usuário. Execute enquanto logado ou ajuste o email.';
    END IF;
  END IF;
  
  -- Verificar role
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = user_id;
  
  -- Testar condição
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = user_id
      AND p.role = 'super_admin'
  ) INTO test_result;
  
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'RESULTADO DO TESTE:';
  RAISE NOTICE 'User ID: %', user_id;
  RAISE NOTICE 'Role no profile: %', COALESCE(user_role, 'NULL');
  RAISE NOTICE 'Condição retorna: %', test_result;
  
  IF test_result THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ SUCESSO! Tudo configurado corretamente!';
    RAISE NOTICE '✅ A política deve permitir INSERT agora!';
    RAISE NOTICE '✅ Tente criar a clínica novamente no app!';
  ELSE
    RAISE EXCEPTION '❌ Ainda retorna FALSE. User ID: %, Role: %', user_id, user_role;
  END IF;
  
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
END
$$;
