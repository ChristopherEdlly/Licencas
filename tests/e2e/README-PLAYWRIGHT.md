# 🎭 Testes E2E com Playwright

Testes end-to-end usando **Playwright** - framework de testes moderno da Microsoft que roda **no terminal via Node.js**.

## 🚀 Instalação

### 1. Instalar dependências

```bash
npm install
```

### 2. Instalar navegadores do Playwright

```bash
npx playwright install
```

## 🧪 Executar Testes

### Comando Básico
```bash
npm test
```

### Modo UI (Interface Visual)
```bash
npm run test:ui
```

### Ver Navegador Durante Testes
```bash
npm run test:headed
```

### Modo Debug
```bash
npm run test:debug
```

### Ver Relatório HTML
```bash
npm run test:report
```

## 📊 Cobertura de Testes

| Categoria | Testes | Descrição |
|-----------|--------|-----------|
| **1. Inicialização** | 4 | Carregamento, sidebar, App.js, feature flags |
| **2. Navegação** | 5 | Todas as páginas (Home, Calendar, Timeline, Reports, Settings) |
| **3. Upload de Arquivo** | 2 | Botão upload, processamento CSV |
| **4. Filtros** | 3 | Filtro por urgência, cargo, limpar filtros |
| **5. Tema** | 2 | ThemeManager, alternar tema |
| **6. Performance** | 2 | Tempo de carregamento, processamento de 1000 registros |
| **7. Acessibilidade** | 2 | Skip link, labels |
| **8. Responsividade** | 2 | Mobile, tablet |
| **9. Integração Completa** | 1 | Jornada completa do usuário |
| **TOTAL** | **23** | Testes completos |

## 📁 Estrutura de Arquivos

```
tests/e2e/
├── app.spec.js              # Testes principais (Playwright)
├── app.test.e2e.js          # Testes antigos (browser-based)
├── run-e2e-tests.html       # Interface visual (antiga)
├── README-E2E.md            # Documentação dos testes antigos
└── README-PLAYWRIGHT.md     # Este arquivo
```

## 🎯 Diferença entre Testes

### ✅ Playwright (NOVO - Recomendado)
- ✅ Roda no **terminal via Node.js**
- ✅ **3 navegadores** (Chrome, Firefox, Safari)
- ✅ **Screenshots** automáticos em falhas
- ✅ **Videos** de reprodução
- ✅ **Trace viewer** para debug
- ✅ **Paralelização** de testes
- ✅ **CI/CD** ready

### ⚠️ Browser-based (ANTIGO)
- ⚠️ Precisa abrir navegador manualmente
- ⚠️ Apenas um navegador por vez
- ⚠️ Sem screenshots/videos
- ⚠️ Difícil de integrar com CI/CD

## 📝 Exemplo de Saída

### Sucesso ✅
```bash
$ npm test

Running 23 tests using 3 workers

  ✓  1. Inicialização » deve carregar a aplicação sem erros (1.2s)
  ✓  1. Inicialização » deve exibir sidebar com navegação (0.8s)
  ✓  1. Inicialização » deve inicializar App.js com sucesso (0.9s)
  ✓  1. Inicialização » deve ter FEATURE_FLAGS corretos (0.5s)
  ✓  2. Navegação » deve navegar para página Calendar (1.1s)
  ✓  2. Navegação » deve navegar para página Timeline (1.0s)
  ...

  23 passed (45s)

To open last HTML report run:
  npx playwright show-report
```

### Falha ❌
```bash
$ npm test

  ✗  2. Navegação » deve navegar para página Calendar (2.5s)

  Error: Timeout 5000ms exceeded.
  =========================== logs ===========================
  waiting for locator('#calendarPage') to have class /active/
  ============================================================

  Screenshot: test-results/app-Navegação-deve-navegar-calendar/test-failed-1.png
  Video: test-results/app-Navegação-deve-navegar-calendar/video.webm
  Trace: test-results/app-Navegação-deve-navegar-calendar/trace.zip
```

