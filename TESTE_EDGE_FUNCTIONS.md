# 🧪 Guia de Teste das Edge Functions

## 📋 Edge Function: `tokenize-card`

### JSON de Teste Completo (Para usar no Supabase Dashboard)

```json
{
  "customer": "00000000-0000-0000-0000-000000000000",
  "creditCard": {
    "holderName": "JOAO SILVA",
    "number": "4000000000000002",
    "expiryMonth": "12",
    "expiryYear": "2028",
    "ccv": "123"
  },
  "creditCardHolderInfo": {
    "name": "João Silva",
    "email": "joao.silva@exemplo.com",
    "cpfCnpj": "12345678900",
    "postalCode": "01000000",
    "addressNumber": "123",
    "phone": "11999999999"
  },
  "remoteIp": "127.0.0.1"
}
```

### Campos Obrigatórios

- ✅ `customer` (string): ID do cliente/clínica
- ✅ `creditCard` (object):
  - `holderName` (string): Nome como está no cartão
  - `number` (string): Número do cartão (sem espaços)
  - `expiryMonth` (string): Mês de validade (2 dígitos)
  - `expiryYear` (string): Ano de validade (4 dígitos)
  - `ccv` (string): Código de segurança
- ✅ `creditCardHolderInfo` (object):
  - `name` (string): Nome completo
  - `email` (string): Email válido
  - `cpfCnpj` (string, opcional): CPF/CNPJ
  - `postalCode` (string, opcional): CEP
  - `addressNumber` (string, opcional): Número do endereço
  - `phone` (string, opcional): Telefone

### Como Testar no Supabase Dashboard

1. Acesse **Supabase Dashboard** → **Edge Functions** → `tokenize-card`
2. Clique em **"Invoke function"** ou **"Test"**
3. Cole o JSON acima no campo **Request Body**
4. Clique em **"Run"** ou **"Invoke"**

### Resultado Esperado

**Sucesso (200 OK):**
```json
{
  "success": true,
  "creditCardToken": "tok_xxxxxxxxxxxxx",
  "creditCardNumber": "0002",
  "creditCardBrand": "VISA"
}
```

**Erro de Validação (400 Bad Request):**
```json
{
  "error": "Dados inválidos",
  "details": [
    {
      "code": "invalid_type",
      "expected": "string",
      "received": "undefined",
      "path": ["customer"],
      "message": "Required"
    }
  ],
  "received": { ... }
}
```

---

## 📋 Edge Function: `create-subscription`

### JSON de Teste Completo

```json
{
  "clinic_id": "00000000-0000-0000-0000-000000000000",
  "trial_days": 7,
  "credit_card_token": "tok_xxxxxxxxxxxxx"
}
```

### Campos Obrigatórios

- ✅ `clinic_id` (string/UUID): ID da organização/clínica
- ✅ `trial_days` (number, opcional): Dias de trial (padrão: 7)
- ✅ `credit_card_token` (string, opcional): Token do cartão tokenizado

### Como Testar

1. Primeiro, tokenize um cartão usando `tokenize-card`
2. Copie o `creditCardToken` retornado
3. Use no campo `credit_card_token` do teste de `create-subscription`

### Resultado Esperado

**Sucesso (200 OK):**
```json
{
  "success": true,
  "subscription_id": "sub_xxxxxxxxxxxxx",
  "payment_url": "https://..."
}
```

---

## 🔍 Troubleshooting

### Erro: "Dados inválidos" (400)

**Causa:** JSON incompleto ou campos faltando

**Solução:**
- Verifique se todos os campos obrigatórios estão presentes
- Verifique se os tipos estão corretos (string, object, etc.)
- Use o JSON de exemplo acima como base

### Erro: "Configuração do servidor incompleta" (500)

**Causa:** Variável de ambiente `ASAAS_API_KEY` não configurada

**Solução:**
1. Acesse **Supabase Dashboard** → **Settings** → **Edge Functions**
2. Adicione a variável `ASAAS_API_KEY` com sua chave do Asaas
3. Faça deploy novamente da função

### Erro: "Erro ao tokenizar cartão" (500)

**Causa:** Erro na API do Asaas (cartão inválido, API key incorreta, etc.)

**Solução:**
- Verifique os logs da Edge Function no Supabase
- Verifique se a API key do Asaas está correta
- Use um cartão de teste válido do Asaas

---

## ✅ Checklist de Teste

- [ ] Edge Function `tokenize-card` retorna 200 OK com JSON completo
- [ ] Edge Function `create-subscription` retorna 200 OK com token válido
- [ ] Frontend envia todos os campos obrigatórios
- [ ] Logs mostram dados corretos sendo enviados/recebidos
- [ ] Variáveis de ambiente configuradas no Supabase
