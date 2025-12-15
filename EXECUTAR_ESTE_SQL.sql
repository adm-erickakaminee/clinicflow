-- ============================================================
-- SCRIPT SIMPLES: Corrigir RLS para ver clínicas
-- ============================================================
-- Copie TODO este conteúdo e cole no SQL Editor do Supabase
-- ============================================================

-- 1. Habilitar RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas
DROP POLICY IF EXISTS "Admins can view own clinic" ON public.organizations;
DROP POLICY IF EXISTS "Super admin can view all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Admins can update own clinic" ON public.organizations;
DROP POLICY IF EXISTS "Super admin can update all organizations" ON public.organizations;
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;

-- 3. Criar política para Super Admin VER todas as organizações (CRÍTICO)
CREATE POLICY "Super admin can view all organizations"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- 4. Criar política para Admin VER sua própria clínica
CREATE POLICY "Admins can view own clinic"
  ON public.organizations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = organizations.id
    )
  );

-- 5. Criar políticas de UPDATE
CREATE POLICY "Super admin can update all organizations"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

CREATE POLICY "Admins can update own clinic"
  ON public.organizations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('admin', 'clinic_owner')
        AND p.clinic_id = organizations.id
    )
  );

-- 6. Criar política de INSERT para Super Admin
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

-- 7. Verificar políticas criadas
SELECT 
  policyname,
  cmd,
  CASE cmd
    WHEN 'SELECT' THEN '✅ Visualizar'
    WHEN 'INSERT' THEN '✅ Criar'
    WHEN 'UPDATE' THEN '✅ Atualizar'
    WHEN 'DELETE' THEN '✅ Deletar'
    ELSE cmd
  END as acao
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'organizations'
ORDER BY cmd, policyname;
