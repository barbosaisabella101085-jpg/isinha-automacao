-- =====================================================
-- HUB DE MÉTRICAS DE DESENVOLVIMENTO - SUPABASE SCHEMA
-- =====================================================
-- Versão: 1.0
-- Data: 2025-08-26
-- Descrição: Schema completo para consolidação de dados de desenvolvimento
-- (cards, commits, bugs, worklogs) com views de métricas para dashboards e IA

-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ENUMS
-- =====================================================
DO $$ BEGIN
    CREATE TYPE card_status AS ENUM ('todo', 'doing', 'done');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE bug_severity AS ENUM ('low', 'medium', 'high', 'critical');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =====================================================
-- TABELA: public.cards
-- =====================================================
-- Armazena informações dos cartões/tickets de desenvolvimento
CREATE TABLE IF NOT EXISTS public.cards (
    id TEXT PRIMARY KEY, -- ID único do card (origem externa)
    titulo TEXT NOT NULL, -- Título/descrição do card
    status card_status NOT NULL DEFAULT 'todo', -- Status atual do card
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Data de criação
    in_progress_at TIMESTAMPTZ, -- Data quando entrou em progresso
    done_at TIMESTAMPTZ, -- Data de conclusão
    reopened BOOLEAN DEFAULT FALSE, -- Se foi reaberto após conclusão
    blocked_hours NUMERIC(10,2) DEFAULT 0, -- Horas que ficou bloqueado
    module TEXT, -- Módulo/componente relacionado
    labels TEXT[] DEFAULT '{}', -- Tags/labels do card
    updated_at TIMESTAMPTZ DEFAULT NOW(), -- Última atualização
    
    -- Constraints de validação
    CONSTRAINT cards_status_transitions CHECK (
        (status = 'todo' AND in_progress_at IS NULL AND done_at IS NULL) OR
        (status = 'doing' AND in_progress_at IS NOT NULL AND done_at IS NULL) OR
        (status = 'done' AND in_progress_at IS NOT NULL AND done_at IS NOT NULL)
    ),
    CONSTRAINT cards_blocked_hours_positive CHECK (blocked_hours >= 0)
);

-- =====================================================
-- TABELA: public.commits
-- =====================================================
-- Armazena commits relacionados aos cards
CREATE TABLE IF NOT EXISTS public.commits (
    id TEXT PRIMARY KEY, -- SHA do commit
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE, -- Relacionamento com card
    repo TEXT NOT NULL, -- Nome do repositório
    author_email TEXT NOT NULL, -- Email do autor
    message TEXT NOT NULL, -- Mensagem do commit
    committed_at TIMESTAMPTZ NOT NULL, -- Data do commit
    inserted_at TIMESTAMPTZ DEFAULT NOW(), -- Data de inserção no sistema
    
    -- Índices para performance
    CONSTRAINT commits_committed_at_valid CHECK (committed_at <= NOW())
);

-- =====================================================
-- TABELA: public.bugs
-- =====================================================
-- Armazena bugs relacionados aos cards
CREATE TABLE IF NOT EXISTS public.bugs (
    id TEXT PRIMARY KEY, -- ID único do bug
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE, -- Card relacionado
    title TEXT NOT NULL, -- Título do bug
    severity bug_severity NOT NULL DEFAULT 'medium', -- Severidade
    opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- Data de abertura
    closed_at TIMESTAMPTZ, -- Data de fechamento
    inserted_at TIMESTAMPTZ DEFAULT NOW(), -- Data de inserção
    
    -- Validações
    CONSTRAINT bugs_dates_valid CHECK (
        closed_at IS NULL OR closed_at >= opened_at
    )
);

