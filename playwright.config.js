/**
 * Playwright Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */

const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',

  // Timeout para cada teste
  timeout: 30000,

  // Configuração de expect
  expect: {
    timeout: 5000
  },

  // Executar testes em paralelo
  fullyParallel: false,

  // Falhar build se deixar test.only
  forbidOnly: !!process.env.CI,

  // Retry em caso de falha
  retries: process.env.CI ? 2 : 0,

  // Número de workers
  workers: process.env.CI ? 1 : undefined,

  // Reporter
  reporter: 'html',

  // Configurações compartilhadas
  use: {
    // URL base da aplicação
    baseURL: 'http://localhost:3000',

    // Capturar screenshot apenas em falhas
    screenshot: 'only-on-failure',

    // Capturar trace em falhas
    trace: 'on-first-retry',

    // Timeout para ações
    actionTimeout: 10000,

    // Viewport padrão
    viewport: { width: 1280, height: 720 }
  },

  // Projetos de teste (diferentes browsers)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Descomente para testar em outros browsers:
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // Servidor web local (se necessário)
  webServer: {
    command: 'npx serve . -p 3000',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI,
  },
});
