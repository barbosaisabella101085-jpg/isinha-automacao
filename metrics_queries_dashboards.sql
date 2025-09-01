# CONSULTAS SQL - MÉTRICAS E DASHBOARDS

## 1. CONSULTAS ESSENCIAIS PARA IA

### Pergunta: "Quantas horas cada pessoa trabalhou esta semana?"
```sql
SELECT 
    w.user_email,
    ROUND(SUM(w.minutes) / 60.0, 2) AS total_hours,
    COUNT(DISTINCT w.card_id) AS cards_worked_on,
    COUNT(w.id) AS total_sessions,
    ROUND(AVG(w.minutes), 0) AS avg_session_minutes
FROM public.worklogs w
WHERE w.started_at >= DATE_TRUNC('week', CURRENT_DATE)
    AND w.started_at < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
GROUP BY w.user_email
ORDER BY total_hours DESC;
```

### Pergunta: "Qual foi o tempo médio de ciclo nos últimos 30 dias?"
```sql
SELECT 
    COUNT(*) AS cards_completed,
    ROUND(AVG(EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 86400), 2) AS avg_cycle_time_days,
    ROUND(AVG(EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 3600), 2) AS avg_cycle_time_hours,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 86400), 2) AS median_cycle_time_days,
    ROUND(PERCENTILE_CONT(0.85) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 86400), 2) AS p85_cycle_time_days
FROM public.cards
WHERE status = 'done'
    AND done_at >= CURRENT_DATE - INTERVAL '30 days'
    AND in_progress_at IS NOT NULL
    AND done_at > in_progress_at;
```

### Pergunta: "Quais são os cards mais demorados em cada módulo?"
```sql
SELECT 
    module,
    id,
    titulo,
    ROUND(EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 86400, 2) AS cycle_time_days,
    ROUND(EXTRACT(EPOCH FROM (done_at - created_at)) / 86400, 2) AS lead_time_days,
    done_at
FROM public.cards
WHERE status = 'done'
    AND module IS NOT NULL
    AND in_progress_at IS NOT NULL
    AND done_at > in_progress_at
ORDER BY module, cycle_time_days DESC;
```

---

## 2. DASHBOARDS - GOOGLE SHEETS/DATA STUDIO

### Dashboard 1: Throughput Semanal
```sql
-- Para Google Sheets: aba "Throughput_Weekly"
SELECT 
    TO_CHAR(week_start, 'YYYY-MM-DD') AS semana,
    cards_completed AS cards_finalizados,
    modules_active AS modulos_ativos,
    ROUND(avg_cycle_time_days, 2) AS tempo_ciclo_medio_dias,
    ROUND(avg_lead_time_days, 2) AS lead_time_medio_dias
FROM public.metrics_throughput_week
WHERE week_start >= CURRENT_DATE - INTERVAL '12 weeks'
ORDER BY week_start DESC;
```

### Dashboard 2: WIP Diário (Últimos 30 dias)
```sql
-- Para Google Sheets: aba "WIP_Daily"
SELECT 
    TO_CHAR(date, 'YYYY-MM-DD') AS data,
    wip_count AS cards_em_progresso,
    wip_with_module AS cards_com_modulo,
    active_modules AS modulos_ativos
FROM public.metrics_wip_daily
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### Dashboard 3: Métricas por Equipe
```sql
-- Para Google Sheets: aba "Team_Performance"
SELECT 
    user_email AS desenvolvedor,
    TO_CHAR(week_start, 'YYYY-MM-DD') AS semana,
    ROUND(total_hours, 2) AS horas_trabalhadas,
    cards_worked AS cards_trabalhados,
    cards_completed AS cards_finalizados,
    ROUND(avg_session_minutes, 0) AS media_sessao_min,
    total_sessions AS total_sessoes,
    CASE 
        WHEN cards_worked > 0 THEN ROUND(total_hours / cards_worked, 2)
        ELSE 0 
    END AS horas_por_card
FROM public.metrics_team_productivity
WHERE week_start >= CURRENT_DATE - INTERVAL '8 weeks'
ORDER BY week_start DESC, total_hours DESC;
```

---

## 3. METABASE - QUERIES AVANÇADAS

### Gráfico 1: Cumulative Flow Diagram
```sql
-- Variável: {{days_back}} (padrão: 60)
SELECT 
    date AS "Data",
    todo_count AS "TODO",
    doing_count AS "DOING", 
    done_count AS "DONE",
    total_cards AS "Total"
FROM public.metrics_cfd
WHERE date >= CURRENT_DATE - INTERVAL '{{days_back}} days'
ORDER BY date;
```

### Gráfico 2: Distribuição de Cycle Time
```sql
-- Variável: {{module_filter}} (opcional)
SELECT 
    CASE 
        WHEN cycle_time_days <= 1 THEN '≤ 1 dia'
        WHEN cycle_time_days <= 3 THEN '1-3 dias'
        WHEN cycle_time_days <= 7 THEN '3-7 dias'
        WHEN cycle_time_days <= 14 THEN '1-2 semanas'
        WHEN cycle_time_days <= 30 THEN '2-4 semanas'
        ELSE '> 1 mês'
    END AS faixa_tempo,
    COUNT(*) AS quantidade_cards,
    ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) AS percentual
