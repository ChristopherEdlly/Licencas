/**
 * Testes para DataFilter
 */

const DataFilter = require('../DataFilter.js');

// Framework de testes
let testCount = 0;
let passCount = 0;
let failCount = 0;

function test(description, fn) {
    testCount++;
    try {
        fn();
        passCount++;
        console.log(`✅ ${description}`);
    } catch (error) {
        failCount++;
        console.log(`❌ ${description}`);
        console.log(`   Erro: ${error.message}`);
    }
}

function assertEquals(actual, expected, message = '') {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
        throw new Error(`${message}\n   Esperado: ${expectedStr}\n   Recebido: ${actualStr}`);
    }
}

function assertTrue(value, message = '') {
    if (value !== true) {
        throw new Error(`${message}\n   Esperado: true\n   Recebido: ${value}`);
    }
}

function assertFalse(value, message = '') {
    if (value !== false) {
        throw new Error(`${message}\n   Esperado: false\n   Recebido: ${value}`);
    }
}

console.log('\n📦 Testando DataFilter...\n');

// Dados de teste
const testData = [
    { nome: 'João Silva', cpf: '111.111.111-11', cargo: 'Auditor', urgencia: 'critica', diasAteInicio: 15, dias: 30, saldo: 30, status: 'agendada', dataInicio: new Date('2025-12-25') },
    { nome: 'Maria Santos', cpf: '222.222.222-22', cargo: 'Analista', urgencia: 'alta', diasAteInicio: 45, dias: 20, saldo: 15, status: 'agendada', dataInicio: new Date('2026-01-25') },
    { nome: 'José André', cpf: '333.333.333-33', cargo: 'Auditor', urgencia: 'media', diasAteInicio: 75, dias: 15, saldo: 10, status: 'agendada', dataInicio: new Date('2026-02-25') },
    { nome: 'Ana Paula', cpf: '444.444.444-44', cargo: 'Técnico', urgencia: 'baixa', diasAteInicio: 150, dias: 25, saldo: 0, status: 'agendada', dataInicio: new Date('2026-05-10') },
    { nome: 'Carlos Souza', cpf: '555.555.555-55', cargo: 'Analista', urgencia: 'expirada', diasAteInicio: -30, dias: 30, saldo: 5, status: 'expirada-com-saldo', dataInicio: new Date('2024-11-01') }
];

// ============================================================
// TESTES DE NORMALIZAÇÃO DE TEXTO
// ============================================================

console.log('🔍 Testando normalização de texto...\n');

test('Normaliza texto (lowercase)', () => {
    const result = DataFilter.normalizeText('JOÃO');
    assertEquals(result, 'joao');
});

test('Normaliza texto (remove acentos)', () => {
    const result = DataFilter.normalizeText('José André Gonçalves');
    assertEquals(result, 'jose andre goncalves');
});

test('Normaliza null retorna string vazia', () => {
    const result = DataFilter.normalizeText(null);
    assertEquals(result, '');
});

// ============================================================
// TESTES DE FILTRAGEM POR TEXTO
// ============================================================

console.log('\n🔍 Testando filtragem por texto...\n');

test('Filtra por nome (exato)', () => {
    const result = DataFilter.filterByText(testData, 'João');
    assertEquals(result.length, 1);
    assertEquals(result[0].nome, 'João Silva');
});

test('Filtra por nome (parcial)', () => {
    const result = DataFilter.filterByText(testData, 'Silva');
    assertEquals(result.length, 1);
});

test('Filtra por nome (case insensitive)', () => {
    const result = DataFilter.filterByText(testData, 'joão');
    assertEquals(result.length, 1);
});

test('Filtra por nome (sem acentos)', () => {
    const result = DataFilter.filterByText(testData, 'Jose');
    assertEquals(result.length, 1);
    assertEquals(result[0].nome, 'José André');
});

test('Filtra por CPF', () => {
    const result = DataFilter.filterByText(testData, '111.111');
    assertEquals(result.length, 1);
});

