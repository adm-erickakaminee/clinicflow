# 📋 Ordem de Execução dos Scripts SQL

## ⚠️ IMPORTANTE: Execute nesta ordem exata!

### 1️⃣ PRIMEIRO: Remover múltiplas versões da função
**Arquivo:** `supabase/sql/FIX_INSERT_PROFILE_SAFE_FUNCTION.sql`

**O que faz:**
- Remove TODAS as versões antigas de `insert_profile_safe`
- Cria UMA única versão definitiva
- Resolve o erro PGRST203 (múltiplas funções com mesmo nome)

**Execute este PRIMEIRO para evitar conflitos!**

---

### 2️⃣ SEGUNDO: Corrigir políticas RLS
**Arquivo:** `supabase/sql/FIX_PROFILES_RLS_COMPLETO.sql`

**O que faz:**
- Remove todas as políticas RLS problemáticas
- Cria funções auxiliares (is_user_admin, get_user_clinic_id, is_user_super_admin)
- Recria políticas RLS sem recursão
- Cria política básica de INSERT

**Execute este DEPOIS do script 1**

---

## ✅ Resultado Esperado

Após executar ambos os scripts:

1. ✅ Função `insert_profile_safe` existe e é única
2. ✅ Políticas RLS não causam recursão
3. ✅ GET /profiles funciona (sem erro 500)
4. ✅ Cadastro de usuários funciona (sem erro PGRST203)

---

## 🔍 Verificação

Após executar os scripts, verifique:

```sql
-- Deve retornar APENAS UMA função
SELECT 
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as function_arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'insert_profile_safe';
```

```sql
-- Deve retornar políticas sem recursão
SELECT policyname, cmd 
FROM pg_policies 
WHERE tablename = 'profiles' 
ORDER BY cmd, policyname;
```
