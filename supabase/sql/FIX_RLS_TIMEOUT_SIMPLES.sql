-- ============================================================================
-- CORREÇÃO URGENTE: Timeout nas queries de SELECT em profiles
-- ============================================================================
-- VERSÃO ULTRA-SIMPLIFICADA: Apenas política básica, sem subconsultas
-- ============================================================================

BEGIN;

-- ============================================================================
-- PASSO 1: Remover TODAS as políticas de SELECT
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow org members select profiles" ON public.profiles;

-- ============================================================================
-- PASSO 2: Criar APENAS política básica (ZERO subconsultas)
-- ============================================================================
-- Esta é a política mais simples possível: usuário vê apenas seu próprio perfil
-- Para outras funcionalidades (admin ver outros profiles), use funções RPC
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- ============================================================================
-- PASSO 3: Criar índices para performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_profiles_id ON public.profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_clinic_id ON public.profiles(clinic_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

COMMIT;

-- ============================================================================
-- VERIFICAÇÃO: Listar política criada
-- ============================================================================
SELECT 
  policyname,
  cmd,
  substring(qual::text, 1, 200) as policy_condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'SELECT'
ORDER BY policyname;

-- ============================================================================
-- NOTA IMPORTANTE:
-- ============================================================================
-- Esta política permite apenas que usuários vejam seu próprio perfil.
-- Para funcionalidades de admin (ver outros profiles da clínica), você deve:
-- 1. Usar funções RPC (SECURITY DEFINER) que bypassam RLS
-- 2. Ou criar políticas mais complexas depois que o timeout for resolvido
-- 
-- Exemplo de função RPC para admin ver profiles da clínica:
-- CREATE OR REPLACE FUNCTION get_clinic_profiles(p_clinic_id uuid)
-- RETURNS SETOF profiles
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   PERFORM set_config('row_security', 'off', true);
--   RETURN QUERY SELECT * FROM profiles WHERE clinic_id = p_clinic_id;
--   PERFORM set_config('row_security', 'on', true);
-- END;
-- $$;