FROM public.metrics_cycle_time
WHERE done_at >= CURRENT_DATE - INTERVAL '90 days'
    AND ({{module_filter}} = '' OR module = {{module_filter}})
GROUP BY 1
ORDER BY 
    CASE 
        WHEN faixa_tempo = '≤ 1 dia' THEN 1
        WHEN faixa_tempo = '1-3 dias' THEN 2
        WHEN faixa_tempo = '3-7 dias' THEN 3
        WHEN faixa_tempo = '1-2 semanas' THEN 4
        WHEN faixa_tempo = '2-4 semanas' THEN 5
        ELSE 6
    END;
```

### Gráfico 3: Eficiência por Módulo
```sql
-- Variável: {{time_range}} (padrão: 30)
SELECT 
    module AS "Módulo",
    COUNT(*) AS "Cards Completados",
    ROUND(AVG(cycle_time_days), 2) AS "Cycle Time Médio (dias)",
    ROUND(AVG(lead_time_days), 2) AS "Lead Time Médio (dias)",
    COUNT(*) FILTER (WHERE cycle_time_days <= 3) AS "Cards ≤ 3 dias",
    ROUND(
        COUNT(*) FILTER (WHERE cycle_time_days <= 3) * 100.0 / COUNT(*), 
        1
    ) AS "% Cards Rápidos"
FROM public.metrics_cycle_time
WHERE done_at >= CURRENT_DATE - INTERVAL '{{time_range}} days'
    AND module IS NOT NULL
GROUP BY module
HAVING COUNT(*) >= 3
ORDER BY "Cards Completados" DESC;
```

---

## 4. CONSULTAS PARA ALERTAS E MONITORAMENTO

### Alerta 1: Cards Bloqueados (> 1 dia)
```sql
SELECT 
    id,
    titulo,
    module,
    status,
    ROUND(EXTRACT(EPOCH FROM (NOW() - in_progress_at)) / 86400, 1) AS dias_em_progresso,
    blocked_hours
FROM public.cards
WHERE status = 'doing'
    AND in_progress_at IS NOT NULL
    AND (
        blocked_hours > 8 OR
        EXTRACT(EPOCH FROM (NOW() - in_progress_at)) / 86400 > 7
    )
ORDER BY dias_em_progresso DESC;
```

### Alerta 2: Queda de Throughput
```sql
-- Compara última semana com média das 4 semanas anteriores
WITH last_week AS (
    SELECT cards_completed 
    FROM public.metrics_throughput_week 
    WHERE week_start = DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
),
avg_previous AS (
    SELECT AVG(cards_completed) as avg_throughput
    FROM public.metrics_throughput_week 
    WHERE week_start >= DATE_TRUNC('week', CURRENT_DATE - INTERVAL '5 weeks')
        AND week_start < DATE_TRUNC('week', CURRENT_DATE - INTERVAL '1 week')
)
SELECT 
    lw.cards_completed AS throughput_ultima_semana,
    ROUND(ap.avg_throughput, 2) AS throughput_medio_anterior,
    ROUND(
        (lw.cards_completed - ap.avg_throughput) * 100.0 / ap.avg_throughput, 
        1
    ) AS variacao_percentual,
    CASE 
        WHEN lw.cards_completed < ap.avg_throughput * 0.7 THEN 'CRÍTICO'
        WHEN lw.cards_completed < ap.avg_throughput * 0.85 THEN 'ATENÇÃO'
        ELSE 'OK'
    END AS status_alerta
FROM last_week lw, avg_previous ap;
```

### Alerta 3: Retrabalho Elevado
```sql
SELECT 
    module,
    COUNT(*) AS total_cards,
    COUNT(*) FILTER (WHERE reopened = TRUE) AS cards_reabertos,
    ROUND(
        COUNT(*) FILTER (WHERE reopened = TRUE) * 100.0 / COUNT(*), 
        1
    ) AS taxa_retrabalho_pct,
    AVG(bugs_related) AS media_bugs_por_card
FROM public.metrics_retrabalho
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY module
HAVING COUNT(*) >= 5 
    AND COUNT(*) FILTER (WHERE reopened = TRUE) * 100.0 / COUNT(*) > 15
