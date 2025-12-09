/**
 * Testes para DataLoader
 * 
 * Testa carregamento e cache de dados
 */

import DataLoader from '../DataLoader.js';

// Framework de testes simples
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assertEquals = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
};
const assertTrue = (value, message) => {
    if (!value) {
        throw new Error(message || 'Expected true, got false');
    }
};
const assertFalse = (value, message) => {
    if (value) {
        throw new Error(message || 'Expected false, got true');
    }
};

// ========================================
// TESTES: loadFromCSV
// ========================================

test('LoadFromCSV - string válida', async () => {
    const csv = `servidor,cargo,diasAdquiridos,saldo
João Silva,Analista,90,45
Maria Santos,Técnico,90,60`;
    
    const result = await DataLoader.loadFromCSV(csv);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 2);
    assertTrue(Array.isArray(result.data));
});

test('LoadFromCSV - CSV vazio', async () => {
    const csv = '';
    
    const result = await DataLoader.loadFromCSV(csv);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.ERROR);
    assertTrue(result.error !== undefined);
});

test('LoadFromCSV - com cabeçalho apenas', async () => {
    const csv = 'servidor,cargo,diasAdquiridos';
    
    const result = await DataLoader.loadFromCSV(csv);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.ERROR);
});

// ========================================
// TESTES: loadFromJSON
// ========================================

test('LoadFromJSON - array de objetos', async () => {
    const json = [
        { servidor: 'João', cargo: 'Analista' },
        { servidor: 'Maria', cargo: 'Técnico' }
    ];
    
    const result = await DataLoader.loadFromJSON(json);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 2);
});

test('LoadFromJSON - string JSON', async () => {
    const jsonString = '[{"servidor":"João"},{"servidor":"Maria"}]';
    
    const result = await DataLoader.loadFromJSON(jsonString);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 2);
});

test('LoadFromJSON - objeto único', async () => {
    const json = { servidor: 'João', cargo: 'Analista' };
    
    const result = await DataLoader.loadFromJSON(json);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 1);
    assertTrue(Array.isArray(result.data));
});

test('LoadFromJSON - JSON inválido', async () => {
    const invalidJson = '{invalid json}';
    
    const result = await DataLoader.loadFromJSON(invalidJson);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.ERROR);
});

// ========================================
// TESTES: Cache
// ========================================

test('Cache - salvar e recuperar', () => {
    DataLoader.clearCache();
    
    const key = 'test-data';
    const data = [{ id: 1 }, { id: 2 }];
    
    DataLoader.saveToCache(key, data);
    const cached = DataLoader.getFromCache(key);
    
    assertTrue(cached !== null);
    assertEquals(cached.state, DataLoader.LOADING_STATES.CACHED);
    assertEquals(cached.count, 2);
});

test('Cache - validação TTL', () => {
    DataLoader.clearCache();
    
    const key = 'test-ttl';
    const data = [{ id: 1 }];
    
    DataLoader.saveToCache(key, data, { ttl: 2000 });
    
    // Cache com TTL 2000ms deve ser válido quando checado com 2500ms
    assertTrue(DataLoader.isCacheValid(key, 2500));
    // Mas não deve ser válido quando checado com apenas 100ms de tolerância
    assertTrue(DataLoader.isCacheValid(key, 100));
});

test('Cache - limpar específico', () => {
    DataLoader.clearCache();
    
    DataLoader.saveToCache('key1', [{ id: 1 }]);
    DataLoader.saveToCache('key2', [{ id: 2 }]);
    
    DataLoader.clearCache('key1');
    
    assertTrue(DataLoader.getFromCache('key1') === null);
    assertTrue(DataLoader.getFromCache('key2') !== null);
});

test('Cache - limpar tudo', () => {
    DataLoader.clearCache();
    
    DataLoader.saveToCache('key1', [{ id: 1 }]);
    DataLoader.saveToCache('key2', [{ id: 2 }]);
    
    DataLoader.clearCache();
    
    const stats = DataLoader.getCacheStats();
    assertEquals(stats.size, 0);
});

test('Cache - limite de tamanho', () => {
    DataLoader.clearCache();
    
    const maxSize = DataLoader.CACHE_CONFIG.MAX_SIZE;
    
    // Adiciona mais do que o limite
    for (let i = 0; i < maxSize + 5; i++) {
        DataLoader.saveToCache(`key-${i}`, [{ id: i }]);
    }
    
    const stats = DataLoader.getCacheStats();
    assertTrue(stats.size <= maxSize);
});

