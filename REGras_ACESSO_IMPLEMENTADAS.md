# Regras de Acesso Implementadas

Este documento descreve as regras de acesso (ACL) implementadas no sistema Clinic Flow.

## 📋 Índice
1. [Administrador](#administrador-admin)
2. [Profissional](#profissional-professional)
3. [Cliente](#cliente-client)
4. [Super Admin](#super-admin-super_admin)
5. [Políticas RLS](#políticas-rls)
6. [Validações Frontend](#validações-frontend)

---

## 👨‍💼 Administrador (`admin` / `clinic_owner`)

### Permissões
- ✅ **CRUD completo** dentro do `clinic_id` vinculado
- ✅ Gerenciar outros administradores e recepcionistas no mesmo `clinic_id`
- ✅ Acesso a relatórios e financeiro do `clinic_id`

### Tabelas Afetadas

#### **Clients** (Clientes)
- **SELECT**: Ver todos os clientes do `clinic_id`
- **INSERT**: Criar clientes no `clinic_id`
- **UPDATE**: Atualizar clientes do `clinic_id`
- **DELETE**: Deletar clientes do `clinic_id`

#### **Professionals** (Profissionais)
- **SELECT**: Ver todos os profissionais do `clinic_id`
- **INSERT**: Criar profissionais no `clinic_id` (inclui criação de profile/login)
- **UPDATE**: Atualizar profissionais do `clinic_id`
- **DELETE**: Deletar profissionais do `clinic_id`

#### **Services** (Serviços)
- **SELECT**: Ver todos os serviços do `clinic_id`
- **INSERT**: Criar serviços no `clinic_id`
- **UPDATE**: Atualizar serviços do `clinic_id`
- **DELETE**: Deletar serviços do `clinic_id`

#### **Appointments** (Agendamentos)
- **SELECT**: Ver todos os agendamentos do `clinic_id`
- **INSERT**: Criar agendamentos no `clinic_id`
- **UPDATE**: Atualizar agendamentos do `clinic_id`
- **DELETE**: Deletar agendamentos do `clinic_id`

#### **Organizations** (Clínicas)
- **SELECT**: Ver sua própria clínica
- **UPDATE**: Atualizar dados da sua clínica (nome, telefone, endereço)

#### **Profiles** (Perfis de Usuários)
- **SELECT**: Ver todos os profiles do `clinic_id`
- **INSERT**: Criar profiles de admin/recepcionista no `clinic_id`
- **UPDATE**: Atualizar profiles do `clinic_id`

---

## 👨‍⚕️ Profissional (`professional`)

### Permissões
- ✅ Visualizar, editar e excluir **apenas seus próprios agendamentos** (`professional_id = seu ID`)
- ✅ Mudar status dos agendamentos (Flow de Atendimento) - **apenas os seus**
- ✅ Visualizar e editar **apenas clientes com quem possui agendamentos** (ativos ou históricos)
- ✅ Editar **apenas seu próprio perfil** (profiles e professionals)
- ✅ Visualizar **apenas seus próprios relatórios** (filtrados por `professional_id`)
- ✅ Visualizar serviços (informação pública)

### Restrições
- ❌ **NÃO pode** ver agenda ou clientes de outros profissionais
- ❌ **NÃO pode** acessar relatórios financeiros de toda a clínica
- ❌ **NÃO pode** criar, editar ou excluir serviços
- ❌ **NÃO pode** gerenciar contas de outros usuários

### Tabelas Afetadas

#### **Appointments** (Agendamentos)
- **SELECT**: Apenas onde `professional_id = auth.uid()`
- **UPDATE**: Apenas onde `professional_id = auth.uid()`
- **DELETE**: Apenas onde `professional_id = auth.uid()`
- ❌ **INSERT**: Não pode criar agendamentos

#### **Clients** (Clientes)
- **SELECT**: Apenas clientes com agendamentos vinculados ao profissional
- **UPDATE**: Apenas clientes com agendamentos vinculados ao profissional
- ❌ **INSERT/DELETE**: Não pode criar ou deletar clientes

#### **Professionals** (Profissionais)
- **SELECT**: Apenas seu próprio registro (`id = auth.uid()`)
- **UPDATE**: Apenas seu próprio registro (`id = auth.uid()`)
- ❌ **INSERT/DELETE**: Não pode criar ou deletar profissionais

#### **Profiles** (Perfis)
- **SELECT**: Apenas seu próprio perfil (`id = auth.uid()`)
- **UPDATE**: Apenas seu próprio perfil (`id = auth.uid()`)

#### **Services** (Serviços)
- **SELECT**: Pode visualizar (informação pública)
- ❌ **INSERT/UPDATE/DELETE**: Não pode modificar

---

## 👤 Cliente (`client`)

### Permissões
- ✅ Criar, visualizar e cancelar **apenas seus próprios agendamentos** (`client_id = seu ID`)
- ✅ Visualizar e editar **apenas seu próprio perfil** (clients e profiles)
- ✅ Visualizar **apenas seu próprio histórico** de serviços e pagamentos
- ✅ Visualizar informações públicas (profissionais, serviços, endereço e contato da clínica)

### Restrições
- ❌ **NÃO pode** ver dados de outros clientes
- ❌ **NÃO pode** ver histórico de outros clientes
- ❌ **NÃO pode** acessar relatórios, financeiro ou qualquer área de gestão da clínica
- ❌ **NÃO pode** ver agenda de outros clientes

### Tabelas Afetadas

#### **Appointments** (Agendamentos)
- **SELECT**: Apenas onde `client_id = auth.uid()`
- **INSERT**: Pode criar seus próprios agendamentos (`client_id = auth.uid()`)
- **UPDATE**: Pode atualizar seus próprios agendamentos (cancelar, etc)
- **DELETE**: Pode deletar seus próprios agendamentos

#### **Clients** (Clientes)
- **SELECT**: Apenas seu próprio registro (`id = auth.uid()`)
- **UPDATE**: Apenas seu próprio registro (`id = auth.uid()`)
- ❌ **INSERT/DELETE**: Não pode criar ou deletar

#### **Profiles** (Perfis)
- **SELECT**: Apenas seu próprio perfil (`id = auth.uid()`)
- **UPDATE**: Apenas seu próprio perfil (`id = auth.uid()`)

#### **Professionals** (Profissionais)
- **SELECT**: Pode visualizar (informação pública)
- ❌ **INSERT/UPDATE/DELETE**: Não pode modificar

#### **Services** (Serviços)
- **SELECT**: Pode visualizar (informação pública)
- ❌ **INSERT/UPDATE/DELETE**: Não pode modificar

---

## 🔧 Super Admin (`super_admin`)

### Permissões
- ✅ **Acesso total** a todas as tabelas e registros
- ✅ Pode criar e gerenciar clínicas
- ✅ Pode criar administradores e vinculá-los a clínicas
- ✅ Acesso a todos os dados de todas as clínicas

---

## 🛡️ Políticas RLS

As políticas RLS (Row Level Security) foram implementadas no arquivo:
```
Clinic/supabase/sql/rls_complete_access_control.sql
```

### Executar o Script

Para aplicar todas as políticas RLS, execute o script SQL no Supabase:

```sql
-- Executar no Supabase SQL Editor
\i Clinic/supabase/sql/rls_complete_access_control.sql
```

Ou copie e cole o conteúdo do arquivo no SQL Editor do Supabase.

### Tabelas com RLS Habilitado

1. ✅ `profiles`
2. ✅ `appointments`
3. ✅ `clients`
4. ✅ `professionals`
5. ✅ `services`
6. ✅ `organizations`
7. ✅ `blocks`
8. ✅ `time_offs`

---

## 🔒 Validações Frontend

As validações frontend são implementadas através da função `canUser()` no `SchedulerContext.tsx`.

### Função `canUser()`

```typescript
canUser(action: string, resource: string, professionalId?: string, resourceId?: string): boolean
```

**Parâmetros:**
- `action`: Ação desejada (`'create'`, `'read'`, `'update'`, `'delete'`)
- `resource`: Recurso acessado (`'appointment'`, `'client'`, `'professional'`, `'service'`, etc.)
- `professionalId`: ID do profissional (opcional, para validação de acesso à agenda)
- `resourceId`: ID do recurso específico (opcional, para validação de propriedade)

### Funções com Validação

As seguintes funções incluem validação de permissões:

- ✅ `addProfessional()` - Apenas admin
- ✅ `updateProfessional()` - Admin ou próprio profissional
- ✅ `removeProfessional()` - Apenas admin
- ✅ `addService()` - Apenas admin
- ✅ `updateService()` - Apenas admin
- ✅ `removeService()` - Apenas admin
- ✅ `addClient()` - Apenas admin
- ✅ `updateClient()` - Admin, profissional (clientes com agendamentos) ou próprio cliente
- ✅ `addAppointment()` - Admin ou cliente (próprios)
- ✅ `updateAppointment()` - Admin, profissional (próprios) ou cliente (próprios)
- ✅ `removeAppointment()` - Admin, profissional (próprios) ou cliente (próprios)

---

## ✅ Checklist de Implementação

- [x] Políticas RLS criadas para todas as tabelas
- [x] Função `canUser()` atualizada com regras detalhadas
- [x] Validações adicionadas nas funções críticas
- [x] Documentação criada
- [x] Testes básicos de validação implementados

---

## 📝 Notas Importantes

1. **Hierarquia de Acesso**: Super Admin > Admin > Profissional > Cliente
2. **Isolamento de Dados**: Cada role só acessa dados dentro do seu escopo (`clinic_id`, `professional_id`, `client_id`)
3. **Validação Dupla**: As validações funcionam tanto no frontend (`canUser`) quanto no backend (RLS)
4. **Performance**: As políticas RLS são executadas no banco de dados, garantindo segurança mesmo se o frontend for burlado

---

**Última Atualização**: Dezembro 2024
