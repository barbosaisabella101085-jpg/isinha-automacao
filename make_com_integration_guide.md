# MAKE.COM - GUIA DE INTEGRAÇÃO HUB DE MÉTRICAS

## Cenário Base: Google Sheets → Supabase Cards

### 1. CONFIGURAÇÃO DO TRIGGER
**Módulo:** Google Sheets - Watch Rows
- **Spreadsheet:** "Automação HU"
- **Sheet:** "Cards"
- **Table contains headers:** Yes
- **Limit:** 100

### 2. MAPEAMENTO DE COLUNAS
**Estrutura esperada da planilha:**
```
| ID | Título | Status | Created_at | In_progress_at | Done_at | Module | Labels |
```

### 3. TRANSFORMAÇÕES ESSENCIAIS

#### A) Tratamento de Valores Nulos/Vazios
```javascript
// Para campos de data opcionais (In_progress_at, Done_at)
{{if(1.`In_progress_at` != ""; 1.`In_progress_at`; null)}}

// Para campos de texto opcionais (Module, Labels)  
{{if(1.`Module` != ""; 1.`Module`; null)}}

// Para arrays (Labels) - converter string separada por vírgula
{{if(1.`Labels` != ""; split(1.`Labels`; ","); emptyarray)}}
```

#### B) Conversão de Datas
```javascript
// De "YYYY-MM-DD HH:mm:ss" para ISO 8601
{{if(1.`Created_at` != ""; formatDate(parseDate(1.`Created_at`; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}

// Alternativa para datas sem hora
{{if(1.`Created_at` != ""; formatDate(parseDate(1.`Created_at`; "YYYY-MM-DD"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}
```

### 4. CONFIGURAÇÃO DO MÓDULO HTTP

**Módulo:** HTTP - Make a Request
- **URL:** `https://[PROJECT-ID].supabase.co/rest/v1/cards`
- **Method:** POST
- **Headers:**
  ```
  apikey: [SUPABASE_ANON_KEY]
  Authorization: Bearer [SUPABASE_SERVICE_KEY]
  Content-Type: application/json
  Prefer: resolution=merge-duplicates,return=representation
  ```

**Body (JSON):**
```json
{
  "id": "{{1.ID}}",
  "titulo": "{{1.Título}}",
  "status": "{{lower(1.Status)}}",
  "created_at": "{{if(1.Created_at != ""; formatDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}",
  "in_progress_at": "{{if(1.In_progress_at != ""; formatDate(parseDate(1.In_progress_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}",
  "done_at": "{{if(1.Done_at != ""; formatDate(parseDate(1.Done_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}",
  "module": "{{if(1.Module != ""; 1.Module; null)}}",
  "labels": {{if(1.Labels != ""; "[" + join(map(split(1.Labels; ","); """`trim(item)`"""); ", ") + "]"; "[]")}}
}
```

---

## CENÁRIOS AVANÇADOS

### Cenário 2: GitHub Commits → Supabase
**Webhook GitHub → Make.com:**

```json
{
  "id": "{{commits[].id}}",
  "card_id": "{{regexReplace(commits[].message; ".*(?:closes|fixes|resolves)\s+([A-Z]+-\d+).*"; "$1"; "i")}}",
  "repo": "{{repository.name}}",
  "author_email": "{{commits[].author.email}}",
  "message": "{{commits[].message}}",
  "committed_at": "{{formatDate(parseDate(commits[].timestamp; "YYYY-MM-DDTHH:mm:ssZ"); "YYYY-MM-DDTHH:mm:ss[Z]")}}"
}
```

### Cenário 3: Jira/Businessmap → Supabase
**Mapeamento de Status:**
```javascript
// Converter status do Jira para enum
{{switch(1.status.name; "To Do"; "todo"; "In Progress"; "doing"; "Done"; "done"; "todo")}}

// Calcular blocked_hours se existir flag de bloqueio
{{if(1.flagged = true; dateDifference(1.updated; 1.created; "hours"); 0)}}
```

---

## FUNÇÕES AUXILIARES MAKE.COM

