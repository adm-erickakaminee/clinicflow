# 🚨 INSTRUÇÕES URGENTES: Execute o SQL Agora!

## ⚠️ Situação Atual

Você está vendo o erro **42501** mesmo tendo `role = 'super_admin'` ✅.

**Causa:** As políticas RLS no banco ainda estão usando a versão antiga que verifica `auth.jwt()->>'role'`, mas o role está na tabela `profiles`, não no JWT!

---

## ✅ SOLUÇÃO: Execute Este SQL no Supabase

### Passo 1: Abrir SQL Editor no Supabase
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. No menu lateral, clique em **"SQL Editor"**
4. Clique em **"New query"**

### Passo 2: Copiar e Executar Este Script

```sql
-- ============================================================================
-- 🔧 ATUALIZAR POLÍTICAS RLS: De JWT para profiles.role
-- ============================================================================

-- Garantir RLS habilitado
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- POLÍTICA 1: SELECT (atualizar)
DROP POLICY IF EXISTS "Super admin read organizations" ON public.organizations;
CREATE POLICY "Super admin read organizations"
  ON public.organizations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- POLÍTICA 2: INSERT (atualizar - A MAIS IMPORTANTE!)
DROP POLICY IF EXISTS "Super admin insert organizations" ON public.organizations;
CREATE POLICY "Super admin insert organizations"
  ON public.organizations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- POLÍTICA 3: UPDATE (atualizar)
DROP POLICY IF EXISTS "Super admin update organizations" ON public.organizations;
CREATE POLICY "Super admin update organizations"
  ON public.organizations FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- Verificar se funcionou
SELECT 
  policyname,
  cmd,
  LEFT(with_check::text, 150) as condicao
FROM pg_policies 
WHERE tablename = 'organizations' 
  AND policyname LIKE 'Super admin%'
ORDER BY cmd;
```

### Passo 3: Clicar em "Run"
- Ou pressionar `Cmd + Enter` (Mac) / `Ctrl + Enter` (Windows/Linux)

### Passo 4: Verificar Resultado
Você deve ver uma tabela com 3 políticas mostrando que elas agora verificam `profiles.role`.

---

## 📋 Arquivos Disponíveis

Escolha um destes arquivos para executar:

1. **`ATUALIZAR_POLITICAS_RLS_EXISTENTES.sql`** ⭐ RECOMENDADO
   - Atualiza todas as 3 políticas (SELECT, INSERT, UPDATE)
   - Remove as antigas e cria as novas
   - Inclui verificações

2. **`EXECUTAR_ESTE_SQL_AGORA.sql`**
   - Versão simplificada focada apenas no INSERT
   - Bom se você quer algo rápido

3. **`fix_super_admin_insert_organizations.sql`** (atualizado)
   - Foca apenas no INSERT
   - Agora usa a versão corrigida

---

## 🔍 Verificar se Funcionou

Após executar, rode esta query para verificar:

```sql
-- Ver todas as políticas da tabela organizations
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN with_check::text LIKE '%profiles%' THEN '✅ CORRIGIDA'
    WHEN with_check::text LIKE '%jwt%' THEN '❌ ANTIGA (precisa atualizar)'
    ELSE '❓ VERIFICAR'
  END as status
FROM pg_policies 
WHERE tablename = 'organizations' 
  AND policyname LIKE 'Super admin%';
```

Todas devem mostrar **"✅ CORRIGIDA"**.

---

## ⚡ Após Executar

1. **Recarregue a página** do seu app (F5 ou Cmd+R)
2. **Tente criar a clínica novamente**
3. O erro deve desaparecer! ✅

---

## 📞 Se Ainda Não Funcionar

Verifique se seu profile realmente tem `role = 'super_admin'`:

```sql
SELECT id, email, role FROM profiles WHERE email = 'erick.eh799@gmail.com';
```

Se não for `super_admin`, atualize:

```sql
UPDATE profiles 
SET role = 'super_admin' 
WHERE email = 'erick.eh799@gmail.com';
```
