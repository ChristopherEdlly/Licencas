/**
 * Testes para App
 * 
 * Cobertura:
 * - Inicialização
 * - Carregamento de feature flags
 * - Inicialização de managers
 * - Pipeline de dados
 * - Tratamento de erros
 */

const App = require('../App.js');

// Mocks globais
global.window = {
    location: { hash: '' },
    addEventListener: () => { },
    dataStateManager: {
        setAllServidores: () => { },
        setFilteredServidores: () => { },
        getAllServidores: () => [],
        getFilteredServidores: () => []
    },
    filterStateManager: {
        getActiveFilters: () => ({})
    },
    uiStateManager: {}
};

global.document = {
    addEventListener: () => { },
    dispatchEvent: () => { }
};

global.localStorage = {
    getItem: () => null,
    setItem: () => { },
    removeItem: () => { }
};

// ==================== TESTES ====================

console.log('🧪 Iniciando testes do App...\\n');

let passedTests = 0;
let failedTests = 0;

function test(description, fn) {
    return new Promise(async (resolve) => {
        try {
            await fn();
            console.log(`✅ ${description}`);
            passedTests++;
            resolve();
        } catch (error) {
            console.error(`❌ ${description}`);
            console.error(`   ${error.message}`);
            failedTests++;
            resolve();
        }
    });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

// ==================== EXECUTAR TESTES ====================

(async () => {
    // Executar todos os testes sequencialmente
    await test('App é instanciado corretamente', async () => {
        const app = new App();
        assert(app !== null, 'App deve ser criado');
        assert(app.isInitialized === false, 'Não deve estar inicializado');
        assert(app.isLoading === false, 'Não deve estar carregando');
    });

    await test('Feature flags padrão são definidas', async () => {
        const app = new App();
        assert(app.featureFlags.USE_EVENT_BUS === true, 'USE_EVENT_BUS deve ser true');
        assert(app.featureFlags.USE_ROUTER === true, 'USE_ROUTER deve ser true');
        assert(app.featureFlags.USE_NEW_PIPELINE === false, 'USE_NEW_PIPELINE deve ser false');
        assert(app.featureFlags.DEBUG_MODE === false, 'DEBUG_MODE deve ser false');
    });

    await test('Managers são inicializados como null', async () => {
        const app = new App();
        assert(app.eventBus === null, 'EventBus deve ser null');
        assert(app.router === null, 'Router deve ser null');
        assert(app.tableManager === null, 'TableManager deve ser null');
        assert(app.chartManager === null, 'ChartManager deve ser null');
    });

    await test('Pages são inicializadas como null', async () => {
        const app = new App();
        assert(app.pages.home === null, 'HomePage deve ser null');
        assert(app.pages.calendar === null, 'CalendarPage deve ser null');
        assert(app.pages.timeline === null, 'TimelinePage deve ser null');
        assert(app.pages.reports === null, 'ReportsPage deve ser null');
        assert(app.pages.settings === null, 'SettingsPage deve ser null');
        assert(app.pages.tips === null, 'TipsPage deve ser null');
    });

    await test('Carrega feature flags do localStorage', async () => {
        const savedFlags = JSON.stringify({
            USE_EVENT_BUS: false,
            DEBUG_MODE: true
        });

        global.localStorage.getItem = (key) => {
            if (key === 'featureFlags') return savedFlags;
            return null;
        };

        const app = new App();
        app._loadFeatureFlags();

        assert(app.featureFlags.USE_EVENT_BUS === false, 'USE_EVENT_BUS deve ser false (do localStorage)');
        assert(app.featureFlags.DEBUG_MODE === true, 'DEBUG_MODE deve ser true (do localStorage)');
        assert(app.featureFlags.USE_ROUTER === true, 'USE_ROUTER deve manter padrão');

        // Reset
        global.localStorage.getItem = () => null;
    });

    await test('Aplica feature flags globalmente', async () => {
        const app = new App();
        app._loadFeatureFlags();
        assert(global.window.FEATURE_FLAGS !== undefined, 'FEATURE_FLAGS deve ser definido globalmente');
    });

    await test('init() marca app como inicializado', async () => {
        const app = new App();
        await app.init();
        assert(app.isInitialized === true, 'App deve estar inicializado');
    });

    await test('init() não reinicializa se já inicializado', async () => {
        const app = new App();
        await app.init();
        const firstInit = app.isInitialized;
        await app.init();
        assert(firstInit === true, 'Deve permanecer inicializado');
    });

    await test('Conecta DataStateManager global', async () => {
        const app = new App();
        app._initStateManagers();
        assert(app.dataStateManager !== null, 'DataStateManager deve estar conectado');
        assert(app.dataStateManager === global.window.dataStateManager, 'Deve ser a instância global');
    });

    await test('Conecta FilterStateManager global', async () => {
        const app = new App();
        app._initStateManagers();
        assert(app.filterStateManager !== null, 'FilterStateManager deve estar conectado');
        assert(app.filterStateManager === global.window.filterStateManager, 'Deve ser a instância global');
    });

    await test('loadFile() valida arquivo obrigatório', async () => {
        const app = new App();
        await app.init();
        let errorThrown = false;
        try {
            await app.loadFile(null);
        } catch (error) {
            errorThrown = true;
        }
        assert(errorThrown === true, 'Deve lançar erro se arquivo não fornecido');
    });

    await test('loadFile() define isLoading durante carregamento', async () => {
        const app = new App();
        await app.init();

        global.FileService = {
            validateFile: () => ({ valid: true }),
            readFile: async () => {
                assert(app.isLoading === true, 'isLoading deve ser true durante carregamento');
                return 'mock,data\\ntest,123';
            }
        };

        // Mock DataParser para evitar erro de parse
        global.DataParser = {
            parseCSV: () => []
        };

        // Mock DataTransformer
        global.DataTransformer = {
            transformAll: (data) => data
        };

        const mockFile = { name: 'test.csv', type: 'text/csv' };
        try {
            await app.loadFile(mockFile);
        } catch (error) {
            // Pode falhar, mas isLoading deve ser resetado
        }

        assert(app.isLoading === false, 'isLoading deve ser false após carregamento');

        // Cleanup
        delete global.FileService;
        delete global.DataParser;
        delete global.DataTransformer;
    });

    await test('applyFilters() obtém dados e filtros dos managers', async () => {
        const app = new App();
        await app.init();

        let allDataCalled = false;
        let filtersCalled = false;

        app.dataStateManager = {
            getAllServidores: () => {
                allDataCalled = true;
                return [];
            },
            setFilteredServidores: () => { }
        };

        app.filterStateManager = {
            getActiveFilters: () => {
                filtersCalled = true;
                return {};
            }
        };

        app.applyFilters();

        assert(allDataCalled === true, 'Deve chamar getAllServidores');
        assert(filtersCalled === true, 'Deve chamar getActiveFilters');
    });

    await test('applyFilters() atualiza dados filtrados', async () => {
        const app = new App();
        await app.init();

        let filteredDataSet = false;

        app.dataStateManager = {
            getAllServidores: () => [{ id: 1 }, { id: 2 }],
            setFilteredServidores: (data) => {
                filteredDataSet = true;
            }
        };

        app.filterStateManager = {
            getActiveFilters: () => ({})
        };

        app.applyFilters();

        assert(filteredDataSet === true, 'Deve atualizar dados filtrados');
    });

    await test('getDebugInfo() retorna informações completas', async () => {
        const app = new App();
        await app.init();

        const debugInfo = app.getDebugInfo();

        assert(debugInfo.isInitialized !== undefined, 'Deve incluir isInitialized');
        assert(debugInfo.isLoading !== undefined, 'Deve incluir isLoading');
        assert(debugInfo.featureFlags !== undefined, 'Deve incluir featureFlags');
        assert(debugInfo.managers !== undefined, 'Deve incluir managers');
        assert(debugInfo.pages !== undefined, 'Deve incluir pages');
        assert(debugInfo.services !== undefined, 'Deve incluir services');
    });

    await test('getDebugInfo() mostra status dos managers', async () => {
        const app = new App();
        await app.init();

        const debugInfo = app.getDebugInfo();

        assert(typeof debugInfo.managers.dataState === 'boolean', 'dataState deve ser boolean');
        assert(typeof debugInfo.managers.filterState === 'boolean', 'filterState deve ser boolean');
        assert(typeof debugInfo.managers.table === 'boolean', 'table deve ser boolean');
    });

    await test('getDebugInfo() mostra status das páginas', async () => {
        const app = new App();
        await app.init();

        const debugInfo = app.getDebugInfo();

        assert(typeof debugInfo.pages.home === 'boolean', 'home deve ser boolean');
        assert(typeof debugInfo.pages.calendar === 'boolean', 'calendar deve ser boolean');
        assert(typeof debugInfo.pages.timeline === 'boolean', 'timeline deve ser boolean');
    });

    await test('_handleInitError() loga erro', async () => {
        const app = new App();

        let errorLogged = false;
        const originalError = console.error;
        const originalAlert = global.alert;

        console.error = () => { errorLogged = true; };
        global.alert = () => { }; // Mock alert para evitar erro

        app._handleInitError(new Error('Test error'));

        assert(errorLogged === true, 'Erro deve ser logado');

        // Restore
        console.error = originalError;
        if (originalAlert) {
            global.alert = originalAlert;
        } else {
            delete global.alert;
        }
    });

    await test('_parseData() usa DataParser se disponível', async () => {
        const app = new App();

        let parserCalled = false;

        global.DataParser = {
            parseCSV: (data) => {
                parserCalled = true;
                return [];
            }
        };

        await app._parseData('test,data');

        assert(parserCalled === true, 'DataParser deve ser chamado');

        // Cleanup
        delete global.DataParser;
    });

    await test('_parseData() usa parser legado como fallback', async () => {
        const app = new App();

        let legacyParserCalled = false;

        global.window.cronogramaParser = {
            parse: (data) => {
                legacyParserCalled = true;
                return [];
            }
        };

        await app._parseData('test,data');

        assert(legacyParserCalled === true, 'Parser legado deve ser usado como fallback');

        // Cleanup
        delete global.window.cronogramaParser;
    });

    await test('_transformData() usa DataTransformer se disponível', async () => {
        const app = new App();

        let transformerCalled = false;

        global.DataTransformer = {
            transformAll: (data) => {
                transformerCalled = true;
                return data;
            }
        };

        await app._transformData([]);

        assert(transformerCalled === true, 'DataTransformer deve ser chamado');

        // Cleanup
        delete global.DataTransformer;
    });

    await test('_transformData() retorna dados sem transformação se transformer não disponível', async () => {
        const app = new App();

        const testData = [{ id: 1 }];
        const result = await app._transformData(testData);

        assert(result === testData, 'Deve retornar dados originais');
    });

    // ==================== RESULTADOS ====================

    console.log('\\n' + '='.repeat(50));
    console.log(`✅ Testes passados: ${passedTests}`);
    console.log(`❌ Testes falhados: ${failedTests}`);
    console.log(`📊 Total: ${passedTests + failedTests}`);
    console.log('='.repeat(50));

    if (failedTests > 0) {
        process.exit(1);
    }
})();
