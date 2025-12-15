# 🔧 CORREÇÕES DE CONFORMIDADE COM RELATÓRIO OFICIAL

**Data:** 2025-01-14  
**Base:** `RELATORIO_BANCO_DADOS.md`  
**Status:** ⚠️ INCONSISTÊNCIAS IDENTIFICADAS

---

## ⚠️ INCONSISTÊNCIAS CRÍTICAS ENCONTRADAS

### 1. `financial_transactions`

**Relatório Oficial (linha 343):**
```sql
clinic_id uuid NOT NULL REFERENCES organizations(id)
```

**SQL Real (`financial_transactions.sql` linha 4):**
```sql
organization_id uuid not null references public.organizations(id)
```

**Código Frontend:**
- `AdminAnalyticsView.tsx` linha 251: `.eq('organization_id', clinicId)` ❌
- `PostExecutionAuditView.tsx` linha 72: `.eq('organization_id', clinicId)` ✅ (já corrigido)
- `FinancialView.tsx` linha 77: `.eq('organization_id', clinicId)` ✅ (já corrigido)
- `AdminSettingsView.tsx` linha 225: `.eq('organization_id', clinicId)` ❌

**Edge Function:**
- `process-payment/index.ts` linha 105: `clinic_id: parsed.clinic_id` ✅ (correto!)

**AÇÃO NECESSÁRIA:**
- ⚠️ **DECISÃO CRÍTICA:** O banco real usa `organization_id`, mas o relatório diz `clinic_id`
- Se o relatório está correto, precisa criar migração para renomear coluna
- Se o banco está correto, precisa atualizar o relatório

---

### 2. `organization_settings`

**Relatório Oficial (linha 537):**
```sql
clinic_id uuid PRIMARY KEY REFERENCES organizations(id)
```

**SQL Real (`gaby_infra.sql` linha 26):**
```sql
organization_id uuid primary key references public.organizations(id)
```

**Código Frontend:**
- `AdminAnalyticsView.tsx` linha 309: `.eq('organization_id', clinicId)` ❌
- `AdminSettingsView.tsx` linha 109: `.eq('organization_id', clinicId)` ❌
- `ReferralView.tsx` linha 193: `.eq('organization_id', clinicId)` ❌

**AÇÃO NECESSÁRIA:**
- ⚠️ **DECISÃO CRÍTICA:** Mesma situação - banco usa `organization_id`, relatório diz `clinic_id`

---

### 3. `gaby_rules`

**Relatório Oficial (linha 486):**
```sql
clinic_id uuid NOT NULL REFERENCES organizations(id)
```

**SQL Real (`gaby_infra.sql` linha 4):**
```sql
organization_id uuid not null references public.organizations(id)
```

**Código Frontend:**
- `AdminAnalyticsView.tsx` linha 438: `.eq('organization_id', clinicId)` ❌

---

### 4. `client_retention_data`

**Relatório Oficial (linha 514):**
```sql
clinic_id uuid NOT NULL REFERENCES organizations(id)
```

**SQL Real (`gaby_infra.sql` linha 14):**
```sql
organization_id uuid not null references public.organizations(id)
```

---

## 📋 DECISÃO NECESSÁRIA

**Opção A: Seguir Relatório Oficial (Migrar Banco)**
- Criar migração para renomear `organization_id` → `clinic_id` em:
  - `financial_transactions`
  - `organization_settings`
  - `gaby_rules`
  - `client_retention_data`
- Atualizar todas as políticas RLS
- Atualizar todos os índices
- Atualizar todo o código frontend

**Opção B: Atualizar Relatório (Manter Banco)**
- Atualizar `RELATORIO_BANCO_DADOS.md` para refletir uso de `organization_id` nestas tabelas
- Manter código como está

**⚠️ RECOMENDAÇÃO:** 
Como o relatório oficial é a referência e o usuário pediu para seguir a lógica dele, vou criar uma migração para corrigir o banco e atualizar o código para usar `clinic_id` conforme o relatório.

---

## 🔧 CORREÇÕES A APLICAR (SEGUINDO RELATÓRIO OFICIAL)

### Migração SQL: Renomear `organization_id` → `clinic_id`

**Tabelas a corrigir:**
1. `financial_transactions`
2. `organization_settings`
3. `gaby_rules`
4. `client_retention_data`

### Código Frontend a Corrigir:

1. `AdminAnalyticsView.tsx` - Trocar `organization_id` por `clinic_id` em queries de:
   - `financial_transactions`
   - `organization_settings`
   - `gaby_rules`

2. `AdminSettingsView.tsx` - Trocar `organization_id` por `clinic_id` em queries de:
   - `organization_settings`
   - `financial_transactions`

3. `ReferralView.tsx` - Trocar `organization_id` por `clinic_id` em queries de:
   - `organization_settings`
   - `financial_transactions`

---

## ⚠️ ATENÇÃO

**ANTES de aplicar as correções, verificar:**
1. Qual estrutura está realmente no banco de dados em produção
2. Se há dados em produção que seriam afetados pela migração
3. Se as políticas RLS estão usando `organization_id` ou `clinic_id`

**Se o banco em produção já usa `organization_id`, a migração pode quebrar o sistema!**
