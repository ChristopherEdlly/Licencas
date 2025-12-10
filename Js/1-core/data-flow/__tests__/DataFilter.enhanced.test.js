/**
 * Testes Avançados do DataFilter - Períodos, Ranges e Combinações
 * Execute: node js/1-core/data-flow/__tests__/DataFilter.enhanced.test.js
 *
 * Foco: Testes detalhados de filtragem por períodos, ranges numéricos,
 * e combinações complexas de filtros
 */

const DataFilter = require('../DataFilter.js');

console.log('🧪 Iniciando Testes Avançados do DataFilter\n');
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

function assertArrayContains(array, value, message = '') {
    if (!Array.isArray(array)) {
        throw new Error('Primeiro argumento não é um array');
    }
    if (!array.includes(value)) {
        throw new Error(message || `Array não contém: ${value}`);
    }
}

function assertArrayNotContains(array, value, message = '') {
    if (!Array.isArray(array)) {
        throw new Error('Primeiro argumento não é um array');
    }
    if (array.includes(value)) {
        throw new Error(message || `Array não deveria conter: ${value}`);
    }
}

// ==================== DADOS FICTÍCIOS COMPLEXOS ====================

const servidoresComplexos = [
    {
        nome: 'João Silva',
        cpf: '123.456.789-00',
        cargo: 'Auditor Fiscal',
        lotacao: 'SUTRI',
        superintendencia: 'SUPER-1',
        subsecretaria: 'SUBSEC-A',
        idade: 58,
        urgencia: 'critica',
        dataInicio: new Date('2025-01-15'),
        dataFim: new Date('2025-04-15'),
        diasAteInicio: 45,
        mesesLicenca: 3,
        anoAdmissao: 1990
    },
    {
        nome: 'Maria Santos',
        cpf: '987.654.321-00',
        cargo: 'Analista Fazendário',
        lotacao: 'SUCON',
        superintendencia: 'SUPER-2',
        subsecretaria: 'SUBSEC-B',
        idade: 45,
        urgencia: 'baixa',
        dataInicio: new Date('2027-06-01'),
        dataFim: new Date('2027-08-01'),
        diasAteInicio: 900,
        mesesLicenca: 2,
        anoAdmissao: 2000
    },
    {
        nome: 'Pedro Costa',
        cpf: '111.222.333-44',
        cargo: 'Auditor Fiscal',
        lotacao: 'SUTRI',
        superintendencia: 'SUPER-1',
        subsecretaria: 'SUBSEC-A',
        idade: 52,
        urgencia: 'alta',
        dataInicio: new Date('2025-12-01'),
        dataFim: new Date('2026-03-01'),
        diasAteInicio: 365,
        mesesLicenca: 3,
        anoAdmissao: 1995
    },
    {
        nome: 'Ana Lima',
        cpf: '555.666.777-88',
        cargo: 'Gestor Fazendário',
        lotacao: 'GESEF',
        superintendencia: 'SUPER-3',
        subsecretaria: 'SUBSEC-C',
        idade: 60,
        urgencia: 'critica',
        dataInicio: new Date('2025-02-01'),
        dataFim: new Date('2025-07-01'),
        diasAteInicio: 60,
        mesesLicenca: 5,
        anoAdmissao: 1988
    },
    {
        nome: 'Carlos Mendes',
        cpf: '999.888.777-66',
        cargo: 'Analista Fazendário',
        lotacao: 'SUCON',
        superintendencia: 'SUPER-2',
        subsecretaria: 'SUBSEC-B',
        idade: 48,
        urgencia: 'media',
        dataInicio: new Date('2026-03-15'),
        dataFim: new Date('2026-06-15'),
        diasAteInicio: 450,
        mesesLicenca: 3,
        anoAdmissao: 1998
    },
    {
        nome: 'Lucia Ferreira',
        cpf: '444.555.666-77',
        cargo: 'Auditor Fiscal',
        lotacao: 'SUTRI',
        superintendencia: 'SUPER-1',
        subsecretaria: 'SUBSEC-A',
        idade: 55,
        urgencia: 'alta',
        dataInicio: new Date('2025-06-01'),
        dataFim: new Date('2025-09-01'),
        diasAteInicio: 150,
        mesesLicenca: 3,
        anoAdmissao: 1992
    }
];

// ==================== TESTES DE FILTRAGEM POR PERÍODO ====================

test('filterByStartDate - deve filtrar por data de início exata', () => {
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        new Date('2025-01-15'),
        new Date('2025-01-15')
    );

    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].nome, 'João Silva');
});

