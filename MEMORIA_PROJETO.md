# 🧠 MEMÓRIA DO PROJETO: REGRA DE NEGÓCIO E FLUXOS

## 1. PERFIS E JORNADAS

### 👑 Super Admin

- **Painel:** "Torre de Controle". Monitora MRR, Inadimplência e Saúde da API WhatsApp.
- **Poderes:** Acesso irrestrito, bloqueio de clínicas, "God Mode" (logar como cliente).

### 🏢 Clínica (Dono)

- **Painel em 3 Camadas:**
  1. **Manhã (Operacional):** Faturamento Previsto, Ocupação.
  2. **Meio-dia (Financeiro):** Fluxo de Caixa Realtime (Asaas).
  3. **Noite (Blindagem):** Anti-roubo de dados e Fechamento de Caixa.

### 👩‍💼 Recepcionista ("Maria")

- **Painel:** Agenda Unificada (Command Center).
- **Missão:** Agilidade. Atende telefone, WhatsApp e balcão. Precisa ver conflitos e cobrar rápido.

### 👩‍⚕️ Profissional

- **Painel:** Mobile First. Focado em "Agenda do Dia" e "Meu Dinheiro".
- **Fluxo:** Iniciar -> Prontuário (Gaby alerta) -> Add Serviço (Comanda) -> Evolução (Obrigatória) -> Finalizar.

### 👱‍♀️ Cliente Final

- **Painel:** PWA Self-Service.
- **Login:** Apenas celular (OTP).
- **Regra:** Paga Sinal (Booking Fee) para confirmar.

---

## 2. ENGENHARIA FINANCEIRA (SPLIT)

### Modelos de Contratação

1.  **Comissionado (%):** Split automático no checkout.
2.  **Locatário (Aluguel):** Fica com 100% do serviço (menos taxa plataforma). Paga boleto fixo mensal.
3.  **Híbrido:** Mix de % + Aluguel.

### Fee Ledger (Dinheiro Vivo)

- Pagamentos em dinheiro não passam pelo Asaas.
- O sistema registra a taxa da plataforma (6%) como dívida.
- Gera-se um boleto quinzenal contra a clínica cobrando essas taxas.

---

## 3. A GABY (INTELIGÊNCIA)

A Gaby é um **Motor de Regras**, não um Chatbot genérico.

- **Regras:** Configuráveis por clínica (ex: Cashback requer gasto 3x).
- **Atuação:**
    - Alerta sobre margem de lucro baixa.
    - Sugere retorno para clientes sumidos.
    - Bloqueia fraudes operacionais.

## 4. SEGURANÇA (RLS)

- **Isolamento Total:** Dados filtrados por `organization_id`.
- **Cliente:** Só vê o próprio histórico.
- **Profissional:** Não vê agenda financeira global da clínica.


