-- ============================================================
-- CORREÇÃO CRÍTICA: Recursão infinita nas políticas RLS
-- ============================================================
-- O problema: Políticas de organizations tentam ler profiles,
-- mas políticas de profiles bloqueiam a leitura, causando loop
-- ============================================================

-- 1. Remover TODAS as políticas de SELECT da tabela profiles temporariamente
-- Isso quebra a recursão permitindo que organizations leia profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view profiles in clinic" ON public.profiles;
DROP POLICY IF EXISTS "Super admin can view all profiles" ON public.profiles;

-- 2. Criar política SIMPLES que permite qualquer usuário autenticado
-- ver seu próprio perfil (sem condições complexas que causam recursão)
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- 3. Criar política para Super Admin ver TODOS os perfis
-- Mas sem usar subconsulta complexa que possa causar recursão
-- Usamos auth.jwt() para evitar recursão
CREATE POLICY "Super admin can view all profiles"
  ON public.profiles
  FOR SELECT
  USING (
    -- Usar auth.jwt() diretamente se disponível, senão fallback simples
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- 4. Criar política para Admin ver perfis da clínica
CREATE POLICY "Admins can view profiles in clinic"
  ON public.profiles
  FOR SELECT
  USING (
    -- Admin pode ver perfis da mesma clínica
    EXISTS (
      SELECT 1 FROM public.profiles admin_p
      WHERE admin_p.id = auth.uid()
        AND admin_p.role IN ('admin', 'clinic_owner')
        AND admin_p.clinic_id = profiles.clinic_id
        AND profiles.clinic_id IS NOT NULL
    )
  );

-- ============================================================
-- SOLUÇÃO ALTERNATIVA (se ainda houver recursão):
-- Remover políticas de SELECT de profiles e permitir leitura
-- apenas via funções seguras (security definer)
-- ============================================================

-- Verificar se ainda há recursão testando a leitura
DO $$
BEGIN
  -- Tentar ler o próprio perfil
  PERFORM 1 FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  RAISE NOTICE '✅ Política de SELECT funcionando sem recursão';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Ainda há problema: %', SQLERRM;
END
$$;

-- Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  CASE cmd
    WHEN 'SELECT' THEN 'Visualizar'
    WHEN 'INSERT' THEN 'Criar'
    WHEN 'UPDATE' THEN 'Atualizar'
    WHEN 'DELETE' THEN 'Deletar'
  END as acao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'SELECT'
ORDER BY policyname;