test('filterByStartDate - deve filtrar por período amplo', () => {
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        new Date('2025-01-01'),
        new Date('2025-12-31')
    );

    // João, Pedro, Ana, Lucia iniciam em 2025
    assertEquals(filtered.length, 4);
});

test('filterByStartDate - deve filtrar com apenas data inicial (>=)', () => {
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        new Date('2026-01-01'),
        null
    );

    // Carlos e Maria iniciam em 2026 ou depois
    assertEquals(filtered.length, 2);
});

test('filterByStartDate - deve filtrar com apenas data final (<=)', () => {
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        null,
        new Date('2025-06-30')
    );

    // João, Ana, Lucia iniciam até 30/06/2025
    assertEquals(filtered.length, 3);
});

test('filterByEndDate - deve filtrar por data de fim no período', () => {
    const filtered = DataFilter.filterByEndDate(
        servidoresComplexos,
        new Date('2025-01-01'),
        new Date('2025-12-31')
    );

    // João, Ana, Lucia terminam em 2025
    assertEquals(filtered.length, 3);
});

test('filterByDaysUntilStart - deve filtrar por dias até início (range)', () => {
    const filtered = DataFilter.filterByDaysUntilStart(
        servidoresComplexos,
        30,
        100
    );

    // João (45 dias) e Ana (60 dias)
    assertEquals(filtered.length, 2);
});

test('filterByDaysUntilStart - deve filtrar por dias mínimos', () => {
    const filtered = DataFilter.filterByDaysUntilStart(
        servidoresComplexos,
        400,
        undefined
    );

    // Carlos (450 dias) e Maria (900 dias)
    assertEquals(filtered.length, 2);
});

test('filterByDaysUntilStart - deve filtrar por dias máximos', () => {
    const filtered = DataFilter.filterByDaysUntilStart(
        servidoresComplexos,
        null,
        100
    );

    // João (45 dias) e Ana (60 dias)
    assertEquals(filtered.length, 2);
});

// ==================== TESTES DE FILTRAGEM POR RANGE NUMÉRICO ====================

test('filterByRange - deve filtrar por idade exata', () => {
    const filtered = DataFilter.filterByRange(
        servidoresComplexos,
        'idade',
        58,
        58
    );

    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].nome, 'João Silva');
});

test('filterByRange - deve filtrar por faixa etária ampla', () => {
    const filtered = DataFilter.filterByRange(
        servidoresComplexos,
        'idade',
        50,
        60
    );

    // João (58), Pedro (52), Ana (60), Lucia (55)
    assertEquals(filtered.length, 4);
});

test('filterByRange - deve filtrar com apenas idade mínima', () => {
    const filtered = DataFilter.filterByRange(
        servidoresComplexos,
        'idade',
        55,
        undefined
    );

    // João (58), Ana (60), Lucia (55)
    assertEquals(filtered.length, 3);
});

test('filterByRange - deve filtrar com apenas idade máxima', () => {
    const filtered = DataFilter.filterByRange(
        servidoresComplexos,
        'idade',
        null,
        50
    );

    // Maria (45), Carlos (48)
    assertEquals(filtered.length, 2);
});

test('filterByRange - deve filtrar meses de licença', () => {
    const filtered = DataFilter.filterByRange(
        servidoresComplexos,
        'mesesLicenca',
        3,
        5
    );

    // Todos com 3, 4 ou 5 meses
    assertTrue(filtered.length >= 5);
});

test('filterByRange - deve filtrar ano de admissão', () => {
    const filtered = DataFilter.filterByRange(
        servidoresComplexos,
        'anoAdmissao',
        1990,
        1995
    );

    // João (1990), Pedro (1995), Lucia (1992)
    assertEquals(filtered.length, 3);
});

// ==================== TESTES DE COMBINAÇÃO DE FILTROS ====================

test('Combinação: Urgência + Cargo', () => {
    // Primeiro filtrar por urgência crítica
    let filtered = DataFilter.filterByUrgency(servidoresComplexos, ['critica']);
    // Depois filtrar por cargo Auditor Fiscal
    filtered = DataFilter.filterByCargo(filtered, ['Auditor Fiscal']);

    // Nenhum Auditor Fiscal com urgência crítica (Ana é Gestor, João é Auditor mas...)
    // João Silva é Auditor Fiscal + Crítica
    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].nome, 'João Silva');
});

