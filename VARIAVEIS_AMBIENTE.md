# 🔐 Variáveis de Ambiente - Clinic Flow

Este documento lista todas as variáveis de ambiente necessárias para o funcionamento do sistema.

---

## 📋 Variáveis do Frontend (Vite)

Essas variáveis devem começar com `VITE_` para serem acessíveis no frontend.

### Supabase

```bash
# URL do seu projeto Supabase
VITE_SUPABASE_URL=https://seu-projeto.supabase.co

# Chave anônima (pública) - usada no frontend
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
```

**Onde obter:**
1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. Vá em Settings > API
4. Copie a URL e a chave `anon` `public`

---

## 🔒 Variáveis do Backend (Edge Functions)

Essas variáveis são usadas apenas nas Edge Functions do Supabase e NUNCA devem ser expostas no frontend.

### Supabase

```bash
# URL do projeto (já configurado automaticamente)
SUPABASE_URL=https://seu-projeto.supabase.co

# Chave de serviço (privada) - já configurada automaticamente
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui
```

**Onde obter:**
1. Acesse: https://app.supabase.com
2. Vá em Settings > API
3. Copie a chave `service_role` (⚠️ NUNCA exponha no frontend!)

### Asaas

```bash
# Chave de API do Asaas
ASAAS_API_KEY=sua-api-key-asaas-aqui

# URL base da API (opcional, tem valor padrão)
ASAAS_BASE_URL=https://api.asaas.com/v3
```

**Onde obter:**
1. Acesse: https://www.asaas.com
2. Faça login na sua conta
3. Vá em Configurações > Integrações > API
4. Gere ou copie sua chave de API

**Ambientes:**
- **Produção:** `https://api.asaas.com/v3`
- **Sandbox (Testes):** `https://sandbox.asaas.com/api/v3`

---

## ⚙️ Configuração Local (Desenvolvimento)

### 1. Criar arquivo `.env.local` na raiz do projeto `Clinic/`

```bash
# Frontend
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
```

### 2. O arquivo `.env.local` NÃO deve ser commitado no Git!

Adicione ao `.gitignore`:
```
.env.local
.env*.local
```

---

## 🚀 Configuração no Vercel (Produção)

### 1. Acesse o Dashboard do Vercel

1. Vá para: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** > **Environment Variables**

### 2. Adicione as variáveis

**Para Production, Preview e Development:**

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key-aqui
```

**Importante:**
- Variáveis que começam com `VITE_` estarão disponíveis no frontend
- Variáveis sem `VITE_` estarão disponíveis apenas no servidor

---

## 🔧 Configuração nas Edge Functions (Supabase)

### 1. Acesse o Dashboard do Supabase

1. Vá para: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **Edge Functions** > **Settings**

### 2. Adicione as variáveis de ambiente

**Já configuradas automaticamente:**
- `SUPABASE_URL` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅

**Você precisa adicionar:**
- `ASAAS_API_KEY` - Sua chave de API do Asaas
- `ASAAS_BASE_URL` - (Opcional) URL da API do Asaas

### 3. Como adicionar

1. Na página de Settings das Edge Functions
2. Role até "Environment Variables"
3. Clique em "Add new variable"
4. Adicione:
   - **Name:** `ASAAS_API_KEY`
   - **Value:** Sua chave de API do Asaas
   - **Scope:** Production, Preview, Development (marque todos)

---

## ✅ Checklist de Configuração

### Desenvolvimento Local
- [ ] Arquivo `.env.local` criado na raiz do projeto `Clinic/`
- [ ] `VITE_SUPABASE_URL` configurado
- [ ] `VITE_SUPABASE_ANON_KEY` configurado
- [ ] Arquivo `.env.local` adicionado ao `.gitignore`

### Vercel (Produção)
- [ ] Variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` configuradas
- [ ] Variáveis disponíveis em Production, Preview e Development

### Supabase Edge Functions
- [ ] `ASAAS_API_KEY` configurada
- [ ] `ASAAS_BASE_URL` configurada (ou usando valor padrão)
- [ ] Variáveis disponíveis em todos os ambientes

---

## 🔍 Verificação

### Frontend

Para verificar se as variáveis estão configuradas no frontend:

```javascript
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL)
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não configurado')
```

### Edge Functions

Para verificar nas Edge Functions, adicione um log:

```typescript
console.log('ASAAS_API_KEY:', Deno.env.get('ASAAS_API_KEY') ? '✅ Configurado' : '❌ Não configurado')
```

---

## ⚠️ Segurança

### ❌ NUNCA faça:

1. ❌ Commitar arquivos `.env` ou `.env.local` no Git
2. ❌ Expor `SUPABASE_SERVICE_ROLE_KEY` no frontend
3. ❌ Expor `ASAAS_API_KEY` no frontend
4. ❌ Compartilhar chaves de API em mensagens ou emails
5. ❌ Usar chaves de produção em ambiente de desenvolvimento

### ✅ SEMPRE faça:

1. ✅ Use `.env.local` para desenvolvimento local
2. ✅ Configure variáveis no Vercel para produção
3. ✅ Configure variáveis nas Edge Functions do Supabase
4. ✅ Use ambiente Sandbox do Asaas para testes
5. ✅ Mantenha chaves de API seguras e rotacione-as regularmente

---

## 📞 Suporte

Se tiver problemas com variáveis de ambiente:

1. Verifique se todas as variáveis estão configuradas
2. Verifique se os nomes estão corretos (case-sensitive)
3. Verifique se as variáveis do frontend começam com `VITE_`
4. Reinicie o servidor de desenvolvimento após alterar `.env.local`
5. Faça um novo deploy no Vercel após alterar variáveis

---

**Última atualização:** $(date)

