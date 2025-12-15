# ⚡ DEPLOY RÁPIDO - Passo a Passo Simplificado

## 🎯 MÉTODO MAIS FÁCIL: Vercel (5 minutos)

### 1️⃣ Preparar Código no GitHub

```bash
cd "/Users/rodrigosalgado/Desktop/Clinic Flow/Clinic"

# Se ainda não tiver git inicializado
git init
git add .
git commit -m "Initial commit"

# Criar repositório no GitHub primeiro (via site github.com)
# Depois conectar:
git remote add origin https://github.com/SEU-USUARIO/clinicflow.git
git branch -M main
git push -u origin main
```

### 2️⃣ Deploy no Vercel

1. **Acesse:** https://vercel.com/
2. **Clique em "Sign Up"** → **"Continue with GitHub"**
3. **Clique em "Add New Project"**
4. **Importe seu repositório** `clinicflow`
5. **Configure:**
   - Framework: **Vite**
   - Root Directory: `./` (ou deixe vazio)
   - Build Command: `npm run build` (já vem preenchido)
   - Output Directory: `dist` (já vem preenchido)

### 3️⃣ Adicionar Variáveis de Ambiente

No Vercel, antes de fazer deploy:

1. Clique em **"Environment Variables"**
2. Adicione:
   - **Name:** `VITE_SUPABASE_URL`
   - **Value:** `https://seu-projeto.supabase.co` (do seu Supabase)
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

3. Adicione:
   - **Name:** `VITE_SUPABASE_ANON_KEY`
   - **Value:** Sua chave anon do Supabase
   - **Environments:** ✅ Production, ✅ Preview, ✅ Development

### 4️⃣ Deploy!

1. Clique em **"Deploy"**
2. Aguarde 2-5 minutos
3. **Pronto!** Seu site estará em: `https://clinicflow.vercel.app`

### 5️⃣ Configurar Supabase (IMPORTANTE!)

Após o deploy, configure o Supabase:

1. Acesse: https://app.supabase.com/
2. Vá em **Authentication** → **URL Configuration**
3. Adicione em **Site URL:**
   ```
   https://seu-projeto.vercel.app
   ```
4. Adicione em **Redirect URLs:**
   ```
   https://seu-projeto.vercel.app/**
   ```

---

## ✅ PRONTO!

Seu sistema está online! 🎉

**URL:** `https://seu-projeto.vercel.app`

---

## 🔄 Atualizações Futuras

A partir de agora, **cada push no GitHub** faz deploy automático!

```bash
git add .
git commit -m "Nova funcionalidade"
git push
```

O Vercel detecta automaticamente e faz o deploy! 🚀

---

## 🐛 Problemas?

**Erro 404 ao navegar?**
- ✅ Já está resolvido com o `vercel.json` criado

**Variáveis não funcionam?**
- ✅ Certifique-se que começam com `VITE_`
- ✅ Faça novo deploy após adicionar variáveis

**CORS Error?**
- ✅ Adicione a URL do Vercel no Supabase (passo 5 acima)

---

**Tempo total:** ~5 minutos  
**Dificuldade:** ⭐ (Muito Fácil)
