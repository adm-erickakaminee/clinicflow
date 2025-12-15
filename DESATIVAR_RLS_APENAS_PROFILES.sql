-- =====================================================
-- 🔧  DESATIVAR RLS APENAS EM PROFILES
-- =====================================================
-- Script mais seguro: desativa RLS apenas na tabela profiles
-- para editar dados de usuários sem afetar outras tabelas.
-- =====================================================

BEGIN;

-- Desativar RLS apenas em profiles
ALTER TABLE IF EXISTS public.profiles DISABLE ROW LEVEL SECURITY;

-- Verificar status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'profiles';

COMMIT;

-- =====================================================
-- ✅ RLS DESATIVADO APENAS EM PROFILES
-- =====================================================
-- Agora você pode editar dados na tabela profiles sem restrições.
-- Para reativar, execute: ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- =====================================================



