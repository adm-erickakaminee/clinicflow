# 📋 ROADMAP DE EXECUÇÃO - BELEZA SYNC (MASTERPLAN)

**Status:** Em Desenvolvimento

**Visual:** Estilo Bento Grid & Glassmorphism

**Prioridade:** Mobile First (Pro/Cliente) & Performance (Recepção)

---

## 🏗️ FASE 0: FUNDAÇÃO (SETUP)

- [ ] **0.1 Cérebro:** Criar `.cursorrules` com regras de stack e proibições.

- [ ] **0.2 UI Premium:** Configurar Tailwind (fontes Inter, cores, rounded-3xl) e instalar componentes Shadcn base.

- [ ] **0.3 Banco:** Validar schema e blindar RLS para os 4 perfis.

## 👩‍💼 FASE 1: OPERACIONAL (RECEPÇÃO)

- [ ] **1.1 Agenda Unificada (Visual Command Center):**

    - [ ] Layout 3 Colunas: Lista Pro (Esq) | Calendário (Meio) | Detalhes Cliente (Dir).

    - [ ] Visualização por Recursos (Colunas de Profissionais).

    - [ ] Drag & Drop com validação.

- [ ] **1.2 Checkout & Comanda:**

    - [ ] Modal `QuickCheckout` com Upsell (Busca de produtos).

    - [ ] Integração com itens adicionados na sala pelo profissional.

## 👩‍⚕️ FASE 2: PROFISSIONAL (MOBILE)

- [ ] **2.1 Dashboard Mobile:** Layout vertical, Prontuário com Swipe.

- [ ] **2.2 Fluxo de Atendimento:** Botão "Add Serviço" (Comanda) e Trava de Evolução Obrigatória.

- [ ] **2.3 Modo Solo:** Checkout completo no mobile (se sem recepção).

## 💳 FASE 3: FINANCEIRO (ASAAS & SPLIT)

- [ ] **3.1 Infraestrutura:** Tabela `financial_transactions` e campos de Wallet ID.

- [ ] **3.2 Motor de Split (Edge Function):**

    - [ ] Lógica para Modelo A (Comissão), B (Aluguel) e C (Híbrido).

    - [ ] Integração API Asaas.

- [ ] **3.3 Fee Ledger:** Cobrança de taxas sobre pagamentos em dinheiro.

## 🤖 FASE 4: GABY (INTELIGÊNCIA)

- [ ] **4.1 Motor de Regras:** Tabela `gaby_rules` e configs JSONB.

- [ ] **4.2 Operacional:** Alertas de Precificação, Retenção e Fraude.

## 👱‍♀️ FASE 5: CLIENTE (PWA)

- [ ] **5.1 Acesso:** Login via WhatsApp (Evolution API) sem senha.

- [ ] **5.2 Agendamento:** Wizard Self-Service com Pagamento de Sinal (Booking Fee).

- [ ] **5.3 Fidelidade:** Carteira de Cashback.

## 👑 FASE 6: SUPER ADMIN

- [ ] Dashboard Global (MRR, Churn) e "God Mode" (Impersonate Login).

## 🎨 FASE 7: POLIMENTO VISUAL (LOGIN & DASHBOARD)

- [ ] **Login Split-Screen:** Imagem Branding (Esq) + Abas Pro/Cliente (Dir).

- [ ] **Dashboard Bento Grid:** Refatorar home com cards modulares.


