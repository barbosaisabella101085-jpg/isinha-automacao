# REST API - EXEMPLOS DE UPSERT PARA HUB DE MÉTRICAS

## Configuração Base

**URL Base:** `https://[YOUR_PROJECT_ID].supabase.co/rest/v1/`

**Headers Obrigatórios:**
```bash
apikey: [YOUR_ANON_KEY]
Authorization: Bearer [YOUR_SERVICE_ROLE_KEY]
Content-Type: application/json
Prefer: resolution=merge-duplicates,return=representation
```

**Variáveis de Ambiente:**
```bash
export SUPABASE_URL="https://[YOUR_PROJECT_ID].supabase.co"
export SUPABASE_SERVICE_KEY="[YOUR_SERVICE_ROLE_KEY]"
export SUPABASE_ANON_KEY="[YOUR_ANON_KEY]"
```

---

## 1. UPSERT CARDS

### Exemplo 1: Card Novo (Status TODO)
```bash
curl -X POST "$SUPABASE_URL/rest/v1/cards" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "id": "HU-2025-001",
    "titulo": "Implementar sistema de notificações push",
    "status": "todo",
    "created_at": "2025-08-26T09:00:00Z",
    "module": "notifications",
    "labels": ["feature", "mobile", "priority-high"]
  }'
```

### Exemplo 2: Card Movido para DOING
```bash
curl -X POST "$SUPABASE_URL/rest/v1/cards" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "id": "HU-2025-001",
    "titulo": "Implementar sistema de notificações push",
    "status": "doing",
    "created_at": "2025-08-26T09:00:00Z",
    "in_progress_at": "2025-08-26T14:30:00Z",
    "module": "notifications",
    "labels": ["feature", "mobile", "priority-high"]
  }'
```

### Exemplo 3: Card Concluído (DONE)
```bash
curl -X POST "$SUPABASE_URL/rest/v1/cards" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "id": "HU-2025-001",
    "titulo": "Implementar sistema de notificações push",
    "status": "done",
    "created_at": "2025-08-26T09:00:00Z",
    "in_progress_at": "2025-08-26T14:30:00Z",
    "done_at": "2025-08-28T16:45:00Z",
    "module": "notifications",
    "labels": ["feature", "mobile", "priority-high"],
    "blocked_hours": 2.5
  }'
```

### Exemplo 4: Batch Insert de Múltiplos Cards
```bash
curl -X POST "$SUPABASE_URL/rest/v1/cards" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '[
    {
      "id": "JIRA-123",
      "titulo": "Corrigir bug no login OAuth",
      "status": "todo",
      "created_at": "2025-08-26T10:00:00Z",
      "module": "auth",
      "labels": ["bug", "critical"]
    },
    {
      "id": "JIRA-124", 
      "titulo": "Otimizar queries do dashboard",
      "status": "doing",
      "created_at": "2025-08-25T08:00:00Z",
      "in_progress_at": "2025-08-26T09:00:00Z",
      "module": "performance",
      "labels": ["improvement", "backend"]
    }
  ]'
```

---

## 2. UPSERT COMMITS

### Exemplo 1: Commit Individual
```bash
curl -X POST "$SUPABASE_URL/rest/v1/commits" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "id": "a1b2c3d4e5f6789abc123def456789012345678",
    "card_id": "HU-2025-001",
    "repo": "mobile-app",
    "author_email": "dev@empresa.com",
    "message": "feat(notifications): implement push notification service\n\n- Add Firebase integration\n- Create notification templates\n- Add user preferences\n\nCloses HU-2025-001",
    "committed_at": "2025-08-27T15:30:45Z"
  }'
```

### Exemplo 2: Batch de Commits (GitHub Webhook)
```bash
curl -X POST "$SUPABASE_URL/rest/v1/commits" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '[
    {
      "id": "abc123def456789012345678901234567890abcd",
      "card_id": "JIRA-123",
      "repo": "backend-api",
      "author_email": "senior.dev@empresa.com",
      "message": "fix(auth): resolve OAuth callback timeout issue",
      "committed_at": "2025-08-26T11:20:30Z"
    },
    {
      "id": "def456789012345678901234567890abcdef123",
      "card_id": "JIRA-123", 
      "repo": "backend-api",
      "author_email": "senior.dev@empresa.com",
      "message": "test(auth): add integration tests for OAuth flow",
      "committed_at": "2025-08-26T11:45:15Z"
    },
    {
      "id": "789012345678901234567890abcdef123456789",
      "card_id": "JIRA-124",
      "repo": "backend-api", 
      "author_email": "performance.eng@empresa.com",
      "message": "perf(dashboard): optimize database queries with indexes",
      "committed_at": "2025-08-26T16:10:00Z"
    }
  ]'
```