### 1. Validação de Datas
```javascript
// Verificar se data é válida antes de converter
{{if(isDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss")); formatDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}
```

### 2. Limpeza de Strings
```javascript
// Remover espaços e caracteres especiais
{{trim(replace(1.Título; regex("\s+"); " "))}}
```

### 3. Extração de Card ID de Commits
```javascript
// Extrair ID do card da mensagem do commit
{{regexReplace(1.message; ".*(?:refs?|closes?|fixes?|resolves?)\s+#?([A-Z]+-\d+).*"; "$1"; "i")}}
```

---

## EXEMPLO COMPLETO: FLUXO GOOGLE SHEETS

### Passo 1: Watch Sheets Rows
- Trigger quando nova linha é adicionada
- Filtro: `{{1.ID}}` is not empty

### Passo 2: Data Transformation Module
```javascript
// Variables:
- cardId: {{trim(1.ID)}}
- title: {{trim(1.Título)}}
- status: {{lower(trim(1.Status))}}
- createdAt: {{if(1.Created_at != "" AND 1.Created_at != null; formatDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}
- inProgressAt: {{if(1.In_progress_at != "" AND 1.In_progress_at != null; formatDate(parseDate(1.In_progress_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}
- doneAt: {{if(1.Done_at != "" AND 1.Done_at != null; formatDate(parseDate(1.Done_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}
- module: {{if(1.Module != "" AND 1.Module != null; trim(1.Module); null)}}
- labels: {{if(1.Labels != "" AND 1.Labels != null; split(trim(1.Labels); ","); emptyarray)}}
```

### Passo 3: HTTP Request to Supabase
**Body:**
```json
{
  "id": "{{2.cardId}}",
  "titulo": "{{2.title}}", 
  "status": "{{2.status}}",
  "created_at": "{{2.createdAt}}",
  "in_progress_at": "{{2.inProgressAt}}",
  "done_at": "{{2.doneAt}}",
  "module": "{{2.module}}",
  "labels": {{2.labels}}
}
```

### Passo 4: Error Handling
**Filter:** HTTP Status Code ≠ 201 AND HTTP Status Code ≠ 200

**Error Notification:**
- **To:** devops@empresa.com
- **Subject:** Erro na sincronização - Card {{2.cardId}}
- **Body:** 
```
Erro ao sincronizar card {{2.cardId}}:
Status: {{3.statusCode}}
Erro: {{3.body.message}}
Dados: {{2}}
```

---

## TROUBLESHOOTING COMUM

### 1. Erro de Data Inválida
**Problema:** "invalid input syntax for type timestamp"
**Solução:** Sempre verificar se a data não está vazia antes de converter
```javascript
{{if(1.Created_at != "" AND 1.Created_at != null AND isDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss")); formatDate(parseDate(1.Created_at; "YYYY-MM-DD HH:mm:ss"); "YYYY-MM-DDTHH:mm:ss[Z]"); null)}}
```

### 2. Constraint Violation (Status Transitions)
**Problema:** Card em "doing" sem in_progress_at
**Solução:** Validar transições de status
```javascript
{{if(2.status = "doing" AND 2.inProgressAt = null; "todo"; 2.status)}}
```

### 3. Arrays Mal Formatados
**Problema:** Labels não aceitas como array
**Solução:** Garantir formato JSON correto
```javascript
{{if(1.Labels != ""; "[" + join(map(split(replace(1.Labels; " "; ""); ","); """" + trim(item) + """"); ", ") + "]"; "[]")}}
```

---

## MONITORAMENTO E LOGS

### Webhook de Sucesso
**URL:** `https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK`
**Message:**
```
✅ Card sincronizado: {{2.cardId}} - {{2.title}}
Status: {{2.status}}
Timestamp: {{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}
```

### Webhook de Erro  
**Message:**
```
❌ Falha na sincronização: {{2.cardId}}
Erro: {{3.body.message}}
Dados originais: {{1}}
Timestamp: {{formatDate(now; "YYYY-MM-DD HH:mm:ss")}}
```