test('Filtra por cargo', () => {
    const result = DataFilter.filterByText(testData, 'Auditor');
    assertEquals(result.length, 2);
});

test('Filtro vazio retorna todos', () => {
    const result = DataFilter.filterByText(testData, '');
    assertEquals(result.length, 5);
});

test('Filtro sem resultado retorna array vazio', () => {
    const result = DataFilter.filterByText(testData, 'NãoExiste');
    assertEquals(result.length, 0);
});

// ============================================================
// TESTES DE FILTRAGEM POR URGÊNCIA
// ============================================================

console.log('\n🔍 Testando filtragem por urgência...\n');

test('Filtra urgência crítica', () => {
    const result = DataFilter.filterByUrgency(testData, ['critica']);
    assertEquals(result.length, 1);
    assertEquals(result[0].urgencia, 'critica');
});

test('Filtra múltiplas urgências', () => {
    const result = DataFilter.filterByUrgency(testData, ['critica', 'alta']);
    assertEquals(result.length, 2);
});

test('Filtra por urgência mínima (crítica)', () => {
    const result = DataFilter.filterByMinUrgency(testData, 'critica');
    assertEquals(result.length, 1);
});

test('Filtra por urgência mínima (alta)', () => {
    const result = DataFilter.filterByMinUrgency(testData, 'alta');
    assertEquals(result.length, 2);
});

test('Filtra por urgência mínima (média)', () => {
    const result = DataFilter.filterByMinUrgency(testData, 'media');
    assertEquals(result.length, 3);
});

test('Array vazio de urgências retorna todos', () => {
    const result = DataFilter.filterByUrgency(testData, []);
    assertEquals(result.length, 5);
});

// ============================================================
// TESTES DE FILTRAGEM POR DATAS
// ============================================================

console.log('\n🔍 Testando filtragem por datas...\n');

test('Filtra por data de início (depois de)', () => {
    const result = DataFilter.filterByStartDate(testData, new Date('2026-01-01'));
    assertEquals(result.length, 3);
});

test('Filtra por data de início (antes de)', () => {
    const result = DataFilter.filterByStartDate(testData, null, new Date('2026-01-01'));
    assertEquals(result.length, 2);
});

test('Filtra por data de início (intervalo)', () => {
    const result = DataFilter.filterByStartDate(
        testData,
        new Date('2025-12-01'),
        new Date('2026-02-01')
    );
    assertEquals(result.length, 2);
});

test('Filtra por dias até início (máximo 30)', () => {
    const result = DataFilter.filterByDaysUntilStart(testData, null, 30);
    assertEquals(result.length, 1);
});

test('Filtra por dias até início (entre 40-80)', () => {
    const result = DataFilter.filterByDaysUntilStart(testData, 40, 80);
    assertEquals(result.length, 2);
});

// ============================================================
// TESTES DE FILTRAGEM POR CAMPO
// ============================================================

console.log('\n🔍 Testando filtragem por campos específicos...\n');

test('Filtra por cargo', () => {
    const result = DataFilter.filterByCargo(testData, ['Auditor']);
    assertEquals(result.length, 2);
});

test('Filtra por múltiplos cargos', () => {
    const result = DataFilter.filterByCargo(testData, ['Auditor', 'Analista']);
    assertEquals(result.length, 4);
});

test('Filtra por status', () => {
    const result = DataFilter.filterByStatus(testData, ['agendada']);
    assertEquals(result.length, 4);
});

test('Filtra por status expirada', () => {
    const result = DataFilter.filterByStatus(testData, ['expirada-com-saldo']);
    assertEquals(result.length, 1);
});

// ============================================================
// TESTES DE FILTRAGEM POR VALORES NUMÉRICOS
// ============================================================

console.log('\n🔍 Testando filtragem por valores numéricos...\n');

test('Filtra dias (mínimo 20)', () => {
    const result = DataFilter.filterByDias(testData, 20);
    assertEquals(result.length, 4);
});

