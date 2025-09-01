# DOCUMENTAÇÃO OPERACIONAL - HUB DE MÉTRICAS

## 1. DEPLOY E CONFIGURAÇÃO INICIAL

### Passo 1: Executar Schema no Supabase
```bash
# Via SQL Editor no Supabase Dashboard
1. Acesse o Supabase Dashboard
2. Vá para "SQL Editor"
3. Cole o conteúdo do arquivo hub_metricas_schema.sql
4. Execute o script completo
5. Verifique se todas as tabelas e views foram criadas
```

### Passo 2: Configurar Variáveis de Ambiente
```bash
# No arquivo .env do projeto
SUPABASE_URL=https://[PROJECT-ID].supabase.co
SUPABASE_ANON_KEY=[YOUR_ANON_KEY]
SUPABASE_SERVICE_ROLE_KEY=[YOUR_SERVICE_ROLE_KEY]

# Para Make.com
SUPABASE_REST_URL=https://[PROJECT-ID].supabase.co/rest/v1
```

### Passo 3: Validar Configuração
```sql
-- Verificar se as tabelas foram criadas
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN ('cards', 'commits', 'bugs', 'worklogs')
ORDER BY table_name;

-- Verificar se as views foram criadas
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
    AND table_name LIKE 'metrics_%'
ORDER BY table_name;

-- Testar dados de exemplo
SELECT COUNT(*) FROM public.cards;
SELECT * FROM public.metrics_cycle_time LIMIT 5;
```

---

## 2. BACKUP E RECUPERAÇÃO

### Backup Automático (Recomendado)
```sql
-- Configurar backup no Supabase Dashboard
-- Settings > Database > Point-in-time Recovery (PITR)
-- Habilitar backups automáticos diários

-- Verificar status do backup
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    most_common_vals
FROM pg_stats 
WHERE schemaname = 'public' 
    AND tablename IN ('cards', 'commits', 'bugs', 'worklogs')
ORDER BY tablename, attname;
```

### Backup Manual via pg_dump
```bash
# Backup completo do schema público
pg_dump \
  --host=db.[PROJECT-ID].supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --schema=public \
  --data-only \
  --file=hub_metricas_backup_$(date +%Y%m%d).sql

# Backup apenas das tabelas de dados (sem views)
pg_dump \
  --host=db.[PROJECT-ID].supabase.co \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --table=public.cards \
  --table=public.commits \
  --table=public.bugs \
  --table=public.worklogs \
  --data-only \
  --file=hub_metricas_data_$(date +%Y%m%d).sql
```

### Estratégia de Backup
```yaml
# backup_schedule.yml
Daily:
  - Full database backup (PITR - automático)
  - Export de métricas consolidadas para S3/GCS
  
Weekly:
  - Backup completo via pg_dump
  - Validação de integridade dos dados
  
Monthly:
  - Archive de dados antigos (>1 ano)
  - Otimização de índices e vacuum
```

---

## 3. MATERIALIZED VIEWS - REFRESH E MANUTENÇÃO

### Refresh Manual
```sql
-- Refresh da view principal
REFRESH MATERIALIZED VIEW CONCURRENTLY public.metrics_summary_monthly;

-- Verificar último refresh
SELECT 
    schemaname,
    matviewname,
    hasindexes,
    ispopulated,
    definition
FROM pg_matviews 
WHERE schemaname = 'public';
```

### Automatização via Edge Function
```typescript
// supabase/functions/refresh-metrics/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Refresh materialized views
    const { data, error } = await supabase.rpc('refresh_metrics_materialized_views')
    
    if (error) throw error

    // Log da operação
    await supabase.from('system_logs').insert({
      operation: 'refresh_materialized_views_scheduled',
      details: { status: 'success', timestamp: new Date().toISOString() }
    })

    return new Response(
      JSON.stringify({ success: true, message: 'Materialized views refreshed' }),
      { headers: { "Content-Type": "application/json" } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
})
```