test('Combinação: Período + Lotação + Urgência', () => {
    // Filtrar por início em 2025
    let filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        new Date('2025-01-01'),
        new Date('2025-12-31')
    );

    // Filtrar por lotação SUTRI
    filtered = DataFilter.filterByLotacao(filtered, ['SUTRI']);

    // Filtrar por urgência alta ou crítica
    filtered = DataFilter.filterByUrgency(filtered, ['alta', 'critica']);

    // João (SUTRI, crítica, 2025), Pedro (SUTRI, alta, 2025), Lucia (SUTRI, alta, 2025)
    assertEquals(filtered.length, 3);
});

test('Combinação: Range de idade + Range de dias', () => {
    // Filtrar por idade entre 50-60
    let filtered = DataFilter.filterByRange(servidoresComplexos, 'idade', 50, 60);

    // Filtrar por dias até início <= 200
    filtered = DataFilter.filterByDaysUntilStart(filtered, null, 200);

    // João (58 anos, 45 dias), Ana (60 anos, 60 dias), Lucia (55 anos, 150 dias)
    assertEquals(filtered.length, 3);
});

test('Combinação: Texto + Cargo + Superintendência', () => {
    // Filtrar por texto "Silva"
    let filtered = DataFilter.filterByText(servidoresComplexos, 'Silva');

    // Filtrar por cargo Auditor Fiscal
    filtered = DataFilter.filterByCargo(filtered, ['Auditor Fiscal']);

    // Filtrar por superintendência SUPER-1
    filtered = DataFilter.filterByField(filtered, 'superintendencia', ['SUPER-1']);

    // João Silva
    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].nome, 'João Silva');
});

// ==================== TESTES DE PERÍODOS SOBREPOSTOS ====================

test('Períodos sobrepostos - Licenças no mesmo trimestre', () => {
    // Filtrar licenças que começam entre jan-mar/2025
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        new Date('2025-01-01'),
        new Date('2025-03-31')
    );

    // João (15/01) e Ana (01/02)
    assertEquals(filtered.length, 2);
});

test('Períodos sobrepostos - Licenças que terminam no mesmo mês', () => {
    // Filtrar licenças que terminam em abril/2025
    const filtered = DataFilter.filterByEndDate(
        servidoresComplexos,
        new Date('2025-04-01'),
        new Date('2025-04-30')
    );

    // João termina em 15/04/2025
    assertEquals(filtered.length, 1);
});

// ==================== TESTES DE EDGE CASES EM PERÍODOS ====================

test('Edge case: Mesmo dia para início e fim', () => {
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        new Date('2025-01-15'),
        new Date('2025-01-15')
    );

    assertEquals(filtered.length, 1);
});

test('Edge case: Período invertido (início > fim) retorna vazio', () => {
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        new Date('2025-12-31'),
        new Date('2025-01-01')
    );

    assertEquals(filtered.length, 0);
});

test('Edge case: Filtrar sem período (null, null) retorna todos', () => {
    const filtered = DataFilter.filterByStartDate(
        servidoresComplexos,
        null,
        null
    );

    assertEquals(filtered.length, servidoresComplexos.length);
});

test('Edge case: Array vazio como input', () => {
    const filtered = DataFilter.filterByStartDate([], new Date(), new Date());
    assertEquals(filtered.length, 0);
});

test('Edge case: Input não é array', () => {
    const filtered = DataFilter.filterByStartDate(null, new Date(), new Date());
    assertEquals(filtered.length, 0);
});

// ==================== TESTES DE URGÊNCIA HIERÁRQUICA ====================

test('filterByMinUrgency - urgência mínima crítica', () => {
    const filtered = DataFilter.filterByMinUrgency(servidoresComplexos, 'critica');

    // Apenas os críticos: João e Ana
    assertEquals(filtered.length, 2);
});

test('filterByMinUrgency - urgência mínima alta', () => {
    const filtered = DataFilter.filterByMinUrgency(servidoresComplexos, 'alta');

    // Críticos + altos: João, Ana, Pedro, Lucia
    assertEquals(filtered.length, 4);
});

test('filterByMinUrgency - urgência mínima media', () => {
    const filtered = DataFilter.filterByMinUrgency(servidoresComplexos, 'media');

    // Críticos + altos + médios: João, Ana, Pedro, Lucia, Carlos
    assertEquals(filtered.length, 5);
});

// ==================== TESTES DE MÚLTIPLOS TERMOS ====================

