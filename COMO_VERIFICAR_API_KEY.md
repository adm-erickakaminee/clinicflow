# 🔍 Como Verificar se a API KEY do Asaas Está Configurada

**Data:** 2025-01-14

---

## 🎯 MÉTODO 1: Via Supabase Dashboard (Mais Rápido)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions** → **Secrets**
4. Procure por `ASAAS_API_KEY` na lista
   - ✅ **Se aparecer:** API KEY está configurada
   - ❌ **Se não aparecer:** Precisa adicionar

---

## 🧪 MÉTODO 2: Via Edge Function de Teste

### Passo 1: Deploy da Função de Teste

```bash
cd /Users/rodrigosalgado/Desktop/Clinic\ Flow/Clinic
supabase functions deploy test-asaas-key
```

### Passo 2: Invocar a Função

```bash
supabase functions invoke test-asaas-key
```

### Passo 3: Verificar Resposta

**Se a API KEY estiver configurada:**
```json
{
  "status": "ok",
  "configured": true,
  "format_valid": true,
  "api_test": {
    "ok": true,
    "message": "API Key válida e funcionando!"
  }
}
```

**Se a API KEY NÃO estiver configurada:**
```json
{
  "error": "ASAAS_API_KEY não configurada",
  "status": "missing",
  "message": "Configure a variável ASAAS_API_KEY no Supabase Dashboard..."
}
```

---

## 📝 MÉTODO 3: Via Supabase Dashboard (Invoke Manual)

1. Acesse: https://supabase.com/dashboard
2. Vá em **Edge Functions**
3. Selecione `test-asaas-key`
4. Clique em **"Invoke"** ou **"Test"**
5. Verifique a resposta JSON

---

## 🔐 ONDE OBTER A API KEY (Se Não Tiver)

1. Acesse: https://www.asaas.com/
2. Faça login
3. Vá em **Configurações** → **Integrações** → **API**
4. Copie a **Chave de API** (formato: `$aact_YTU5YTE0M2M2N2I4MTIx...`)

---

## ⚙️ COMO CONFIGURAR NO SUPABASE (Se Não Estiver)

1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions** → **Secrets**
4. Clique em **"Add new secret"**
5. **Nome:** `ASAAS_API_KEY`
6. **Valor:** Cole sua chave API do Asaas
7. Clique em **"Save"**

---

## ✅ VERIFICAÇÃO RÁPIDA

Execute este comando no terminal:

```bash
cd /Users/rodrigosalgado/Desktop/Clinic\ Flow/Clinic
supabase functions invoke test-asaas-key --no-verify-jwt
```

A resposta dirá se a API KEY está configurada ou não.

---

**Nota:** Por segurança, a API KEY não pode ser visualizada diretamente após ser configurada (aparece mascarada). Mas você pode verificar se está configurada usando os métodos acima.