### Cron Job para Refresh Automático
```sql
-- Usando pg_cron (se disponível)
SELECT cron.schedule('refresh-metrics', '0 2 * * *', 'SELECT refresh_metrics_materialized_views();');

-- Via webhook externa (GitHub Actions, Netlify, etc.)
-- GET https://[PROJECT-ID].supabase.co/functions/v1/refresh-metrics
-- Authorization: Bearer [SERVICE_ROLE_KEY]
```

### Monitoramento de Performance
```sql
-- Verificar tamanho das materialized views
SELECT 
    schemaname,
    matviewname,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||matviewname)) as size
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||matviewname) DESC;

-- Verificar performance das consultas
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows
FROM pg_stat_statements 
WHERE query LIKE '%metrics_%'
ORDER BY total_time DESC
LIMIT 10;
```

---

## 4. AUDITORIA E MONITORAMENTO

### Log de Operações
```sql
-- Consultar logs do sistema
SELECT 
    operation,
    timestamp,
    details,
    user_email
FROM public.system_logs
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY timestamp DESC
LIMIT 50;

-- Monitorar inserções por fonte
SELECT 
    DATE_TRUNC('day', inserted_at) AS dia,
    COUNT(*) AS total_registros,
    COUNT(*) FILTER (WHERE card_id IS NOT NULL) AS com_card_associado
FROM public.commits
WHERE inserted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', inserted_at)
ORDER BY dia DESC;
```

### Alertas de Qualidade de Dados
```sql
-- Cards com dados inconsistentes
SELECT 
    'Cards com status inconsistente' AS alerta,
    COUNT(*) AS quantidade
FROM public.cards
WHERE (
    (status = 'doing' AND in_progress_at IS NULL) OR
    (status = 'done' AND (in_progress_at IS NULL OR done_at IS NULL)) OR
    (done_at IS NOT NULL AND done_at < in_progress_at) OR
    (in_progress_at IS NOT NULL AND in_progress_at < created_at)
)

UNION ALL

-- Worklogs com duração inconsistente
SELECT 
    'Worklogs com duração inconsistente' AS alerta,
    COUNT(*) AS quantidade
FROM public.worklogs
WHERE minutes != EXTRACT(EPOCH FROM (ended_at - started_at)) / 60

UNION ALL

-- Commits órfãos (sem card)
SELECT 
    'Commits sem card associado' AS alerta,
    COUNT(*) AS quantidade
FROM public.commits
WHERE card_id IS NULL
    AND inserted_at >= CURRENT_DATE - INTERVAL '7 days';
```

### Monitoramento de Ingestão
```sql
-- Volume de dados por dia (últimos 30 dias)
SELECT 
    DATE_TRUNC('day', inserted_at) AS dia,
    'cards' AS tabela,
    COUNT(*) AS registros
FROM public.cards
WHERE inserted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', inserted_at)

UNION ALL

SELECT 
    DATE_TRUNC('day', inserted_at) AS dia,
    'commits' AS tabela,
    COUNT(*) AS registros
FROM public.commits
WHERE inserted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', inserted_at)

UNION ALL

SELECT 
    DATE_TRUNC('day', inserted_at) AS dia,
    'worklogs' AS tabela,
    COUNT(*) AS registros
FROM public.worklogs
WHERE inserted_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', inserted_at)

ORDER BY dia DESC, tabela;
```

---

## 5. MANUTENÇÃO E OTIMIZAÇÃO

### Limpeza de Dados Antigos
```sql
-- Arquivar dados antigos (>2 anos) para tabela de histórico
CREATE TABLE IF NOT EXISTS public.cards_archive (LIKE public.cards INCLUDING ALL);

-- Mover dados antigos
WITH moved_cards AS (
    DELETE FROM public.cards 
    WHERE created_at < CURRENT_DATE - INTERVAL '2 years'
    RETURNING *
)
INSERT INTO public.cards_archive SELECT * FROM moved_cards;

-- Limpar logs antigos (>6 meses)
DELETE FROM public.system_logs 
WHERE timestamp < CURRENT_DATE - INTERVAL '6 months';
```

