-- ============================================================================
-- 🔧 EXECUTE ESTE SCRIPT AGORA: Permitir super_admin criar profiles
-- ============================================================================

-- Criar política que permite super_admin inserir profiles para outros usuários
DROP POLICY IF EXISTS "Super admin can insert profiles" ON public.profiles;

CREATE POLICY "Super admin can insert profiles"
  ON public.profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Criar política que permite super_admin atualizar profiles
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

-- Verificar
SELECT 
  'Políticas criadas:' as info,
  policyname,
  cmd,
  LEFT(COALESCE(qual::text, with_check::text), 150) as "Condição"
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND policyname LIKE '%super_admin%'
ORDER BY cmd;

-- ============================================================================
-- ✅ Agora tente criar a clínica novamente!
-- ============================================================================
