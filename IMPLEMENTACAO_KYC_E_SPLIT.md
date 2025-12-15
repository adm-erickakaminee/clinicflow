# ✅ IMPLEMENTAÇÃO: KYC E SPLIT CORRIGIDO

**Data:** 2025-01-14  
**Status:** ✅ **IMPLEMENTADO**

---

## 📋 RESUMO DAS IMPLEMENTAÇÕES

### 1. ✅ Migração SQL - Campos KYC

**Arquivo:** `supabase/migrations/add_kyc_fields.sql`

**Campos Adicionados:**

#### `organizations` (Clínicas):
- ✅ `asaas_wallet_id` (TEXT) - ID da carteira Asaas após aprovação KYC
- ✅ `kyc_status` (TEXT) - Status: 'pending', 'in_review', 'approved', 'rejected'
- ✅ `bank_account_data` (JSONB) - Dados bancários completos

#### `profiles` (Profissionais):
- ✅ `cpf` (TEXT) - CPF do profissional
- ✅ `kyc_status` (TEXT) - Status do KYC
- ✅ `bank_account_data` (JSONB) - Dados bancários completos

---

### 2. ✅ OrganizationDetailsCard.tsx - Campos KYC

**Arquivo:** `src/components/admin/OrganizationDetailsCard.tsx`

**Funcionalidades Adicionadas:**
- ✅ Seção expansível "Dados Bancários (KYC - Asaas)"
- ✅ Campos bancários:
  - Código do Banco
  - Agência
  - Conta
  - Dígito da Conta
  - Tipo de Conta (Corrente/Poupança)
  - Nome do Titular
  - CPF/CNPJ do Titular
- ✅ Exibição de `asaas_wallet_id` quando disponível
- ✅ Exibição de `kyc_status` com cores indicativas

**Status:** ✅ **IMPLEMENTADO**

---

### 3. ✅ ProfessionalModal - Campos KYC

**Arquivo:** `src/pages/RegistrationsView.tsx` (função `ProfessionalModal`)

**Funcionalidades Adicionadas:**
- ✅ Seção expansível "Dados KYC (Asaas)"
- ✅ Campo CPF do profissional (com formatação automática)
- ✅ Campos bancários completos:
  - Código do Banco
  - Agência
  - Conta
  - Dígito da Conta
  - Tipo de Conta (Corrente/Poupança)
  - Nome do Titular
  - CPF do Titular
- ✅ Campos salvos em `profiles.cpf` e `profiles.bank_account_data`
- ✅ Integração com `addProfessional` e `updateProfessional` no `SchedulerContext`

**Status:** ✅ **IMPLEMENTADO**

---

### 4. ⚠️ AdminSettingsView.tsx - Monitoramento KYC (PENDENTE)

**Arquivo:** `src/pages/AdminSettingsView.tsx`

**Funcionalidades a Adicionar:**
- ⚠️ Seção "Status KYC" mostrando:
  - Status KYC da clínica
  - Status KYC dos profissionais
  - Botão para solicitar criação de subconta Asaas
  - Link para painel Asaas (quando aprovado)

**Status:** ⚠️ **PENDENTE** (próximo passo)

---

### 5. ✅ Edge Function process-payment - Split Corrigido

**Arquivo:** `supabase/functions/process-payment/index.ts`

**Lógica Implementada:**

#### Taxa da Plataforma: 5.99% (SEMPRE)

**Cenário 1: SEM INDICAÇÃO**
- ✅ 5.99% inteiro → Wallet da Plataforma (`0055676d-64e7-4346-92cd-a15c8a1a04d5`)

**Cenário 2: COM INDICAÇÃO B2B**
- ✅ 2.33% → Wallet da Clínica Indicadora (`referrals.referring_clinic_id.asaas_wallet_id`)
- ✅ 3.66% → Wallet da Plataforma (`0055676d-64e7-4346-92cd-a15c8a1a04d5`)

**Fluxo de Processamento:**
1. ✅ Calcula taxa total de 5.99%
2. ✅ Verifica se há indicação na tabela `referrals`
3. ✅ Se houver indicação:
   - Calcula repasse de 2.33% para clínica indicadora
   - Calcula lucro residual de 3.66% para plataforma
4. ✅ Se não houver indicação:
   - Direciona 5.99% inteiro para plataforma
5. ✅ Monta payload de split do Asaas com todos os destinatários:
   - Profissional (comissão)
   - Clínica Indicada (receita)
   - Clínica Indicadora (repasse B2B - se houver)
   - Plataforma (lucro residual)

**Status:** ✅ **IMPLEMENTADO E TESTADO**

---

## 📊 ESTRUTURA DE DADOS

### `bank_account_data` (JSONB)

```typescript
{
  bank_code: string        // Ex: "001" (Banco do Brasil)
  agency: string           // Ex: "1234"
  account: string          // Ex: "12345"
  account_digit: string    // Ex: "6"
  account_type: 'CHECKING' | 'SAVINGS'
  holder_name: string      // Nome completo do titular
  holder_document: string  // CPF ou CNPJ do titular
}
```

---

## 🔄 FLUXO DE KYC

### Para Clínicas:
1. Admin preenche dados básicos (nome, CNPJ, endereço)
2. Admin preenche dados bancários (KYC)
3. Sistema envia dados para API Asaas (via Edge Function)
4. Asaas cria subconta e envia email de boas-vindas
5. Status KYC atualizado para `in_review`
6. Após aprovação, `kyc_status` → `approved` e `asaas_wallet_id` preenchido

### Para Profissionais:
1. Admin preenche dados do profissional (nome, especialidade)
2. Admin preenche CPF e dados bancários (KYC)
3. Sistema envia dados para API Asaas (via Edge Function)
4. Asaas cria subconta e envia email de boas-vindas
5. Status KYC atualizado para `in_review`
6. Após aprovação, `kyc_status` → `approved` e `asaas_wallet_id` preenchido

---

## 🎯 PRÓXIMOS PASSOS

1. ⚠️ **Adicionar monitoramento KYC no AdminSettingsView**
2. ⚠️ **Criar Edge Function para criar subconta Asaas** (quando dados KYC estiverem completos)
3. ⚠️ **Configurar webhook do Asaas** para atualizar `kyc_status` automaticamente

---

## ✅ CHECKLIST

- [x] Migração SQL criada (`add_kyc_fields.sql`)
- [x] OrganizationDetailsCard expandido com campos KYC
- [x] ProfessionalModal expandido com campos KYC
- [x] SchedulerContext atualizado para salvar campos KYC
- [x] Edge Function process-payment atualizada com split corrigido
- [ ] AdminSettingsView com monitoramento KYC
- [ ] Edge Function para criar subconta Asaas
- [ ] Webhook do Asaas configurado

---

**Última Atualização:** 2025-01-14
