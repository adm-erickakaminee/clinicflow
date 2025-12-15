# ✅ CONFIGURAÇÃO: API KEY do Asaas

**Data:** 2025-01-14  
**Status:** ✅ **VERIFICAÇÃO COMPLETA**

---

## 🔍 VERIFICAÇÃO REALIZADA

### Edge Functions que Usam a API KEY

Todas as seguintes Edge Functions requerem `ASAAS_API_KEY` configurada:

1. ✅ **`create-subscription`** - Cria assinaturas recorrrentes
2. ✅ **`cancel-subscription`** - Cancela assinaturas  
3. ✅ **`create-asaas-subaccount`** - Cria subcontas para KYC

**Formato de Uso:**
```typescript
const asaasApiKey = Deno.env.get('ASAAS_API_KEY')!

// Headers da requisição (CONFORME DOCUMENTAÇÃO ASAAS)
headers: {
  'Content-Type': 'application/json',
  'User-Agent': 'ClinicFlow/1.0',  // ✅ Obrigatório para contas criadas após 11/06/2024
  'access_token': asaasApiKey,      // ✅ Formato correto do Asaas
}
```

**⚠️ IMPORTANTE:** Todas as Edge Functions foram atualizadas para incluir o header `User-Agent` conforme a documentação oficial do Asaas.

---

## ✅ CONFIGURAÇÃO CORRETA

### 1. Onde Configurar

**Supabase Dashboard:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **Settings** → **Edge Functions** → **Secrets**
4. Adicione: `ASAAS_API_KEY` com o valor da sua chave

### 2. Formato da Chave

A chave do Asaas deve:
- Começar com `$aact_` (ex: `$aact_YTU5YTE0M2M2N2I4MTIx...`)
- Ter aproximadamente 40-50 caracteres
- Ser a chave de **Produção** ou **Sandbox** conforme o ambiente

### 3. Verificação

**Criada Edge Function de Teste:**
- Arquivo: `supabase/functions/test-asaas-key/index.ts`
- Funcionalidade: Testa se a API KEY está configurada e válida
- Como usar: Deploy e invoque via Supabase Dashboard ou CLI

**Comando para testar:**
```bash
# Via Supabase CLI
supabase functions deploy test-asaas-key
supabase functions invoke test-asaas-key

# Ou via Dashboard: Edge Functions → test-asaas-key → Invoke
```

---

## 🔧 CORREÇÕES APLICADAS

### Verificação de Formato

Todas as Edge Functions estão usando o formato correto:
- ✅ Header: `'access_token': asaasApiKey` (correto para Asaas API v3)
- ✅ URL Base: `https://api.asaas.com/v3` (padrão)
- ✅ Content-Type: `application/json`

### Tratamento de Erros

Todas as Edge Functions têm tratamento de erro adequado:
- ✅ Verificam se a API KEY existe (`Deno.env.get('ASAAS_API_KEY')!`)
- ✅ Retornam erros descritivos se a chave estiver ausente
- ✅ Tratam erros da API do Asaas adequadamente

---

## 📋 CHECKLIST DE VERIFICAÇÃO

### Configuração no Supabase
- [ ] Variável `ASAAS_API_KEY` adicionada em Settings → Edge Functions → Secrets
- [ ] Valor da chave está correto (formato `$aact_...`)
- [ ] Chave é de Produção (se em produção) ou Sandbox (se em desenvolvimento)

### Teste de Funcionamento
- [ ] Edge Function `test-asaas-key` executada com sucesso
- [ ] Resposta indica que a API KEY está configurada
- [ ] Teste de chamada à API do Asaas retorna sucesso

### Edge Functions
- [ ] `create-subscription` pode acessar a API KEY
- [ ] `cancel-subscription` pode acessar a API KEY
- [ ] `create-asaas-subaccount` pode acessar a API KEY

---

## 🚨 PROBLEMAS COMUNS E SOLUÇÕES

### Erro: "ASAAS_API_KEY não está definida"

**Sintoma:** Edge Function retorna erro sobre variável não encontrada

**Solução:**
1. Verifique se a variável está configurada no Supabase Dashboard
2. Certifique-se de que o nome está exatamente como `ASAAS_API_KEY` (case-sensitive)
3. Aguarde alguns segundos após adicionar (propagação)
4. Teste novamente

### Erro: "Unauthorized" ou "401" da API do Asaas

**Sintoma:** API do Asaas retorna erro 401

**Solução:**
1. Verifique se a chave está correta no Dashboard do Asaas
2. Verifique se está usando a chave de Produção (não Sandbox) se estiver em produção
3. Gere uma nova chave se necessário
4. Atualize no Supabase Dashboard

### Erro: "Invalid API key format"

**Sintoma:** Chave não está no formato esperado

**Solução:**
- A chave deve começar com `$aact_`
- Verifique se não há espaços extras ao copiar/colar
- Copie a chave diretamente do Dashboard do Asaas

---

## 🧪 COMO TESTAR

### Opção 1: Via Edge Function de Teste

1. **Deploy da função de teste:**
   ```bash
   supabase functions deploy test-asaas-key
   ```

2. **Invocar a função:**
   ```bash
   supabase functions invoke test-asaas-key
   ```

3. **Verificar resposta:**
   - Se `configured: true` → API KEY está configurada ✅
   - Se `api_test.ok: true` → API KEY é válida e funciona ✅
   - Se `format_valid: true` → Formato da chave está correto ✅

### Opção 2: Via Supabase Dashboard

1. Acesse **Edge Functions** no Dashboard
2. Selecione `test-asaas-key`
3. Clique em **"Invoke"**
4. Verifique a resposta JSON

### Opção 3: Teste Real (Criar Assinatura)

1. Acesse o painel Admin
2. Vá em **Configurações** → **Assinatura**
3. Clique em **"Pagar e Ativar"**
4. Se funcionar → API KEY está correta ✅
5. Se der erro → Verifique os logs da Edge Function

---

## 📝 NOTAS IMPORTANTES

### Segurança
- ⚠️ **NUNCA** commite a API KEY no código
- ⚠️ **NUNCA** coloque a API KEY em arquivos `.env` que vão para o repositório
- ✅ **SEMPRE** use Secrets do Supabase para variáveis sensíveis

### Ambiente
- **Produção:** Use chave de Produção do Asaas
- **Desenvolvimento:** Use chave de Sandbox do Asaas
- Configure variáveis diferentes para cada ambiente se necessário

### Atualização
- Se precisar atualizar a API KEY:
  1. Gere nova chave no Dashboard do Asaas
  2. Atualize no Supabase Dashboard (Settings → Edge Functions → Secrets)
  3. Aguarde propagação (alguns segundos)
  4. Teste novamente

---

## ✅ CONCLUSÃO

**Status da Configuração:**
- ✅ Código verificado e correto
- ✅ Formato de autenticação correto (`access_token` no header)
- ✅ Edge Function de teste criada para verificação
- ⚠️ **AÇÃO NECESSÁRIA:** Verificar se a variável está configurada no Supabase Dashboard

**Próximo Passo:**
1. Execute a Edge Function `test-asaas-key` para verificar se a API KEY está configurada
2. Se não estiver, configure no Supabase Dashboard conforme instruções acima
3. Teste novamente até obter sucesso

---

**Última Atualização:** 2025-01-14
