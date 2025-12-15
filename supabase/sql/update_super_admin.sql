-- Script para tornar um usuário Super Admin
-- IMPORTANTE: Substitua 'SEU_EMAIL_AQUI' pelo seu email de login antes de executar!

-- Passo 1: Adicionar a coluna is_super_admin se não existir
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_super_admin boolean DEFAULT false;

-- Passo 2: Atualizar seu perfil para Super Admin pelo email
UPDATE public.profiles
SET 
  role = 'super_admin',
  is_super_admin = true
WHERE id IN (
  SELECT id FROM auth.users WHERE email = 'SEU_EMAIL_AQUI'
);

-- Opção alternativa: Atualizar pelo ID do usuário (se você souber o ID)
-- Descomente e substitua 'SEU_USER_ID_AQUI' pelo seu user ID (UUID)
-- UPDATE public.profiles
-- SET 
--   role = 'super_admin',
--   is_super_admin = true
-- WHERE id = 'SEU_USER_ID_AQUI'::uuid;

-- Verificar se foi atualizado corretamente
SELECT 
  p.id,
  p.full_name,
  u.email,
  p.role,
  p.is_super_admin,
  p.clinic_id
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE u.email = 'SEU_EMAIL_AQUI' OR p.role = 'super_admin';

