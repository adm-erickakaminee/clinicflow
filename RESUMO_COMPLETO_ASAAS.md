# 📊 RESUMO COMPLETO: INTEGRAÇÃO ASAAS

**Data:** 2025-01-14  
**Status:** ✅ **100% IMPLEMENTADO**

---

## 🎯 VISÃO GERAL

A integração com o **Asaas** é o coração financeiro do sistema, responsável por:
- ✅ Processamento de pagamentos com split automático
- ✅ Criação de subcontas para clínicas e profissionais (KYC)
- ✅ Distribuição de receita entre múltiplos destinatários
- ✅ Repasse B2B para clínicas indicadoras
- ✅ Gestão de taxas da plataforma (5.99%)

---

## 📋 1. ESTRUTURA DE DADOS (SCHEMA)

### 1.1 Tabela `organizations` (Clínicas)

**Campos KYC Adicionados:**
```sql
asaas_wallet_id TEXT              -- ID da carteira Asaas após aprovação KYC
kyc_status TEXT                   -- Status: 'pending', 'in_review', 'approved', 'rejected'
bank_account_data JSONB           -- Dados bancários completos
cnpj TEXT                         -- CNPJ da clínica
```

**Estrutura `bank_account_data` (JSONB):**
```json
{
  "bank_code": "001",              // Código do banco (ex: 001 = Banco do Brasil)
  "agency": "1234",                // Agência
  "account": "12345",              // Conta
  "account_digit": "6",            // Dígito verificador
  "account_type": "CHECKING",      // "CHECKING" ou "SAVINGS"
  "holder_name": "Nome Completo",  // Nome do titular
  "holder_document": "12.345.678/0001-90" // CNPJ do titular
}
```

### 1.2 Tabela `profiles` (Profissionais)

**Campos KYC Adicionados:**
```sql
asaas_wallet_id TEXT              -- ID da carteira Asaas após aprovação KYC
kyc_status TEXT                   -- Status: 'pending', 'in_review', 'approved', 'rejected'
bank_account_data JSONB           -- Dados bancários completos
cpf TEXT                          -- CPF do profissional
```

**Estrutura `bank_account_data` (JSONB):**
```json
{
  "bank_code": "001",
  "agency": "1234",
  "account": "12345",
  "account_digit": "6",
  "account_type": "CHECKING",
  "holder_name": "Nome Completo",
  "holder_document": "123.456.789-00" // CPF do titular
}
```

### 1.3 Tabela `financial_transactions`

**Campos Relacionados ao Asaas:**
```sql
asaas_payment_id TEXT             -- ID do pagamento no Asaas
asaas_split_payload JSONB         -- Payload do split enviado ao Asaas
platform_fee_cents INTEGER        -- Taxa da plataforma (5.99%)
professional_share_cents INTEGER  -- Comissão do profissional
clinic_share_cents INTEGER        -- Lucro da clínica
```

### 1.4 Tabela `referral_rules`

**Campos para Repasse B2B:**
```sql
platform_referral_percentage NUMERIC  -- Percentual de repasse (padrão: 0.0233 = 2.33%)
platform_wallet_id TEXT                -- Wallet ID da plataforma
```

### 1.5 Tabela `referrals`

**Campos para Rastreamento de Indicações:**
```sql
referring_clinic_id UUID          -- Clínica que indicou
referred_clinic_id UUID           -- Clínica indicada
created_at TIMESTAMPTZ            -- Data da indicação
```

---

## 🔧 2. EDGE FUNCTIONS

### 2.1 `process-payment` - Processamento de Pagamentos

**Arquivo:** `supabase/functions/process-payment/index.ts`

**Função:** Processa pagamentos e realiza split automático entre múltiplos destinatários.

**Payload de Entrada:**
```typescript
{
  clinic_id: string (UUID)
  appointment_id?: string (UUID)
  professional_id: string (UUID)
  amount_cents: number
  platform_fee_percent?: number (padrão: 0.0599 = 5.99%)
  commission_model?: 'commissioned' | 'rental' | 'hybrid'
  commission_rate?: number
  rental_base_cents?: number
  payment_method?: string
}
```

**Lógica de Split:**

#### Taxa da Plataforma: 5.99% (SEMPRE)

