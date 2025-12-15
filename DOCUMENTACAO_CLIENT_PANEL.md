# 📋 DOCUMENTAÇÃO COMPLETA - CLIENT PANEL (`/client/dashboard`)

## 🎯 VISÃO GERAL

O **ClientPanel** é o painel de autoatendimento para clientes finais, permitindo que visualizem seus agendamentos em tempo real, histórico, cashback e informações pessoais.

---

## 🔐 PERMISSÕES E SEGURANÇA

### ✅ **Autenticação**
- **Rota protegida**: `/client/dashboard`
- **Componente**: `ProtectedRoute` que verifica `currentUser` do `SchedulerContext`
- **Redirecionamento**: Usuários não autenticados são redirecionados para `/login`
- **Carregamento**: Exibe loading durante verificação de sessão

### ⚠️ **PROBLEMA IDENTIFICADO: FALTA VERIFICAÇÃO DE ROLE**
```typescript
// ❌ ATUAL: Não verifica se o usuário tem role 'client'
// Apenas verifica se está autenticado

// ✅ DEVERIA: Verificar role específico
if (currentUser?.role !== 'client') {
  return <Navigate to="/unauthorized" replace />
}
```

### 🔒 **Isolamento de Dados**
- ✅ Usa `currentUser?.id` como `clientId` - **Seguro**
- ✅ Dados fictícios são criados apenas em memória (não salvam no banco)
- ⚠️ **PROBLEMA**: Não há validação se `clientId` realmente pertence a um cliente na tabela `clients`
- ⚠️ **PROBLEMA**: Atualização de dados do cliente pode falhar silenciosamente

---

## 📦 ESTRUTURA DE COMPONENTES

### 1. **ClientPanel** (Componente Principal)
**Localização**: `src/panels/ClientPanel.tsx`

**Responsabilidades**:
- Gerenciar estado geral do painel
- Carregar dados do cliente
- Renderizar Header, CurrentAppointmentCard e ClientInfoCard
- Criar dados fictícios para visualização (apenas em memória)

**Hooks utilizados**:
- `useScheduler()` - Contexto global com `currentUser`, `clients`, `signOut`, `updateUserProfile`
- `useState` - Estado local do componente
- `useMemo` - Otimização de dados do cliente
- `useEffect` - Carregamento de dados fictícios

---

### 2. **Header Component**
**Linha 213-270**

**Funcionalidades**:
- Exibe saudação com nome do usuário
- Mostra role do usuário
- **Saldo de Cashback** (em verde, destacado)
- Botão de notificações (ícone Bell)
- Avatar do usuário (clicável para abrir modal de perfil)
- Botão de logout

**Dados**:
- `userName`: `currentUser?.fullName || client?.name || 'Usuário'`
- `cashbackBalance`: Formatação de centavos para reais (dividido por 100)
- `avatarUrl`: `currentUser?.avatarUrl || ''`

---

### 3. **CurrentAppointmentCard Component**
**Linha 272-398**

**Funcionalidades**:
- **Status do atendimento atual em tempo real**
- Exibe: Serviço, Profissional, Valor
- **Timer contador**: Tempo decorrido desde o início do atendimento
- **Timeline visual** com 5 etapas:
  1. ✅ Check-in (quando cliente chega)
  2. ✅ Início (quando profissional inicia)
  3. ✅ Observações/Anamnese (quando médico finaliza observações)
  4. ✅ Check-out/Pagamento (quando pagamento é processado)
  5. ⚠️ **Avaliação** (TODO - não implementado)

**Lógica de Timeline**:
```typescript
const steps = [
  { key: 'checkin', completed: !!checkInTime },
  { key: 'start', completed: !!startTime },
  { key: 'notes', completed: appointment.status === 'medical_done' },
  { key: 'checkout', completed: appointment.status === 'completed' },
  { key: 'review', completed: false }, // TODO
]
```

**Estados do Appointment**:
- `check_in_time` / `checkInTime`: Timestamp do check-in
- `start_time_actual` / `startTime`: Timestamp do início do atendimento
- `status`: `'in_progress' | 'medical_done' | 'completed' | ...`

**⚠️ PROBLEMAS IDENTIFICADOS**:
1. Timer usa `differenceInMinutes` que pode dar valores negativos se `startTime` for no futuro
2. Não há tratamento de erro se `startTime` não existir
3. Timeline assume que o status 'completed' significa checkout feito, mas não garante

---

### 4. **ClientInfoCard Component**
**Linha 400-695**

**Funcionalidades**:
- **Edição de informações pessoais**: Nome, Email, Telefone
- **Ficha de Anamnese**: Visualização (read-only no momento)
- **Histórico de Agendamentos**: Lista com nome do procedimento, data, profissional e cashback ganho
- **Serviços Mais Executados**: Top serviços com cashback total ganho

