# 📊 RELATÓRIO COMPLETO DO BANCO DE DADOS - CLINIC FLOW

**Este documento serve como referência oficial da estrutura do banco de dados. Use-o em chats futuros para evitar criar estruturas diferentes ou cometer erros.**

---

## 🎯 CONVENÇÕES CRÍTICAS

### ⚠️ NOMENCLATURA OBRIGATÓRIA

**TODAS as tabelas multi-tenant usam `clinic_id` (NUNCA `organization_id`)**

- ✅ Correto: `clinic_id uuid NOT NULL REFERENCES organizations(id)`
- ❌ Errado: `organization_id uuid NOT NULL REFERENCES organizations(id)`

**Razão:** O sistema foi unificado para usar exclusivamente `clinic_id` como identificador de tenant.

### 💰 VALORES FINANCEIROS

**TODOS os valores monetários são armazenados em CENTAVOS (INTEGER)**

- ✅ Correto: `price_cents integer NOT NULL`
- ❌ Errado: `price numeric(10,2)` ou `price float`

**Razão:** Evita problemas de precisão com ponto flutuante.

### 🔐 SEGURANÇA (RLS)

**TODAS as tabelas têm RLS habilitado e políticas configuradas por role.**

---

## 📋 ESTRUTURA COMPLETA DAS TABELAS

### 1. `organizations` (Clínicas)

**Descrição:** Tabela principal que representa cada clínica/organização.

```sql
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  phone text,
  email text,
  address text,
  status text CHECK (status IN ('active', 'suspended', 'delinquent')) DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `id`: UUID usado como `clinic_id` em outras tabelas
- `status`: Controla estado da clínica (Super Admin pode suspender)

**RLS:** Habilitado - Admins veem apenas sua clínica, Super Admin vê todas.

---

### 2. `profiles` (Perfis de Usuários)

**Descrição:** Vinculado ao `auth.users` do Supabase. Representa todos os usuários do sistema.

```sql
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'professional', 'receptionist', 'super_admin', 'client')),
  phone text,
  avatar_url text,
  professional_id uuid REFERENCES professionals(id) ON DELETE SET NULL,
  -- Campos opcionais para profissionais (podem estar em professionals também):
  -- asaas_wallet_id text,
  -- commission_model text,
  -- commission_rate numeric,
  -- rental_base_cents integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `id`: Mesmo UUID do `auth.users` (auth.uid())
- `clinic_id`: **OBRIGATÓRIO** - Identifica a clínica do usuário
- `role`: Define permissões do usuário (inclui 'client' para clientes)
- `professional_id`: FK opcional para `professionals.id` (se for profissional)
- `avatar_url`: URL do avatar (armazenado no bucket 'avatars' do Supabase Storage)

**⚠️ IMPORTANTE:** 
- `clinic_id` é NOT NULL. Super Admin pode ter `clinic_id` NULL ou de uma clínica especial.
- Quando `role = 'client'`, um trigger automático cria registro em `clients` com `id = profiles.id`

**RLS:**
- Usuários veem apenas seu próprio perfil
- Admins veem todos os profiles do seu `clinic_id`
- Super Admin vê todos os profiles

---

### 3. `professionals` (Profissionais)

**Descrição:** Dados específicos dos profissionais (especialidades, qualificações, modelo de comissão).