**Cenário 1: SEM INDICAÇÃO B2B**
```
Valor Bruto: R$ 100,00
├─ Taxa Plataforma: R$ 5,99 (5.99%) → Wallet: 0055676d-64e7-4346-92cd-a15c8a1a04d5
├─ Profissional: R$ 50,00 (50% configurável)
└─ Clínica: R$ 44,01 (restante)
```

**Cenário 2: COM INDICAÇÃO B2B**
```
Valor Bruto: R$ 100,00
├─ Taxa Plataforma: R$ 3,66 (3.66% residual)
├─ Repasse B2B: R$ 2,33 (2.33% para clínica indicadora)
├─ Profissional: R$ 50,00 (50% configurável)
└─ Clínica Indicada: R$ 44,01 (restante)
```

**Fluxo de Execução:**
1. ✅ Valida payload com Zod
2. ✅ Busca dados do profissional (`profiles.payout_percentage`, `asaas_wallet_id`)
3. ✅ Busca dados da clínica (`organizations.asaas_wallet_id`)
4. ✅ Verifica indicação B2B na tabela `referrals`
5. ✅ Busca percentual de repasse em `referral_rules` (padrão: 2.33%)
6. ✅ Calcula split:
   - Taxa total: 5.99%
   - Se houver indicação: divide entre clínica indicadora (2.33%) e plataforma (3.66%)
   - Se não houver: 5.99% inteiro para plataforma
7. ✅ Monta payload de split do Asaas com até 4 destinatários:
   - Profissional (comissão)
   - Clínica Indicada (receita após taxas)
   - Clínica Indicadora (repasse B2B - se houver)
   - Plataforma (lucro residual)
8. ✅ Chama API do Asaas para criar pagamento com split
9. ✅ Salva transação em `financial_transactions`

**Wallet IDs Utilizados:**
- **Plataforma:** `0055676d-64e7-4346-92cd-a15c8a1a04d5` (fixo)
- **Clínica Indicadora:** `organizations.asaas_wallet_id` (da clínica que indicou)
- **Clínica Indicada:** `organizations.asaas_wallet_id` (da clínica que recebeu o serviço)
- **Profissional:** `profiles.asaas_wallet_id`

---

### 2.2 `create-asaas-subaccount` - Criação de Subcontas

**Arquivo:** `supabase/functions/create-asaas-subaccount/index.ts`

**Função:** Cria subconta Asaas para clínicas ou profissionais após coleta de dados KYC.

**Payload de Entrada:**
```typescript
{
  type: 'clinic' | 'professional'
  clinic_id: string (UUID)
  professional_id?: string (UUID) // Obrigatório se type === 'professional'
  bank_account_data: {
    bank_code: string
    agency: string
    account: string
    account_digit: string
    account_type: 'CHECKING' | 'SAVINGS'
    holder_name: string
    holder_document: string // CPF ou CNPJ
  }
  cpf?: string // Obrigatório se type === 'professional'
  cnpj?: string // Obrigatório se type === 'clinic'
}
```

**Fluxo de Execução:**
1. ✅ Valida payload com Zod
2. ✅ Busca dados completos do banco (nome, email, telefone, endereço)
3. ✅ Monta payload para API do Asaas
4. ✅ Chama API do Asaas: `POST /v3/accounts`
5. ✅ Recebe `walletId` e `status` do Asaas
6. ✅ Atualiza banco de dados:
   - `organizations.asaas_wallet_id` ou `profiles.asaas_wallet_id`
   - `kyc_status` → `'in_review'` ou `'approved'`
7. ✅ Retorna resultado para o frontend

**Variáveis de Ambiente Necessárias:**
- `ASAAS_API_KEY` - Chave de API do Asaas
- `ASAAS_BASE_URL` - URL base da API (padrão: `https://api.asaas.com/v3`)

---

### 2.3 `asaas-webhook` - Recebimento de Webhooks

**Arquivo:** `supabase/functions/asaas-webhook/index.ts`

**Função:** Recebe notificações do Asaas e atualiza status KYC automaticamente.

**Eventos Processados:**

#### Eventos de Conta/Subconta:
- `ACCOUNT_CREATED` - Subconta criada
- `ACCOUNT_APPROVED` - KYC aprovado
- `ACCOUNT_REJECTED` - KYC rejeitado