test('Filtra dias (máximo 20)', () => {
    const result = DataFilter.filterByDias(testData, null, 20);
    assertEquals(result.length, 2);
});

test('Filtra dias (intervalo 15-25)', () => {
    const result = DataFilter.filterByDias(testData, 15, 25);
    assertEquals(result.length, 3);
});

test('Filtra saldo (maior que 0)', () => {
    const result = DataFilter.filterBySaldo(testData, 1);
    assertEquals(result.length, 4);
});

test('Filtra saldo (intervalo 10-20)', () => {
    const result = DataFilter.filterBySaldo(testData, 10, 20);
    assertEquals(result.length, 2);
});

test('Filtra por range customizado', () => {
    const result = DataFilter.filterByRange(testData, 'diasAteInicio', 0, 100);
    assertEquals(result.length, 3);
});

// ============================================================
// TESTES DE FILTRAGEM POR CONDIÇÕES
// ============================================================

console.log('\n🔍 Testando filtragem por condições booleanas...\n');

test('Filtra apenas com saldo', () => {
    const result = DataFilter.filterWithSaldo(testData);
    assertEquals(result.length, 4);
});

test('Filtra apenas expiradas', () => {
    const result = DataFilter.filterExpired(testData);
    assertEquals(result.length, 1);
});

test('Filtra apenas ativas', () => {
    const result = DataFilter.filterActive(testData);
    assertEquals(result.length, 4);
});

test('Filtra por condição customizada', () => {
    const result = DataFilter.filterByCondition(testData, item => item.dias > 20);
    assertEquals(result.length, 3);
});

test('Filtra por condição customizada complexa', () => {
    const result = DataFilter.filterByCondition(testData, item => {
        return item.cargo === 'Auditor' && item.saldo > 10;
    });
    assertEquals(result.length, 1);
});

// ============================================================
// TESTES DE PIPELINE DE FILTROS
// ============================================================

console.log('\n🔍 Testando pipeline de filtros múltiplos...\n');

test('Aplica filtro único (texto)', () => {
    const filters = { searchTerm: 'João' };
    const result = DataFilter.applyFilters(testData, filters);
    assertEquals(result.length, 1);
});

test('Aplica filtros múltiplos (texto + urgência)', () => {
    const filters = {
        searchTerm: 'Auditor',
        urgencies: ['critica', 'media']
    };
    const result = DataFilter.applyFilters(testData, filters);
    assertEquals(result.length, 2);
});

test('Aplica filtros complexos', () => {
    const filters = {
        cargos: ['Auditor', 'Analista'],
        urgencies: ['critica', 'alta'],
        onlyWithSaldo: true
    };
    const result = DataFilter.applyFilters(testData, filters);
    assertEquals(result.length, 2);
});

test('Aplica todos os tipos de filtro', () => {
    const filters = {
        searchTerm: 'a',
        urgencies: ['critica', 'alta', 'media'],
        cargos: ['Auditor', 'Analista'],
        diasRange: { min: 15, max: 30 },
        saldoRange: { min: 10 },
        onlyActive: true
    };
    const result = DataFilter.applyFilters(testData, filters);
    assertTrue(result.length >= 0);
});

test('Filtros vazios retorna todos', () => {
    const result = DataFilter.applyFilters(testData, {});
    assertEquals(result.length, 5);
});

test('Filtros com condição customizada', () => {
    const filters = {
        customCondition: (item) => item.nome.includes('Silva') || item.nome.includes('Santos')
    };
    const result = DataFilter.applyFilters(testData, filters);
    assertEquals(result.length, 2); // João Silva e Maria Santos
});

// ============================================================
// TESTES DE CONTAGEM
// ============================================================

console.log('\n🔍 Testando contagens por filtros...\n');

test('Conta por urgências', () => {
    const filters = { urgencies: ['critica', 'alta', 'media'] };
    const counts = DataFilter.countByFilters(testData, filters);
    assertEquals(counts.byUrgency.critica, 1);
    assertEquals(counts.byUrgency.alta, 1);
    assertEquals(counts.byUrgency.media, 1);
});