ORDER BY taxa_retrabalho_pct DESC;
```

---

## 5. CONSULTAS PARA ANÁLISE PREDITIVA

### Previsão de Entrega (Monte Carlo)
```sql
-- Baseado no throughput histórico para estimar entregas futuras
WITH historical_throughput AS (
    SELECT 
        week_start,
        cards_completed,
        LAG(cards_completed, 1) OVER (ORDER BY week_start) AS prev_week,
        LAG(cards_completed, 2) OVER (ORDER BY week_start) AS prev_week_2,
        LAG(cards_completed, 3) OVER (ORDER BY week_start) AS prev_week_3
    FROM public.metrics_throughput_week
    WHERE week_start >= CURRENT_DATE - INTERVAL '12 weeks'
    ORDER BY week_start DESC
    LIMIT 1
),
wip_current AS (
    SELECT COUNT(*) as current_wip
    FROM public.cards 
    WHERE status IN ('todo', 'doing')
)
SELECT 
    ht.cards_completed AS throughput_ultima_semana,
    ROUND((ht.cards_completed + ht.prev_week + ht.prev_week_2 + ht.prev_week_3) / 4.0, 1) AS throughput_medio_4_semanas,
    wc.current_wip AS wip_atual,
    ROUND(
        wc.current_wip / NULLIF((ht.cards_completed + ht.prev_week + ht.prev_week_2 + ht.prev_week_3) / 4.0, 0), 
        1
    ) AS semanas_para_zerar_wip,
    DATE_TRUNC('week', CURRENT_DATE) + 
        INTERVAL '1 week' * CEILING(
            wc.current_wip / NULLIF((ht.cards_completed + ht.prev_week + ht.prev_week_2 + ht.prev_week_3) / 4.0, 0)
        ) AS data_estimada_conclusao
FROM historical_throughput ht, wip_current wc;
```

### Análise de Padrões de Commits
```sql
-- Identificar padrões de commits que indicam problemas
SELECT 
    c.card_id,
    ca.titulo,
    ca.module,
    COUNT(c.id) AS total_commits,
    COUNT(c.id) FILTER (WHERE c.message ILIKE '%fix%' OR c.message ILIKE '%bug%') AS fix_commits,
    COUNT(c.id) FILTER (WHERE c.message ILIKE '%refactor%' OR c.message ILIKE '%cleanup%') AS refactor_commits,
    ROUND(
        COUNT(c.id) FILTER (WHERE c.message ILIKE '%fix%' OR c.message ILIKE '%bug%') * 100.0 / COUNT(c.id),
        1
    ) AS taxa_fixes_pct,
    MAX(c.committed_at) - MIN(c.committed_at) AS duracao_desenvolvimento
FROM public.commits c
JOIN public.cards ca ON ca.id = c.card_id
WHERE c.committed_at >= CURRENT_DATE - INTERVAL '60 days'
    AND ca.status = 'done'
GROUP BY c.card_id, ca.titulo, ca.module
HAVING COUNT(c.id) >= 3
ORDER BY taxa_fixes_pct DESC, total_commits DESC;
```

---

## 6. QUERIES PARA RELATÓRIOS EXECUTIVOS

### Resumo Mensal para C-Level
```sql
-- Utiliza a materialized view para performance
SELECT 
    TO_CHAR(month_start, 'YYYY-MM') AS mes,
    cards_completed AS "Cards Entregues",
    ROUND(avg_lead_time_days, 1) AS "Lead Time Médio (dias)",
    ROUND(avg_cycle_time_days, 1) AS "Cycle Time Médio (dias)",
    active_modules AS "Módulos Ativos",
    cards_reopened AS "Cards Reabertos",
    ROUND(cards_reopened * 100.0 / cards_completed, 1) AS "Taxa Retrabalho (%)",
    ROUND(median_lead_time_days, 1) AS "Lead Time Mediano (dias)",
    ROUND(p85_lead_time_days, 1) AS "85º Percentil Lead Time (dias)"
FROM public.metrics_summary_monthly
WHERE month_start >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
ORDER BY month_start DESC;
```

### Benchmark de Performance por Equipe
```sql
SELECT 
    tp.user_email AS "Desenvolvedor",
    COUNT(DISTINCT tp.week_start) AS "Semanas Ativas",
    ROUND(AVG(tp.total_hours), 2) AS "Média Horas/Semana",
    ROUND(AVG(tp.cards_completed), 2) AS "Média Cards/Semana",
    ROUND(AVG(tp.total_hours / NULLIF(tp.cards_completed, 0)), 2) AS "Horas por Card",
    ROUND(AVG(ct.cycle_time_days), 2) AS "Cycle Time Médio (dias)"
FROM public.metrics_team_productivity tp
LEFT JOIN public.cards c ON c.id IN (
    SELECT DISTINCT w.card_id 
    FROM public.worklogs w 
    WHERE w.user_email = tp.user_email
        AND w.started_at >= tp.week_start
        AND w.started_at < tp.week_start + INTERVAL '7 days'
)
LEFT JOIN public.metrics_cycle_time ct ON ct.id = c.id
WHERE tp.week_start >= CURRENT_DATE - INTERVAL '8 weeks'
    AND tp.total_hours > 0
GROUP BY tp.user_email
HAVING COUNT(DISTINCT tp.week_start) >= 4
ORDER BY "Média Cards/Semana" DESC;
```