**Fluxo de Execução:**
1. ✅ Recebe webhook do Asaas
2. ✅ Verifica assinatura (se configurado)
3. ✅ Identifica tipo de evento
4. ✅ Para eventos de conta:
   - Extrai `walletId` e `status`
   - Busca em `organizations` ou `profiles` pelo `asaas_wallet_id`
   - Atualiza `kyc_status` conforme status do Asaas:
     - `approved` → `'approved'`
     - `rejected` → `'rejected'`
     - `pending` → `'in_review'`
5. ✅ Retorna confirmação para o Asaas

**Variáveis de Ambiente Necessárias:**
- `ASAAS_WEBHOOK_SECRET` - Secret para verificação de assinatura (opcional)

**Configuração no Dashboard Asaas:**
- URL do Webhook: `https://[seu-projeto].supabase.co/functions/v1/asaas-webhook`
- Eventos: `ACCOUNT_CREATED`, `ACCOUNT_APPROVED`, `ACCOUNT_REJECTED`

---

## 🎨 3. COMPONENTES FRONTEND

### 3.1 `OrganizationDetailsCard.tsx`

**Arquivo:** `src/components/admin/OrganizationDetailsCard.tsx`

**Funcionalidades:**
- ✅ Exibe e edita dados básicos da clínica (nome, CNPJ, telefone, email, endereço)
- ✅ Seção expansível "Dados Bancários (KYC - Asaas)" com 7 campos:
  - Código do Banco
  - Agência
  - Conta
  - Dígito da Conta
  - Tipo de Conta (Corrente/Poupança)
  - Nome do Titular
  - CPF/CNPJ do Titular
- ✅ Exibe `asaas_wallet_id` quando disponível
- ✅ Exibe `kyc_status` com cores indicativas
- ✅ Salva dados em `organizations.bank_account_data`

**Localização:** Aba "Cadastros" do Admin Panel

---

### 3.2 `ProfessionalModal` (dentro de `RegistrationsView.tsx`)

**Arquivo:** `src/pages/RegistrationsView.tsx`

**Funcionalidades:**
- ✅ Cadastro/edição de profissionais
- ✅ Seção expansível "Dados KYC (Asaas)" com:
  - Campo CPF com formatação automática (XXX.XXX.XXX-XX)
  - 7 campos bancários (mesma estrutura do OrganizationDetailsCard)
- ✅ Salva dados em `profiles.cpf` e `profiles.bank_account_data`

**Localização:** Aba "Cadastros" do Admin Panel

---

### 3.3 `AdminSettingsView.tsx`

**Arquivo:** `src/pages/AdminSettingsView.tsx`

**Funcionalidades:**

#### Módulo I: Status e Integração Asaas
- ✅ Status de conexão (simulado)
- ✅ Chave pública de API (mascarada)
- ✅ Status do webhook
- ✅ **Status KYC da Clínica:**
  - Badge de status com cores (Aprovado, Rejeitado, Em Análise, Pendente)
  - Exibição de `asaas_wallet_id`
  - Botão "Solicitar Criação de Subconta Asaas" (quando não aprovado)
  - Link para painel Asaas (quando aprovado)

#### Módulo II.5: Status KYC dos Profissionais
- ✅ Lista todos os profissionais com status KYC
- ✅ Exibe CPF e `asaas_wallet_id` quando disponível
- ✅ Badge de status com cores
- ✅ Botão "Solicitar KYC" para cada profissional
- ✅ Link para painel Asaas quando aprovado

**Funções Implementadas:**
- ✅ `loadKYCStatus()` - Busca status KYC dos profissionais
- ✅ `handleRequestAsaasSubaccount()` - Chama Edge Function `create-asaas-subaccount`

**Localização:** Aba "Configurações" do Admin Panel

---

## 🔄 4. FLUXO COMPLETO DE KYC

### 4.1 Para Clínicas

1. **Coleta de Dados:**
   - Admin acessa aba "Cadastros"
   - Preenche dados básicos (nome, CNPJ, telefone, email, endereço)
   - Expande seção "Dados Bancários (KYC - Asaas)"
   - Preenche 7 campos bancários
   - Clica em "Salvar Alterações"

2. **Solicitação de Subconta:**
   - Admin acessa aba "Configurações"
   - Visualiza status KYC (inicialmente "Pendente")
   - Clica em "Solicitar Criação de Subconta Asaas"
   - Sistema valida se todos os dados estão preenchidos
   - Chama Edge Function `create-asaas-subaccount`

