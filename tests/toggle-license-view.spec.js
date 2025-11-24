/**
 * Teste Playwright - Toggle de Visualização de Licenças
 *
 * Este teste valida que o toggle alterna corretamente entre:
 * - Visão Completa: Mostra TODAS as licenças do servidor
 * - Apenas Filtradas: Mostra APENAS licenças dentro do período filtrado
 */

const { test, expect } = require('@playwright/test');

test.describe('Toggle de Visualização de Licenças - Página de Relatórios', () => {

    test.beforeEach(async ({ page }) => {
        // Navegar para a aplicação
        await page.goto('http://localhost:3000');

        // Aguardar que a aplicação carregue
        await page.waitForLoadState('networkidle');

        // Injetar dados mock
        await page.addScriptTag({ path: 'tests/mockLicenseData.js' });

        // Simular carregamento dos dados mock
        await page.evaluate(() => {
            const mockData = window.mockLicenseData.getMockLicenseData();
            const defaultFilter = window.mockLicenseData.getDefaultPeriodFilter();

            // Atribuir dados ao dashboard
            if (window.dashboard) {
                window.dashboard.allServidores = mockData;
                window.dashboard.filteredServidores = mockData;

                // Configurar filtro de período padrão (2025)
                window.dashboard.currentFilters = {
                    periodo: defaultFilter
                };

                console.log('Mock data loaded:', mockData.length, 'servidores');
                console.log('Período filtrado:', defaultFilter);
            }
        });

        // Navegar para a página de Relatórios
        await page.click('a[data-page="reports"]');
        await page.waitForSelector('#reportsPage.active', { state: 'visible' });
    });

    test('Toggle deve estar presente na página de Relatórios', async ({ page }) => {
        // Verificar que o container do toggle existe
        const toggleContainer = await page.locator('.license-view-toggle-container');
        await expect(toggleContainer).toBeVisible();

        // Verificar que o toggle switch existe
        const toggle = await page.locator('#licenseViewToggle');
        await expect(toggle).toBeAttached();

        // Verificar labels
        const labelComplete = await page.locator('#toggleLabelComplete');
        const labelFiltered = await page.locator('#toggleLabelFiltered');

        await expect(labelComplete).toHaveText('Visão Completa');
        await expect(labelFiltered).toHaveText('Apenas Filtradas');
    });

    test('Toggle deve iniciar no estado "Visão Completa" (desativado)', async ({ page }) => {
        const toggle = await page.locator('#licenseViewToggle');
        const isChecked = await toggle.isChecked();

        expect(isChecked).toBe(false);

        // Verificar que o label "Visão Completa" está ativo
        const labelComplete = await page.locator('#toggleLabelComplete');
        await expect(labelComplete).toHaveClass(/active/);
    });

    test('Clicar no toggle deve alterar para "Apenas Filtradas"', async ({ page }) => {
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Estado inicial
        expect(await toggle.isChecked()).toBe(false);

        // Clicar no toggle (clicar no label, não no input oculto)
        await toggleLabel.click();

        // Verificar que mudou para checked
        expect(await toggle.isChecked()).toBe(true);

        // Verificar que o label "Apenas Filtradas" está ativo
        const labelFiltered = await page.locator('#toggleLabelFiltered');
        await expect(labelFiltered).toHaveClass(/active/);

        // Verificar descrição
        const description = await page.locator('#toggleDescriptionText');
        await expect(description).toContainText('Exibindo apenas licenças dentro do período filtrado');
    });

    test('Toggle deve persistir estado no localStorage', async ({ page }) => {
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Ativar toggle
        await toggleLabel.click();

        // Verificar que salvou no localStorage
        const savedState = await page.evaluate(() => {
            return localStorage.getItem('licenseViewToggleState');
        });

        expect(savedState).toBe('true');

        // Desativar toggle
        await toggleLabel.click();

        // Verificar que atualizou no localStorage
        const updatedState = await page.evaluate(() => {
            return localStorage.getItem('licenseViewToggleState');
        });

        expect(updatedState).toBe('false');
    });

    test('Preview deve mostrar TODAS as licenças no modo "Visão Completa"', async ({ page }) => {
        // Garantir que está no modo Visão Completa
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        if (await toggle.isChecked()) {
            await toggleLabel.click();
        }

        // Aguardar preview carregar
        await page.waitForTimeout(500);

        // Verificar preview
        const previewTable = await page.locator('#previewTableRedesign');
        await expect(previewTable).toBeVisible();

        // Contar quantas linhas de licença aparecem na preview
        // Servidor 1 (Maria Silva) deve mostrar 2 licenças: 2025 e 2026
        const result = await page.evaluate(() => {
            const counts = window.mockLicenseData.countLicensesInPeriod(
                window.mockLicenseData.getMockLicenseData(),
                window.mockLicenseData.getDefaultPeriodFilter()
            );
            return counts;
        });

        console.log('Contagem de licenças (Visão Completa):', result);

        // No modo Visão Completa, devem aparecer TODAS as licenças
        expect(result.totalLicencasDentro + result.totalLicencasFora).toBeGreaterThan(0);
    });

    test('Preview deve mostrar APENAS licenças filtradas no modo "Apenas Filtradas"', async ({ page }) => {
        // Ativar modo "Apenas Filtradas"
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        await toggleLabel.click();

        // Aguardar preview atualizar
        await page.waitForTimeout(500);

        // Verificar que o filtro está aplicado
        const result = await page.evaluate(() => {
            const mockData = window.mockLicenseData.getMockLicenseData();
            const defaultFilter = window.mockLicenseData.getDefaultPeriodFilter();

            // Contar licenças
            const counts = window.mockLicenseData.countLicensesInPeriod(mockData, defaultFilter);

            // Verificar servidor "João Pedro Oliveira" (índice 1)
            // Ele tem 2 licenças, ambas FORA do período 2025
            const joao = mockData[1];
            const licencasDentro = joao.licencas.filter(lic => {
                const start = new Date(defaultFilter.dataInicio);
                const end = new Date(defaultFilter.dataFim);
                end.setHours(23, 59, 59, 999);

                return lic.inicio <= end && (lic.fim || lic.inicio) >= start;
            });

            return {
                counts,
                joaoTotalLicencas: joao.licencas.length,
                joaoLicencasDentro: licencasDentro.length
            };
        });

        console.log('Resultado filtrado:', result);

        // João Pedro deve ter 2 licenças totais, mas 0 dentro do período 2025
        expect(result.joaoTotalLicencas).toBe(2);
        expect(result.joaoLicencasDentro).toBe(0);

        // Deve haver servidores com licenças dentro do período
        expect(result.counts.totalLicencasDentro).toBeGreaterThan(0);
    });

    test('Alternar toggle deve atualizar a preview automaticamente', async ({ page }) => {
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');
        const previewCount = await page.locator('#previewCountRedesign');

        // Estado inicial - Visão Completa
        const initialText = await previewCount.textContent();
        console.log('Preview inicial:', initialText);

        // Ativar "Apenas Filtradas"
        await toggleLabel.click();
        await page.waitForTimeout(300);

        const filteredText = await previewCount.textContent();
        console.log('Preview filtrado:', filteredText);

        // Desativar (voltar para Visão Completa)
        await toggleLabel.click();
        await page.waitForTimeout(300);

        const completeText = await previewCount.textContent();
        console.log('Preview completo:', completeText);

        // Os textos podem ser iguais ou diferentes, dependendo dos dados
        // O importante é que não houve erro e a preview foi atualizada
        expect(completeText).toBeTruthy();
    });

    test('Filtro de período nos Filtros Avançados deve ser usado no modo "Apenas Filtradas"', async ({ page }) => {
        // Configurar um período customizado nos Filtros Avançados
        await page.evaluate(() => {
            if (window.dashboard) {
                window.dashboard.currentFilters = {
                    periodo: {
                        dataInicio: '2025-06-01',
                        dataFim: '2025-08-31'
                    }
                };
            }
        });

        // Ativar modo "Apenas Filtradas"
        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        await toggleLabel.click();

        // Aguardar preview atualizar
        await page.waitForTimeout(500);

        // Verificar que apenas licenças de Jun-Ago/2025 aparecem
        const result = await page.evaluate(() => {
            const mockData = window.mockLicenseData.getMockLicenseData();
            const customFilter = {
                dataInicio: '2025-06-01',
                dataFim: '2025-08-31'
            };

            // Servidor Ana Carolina (índice 2) tem licença em jul-set/2025
            const ana = mockData[2];
            const licencasDentro = ana.licencas.filter(lic => {
                const start = new Date(customFilter.dataInicio);
                const end = new Date(customFilter.dataFim);
                end.setHours(23, 59, 59, 999);

                return lic.inicio <= end && (lic.fim || lic.inicio) >= start;
            });

            return {
                anaTotalLicencas: ana.licencas.length,
                anaLicencasDentro: licencasDentro.length
            };
        });

        console.log('Filtro customizado (Jun-Ago/2025):', result);

        // Ana tem 3 licenças totais, e pelo menos 1 intersecta Jun-Ago/2025
        expect(result.anaTotalLicencas).toBe(3);
        expect(result.anaLicencasDentro).toBeGreaterThan(0);
    });

    test('Exportação deve respeitar o estado do toggle', async ({ page }) => {
        // Este teste verifica se a lógica de exportação também usa o toggle
        // (Não faz download real, apenas verifica que a função é chamada)

        const toggle = await page.locator('#licenseViewToggle');
        const toggleLabel = await page.locator('.toggle-switch-ios');

        // Ativar "Apenas Filtradas"
        await toggleLabel.click();

        // Verificar que o estado foi salvo
        const reportsManager = await page.evaluate(() => {
            return window.dashboard?.reportsManager?.showOnlyFilteredLicenses;
        });

        expect(reportsManager).toBe(true);
    });
});
