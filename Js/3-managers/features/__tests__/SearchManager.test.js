/**
 * Teste para SearchManager
 * Execute: node js/3-managers/features/__tests__/SearchManager.test.js
 */

const SearchManager = require('../SearchManager.js');

console.log('🧪 Iniciando testes do SearchManager\n');
console.log('='.repeat(60));

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

function assertFalse(value, message = '') {
    if (value) {
        throw new Error(message || 'Esperado valor falso');
    }
}

// Mock de app
const mockApp = {};

// ==================== TESTES ====================

test('Construtor - deve criar instância', () => {
    const manager = new SearchManager(mockApp);
    assertTrue(manager instanceof SearchManager);
});

test('Construtor - deve inicializar com query vazia', () => {
    const manager = new SearchManager(mockApp);
    assertEquals(manager.currentQuery, '');
});

test('Construtor - deve ter campos pesquisáveis padrão', () => {
    const manager = new SearchManager(mockApp);
    assertTrue(manager.searchableFields.length > 0);
    assertTrue(manager.searchableFields.includes('servidor'));
    assertTrue(manager.searchableFields.includes('cpf'));
});

test('search - deve retornar todos os dados para query vazia', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'João Silva', cargo: 'Auditor' },
        { servidor: 'Maria Santos', cargo: 'Analista' }
    ];

    const result = manager.search('', data);
    assertEquals(result.length, 2);
});

test('search - deve encontrar match exato', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'João Silva', cargo: 'Auditor' },
        { servidor: 'Maria Santos', cargo: 'Analista' }
    ];

    const result = manager.search('João', data);
    assertEquals(result.length, 1);
    assertEquals(result[0].servidor, 'João Silva');
});

test('search - deve ser case-insensitive', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'João Silva', cargo: 'Auditor' }
    ];

    const result = manager.search('joão', data);
    assertEquals(result.length, 1);
});

test('search - deve ignorar acentos', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'José da Silva', cargo: 'Auditor' }
    ];

    const result = manager.search('Jose', data);
    assertEquals(result.length, 1);
});

test('search - deve buscar em múltiplos campos', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'João Silva', cargo: 'Auditor', lotacao: 'SUTRI' },
        { servidor: 'Maria Santos', cargo: 'Analista', lotacao: 'SUCON' }
    ];

    const result = manager.search('SUTRI', data);
    assertEquals(result.length, 1);
    assertEquals(result[0].servidor, 'João Silva');
});

test('searchByField - deve buscar em campo específico', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'João Silva', cargo: 'Auditor' },
        { servidor: 'Maria Santos', cargo: 'Analista' }
    ];

    const result = manager.searchByField('cargo', 'Auditor', data);
    assertEquals(result.length, 1);
    assertEquals(result[0].cargo, 'Auditor');
});

test('searchByCPF - deve remover formatação', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'João Silva', cpf: '123.456.789-00' },
        { servidor: 'Maria Santos', cpf: '987.654.321-00' }
    ];

    const result = manager.searchByCPF('123456789', data);
    assertEquals(result.length, 1);
    assertEquals(result[0].servidor, 'João Silva');
});

test('searchByName - deve buscar por nome', () => {
    const manager = new SearchManager(mockApp);
    const data = [
        { servidor: 'João Silva' },
        { servidor: 'Maria Santos' }
    ];

    const result = manager.searchByName('Maria', data);
    assertEquals(result.length, 1);
});

test('getHistory - deve retornar histórico vazio inicialmente', () => {
    const manager = new SearchManager(mockApp);
    const history = manager.getHistory();
    assertTrue(Array.isArray(history));
});

test('clearHistory - deve limpar histórico', () => {
    const manager = new SearchManager(mockApp);
    manager.search('teste', [{ servidor: 'João' }]);
    manager.clearHistory();
    assertEquals(manager.getHistory().length, 0);
});

test('getSuggestions - deve retornar array', () => {
    const manager = new SearchManager(mockApp);
    const data = [{ servidor: 'João Silva' }];
    const suggestions = manager.getSuggestions('João', data, 5);
    assertTrue(Array.isArray(suggestions));
});

test('setOptions - deve atualizar opções', () => {
    const manager = new SearchManager(mockApp);
    manager.setOptions({ maxResults: 50 });
    assertEquals(manager.options.maxResults, 50);
});

test('getOptions - deve retornar opções', () => {
    const manager = new SearchManager(mockApp);
    const options = manager.getOptions();
    assertTrue(options.hasOwnProperty('fuzzyThreshold'));
    assertTrue(options.hasOwnProperty('maxResults'));
});

test('setSearchableFields - deve atualizar campos', () => {
    const manager = new SearchManager(mockApp);
    manager.setSearchableFields(['servidor', 'cpf']);
    assertEquals(manager.searchableFields.length, 2);
});

test('getSearchableFields - deve retornar campos', () => {
    const manager = new SearchManager(mockApp);
    const fields = manager.getSearchableFields();
    assertTrue(Array.isArray(fields));
    assertTrue(fields.length > 0);
});

test('getCurrentQuery - deve retornar query atual', () => {
    const manager = new SearchManager(mockApp);
    manager.search('teste', [{ servidor: 'João' }]);
    assertEquals(manager.getCurrentQuery(), 'teste');
});

test('clearCurrentQuery - deve limpar query', () => {
    const manager = new SearchManager(mockApp);
    manager.search('teste', [{ servidor: 'João' }]);
    manager.clearCurrentQuery();
    assertEquals(manager.getCurrentQuery(), '');
});

test('_calculateSimilarity - deve retornar 1.0 para strings iguais', () => {
    const manager = new SearchManager(mockApp);
    const score = manager._calculateSimilarity('test', 'test');
    assertEquals(score, 1.0);
});

test('_calculateSimilarity - deve retornar 0.0 para string vazia', () => {
    const manager = new SearchManager(mockApp);
    const score = manager._calculateSimilarity('', 'test');
    assertEquals(score, 0.0);
});

test('_levenshteinDistance - deve calcular distância correta', () => {
    const manager = new SearchManager(mockApp);
    const distance = manager._levenshteinDistance('kitten', 'sitting');
    assertEquals(distance, 3);
});

test('getDebugInfo - deve retornar informações de debug', () => {
    const manager = new SearchManager(mockApp);
    const info = manager.getDebugInfo();
    assertTrue(info.hasOwnProperty('currentQuery'));
    assertTrue(info.hasOwnProperty('historySize'));
});

// ==================== RESUMO ====================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES - SearchManager');
console.log('='.repeat(60));
console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passou: ${passedTests}`);
console.log(`❌ Falhou: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(60));

if (failedTests === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} teste(s) falharam\n`);
    process.exit(1);
}