### Otimização de Performance
```sql
-- Reindex periódico (mensal)
REINDEX INDEX CONCURRENTLY idx_cards_created_at;
REINDEX INDEX CONCURRENTLY idx_commits_committed_at;
REINDEX INDEX CONCURRENTLY idx_worklogs_started_at;

-- Vacuum e analyze
VACUUM ANALYZE public.cards;
VACUUM ANALYZE public.commits;
VACUUM ANALYZE public.bugs;
VACUUM ANALYZE public.worklogs;

-- Estatísticas de uso dos índices
SELECT 
    indexrelname AS index_name,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Checklist de Manutenção Mensal
```yaml
Checklist_Mensal:
  Data_Quality:
    - [ ] Executar queries de auditoria
    - [ ] Verificar cards com dados inconsistentes
    - [ ] Validar integridade referencial
    
  Performance:
    - [ ] Refresh das materialized views
    - [ ] Reindex dos índices principais
    - [ ] VACUUM ANALYZE nas tabelas
    - [ ] Verificar estatísticas de uso
    
  Backup:
    - [ ] Validar backups automáticos
    - [ ] Backup manual completo
    - [ ] Testar restore em ambiente de teste
    
  Monitoring:
    - [ ] Revisar logs de sistema
    - [ ] Verificar volume de ingestão
    - [ ] Alertas de qualidade de dados
    
  Cleanup:
    - [ ] Arquivar dados antigos (>2 anos)
    - [ ] Limpar logs antigos (>6 meses)
    - [ ] Otimizar storage
```

---

## 6. TROUBLESHOOTING COMUM

### Problema: Edge Function Timeout
```typescript
// Solução: Pagination em batches
const batchSize = 1000;
let offset = 0;
let hasMore = true;

while (hasMore) {
  const { data, error } = await supabase
    .from('cards')
    .select('*')
    .range(offset, offset + batchSize - 1);
    
  if (!data || data.length < batchSize) {
    hasMore = false;
  }
  
  offset += batchSize;
  // Process batch...
}
```

### Problema: Materialized View Locks
```sql
-- Verificar locks ativos
SELECT 
    pg_class.relname,
    pg_locks.locktype,
    pg_locks.mode,
    pg_locks.granted
FROM pg_locks
JOIN pg_class ON pg_locks.relation = pg_class.oid
WHERE pg_class.relname LIKE 'metrics_%';

-- Matar queries longas (se necessário)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE query LIKE '%REFRESH MATERIALIZED VIEW%'
    AND state = 'active'
    AND query_start < NOW() - INTERVAL '1 hour';
```

### Problema: RLS Blocks Automation
```sql
-- Verificar políticas RLS
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Desabilitar temporariamente para debug
ALTER TABLE public.cards DISABLE ROW LEVEL SECURITY;
-- ... fazer testes ...
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
```

---

## 7. ESCALABILIDADE E CRESCIMENTO

### Particionamento de Tabelas (Para crescimento futuro)
```sql
-- Exemplo: Particionar worklogs por mês
CREATE TABLE public.worklogs_2025_09 PARTITION OF public.worklogs
FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

-- Automatizar criação de partições
CREATE OR REPLACE FUNCTION create_monthly_partition()
RETURNS void AS $$
DECLARE
    partition_date date;
    partition_name text;
    start_date text;
    end_date text;
BEGIN
    partition_date := date_trunc('month', CURRENT_DATE + interval '1 month');
    partition_name := 'worklogs_' || to_char(partition_date, 'YYYY_MM');
    start_date := partition_date::text;
    end_date := (partition_date + interval '1 month')::text;
    
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I PARTITION OF public.worklogs 
                    FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, start_date, end_date);
END;
$$ LANGUAGE plpgsql;
```

### Monitoring de Crescimento
```sql
-- Tracking de crescimento de dados
SELECT 
    'cards' AS tabela,
    COUNT(*) AS registros_totais,
    COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '30 days') AS registros_ultimo_mes,
    pg_size_pretty(pg_total_relation_size('public.cards')) AS tamanho_atual
UNION ALL
SELECT 
    'commits' AS tabela,
    COUNT(*) AS registros_totais,
    COUNT(*) FILTER (WHERE inserted_at >= CURRENT_DATE - INTERVAL '30 days') AS registros_ultimo_mes,
    pg_size_pretty(pg_total_relation_size('public.commits')) AS tamanho_atual
FROM public.commits;
```