test('filterByMultipleTerms - múltiplas palavras (AND)', () => {
    // Buscar por "Auditor" E "Fiscal"
    const filtered = DataFilter.filterByMultipleTerms(
        servidoresComplexos,
        ['Auditor', 'Fiscal']
    );

    // João, Pedro, Lucia (todos Auditores Fiscais)
    assertEquals(filtered.length, 3);
});

test('filterByMultipleTerms - busca refinada progressiva', () => {
    // Buscar por "SUTRI" E "alta"
    const filtered = DataFilter.filterByMultipleTerms(
        servidoresComplexos,
        ['SUTRI', 'alta'],
        ['lotacao', 'urgencia']
    );

    // Pedro e Lucia (SUTRI + urgência alta)
    assertEquals(filtered.length, 2);
});

// ==================== TESTES DE HIERARQUIA (SUBSECRETARIA/SUPERINTENDÊNCIA) ====================

test('Filtro hierárquico - Por superintendência', () => {
    const filtered = DataFilter.filterByField(
        servidoresComplexos,
        'superintendencia',
        ['SUPER-1']
    );

    // João, Pedro, Lucia (todos SUTRI/SUPER-1)
    // Ana é GESEF/SUPER-3, não SUPER-1
    assertEquals(filtered.length, 3);
});

test('Filtro hierárquico - Por subsecretaria', () => {
    const filtered = DataFilter.filterByField(
        servidoresComplexos,
        'subsecretaria',
        ['SUBSEC-B']
    );

    // Maria e Carlos
    assertEquals(filtered.length, 2);
});

test('Combinação hierárquica: Superintendência + Cargo', () => {
    let filtered = DataFilter.filterByField(
        servidoresComplexos,
        'superintendencia',
        ['SUPER-1']
    );

    filtered = DataFilter.filterByCargo(filtered, ['Auditor Fiscal']);

    // João, Pedro, Lucia (todos Auditores Fiscais em SUPER-1)
    assertTrue(filtered.length >= 3);
});

// ==================== TESTES DE NORMALIZAÇÃO DE TEXTO ====================

test('Busca com acentos deve encontrar sem acentos', () => {
    const testData = [
        { nome: 'João', cargo: 'Analista' },
        { nome: 'Maria', cargo: 'Técnico' }
    ];

    // Buscar "Joao" sem acento deve encontrar "João"
    const filtered = DataFilter.filterByText(testData, 'Joao');
    assertEquals(filtered.length, 1);
    assertEquals(filtered[0].nome, 'João');
});

test('Busca case-insensitive', () => {
    const filtered = DataFilter.filterByText(
        servidoresComplexos,
        'AUDITOR'
    );

    // Deve encontrar "Auditor Fiscal" (case-insensitive)
    assertEquals(filtered.length, 3);
});

test('Busca parcial no texto', () => {
    const filtered = DataFilter.filterByText(
        servidoresComplexos,
        'Faz'
    );

    // Deve encontrar "Analista Fazendário" e "Gestor Fazendário"
    assertEquals(filtered.length, 3);
});

// ==================== TESTES DE PERFORMANCE COM MUITOS DADOS ====================

test('Performance: Filtrar 100 registros por período', () => {
    // Criar array grande
    const bigArray = [];
    for (let i = 0; i < 100; i++) {
        bigArray.push({
            nome: `Servidor ${i}`,
            dataInicio: new Date(2025, 0, i % 30 + 1),
            dataFim: new Date(2025, 3, i % 30 + 1)
        });
    }

    const start = Date.now();
    const filtered = DataFilter.filterByStartDate(
        bigArray,
        new Date('2025-01-10'),
        new Date('2025-01-20')
    );
    const duration = Date.now() - start;

    // Deve ser rápido (< 100ms)
    assertTrue(duration < 100, `Duração: ${duration}ms`);
    assertTrue(filtered.length > 0);
});

// ==================== RESUMO ====================

console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO DOS TESTES AVANÇADOS - DataFilter');
console.log('='.repeat(70));
console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passou: ${passedTests}`);
console.log(`❌ Falhou: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(70));

if (failedTests === 0) {
    console.log('\n🎉 TODOS OS TESTES AVANÇADOS PASSARAM! 🎉');
    console.log('✅ Filtragem por períodos funcionando corretamente');
    console.log('✅ Filtragem por ranges numéricos funcionando corretamente');
    console.log('✅ Combinações de filtros funcionando corretamente\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} teste(s) falharam\n`);
    process.exit(1);
}
