# 📋 Instruções: Como Criar Profiles para Professionals

## ⚠️ Problema Identificado

O script SQL mostrou que:
- **3 professionals** existem na tabela `professionals`
- **0 profiles** têm `professional_id` associado
- **0 professionals** têm profiles correspondentes

Isso significa que os appointments não podem ser associados corretamente porque não há profiles para vincular.

## 🔧 Solução: Criar Profiles Manualmente

Como `profiles.id` é uma Foreign Key para `auth.users.id`, não podemos criar profiles diretamente via SQL. Eles devem ser criados através do sistema de autenticação.

### Opção 1: Criar Profiles via Interface do Sistema

1. **Faça login como super_admin** ou admin da clínica
2. **Acesse a área de gerenciamento de profissionais**
3. **Para cada professional:**
   - Crie um usuário (signUp) com email e senha
   - O sistema deve criar automaticamente um `profile` vinculado
   - Associe o `profile.professional_id` ao `professionals.id` correspondente

### Opção 2: Criar Profiles via API/Supabase Auth

Se você tiver acesso ao Supabase Auth, pode criar usuários programaticamente:

```typescript
// Exemplo: Criar usuário e profile para um professional
const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
  email: 'professional@example.com',
  password: 'senha-temporaria',
  email_confirm: true
})

if (authUser?.user) {
  // Criar profile vinculado ao professional
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authUser.user.id, // FK para auth.users.id
      full_name: professional.name,
      role: 'professional',
      clinic_id: professional.clinic_id,
      organization_id: professional.clinic_id,
      professional_id: professional.id // FK para professionals.id
    })
}
```

### Opção 3: Usar Profile Existente (Solução Temporária)

Se houver **qualquer profile existente** na organização (mesmo que não seja o ideal), o script SQL já corrigiu os appointments para usar esse profile. Isso permite que os appointments apareçam no calendário, mesmo que não estejam vinculados ao professional "correto".

**Para corrigir depois:**
1. Crie os profiles corretos (Opção 1 ou 2)
2. Execute um UPDATE para associar os appointments aos profiles corretos:

```sql
UPDATE public.appointments a
SET professional_id = (
  SELECT pr.id
  FROM public.profiles pr
  WHERE pr.professional_id = (
    SELECT p.id 
    FROM public.professionals p 
    WHERE p.name = 'Nome do Professional'
  )
  LIMIT 1
)
WHERE a.professional_id = 'id-do-profile-temporario';
```

## ✅ Verificação

Após criar os profiles, execute este SQL para verificar:

```sql
SELECT 
  'VERIFICAÇÃO' as etapa,
  (SELECT COUNT(*) FROM public.professionals) as total_professionals,
  (SELECT COUNT(*) FROM public.profiles WHERE professional_id IS NOT NULL) as profiles_com_professional_id,
  (SELECT COUNT(*) FROM public.professionals p 
   WHERE EXISTS (SELECT 1 FROM public.profiles pr WHERE pr.professional_id = p.id)) as professionals_com_profile;
```

Você deve ver:
- `profiles_com_professional_id` > 0
- `professionals_com_profile` = `total_professionals`

## 🎯 Próximos Passos

1. **Crie os profiles** usando uma das opções acima
2. **Execute novamente** o script `fix_data_integrity_and_schema.sql` para garantir que tudo está correto
3. **Verifique** que os appointments estão aparecendo corretamente no calendário