```sql
CREATE TABLE professionals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  specialty text,
  avatar text,
  commission_model text CHECK (commission_model IN ('commissioned', 'rental', 'hybrid')) DEFAULT 'commissioned',
  commission_rate numeric(5,2) DEFAULT 0,
  rental_base_cents integer DEFAULT 0 NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `commission_model`: Modelo de comissão do profissional PARA A CLÍNICA
  - `commissioned`: Profissional paga X% (`commission_rate`) sobre cada serviço para a clínica
  - `rental`: Profissional paga valor fixo mensal (`rental_base_cents`) para a clínica
  - `hybrid`: Profissional paga valor fixo mensal + X% sobre cada serviço
- `commission_rate`: Percentual de comissão (0-100, numeric)
- `rental_base_cents`: Valor fixo mensal em centavos (usado em rental/hybrid)

**⚠️ IMPORTANTE:** O profissional PAGA para a clínica (não o contrário). A clínica também paga taxa para a plataforma (6% padrão).

**Relacionamento:**
- `profiles.professional_id` → `professionals.id` (1:1 opcional)

**RLS:**
- Profissionais veem apenas seus próprios dados
- Admins veem todos os profissionais do `clinic_id`
- Clientes podem visualizar profissionais (informação pública)

---

### 3.1. `professional_goals` (Metas e Custos do Profissional)

**Descrição:** Metas financeiras pessoais e custos fixos detalhados do profissional para cálculo de valor/hora.

```sql
CREATE TABLE professional_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Detalhamento de Custos Fixos Mensais (em centavos)
  fixed_cost_rent_cents integer DEFAULT 0 CHECK (fixed_cost_rent_cents >= 0),
  fixed_cost_utilities_cents integer DEFAULT 0 CHECK (fixed_cost_utilities_cents >= 0),
  fixed_cost_transport_cents integer DEFAULT 0 CHECK (fixed_cost_transport_cents >= 0),
  fixed_cost_salary_cents integer DEFAULT 0 CHECK (fixed_cost_salary_cents >= 0),
  fixed_cost_other_cents integer DEFAULT 0 CHECK (fixed_cost_other_cents >= 0),
  
  -- Margem de Lucro para Reinvestimentos
  profit_margin_cents integer DEFAULT 0 CHECK (profit_margin_cents >= 0),
  
  -- Taxa da Clínica (valor mensal que o profissional paga para a clínica)
  clinic_fee_cents integer DEFAULT 0 CHECK (clinic_fee_cents >= 0),
  
  -- Disponibilidade CRÍTICA para o cálculo do Valor Hora
  hours_available_per_month integer NOT NULL DEFAULT 160 CHECK (hours_available_per_month > 0),
  
  -- Meta de Renda Total
  monthly_income_goal_cents integer DEFAULT 0 CHECK (monthly_income_goal_cents >= 0),
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (profile_id)
);
```

**Campos Importantes:**
- **Custos Fixos Detalhados** (todos em centavos):
  - `fixed_cost_rent_cents`: Aluguel/imóvel
  - `fixed_cost_utilities_cents`: Utilidades (luz, água, internet)
  - `fixed_cost_transport_cents`: Transporte
  - `fixed_cost_salary_cents`: Salário/Pró-Labore desejado
  - `fixed_cost_other_cents`: Outros custos fixos
- `profit_margin_cents`: Margem de lucro mensal para reinvestimentos (em centavos)
- `clinic_fee_cents`: Valor mensal em centavos que o profissional paga para a clínica (taxa/comissão fixa mensal)
- `hours_available_per_month`: Horas disponíveis para trabalho por mês (padrão: 160h = 40h/semana × 4)
- `monthly_income_goal_cents`: Meta de renda total mensal desejada (em centavos)

**Cálculo do Valor Hora:**
- **Custo por Hora** = Soma de todos os custos fixos ÷ `hours_available_per_month`
- **Valor Hora Necessário** = (Soma de custos fixos + `monthly_income_goal_cents` + `profit_margin_cents`) ÷ `hours_available_per_month`

**⚠️ IMPORTANTE:** 
- Impostos NÃO são custo fixo mensal. Impostos são calculados como porcentagem sobre vendas e devem ser configurados no cadastro de cada serviço (`services.tax_rate_percent`).

**RLS:**
- Profissionais veem apenas suas próprias metas (`profile_id = auth.uid()`)
- Profissionais podem inserir/atualizar suas próprias metas

---

### 4. `clients` (Clientes)

**Descrição:** Cadastro de clientes da clínica.

```sql
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text,
  phone text,
  cpf text,
  birth_date date,
  address text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**⚠️ CRÍTICO - Vínculo com Auth:**
