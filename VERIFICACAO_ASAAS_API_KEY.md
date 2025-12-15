# ✅ VERIFICAÇÃO: Configuração da API KEY do Asaas

**Data:** 2025-01-14

---

## 🔍 EDGE FUNCTIONS QUE USAM A API KEY

As seguintes Edge Functions requerem a variável de ambiente `ASAAS_API_KEY`:

1. ✅ **`create-subscription`** - Cria assinaturas recorrrentes
2. ✅ **`cancel-subscription`** - Cancela assinaturas
3. ✅ **`create-asaas-subaccount`** - Cria subcontas para KYC

**Todas usam:** `const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!`

---

## ⚙️ COMO CONFIGURAR NO SUPABASE

### Passo 1: Acessar o Dashboard do Supabase

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions** → **Secrets**

### Passo 2: Adicionar a Variável de Ambiente

1. Clique em **"Add new secret"**
2. **Nome:** `ASAAS_API_KEY`
3. **Valor:** Cole sua chave API do Asaas (ex: `$aact_YTU5YTE0M2M2N2I4MTIx...`)
4. Clique em **"Save"**

### Passo 3: Verificar Configuração

A variável deve aparecer na lista de secrets com o nome `ASAAS_API_KEY`.

---

## 🔐 ONDE OBTER A API KEY DO ASAAS

1. Acesse: https://www.asaas.com/
2. Faça login na sua conta
3. Vá em **Configurações** → **Integrações** → **API**
4. Copie a **Chave de API** (formato: `$aact_...`)

**⚠️ IMPORTANTE:**
- Use a chave de **Produção** para ambiente de produção
- Use a chave de **Sandbox** para testes
- Nunca compartilhe ou commite a chave no código

---

## ✅ VERIFICAÇÃO DE CONFIGURAÇÃO

### Teste Manual (via Supabase CLI ou Dashboard)

**Opção 1: Via Supabase Dashboard**
1. Vá em **Edge Functions** → Selecione uma função (ex: `create-subscription`)
2. Clique em **"Invoke"** ou **"Test"**
3. Verifique os logs - se aparecer erro sobre `ASAAS_API_KEY`, a variável não está configurada

**Opção 2: Via Código de Teste**

Crie uma Edge Function temporária para testar:

```typescript
// supabase/functions/test-asaas-key/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const apiKey = Deno.env.get('ASAAS_API_KEY')
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ 
        error: 'ASAAS_API_KEY não configurada',
        status: 'missing'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
  
  // Verificar se a chave está no formato correto
  const isValidFormat = apiKey.startsWith('$aact_') || apiKey.startsWith('$aact_YTU5')
  
  return new Response(
    JSON.stringify({ 
      status: 'ok',
      configured: true,
      format_valid: isValidFormat,
      key_length: apiKey.length,
      key_preview: apiKey.substring(0, 10) + '...' // Primeiros 10 caracteres
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
```

**Deploy e teste:**
```bash
supabase functions deploy test-asaas-key
supabase functions invoke test-asaas-key
```

---

## 🚨 PROBLEMAS COMUNS

### Erro: "ASAAS_API_KEY não está definida"

**Causa:** Variável não configurada no Supabase Dashboard

**Solução:**
1. Acesse Supabase Dashboard → Settings → Edge Functions → Secrets
2. Adicione `ASAAS_API_KEY` com o valor da sua chave
3. Aguarde alguns segundos para propagação
4. Teste novamente

### Erro: "Unauthorized" ou "401" ao chamar API do Asaas

**Causa:** Chave API inválida ou expirada

**Solução:**
1. Verifique se a chave está correta no Dashboard do Asaas
2. Gere uma nova chave se necessário
3. Atualize no Supabase Dashboard
4. Teste novamente

### Erro: "Invalid API key format"

**Causa:** Formato da chave incorreto

**Solução:**
- A chave deve começar com `$aact_`
- Verifique se não há espaços extras
- Copie e cole novamente no Supabase Dashboard

---

## 📋 CHECKLIST DE VERIFICAÇÃO

- [ ] API KEY obtida do Dashboard do Asaas
- [ ] Variável `ASAAS_API_KEY` adicionada no Supabase Dashboard
- [ ] Valor da chave está correto (formato `$aact_...`)
- [ ] Teste manual executado com sucesso
- [ ] Edge Functions podem acessar a variável

---

## 🔗 LINKS ÚTEIS

- **Supabase Dashboard:** https://supabase.com/dashboard
- **Asaas Dashboard:** https://www.asaas.com/
- **Documentação Asaas API:** https://docs.asaas.com/

---

**Última Atualização:** 2025-01-14