## 🔍 Debug de Falhas

### 1. Ver Screenshot
Screenshots são salvos automaticamente em:
```
test-results/<test-name>/test-failed-*.png
```

### 2. Ver Video
Videos são salvos em:
```
test-results/<test-name>/video.webm
```

### 3. Ver Trace
Abra o trace viewer:
```bash
npx playwright show-trace test-results/<test-name>/trace.zip
```

### 4. Modo Debug Interativo
```bash
npm run test:debug
```

Isso abre o Playwright Inspector onde você pode:
- ⏯️ Pausar/continuar teste
- ⏭️ Executar passo a passo
- 🔍 Inspecionar elementos
- 📝 Ver logs do console

## 🌐 Testar em Múltiplos Navegadores

Por padrão, os testes rodam em **3 navegadores**:
- Chrome (Chromium)
- Firefox
- Safari (WebKit)

Para rodar em apenas um:
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📱 Testar em Mobile

Descomente as linhas no `playwright.config.js`:

```javascript
{
  name: 'Mobile Chrome',
  use: { ...devices['Pixel 5'] },
},
{
  name: 'Mobile Safari',
  use: { ...devices['iPhone 12'] },
},
```

Depois rode:
```bash
npx playwright test --project="Mobile Chrome"
```

## 🔄 CI/CD Integration

### GitHub Actions

Crie `.github/workflows/playwright.yml`:

```yaml
name: Playwright Tests

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: 18
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright Browsers
      run: npx playwright install --with-deps
    - name: Run Playwright tests
      run: npm test
    - uses: actions/upload-artifact@v3
      if: always()
      with:
        name: playwright-report
        path: playwright-report/
        retention-days: 30
```

## 💡 Dicas e Truques

### 1. Rodar apenas um teste
```bash
npx playwright test -g "deve carregar a aplicação"
```

### 2. Rodar testes de uma suite específica
```bash
npx playwright test -g "Navegação"
```

### 3. Atualizar snapshots
```bash
npx playwright test --update-snapshots
```

### 4. Ver código de teste gerado
Use o **Codegen** para gerar código automaticamente:
```bash
npx playwright codegen http://localhost:3000
```

### 5. Ver relatório sempre
```bash
npx playwright test --reporter=html
npx playwright show-report
```

## ⚡ Performance Tips

### 1. Paralelização
Testes rodam em paralelo por padrão. Configure workers:
```javascript
// playwright.config.js
workers: 4, // 4 testes em paralelo
```

### 2. Reutilizar navegador
```javascript
// playwright.config.js
use: {
  launchOptions: {
    // Reutilizar processo do navegador
  }
}
```

### 3. Skip testes lentos no desenvolvimento
```javascript
test.skip('teste lento', async ({ page }) => {
  // ...
});
```

## 🐛 Troubleshooting

### Erro: "Executable doesn't exist"
**Solução:**
```bash
npx playwright install
```

### Erro: "Port 3000 is already in use"
**Solução:**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
```

### Erro: "Timeout waiting for page"
**Solução:** Aumentar timeout em `playwright.config.js`:
```javascript
timeout: 60 * 1000, // 60 segundos
```

### Testes falhando aleatoriamente
**Solução:** Adicionar `waitForLoadState`:
```javascript
await page.goto('/');
await page.waitForLoadState('domcontentloaded');
await page.waitForTimeout(500); // Buffer extra
```

## 📚 Recursos

- [Playwright Docs](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)
- [Examples](https://github.com/microsoft/playwright/tree/main/examples)

## 🎓 Próximos Passos

1. ✅ **Executar testes:** `npm test`
2. ✅ **Ver relatório:** `npm run test:report`
3. ⚠️ **Adicionar mais testes** conforme necessário
4. ⚠️ **Integrar com CI/CD** (GitHub Actions)
5. ⚠️ **Adicionar testes de performance** com métricas

---

**Última atualização:** 11/12/2025
**Versão:** 1.0.0
**Autor:** Claude Code Assistant
