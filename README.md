# HUB DE MÉTRICAS DE DESENVOLVIMENTO - SUPABASE

## 🎯 Visão Geral

O Hub de Métricas de Desenvolvimento é uma solução completa para consolidar dados de desenvolvimento (cards, commits, bugs, worklogs) no Supabase, fornecendo métricas de Lead Time, Cycle Time, WIP, Throughput, CFD e outras análises essenciais para equipes ágeis.

### 📊 Métricas Disponíveis
- **Lead Time**: Tempo total desde criação até conclusão
- **Cycle Time**: Tempo de desenvolvimento ativo
- **Throughput**: Cards completados por período
- **WIP (Work in Progress)**: Cards em andamento
- **CFD (Cumulative Flow Diagram)**: Fluxo cumulativo
- **Team Productivity**: Produtividade por pessoa
- **Retrabalho**: Cards reabertos e bugs relacionados

---

## 🚀 Quick Start

### 1. Deploy do Schema
```sql
-- Execute no SQL Editor do Supabase Dashboard
-- Arquivo: hub_metricas_schema.sql
```

### 2. Configurar Variáveis
```bash
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]
```

### 3. Testar Inserção
```bash
# Exemplo de upsert de card
curl -X POST "$SUPABASE_URL/rest/v1/cards" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "id": "TEST-001",
    "titulo": "Teste de integração",
    "status": "todo",
    "created_at": "2025-08-26T09:00:00Z",
    "module": "test"
  }'
```

---

## 📁 Estrutura dos Arquivos

### 🗄️ Schema e Banco de Dados
- **`hub_metricas_schema.sql`** - Schema completo com tabelas, índices, views e RLS
  - Tabelas: `cards`, `commits`, `bugs`, `worklogs`
  - Views: `metrics_cycle_time`, `metrics_lead_time`, `metrics_throughput_week`, etc.
  - Materialized Views: `metrics_summary_monthly`
  - Políticas de segurança (RLS)

### 🌐 Integração REST API
- **`rest_api_upsert_examples.md`** - Exemplos completos de upsert via REST
  - Curl commands para cada tabela
  - Batch inserts
  - Tratamento de erros
  - Headers obrigatórios

### 🔗 Automação Make.com
- **`make_com_integration_guide.md`** - Guia de integração com Make.com
  - Mapeamento Google Sheets → Supabase
  - Transformações de data (YYYY-MM-DD HH:mm:ss → ISO 8601)
  - Tratamento de valores nulos/vazios
  - Cenários para GitHub, Jira, etc.

### 📈 Métricas e Dashboards
- **`metrics_queries_dashboards.sql`** - Consultas SQL prontas
  - Queries para IA ("horas trabalhadas esta semana", "tempo médio de ciclo")
  - Dashboards Google Sheets/Data Studio
  - Gráficos Metabase
  - Alertas de monitoramento

### 🛠️ Operação e Manutenção
- **`operational_documentation.md`** - Documentação operacional
  - Deploy e configuração inicial
  - Backup e recuperação
  - Refresh de materialized views
  - Auditoria e monitoramento
  - Troubleshooting

---

## 🏗️ Arquitetura das Tabelas

### `public.cards`
Tabela principal dos cartões/tickets de desenvolvimento.
```sql
id TEXT PRIMARY KEY                 -- ID único do card
titulo TEXT NOT NULL               -- Título/descrição
status card_status                 -- 'todo'|'doing'|'done'
created_at TIMESTAMPTZ            -- Data de criação
in_progress_at TIMESTAMPTZ        -- Quando entrou em progresso
done_at TIMESTAMPTZ               -- Data de conclusão
reopened BOOLEAN                  -- Se foi reaberto
blocked_hours NUMERIC(10,2)       -- Horas bloqueado
module TEXT                       -- Módulo/componente
labels TEXT[]                     -- Tags/labels
updated_at TIMESTAMPTZ            -- Última atualização
```

### `public.commits`
Commits relacionados aos cards.
```sql
id TEXT PRIMARY KEY               -- SHA do commit
card_id TEXT                     -- Relacionamento com card
repo TEXT                        -- Nome do repositório
author_email TEXT                -- Email do autor
message TEXT                     -- Mensagem do commit
committed_at TIMESTAMPTZ         -- Data do commit
```

### `public.worklogs`
Registros de tempo trabalhado.
```sql
id BIGSERIAL PRIMARY KEY         -- ID sequencial
user_email TEXT                  -- Email do usuário
card_id TEXT                     -- Card relacionado
started_at TIMESTAMPTZ           -- Início do trabalho
ended_at TIMESTAMPTZ             -- Fim do trabalho
minutes INTEGER                  -- Duração em minutos
note TEXT                        -- Observações
```

---

## 📊 Views de Métricas Principais