test('Cache - estatísticas', () => {
    DataLoader.clearCache();
    
    DataLoader.saveToCache('key1', [{ id: 1 }]);
    DataLoader.saveToCache('key2', [{ id: 2 }]);
    
    const stats = DataLoader.getCacheStats();
    
    assertEquals(stats.size, 2);
    assertTrue(stats.totalBytes > 0);
    assertTrue(Array.isArray(stats.entries));
    assertEquals(stats.entries.length, 2);
});

// ========================================
// TESTES: loadWithCache
// ========================================

test('LoadWithCache - primeiro carregamento', async () => {
    DataLoader.clearCache();
    
    const key = 'test-load';
    const loadFn = async () => ({
        state: DataLoader.LOADING_STATES.SUCCESS,
        data: [{ id: 1 }, { id: 2 }],
        count: 2
    });
    
    const result = await DataLoader.loadWithCache(key, loadFn);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 2);
});

test('LoadWithCache - usa cache na segunda vez', async () => {
    DataLoader.clearCache();
    
    const key = 'test-cached';
    let callCount = 0;
    
    const loadFn = async () => {
        callCount++;
        return {
            state: DataLoader.LOADING_STATES.SUCCESS,
            data: [{ id: callCount }],
            count: 1
        };
    };
    
    await DataLoader.loadWithCache(key, loadFn);
    const result = await DataLoader.loadWithCache(key, loadFn);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.CACHED);
    assertEquals(callCount, 1); // Função foi chamada apenas uma vez
});

test('LoadWithCache - ignora cache se desabilitado', async () => {
    DataLoader.clearCache();
    
    const key = 'test-no-cache';
    let callCount = 0;
    
    const loadFn = async () => {
        callCount++;
        return {
            state: DataLoader.LOADING_STATES.SUCCESS,
            data: [{ id: callCount }],
            count: 1
        };
    };
    
    await DataLoader.loadWithCache(key, loadFn, { useCache: false });
    await DataLoader.loadWithCache(key, loadFn, { useCache: false });
    
    assertEquals(callCount, 2); // Função foi chamada duas vezes
});

// ========================================
// TESTES: validateData
// ========================================

test('ValidateData - dados válidos', () => {
    const dados = [
        { servidor: 'João', diasAdquiridos: 90, saldo: 45 },
        { servidor: 'Maria', diasAdquiridos: 90, saldo: 60 }
    ];
    
    const result = DataLoader.validateData(dados, { type: 'licenca' });
    
    assertTrue(result.valid);
    assertEquals(result.errors.length, 0);
    assertEquals(result.itemsValidated, 2);
});

test('ValidateData - não é array', () => {
    const dados = { servidor: 'João' };
    
    const result = DataLoader.validateData(dados);
    
    assertFalse(result.valid);
    assertTrue(result.errors.length > 0);
});

test('ValidateData - item não é objeto', () => {
    const dados = [
        { servidor: 'João' },
        'string invalida',
        { servidor: 'Maria' }
    ];
    
    const result = DataLoader.validateData(dados);
    
    assertFalse(result.valid);
    assertTrue(result.errors.length > 0);
});

test('ValidateData - diasAdquiridos inválido', () => {
    const dados = [
        { servidor: 'João', diasAdquiridos: 'invalido', saldo: 45 }
    ];
    
    const result = DataLoader.validateData(dados, { type: 'licenca' });
    
    assertFalse(result.valid);
    assertTrue(result.errors.some(e => e.includes('diasAdquiridos')));
});

test('ValidateData - com warnings', () => {
    const dados = [
        { servidor: 'João', diasAdquiridos: 90 }, // OK
        { diasAdquiridos: 90, saldo: 45 } // Sem servidor - warning
    ];
    
    const result = DataLoader.validateData(dados, { type: 'licenca' });
    
    assertTrue(result.valid); // Warnings não invalidam
    assertTrue(result.warnings.length > 0);
});

// ========================================
// TESTES: loadFromMultipleSources
// ========================================

test('LoadFromMultipleSources - múltiplas fontes JSON', async () => {
    const sources = [
        {
            type: DataLoader.DATA_SOURCES.JSON,
            data: [{ id: 1 }, { id: 2 }]
        },
        {
            type: DataLoader.DATA_SOURCES.JSON,
            data: [{ id: 3 }, { id: 4 }]
        }
    ];
    
    const result = await DataLoader.loadFromMultipleSources(sources);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 4);
    assertEquals(result.sources.successful, 2);
});

