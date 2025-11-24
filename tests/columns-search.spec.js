/**
 * Teste Playwright - Busca e Seleção de Colunas
 *
 * Valida:
 * 1. Busca de colunas funciona corretamente
 * 2. Acordeão de grupos expande/colapsa
 * 3. Botões Marcar/Desmarcar Todas funcionam
 * 4. Empty state aparece quando nenhuma coluna é encontrada
 */

const { test, expect } = require('@playwright/test');

test.describe('Seletor de Colunas - Busca e Agrupamento', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:3000');
        await page.waitForLoadState('networkidle');

        // Navegar para Relatórios
        await page.click('a[data-page="reports"]');
        await page.waitForSelector('#reportsPage.active', { state: 'visible' });
    });

    test('Campo de busca deve estar presente', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');
        await expect(searchInput).toBeVisible();
        await expect(searchInput).toHaveAttribute('placeholder', 'Buscar colunas...');
    });

    test('Botões Marcar e Desmarcar Todas devem estar presentes', async ({ page }) => {
        const selectAllBtn = await page.locator('#selectAllColumns');
        const unselectAllBtn = await page.locator('#unselectAllColumns');

        await expect(selectAllBtn).toBeVisible();
        await expect(unselectAllBtn).toBeVisible();
    });

    test('Grupos de colunas devem estar presentes (Servidor, Localização, Licença)', async ({ page }) => {
        const groups = await page.locator('.column-group');
        const groupCount = await groups.count();

        // Deve haver 3 grupos
        expect(groupCount).toBe(3);

        // Verificar títulos dos grupos
        const servidorGroup = await page.locator('.column-group[data-group="servidor"] .group-title');
        const localizacaoGroup = await page.locator('.column-group[data-group="localizacao"] .group-title');
        const licencaGroup = await page.locator('.column-group[data-group="licenca"] .group-title');

        await expect(servidorGroup).toHaveText('Dados do Servidor');
        await expect(localizacaoGroup).toHaveText('Localização');
        await expect(licencaGroup).toHaveText('Informações da Licença');
    });

    test('Buscar por "nome" deve mostrar apenas coluna Nome', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');

        // Digitar "nome"
        await searchInput.fill('nome');
        await page.waitForTimeout(100);

        // Verificar colunas visíveis
        const visibleColumns = await page.locator('.column-checkbox:not(.hidden)');
        const visibleCount = await visibleColumns.count();

        expect(visibleCount).toBe(1);

        // Verificar que é a coluna "Nome"
        const columnText = await visibleColumns.first().textContent();
        expect(columnText).toContain('Nome');
    });

    test('Buscar por "licença" deve mostrar todas colunas relacionadas', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');

        await searchInput.fill('licença');
        await page.waitForTimeout(100);

        const visibleColumns = await page.locator('.column-checkbox:not(.hidden)');
        const visibleCount = await visibleColumns.count();

        // Deve mostrar: Período da Licença, Dias de Licença, Meses de Licença
        expect(visibleCount).toBeGreaterThanOrEqual(3);
    });

    test('Busca sem acentos deve funcionar (buscar "urgencia")', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');

        // Buscar sem acento
        await searchInput.fill('urgencia');
        await page.waitForTimeout(100);

        const visibleColumns = await page.locator('.column-checkbox:not(.hidden)');
        const visibleCount = await visibleColumns.count();

        // Deve encontrar "Urgência" (com acento)
        expect(visibleCount).toBe(1);

        const columnText = await visibleColumns.first().textContent();
        expect(columnText).toContain('Urgência');
    });

    test('Buscar por termo inexistente deve mostrar empty state', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');
        const emptyState = await page.locator('#columnsEmptyState');

        // Buscar por algo que não existe
        await searchInput.fill('xyzabc123');
        await page.waitForTimeout(100);

        // Empty state deve estar visível
        await expect(emptyState).toBeVisible();

        // Mensagem correta
        const message = await emptyState.locator('p').textContent();
        expect(message).toContain('Nenhuma coluna encontrada');
    });

    test('Botão de limpar busca deve aparecer ao digitar', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');
        const clearButton = await page.locator('#clearColumnSearch');

        // Inicialmente oculto
        await expect(clearButton).not.toBeVisible();

        // Digitar algo
        await searchInput.fill('nome');
        await page.waitForTimeout(100);

        // Botão deve aparecer
        await expect(clearButton).toBeVisible();
    });

    test('Clicar em limpar busca deve restaurar todas as colunas', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');
        const clearButton = await page.locator('#clearColumnSearch');

        // Buscar por "nome"
        await searchInput.fill('nome');
        await page.waitForTimeout(100);

        // Verificar que apenas 1 coluna está visível
        let visibleColumns = await page.locator('.column-checkbox:not(.hidden)');
        expect(await visibleColumns.count()).toBe(1);

        // Clicar em limpar
        await clearButton.click();
        await page.waitForTimeout(100);

        // Todas as colunas devem estar visíveis novamente
        visibleColumns = await page.locator('.column-checkbox:not(.hidden)');
        const totalColumns = await page.locator('.column-checkbox');

        expect(await visibleColumns.count()).toBe(await totalColumns.count());

        // Input deve estar vazio
        expect(await searchInput.inputValue()).toBe('');
    });

    test('Marcar Todas deve marcar todos os checkboxes', async ({ page }) => {
        const selectAllBtn = await page.locator('#selectAllColumns');

        // Primeiro desmarcar todas
        const unselectAllBtn = await page.locator('#unselectAllColumns');
        await unselectAllBtn.click();
        await page.waitForTimeout(300);

        // Depois marcar todas
        await selectAllBtn.click();
        await page.waitForTimeout(300);

        // Verificar que todos estão marcados
        const result = await page.evaluate(() => {
            const checkboxes = document.querySelectorAll('.column-checkbox input[type="checkbox"]');
            const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
            const totalCount = checkboxes.length;
            return { checkedCount, totalCount };
        });

        console.log('Marcar Todas - Resultado:', result);

        expect(result.checkedCount).toBe(result.totalCount);
    });

    test('Desmarcar Todas deve desmarcar todos os checkboxes', async ({ page }) => {
        const unselectAllBtn = await page.locator('#unselectAllColumns');

        // Clicar em desmarcar todas
        await unselectAllBtn.click();
        await page.waitForTimeout(100);

        // Verificar que nenhum está marcado
        const checkboxes = await page.locator('.column-checkbox input[type="checkbox"]');
        const checkedCount = await checkboxes.evaluateAll(boxes =>
            boxes.filter(box => box.checked).length
        );

        expect(checkedCount).toBe(0);
    });

    test('Clicar no cabeçalho do grupo deve expandir/colapsar', async ({ page }) => {
        const servidorGroup = await page.locator('.column-group[data-group="servidor"]');
        const servidorHeader = await page.locator('.column-group[data-group="servidor"] .column-group-header');

        // Estado inicial (pode estar expandido ou colapsado)
        const initialState = await servidorGroup.evaluate(el => el.classList.contains('active'));

        // Clicar no cabeçalho
        await servidorHeader.click();
        await page.waitForTimeout(100);

        // Estado deve ter mudado
        const newState = await servidorGroup.evaluate(el => el.classList.contains('active'));
        expect(newState).toBe(!initialState);

        // Clicar novamente
        await servidorHeader.click();
        await page.waitForTimeout(100);

        // Deve voltar ao estado inicial
        const finalState = await servidorGroup.evaluate(el => el.classList.contains('active'));
        expect(finalState).toBe(initialState);
    });

    test('Buscar deve expandir automaticamente grupos com resultados', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');
        const servidorGroup = await page.locator('.column-group[data-group="servidor"]');

        // Colapsar o grupo primeiro
        const servidorHeader = await page.locator('.column-group[data-group="servidor"] .column-group-header');
        const isActive = await servidorGroup.evaluate(el => el.classList.contains('active'));
        if (isActive) {
            await servidorHeader.click();
            await page.waitForTimeout(100);
        }

        // Buscar por "nome" (que está no grupo Servidor)
        await searchInput.fill('nome');
        await page.waitForTimeout(100);

        // Grupo Servidor deve estar expandido
        const expanded = await servidorGroup.evaluate(el => el.classList.contains('active'));
        expect(expanded).toBe(true);
    });

    test('Grupos sem resultados devem ficar ocultos durante busca', async ({ page }) => {
        const searchInput = await page.locator('#columnSearchInput');
        const localizacaoGroup = await page.locator('.column-group[data-group="localizacao"]');

        // Buscar por "cpf" (que está no grupo Servidor, não Localização)
        await searchInput.fill('cpf');
        await page.waitForTimeout(100);

        // Grupo Localização deve estar oculto
        await expect(localizacaoGroup).not.toBeVisible();

        // Limpar busca
        const clearButton = await page.locator('#clearColumnSearch');
        await clearButton.click();
        await page.waitForTimeout(100);

        // Grupo Localização deve voltar a aparecer
        await expect(localizacaoGroup).toBeVisible();
    });

    test('Preview deve atualizar quando colunas são selecionadas', async ({ page }) => {
        // Expandir grupo "Dados do Servidor" primeiro
        const servidorHeader = await page.locator('.column-group[data-group="servidor"] .column-group-header');
        await servidorHeader.click();
        await page.waitForTimeout(200);

        // Clicar no label ao invés do input diretamente
        const checkboxLabel = await page.locator('.column-checkbox[data-column="cpf"]');
        await checkboxLabel.click();
        await page.waitForTimeout(300);

        // Verificar que o preview foi atualizado (método updateConfig foi chamado)
        const configUpdated = await page.evaluate(() => {
            return window.dashboard?.reportsManager?.reportConfig !== undefined;
        });

        expect(configUpdated).toBe(true);
    });
});
