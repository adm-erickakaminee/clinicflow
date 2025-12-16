# 🔧 Resolução Final: Timeout RLS e Erro 500

## 📋 Problemas Identificados

1. **Timeout na query de perfil (>3s)**: Políticas RLS usando funções SECURITY DEFINER estão lentas
2. **Erro 500 nas Edge Functions**: `tokenize-card` e `create-subscription` retornando erro interno

## ✅ Soluções Aplicadas

### 1. SQL - Otimização de Políticas RLS (PRIORIDADE MÁXIMA)

**Arquivo:** `supabase/sql/FIX_RLS_TIMEOUT_URGENT.sql`

**O que faz:**
- Remove políticas de SELECT que usam funções lentas
- Cria políticas simplificadas e diretas
- Adiciona índices para melhorar performance
- Evita consultas recursivas que causam timeout

**Como aplicar:**
1. Acesse Supabase Dashboard → SQL Editor
2. Execute o script `FIX_RLS_TIMEOUT_URGENT.sql`
3. **Resultado esperado:** Queries de perfil devem ser < 1 segundo

### 2. Edge Functions - Melhor Logging de Erros

**Arquivos atualizados:**
- `supabase/functions/tokenize-card/index.ts`
- `supabase/functions/create-subscription/index.ts`

**O que foi melhorado:**
- Logging detalhado de erros (stack trace, nome, causa)
- Mensagens de erro mais informativas
- Facilita debug no Supabase Dashboard → Logs

**Como fazer deploy:**
```bash
supabase functions deploy tokenize-card
supabase functions deploy create-subscription
```

## 🎯 Ordem de Execução

### Passo 1: SQL (CRÍTICO - FAZER PRIMEIRO)
```sql
-- Execute no Supabase SQL Editor:
-- Arquivo: supabase/sql/FIX_RLS_TIMEOUT_URGENT.sql
```
**Resultado esperado:** Timeout de perfil resolvido

### Passo 2: Deploy Edge Functions
```bash
supabase functions deploy tokenize-card
supabase functions deploy create-subscription
```
**Resultado esperado:** Logs detalhados para debug do erro 500

### Passo 3: Verificar Logs
1. Acesse Supabase Dashboard → Edge Functions → Logs
2. Teste o cadastro novamente
3. Verifique os logs para identificar a causa exata do erro 500

## 🔍 Troubleshooting

### Se o timeout persistir:

1. **Verificar índices:**
```sql
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'profiles';
```

2. **Verificar políticas ativas:**
```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'profiles' 
  AND cmd = 'SELECT';
```

3. **Testar query direta:**
```sql
-- Execute como o usuário logado
SELECT id, role, clinic_id 
FROM profiles 
WHERE id = auth.uid();
```

### Se o erro 500 persistir:

1. **Verificar logs da Edge Function:**
   - Supabase Dashboard → Edge Functions → `tokenize-card` → Logs
   - Procure por mensagens de erro detalhadas

2. **Verificar variáveis de ambiente:**
   - Supabase Dashboard → Settings → Edge Functions
   - Confirme que `ASAAS_API_KEY` está configurada

3. **Testar função manualmente:**
   - Use o JSON de teste do arquivo `TESTE_EDGE_FUNCTIONS.md`
   - Verifique se retorna erro ou sucesso

## ✅ Checklist Final

- [ ] SQL `FIX_RLS_TIMEOUT_URGENT.sql` executado
- [ ] Índices criados (verificar com query acima)
- [ ] Políticas de SELECT simplificadas (verificar com query acima)
- [ ] Edge Functions deployadas com logging melhorado
- [ ] Logs verificados no Supabase Dashboard
- [ ] Timeout de perfil resolvido (< 1 segundo)
- [ ] Erro 500 identificado nos logs

## 📊 Resultado Esperado

**Antes:**
- ❌ Timeout após 3 segundos
- ❌ Erro 500 sem detalhes

**Depois:**
- ✅ Query de perfil < 1 segundo
- ✅ Logs detalhados para debug
- ✅ Erro 500 com causa identificada
