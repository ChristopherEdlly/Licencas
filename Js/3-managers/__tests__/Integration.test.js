/**
 * Testes de Integração - Fluxo de Dados entre Managers
 * Execute: node js/3-managers/__tests__/Integration.test.js
 *
 * Objetivo: Garantir que os dados fluem corretamente entre os managers
 * sem bugs ou erros, testando os cenários reais de uso.
 */

// Importar State Managers
const DataStateManager = require('../state/DataStateManager.js');
const FilterStateManager = require('../state/FilterStateManager.js');
const UIStateManager = require('../state/UIStateManager.js');

// Importar Feature Managers
const SearchManager = require('../features/SearchManager.js');
const FilterManager = require('../features/FilterManager.js');
const ReportsManager = require('../features/ReportsManager.js');

console.log('🧪 Iniciando Testes de Integração - Fluxo de Dados\n');
console.log('='.repeat(70));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function test(description, testFn) {
    totalTests++;
    console.log(`\n📝 Teste ${totalTests}: ${description}`);
    try {
        testFn();
        passedTests++;
        console.log('✅ PASSOU');
    } catch (error) {
        failedTests++;
        console.log('❌ FALHOU:', error.message);
    }
}

function assertEquals(actual, expected, message = '') {
    const msg = message ? ` (${message})` : '';
    if (actual !== expected) {
        throw new Error(`Esperado: ${expected}, Recebido: ${actual}${msg}`);
    }
}

function assertTrue(value, message = '') {
    if (!value) {
        throw new Error(message || 'Esperado valor verdadeiro');
    }
}

// Mock de dados realistas
const mockServidores = [
    {
        servidor: 'João Silva',
        cpf: '123.456.789-00',
        idade: 58,
        cargo: 'Auditor Fiscal',
        lotacao: 'SUTRI',
        superintendencia: 'SUPER-1',
        urgencia: 'critica',
        proximaLicenca: new Date('2025-06-01'),
        mesesLicenca: 3,
        licencas: [
            { inicio: new Date('2025-06-01'), fim: new Date('2025-08-30'), meses: 3 }
        ]
    },
    {
        servidor: 'Maria Santos',
        cpf: '987.654.321-00',
        idade: 45,
        cargo: 'Analista',
        lotacao: 'SUCON',
        superintendencia: 'SUPER-2',
        urgencia: 'baixa',
        proximaLicenca: new Date('2027-01-01'),
        mesesLicenca: 2,
        licencas: [
            { inicio: new Date('2027-01-01'), fim: new Date('2027-02-28'), meses: 2 }
        ]
    },
    {
        servidor: 'Pedro Costa',
        cpf: '111.222.333-44',
        idade: 52,
        cargo: 'Auditor Fiscal',
        lotacao: 'SUTRI',
        superintendencia: 'SUPER-1',
        urgencia: 'alta',
        proximaLicenca: new Date('2025-12-01'),
        mesesLicenca: 3,
        licencas: [
            { inicio: new Date('2025-12-01'), fim: new Date('2026-02-28'), meses: 3 }
        ]
    }
];

const mockApp = {};

// Criar instâncias dos managers (reutilizadas em todos os testes)
const dataManager = new DataStateManager();
const filterStateManager = new FilterStateManager();
const uiManager = new UIStateManager();
const filterManager = new FilterManager(mockApp);
const searchManager = new SearchManager(mockApp);
const reportsManager = new ReportsManager(mockApp);

// ==================== TESTES DE INTEGRAÇÃO ====================

test('FLUXO 1: Carregar dados no DataStateManager', () => {
    dataManager.setAllServidores(mockServidores);
    assertEquals(dataManager.getAllServidores().length, 3);
});

test('FLUXO 2: DataState → FilterManager → Filtrar por urgência', () => {
    const filters = { urgencies: ['critica'] };
    const filtered = filterManager.applyFilters(dataManager.getAllServidores(), filters);
    dataManager.setFilteredServidores(filtered);

    assertEquals(dataManager.getFilteredServidores().length, 1);
    assertEquals(dataManager.getFilteredServidores()[0].servidor, 'João Silva');
});

test('FLUXO 3: SearchManager → Buscar por nome', () => {
    const results = searchManager.search('Maria', mockServidores);
    assertEquals(results.length, 1);
    assertEquals(results[0].servidor, 'Maria Santos');
});

test('FLUXO 4: SearchManager → Buscar por CPF', () => {
    const results = searchManager.searchByCPF('123456789', mockServidores);
    assertEquals(results.length, 1);
    assertEquals(results[0].servidor, 'João Silva');
});

test('FLUXO 5: FilterManager + SearchManager (combinado)', () => {
    // 1. Filtrar por cargo
    const filters = { cargos: ['Auditor Fiscal'] };
    const filtered = filterManager.applyFilters(mockServidores, filters);

    // 2. Buscar dentro dos filtrados
    const searched = searchManager.search('João', filtered);

    assertEquals(searched.length, 1);
    assertEquals(searched[0].servidor, 'João Silva');
});