### Exemplo 3: Commit sem Card Associado
```bash
curl -X POST "$SUPABASE_URL/rest/v1/commits" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "id": "maintenance123456789012345678901234567890",
    "card_id": null,
    "repo": "infrastructure",
    "author_email": "devops@empresa.com",
    "message": "chore: update dependencies and security patches",
    "committed_at": "2025-08-26T20:00:00Z"
  }'
```

---

## 3. UPSERT WORKLOGS

### Exemplo 1: Registro Manual de Tempo
```bash
curl -X POST "$SUPABASE_URL/rest/v1/worklogs" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "user_email": "dev@empresa.com",
    "card_id": "HU-2025-001",
    "source": "manual",
    "started_at": "2025-08-26T09:00:00Z",
    "ended_at": "2025-08-26T12:30:00Z",
    "minutes": 210,
    "note": "Implementação inicial do serviço de notificações. Configuração Firebase e testes básicos."
  }'
```

### Exemplo 2: Registro Automático (Toggl/Harvest)
```bash
curl -X POST "$SUPABASE_URL/rest/v1/worklogs" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '{
    "user_email": "senior.dev@empresa.com",
    "card_id": "JIRA-123",
    "source": "toggl",
    "started_at": "2025-08-26T14:00:00Z",
    "ended_at": "2025-08-26T18:00:00Z", 
    "minutes": 240,
    "note": "Debug OAuth issues - identified timeout in callback handler"
  }'
```

### Exemplo 3: Batch de Worklogs (Planilha Semanal)
```bash
curl -X POST "$SUPABASE_URL/rest/v1/worklogs" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates,return=representation" \
  -d '[
    {
      "user_email": "dev@empresa.com",
      "card_id": "HU-2025-001",
      "source": "timesheet",
      "started_at": "2025-08-26T09:00:00Z",
      "ended_at": "2025-08-26T12:00:00Z",
      "minutes": 180,
      "note": "Setup inicial notificações"
    },
    {
      "user_email": "dev@empresa.com", 
      "card_id": "HU-2025-001",
      "source": "timesheet",
      "started_at": "2025-08-26T13:00:00Z",
      "ended_at": "2025-08-26T17:30:00Z",
      "minutes": 270,
      "note": "Implementação templates e testes"
    },
    {
      "user_email": "designer@empresa.com",
      "card_id": "HU-2025-001", 
      "source": "timesheet",
      "started_at": "2025-08-27T10:00:00Z",
      "ended_at": "2025-08-27T12:00:00Z",
      "minutes": 120,
      "note": "Design das notificações e UX review"
    }
  ]'
```

---

## 4. TRATAMENTO DE ERROS E VALIDAÇÕES

### Exemplo de Resposta de Sucesso:
```json
[
  {
    "id": "HU-2025-001",
    "titulo": "Implementar sistema de notificações push", 
    "status": "done",
    "created_at": "2025-08-26T09:00:00+00:00",
    "in_progress_at": "2025-08-26T14:30:00+00:00",
    "done_at": "2025-08-28T16:45:00+00:00",
    "reopened": false,
    "blocked_hours": "2.50",
    "module": "notifications",
    "labels": ["feature", "mobile", "priority-high"],
    "updated_at": "2025-08-28T16:45:12.345678+00:00"
  }
]
```

### Exemplo de Resposta de Erro:
```json
{
  "code": "23514",
  "details": "Failing row contains (HU-2025-001, Implementar sistema, doing, 2025-08-26 09:00:00+00, null, null, f, 0.00, notifications, {feature,mobile}, 2025-08-26 09:00:00+00).",
  "hint": null,
  "message": "new row for relation \"cards\" violates check constraint \"cards_status_transitions\""
}
```

---

## 5. CONSULTAS PARA VERIFICAÇÃO

### Verificar Cards Inseridos:
```bash
curl -X GET "$SUPABASE_URL/rest/v1/cards?select=*&order=created_at.desc&limit=10" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### Verificar Commits por Card:
```bash
curl -X GET "$SUPABASE_URL/rest/v1/commits?select=*&card_id=eq.HU-2025-001&order=committed_at.desc" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

### Verificar Worklogs por Usuário:
```bash
curl -X GET "$SUPABASE_URL/rest/v1/worklogs?select=*&user_email=eq.dev@empresa.com&order=started_at.desc&limit=20" \
  -H "apikey: $SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY"
```

---

## 6. DICAS IMPORTANTES

1. **Idempotência**: Use sempre `Prefer: resolution=merge-duplicates` para evitar duplicatas
2. **Datas**: Sempre em formato ISO 8601 com timezone UTC (Z)
3. **Nulls**: Para campos opcionais vazios, use `null` (não string vazia)
4. **Arrays**: Labels em formato `["item1", "item2"]`
5. **Números**: Blocked_hours como número decimal (2.5), minutes como integer
6. **Validação**: O banco valida automaticamente as constraints (status transitions, datas, etc.)
7. **Performance**: Use batch inserts quando possível (arrays de objetos)
8. **Segurança**: Use service_role key para automações, anon key para consultas