-- =====================================================
-- TABELA: public.worklogs
-- =====================================================
-- Armazena registros de tempo trabalhado
CREATE TABLE IF NOT EXISTS public.worklogs (
    id BIGSERIAL PRIMARY KEY, -- ID sequencial
    user_email TEXT NOT NULL, -- Email do usuário
    card_id TEXT REFERENCES public.cards(id) ON DELETE CASCADE, -- Card relacionado
    source TEXT NOT NULL DEFAULT 'manual', -- Origem do registro (manual, automatic, etc)
    started_at TIMESTAMPTZ NOT NULL, -- Início do trabalho
    ended_at TIMESTAMPTZ NOT NULL, -- Fim do trabalho
    minutes INTEGER NOT NULL CHECK (minutes >= 0), -- Duração em minutos
    note TEXT, -- Observações opcionais
    inserted_at TIMESTAMPTZ DEFAULT NOW(), -- Data de inserção
    
    -- Validações
    CONSTRAINT worklogs_times_valid CHECK (ended_at > started_at),
    CONSTRAINT worklogs_minutes_consistent CHECK (
        minutes = EXTRACT(EPOCH FROM (ended_at - started_at)) / 60
    )
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

-- Índices para cards
CREATE INDEX IF NOT EXISTS idx_cards_status ON public.cards(status);
CREATE INDEX IF NOT EXISTS idx_cards_created_at ON public.cards(created_at);
CREATE INDEX IF NOT EXISTS idx_cards_updated_at ON public.cards(updated_at);
CREATE INDEX IF NOT EXISTS idx_cards_module ON public.cards(module);

-- Índices para commits
CREATE INDEX IF NOT EXISTS idx_commits_card_id ON public.commits(card_id);
CREATE INDEX IF NOT EXISTS idx_commits_committed_at ON public.commits(committed_at);
CREATE INDEX IF NOT EXISTS idx_commits_author_email ON public.commits(author_email);
CREATE INDEX IF NOT EXISTS idx_commits_repo ON public.commits(repo);

-- Índices para bugs
CREATE INDEX IF NOT EXISTS idx_bugs_card_id ON public.bugs(card_id);
CREATE INDEX IF NOT EXISTS idx_bugs_opened_at ON public.bugs(opened_at);
CREATE INDEX IF NOT EXISTS idx_bugs_severity ON public.bugs(severity);

-- Índices para worklogs
CREATE INDEX IF NOT EXISTS idx_worklogs_card_id ON public.worklogs(card_id);
CREATE INDEX IF NOT EXISTS idx_worklogs_user_email ON public.worklogs(user_email);
CREATE INDEX IF NOT EXISTS idx_worklogs_started_at ON public.worklogs(started_at);
CREATE INDEX IF NOT EXISTS idx_worklogs_dates ON public.worklogs(started_at, ended_at);

-- =====================================================
-- TRIGGER PARA updated_at EM CARDS
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_cards_updated_at ON public.cards;
CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON public.cards
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- VIEW: metrics_cycle_time
-- =====================================================
-- Calcula o cycle time (tempo de desenvolvimento) dos cards
CREATE OR REPLACE VIEW public.metrics_cycle_time AS
SELECT 
    id,
    titulo,
    module,
    in_progress_at,
    done_at,
    EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 3600 AS cycle_time_hours,
    EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 86400 AS cycle_time_days,
    DATE_TRUNC('week', done_at) AS week_completed,
    DATE_TRUNC('month', done_at) AS month_completed
FROM public.cards
WHERE status = 'done' 
    AND in_progress_at IS NOT NULL 
    AND done_at IS NOT NULL
    AND done_at > in_progress_at;

-- =====================================================
-- VIEW: metrics_lead_time
-- =====================================================
-- Calcula o lead time (tempo total desde criação até conclusão)
CREATE OR REPLACE VIEW public.metrics_lead_time AS
SELECT 
    id,
    titulo,
    module,
    created_at,
    done_at,
    EXTRACT(EPOCH FROM (done_at - created_at)) / 3600 AS lead_time_hours,
    EXTRACT(EPOCH FROM (done_at - created_at)) / 86400 AS lead_time_days,
    DATE_TRUNC('week', done_at) AS week_completed,
    DATE_TRUNC('month', done_at) AS month_completed
FROM public.cards
WHERE status = 'done' 
    AND done_at IS NOT NULL
    AND done_at > created_at;

-- =====================================================
-- VIEW: metrics_throughput_week
-- =====================================================
-- Calcula throughput semanal (cards concluídos por semana)
CREATE OR REPLACE VIEW public.metrics_throughput_week AS
SELECT 
    DATE_TRUNC('week', done_at) AS week_start,
    COUNT(*) AS cards_completed,
    COUNT(DISTINCT module) AS modules_active,
    AVG(EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 86400) AS avg_cycle_time_days,
    AVG(EXTRACT(EPOCH FROM (done_at - created_at)) / 86400) AS avg_lead_time_days
FROM public.cards
WHERE status = 'done' 
    AND done_at IS NOT NULL
    AND done_at >= NOW() - INTERVAL '12 weeks'
GROUP BY DATE_TRUNC('week', done_at)
ORDER BY week_start DESC;

-- =====================================================
-- VIEW: metrics_wip_daily
-- =====================================================
-- Calcula WIP (Work in Progress) diário
CREATE OR REPLACE VIEW public.metrics_wip_daily AS
WITH date_series AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '30 days',
        CURRENT_DATE,
        INTERVAL '1 day'
    )::DATE AS date
),
wip_by_date AS (
    SELECT 
        ds.date,
        COUNT(c.id) AS wip_count,
        COUNT(c.id) FILTER (WHERE c.module IS NOT NULL) AS wip_with_module,
        STRING_AGG(DISTINCT c.module, ', ') AS active_modules
    FROM date_series ds
    LEFT JOIN public.cards c ON (
        c.status = 'doing' 
        AND c.in_progress_at::DATE <= ds.date
        AND (c.done_at IS NULL OR c.done_at::DATE > ds.date)
    )
    GROUP BY ds.date
)
SELECT * FROM wip_by_date
ORDER BY date DESC;

