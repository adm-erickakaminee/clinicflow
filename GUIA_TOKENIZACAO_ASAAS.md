# 📘 GUIA COMPLETO: Como Habilitar e Testar Tokenização do Asaas

---

## 🎯 ÍNDICE

1. [Testar no Sandbox (Já Funciona)](#1-testar-no-sandbox-já-funciona)
2. [Habilitar em Produção](#2-habilitar-em-produção)
3. [Configurar Variáveis de Ambiente](#3-configurar-variáveis-de-ambiente)
4. [Verificar se Está Funcionando](#4-verificar-se-está-funcionando)
5. [Troubleshooting](#5-troubleshooting)

---

## 1. TESTAR NO SANDBOX (JÁ FUNCIONA)

### ✅ Passo 1: Verificar API Key do Sandbox

1. Acesse: https://www.asaas.com/
2. Faça login na sua conta
3. Vá em **Configurações** → **API**
4. Copie a **API Key do Sandbox** (começa com `$aact_YTU5YTE0M2M2N2I4MTIxM...`)

### ✅ Passo 2: Configurar no Supabase

1. Acesse o **Supabase Dashboard**: https://app.supabase.com/
2. Selecione seu projeto
3. Vá em **Edge Functions** → **Settings**
4. Adicione/Atualize a variável de ambiente:
   - **Nome:** `ASAAS_API_KEY`
   - **Valor:** Cole a API Key do Sandbox
   - **Marcar como:** Secret

### ✅ Passo 3: Testar o Cadastro

1. Acesse sua aplicação: `http://localhost:5173/` (ou URL de produção)
2. Clique em **"Começar Teste Grátis"**
3. Preencha o formulário de cadastro
4. Na etapa de pagamento, use um **cartão de teste**:
   - **Número:** `4111 1111 1111 1111` (Visa)
   - **Validade:** Qualquer data futura (ex: `12/25`)
   - **CVV:** Qualquer 3 dígitos (ex: `123`)
   - **Nome:** Qualquer nome

5. Finalize o cadastro
6. Verifique no console do navegador (F12) se não há erros
7. Verifique no **Supabase Dashboard** → **Edge Functions** → **Logs** se a função `tokenize-card` foi executada com sucesso

---

## 2. HABILITAR EM PRODUÇÃO

### ⚠️ IMPORTANTE: Tokenização em Produção Requer Aprovação

A tokenização de cartão em produção **não é automática**. Você precisa solicitar habilitação ao Asaas.

### 📋 Passo 1: Preparar Documentação

Antes de contatar o Asaas, prepare:

1. **Informações da Empresa:**
   - Razão Social
   - CNPJ
   - Site/URL da aplicação
   - Descrição do negócio

2. **Justificativa Técnica:**
   - Por que precisa de tokenização?
   - Volume estimado de transações
   - Como os dados serão protegidos

3. **Compliance:**
   - Certifique-se de ter política de privacidade
   - Termos de uso atualizados
   - LGPD em conformidade

### 📞 Passo 2: Contatar Gerente de Contas

1. Acesse: https://www.asaas.com/
2. Faça login
3. Vá em **Suporte** ou **Atendimento**
4. Solicite contato com seu **Gerente de Contas**
5. Ou envie email para: `suporte@asaas.com`

### 💬 Passo 3: Mensagem Modelo

Use este template ao contatar:

```
Assunto: Solicitação de Habilitação - Tokenização de Cartão de Crédito

Olá,

Gostaria de solicitar a habilitação da funcionalidade de tokenização 
de cartão de crédito para minha conta Asaas.

Informações:
- Razão Social: [SUA EMPRESA]
- CNPJ: [SEU CNPJ]
- URL da Aplicação: [SUA URL]
- Volume Estimado: [X transações/mês]

Justificativa:
Estamos implementando um sistema de assinaturas recorrentes com trial 
grátis de 7 dias. A tokenização é necessária para garantir segurança 
PCI-DSS e melhor experiência do usuário.

Aguardamos retorno.

Atenciosamente,
[SEU NOME]
```

### ⏳ Passo 4: Aguardar Aprovação

- O Asaas pode levar **3-7 dias úteis** para analisar
- Eles podem solicitar informações adicionais
- A aprovação está sujeita a análise de risco

### ✅ Passo 5: Após Aprovação

1. O Asaas enviará confirmação por email
2. A tokenização estará habilitada automaticamente
3. Use a **API Key de Produção** (não a do Sandbox)
4. Teste novamente em produção

---

## 3. CONFIGURAR VARIÁVEIS DE AMBIENTE

### 🔧 No Supabase Dashboard

1. Acesse: https://app.supabase.com/
2. Selecione seu projeto
3. Vá em **Edge Functions** → **Settings**
4. Adicione/Atualize:

| Variável | Valor | Descrição |
|----------|-------|-----------|
| `ASAAS_API_KEY` | `$aact_...` | API Key do Asaas (Sandbox ou Produção) |
| `ASAAS_BASE_URL` | `https://api.asaas.com/v3` | URL base da API (opcional, padrão já configurado) |

### 🔧 No Arquivo .env (Desenvolvimento Local)

Se estiver testando localmente, crie/atualize `.env`:

```env
VITE_ASAAS_API_KEY=$aact_YTU5YTE0M2M2N2I4MTIxM...
```

**⚠️ NOTA:** Nunca commite o `.env` no Git! Adicione ao `.gitignore`.

---

## 4. VERIFICAR SE ESTÁ FUNCIONANDO

### ✅ Teste 1: Verificar Edge Functions

1. Acesse **Supabase Dashboard** → **Edge Functions**
2. Verifique se `tokenize-card` está **deployed**
3. Clique em `tokenize-card` → **Logs**
4. Tente fazer um cadastro
5. Verifique se aparecem logs de sucesso

### ✅ Teste 2: Verificar no Console do Navegador

1. Abra o **DevTools** (F12)
2. Vá na aba **Console**
3. Faça um cadastro
4. Procure por mensagens de erro ou sucesso

### ✅ Teste 3: Verificar no Asaas Dashboard

1. Acesse: https://www.asaas.com/
2. Vá em **Cobranças** → **Assinaturas**
3. Verifique se a assinatura foi criada
4. Verifique se o método de pagamento está como **Cartão de Crédito**

### ✅ Teste 4: Verificar Tokenização

1. No **Supabase Dashboard** → **Edge Functions** → **Logs**
2. Procure pela função `tokenize-card`
3. Verifique se a resposta contém:
   ```json
   {
     "success": true,
     "creditCardToken": "76496073-536f-4835-80db-c45d00f33695",
     "creditCardNumber": "1111",
     "creditCardBrand": "VISA"
   }
   ```

---

## 5. TROUBLESHOOTING

### ❌ Erro: "Tokenização não habilitada"

**Causa:** Tokenização não está habilitada na conta Asaas (produção).

**Solução:**
1. Verifique se está usando API Key de **Sandbox** (já funciona)
2. Se estiver em produção, contate o Asaas para habilitar
3. Use PIX como fallback temporário

### ❌ Erro: "Invalid API Key"

**Causa:** API Key incorreta ou não configurada.

**Solução:**
1. Verifique se `ASAAS_API_KEY` está configurada no Supabase
2. Verifique se a API Key está correta (sem espaços)
3. Verifique se está usando a API Key correta (Sandbox vs Produção)

### ❌ Erro: "Customer not found"

**Causa:** O `customer` (clinic_id) não existe no Asaas.

**Solução:**
1. Primeiro, crie um customer no Asaas antes de tokenizar
2. Ou use `asaas_wallet_id` se já tiver criado
3. Atualize a função `tokenize-card` para criar customer automaticamente

### ❌ Erro: "Invalid card data"

**Causa:** Dados do cartão inválidos ou mal formatados.

**Solução:**
1. Verifique se o número do cartão está correto (sem espaços)
2. Verifique se a data está no formato `MM/AA`
3. Verifique se o CVV tem 3-4 dígitos
4. Use cartões de teste válidos no Sandbox

### ❌ Tokenização funciona, mas assinatura não é criada

**Causa:** Token válido, mas erro ao criar assinatura.

**Solução:**
1. Verifique logs da função `create-subscription`
2. Verifique se o token está sendo passado corretamente
3. Verifique se o customer existe no Asaas
4. Verifique se o plano está configurado corretamente

---

## 📞 SUPORTE

### Asaas
- **Email:** suporte@asaas.com
- **Telefone:** (11) 3003-0460
- **Chat:** Disponível no dashboard
- **Documentação:** https://docs.asaas.com/

### Supabase
- **Documentação:** https://supabase.com/docs
- **Discord:** https://discord.supabase.com/
- **GitHub:** https://github.com/supabase/supabase

---

## ✅ CHECKLIST FINAL

- [ ] API Key do Asaas configurada no Supabase
- [ ] Edge Function `tokenize-card` deployada
- [ ] Edge Function `create-subscription` atualizada
- [ ] Testado no Sandbox com cartão de teste
- [ ] Verificado logs sem erros
- [ ] (Produção) Contatado Asaas para habilitar tokenização
- [ ] (Produção) Recebido aprovação do Asaas
- [ ] (Produção) Testado em produção

---

**Última Atualização:** 2025-01-14  
**Status:** ✅ **GUIA COMPLETO**

**🎯 Siga este guia passo a passo para habilitar e testar a tokenização do Asaas!**
