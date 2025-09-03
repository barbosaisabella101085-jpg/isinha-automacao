# E2E Test Automation — Playwright + TypeScript

[![e2e](https://github.com/barbosaisabella101085-jpg/isinha-automacao/actions/workflows/e2e.yml/badge.svg)](../../actions/workflows/e2e.yml)

Automação de testes **end-to-end (E2E)** usando **Playwright + TypeScript**, com pipeline no **GitHub Actions**, execução cross-browser (Chromium, Firefox, WebKit), relatórios HTML e traces para debug.

---

## 🔧 Requisitos
- Node.js 18+  
- NPM (ou Yarn/Pnpm)  
- (CI) GitHub Actions com os segredos configurados:

| Nome do segredo | Valor de exemplo |
|---|---|
| `E2E_BASE_URL` | `https://opensource-demo.orangehrmlive.com` |
| `E2E_USER_EMAIL` | `Admin` |
| `E2E_USER_PASS` | `admin123` |

---

## 🚀 Setup local
```bash
# 1) Dependências
npm install

# 2) Browsers do Playwright
npx playwright install

# 3) Variáveis de ambiente
cp .env.example .env
# Edite .env com:
# BASE_URL=https://seu-ambiente
# USER_EMAIL=usuario
# USER_PASS=senha
```

### ✅ Validar ambiente
```bash
npm run validate:env
```

---

## 🧪 Como rodar os testes
```bash
# Todos os testes (headless, 3 browsers)
npm run test:e2e

# UI do runner
npm run test:e2e:ui

# Headed (navegador visível)
npm run test:e2e:headed

# Navegador específico
npm run test:e2e:chromium
npm run test:e2e:firefox
npm run test:e2e:webkit

# Relatório HTML (após uma execução)
npm run test:e2e:report
```

Relatórios: `qa/e2e/report/`  
Artefatos de falha (screenshots/traces): `qa/e2e/test-results/`

---

## 🗂️ Estrutura
```
qa/
  e2e/
    tests/              # .spec.ts
    pages/              # Page Objects
    fixtures/           # dados/mocks
    report/             # relatórios HTML
    test-results/       # evidências (CI/local)
    playwright.config.ts
    tsconfig.json
```

---

## ⚙️ CI/CD (GitHub Actions)
- Workflow: `.github/workflows/e2e.yml`
- Dispara em: `push` e `pull_request`
- Cross-browser (Chromium, Firefox, WebKit)
- Cache de dependências + navegadores
- Artefatos com relatório HTML

Badge no topo deste README reflete o status atual da pipeline.

---

## 🧭 Fluxo diário de desenvolvimento
1. **Criar branch**: `feat/...` ou `fix/...`  
2. **Rodar localmente**:
   ```bash
   npm run validate:env
   npm run test:e2e
   ```
3. **Abrir PR** para `main`.  
4. **Aguardar CI** (Actions → workflow "e2e").  
5. **Mergear** apenas com status ✅.

> A branch `main` está protegida para exigir a verificação "e2e".

---

## 📥 Como ver o relatório do CI (GitHub Actions)

Quando a pipeline `e2e` roda no GitHub Actions, ela publica um artefato com o relatório HTML do Playwright.

**Passo a passo:**
1. Acesse **Actions** (no topo do repositório) e clique no run mais recente do workflow **e2e**.
2. Na página do run, localize **Artifacts** → clique em **playwright-report** para baixar.
3. Extraia o arquivo .zip e abra o arquivo `index.html` no seu navegador.
4. Dica: os artefatos ficam disponíveis por **14 dias** (retention).

**Relatórios locais:**
- Depois de rodar os testes localmente, você pode abrir o relatório com:
  ```bash
  npm run test:e2e:report
  ```

O relatório é gerado em `qa/e2e/report`.

---

## 🛠️ Dicas & Troubleshooting
- **Elemento não encontrado**: verifique seletores em `qa/e2e/pages/*` e use `npx playwright codegen`.
- **Timeouts**: ajuste `playwright.config.ts` (timeouts/globals).
- **Ambiente**: confira `BASE_URL`, `USER_EMAIL`, `USER_PASS` no `.env` (local) ou "Secrets → Actions" (CI).
- **Abrir relatório**: `npm run test:e2e:report` (gera/abre HTML).

---

## 📜 Scripts úteis
```json
# package.json (exemplos)
{
  "scripts": {
    "validate:env": "node validate-env.js",
    "test:e2e": "playwright test --config qa/e2e/playwright.config.ts",
    "test:e2e:ui": "playwright test --ui --config qa/e2e/playwright.config.ts",
    "test:e2e:headed": "playwright test --headed --config qa/e2e/playwright.config.ts",
    "test:e2e:chromium": "playwright test --project=chromium --config qa/e2e/playwright.config.ts",
    "test:e2e:firefox": "playwright test --project=firefox --config qa/e2e/playwright.config.ts",
    "test:e2e:webkit": "playwright test --project=webkit --config qa/e2e/playwright.config.ts",
    "test:e2e:report": "npx playwright show-report qa/e2e/report"
  }
}
```

---

## 🔒 Segredos no GitHub
`Settings → Secrets and variables → Actions` e crie:
- `E2E_BASE_URL`
- `E2E_USER_EMAIL`
- `E2E_USER_PASS`

---

## ✅ Pronto!
Este repositório agora documenta exclusivamente a **automação de testes E2E** com Playwright + TypeScript e GitHub Actions.