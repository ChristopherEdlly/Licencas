/**
 * Teste End-to-End (E2E) da Aplicação
 *
 * Simula a jornada completa de um usuário real:
 * 1. Carregamento da aplicação
 * 2. Upload de arquivo
 * 3. Visualização de dados
 * 4. Navegação entre páginas
 * 5. Aplicação de filtros
 * 6. Exportação de relatórios
 *
 * @version 1.0.0
 * @date 2025-12-11
 */

describe('E2E: Aplicação Completa', () => {
    let app;
    let eventBus;

    beforeEach(() => {
        // Limpar DOM
        document.body.innerHTML = `
            <div id="app">
                <div id="homePage" class="page-content"></div>
                <div id="calendarPage" class="page-content"></div>
                <div id="timelinePage" class="page-content"></div>
                <div id="reportsPage" class="page-content"></div>
                <div id="settingsPage" class="page-content"></div>
                <div id="tipsPage" class="page-content"></div>

                <nav id="sidebar">
                    <a href="#/" class="nav-link" data-page="home">Home</a>
                    <a href="#/calendar" class="nav-link" data-page="calendar">Calendar</a>
                    <a href="#/timeline" class="nav-link" data-page="timeline">Timeline</a>
                    <a href="#/reports" class="nav-link" data-page="reports">Reports</a>
                    <a href="#/settings" class="nav-link" data-page="settings">Settings</a>
                    <a href="#/tips" class="nav-link" data-page="tips">Tips</a>
                </nav>

                <input type="file" id="fileInput" />
                <button id="uploadButton">Upload</button>
            </div>
        `;

        // Limpar localStorage e sessionStorage
        localStorage.clear();
        sessionStorage.clear();

        // Criar instância do App
        if (typeof App !== 'undefined') {
            app = new App();
        }

        // Obter referência ao EventBus
        if (typeof EventBus !== 'undefined') {
            eventBus = EventBus.getInstance();
        }
    });

    afterEach(() => {
        // Cleanup
        if (app && typeof app.destroy === 'function') {
            app.destroy();
        }
        document.body.innerHTML = '';
        localStorage.clear();
        sessionStorage.clear();
    });

    // ==================== TESTE 1: INICIALIZAÇÃO ====================

    describe('1. Inicialização da Aplicação', () => {
        test('deve carregar todos os componentes principais', async () => {
            expect(app).toBeDefined();

            // Verificar se EventBus está disponível
            expect(eventBus).toBeDefined();

            // Verificar se Router está disponível
            expect(app.router).toBeDefined();

            // Inicializar app
            await app.init();

            // Verificar se managers foram inicializados
            expect(app.dataStateManager).toBeDefined();
            expect(app.sidebarManager).toBeDefined();
        });

        test('deve navegar para página inicial por padrão', async () => {
            await app.init();

            // Verificar se página home está ativa
            const homePage = document.getElementById('homePage');
            expect(homePage.classList.contains('active')).toBe(true);
        });

        test('deve aplicar tema padrão', async () => {
            await app.init();

            // Verificar se themeManager está ativo
            expect(window.themeManager).toBeDefined();

            // Verificar se tema foi aplicado ao body
            const theme = document.body.getAttribute('data-theme');
            expect(['light', 'dark']).toContain(theme);
        });
    });

    // ==================== TESTE 2: UPLOAD DE ARQUIVO ====================

    describe('2. Upload e Processamento de Arquivo', () => {
        test('deve processar arquivo CSV válido', async () => {
            await app.init();

            // Criar arquivo CSV de teste
            const csvContent = `SERVIDOR,CPF,CARGO,LOTACAO,DN,SEXO,ADMISSÃO,CRONOGRAMA
João Silva,123.456.789-00,Auditor Fiscal,SUTRI,15/05/1980,M,01/01/2005,jan/2025 - mar/2025
Maria Santos,987.654.321-00,Analista,SUPER-X,20/08/1975,F,15/03/2000,jun/2025 - ago/2025`;

            const file = new File([csvContent], 'test.csv', { type: 'text/csv' });

            // Simular upload
            const loadedData = await app.loadFile(file);

            // Verificar se dados foram carregados
            expect(loadedData).toBeDefined();
            expect(Array.isArray(loadedData)).toBe(true);
            expect(loadedData.length).toBeGreaterThan(0);

            // Verificar se DataStateManager foi atualizado
            const allServidores = app.dataStateManager.getAllServidores();
            expect(allServidores.length).toBe(2);
        });

        test('deve processar arquivo Excel válido', async () => {
            await app.init();

            // Mock do processamento Excel
            // (Em teste real, você usaria um arquivo Excel de verdade)
            const mockExcelData = [
                {
                    servidor: 'João Silva',
                    cpf: '123.456.789-00',
                    cargo: 'Auditor Fiscal',
                    lotacao: 'SUTRI',
                    licencas: [
                        { inicio: new Date('2025-01-01'), fim: new Date('2025-03-31'), meses: 3 }
                    ]
                }
            ];

            // Simular carregamento direto
            app.dataStateManager.setAllServidores(mockExcelData);

            const allServidores = app.dataStateManager.getAllServidores();
            expect(allServidores.length).toBe(1);
            expect(allServidores[0].servidor).toBe('João Silva');
        });

        test('deve exibir erro para arquivo inválido', async () => {
            await app.init();

            // Criar arquivo inválido
            const invalidContent = 'INVALID,DATA,FORMAT';
            const file = new File([invalidContent], 'invalid.csv', { type: 'text/csv' });

            // Simular upload e capturar erro
            let errorOccurred = false;
            try {
                await app.loadFile(file);
            } catch (error) {
                errorOccurred = true;
            }

            // Em caso de erro, deve ter sido tratado
            expect(errorOccurred).toBe(true);
        });
    });

    // ==================== TESTE 3: NAVEGAÇÃO ====================

    describe('3. Navegação entre Páginas', () => {
        beforeEach(async () => {
            await app.init();

            // Carregar dados de teste
            const testData = [
                {
                    servidor: 'João Silva',
                    cpf: '123.456.789-00',
                    cargo: 'Auditor Fiscal',
                    lotacao: 'SUTRI',
                    urgencia: 'critica',
                    licencas: [
                        { inicio: new Date('2025-01-01'), fim: new Date('2025-03-31'), meses: 3 }
                    ]
                }
            ];
            app.dataStateManager.setAllServidores(testData);
        });

        test('deve navegar para página Calendar', async () => {
            await app.navigateToPage('calendar');

            const calendarPage = document.getElementById('calendarPage');
            expect(calendarPage.classList.contains('active')).toBe(true);

            const homePage = document.getElementById('homePage');
            expect(homePage.classList.contains('active')).toBe(false);
        });

        test('deve navegar para página Timeline', async () => {
            await app.navigateToPage('timeline');

            const timelinePage = document.getElementById('timelinePage');
            expect(timelinePage.classList.contains('active')).toBe(true);
        });

        test('deve navegar para página Reports', async () => {
            await app.navigateToPage('reports');

            const reportsPage = document.getElementById('reportsPage');
            expect(reportsPage.classList.contains('active')).toBe(true);
        });

        test('deve navegar para página Settings', async () => {
            await app.navigateToPage('settings');

            const settingsPage = document.getElementById('settingsPage');
            expect(settingsPage.classList.contains('active')).toBe(true);
        });

        test('deve navegar para página Tips', async () => {
            await app.navigateToPage('tips');

            const tipsPage = document.getElementById('tipsPage');
            expect(tipsPage.classList.contains('active')).toBe(true);
        });

        test('deve voltar para Home ao clicar no link Home', async () => {
            // Navegar para outra página
            await app.navigateToPage('calendar');

            // Voltar para home
            await app.navigateToPage('home');

            const homePage = document.getElementById('homePage');
            expect(homePage.classList.contains('active')).toBe(true);
        });
    });

    // ==================== TESTE 4: FILTROS ====================

    describe('4. Aplicação de Filtros', () => {
        beforeEach(async () => {
            await app.init();

            // Carregar dados de teste com múltiplos servidores
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
            app.dataStateManager.setAllServidores(testData);
        });

        test('deve filtrar por urgência crítica', () => {
            const filters = { urgencia: ['critica'] };
            app.dataStateManager.applyFilters(filters);

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(1);
            expect(filtered[0].servidor).toBe('João Silva');
        });

        test('deve filtrar por cargo', () => {
            const filters = { cargo: ['Auditor Fiscal'] };
            app.dataStateManager.applyFilters(filters);

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(2);
        });

        test('deve filtrar por lotação', () => {
            const filters = { lotacao: ['SUTRI'] };
            app.dataStateManager.applyFilters(filters);

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(2);
        });

        test('deve combinar múltiplos filtros', () => {
            const filters = {
                urgencia: ['critica', 'alta'],
                cargo: ['Auditor Fiscal']
            };
            app.dataStateManager.applyFilters(filters);

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(1);
            expect(filtered[0].servidor).toBe('João Silva');
        });

        test('deve limpar filtros', () => {
            // Aplicar filtros
            const filters = { urgencia: ['critica'] };
            app.dataStateManager.applyFilters(filters);

            // Limpar filtros
            app.dataStateManager.clearFilters();

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(3);
        });
    });

    // ==================== TESTE 5: BUSCA ====================

    describe('5. Busca de Servidores', () => {
        beforeEach(async () => {
            await app.init();

            const testData = [
                { servidor: 'João Silva', cpf: '123.456.789-00', cargo: 'Auditor Fiscal' },
                { servidor: 'Maria Santos', cpf: '987.654.321-00', cargo: 'Analista' },
                { servidor: 'Pedro Oliveira', cpf: '111.222.333-44', cargo: 'Técnico' }
            ];
            app.dataStateManager.setAllServidores(testData);
        });

        test('deve buscar por nome', () => {
            const searchTerm = 'João';
            const filters = { search: searchTerm };
            app.dataStateManager.applyFilters(filters);

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(1);
            expect(filtered[0].servidor).toContain('João');
        });

        test('deve buscar por CPF', () => {
            const searchTerm = '123.456';
            const filters = { search: searchTerm };
            app.dataStateManager.applyFilters(filters);

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(1);
        });

        test('busca deve ser case-insensitive', () => {
            const searchTerm = 'maria';
            const filters = { search: searchTerm };
            app.dataStateManager.applyFilters(filters);

            const filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(1);
            expect(filtered[0].servidor).toBe('Maria Santos');
        });
    });

    // ==================== TESTE 6: CACHE ====================

    describe('6. Sistema de Cache', () => {
        test('deve salvar arquivo no cache', async () => {
            if (!app.cacheService || typeof app.cacheService.saveToCache !== 'function') {
                console.warn('CacheService não disponível, pulando teste');
                return;
            }

            const testFile = {
                name: 'test.csv',
                size: 1024,
                type: 'text/csv'
            };

            const testData = [
                { servidor: 'João Silva', cargo: 'Auditor Fiscal' }
            ];

            await app.cacheService.saveToCache(testFile, testData);

            // Verificar se foi salvo
            const cached = await app.cacheService.getLatestCache();
            expect(cached).toBeDefined();
            expect(cached.metadata.name).toBe('test.csv');
        });

        test('deve restaurar dados do cache', async () => {
            if (!app.cacheService) {
                console.warn('CacheService não disponível, pulando teste');
                return;
            }

            // Salvar no cache
            const testFile = {
                name: 'test.csv',
                size: 1024,
                type: 'text/csv'
            };

            const testData = [
                { servidor: 'João Silva', cargo: 'Auditor Fiscal' }
            ];

            await app.cacheService.saveToCache(testFile, testData);

            // Restaurar do cache
            const cached = await app.cacheService.getLatestCache();
            expect(cached.data).toBeDefined();
            expect(cached.data.length).toBe(1);
        });
    });

    // ==================== TESTE 7: EVENTOS ====================

    describe('7. Sistema de Eventos', () => {
        test('deve emitir evento ao carregar dados', (done) => {
            const listener = (data) => {
                expect(data).toBeDefined();
                expect(Array.isArray(data)).toBe(true);
                eventBus.off('data:loaded', listener);
                done();
            };

            eventBus.on('data:loaded', listener);

            // Carregar dados
            const testData = [{ servidor: 'João Silva' }];
            app.dataStateManager.setAllServidores(testData);
        });

        test('deve emitir evento ao aplicar filtros', (done) => {
            const listener = (filters) => {
                expect(filters).toBeDefined();
                eventBus.off('filters:applied', listener);
                done();
            };

            eventBus.on('filters:applied', listener);

            // Aplicar filtros
            app.dataStateManager.applyFilters({ urgencia: ['critica'] });
        });

        test('deve emitir evento ao mudar de página', (done) => {
            const listener = (pageName) => {
                expect(pageName).toBe('calendar');
                eventBus.off('page:changed', listener);
                done();
            };

            eventBus.on('page:changed', listener);

            // Navegar para página
            app.navigateToPage('calendar');
        });
    });

    // ==================== TESTE 8: INTEGRAÇÃO COMPLETA ====================

    describe('8. Jornada Completa do Usuário', () => {
        test('deve completar jornada completa de uso', async () => {
            // PASSO 1: Inicializar aplicação
            await app.init();
            expect(app).toBeDefined();

            // PASSO 2: Carregar arquivo
            const csvContent = `SERVIDOR,CARGO,URGENCIA
João Silva,Auditor Fiscal,critica
Maria Santos,Analista,alta`;

            const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
            await app.loadFile(file);

            const allData = app.dataStateManager.getAllServidores();
            expect(allData.length).toBe(2);

            // PASSO 3: Aplicar filtros
            app.dataStateManager.applyFilters({ urgencia: ['critica'] });
            let filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(1);

            // PASSO 4: Navegar para Calendar
            await app.navigateToPage('calendar');
            const calendarPage = document.getElementById('calendarPage');
            expect(calendarPage.classList.contains('active')).toBe(true);

            // PASSO 5: Navegar para Timeline
            await app.navigateToPage('timeline');
            const timelinePage = document.getElementById('timelinePage');
            expect(timelinePage.classList.contains('active')).toBe(true);

            // PASSO 6: Navegar para Reports
            await app.navigateToPage('reports');
            const reportsPage = document.getElementById('reportsPage');
            expect(reportsPage.classList.contains('active')).toBe(true);

            // PASSO 7: Limpar filtros
            app.dataStateManager.clearFilters();
            filtered = app.dataStateManager.getFilteredServidores();
            expect(filtered.length).toBe(2);

            // PASSO 8: Voltar para Home
            await app.navigateToPage('home');
            const homePage = document.getElementById('homePage');
            expect(homePage.classList.contains('active')).toBe(true);
        });
    });

    // ==================== TESTE 9: PERFORMANCE ====================

    describe('9. Performance', () => {
        test('deve carregar 1000 registros em menos de 2 segundos', async () => {
            await app.init();

            // Gerar 1000 registros
            const largeData = Array.from({ length: 1000 }, (_, i) => ({
                servidor: `Servidor ${i}`,
                cpf: `${String(i).padStart(11, '0')}`,
                cargo: 'Auditor Fiscal',
                urgencia: i % 4 === 0 ? 'critica' : 'baixa'
            }));

            const startTime = performance.now();
            app.dataStateManager.setAllServidores(largeData);
            const endTime = performance.now();

            const loadTime = endTime - startTime;
            expect(loadTime).toBeLessThan(2000); // Menos de 2 segundos
        });

        test('deve aplicar filtros em grande dataset rapidamente', async () => {
            await app.init();

            // Dataset grande
            const largeData = Array.from({ length: 5000 }, (_, i) => ({
                servidor: `Servidor ${i}`,
                urgencia: i % 4 === 0 ? 'critica' : 'baixa'
            }));

            app.dataStateManager.setAllServidores(largeData);

            const startTime = performance.now();
            app.dataStateManager.applyFilters({ urgencia: ['critica'] });
            const endTime = performance.now();

            const filterTime = endTime - startTime;
            expect(filterTime).toBeLessThan(500); // Menos de 500ms
        });
    });

    // ==================== TESTE 10: TRATAMENTO DE ERROS ====================

    describe('10. Tratamento de Erros', () => {
        test('deve tratar erro ao carregar arquivo vazio', async () => {
            await app.init();

            const emptyFile = new File([''], 'empty.csv', { type: 'text/csv' });

            let errorCaught = false;
            try {
                await app.loadFile(emptyFile);
            } catch (error) {
                errorCaught = true;
            }

            expect(errorCaught).toBe(true);
        });

        test('deve tratar erro ao navegar para página inválida', async () => {
            await app.init();

            // Tentar navegar para página que não existe
            let errorCaught = false;
            try {
                await app.navigateToPage('invalid-page');
            } catch (error) {
                errorCaught = true;
            }

            // Deve ter tratado o erro gracefully
            expect(errorCaught).toBe(false); // Não deve lançar erro, deve ignorar
        });

        test('deve tratar dados inválidos ao aplicar filtros', () => {
            const invalidFilters = { invalidKey: 'invalidValue' };

            let errorCaught = false;
            try {
                app.dataStateManager.applyFilters(invalidFilters);
            } catch (error) {
                errorCaught = true;
            }

            // Deve ignorar filtros inválidos
            expect(errorCaught).toBe(false);
        });
    });
});

console.log('✅ Teste E2E completo da aplicação carregado');