- **`clients.id` DEVE ser igual a `profiles.id` (auth.uid()) quando o cliente se cadastra**
- Um trigger automático (`handle_new_client_profile`) cria o registro em `clients` quando um `profile` com `role = 'client'` é criado
- Isso garante que `clients.id = profiles.id = auth.uid()`, permitindo que as políticas RLS funcionem corretamente
- **Cadastro de Cliente:** Nome + Telefone (email opcional). O sistema cria automaticamente:
  1. `auth.users` (via Supabase Auth)
  2. `profiles` (com role='client')
  3. `clients` (com id = auth.uid(), via trigger)

**RLS:**
- Clientes veem apenas seus próprios dados (`id = auth.uid()`)
- Clientes podem criar seu próprio registro em `clients` (com `id = auth.uid()`)
- Profissionais veem apenas clientes com quem têm agendamentos (política com EXISTS)
- Admins e Recepcionistas veem todos os clientes do `clinic_id`

---

### 5. `services` (Serviços)

**Descrição:** Catálogo de serviços oferecidos pela clínica.

```sql
CREATE TABLE services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  duration_minutes integer NOT NULL,
  price integer, -- em centavos
  tax_rate_percent numeric(5,2) DEFAULT 0 CHECK (tax_rate_percent >= 0 AND tax_rate_percent <= 100),
  color text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `price`: INTEGER em centavos (pode ser NULL para serviços sem preço fixo)
- `duration_minutes`: Duração do serviço em minutos
- `tax_rate_percent`: Taxa de imposto em porcentagem (0-100%) aplicada sobre o valor do serviço. Ex: 5.00 = 5%

**RLS:**
- Admins gerenciam serviços do `clinic_id`
- Profissionais e clientes podem visualizar (informação pública)

---

### 6. `professional_services` (Relação N:N)

**Descrição:** Vincula profissionais aos serviços que podem realizar.

```sql
CREATE TABLE professional_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Relacionamento:** Muitos-para-muitos entre `professionals` e `services`.

---

### 7. `appointments` (Agendamentos)

**Descrição:** Agendamentos de clientes com profissionais.

```sql
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  professional_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  status text NOT NULL CHECK (status IN ('requested', 'pending', 'confirmed', 'waiting', 'in_progress', 'medical_done', 'completed', 'cancelled')) DEFAULT 'pending',
  notes text,
  booking_fee_cents integer DEFAULT 0 CHECK (booking_fee_cents >= 0),
  cashback_earned_cents integer DEFAULT 0 CHECK (cashback_earned_cents >= 0),
  checkInTime timestamptz,
  startTime timestamptz,
  endTime timestamptz,
  medicalNotes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `client_id`: **NOT NULL** (obrigatório - um agendamento sem cliente não faz sentido)
- `professional_id`: Pode ser NULL (agendamentos gerais)
- `booking_fee_cents`: Taxa de reserva em centavos (default 0)
- `cashback_earned_cents`: Valor de cashback ganho pelo cliente neste agendamento (default 0)
- `status`: Fluxo de estados do agendamento

**Fluxo de Status:**
1. `requested` → Solicitado pelo cliente, aguardando confirmação da recepcionista
2. `pending` → Agendado, não confirmado
3. `confirmed` → Confirmado pelo cliente
4. `waiting` → Cliente aguardando atendimento
5. `in_progress` → Em atendimento
6. `medical_done` → Atendimento médico concluído
7. `completed` → Finalizado (checkout feito)
8. `cancelled` → Cancelado

**RLS:**
- Profissionais veem apenas seus agendamentos (`professional_id = auth.uid()`)
- Clientes veem apenas seus agendamentos (`client_id = auth.uid()`)
- Admins veem todos os agendamentos do `clinic_id`

---

### 8. `financial_transactions` (Transações Financeiras)

**Descrição:** Registro de todas as transações financeiras (pagamentos, splits, taxas).

```sql
CREATE TABLE financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  professional_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  payment_method text,
  commission_model text CHECK (commission_model IN ('commissioned', 'rental', 'hybrid')),
  amount_cents integer NOT NULL,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  professional_share_cents integer NOT NULL DEFAULT 0,
  clinic_share_cents integer NOT NULL DEFAULT 0,
  is_fee_ledger_pending boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  asaas_wallet_id text,
  asaas_split_payload jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- **TODOS os valores em CENTAVOS** (INTEGER)
