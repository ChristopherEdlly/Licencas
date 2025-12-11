// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Configuração do Playwright para testes E2E
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './tests/e2e',

  /* Timeout máximo por teste */
  timeout: 30 * 1000,

  /* Configuração de expect */
  expect: {
    timeout: 5000
  },

  /* Executar testes em paralelo */
  fullyParallel: true,

  /* Falhar build no CI se você deixou test.only */
  forbidOnly: !!process.env.CI,

  /* Retry em caso de falha */
  retries: process.env.CI ? 2 : 0,

  /* Número de workers */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter */
  reporter: [
    ['html'],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  /* Configurações compartilhadas entre todos os projetos */
  use: {
    /* URL base */
    baseURL: 'http://localhost:3000',

    /* Coletar trace em caso de retry */
    trace: 'on-first-retry',

    /* Screenshot em caso de falha */
    screenshot: 'only-on-failure',

    /* Video em caso de falha */
    video: 'retain-on-failure',
  },

  /* Configurar servidor local */
  webServer: {
    command: 'npx http-server . -p 3000 -c-1',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },

  /* Configurar projetos para diferentes navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Testes em mobile */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],
});
