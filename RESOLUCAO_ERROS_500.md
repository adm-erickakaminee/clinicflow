# 🔧 Resolução Completa dos Erros 500

## 📋 Resumo dos Problemas

1. **GET /profiles 500** - Políticas RLS de SELECT causando recursão
2. **POST /tokenize-card 500** - Edge Function sem headers CORS ou erro interno
3. **POST /create-subscription 500** - Edge Function sem headers CORS ou erro interno

## ✅ Soluções Aplicadas

### 1. SQL - Políticas RLS (PRIORIDADE MÁXIMA)

**Arquivo:** `supabase/sql/FIX_PROFILES_RLS_COMPLETO.sql`

**O que faz:**
- Remove todas as políticas RLS problemáticas (SELECT, INSERT, UPDATE)
- Cria funções SECURITY DEFINER que bypassam RLS
- Recria políticas simplificadas sem recursão
- Cria função `insert_profile_safe()` para INSERT seguro

**Como aplicar:**
1. Acesse Supabase Dashboard → SQL Editor
2. Copie e cole o conteúdo de `FIX_PROFILES_RLS_COMPLETO.sql`
3. Execute o script
4. **NÃO PRECISA DEPLOY** - mudanças são imediatas

### 2. Edge Functions - Headers CORS

**Arquivos corrigidos:**
- `supabase/functions/tokenize-card/index.ts`
- `supabase/functions/create-subscription/index.ts`

**O que foi corrigido:**
- ✅ Headers CORS adicionados
- ✅ Tratamento de OPTIONS (preflight)
- ✅ Validação de variáveis de ambiente
- ✅ Headers CORS em todas as respostas (sucesso e erro)

**Como fazer deploy:**
```bash
# Via Supabase CLI
cd "/Users/rodrigosalgado/Desktop/Clinic Flow/Clinic"
supabase functions deploy tokenize-card
supabase functions deploy create-subscription
```

**OU via Supabase Dashboard:**
1. Vá em Edge Functions
2. Selecione cada função
3. Faça upload do arquivo atualizado ou clique em "Deploy"

### 3. Frontend - Remoção de `is_super_admin`

**Arquivo corrigido:**
- `src/context/SchedulerContext.tsx`

**O que foi corrigido:**
- ✅ Removido `is_super_admin` da query (coluna não existe)
- ✅ Código já usa função RPC para INSERT

**Deploy:**
- Já está no código, só precisa fazer commit e push:
```bash
git add .
git commit -m "FIX: Remove is_super_admin da query e adiciona CORS nas Edge Functions"
git push origin main
```

## 🎯 Ordem de Execução (IMPORTANTE)

### Passo 1: SQL (CRÍTICO - FAZER PRIMEIRO)
```sql
-- Execute no Supabase SQL Editor:
-- Arquivo: supabase/sql/FIX_PROFILES_RLS_COMPLETO.sql
```
**Resultado esperado:** GET /profiles deve funcionar

### Passo 2: Deploy Edge Functions
```bash
supabase functions deploy tokenize-card
supabase functions deploy create-subscription
```
**Resultado esperado:** POST /tokenize-card e /create-subscription devem funcionar

### Passo 3: Deploy Frontend (Opcional)
```bash
git add .
git commit -m "FIX: Correções RLS e CORS"
git push origin main
```
**Resultado esperado:** Vercel fará deploy automático

## 🔍 Verificações Pós-Deploy

### Verificar SQL:
```sql
-- Deve retornar políticas sem recursão
SELECT policyname, cmd FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd, policyname;
```

### Verificar Edge Functions:
- Acesse Supabase → Edge Functions → Logs
- Teste as funções e verifique se não há erros 500

### Verificar Frontend:
- Abra o console do navegador (F12)
- Tente fazer cadastro
- Não deve aparecer erros 500

## ⚠️ Se Ainda Houver Erros 500

1. **Verifique os Logs do Supabase:**
   - Edge Functions → Logs
   - Database → Logs
   - Procure por mensagens de erro específicas

2. **Verifique Variáveis de Ambiente:**
   - Supabase → Settings → Edge Functions
   - Confirme que `ASAAS_API_KEY` está configurada

3. **Teste as Funções Individualmente:**
   - Use o Supabase Dashboard para testar cada Edge Function
   - Verifique se retornam erro ou sucesso

## ✅ Checklist Final

- [ ] SQL `FIX_PROFILES_RLS_COMPLETO.sql` executado
- [ ] Edge Function `tokenize-card` deployada
- [ ] Edge Function `create-subscription` deployada
- [ ] Frontend atualizado (commit e push)
- [ ] Teste de cadastro funcionando
- [ ] Sem erros 500 no console
