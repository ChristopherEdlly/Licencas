// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

/**
 * Testes End-to-End (E2E) usando Playwright
 *
 * Execução:
 * npm test                 - Rodar todos os testes
 * npm run test:ui          - Rodar com UI mode
 * npm run test:headed      - Ver navegador durante testes
 * npm run test:debug       - Modo debug
 */

test.describe('Dashboard de Licenças - E2E Tests', () => {

  // ==================== TESTE 1: CARREGAMENTO INICIAL ====================

  test.describe('1. Carregamento e Inicialização', () => {

    test('deve carregar a aplicação sem erros', async ({ page }) => {
      // Capturar erros do console
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      // Capturar exceções não tratadas
      const pageErrors = [];
      page.on('pageerror', error => {
        pageErrors.push(error.message);
      });

      // Navegar para a aplicação
      await page.goto('/');

      // Aguardar que o DOM esteja pronto
      await page.waitForLoadState('domcontentloaded');

      // Verificar que não houve erros críticos
      const criticalErrors = [...consoleErrors, ...pageErrors].filter(err =>
        !err.includes('favicon') && // Ignorar erro de favicon
        !err.includes('404') // Ignorar 404s não críticos
      );

      expect(criticalErrors).toHaveLength(0);
    });

    test('deve exibir sidebar com navegação', async ({ page }) => {
      await page.goto('/');

      // Verificar que sidebar está visível
      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();

      // Verificar links de navegação
      await expect(page.locator('.nav-link[data-page="home"]')).toBeVisible();
      await expect(page.locator('.nav-link[data-page="calendar"]')).toBeVisible();
      await expect(page.locator('.nav-link[data-page="timeline"]')).toBeVisible();
      await expect(page.locator('.nav-link[data-page="reports"]')).toBeVisible();
      await expect(page.locator('.nav-link[data-page="settings"]')).toBeVisible();
    });

    test('deve inicializar App.js com sucesso', async ({ page }) => {
      await page.goto('/');

      // Verificar que window.app está disponível
      const appExists = await page.evaluate(() => {
        return typeof window.app !== 'undefined';
      });

      expect(appExists).toBeTruthy();

      // Verificar que App foi inicializado
      const appInitialized = await page.evaluate(() => {
        return window.app && window.app.router && window.app.dataStateManager;
      });

      expect(appInitialized).toBeTruthy();
    });

    test('deve ter FEATURE_FLAGS corretos', async ({ page }) => {
      await page.goto('/');

      const flags = await page.evaluate(() => window.FEATURE_FLAGS);

      expect(flags.USE_NEW_APP).toBe(true);
      expect(flags.USE_EVENT_BUS).toBe(true);
      expect(flags.USE_ROUTER).toBe(true);
    });
  });

  // ==================== TESTE 2: NAVEGAÇÃO ====================

  test.describe('2. Navegação entre Páginas', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    test('deve navegar para página Calendar', async ({ page }) => {
      // Clicar no link Calendar
      await page.locator('.nav-link[data-page="calendar"]').click();

      // Aguardar navegação
      await page.waitForTimeout(500);

      // Verificar que página Calendar está ativa
      const calendarPage = page.locator('#calendarPage');
      await expect(calendarPage).toHaveClass(/active/);

      // Verificar que home não está ativa
      const homePage = page.locator('#homePage');
      await expect(homePage).not.toHaveClass(/active/);
    });

    test('deve navegar para página Timeline', async ({ page }) => {
      await page.locator('.nav-link[data-page="timeline"]').click();
      await page.waitForTimeout(500);

      const timelinePage = page.locator('#timelinePage');
      await expect(timelinePage).toHaveClass(/active/);
    });

    test('deve navegar para página Reports', async ({ page }) => {
      await page.locator('.nav-link[data-page="reports"]').click();
      await page.waitForTimeout(500);

      const reportsPage = page.locator('#reportsPage');
      await expect(reportsPage).toHaveClass(/active/);
    });

    test('deve navegar para página Settings', async ({ page }) => {
      await page.locator('.nav-link[data-page="settings"]').click();
      await page.waitForTimeout(500);

      const settingsPage = page.locator('#settingsPage');
      await expect(settingsPage).toHaveClass(/active/);
    });

    test('deve voltar para Home', async ({ page }) => {
      // Ir para outra página
      await page.locator('.nav-link[data-page="calendar"]').click();
      await page.waitForTimeout(300);

      // Voltar para home
      await page.locator('.nav-link[data-page="home"]').click();
      await page.waitForTimeout(300);

      const homePage = page.locator('#homePage');
      await expect(homePage).toHaveClass(/active/);
    });
  });

  // ==================== TESTE 3: UPLOAD DE ARQUIVO ====================

  test.describe('3. Upload e Processamento de Arquivo', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    test('deve ter botão de upload visível', async ({ page }) => {
      const uploadButton = page.locator('#uploadButton');
      await expect(uploadButton).toBeVisible();
    });

    test('deve processar arquivo CSV válido', async ({ page }) => {
      // Criar arquivo CSV de teste
      const csvContent = `SERVIDOR,CPF,CARGO,LOTACAO,DN,SEXO,ADMISSÃO,CRONOGRAMA
João Silva,123.456.789-00,Auditor Fiscal,SUTRI,15/05/1980,M,01/01/2005,jan/2025 - mar/2025
Maria Santos,987.654.321-00,Analista,SUPER-X,20/08/1975,F,15/03/2000,jun/2025 - ago/2025
Pedro Oliveira,111.222.333-44,Técnico,SUBSEC-Y,10/12/1985,M,20/05/2010,set/2025 - nov/2025`;

      // Salvar arquivo temporário
      const fs = require('fs');
      const tmpPath = path.join(__dirname, 'temp-test.csv');
      fs.writeFileSync(tmpPath, csvContent);

      try {
        // Fazer upload do arquivo
        const fileInput = page.locator('#fileInput');
        await fileInput.setInputFiles(tmpPath);

        // Aguardar processamento
        await page.waitForTimeout(2000);

        // Verificar se dados foram carregados
        const dataLoaded = await page.evaluate(() => {
          return window.app &&
                 window.app.dataStateManager &&
                 window.app.dataStateManager.getAllServidores().length > 0;
        });

        expect(dataLoaded).toBeTruthy();

        // Verificar quantidade de registros
        const count = await page.evaluate(() => {
          return window.app.dataStateManager.getAllServidores().length;
        });

        expect(count).toBe(3);

      } finally {
        // Limpar arquivo temporário
        if (fs.existsSync(tmpPath)) {
          fs.unlinkSync(tmpPath);
        }
      }
    });
  });

  // ==================== TESTE 4: FILTROS ====================

  test.describe('4. Sistema de Filtros', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // Carregar dados de teste
      await page.evaluate(() => {
        const testData = [
          {
            servidor: 'João Silva',
            cargo: 'Auditor Fiscal',
            lotacao: 'SUTRI',
            urgencia: 'critica',
            licencas: []
          },
          {
            servidor: 'Maria Santos',
            cargo: 'Analista',
            lotacao: 'SUPER-X',
            urgencia: 'alta',
            licencas: []
          },
          {
            servidor: 'Pedro Oliveira',
            cargo: 'Auditor Fiscal',
            lotacao: 'SUTRI',
            urgencia: 'baixa',
            licencas: []
          }
        ];

        window.app.dataStateManager.setAllServidores(testData);
      });
    });

    test('deve filtrar por urgência', async ({ page }) => {
      // Aplicar filtro de urgência
      await page.evaluate(() => {
        window.app.dataStateManager.applyFilters({ urgencia: ['critica'] });
      });

      // Verificar resultados
      const filtered = await page.evaluate(() => {
        return window.app.dataStateManager.getFilteredServidores();
      });

      expect(filtered.length).toBe(1);
      expect(filtered[0].servidor).toBe('João Silva');
    });

    test('deve filtrar por cargo', async ({ page }) => {
      await page.evaluate(() => {
        window.app.dataStateManager.applyFilters({ cargo: ['Auditor Fiscal'] });
      });

      const filtered = await page.evaluate(() => {
        return window.app.dataStateManager.getFilteredServidores();
      });

      expect(filtered.length).toBe(2);
    });

    test('deve limpar filtros', async ({ page }) => {
      // Aplicar filtro
      await page.evaluate(() => {
        window.app.dataStateManager.applyFilters({ urgencia: ['critica'] });
      });

      // Limpar filtros
      await page.evaluate(() => {
        window.app.dataStateManager.clearFilters();
      });

      // Verificar que todos voltaram
      const filtered = await page.evaluate(() => {
        return window.app.dataStateManager.getFilteredServidores();
      });

      expect(filtered.length).toBe(3);
    });
  });

  // ==================== TESTE 5: TEMA ====================

  test.describe('5. Sistema de Temas', () => {

    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
    });

    test('deve ter themeManager disponível', async ({ page }) => {
      const themeExists = await page.evaluate(() => {
        return typeof window.themeManager !== 'undefined';
      });

      expect(themeExists).toBeTruthy();
    });

    test('deve alternar entre light e dark mode', async ({ page }) => {
      // Pegar tema atual
      const currentTheme = await page.evaluate(() => {
        return document.body.getAttribute('data-theme');
      });

      // Alternar tema
      await page.evaluate(() => {
        window.themeManager.toggleTheme();
      });

      // Verificar que mudou
      const newTheme = await page.evaluate(() => {
        return document.body.getAttribute('data-theme');
      });

      expect(newTheme).not.toBe(currentTheme);
    });
  });

  // ==================== TESTE 6: PERFORMANCE ====================

  test.describe('6. Performance', () => {

    test('deve carregar página em menos de 3 segundos', async ({ page }) => {
      const startTime = Date.now();

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000);
    });

    test('deve processar 1000 registros rapidamente', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      const processTime = await page.evaluate(() => {
        // Gerar 1000 registros
        const largeData = Array.from({ length: 1000 }, (_, i) => ({
          servidor: `Servidor ${i}`,
          cpf: `${String(i).padStart(11, '0')}`,
          cargo: 'Auditor Fiscal',
          urgencia: i % 4 === 0 ? 'critica' : 'baixa'
        }));

        const start = performance.now();
        window.app.dataStateManager.setAllServidores(largeData);
        const end = performance.now();

        return end - start;
      });

      expect(processTime).toBeLessThan(2000); // Menos de 2 segundos
    });
  });

  // ==================== TESTE 7: ACESSIBILIDADE ====================

  test.describe('7. Acessibilidade', () => {

    test('deve ter skip link funcional', async ({ page }) => {
      await page.goto('/');

      const skipLink = page.locator('.skip-link');
      await expect(skipLink).toBeVisible();
    });

    test('deve ter labels adequados', async ({ page }) => {
      await page.goto('/');

      // Verificar que inputs têm labels ou aria-label
      const fileInput = page.locator('#fileInput');
      const hasLabel = await fileInput.evaluate(el => {
        return el.getAttribute('aria-label') !== null ||
               el.previousElementSibling?.tagName === 'LABEL';
      });

      expect(hasLabel).toBeTruthy();
    });
  });

  // ==================== TESTE 8: RESPONSIVIDADE ====================

  test.describe('8. Responsividade', () => {

    test('deve funcionar em mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/');

      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
    });

    test('deve funcionar em tablet viewport', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/');

      const sidebar = page.locator('.sidebar');
      await expect(sidebar).toBeVisible();
    });
  });

  // ==================== TESTE 9: INTEGRAÇÃO COMPLETA ====================

  test.describe('9. Jornada Completa do Usuário', () => {

    test('deve completar fluxo completo de uso', async ({ page }) => {
      // 1. Carregar aplicação
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');

      // 2. Verificar que App foi inicializado
      const appReady = await page.evaluate(() => {
        return window.app && window.app.router;
      });
      expect(appReady).toBeTruthy();

      // 3. Carregar dados de teste
      await page.evaluate(() => {
        const testData = [
          { servidor: 'João Silva', urgencia: 'critica', cargo: 'Auditor Fiscal' },
          { servidor: 'Maria Santos', urgencia: 'alta', cargo: 'Analista' }
        ];
        window.app.dataStateManager.setAllServidores(testData);
      });

      // 4. Navegar para Calendar
      await page.locator('.nav-link[data-page="calendar"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('#calendarPage')).toHaveClass(/active/);

      // 5. Navegar para Timeline
      await page.locator('.nav-link[data-page="timeline"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('#timelinePage')).toHaveClass(/active/);

      // 6. Navegar para Reports
      await page.locator('.nav-link[data-page="reports"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('#reportsPage')).toHaveClass(/active/);

      // 7. Voltar para Home
      await page.locator('.nav-link[data-page="home"]').click();
      await page.waitForTimeout(500);
      await expect(page.locator('#homePage')).toHaveClass(/active/);

      // SUCESSO - Jornada completa sem erros!
    });
  });
});
