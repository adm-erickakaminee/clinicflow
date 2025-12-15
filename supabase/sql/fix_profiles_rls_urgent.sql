-- Script URGENTE para corrigir RLS da tabela profiles que está bloqueando o login
-- Execute este script no Supabase SQL Editor IMEDIATAMENTE
-- 
-- PROBLEMA: A query está travando, provavelmente por RLS bloqueando a consulta
-- SOLUÇÃO: Criar política simples que permite usuários autenticados verem seu próprio perfil

-- 1. Remover TODAS as políticas existentes que podem estar causando problemas
DROP POLICY IF EXISTS "Allow authenticated users to select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to select own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow org members select profiles" ON public.profiles;

-- 2. Criar política SIMPLES e NÃO-RECURSIVA para SELECT
-- Permite que usuários autenticados vejam seu próprio perfil
CREATE POLICY "Read own profile - Simple"
ON public.profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

-- 3. Criar política para INSERT (permite criar perfil próprio)
CREATE POLICY "Insert own profile - Simple"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- 4. Criar política para UPDATE (permite atualizar perfil próprio)
CREATE POLICY "Update own profile - Simple"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. Verificar se RLS está habilitado
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 6. Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' 
AND tablename = 'profiles'
ORDER BY policyname;
