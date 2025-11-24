/**
 * Teste Playwright - Toggle de Visualização Corrigido
 *
 * Valida que:
 * 1. Servidores sem licenças no período são REMOVIDOS quando toggle está ativo
 * 2. Apenas licenças dentro do período são mostradas
 * 3. Contagem de servidores no preview é correta
 */

const { test, expect } = require('@playwright/test');

test.describe('Toggle de Visualização - Correção de Filtragem', () => {

    test.beforeEach(async ({ page }) => {
        // Navegar para a aplicação
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');

        // Injetar dados mock
        await page.addScriptTag({ path: 'tests/mockLicenseData.js' });

        // Simular carregamento dos dados mock
        await page.evaluate(() => {
            const mockData = window.mockLicenseData.getMockLicenseData();
            const defaultFilter = window.mockLicenseData.getDefaultPeriodFilter();

            if (window.dashboard) {
                window.dashboard.allServidores = mockData;
                window.dashboard.filteredServidores = mockData;

                // Configurar filtro de período padrão (2025)
                window.dashboard.currentFilters = {
                    periodo: defaultFilter
                };
            }
        });

        // Navegar para a página de Relatórios
        await page.click('a[data-page="reports"]');
        await page.waitForSelector('#reportsPage.active', { state: 'visible' });
    });

    test('Visão Completa: Deve mostrar TODOS os 7 servidores', async ({ page }) => {
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Garantir que está em Visão Completa
        if (await toggle.isChecked()) {
            await toggleLabel.click();
        }

        await page.waitForTimeout(500);

        // Verificar contagem no preview
        const previewCount = await page.locator('#previewCountRedesign');
        const countText = await previewCount.textContent();

        console.log('Visão Completa - Contagem:', countText);

        // Deve mostrar todos os 7 servidores (mesmo os sem licenças em 2025)
        expect(countText).toContain('7 registro');
    });

    test('Apenas Filtradas: Deve remover João Pedro (sem licenças em 2025)', async ({ page }) => {
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Ativar "Apenas Filtradas"
        await toggleLabel.click();
        await page.waitForTimeout(500);

        // Verificar contagem
        const result = await page.evaluate(() => {
            const mockData = window.mockLicenseData.getMockLicenseData();
            const defaultFilter = window.mockLicenseData.getDefaultPeriodFilter();

            // João Pedro (índice 1) tem 2 licenças, ambas FORA de 2025
            // Ele NÃO deve aparecer no relatório
            const filteredData = window.dashboard?.reportsManager?.getFilteredData() || [];

            return {
                totalServidores: filteredData.length,
                joaoPresente: filteredData.some(s => s.servidor === 'João Pedro Oliveira')
            };
        });

        console.log('Apenas Filtradas - Resultado:', result);

        // João Pedro NÃO deve estar presente
        expect(result.joaoPresente).toBe(false);

        // Deve mostrar menos que 7 servidores
        expect(result.totalServidores).toBeLessThan(7);
        expect(result.totalServidores).toBeGreaterThan(0);
    });

    test('Apenas Filtradas: Maria Silva deve aparecer (tem licença em 2025)', async ({ page }) => {
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Ativar "Apenas Filtradas"
        await toggleLabel.click();
        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
            const filteredData = window.dashboard?.reportsManager?.getFilteredData() || [];

            // Maria Silva tem 2 licenças: uma em 2025 (DENTRO) e outra em 2026 (FORA)
            // Ela DEVE aparecer porque tem pelo menos uma licença em 2025
            return {
                mariaPresente: filteredData.some(s => s.servidor === 'Maria Silva Santos')
            };
        });

        console.log('Maria Silva presente:', result.mariaPresente);

        // Maria DEVE estar presente
        expect(result.mariaPresente).toBe(true);
    });

    test('Apenas Filtradas: Fernanda (sem licenças) NÃO deve aparecer', async ({ page }) => {
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Ativar "Apenas Filtradas"
        await toggleLabel.click();
        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
            const filteredData = window.dashboard?.reportsManager?.getFilteredData() || [];

            // Fernanda Lima Costa não tem nenhuma licença
            // Ela NÃO deve aparecer em Apenas Filtradas
            return {
                fernandaPresente: filteredData.some(s => s.servidor === 'Fernanda Lima Costa')
            };
        });

        console.log('Fernanda presente:', result.fernandaPresente);

        // Fernanda NÃO deve estar presente
        expect(result.fernandaPresente).toBe(false);
    });

    test('Licenças exibidas: Maria deve mostrar 2 licenças em Visão Completa', async ({ page }) => {
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Garantir Visão Completa
        if (await toggle.isChecked()) {
            await toggleLabel.click();
        }

        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
            const mockData = window.mockLicenseData.getMockLicenseData();
            const maria = mockData[0]; // Maria é o primeiro servidor

            // Usar o método getCellValue para obter as licenças formatadas
            const reportsManager = window.dashboard?.reportsManager;
            if (!reportsManager) return null;

            const licensesText = reportsManager.getCellValue(maria, 'periodoLicenca');

            // Contar quantas quebras de linha (cada licença é uma linha)
            const licenseCount = licensesText ? licensesText.split('\n').length : 0;

            return {
                licenseCount,
                licensesText
            };
        });

        console.log('Maria - Visão Completa:', result);

        // Maria tem 2 licenças, ambas devem aparecer
        expect(result.licenseCount).toBe(2);
    });

    test('Licenças exibidas: Maria deve mostrar 1 licença em Apenas Filtradas', async ({ page }) => {
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Ativar "Apenas Filtradas"
        await toggleLabel.click();
        await page.waitForTimeout(500);

        const result = await page.evaluate(() => {
            const mockData = window.mockLicenseData.getMockLicenseData();
            const maria = mockData[0];

            const reportsManager = window.dashboard?.reportsManager;
            if (!reportsManager) return null;

            const licensesText = reportsManager.getCellValue(maria, 'periodoLicenca');
            const licenseCount = licensesText ? licensesText.split('\n').length : 0;

            return {
                licenseCount,
                licensesText
            };
        });

        console.log('Maria - Apenas Filtradas:', result);

        // Maria tem 2 licenças, mas apenas 1 está em 2025
        expect(result.licenseCount).toBe(1);
    });

    test('Preview Table: Deve refletir mudança de contagem ao alternar toggle', async ({ page }) => {
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');
        const previewCount = await page.locator('#previewCountRedesign');

        // Garantir Visão Completa e aguardar preview carregar
        if (await toggle.isChecked()) {
            await toggleLabel.click();
        }
        await page.waitForTimeout(1000);

        // Estado inicial - Visão Completa
        const completeCount = await previewCount.textContent();

        // Ativar "Apenas Filtradas"
        await toggleLabel.click();
        await page.waitForTimeout(1000);

        const filteredCount = await previewCount.textContent();

        console.log('Contagens:', { completeCount, filteredCount });

        // As contagens devem ser diferentes
        expect(completeCount).not.toBe(filteredCount);

        // Extrair números
        const completeNum = parseInt(completeCount.match(/\d+/)?.[0] || '0');
        const filteredNum = parseInt(filteredCount.match(/\d+/)?.[0] || '0');

        // Ambos devem ter pelo menos 1 registro
        expect(completeNum).toBeGreaterThan(0);
        expect(filteredNum).toBeGreaterThan(0);

        // Visão Completa deve ter mais ou igual registros que filtrada
        expect(completeNum).toBeGreaterThanOrEqual(filteredNum);
    });
});