- `commission_model`: Modelo de comissão do profissional
  - `commissioned`: Comissão por porcentagem
  - `rental`: Aluguel fixo (profissional fica com 100% menos taxa plataforma)
  - `hybrid`: Mix dos dois modelos
- `is_fee_ledger_pending`: TRUE para pagamentos em dinheiro (taxa cobrada depois)
- `asaas_split_payload`: JSONB com dados do split do Asaas

**Modelos de Comissão:**
1. **Comissionado:** Split automático por porcentagem (`commission_rate`)
2. **Locatário:** Profissional fica com 100% (menos taxa plataforma 6%), paga aluguel fixo mensal
3. **Híbrido:** Mix de % + Aluguel

**Fee Ledger:**
- Pagamentos em dinheiro não passam pelo Asaas
- Taxa da plataforma (6%) é registrada como dívida
- Boleto quinzenal é gerado contra a clínica

**RLS:** Membros da clínica veem apenas transações do seu `clinic_id`.

---

### 9. `products` (Produtos - Comanda/Upsell)

**Descrição:** Catálogo de produtos físicos para venda (comanda, upsell).

```sql
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  cost_cents integer CHECK (cost_cents >= 0),
  sku text,
  barcode text,
  category text,
  stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active boolean NOT NULL DEFAULT true,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `price_cents`: Preço de venda em centavos
- `cost_cents`: Custo do produto (para cálculo de margem)
- `stock_quantity`: Controle de estoque

**RLS:** Admins gerenciam, membros visualizam.

---

### 10. `client_wallet` (Carteira de Cashback)

**Descrição:** Saldo de cashback/créditos por cliente.

```sql
CREATE TABLE client_wallet (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  balance_cents integer NOT NULL DEFAULT 0 CHECK (balance_cents >= 0),
  total_earned_cents integer NOT NULL DEFAULT 0 CHECK (total_earned_cents >= 0),
  total_spent_cents integer NOT NULL DEFAULT 0 CHECK (total_spent_cents >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, client_id)
);
```

**Campos Importantes:**
- `balance_cents`: Saldo atual disponível
- `total_earned_cents`: Total ganho em cashback (histórico)
- `total_spent_cents`: Total gasto em cashback (histórico)

**Regras de Cashback:**
- Cliente pode usar até 33% do valor do serviço em cashback
- Multiplicador padrão: 3x (ex: R$ 100 gasto = R$ 3 cashback)

**RLS:**
- Clientes veem apenas seu próprio wallet
- Admins podem gerenciar wallets (créditos manuais)

---

### 11. `appointment_evolutions` (Evoluções/Prontuário)

**Descrição:** Registro de evoluções médicas por agendamento.

```sql
CREATE TABLE appointment_evolutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  appointment_id uuid NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  professional_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  evolution_text text NOT NULL,
  evolution_type text CHECK (evolution_type IN ('initial', 'progress', 'final', 'observation')),
  is_required boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `evolution_text`: Texto da evolução (obrigatório)
- `evolution_type`: Tipo de evolução
- `is_required`: Flag para evoluções obrigatórias (Gaby pode alertar)

**RLS:**
- Profissionais gerenciam suas próprias evoluções
- Admins podem ver todas as evoluções do `clinic_id`

---

### 12. `gaby_rules` (Regras da Gaby - IA)

**Descrição:** Configuração de regras do motor de inteligência Gaby.