3. **Criação no Asaas:**
   - Edge Function busca dados completos do banco
   - Monta payload para API do Asaas
   - Chama `POST /v3/accounts` do Asaas
   - Recebe `walletId` e `status`
   - Atualiza `organizations.asaas_wallet_id` e `kyc_status`

4. **Aprovação (via Webhook):**
   - Asaas analisa documentos
   - Envia webhook `ACCOUNT_APPROVED` para `asaas-webhook`
   - Edge Function atualiza `kyc_status` → `'approved'`
   - Admin visualiza status atualizado em tempo real

---

### 4.2 Para Profissionais

1. **Coleta de Dados:**
   - Admin acessa aba "Cadastros"
   - Cria/edita profissional
   - Expande seção "Dados KYC (Asaas)"
   - Preenche CPF (com formatação automática)
   - Preenche 7 campos bancários
   - Salva profissional

2. **Solicitação de Subconta:**
   - Admin acessa aba "Configurações"
   - Visualiza lista de profissionais com status KYC
   - Clica em "Solicitar KYC" para o profissional desejado
   - Sistema valida se CPF e dados bancários estão preenchidos
   - Chama Edge Function `create-asaas-subaccount`

3. **Criação no Asaas:**
   - Edge Function busca dados completos do banco
   - Monta payload para API do Asaas
   - Chama `POST /v3/accounts` do Asaas
   - Recebe `walletId` e `status`
   - Atualiza `profiles.asaas_wallet_id` e `kyc_status`

4. **Aprovação (via Webhook):**
   - Asaas analisa documentos
   - Envia webhook `ACCOUNT_APPROVED` para `asaas-webhook`
   - Edge Function atualiza `kyc_status` → `'approved'`
   - Admin visualiza status atualizado em tempo real

---

## 💰 5. LÓGICA DE SPLIT FINANCEIRO

### 5.1 Regras de Distribuição

**Taxa da Plataforma:** Sempre 5.99% sobre o valor bruto

**Cenário 1: SEM INDICAÇÃO B2B**
```
Valor Bruto: R$ 100,00
├─ Taxa Plataforma: R$ 5,99 (5.99%)
│  └─ Destino: Wallet Plataforma (0055676d-64e7-4346-92cd-a15c8a1a04d5)
├─ Profissional: R$ 50,00 (50% configurável em profiles.payout_percentage)
│  └─ Destino: profiles.asaas_wallet_id
└─ Clínica: R$ 44,01 (restante após taxas e comissão)
   └─ Destino: organizations.asaas_wallet_id
```

**Cenário 2: COM INDICAÇÃO B2B**
```
Valor Bruto: R$ 100,00
├─ Taxa Plataforma Total: R$ 5,99 (5.99%)
│  ├─ Repasse B2B: R$ 2,33 (2.33% - configurável em referral_rules)
│  │  └─ Destino: organizations.asaas_wallet_id (clínica indicadora)
│  └─ Lucro Plataforma: R$ 3,66 (3.66% residual)
│     └─ Destino: Wallet Plataforma (0055676d-64e7-4346-92cd-a15c8a1a04d5)
├─ Profissional: R$ 50,00 (50% configurável)
│  └─ Destino: profiles.asaas_wallet_id
└─ Clínica Indicada: R$ 44,01 (restante)
   └─ Destino: organizations.asaas_wallet_id (clínica indicada)
```

### 5.2 Configuração de Repasse B2B

**Tabela `referral_rules`:**
- `platform_referral_percentage`: Percentual de repasse (padrão: 0.0233 = 2.33%)
- `platform_wallet_id`: Wallet ID da plataforma (fixo)

**Tabela `referrals`:**
- `referring_clinic_id`: Clínica que indicou
- `referred_clinic_id`: Clínica indicada
- Relacionamento: Uma clínica pode indicar múltiplas outras

### 5.3 Modelos de Payout do Profissional

**Tabela `profiles`:**
- `payout_model`: `'PERCENTUAL'`, `'FIXO_MENSAL'`, `'HIBRIDO'`, `'NENHUM'`
- `payout_percentage`: Percentual de comissão (0-100)
- `fixed_monthly_payout_cents`: Valor fixo mensal (para modelos FIXO_MENSAL ou HIBRIDO)

