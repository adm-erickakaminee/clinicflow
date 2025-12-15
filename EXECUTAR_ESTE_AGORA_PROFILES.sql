-- ============================================================================
-- 🔧 EXECUTE ESTE SCRIPT AGORA: Corrigir RLS de profiles
-- ============================================================================
-- Este script garante que a tabela profiles permite leitura do próprio profile,
-- o que é necessário para que a política de organizations funcione
-- ============================================================================

-- Criar política que permite ler o próprio profile
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;

CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Verificar
SELECT 
  'Política criada:' as info,
  policyname,
  cmd,
  qual::text as "Permite ler quando auth.uid() = id"
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname = 'Users can read own profile';

-- ============================================================================
-- ✅ Agora tente criar a clínica novamente!
-- ============================================================================
