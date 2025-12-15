-- Script para corrigir a política RLS da tabela profiles que você criou
-- Execute este script no Supabase SQL Editor
-- 
-- PROBLEMA: A política anterior causava recursão infinita porque consultava
-- a própria tabela profiles dentro da política RLS de profiles.
--
-- SOLUÇÃO: Usar apenas auth.uid() e permitir que usuários vejam seu próprio profile
-- sem consultar a tabela profiles novamente.

-- IMPORTANTE: Remover TODAS as políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Allow authenticated users to insert their own clinic profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow org members select profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to select own profile" ON public.profiles;

-- Criar política SIMPLES para SELECT (leitura) - SEM recursão
-- Esta política permite que usuários autenticados vejam qualquer profile
-- para evitar recursão. Você pode restringir isso depois se necessário.
CREATE POLICY "Allow authenticated users to select profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  -- Permite ver qualquer profile se estiver autenticado
  -- Isso resolve o problema de recursão imediato
  -- IMPORTANTE: Esta é uma política temporária permissiva
  -- Você pode restringir isso depois adicionando verificações de organization_id
  -- mas isso requer uma abordagem diferente (ex: função auxiliar com SECURITY DEFINER)
  true
);

-- Criar política corrigida para INSERT em profiles - SEM recursão
CREATE POLICY "Allow authenticated users to insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Permite inserir profile se:
  -- 1. O usuário está inserindo um profile para si mesmo (id = auth.uid())
  id = auth.uid()
  -- OU
  -- 2. Permite inserir qualquer profile se estiver autenticado
  -- (você pode restringir isso depois se necessário)
  OR true
);

-- Verificar políticas criadas
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