```sql
CREATE TABLE gaby_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  rule_type text CHECK (rule_type IN ('retention', 'upsell', 'cashback', 'pricing')),
  rule_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Tipos de Regras:**
- `retention`: Regras de retenção de clientes
- `upsell`: Regras de venda adicional
- `cashback`: Regras de cashback
- `pricing`: Regras de precificação

**Gaby:** Motor de regras configurável, não chatbot. Alerta sobre:
- Margem de lucro baixa
- Clientes que não retornam
- Possíveis fraudes operacionais

---

### 13. `client_retention_data` (Dados de Retenção)

**Descrição:** Rastreamento de retenção por cliente/serviço.

```sql
CREATE TABLE client_retention_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  last_visit_date date,
  service_cycle_days integer DEFAULT 45,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, service_id)
);
```

**Campos Importantes:**
- `last_visit_date`: Última visita do cliente para o serviço
- `service_cycle_days`: Ciclo esperado de retorno (ex: 45 dias)

---

### 14. `organization_settings` (Configurações da Clínica)

**Descrição:** Configurações gerais da clínica (Gaby, modo solo, etc).

```sql
CREATE TABLE organization_settings (
  clinic_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  solo_mode boolean DEFAULT false,
  gaby_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

**Campos Importantes:**
- `solo_mode`: TRUE se a clínica opera sem recepção (profissional faz checkout)
- `gaby_config`: Configurações JSONB da Gaby

---

### 15. `audit_logs` (Logs de Auditoria)

**Descrição:** Log de ações do Super Admin.

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  super_admin_id uuid NOT NULL,
  target_user_id uuid,
  target_organization_id uuid,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

**Nota:** Esta tabela ainda usa `target_organization_id` (não foi migrada para `target_clinic_id` por ser apenas auditoria).

**RLS:** Apenas Super Admin tem acesso.

---

### 16. `blocks` e `time_offs` (Bloqueios e Afastamentos)

**Descrição:** Controle de disponibilidade (bloqueios de agenda, afastamentos).

**Estrutura similar:**
- `clinic_id` (NOT NULL)
- `professional_id` (pode ser NULL para bloqueios gerais)
- `start_time`, `end_time`
- RLS: Profissionais gerenciam seus próprios, admins veem todos do `clinic_id`

---

### 17. Supabase Storage - Bucket `avatars`

**Descrição:** Armazenamento de avatares de perfil dos usuários.

**Configuração:**
- Bucket: `avatars`
- Público: Sim (para permitir acesso às imagens)
- Tamanho máximo recomendado: 5MB

**Estrutura de Pastas:**
- `{user_id}/avatar.{ext}` - Avatar do usuário

**Políticas RLS:**
- Usuários autenticados podem fazer upload/update/delete de seus próprios avatares
- Leitura pública permitida (para exibir imagens)

**Nota:** O bucket deve ser criado manualmente no Dashboard do Supabase (Storage → New bucket).

---

## 🔗 RELACIONAMENTOS PRINCIPAIS

```
organizations (1) ──< (N) profiles
organizations (1) ──< (N) clients
organizations (1) ──< (N) services
organizations (1) ──< (N) appointments
organizations (1) ──< (N) financial_transactions
organizations (1) ──< (N) products
organizations (1) ──< (N) gaby_rules
organizations (1) ──< (N) client_retention_data
organizations (1) ──< (1) organization_settings

profiles (1) ──< (0..1) professionals (via professional_id)
profiles (1) ──< (N) appointments (via professional_id)

clients (1) ──< (N) appointments (via client_id)
clients (1) ──< (1) client_wallet (via client_id + clinic_id)

services (1) ──< (N) appointments (via service_id)
services (N) ──< (N) professionals (via professional_services)

appointments (1) ──< (N) appointment_evolutions
appointments (1) ──< (0..1) financial_transactions
```

---

## 🔐 POLÍTICAS RLS POR ROLE

### Super Admin (`super_admin`)
- ✅ Acesso total a todas as tabelas
- ✅ Pode criar e gerenciar clínicas
- ✅ Pode impersonar usuários (via Edge Function)

### Admin/Owner (`admin`, `owner`)
- ✅ CRUD completo dentro do `clinic_id`
- ✅ Pode gerenciar outros admins/recepcionistas
- ✅ Acesso a relatórios e financeiro do `clinic_id`

### Profissional (`professional`)
- ✅ Agenda: apenas agendamentos onde `professional_id = auth.uid()`
- ✅ Clientes: apenas os que têm agendamentos com ele (política RLS usa EXISTS com subquery em `appointments`)
- ✅ Evoluções: pode criar/editar suas próprias evoluções
- ❌ NÃO vê agenda financeira global da clínica
- ❌ NÃO vê todos os clientes da clínica (apenas os com agendamentos)

### Recepcionista (`receptionist`)
- ✅ **Acesso igual ao Admin** em `appointments` e `clients` (SELECT, INSERT, UPDATE, DELETE)
- ✅ Pode gerenciar agendamentos e clientes do `clinic_id`
- ✅ Acesso a checkout e comanda
- ✅ Visão completa da agenda (necessário para agilidade operacional)

### Cliente (`client`)
- ✅ Agendamentos: apenas os seus (`client_id = auth.uid()`)
  - **Funciona porque:** `clients.id = profiles.id = auth.uid()` (garantido pelo trigger)
- ✅ Wallet: apenas seu próprio saldo
- ✅ Perfil: apenas seus próprios dados (`id = auth.uid()`)
- ✅ Pode criar seu próprio registro em `clients` (com `id = auth.uid()`)
- ❌ NÃO vê dados de outros clientes ou financeiro

---

## ⚠️ REGRAS CRÍTICAS DE NEGÓCIO

### 1. Multi-Tenant
- **SEMPRE** filtrar por `clinic_id` em queries
- **NUNCA** criar tabelas sem `clinic_id` (exceto `organizations` e `audit_logs`)
- **SEMPRE** validar que o usuário pertence ao `clinic_id` antes de operações

### 1.1. Vínculo Cliente-Auth (CRÍTICO)
- **`clients.id` DEVE ser igual a `profiles.id` (auth.uid())** quando cliente se cadastra
- Trigger `handle_new_client_profile` cria automaticamente registro em `clients` quando `profile` com `role='client'` é criado
- **Cadastro de Cliente:** Nome + Telefone (email opcional) → Sistema cria:
  1. `auth.users` (Supabase Auth)
  2. `profiles` (role='client', clinic_id)
  3. `clients` (id = auth.uid(), via trigger automático)
- Isso garante que políticas RLS funcionem: `clients.id = auth.uid()` permite acesso correto

### 2. Valores Financeiros
- **SEMPRE** usar INTEGER em centavos
- **NUNCA** usar FLOAT, NUMERIC ou DECIMAL para valores monetários
- **SEMPRE** converter para reais na apresentação: `(cents / 100).toFixed(2)`

### 3. Agendamentos
- `client_id` é **OBRIGATÓRIO** (NOT NULL)
- `professional_id` pode ser NULL (agendamentos gerais)
- Status segue fluxo específico (ver seção `appointments`)

### 4. Split Financeiro
- Taxa plataforma padrão: 6%
- Modelos de comissão (em `professionals`):
  - `commissioned`: Profissional paga X% (`commission_rate`) para a clínica
  - `rental`: Profissional paga valor fixo mensal (`rental_base_cents`) para a clínica
  - `hybrid`: Profissional paga fixo mensal + X% sobre serviços
- **IMPORTANTE:** O profissional PAGA para a clínica (não recebe). A clínica também paga 6% para a plataforma.
- Pagamentos em dinheiro geram `is_fee_ledger_pending = true`

### 5. Cashback
- Máximo de uso: 33% do valor do serviço
- Multiplicador padrão: 3x (ex: R$ 100 gasto = R$ 3 cashback)
- Saldo não pode ser negativo (CHECK constraint)
- `cashback_earned_cents` em `appointments`: Valor ganho pelo cliente no agendamento
- Atualizado no checkout quando o profissional concede cashback

---

## 📝 CHECKLIST PARA NOVAS IMPLEMENTAÇÕES

Ao criar novas tabelas ou funcionalidades, verificar:

- [ ] Tabela tem `clinic_id uuid NOT NULL REFERENCES organizations(id)`?
- [ ] Valores monetários estão em centavos (INTEGER)?
- [ ] RLS está habilitado e políticas criadas?
- [ ] Timestamps `created_at` e `updated_at` estão presentes?
- [ ] Primary key é UUID com `gen_random_uuid()`?
- [ ] Foreign keys têm `ON DELETE CASCADE` ou `ON DELETE SET NULL` apropriado?
- [ ] Constraints CHECK estão definidas onde necessário?
- [ ] Índices foram criados para `clinic_id` e FKs importantes?
- [ ] **Se for tabela relacionada a clientes:** `clients.id = profiles.id = auth.uid()` está garantido?
- [ ] **Se for política RLS para recepcionista:** Tem acesso igual ao admin?
- [ ] **Se for política RLS para profissional:** Usa EXISTS para filtrar apenas clientes com agendamentos?

---

## 🚫 ERROS COMUNS A EVITAR

1. ❌ Usar `organization_id` em vez de `clinic_id`
2. ❌ Usar FLOAT/NUMERIC para valores monetários
3. ❌ Criar tabelas sem RLS
4. ❌ Esquecer `clinic_id` em tabelas multi-tenant
5. ❌ Permitir `client_id` NULL em `appointments`
6. ❌ Não validar permissões antes de operações sensíveis
7. ❌ Criar relacionamentos sem considerar isolamento por `clinic_id`
8. ❌ **Criar `clients` com ID diferente de `auth.uid()`** (deve usar trigger automático)
9. ❌ **Permitir que recepcionista tenha menos acesso que admin** (deve ter acesso igual)
10. ❌ **Permitir que profissional veja todos os clientes** (apenas os com agendamentos)

---

---

## 🔧 FUNÇÕES E TRIGGERS AUTOMÁTICOS

### `handle_new_client_profile()`
**Tipo:** Trigger Function  
**Tabela:** `profiles`  
**Quando:** AFTER INSERT OR UPDATE (quando `role = 'client'`)

**Função:** Cria automaticamente registro em `clients` quando um `profile` com `role='client'` é criado.

**Garante:**
- `clients.id = profiles.id = auth.uid()`
- Dados básicos são copiados do `profile` para `clients`
- Atualiza dados se registro já existir (ON CONFLICT)

### `get_my_clinic_id()`
**Tipo:** Function  
**Retorno:** `uuid`

**Função:** Retorna o `clinic_id` do usuário autenticado (`auth.uid()`).

**Uso:** Facilita criação de políticas RLS mais simples.

---

---

## 📦 EDGE FUNCTIONS (Supabase)

### `process-payment`
**Descrição:** Processa pagamentos e calcula split financeiro.

**Payload:**
```typescript
{
  clinic_id: string (UUID),
  appointment_id?: string (UUID),
  professional_id: string (UUID),
  amount_cents: number,
  platform_fee_percent?: number (default 0.06),
  commission_model?: 'commissioned' | 'rental' | 'hybrid',
  commission_rate?: number,
  rental_base_cents?: number,
  payment_method?: string
}
```

**Retorno:**
- Calcula split (platform_fee, professional_share, clinic_share)
- Registra em `financial_transactions`
- Retorna resultado do split e dados do Asaas

### `fee-ledger-billing`
**Descrição:** Gera boletos quinzenais para taxas pendentes (pagamentos em dinheiro).

**Funcionamento:**
- Busca transações com `is_fee_ledger_pending = true`
- Agrupa por `clinic_id`
- Gera boleto simulado (substituir por integração Asaas real)
- Atualiza status para 'billed'

### `impersonate-login`
**Descrição:** Permite Super Admin fazer login como outro usuário (God Mode).

**Payload:**
```typescript
{
  super_admin_id: string (UUID),
  target_user_id: string (UUID),
  target_organization_id: string (UUID),
  two_fa_code: string
}
```

**Retorno:**
- Token JWT temporário (30 minutos)
- Registra ação em `audit_logs`

---

**Última Atualização:** Dezembro 2024  
**Versão do Schema:** 2.4 (Com professional_goals detalhado, tax_rate_percent em services, profit_margin_cents e clinic_fee_cents)

