# 🚀 Ordem de Execução Final - Resolução de Timeout e Erro 500

## ⚠️ IMPORTANTE: Execute nesta ordem exata!

### 1️⃣ PRIMEIRO: Simplificar Políticas RLS (RESOLVE TIMEOUT)

**Arquivo:** `supabase/sql/FIX_RLS_TIMEOUT_SIMPLES.sql`

**O que faz:**
- Remove TODAS as políticas de SELECT complexas
- Cria APENAS política básica: usuário vê seu próprio perfil
- Adiciona índices para performance
- **ZERO subconsultas = ZERO timeout**

**Execute este PRIMEIRO!**

**Resultado esperado:**
- ✅ Query de perfil < 1 segundo
- ✅ Sem timeout
- ⚠️ Admin não verá outros profiles automaticamente (use função RPC se necessário)

---

### 2️⃣ SEGUNDO: Deploy Edge Functions (RESOLVE ERRO 500)

**Arquivos:**
- `supabase/functions/tokenize-card/index.ts`
- `supabase/functions/create-subscription/index.ts`

**Como fazer deploy:**
```bash
cd "/Users/rodrigosalgado/Desktop/Clinic Flow/Clinic"
supabase functions deploy tokenize-card
supabase functions deploy create-subscription
```

**Resultado esperado:**
- ✅ Logs detalhados no Supabase Dashboard
- ✅ Erro 500 com causa identificada nos logs

---

### 3️⃣ TERCEIRO: Verificar Logs

1. Acesse **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Teste o cadastro novamente
3. Verifique os logs para ver a causa exata do erro 500

---

## 🔍 Troubleshooting

### Se o timeout persistir:

Execute este SQL para verificar:
```sql
-- Verificar políticas ativas
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'SELECT';

-- Deve retornar APENAS: "Users can view own profile"
```

### Se o erro 500 persistir:

1. **Verificar logs:**
   - Supabase Dashboard → Edge Functions → Logs
   - Procure por mensagens começando com `❌`

2. **Verificar variáveis de ambiente:**
   - Supabase Dashboard → Settings → Edge Functions
   - Confirme `ASAAS_API_KEY` está configurada

3. **Testar função manualmente:**
   - Use o JSON de `TESTE_EDGE_FUNCTIONS.md`
   - Verifique se retorna erro ou sucesso

---

## ✅ Checklist Final

- [ ] SQL `FIX_RLS_TIMEOUT_SIMPLES.sql` executado
- [ ] Apenas 1 política de SELECT ativa (verificar com query acima)
- [ ] Edge Functions deployadas
- [ ] Logs verificados no Supabase Dashboard
- [ ] Timeout resolvido (< 1 segundo)
- [ ] Erro 500 identificado nos logs

---

## 📊 Resultado Esperado

**Antes:**
- ❌ Timeout após 3 segundos
- ❌ Erro 500 sem detalhes

**Depois:**
- ✅ Query de perfil < 1 segundo
- ✅ Logs detalhados para debug
- ✅ Erro 500 com causa identificada