test('FLUXO 6: DataStateManager notifica mudanças', () => {
    let notificationReceived = false;
    let notificationData = null;

    const unsubscribe = dataManager.subscribe('data-loaded', (data) => {
        notificationReceived = true;
        notificationData = data;
    });

    dataManager.setAllServidores(mockServidores);

    assertTrue(notificationReceived);
    assertTrue(notificationData !== null);
    unsubscribe();
});

test('FLUXO 7: FilterStateManager persiste filtros', () => {
    filterStateManager.setFilter('urgencies', ['critica', 'alta']);
    const filters = filterStateManager.getActiveFilters();

    assertEquals(filters.urgencies.length, 2);
    assertTrue(filters.urgencies.includes('critica'));
});

test('FLUXO 8: FilterStateManager valida filtros', () => {
    filterStateManager.setFilter('ageRange', { min: 60, max: 40 });
    const validation = filterStateManager.validateFilters();

    assertEquals(validation.valid, false);
    assertTrue(validation.errors.length > 0);
});

test('FLUXO 9: UIStateManager gerencia modais', () => {
    uiManager.openModal('testModal');
    assertTrue(uiManager.isModalOpen('testModal'));

    uiManager.closeModal('testModal');
    assertEquals(uiManager.isModalOpen('testModal'), false);
});

test('FLUXO 10: UIStateManager gerencia páginas', () => {
    const initialPage = uiManager.getCurrentPage();
    uiManager.setCurrentPage('calendar');

    assertEquals(uiManager.getCurrentPage(), 'calendar');
    assertEquals(uiManager.getPreviousPage(), initialPage);
});

test('FLUXO 11: ReportsManager gera relatório', () => {
    const report = reportsManager.generateReport('urgencias-criticas', mockServidores);

    assertTrue(report.name.includes('Crítica'));
    assertEquals(report.summary.total, 1);
});

test('FLUXO 12: ReportsManager agrupa por lotação', () => {
    const report = reportsManager.generateReport('por-lotacao', mockServidores);

    assertTrue(report.data.length >= 2);
    const sutri = report.data.find(l => l.lotacao === 'SUTRI');
    assertTrue(sutri !== undefined);
    assertEquals(sutri.total, 2);
});

test('FLUXO 13: CENÁRIO COMPLETO - Todo o pipeline', () => {
    // 1. Carregar
    dataManager.setAllServidores(mockServidores);
    assertEquals(dataManager.getAllServidores().length, 3);

    // 2. Filtrar
    filterStateManager.setFilter('urgencies', ['critica', 'alta']);
    const filters = filterStateManager.getActiveFilters();
    const filtered = filterManager.applyFilters(dataManager.getAllServidores(), filters);
    assertEquals(filtered.length, 2);

    // 3. Buscar
    const searched = searchManager.search('Auditor', filtered);
    assertEquals(searched.length, 2);

    // 4. Relatório
    const report = reportsManager._groupBy(searched, 'urgencia');
    assertTrue(report['critica'].length === 1);
    assertTrue(report['alta'].length === 1);

    console.log('    ✓ Pipeline completo OK!');
});

test('FLUXO 14: Managers lidam com array vazio', () => {
    const filtered = filterManager.applyFilters([], { urgencies: ['critica'] });
    assertEquals(filtered.length, 0);

    const searched = searchManager.search('teste', []);
    assertEquals(searched.length, 0);
});

test('FLUXO 15: Managers lidam com dados null', () => {
    const dataWithNulls = [
        { servidor: 'Teste', cpf: null, cargo: undefined, urgencia: null }
    ];

    const results = searchManager.search('Teste', dataWithNulls);
    assertEquals(results.length, 1);
});

test('FLUXO 16: Múltiplos filtros combinados', () => {
    const filters = {
        urgencies: ['critica', 'alta'],
        cargos: ['Auditor Fiscal'],
        ageRange: { min: 50, max: 60 }
    };

    const filtered = filterManager.applyFilters(mockServidores, filters);

    assertTrue(filtered.length >= 1);
    filtered.forEach(s => {
        assertTrue(['critica', 'alta'].includes(s.urgencia));
        assertEquals(s.cargo, 'Auditor Fiscal');
        assertTrue(s.idade >= 50 && s.idade <= 60);
    });
});

// ==================== RESUMO ====================
console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO DOS TESTES DE INTEGRAÇÃO');
console.log('='.repeat(70));
console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passou: ${passedTests}`);
console.log(`❌ Falhou: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(70));

if (failedTests === 0) {
    console.log('\n🎉 TODOS OS TESTES DE INTEGRAÇÃO PASSARAM!');
    console.log('✅ O fluxo de dados entre managers está funcionando corretamente!');
    console.log('✅ Dados chegam aos managers sem bugs ou erros!\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} teste(s) de integração falharam\n`);
    process.exit(1);
}
