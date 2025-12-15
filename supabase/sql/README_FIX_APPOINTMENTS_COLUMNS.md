# Correção Crítica: Unificação de Colunas de Agendamentos

## Problema
Após refresh/login, os agendamentos estavam sendo carregados sem dados de cliente, profissional e serviço devido a inconsistências nos nomes das colunas no banco de dados.

## Solução

### 1. Script SQL: `fix_appointments_columns_final.sql`
Execute este script no Supabase SQL Editor para unificar os nomes das colunas:

```sql
-- Renomeia colunas em português para nomes unificados em snake_case
- id_do_cliente → client_id
- id_do_servico → service_id  
- id_do_profissional → professional_id
```

O script é **idempotente** - pode ser executado múltiplas vezes sem causar erros.

### 2. Correções no TypeScript (`SchedulerContext.tsx`)

#### A. Função `loadUserProfile` (Carregamento de Perfil)
- ✅ **Preservação de dados do super_admin**: Agora verifica o localStorage antes de criar usuário básico
- ✅ **Fallbacks seguros**: Se `full_name` for nulo, usa valores do localStorage ou padrão "Usuário Admin"
- ✅ **Proteção do role**: Se o usuário já foi identificado como `super_admin`, o role **NUNCA** é alterado para `professional`
- ✅ **Preservação de avatar**: Mantém `avatar_url` do localStorage se disponível

#### B. Função de Carregamento de Agendamentos
- ✅ **Mapeamento de clientes**: Cria mapa `client_id → client name` para buscar nomes dos clientes
- ✅ **Mapeamento de serviços**: Cria mapa `service_id → service name` para buscar nomes dos serviços
- ✅ **Cálculo de duração**: Calcula `durationMinutes` automaticamente se não estiver no banco
- ✅ **Dados completos**: Agora os agendamentos são mapeados com:
  - `patient`: Nome do cliente (do mapa de clientes)
  - `title`: Nome do serviço (do mapa de serviços)
  - `procedure`: Nome do serviço ou notas
  - `professionalId`: Corretamente mapeado de `profile_id` para `professional_id`

## Como Executar

1. **Execute o SQL primeiro:**
   ```sql
   -- No Supabase SQL Editor, execute:
   -- /supabase/sql/fix_appointments_columns_final.sql
   ```

2. **Recarregue a aplicação:**
   - Faça logout e login novamente
   - Ou simplesmente recarregue a página (F5)

## Resultado Esperado

✅ **Perfil do super_admin:**
- Nome, foto e role são preservados após refresh
- Role nunca muda de `super_admin` para `professional`

✅ **Agendamentos:**
- Cards mostram nome do cliente corretamente
- Cards mostram nome do serviço/procedimento
- Cards aparecem na coluna correta do profissional
- Dados não são perdidos após refresh

## Troubleshooting

Se ainda houver problemas:

1. **Verifique os logs do console:**
   - Procure por `loadUserProfile` para ver como o perfil está sendo carregado
   - Procure por `Agendamentos carregados` para ver o mapeamento

2. **Verifique o banco de dados:**
   ```sql
   SELECT column_name 
   FROM information_schema.columns 
   WHERE table_name = 'appointments';
   ```
   - Deve mostrar: `client_id`, `service_id`, `professional_id` (não mais nomes em português)

3. **Limpe o localStorage (se necessário):**
   ```javascript
   localStorage.removeItem('clinicflow_user')
   ```
   - Depois faça login novamente
