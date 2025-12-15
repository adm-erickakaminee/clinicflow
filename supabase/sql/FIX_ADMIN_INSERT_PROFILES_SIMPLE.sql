-- ============================================================================
-- CORREÇÃO SIMPLES: Permitir que Admin crie profiles na mesma clínica
-- ============================================================================

-- Remover política existente
DROP POLICY IF EXISTS "Admins can insert profiles in clinic" ON public.profiles;

-- Criar política corrigida
CREATE POLICY "Admins can insert profiles in clinic"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id IS NOT NULL
        AND p.clinic_id = profiles.clinic_id
    )
  );

-- Verificar se foi criada
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
  AND policyname = 'Admins can insert profiles in clinic';
