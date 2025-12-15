# 📝 CHANGELOG - Fluxo de Agendamento do Cliente (Auto-Serviço)

## ✅ Componentes Criados

### 1. **ClientBookingView.tsx** (`src/pages/Client/ClientBookingView.tsx`)

**Funcionalidades:**
- ✅ Seleção de serviço (busca de `services` ativos)
- ✅ Seleção de data (próximos 30 dias)
- ✅ Seleção de horário e profissional (verifica disponibilidade)
- ✅ Geração de slots disponíveis baseado em:
  - `appointments` existentes
  - `blocks` (se tabela existir)
  - Horário de trabalho (8h-18h)
- ✅ Validação de conflitos
- ✅ Criação de appointment com status `'requested'`

**Fluxo:**
1. Cliente seleciona serviço
2. Cliente seleciona data
3. Sistema gera slots disponíveis para profissionais que fazem o serviço
4. Cliente seleciona horário/profissional
5. Confirmação e submissão
6. Appointment criado com `status = 'requested'`

**Conformidade com Schema:**
- ✅ Usa `profiles.id` como `professional_id` (conforme schema)
- ✅ Usa `clinic_id` corretamente
- ✅ Inclui `service_id` no payload
- ✅ Status mapeado via `mapStatusToBackend()`

---

### 2. **RequestQueueCard.tsx** (`src/components/Reception/RequestQueueCard.tsx`)

**Funcionalidades:**
- ✅ Busca appointments com `status = 'requested'`
- ✅ Exibe informações do cliente, serviço, profissional e horário
- ✅ Botão "Confirmar" → muda status para `'pending'`
- ✅ Botão "Rejeitar" → muda status para `'cancelled'`
- ✅ Realtime subscription para atualizações automáticas
- ✅ Loading states e tratamento de erros

**Exibição:**
- Card resumido com informações essenciais
- Contador de solicitações pendentes
- Badge destacando número de pendentes

---

## ✅ Integrações

### **ClientPanel.tsx**
- ✅ Botão "Agendar Novo Serviço" adicionado
- ✅ Modal `ClientBookingView` integrado
- ✅ Recarrega dados após agendamento bem-sucedido

### **ReceptionistPanel.tsx**
- ✅ `RequestQueueCard` integrado na sidebar esquerda
- ✅ Sempre visível no topo da sidebar (antes do AnalyticsHeroCard)
- ✅ Alta visibilidade para confirmação imediata

---

## ✅ Migrations SQL Criadas

### **add_requested_status_to_appointments.sql**
- ✅ Adiciona `'requested'` ao constraint CHECK de status
- ✅ Atualiza comentário da coluna status

**⚠️ PRECISA EXECUTAR:** Execute este SQL antes de usar em produção.

---

## ✅ Atualizações no SchedulerContext

### **mapStatusToBackend()**
- ✅ Adicionado suporte para `'requested'`
- ✅ Mapeia `'requested'` e `'solicitado'` corretamente

### **canUser()**
- ✅ Cliente já pode criar appointments (já estava implementado)
- ✅ Verificação de permissões mantida

---

## 🔐 Conformidade com Schema

### ✅ **professional_id**
- **CORRETO**: Usa `profiles.id` (conforme `appointments.professional_id REFERENCES profiles(id)`)
- **ClientBookingView**: Busca profissionais de `profiles` e usa o `id` diretamente
- **RequestQueueCard**: Usa `profiles` para exibir nome do profissional

### ✅ **Campos do Schema**
- `clinic_id`: ✅ Usado corretamente
- `client_id`: ✅ Usado corretamente (obrigatório)
- `service_id`: ✅ Incluído no payload
- `status`: ✅ `'requested'` suportado

---

## 📋 Checklist de Testes

### Testes do Cliente
- [ ] Cliente consegue abrir modal de agendamento
- [ ] Lista de serviços carrega corretamente
- [ ] Calendário mostra próximos 30 dias
- [ ] Slots disponíveis são gerados corretamente
- [ ] Conflitos com appointments existentes são detectados
- [ ] Appointment é criado com status `'requested'`
- [ ] Mensagem de sucesso aparece

### Testes da Recepcionista
- [ ] Solicitações aparecem no `RequestQueueCard`
- [ ] Informações do cliente, serviço e profissional são exibidas
- [ ] Botão "Confirmar" funciona e muda status para `'pending'`
- [ ] Botão "Rejeitar" funciona e muda status para `'cancelled'`
- [ ] Realtime atualiza quando nova solicitação chega
- [ ] Card desaparece após confirmação/rejeição

---

## ⚠️ Dependências

### Tabelas Necessárias
- ✅ `services` - Para listar serviços
- ✅ `profiles` - Para profissionais (role='professional')
- ✅ `professional_services` - Para vincular profissionais a serviços
- ✅ `appointments` - Para verificar disponibilidade
- ⚠️ `blocks` - Opcional (se não existir, ignora bloqueios)

### Permissões RLS
- ✅ Cliente pode criar appointments (política RLS deve permitir)
- ✅ Recepcionista pode atualizar appointments (já existe)

---

## 🎯 Status

**✅ PRONTO PARA TESTES** (após executar migration SQL)

Todos os componentes foram criados e integrados:
- ✅ ClientBookingView
- ✅ RequestQueueCard
- ✅ Integrações nos painéis
- ✅ Suporte a status 'requested'
- ✅ Conformidade com schema (profiles.id)

**⚠️ AÇÃO NECESSÁRIA:**
1. Execute a migration SQL: `supabase/sql/add_requested_status_to_appointments.sql`