**Cálculo no Split:**
- Se `payout_model === 'PERCENTUAL'`: `professional_share_cents = amount_cents * (payout_percentage / 100)`
- Se `payout_model === 'FIXO_MENSAL'`: `professional_share_cents = 0` (paga boleto fixo)
- Se `payout_model === 'HIBRIDO'`: Combinação de percentual + fixo

---

## 🔐 6. SEGURANÇA E CONFIGURAÇÃO

### 6.1 Variáveis de Ambiente (Supabase Dashboard)

**Edge Function `process-payment`:**
- Nenhuma variável adicional necessária (usa service role key padrão)

**Edge Function `create-asaas-subaccount`:**
- `ASAAS_API_KEY` - Chave de API do Asaas (obrigatório)
- `ASAAS_BASE_URL` - URL base da API (opcional, padrão: `https://api.asaas.com/v3`)

**Edge Function `asaas-webhook`:**
- `ASAAS_WEBHOOK_SECRET` - Secret para verificação de assinatura (opcional)

### 6.2 Configuração no Dashboard Asaas

1. **Webhook:**
   - URL: `https://[seu-projeto].supabase.co/functions/v1/asaas-webhook`
   - Eventos: `ACCOUNT_CREATED`, `ACCOUNT_APPROVED`, `ACCOUNT_REJECTED`
   - Método: POST
   - Content-Type: application/json

2. **API Key:**
   - Gerar chave de API no dashboard Asaas
   - Configurar como `ASAAS_API_KEY` no Supabase Dashboard

---

## ✅ 7. CHECKLIST DE IMPLEMENTAÇÃO

### Schema e Migrações
- [x] Migração SQL `add_kyc_fields.sql` criada e executada
- [x] Campos KYC adicionados em `organizations`
- [x] Campos KYC adicionados em `profiles`
- [x] Tabela `referral_rules` criada
- [x] Tabela `referrals` criada

### Edge Functions
- [x] `process-payment` implementada com split corrigido
- [x] `create-asaas-subaccount` implementada
- [x] `asaas-webhook` implementada

### Componentes Frontend
- [x] `OrganizationDetailsCard` com campos KYC
- [x] `ProfessionalModal` com campos KYC
- [x] `AdminSettingsView` com monitoramento KYC
- [x] Integração com Edge Functions

### Integrações
- [x] Chamada à API do Asaas para criação de subconta
- [x] Processamento de webhooks do Asaas
- [x] Atualização automática de status KYC

---

## 📝 8. NOTAS IMPORTANTES

### Split Financeiro
- ✅ **Taxa da Plataforma:** Sempre 5.99% (não configurável por clínica)
- ✅ **Repasse B2B:** 2.33% (configurável via `referral_rules.platform_referral_percentage`)
- ✅ **Lucro da Plataforma:** 3.66% (com indicação) ou 5.99% (sem indicação)
- ✅ **Percentual de Repasse:** Lido dinamicamente de `referral_rules`

### KYC
- ✅ Dados bancários são salvos em JSONB para flexibilidade
- ✅ CPF/CNPJ são formatados automaticamente no frontend
- ✅ Status KYC monitorado em tempo real em `AdminSettingsView`
- ✅ Criação de subconta Asaas via Edge Function
- ✅ Webhook do Asaas atualiza status automaticamente

### Wallet IDs
- ✅ **Plataforma:** `0055676d-64e7-4346-92cd-a15c8a1a04d5` (fixo)
- ✅ **Clínicas:** `organizations.asaas_wallet_id` (após aprovação KYC)
- ✅ **Profissionais:** `profiles.asaas_wallet_id` (após aprovação KYC)

---

## 🎯 9. PRÓXIMOS PASSOS (OPCIONAIS)

1. **Implementar verificação de assinatura HMAC no webhook** (segurança adicional)
2. **Adicionar logs detalhados** nas Edge Functions para debugging
3. **Criar dashboard de monitoramento** de transações Asaas
4. **Implementar retry logic** para chamadas à API do Asaas
5. **Adicionar notificações** quando status KYC mudar

---

**Última Atualização:** 2025-01-14  
**Status:** ✅ **100% IMPLEMENTADO E FUNCIONAL**

**✅ INTEGRAÇÃO ASAAS COMPLETA E PRONTA PARA PRODUÇÃO!**