-- =====================================================
-- VIEW: metrics_cfd (Cumulative Flow Diagram)
-- =====================================================
-- Dados para Cumulative Flow Diagram
CREATE OR REPLACE VIEW public.metrics_cfd AS
WITH date_series AS (
    SELECT generate_series(
        CURRENT_DATE - INTERVAL '90 days',
        CURRENT_DATE,
        INTERVAL '1 day'
    )::DATE AS date
),
status_counts AS (
    SELECT 
        ds.date,
        COUNT(c.id) FILTER (WHERE c.created_at::DATE <= ds.date AND (c.in_progress_at IS NULL OR c.in_progress_at::DATE > ds.date)) AS todo_count,
        COUNT(c.id) FILTER (WHERE c.in_progress_at::DATE <= ds.date AND (c.done_at IS NULL OR c.done_at::DATE > ds.date)) AS doing_count,
        COUNT(c.id) FILTER (WHERE c.done_at::DATE <= ds.date) AS done_count
    FROM date_series ds
    LEFT JOIN public.cards c ON c.created_at::DATE <= ds.date
    GROUP BY ds.date
)
SELECT 
    date,
    todo_count,
    doing_count,
    done_count,
    (todo_count + doing_count + done_count) AS total_cards
FROM status_counts
ORDER BY date DESC;

-- =====================================================
-- VIEW: metrics_retrabalho
-- =====================================================
-- Identifica cards com retrabalho (reabertos)
CREATE OR REPLACE VIEW public.metrics_retrabalho AS
SELECT 
    id,
    titulo,
    module,
    reopened,
    created_at,
    done_at,
    COUNT(b.id) AS bugs_related,
    AVG(b.opened_at - c.done_at) AS avg_time_to_bug
FROM public.cards c
LEFT JOIN public.bugs b ON b.card_id = c.id
WHERE c.reopened = TRUE OR EXISTS (SELECT 1 FROM public.bugs WHERE card_id = c.id)
GROUP BY c.id, c.titulo, c.module, c.reopened, c.created_at, c.done_at;

-- =====================================================
-- VIEW: metrics_team_productivity
-- =====================================================
-- Métricas de produtividade por pessoa
CREATE OR REPLACE VIEW public.metrics_team_productivity AS
SELECT 
    w.user_email,
    DATE_TRUNC('week', w.started_at) AS week_start,
    SUM(w.minutes) / 60.0 AS total_hours,
    COUNT(DISTINCT w.card_id) AS cards_worked,
    COUNT(DISTINCT c.id) FILTER (WHERE c.status = 'done') AS cards_completed,
    AVG(w.minutes) AS avg_session_minutes,
    COUNT(w.id) AS total_sessions
FROM public.worklogs w
LEFT JOIN public.cards c ON c.id = w.card_id
WHERE w.started_at >= NOW() - INTERVAL '12 weeks'
GROUP BY w.user_email, DATE_TRUNC('week', w.started_at)
ORDER BY week_start DESC, total_hours DESC;

-- =====================================================
-- MATERIALIZED VIEW: metrics_summary_monthly
-- =====================================================
-- Resumo mensal consolidado (materialized para performance)
CREATE MATERIALIZED VIEW IF NOT EXISTS public.metrics_summary_monthly AS
SELECT 
    DATE_TRUNC('month', done_at) AS month_start,
    COUNT(*) AS cards_completed,
    AVG(EXTRACT(EPOCH FROM (done_at - created_at)) / 86400) AS avg_lead_time_days,
    AVG(EXTRACT(EPOCH FROM (done_at - in_progress_at)) / 86400) AS avg_cycle_time_days,
    COUNT(*) FILTER (WHERE reopened = TRUE) AS cards_reopened,
    COUNT(DISTINCT module) AS active_modules,
    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (done_at - created_at)) / 86400) AS median_lead_time_days,
    PERCENTILE_CONT(0.85) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (done_at - created_at)) / 86400) AS p85_lead_time_days
FROM public.cards
WHERE status = 'done' 
    AND done_at IS NOT NULL
    AND done_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', done_at)
ORDER BY month_start DESC;

-- Índice para materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_metrics_summary_monthly_month 
ON public.metrics_summary_monthly(month_start);