**Dados Carregados (FICTÍCIOS - em memória)**:
```typescript
// Linha 415-474
- Anamnese fictícia
- Histórico de 3 agendamentos passados
- Top 3 serviços mais executados
```

**⚠️ PROBLEMA CRÍTICO**: 
- **TODOS os dados são fictícios e não vêm do banco de dados**
- Para produção, precisa buscar dados reais do Supabase
- Histórico não é carregado de `appointments` do banco
- Serviços mais executados não são calculados do banco

**Edição de Informações**:
```typescript
// Linha 146-173
onUpdate={async (updatedClient) => {
  // Atualiza tabela 'clients'
  await supabase.from('clients').update({...}).eq('id', clientId)
  // Atualiza tabela 'profiles' se necessário
  await supabase.from('profiles').update({...}).eq('id', clientId)
}
```

**⚠️ PROBLEMAS**:
1. Não há validação de email ou telefone antes de salvar
2. Não há feedback visual de sucesso/erro (apenas `alert`)
3. Erro silencioso se tabela `clients` não tiver registro do cliente
4. Não atualiza o estado local após sucesso

---

## 📊 FLUXOS DE DADOS

### **Fluxo 1: Carregamento Inicial**
```
1. Usuário acessa /client/dashboard
2. ProtectedRoute verifica autenticação
3. ClientPanel monta
4. useEffect cria dados fictícios em memória
5. Componentes renderizam com dados fictícios
```

**⚠️ PROBLEMA**: Sempre cria dados fictícios, mesmo com cliente real logado

### **Fluxo 2: Atendimento em Andamento**
```
1. Secretária faz check-in → atualiza appointment.check_in_time
2. Profissional inicia atendimento → atualiza appointment.start_time_actual
3. Profissional finaliza observações → status = 'medical_done'
4. Checkout (profissional/recepcionista) → status = 'completed'
5. PaymentConfirmationModal aparece → cliente avalia
```

**✅ Funciona**: Timeline atualiza em tempo real baseado em status

**⚠️ PROBLEMA**: ClientPanel não usa Realtime do Supabase para atualizar automaticamente

### **Fluxo 3: Cashback**
```
1. Checkout → profissional decide dar cashback
2. QuickCheckoutModal processa cashback
3. Adiciona cashback ao client_wallets
4. Salva cashback_earned_cents no appointment
5. PaymentConfirmationModal mostra cashback ganho
6. Header atualiza saldo de cashback
```

**⚠️ PROBLEMA**: Header não atualiza automaticamente após checkout (precisa recarregar)

---

## 🔄 INTEGRAÇÕES COM OUTROS COMPONENTES

### **QuickCheckoutModal**
- **Localização**: `src/components/Checkout/QuickCheckoutModal.tsx`
- **Integração**: Após checkout, abre `PaymentConfirmationModal`
- **Dados salvos**: `cashback_earned_cents` no appointment (linha 286-290)

**⚠️ PROBLEMA**: 
- Coluna `cashback_earned_cents` pode não existir na tabela `appointments`
- Precisa verificar se coluna existe ou criar migration

### **PaymentConfirmationModal**
- **Localização**: `src/components/Checkout/PaymentConfirmationModal.tsx`
- **Funcionalidades**:
  - Confirmação de pagamento
  - Exibição de cashback ganho
  - Sistema de avaliação (5 estrelas + comentário)
  - Salva avaliação em `appointment_ratings` (se tabela existir)

**⚠️ PROBLEMAS**:
1. Tabela `appointment_ratings` pode não existir
2. Erro é silencioso (apenas console.warn)
3. Não há garantia que avaliação foi salva

### **UserProfileModal**
- Usado para editar perfil do usuário
- Abre ao clicar no avatar no Header

---

## 📋 REGRAS DE NEGÓCIO APLICADAS

### ✅ **Regras Implementadas**:
1. **Cashback máximo de 33% do valor do serviço** (QuickCheckoutModal)
2. **Cashback acumula no wallet do cliente** (client_wallets)
3. **Apenas cliente logado vê seus próprios dados** (usa currentUser.id)
4. **Dados fictícios não são salvos no banco** (apenas em memória)

### ⚠️ **Regras FALTANDO**:
1. ❌ Validação de formato de email/telefone
2. ❌ Limite de caracteres em campos de edição
3. ❌ Confirmação antes de salvar alterações
4. ❌ Tratamento de erros de rede/timeout
5. ❌ Loading states durante atualizações
6. ❌ Atualização automática via Realtime

---

## 🐛 PROBLEMAS CRÍTICOS IDENTIFICADOS

### 🔴 **CRÍTICO - Dados Fictícios Sempre Carregados**
**Localização**: Linha 78-83
```typescript
useEffect(() => {
  if (dataCreated) return
  createFictionalDataInMemory() // ⚠️ Sempre cria, mesmo com cliente real
}, [dataCreated])
```

