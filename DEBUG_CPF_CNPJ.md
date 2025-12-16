# 🔍 Debug: Verificação de CPF/CNPJ

## 📋 O que verificar nos logs

Após fazer o cadastro, verifique no console do navegador (F12) e nos logs da Edge Function:

### 1. No Frontend (Console do Navegador)

Procure por estas mensagens:

```
📋 CPF/CNPJ preparado para tokenização: {
  original: "000.000.000-00",
  cleaned: "00000000000",
  length: 11
}

📤 Enviando dados para tokenize-card: { ... }

🔍 Verificação CPF/CNPJ no payload: {
  hasCpfCnpj: true,
  cpfCnpj: "00000000000",
  cpfCnpjLength: 11
}
```

**Se `hasCpfCnpj: false` ou `cpfCnpjLength` for 0:**
- O CPF/CNPJ não está sendo coletado do formulário
- Verifique se o campo está preenchido antes de enviar

### 2. Na Edge Function (Logs do Supabase)

Acesse: **Supabase Dashboard** → **Edge Functions** → `tokenize-card` → **Logs**

Procure por:

```
📋 Payload parseado: { ... }

🔍 Verificação CPF/CNPJ no payload recebido: {
  hasCpfCnpj: true,
  cpfCnpj: "00000000000",
  cpfCnpjLength: 11
}

📤 Payload final enviado para Asaas: { ... }

🔍 Verificação final CPF/CNPJ: {
  hasCpfCnpj: true,
  cpfCnpj: "00000000000",
  cpfCnpjLength: 11
}
```

**Se `hasCpfCnpj: false` em qualquer etapa:**
- O CPF/CNPJ não está chegando na Edge Function
- Verifique se o frontend está enviando corretamente

## 🐛 Problemas Comuns

### Problema 1: CPF/CNPJ não está sendo coletado

**Sintoma:** `hasCpfCnpj: false` no frontend

**Solução:**
1. Verifique se o campo CPF/CNPJ está preenchido no formulário
2. Verifique se a validação está passando (deve mostrar erro se estiver vazio)
3. Verifique se o campo não está sendo limpo antes de enviar

### Problema 2: CPF/CNPJ não está chegando na Edge Function

**Sintoma:** `hasCpfCnpj: false` nos logs da Edge Function, mas `true` no frontend

**Solução:**
1. Verifique se o deploy da Edge Function foi feito após as correções
2. Verifique se o schema Zod está aceitando o campo
3. Verifique os logs de erro de validação Zod

### Problema 3: CPF/CNPJ está chegando, mas Asaas ainda retorna 403

**Sintoma:** `hasCpfCnpj: true` em todos os logs, mas erro 403 do Asaas

**Solução:**
1. Verifique se o CPF/CNPJ tem o formato correto (apenas números, 11 ou 14 dígitos)
2. Verifique se a conta do Asaas tem permissão para tokenização
3. Entre em contato com o suporte do Asaas

## ✅ Checklist de Debug

- [ ] Campo CPF/CNPJ preenchido no formulário
- [ ] Validação passando (sem erro de CPF/CNPJ inválido)
- [ ] Logs do frontend mostram `hasCpfCnpj: true`
- [ ] Logs da Edge Function mostram `hasCpfCnpj: true`
- [ ] CPF/CNPJ tem 11 ou 14 dígitos (apenas números)
- [ ] Deploy da Edge Function feito após correções
- [ ] Erro 403 ainda persiste (se sim, problema é de permissão no Asaas)
