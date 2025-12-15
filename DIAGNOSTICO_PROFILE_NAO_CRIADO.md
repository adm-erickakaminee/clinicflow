# Diagnóstico: Profile não está sendo criado

## Problema
Ao criar um administrador através da interface, o usuário é criado em `auth.users`, mas o profile correspondente não é criado em `public.profiles`.

## Possíveis Causas

### 1. Política RLS bloqueando a inserção
As políticas RLS podem estar bloqueando a criação do profile. Verifique se você executou o script:
```sql
Clinic/supabase/sql/rls_complete_access_control.sql
```

### 2. Usuário não tem permissão
O usuário que está criando o admin precisa ser:
- `super_admin` OU
- `admin` do mesmo `clinic_id` da clínica onde está criando o admin

### 3. Erro silencioso
O erro pode estar ocorrendo mas não sendo mostrado ao usuário.

## Como Diagnosticar

### Passo 1: Verificar usuários sem profile
Execute no Supabase SQL Editor:
```sql
SELECT 
  au.id as user_id,
  au.email,
  au.created_at as user_created_at,
  'MISSING PROFILE' as status
FROM auth.users au
LEFT JOIN public.profiles p ON p.id = au.id
WHERE p.id IS NULL
ORDER BY au.created_at DESC;
```

### Passo 2: Verificar políticas RLS
Execute:
```sql
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
  AND cmd = 'INSERT'
ORDER BY policyname;
```

Você deve ver pelo menos:
- "Admins can insert profiles in clinic"
- "Super admin can insert any profile"

### Passo 3: Verificar permissões do usuário atual
Execute:
```sql
SELECT 
  auth.uid() as current_user_id,
  p.id as profile_id,
  p.role as profile_role,
  p.clinic_id
FROM public.profiles p
WHERE p.id = auth.uid();
```

### Passo 4: Verificar logs do console
Abra o console do navegador (F12) e procure por:
- `✅ addAdminToClinic - Usuário criado:`
- `🔍 addAdminToClinic - Resultado da verificação:`
- `❌ addAdminToClinic - Erro ao criar profile:`

## Soluções

### Solução 1: Criar profile manualmente
Se você sabe o ID do usuário e o `clinic_id`:

```sql
INSERT INTO public.profiles (id, full_name, role, clinic_id)
VALUES (
  'USER_ID_AQUI'::uuid,  -- Substitua pelo ID do usuário de auth.users
  'Nome do Administrador',
  'admin',
  'CLINIC_ID_AQUI'::uuid  -- Substitua pelo ID da clínica
);
```

### Solução 2: Executar script de correção
Use o script:
```
Clinic/supabase/sql/fix_missing_profiles.sql
```

### Solução 3: Verificar e aplicar políticas RLS
Certifique-se de que as políticas RLS estão aplicadas:
```sql
-- Execute no Supabase SQL Editor
\i Clinic/supabase/sql/rls_complete_access_control.sql
```

## Melhorias no Código

O código foi atualizado para:
1. ✅ Mostrar erros detalhados no console
2. ✅ Reportar erros específicos ao usuário
3. ✅ Incluir códigos de erro e mensagens descritivas
4. ✅ Verificar se o profile já existe antes de tentar criar

## Próximos Passos

1. Execute o diagnóstico acima
2. Verifique os logs do console ao criar um admin
3. Se o erro persistir, compartilhe:
   - Mensagem de erro exata
   - Código do erro (se houver)
   - Logs do console (F12)