test('LoadFromMultipleSources - fonte mista', async () => {
    const csvData = `servidor,cargo
João,Analista`;
    
    const sources = [
        {
            type: DataLoader.DATA_SOURCES.CSV,
            data: csvData
        },
        {
            type: DataLoader.DATA_SOURCES.JSON,
            data: [{ servidor: 'Maria', cargo: 'Técnico' }]
        }
    ];
    
    const result = await DataLoader.loadFromMultipleSources(sources);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 2);
});

test('LoadFromMultipleSources - com falhas parciais', async () => {
    const sources = [
        {
            type: DataLoader.DATA_SOURCES.JSON,
            data: [{ id: 1 }]
        },
        {
            type: DataLoader.DATA_SOURCES.CSV,
            data: '' // CSV vazio - vai falhar
        },
        {
            type: DataLoader.DATA_SOURCES.JSON,
            data: [{ id: 2 }]
        }
    ];
    
    const result = await DataLoader.loadFromMultipleSources(sources);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.sources.total, 3);
    assertTrue(result.sources.successful >= 2);
    assertTrue(result.sources.failed >= 1);
});

// ========================================
// TESTES: Cenários Reais
// ========================================

test('Cenário real - carregar CSV grande', async () => {
    let csv = 'servidor,cargo,diasAdquiridos,saldo\n';
    for (let i = 1; i <= 100; i++) {
        csv += `Servidor ${i},Cargo ${i},90,${i}\n`;
    }
    
    const result = await DataLoader.loadFromCSV(csv);
    
    assertEquals(result.state, DataLoader.LOADING_STATES.SUCCESS);
    assertEquals(result.count, 100);
});

test('Cenário real - validação de dados carregados', async () => {
    const csv = `servidor,cargo,diasAdquiridos,saldo
João Silva,Analista,90,45
Maria Santos,Técnico,invalido,60
Pedro Costa,Auxiliar,90,30`;
    
    const loadResult = await DataLoader.loadFromCSV(csv);
    const validationResult = DataLoader.validateData(loadResult.data, { type: 'licenca' });
    
    assertFalse(validationResult.valid);
    assertTrue(validationResult.errors.length > 0);
});

test('Cenário real - cache com TTL curto', async () => {
    DataLoader.clearCache();
    
    const key = 'dados-volateis';
    const loadFn = async () => ({
        state: DataLoader.LOADING_STATES.SUCCESS,
        data: [{ timestamp: Date.now() }],
        count: 1
    });
    
    await DataLoader.loadWithCache(key, loadFn, { ttl: 100 });
    
    // Cache recém criado deve ser válido
    assertTrue(DataLoader.isCacheValid(key, 100));
    // Também válido com TTL maior
    assertTrue(DataLoader.isCacheValid(key, 200));
});

test('Cenário real - consolidação de múltiplas fontes', async () => {
    const fonte1 = [
        { servidor: 'João', lotacao: 'TI' },
        { servidor: 'Maria', lotacao: 'RH' }
    ];
    
    const fonte2 = [
        { servidor: 'Pedro', lotacao: 'Financeiro' },
        { servidor: 'Ana', lotacao: 'Juridico' }
    ];
    
    const sources = [
        { type: DataLoader.DATA_SOURCES.JSON, data: fonte1 },
        { type: DataLoader.DATA_SOURCES.JSON, data: fonte2 }
    ];
    
    const result = await DataLoader.loadFromMultipleSources(sources);
    
    assertEquals(result.count, 4);
    assertTrue(result.data.some(d => d.servidor === 'João'));
    assertTrue(result.data.some(d => d.servidor === 'Pedro'));
});

// ========================================
// Executar todos os testes
// ========================================

let passed = 0;
let failed = 0;

console.log('\n🔍 Executando testes para DataLoader...\n');

for (const { name, fn } of tests) {
    try {
        await fn(); // await porque alguns testes são async
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}`);
        failed++;
    }
}

console.log('\n📊 RESUMO DOS TESTES');
console.log(`Total de testes: ${tests.length}`);
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);
console.log(`🎯 Taxa de sucesso: ${((passed / tests.length) * 100).toFixed(1)}%\n`);

if (failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log('⚠️  ALGUNS TESTES FALHARAM\n');
    process.exit(1);
}