### `metrics_cycle_time`
Tempo de desenvolvimento (doing → done)
```sql
SELECT * FROM public.metrics_cycle_time 
WHERE done_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cycle_time_days DESC;
```

### `metrics_lead_time`
Tempo total (criação → conclusão)
```sql
SELECT * FROM public.metrics_lead_time 
WHERE done_at >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY lead_time_days DESC;
```

### `metrics_throughput_week`
Cards completados por semana
```sql
SELECT * FROM public.metrics_throughput_week 
ORDER BY week_start DESC;
```

### `metrics_wip_daily`
Work in Progress diário
```sql
SELECT * FROM public.metrics_wip_daily 
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

---

## 🧪 Como Rodar Testes E2E

Este projeto inclui uma suíte de testes automatizados E2E (End-to-End) usando Playwright para reduzir o gargalo de testes manuais repetitivos.

### 📋 Pré-requisitos
- Node.js (versão 16 ou superior)
- NPM ou Yarn
- Aplicação rodando em ambiente de teste

### ⚙️ Configuração Inicial

1. **Instalar dependências:**
```bash
npm install
```

2. **Instalar browsers do Playwright:**
```bash
npm run e2e:install
```

3. **Configurar variáveis de ambiente (OBRIGATÓRIO):**
```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar .env com suas configurações REAIS:
# BASE_URL=https://seu-ambiente-de-teste.com
# USER_EMAIL=seu.usuario@teste.com
# USER_PASS=sua_senha_teste
```

4. **Validar configuração:**
```bash
npm run validate:env
```

⚠️ **IMPORTANTE**: Todas as variáveis do .env são obrigatórias. Os testes falharão se BASE_URL não estiver configurado.

### 🚀 Execução Rápida

**Validar configuração do ambiente:**
```bash
npm run validate:env
```

**Executar todos os testes E2E:**
```bash
npm run test:e2e
```

**Executar teste específico com browser visível:**
```bash
npm run test:e2e:one -- qa/e2e/tests/login.spec.ts:12 --project=chromium --headed
```

**Ver relatório dos testes:**
Os relatórios são gerados em `qa/e2e/report`.
```bash
npm run test:e2e:report
```

### 📚 Comandos Adicionais

**Executar com interface visual:**
```bash
npm run test:e2e:ui
```

**Executar com browser visível:**
```bash
npm run test:e2e:headed
```

**Executar em navegador específico:**
```bash
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit
```

**Gerar código de teste automaticamente:**
```bash
npm run e2e:codegen
```

### 📁 Estrutura dos Testes

```
qa/
├── e2e/
│   ├── tests/           # Arquivos de teste (.spec.ts)
│   ├── pages/           # Page Object Model
│   ├── fixtures/        # Dados de teste
│   ├── report/          # Relatórios HTML
│   ├── test-results/    # Screenshots, traces, videos
│   ├── playwright.config.ts
│   └── tsconfig.json
```

### 🎯 Funcionalidades dos Testes

- **Page Object Model**: Estrutura organizada e reutilizável
- **Screenshots automáticos** em falhas
- **Trace viewer** para debug detalhado
- **Relatórios HTML** com detalhes visuais
- **Suporte a múltiplos browsers** (Chrome, Firefox, Safari)
- **Integração com CI/CD** (GitHub Actions)
- **Variáveis de ambiente** para diferentes ambientes

### 🔧 Personalizando os Testes

1. **Ajustar seletores**: Edite os seletores em `qa/e2e/pages/LoginPage.ts` para corresponder à sua aplicação
2. **Adicionar novos testes**: Crie arquivos `.spec.ts` em `qa/e2e/tests/`
3. **Criar novas pages**: Adicione Page Objects em `qa/e2e/pages/`
4. **Configurar timeouts**: Ajuste timeouts em `playwright.config.ts`

### 🐛 Troubleshooting

**Teste falha com "element not found":**
- Verifique os seletores em `LoginPage.ts`
- Use `npm run e2e:codegen` para gerar seletores automaticamente

**Problemas de timeout:**
- Aumente os timeouts em `playwright.config.ts`
- Verifique se `BASE_URL` está correto no `.env`

**Credenciais inválidas:**
- Verifique `USER_EMAIL` e `USER_PASS` no arquivo `.env`
- Confirme que as credenciais funcionam manualmente

---

## 🔧 Integração Make.com - Exemplo Rápido

### Google Sheets → Supabase Cards

1. **Trigger**: Google Sheets - Watch Rows
2. **Transform**: Datas e nulls
3. **Action**: HTTP Request POST

```javascript
// Transformação de data
{{if(1.Created_at != ""; formatDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}

// Tratamento de null
{{if(1.Module != ""; 1.Module; null)}}

// Arrays (labels)
{{if(1.Labels != ""; split(1.Labels; ","); emptyarray)}}
```

**Body JSON:**
```json
{
  "id": "{{1.ID}}",
  "titulo": "{{1.Título}}",
  "status": "{{lower(1.Status)}}",
  "created_at": "{{transformed_date}}",
  "module": "{{transformed_module}}"
}
```

---

## 🔍 Consultas Essenciais para IA

### "Quantas horas cada pessoa trabalhou esta semana?"
```sql
SELECT 
    user_email,
    ROUND(SUM(minutes) / 60.0, 2) AS total_hours,
    COUNT(DISTINCT card_id) AS cards_worked
FROM public.worklogs
WHERE started_at >= DATE_TRUNC('week', CURRENT_DATE)
GROUP BY user_email
ORDER BY total_hours DESC;
```

### "Tempo médio de ciclo nos últimos 30 dias?"
```sql
SELECT 
    ROUND(AVG(cycle_time_days), 2) AS avg_cycle_time_days,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cycle_time_days), 2) AS median_cycle_time_days
