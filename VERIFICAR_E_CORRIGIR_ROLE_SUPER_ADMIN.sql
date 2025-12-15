-- ============================================================================
-- 🔍 VERIFICAR E CORRIGIR: Role do usuário atual
-- ============================================================================
-- Este script verifica se seu usuário tem role 'super_admin' e corrige se necessário
-- ============================================================================

-- Passo 1: Ver o usuário atual e seu role
SELECT 
  u.id as "User ID",
  u.email as "Email",
  p.role as "Role no Profile",
  p.full_name as "Nome"
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = auth.email()  -- Usa o email do usuário logado
   OR u.id = auth.uid();       -- Ou o ID do usuário logado

-- Passo 2: Se não encontrar, mostrar TODOS os usuários (para você encontrar o seu)
SELECT 
  u.id as "User ID",
  u.email as "Email",
  p.role as "Role no Profile",
  p.full_name as "Nome",
  CASE 
    WHEN p.role = 'super_admin' THEN '✅ É super_admin'
    ELSE '❌ NÃO é super_admin'
  END as "Status"
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 10;

-- Passo 3: ATUALIZAR o role para super_admin (SUBSTITUA 'SEU-USER-ID-AQUI' pelo ID do Passo 1)
-- Descomente e ajuste a linha abaixo:
-- UPDATE public.profiles SET role = 'super_admin' WHERE id = 'SEU-USER-ID-AQUI';

-- OU, se você quiser atualizar pelo email (SUBSTITUA 'seu-email@exemplo.com'):
-- UPDATE public.profiles 
-- SET role = 'super_admin' 
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'seu-email@exemplo.com');

-- ============================================================================
-- INSTRUÇÕES:
-- 1. Execute o Passo 1 e 2 para encontrar seu usuário
-- 2. Copie o "User ID" do Passo 1
-- 3. Descomente e ajuste o Passo 3 com seu User ID
-- 4. Execute o Passo 3 para atualizar o role
-- ============================================================================