**Impacto**: Cliente real não verá seus dados reais

**Solução**: Verificar se há dados reais no banco antes de criar fictícios

---

### 🔴 **CRÍTICO - Falta Verificação de Role**
**Localização**: `ProtectedRoute.tsx`
```typescript
// ❌ Não verifica se role === 'client'
```

**Impacto**: Qualquer usuário autenticado pode acessar o painel do cliente

**Solução**: Adicionar verificação de role

---

### 🟡 **MODERADO - Coluna cashback_earned_cents Pode Não Existir**
**Localização**: `QuickCheckoutModal.tsx:289`
```typescript
await supabase
  .from('appointments')
  .update({ cashback_earned_cents: cashbackEarnedAmount }) // ⚠️ Coluna pode não existir
```

**Impacto**: Update pode falhar silenciosamente

**Solução**: Verificar schema da tabela ou criar migration

---

### 🟡 **MODERADO - Sem Realtime Updates**
**Localização**: Todo o ClientPanel

**Impacto**: Cliente precisa recarregar página para ver mudanças

**Solução**: Implementar Supabase Realtime subscriptions

---

### 🟡 **MODERADO - Histórico Não Vem do Banco**
**Localização**: `ClientInfoCard.tsx:429-457`

**Impacto**: Cliente não vê histórico real

**Solução**: Buscar appointments do banco com `status = 'completed'`

---

### 🟢 **BAIXO - Falta Validação de Formulário**
**Localização**: `ClientInfoCard.tsx:490-546`

**Impacto**: Pode salvar dados inválidos

**Solução**: Adicionar validação antes de salvar

---

## ✅ MELHORIAS RECOMENDADAS

### 1. **Carregar Dados Reais do Banco**
```typescript
// Buscar appointments reais
const { data: appointments } = await supabase
  .from('appointments')
  .select(`
    *,
    service:services(name, price),
    professional:profiles(full_name),
    cashback_earned_cents
  `)
  .eq('client_id', clientId)
  .eq('status', 'completed')
  .order('start_time', { ascending: false })
```

### 2. **Implementar Realtime**
```typescript
useEffect(() => {
  const channel = supabase
    .channel('appointments')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'appointments',
      filter: `client_id=eq.${clientId}`
    }, (payload) => {
      // Atualizar estado
    })
    .subscribe()

  return () => { channel.unsubscribe() }
}, [clientId])
```

### 3. **Validação de Formulários**
```typescript
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
const validatePhone = (phone: string) => /^[\d\s()+-]+$/.test(phone)
```

### 4. **Loading States**
```typescript
const [isUpdating, setIsUpdating] = useState(false)
// Mostrar spinner durante atualização
```

### 5. **Toast Notifications**
```typescript
// Substituir alert() por toast.success/toast.error
toast.success('Informações atualizadas com sucesso!')
```

### 6. **Tratamento de Erros**
```typescript
try {
  await onUpdate(formData)
} catch (err) {
  if (err.code === 'PGRST116') {
    // Cliente não encontrado
  } else if (err.code === '23505') {
    // Email duplicado
  }
  // ...
}
```

---

## 📝 CHECKLIST PARA PRODUÇÃO

### ✅ Segurança
- [ ] Adicionar verificação de role 'client' no ProtectedRoute
- [ ] Validar que clientId pertence ao usuário logado
- [ ] Implementar RLS policies para appointments do cliente
- [ ] Sanitizar inputs antes de salvar

### ✅ Dados
- [ ] Substituir dados fictícios por busca real no banco
- [ ] Verificar se coluna `cashback_earned_cents` existe em `appointments`
- [ ] Verificar se tabela `appointment_ratings` existe
- [ ] Criar migration se necessário

### ✅ UX
- [ ] Implementar Realtime updates
- [ ] Adicionar loading states
- [ ] Substituir alerts por toasts
- [ ] Adicionar validação de formulários
- [ ] Implementar tratamento de erros robusto

### ✅ Funcionalidades
- [ ] Implementar avaliação completa (já existe modal, falta integração)
- [ ] Carregar histórico real do banco
- [ ] Calcular serviços mais executados do banco
- [ ] Atualizar saldo de cashback automaticamente após checkout

---

## 🎯 CONCLUSÃO

O **ClientPanel** está **80% funcional** para ambiente de desenvolvimento/testes, mas precisa de **refatorações críticas** para produção:

1. **CRÍTICO**: Substituir dados fictícios por dados reais
2. **CRÍTICO**: Adicionar verificação de role
3. **IMPORTANTE**: Implementar Realtime
4. **IMPORTANTE**: Validar schema do banco (colunas faltando)
5. **DESEJÁVEL**: Melhorar UX (loading, toasts, validações)

**Pronto para testes**: ✅ Sim (com dados fictícios)  
**Pronto para produção**: ❌ Não (precisa das correções acima)

