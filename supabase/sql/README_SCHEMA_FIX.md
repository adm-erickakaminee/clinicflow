# Correção de Schema e RLS - Guia de Execução

## 📋 Resumo

Este guia descreve as correções aplicadas para resolver:
1. **Inconsistência de schema** - Unificação de nomes de colunas
2. **Erros de RLS** - Recursão infinita no login e acesso negado
3. **Mapeamento de colunas** - Atualização do código TypeScript

## 🚀 Passos de Execução

### Passo 1: Executar Script de Unificação de Schema

Execute o arquivo `unify_schema_and_fix_rls.sql` no Supabase SQL Editor.

**Este script:**
- ✅ Desabilita temporariamente o RLS na tabela `profiles` (quebra recursão infinita)
- ✅ Renomeia colunas na tabela `appointments`:
  - `"eu ia"` → `professional_id`
  - `"id_da_organização"` → `organization_id`
  - `"id_da_clínica"` → `clinic_id`
  - `"hora_de_início"` → `start_time`
  - `"hora_final"` → `end_time`
- ✅ Renomeia colunas na tabela `professionals`:
  - `"taxa_de_comissão"` → `commission_rate`
  - `"cargo"` → `role`

**Após executar:** Teste o login. Se funcionar, prossiga para o Passo 2.

### Passo 2: Executar Script de Restauração de RLS

Execute o arquivo `restore_rls_policies.sql` no Supabase SQL Editor.

**Este script:**
- ✅ Habilita RLS na tabela `profiles` com política não-recursiva
- ✅ Cria políticas RLS para `appointments` baseadas em `clinic_id`
- ✅ Cria políticas RLS para `professionals` baseadas em `clinic_id`
- ✅ Cria políticas RLS para `services` baseadas em `organization_id`/`clinic_id`

**Políticas criadas:**
- `profiles`: Leitura/Inserção/Atualização apenas do próprio perfil
- `appointments`: Acesso baseado em `clinic_id` do usuário
- `professionals`: Acesso baseado em `clinic_id` do usuário
- `services`: Acesso baseado em `organization_id`/`clinic_id` do usuário

## 📝 Alterações no Código TypeScript

### `SchedulerContext.tsx`

#### 1. `addProfessional` e `updateProfessional`
- ✅ Usa `commission_rate` (não mais `taxa_de_comissao`)
- ✅ Usa `role` (não mais `cargo`)
- ✅ Payload inclui: `commission_rate`, `role`, `work_schedule` (todos em snake_case)

#### 2. `addService`
- ✅ **REMOVIDO completamente** a coluna `category` do payload (não existe na tabela)

#### 3. `addAppointment`
- ✅ Usa nomes unificados: `professional_id`, `client_id`, `service_id`, `start_time`, `end_time`
- ✅ Payload usa: `organization_id`, `clinic_id`, `professional_id`, `client_id`, `service_id`, `start_time`, `end_time`

## 🔍 Verificações

Após executar os scripts, verifique:

1. **Login funciona** sem recursão infinita
2. **Agendamentos** podem ser criados e visualizados
3. **Profissionais** podem ser cadastrados e atualizados
4. **Serviços** podem ser criados sem erro 400 (category removido)

## ⚠️ Notas Importantes

- Os scripts verificam se as colunas existem antes de renomear (evita erros)
- As políticas RLS são criadas apenas se não existirem (idempotente)
- O código TypeScript foi atualizado para usar apenas os nomes unificados
- A coluna `category` foi completamente removida do payload de `addService`

## 🐛 Troubleshooting

### Se o login ainda não funcionar:
1. Verifique se o RLS foi desabilitado: `SELECT * FROM pg_policies WHERE tablename = 'profiles';`
2. Se necessário, execute novamente: `ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;`

### Se houver erros de acesso negado:
1. Verifique se as políticas foram criadas: `SELECT * FROM pg_policies WHERE tablename IN ('appointments', 'professionals', 'services');`
2. Verifique se o usuário tem `clinic_id` no perfil: `SELECT id, clinic_id FROM profiles WHERE id = auth.uid();`

### Se houver erro 400 ao criar serviço:
1. Verifique se o payload não inclui `category`
2. Verifique se `organization_id` está presente no payload

## ✅ Checklist Final

- [ ] Script 1 executado (`unify_schema_and_fix_rls.sql`)
- [ ] Login testado e funcionando
- [ ] Script 2 executado (`restore_rls_policies.sql`)
- [ ] Agendamentos podem ser criados
- [ ] Profissionais podem ser cadastrados
- [ ] Serviços podem ser criados sem erro 400
- [ ] Políticas RLS verificadas e funcionando