-- =====================================================
-- FUNÇÃO PARA REFRESH DAS MATERIALIZED VIEWS
-- =====================================================
CREATE OR REPLACE FUNCTION refresh_metrics_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.metrics_summary_monthly;
    
    -- Log do refresh
    INSERT INTO public.system_logs (operation, timestamp, details)
    VALUES ('refresh_materialized_views', NOW(), 'Materialized views refreshed successfully')
    ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TABELA DE LOGS DO SISTEMA (OPCIONAL)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.system_logs (
    id BIGSERIAL PRIMARY KEY,
    operation TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    details JSONB,
    user_email TEXT
);

CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON public.system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_operation ON public.system_logs(operation);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bugs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worklogs ENABLE ROW LEVEL SECURITY;

-- Política para leitura nas views (usuários autenticados)
CREATE POLICY "Allow read access to metrics views" ON public.cards
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to commits" ON public.commits
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to bugs" ON public.bugs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow read access to worklogs" ON public.worklogs
    FOR SELECT USING (auth.role() = 'authenticated');

-- Política para escrita (apenas service_role para automações)
CREATE POLICY "Allow service_role full access to cards" ON public.cards
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service_role full access to commits" ON public.commits
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service_role full access to bugs" ON public.bugs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Allow service_role full access to worklogs" ON public.worklogs
    FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- =====================================================
-- GRANTS PARA USUÁRIOS ANÔNIMOS (LEITURA DAS VIEWS)
-- =====================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.metrics_cycle_time TO anon, authenticated;
GRANT SELECT ON public.metrics_lead_time TO anon, authenticated;
GRANT SELECT ON public.metrics_throughput_week TO anon, authenticated;
GRANT SELECT ON public.metrics_wip_daily TO anon, authenticated;
GRANT SELECT ON public.metrics_cfd TO anon, authenticated;
GRANT SELECT ON public.metrics_retrabalho TO anon, authenticated;
GRANT SELECT ON public.metrics_team_productivity TO anon, authenticated;
GRANT SELECT ON public.metrics_summary_monthly TO anon, authenticated;

-- =====================================================
-- DADOS DE EXEMPLO PARA TESTE
-- =====================================================
-- Inserir alguns dados de exemplo para testar as views
INSERT INTO public.cards (id, titulo, status, created_at, in_progress_at, done_at, module) VALUES
('CARD-001', 'Implementar autenticação', 'done', '2025-08-01 09:00:00+00', '2025-08-02 09:00:00+00', '2025-08-05 17:00:00+00', 'auth'),
('CARD-002', 'Criar dashboard principal', 'doing', '2025-08-03 10:00:00+00', '2025-08-06 09:00:00+00', NULL, 'frontend'),
('CARD-003', 'Setup banco de dados', 'done', '2025-07-28 08:00:00+00', '2025-07-29 09:00:00+00', '2025-07-30 18:00:00+00', 'backend'),
('CARD-004', 'Documentação API', 'todo', '2025-08-10 14:00:00+00', NULL, NULL, 'docs')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.commits (id, card_id, repo, author_email, message, committed_at) VALUES
('abc123', 'CARD-001', 'backend-api', 'dev@empresa.com', 'feat: add JWT authentication', '2025-08-03 14:30:00+00'),
('def456', 'CARD-003', 'backend-api', 'dev@empresa.com', 'feat: setup postgres schema', '2025-07-29 16:00:00+00'),
('ghi789', 'CARD-001', 'backend-api', 'dev2@empresa.com', 'fix: auth middleware validation', '2025-08-04 11:20:00+00')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.worklogs (user_email, card_id, started_at, ended_at, minutes, note) VALUES
('dev@empresa.com', 'CARD-001', '2025-08-02 09:00:00+00', '2025-08-02 12:00:00+00', 180, 'Implementação inicial auth'),
('dev@empresa.com', 'CARD-001', '2025-08-03 14:00:00+00', '2025-08-03 18:00:00+00', 240, 'Refinamento e testes'),
('dev2@empresa.com', 'CARD-002', '2025-08-06 09:00:00+00', '2025-08-06 17:00:00+00', 480, 'Setup inicial dashboard')
ON CONFLICT DO NOTHING;

-- =====================================================
-- COMENTÁRIOS FINAIS
-- =====================================================
-- Este schema fornece:
-- 1. Estrutura completa de tabelas com validações
-- 2. Índices otimizados para consultas de métricas
-- 3. Views especializadas para diferentes tipos de análise
-- 4. Materialized views para performance em dados históricos
-- 5. Sistema de segurança com RLS
-- 6. Dados de exemplo para testes
-- 
-- Para atualizar as materialized views, execute:
-- SELECT refresh_metrics_materialized_views();
--
-- Para automação, configure um cron job no Supabase ou
-- Execute periodicamente via Edge Function