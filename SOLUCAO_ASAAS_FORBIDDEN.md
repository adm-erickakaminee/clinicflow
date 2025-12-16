# 🔐 Solução: Erro "Forbidden" do Asaas

## ✅ Status Atual

- ✅ **Payload validado com sucesso** - O JSON está correto
- ✅ **Dados sendo recebidos corretamente** - Estrutura OK
- ❌ **Erro de permissão no Asaas** - API key sem permissão para tokenização

## 🔍 Causas Possíveis

### 1. API Key em Ambiente Sandbox/Teste
A tokenização de cartão pode não estar disponível no ambiente de teste do Asaas.

**Solução:**
- Verifique se está usando a API key de **produção** ou **sandbox**
- Alguns recursos podem estar disponíveis apenas em produção

### 2. Conta do Asaas sem Recurso Habilitado
A conta pode não ter o recurso de tokenização de cartão habilitado.

**Solução:**
1. Acesse o painel do Asaas
2. Verifique se o recurso "Tokenização de Cartão" está habilitado
3. Entre em contato com o suporte do Asaas se necessário

### 3. API Key Incorreta ou Expirada
A chave pode estar incorreta ou ter expirado.

**Solução:**
1. Gere uma nova API key no painel do Asaas
2. Atualize no Supabase: Settings → Edge Functions → Secrets
3. Faça deploy novamente das Edge Functions

### 4. Ambiente Incorreto (Sandbox vs Produção)
A URL base pode estar apontando para o ambiente errado.

**Solução:**
Verifique no código da Edge Function:
- Sandbox: `https://sandbox.asaas.com/api/v3`
- Produção: `https://api.asaas.com/v3`

## 🛠️ Ações Imediatas

### Passo 1: Verificar API Key no Supabase

1. Acesse **Supabase Dashboard** → **Settings** → **Edge Functions**
2. Verifique se `ASAAS_API_KEY` está configurada
3. Confirme que é a chave correta (produção ou sandbox)

### Passo 2: Verificar no Painel do Asaas

1. Acesse o painel do Asaas
2. Vá em **Configurações** → **API**
3. Verifique:
   - Se a API key tem permissão para "Tokenização de Cartão"
   - Se está usando o ambiente correto (sandbox/produção)
   - Se a conta tem o recurso habilitado

### Passo 3: Contatar Suporte do Asaas

Se o problema persistir:

1. Entre em contato com o suporte do Asaas
2. Informe que precisa de permissão para:
   - Tokenização de cartão de crédito
   - Criação de assinaturas
3. Solicite ativação do recurso na sua conta

## 🔄 Alternativa Temporária

Se a tokenização não estiver disponível, você pode:

1. **Pular a tokenização** (já está implementado no código)
2. **Usar PIX ou Boleto** para pagamento inicial
3. **Coletar dados do cartão depois** quando a permissão estiver ativa

O código já trata isso:
```typescript
if (tokenizeError) {
  console.warn('Erro ao tokenizar cartão, tentando criar assinatura sem token')
  // Continuar sem token (pode ser PIX ou erro temporário)
}
```

## ✅ Checklist

- [ ] API key verificada no Supabase
- [ ] Ambiente correto (sandbox/produção) verificado
- [ ] Recurso de tokenização verificado no painel do Asaas
- [ ] Suporte do Asaas contatado (se necessário)
- [ ] Alternativa temporária (PIX/Boleto) funcionando

## 📞 Informações para o Suporte do Asaas

Ao contatar o suporte, informe:

1. **Erro recebido:**
   ```
   "forbidden": "Você não possui permissão para utilizar este recurso"
   ```

2. **Recurso necessário:**
   - Tokenização de cartão de crédito
   - Endpoint: `/creditCard/tokenize`

3. **Ambiente:**
   - Sandbox ou Produção (conforme sua necessidade)

4. **API Key:**
   - Informe que está usando API key (não mencione a chave completa por segurança)