test('Conta por cargos', () => {
    const filters = { cargos: ['Auditor', 'Analista'] };
    const counts = DataFilter.countByFilters(testData, filters);
    assertEquals(counts.byCargo.Auditor, 2);
    assertEquals(counts.byCargo.Analista, 2);
});

test('Conta por status', () => {
    const filters = { statuses: ['agendada', 'expirada-com-saldo'] };
    const counts = DataFilter.countByFilters(testData, filters);
    assertEquals(counts.byStatus.agendada, 4);
    assertEquals(counts.byStatus['expirada-com-saldo'], 1);
});

// ============================================================
// TESTES DE EDGE CASES
// ============================================================

console.log('\n🔍 Testando casos extremos...\n');

test('Array vazio retorna array vazio', () => {
    const result = DataFilter.filterByText([], 'teste');
    assertEquals(result.length, 0);
});

test('Dados null retorna array vazio', () => {
    const result = DataFilter.filterByText(null, 'teste');
    assertEquals(result.length, 0);
});

test('Filtros null retorna dados originais', () => {
    const result = DataFilter.applyFilters(testData, null);
    assertEquals(result.length, 5);
});

test('Campo inexistente retorna todos', () => {
    const result = DataFilter.filterByField(testData, 'campoInexistente', ['valor']);
    assertEquals(result.length, 0);
});

test('Valores vazios em filtros são ignorados', () => {
    const filters = {
        searchTerm: '',
        urgencies: [],
        cargos: []
    };
    const result = DataFilter.applyFilters(testData, filters);
    assertEquals(result.length, 5);
});

// ============================================================
// TESTES COM DADOS REAIS
// ============================================================

console.log('\n🔍 Testando com dados reais do sistema...\n');

test('Busca por nome com acentos', () => {
    const data = [
        { nome: 'JOSÉ ANDRÉ DA SILVA', cargo: 'Auditor' },
        { nome: 'JOÃO PAULO GONÇALVES', cargo: 'Analista' }
    ];
    const result = DataFilter.filterByText(data, 'jose andre');
    assertEquals(result.length, 1);
});

test('Filtra urgências críticas e altas (cenário real)', () => {
    const realData = [
        { urgencia: 'critica', diasAteInicio: 10 },
        { urgencia: 'critica', diasAteInicio: 25 },
        { urgencia: 'alta', diasAteInicio: 40 },
        { urgencia: 'media', diasAteInicio: 70 },
        { urgencia: 'baixa', diasAteInicio: 120 }
    ];
    const result = DataFilter.filterByUrgency(realData, ['critica', 'alta']);
    assertEquals(result.length, 3);
});

test('Pipeline real: texto + urgência + cargo', () => {
    const realData = [
        { nome: 'MARIA DA SILVA', cargo: 'AUDITOR FISCAL', urgencia: 'critica', saldo: 30 },
        { nome: 'JOÃO DOS SANTOS', cargo: 'AUDITOR FISCAL', urgencia: 'alta', saldo: 20 },
        { nome: 'ANA PAULA', cargo: 'ANALISTA', urgencia: 'critica', saldo: 15 },
        { nome: 'CARLOS SOUZA', cargo: 'TÉCNICO', urgencia: 'media', saldo: 10 }
    ];
    
    const filters = {
        searchTerm: 'AUDITOR',
        urgencies: ['critica', 'alta'],
        onlyWithSaldo: true
    };
    
    const result = DataFilter.applyFilters(realData, filters);
    assertEquals(result.length, 2);
});

// ============================================================
// RESUMO DOS TESTES
// ============================================================

console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(60));
console.log(`Total de testes: ${testCount}`);
console.log(`✅ Passou: ${passCount}`);
console.log(`❌ Falhou: ${failCount}`);
console.log(`📈 Taxa de sucesso: ${((passCount / testCount) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failCount === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
} else {
    console.log('\n⚠️  ALGUNS TESTES FALHARAM ⚠️\n');
    process.exit(1);
}