FROM public.metrics_cycle_time
WHERE done_at >= CURRENT_DATE - INTERVAL '30 days';
```

### "Cards mais demorados por módulo?"
```sql
SELECT module, titulo, cycle_time_days
FROM public.metrics_cycle_time
WHERE module IS NOT NULL
ORDER BY module, cycle_time_days DESC;
```

---

## 🛡️ Segurança e Chaves

### Row Level Security (RLS)
- **Habilitado** em todas as tabelas principais
- **Leitura**: Usuários autenticados (`authenticated`)
- **Escrita**: Apenas `service_role` (automações)

### Chaves Supabase
- **`anon`**: Para consultas públicas (dashboards)
- **`service_role`**: Para automações (upserts via Make.com)

```bash
# Headers para automação
apikey: [SUPABASE_ANON_KEY]
Authorization: Bearer [SUPABASE_SERVICE_KEY]
Content-Type: application/json
Prefer: resolution=merge-duplicates,return=representation
```

---

## 🔄 Manutenção e Monitoramento

### Refresh de Materialized Views
```sql
-- Manual
REFRESH MATERIALIZED VIEW CONCURRENTLY public.metrics_summary_monthly;

-- Automático (função)
SELECT refresh_metrics_materialized_views();
```

### Auditoria de Dados
```sql
-- Verificar qualidade dos dados
SELECT 'Cards inconsistentes' AS alerta, COUNT(*) 
FROM public.cards
WHERE (status = 'doing' AND in_progress_at IS NULL)
   OR (status = 'done' AND done_at IS NULL);
```

### Backup
```bash
# Via pg_dump
pg_dump --host=db.[PROJECT-ID].supabase.co \
        --table=public.cards \
        --table=public.commits \
        --table=public.worklogs \
        --data-only \
        --file=backup_$(date +%Y%m%d).sql
```

---

## 📈 Exemplos de Dashboards

### Google Sheets - Throughput Semanal
```sql
SELECT 
    TO_CHAR(week_start, 'YYYY-MM-DD') AS semana,
    cards_completed AS cards_finalizados,
    ROUND(avg_cycle_time_days, 2) AS tempo_ciclo_medio
FROM public.metrics_throughput_week
ORDER BY week_start DESC;
```

### Metabase - Distribuição Cycle Time
```sql
SELECT 
    CASE 
        WHEN cycle_time_days <= 1 THEN '≤ 1 dia'
        WHEN cycle_time_days <= 3 THEN '1-3 dias'
        WHEN cycle_time_days <= 7 THEN '3-7 dias'
        ELSE '> 1 semana'
    END AS faixa_tempo,
    COUNT(*) AS quantidade
FROM public.metrics_cycle_time
WHERE done_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY 1;
```

---

## 🚨 Troubleshooting Rápido

### Problema: Make.com com erro de data
```javascript
// Verificar se é data válida antes de converter
{{if(isDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss")); formatDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}
```

### Problema: RLS bloqueando inserção
```sql
-- Verificar políticas
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Testar com service_role key
Authorization: Bearer [SERVICE_ROLE_KEY]
```

### Problema: Materialized View lock
```sql
-- Ver locks ativos
SELECT * FROM pg_locks WHERE relation = 'metrics_summary_monthly'::regclass;
```

---

## 🎉 Próximos Passos

1. **Execute** o schema SQL no Supabase
2. **Configure** as variáveis de ambiente
3. **Teste** os exemplos de upsert
4. **Configure** o primeiro cenário no Make.com
5. **Crie** seu primeiro dashboard
6. **Configure** refresh automático das materialized views

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique a **documentação operacional**
2. Execute as **queries de auditoria**
3. Consulte os **exemplos de troubleshooting**
4. Verifique os **logs no Supabase Dashboard**

---

**🔥 O Hub de Métricas está pronto para transformar seus dados de desenvolvimento em insights acionáveis!**