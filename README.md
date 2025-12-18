# 🏥 Clinic Flow - Aplicação

Sistema de gestão para clínicas de estética e beleza.

## 🚀 Início Rápido

```bash
npm install
npm run dev
```

## 📚 Documentação

- **Documentação Principal:** Veja `../README.md` na raiz do projeto
- **Ordem de Execução:** `../DOCS/ORDEM_EXECUCAO_FINAL.md`
- **Checklist de Produção:** `../DOCS/CHECKLIST_FINAL_PRODUCAO.md`
- **Regras de Negócio:** `MEMORIA_PROJETO.md`
- **Roadmap:** `TASKS.md`

## 🛠 Scripts

- `npm run dev` - Servidor de desenvolvimento
- `npm run build` - Build para produção
- `npm run lint` - Executa linter
- `npm run preview` - Preview do build

## 📁 Estrutura

```
Clinic/
├── src/
│   ├── components/     # Componentes reutilizáveis
│   ├── pages/          # Páginas/rotas
│   ├── hooks/          # Custom hooks
│   ├── lib/            # Configurações (Supabase, etc)
│   ├── types/          # Definições TypeScript
│   ├── contexts/       # Context providers
│   └── utils/          # Funções auxiliares
├── supabase/
│   ├── migrations/     # Migrations SQL (oficiais)
│   ├── functions/      # Edge Functions
│   └── sql/            # Scripts SQL auxiliares
└── .cursorrules        # Regras do Cursor AI
```

## 🔐 Variáveis de Ambiente

Crie um arquivo `.env.local`:

```bash
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-key
```

## 📝 Padrões de Código

Consulte `.cursorrules` para:
- Padrões TypeScript
- Nomenclatura
- Estrutura de arquivos
- Regras de segurança (RLS)
- Design system

---

Para mais informações, veja a documentação na raiz do projeto.
