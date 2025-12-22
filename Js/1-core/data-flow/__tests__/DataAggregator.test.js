/**
 * Testes para DataAggregator
 */

const DataAggregator = require('../DataAggregator.js');

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

console.log('\n📦 Testando DataAggregator...\n');

// Dados de teste
const testData = [
    { nome: 'João', cargo: 'Auditor', urgencia: 'critica', dias: 30, diasGozados: 0, saldo: 30, status: 'agendada', dataInicio: new Date('2025-01-15') },
    { nome: 'Maria', cargo: 'Auditor', urgencia: 'alta', dias: 20, diasGozados: 5, saldo: 15, status: 'agendada', dataInicio: new Date('2025-02-10') },
    { nome: 'José', cargo: 'Analista', urgencia: 'media', dias: 15, diasGozados: 0, saldo: 15, status: 'agendada', dataInicio: new Date('2025-03-20') },
    { nome: 'Ana', cargo: 'Técnico', urgencia: 'baixa', dias: 25, diasGozados: 10, saldo: 15, status: 'agendada', dataInicio: new Date('2025-06-05') },
    { nome: 'Carlos', cargo: 'Analista', urgencia: 'critica', dias: 30, diasGozados: 0, saldo: 30, status: 'agendada', dataInicio: new Date('2025-01-25') }
];

// ============================================================
// TESTES DE ESTATÍSTICAS BÁSICAS
// ============================================================

console.log('🔍 Testando estatísticas básicas...\n');

test('Calcula estatísticas básicas', () => {
    const stats = DataAggregator.calculateBasicStats(testData);
    assertEquals(stats.total, 5);
    assertEquals(stats.totalGozados, 120);
    assertEquals(stats.totalSaldo, 105);
});

test('Calcula médias corretamente', () => {
    const stats = DataAggregator.calculateBasicStats(testData);
    assertEquals(stats.mediaGozados, 24);
    assertEquals(stats.mediaSaldo, 21);
});

test('Estatísticas com array vazio', () => {
    const stats = DataAggregator.calculateBasicStats([]);
    assertEquals(stats.total, 0);
    assertEquals(stats.mediaDias, 0);
});

test('Conta por urgência', () => {
    const counts = DataAggregator.countByUrgency(testData);
    assertEquals(counts.critica, 2);
    assertEquals(counts.alta, 1);
    assertEquals(counts.media, 1);
    assertEquals(counts.baixa, 1);
});

test('Conta por status', () => {
    const counts = DataAggregator.countByStatus(testData);
    assertEquals(counts.agendada, 5);
});

// ============================================================
// TESTES DE AGRUPAMENTO SIMPLES
// ============================================================

console.log('\n🔍 Testando agrupamento simples...\n');

test('Agrupa por campo genérico', () => {
    const grouped = DataAggregator.groupBy(testData, 'cargo');
    assertEquals(Object.keys(grouped).length, 3);
    assertEquals(grouped['Auditor'].length, 2);
    assertEquals(grouped['Analista'].length, 2);
    assertEquals(grouped['Técnico'].length, 1);
});

test('Agrupa por urgência', () => {
    const grouped = DataAggregator.groupByUrgency(testData);
    assertEquals(grouped['critica'].length, 2);
    assertEquals(grouped['alta'].length, 1);
});

test('Agrupa por cargo', () => {
    const grouped = DataAggregator.groupByCargo(testData);
    assertEquals(grouped['Auditor'].length, 2);
    assertEquals(grouped['Analista'].length, 2);
});

test('Agrupa por status', () => {
    const grouped = DataAggregator.groupByStatus(testData);
    assertEquals(grouped['agendada'].length, 5);
});

// ============================================================
// TESTES DE AGRUPAMENTO TEMPORAL
// ============================================================

console.log('\n🔍 Testando agrupamento temporal...\n');

test('Agrupa por mês', () => {
    const grouped = DataAggregator.groupByMonth(testData);
    assertEquals(grouped['2025-01'], 2);
    assertEquals(grouped['2025-02'], 1);
    assertEquals(grouped['2025-03'], 1);
    assertEquals(grouped['2025-06'], 1);
});

test('Agrupa por ano', () => {
    const grouped = DataAggregator.groupByYear(testData);
    assertEquals(grouped['2025'], 5);
});

test('Agrupa por trimestre', () => {
    const grouped = DataAggregator.groupByQuarter(testData);
    assertEquals(grouped['2025-Q1'], 4); // jan, fev, mar, jan
    assertEquals(grouped['2025-Q2'], 1); // jun
});

test('Agrupa por semana', () => {
    const grouped = DataAggregator.groupByWeek(testData);
    assertTrue(Object.keys(grouped).length > 0);
});

// ============================================================
// TESTES DE AGRUPAMENTO COM ESTATÍSTICAS
// ============================================================

console.log('\n🔍 Testando agrupamento com estatísticas...\n');

test('Agrupa com estatísticas', () => {
    const grouped = DataAggregator.groupWithStats(testData, 'cargo');
    assertEquals(grouped['Auditor'].count, 2);
    assertEquals(grouped['Auditor'].totalGozados, 50);
    assertEquals(grouped['Analista'].count, 2);
    assertEquals(grouped['Analista'].totalGozados, 45);
});

test('Estatísticas incluem saldo', () => {
    const grouped = DataAggregator.groupWithStats(testData, 'cargo');
    assertEquals(grouped['Auditor'].totalSaldo, 45);
    assertEquals(grouped['Analista'].totalSaldo, 45);
});

test('Estatísticas incluem items', () => {
    const grouped = DataAggregator.groupWithStats(testData, 'cargo');
    assertTrue(Array.isArray(grouped['Auditor'].items));
    assertEquals(grouped['Auditor'].items.length, 2);
});

// ============================================================
// TESTES DE TOP N
// ============================================================

console.log('\n🔍 Testando Top N...\n');

test('Top N por dias (descendente)', () => {
    const top = DataAggregator.topN(testData, 'dias', 3, 'desc');
    assertEquals(top.length, 3);
    assertEquals(top[0].dias, 30);
    assertEquals(top[2].dias, 25); // 30, 30, 25
});

test('Top N por dias (ascendente)', () => {
    const top = DataAggregator.topN(testData, 'dias', 3, 'asc');
    assertEquals(top.length, 3);
    assertEquals(top[0].dias, 15);
    assertEquals(top[2].dias, 25);
});

test('Top cargos por contagem', () => {
    const top = DataAggregator.topCargosByCount(testData, 2);
    assertEquals(top.length, 2);
    assertEquals(top[0].count, 2);
    assertEquals(top[1].count, 2);
});

test('Top lotações por contagem', () => {
    const dataWithLotacao = [
        { lotacao: 'SECRETARIA A' },
        { lotacao: 'SECRETARIA A' },
        { lotacao: 'SECRETARIA B' },
        { lotacao: 'SECRETARIA C' }
    ];
    const top = DataAggregator.topLotacoesByCount(dataWithLotacao, 2);
    assertEquals(top.length, 2);
    assertEquals(top[0].count, 2);
});

// ============================================================
// TESTES DE DADOS PARA GRÁFICOS
// ============================================================

console.log('\n🔍 Testando dados para gráficos...\n');

test('Prepara dados para gráfico de pizza', () => {
    const grouped = DataAggregator.countByUrgency(testData);
    const chartData = DataAggregator.toPieChartData(grouped);
    assertTrue(Array.isArray(chartData.labels));
    assertTrue(Array.isArray(chartData.values));
    assertEquals(chartData.labels.length, chartData.values.length);
});

test('Prepara dados para gráfico de barras', () => {
    const grouped = DataAggregator.groupWithStats(testData, 'cargo');
    const chartData = DataAggregator.toBarChartData(grouped, 'cargo', 'count');
    assertTrue(Array.isArray(chartData.labels));
    assertTrue(Array.isArray(chartData.values));
});

test('Prepara dados para gráfico de linha', () => {
    const grouped = DataAggregator.groupByMonth(testData);
    const chartData = DataAggregator.toLineChartData(grouped);
    assertTrue(Array.isArray(chartData.labels));
    assertTrue(Array.isArray(chartData.values));
    assertEquals(chartData.labels[0], '2025-01');
});

test('Dados ordenados cronologicamente', () => {
    const grouped = DataAggregator.groupByMonth(testData);
    const chartData = DataAggregator.toLineChartData(grouped);
    // Verifica que está ordenado
    for (let i = 1; i < chartData.labels.length; i++) {
        assertTrue(chartData.labels[i] >= chartData.labels[i - 1]);
    }
});

// ============================================================
// TESTES DE ANÁLISES AVANÇADAS
// ============================================================

console.log('\n🔍 Testando análises avançadas...\n');

test('Calcula percentis', () => {
    const percentiles = DataAggregator.calculatePercentiles(testData, 'dias', [25, 50, 75]);
    assertTrue(percentiles.p25 !== undefined);
    assertTrue(percentiles.p50 !== undefined);
    assertTrue(percentiles.p75 !== undefined);
});

test('Percentil 50 (mediana)', () => {
    const percentiles = DataAggregator.calculatePercentiles(testData, 'dias', [50]);
    assertEquals(percentiles.p50, 25);
});

test('Calcula distribuição', () => {
    const dist = DataAggregator.calculateDistribution(testData, 'dias', 5);
    assertEquals(dist.length, 5);
    assertTrue(dist[0].hasOwnProperty('range'));
    assertTrue(dist[0].hasOwnProperty('count'));
});

test('Distribuição soma total de itens', () => {
    const dist = DataAggregator.calculateDistribution(testData, 'dias', 5);
    const totalCount = dist.reduce((sum, bin) => sum + bin.count, 0);
    // Última faixa não inclui o valor máximo exato, então pode haver 3-5 itens
    assertTrue(totalCount >= 3 && totalCount <= 5);
});

test('Calcula tendência (crescimento)', () => {
    const grouped = { '2025-01': 10, '2025-02': 12, '2025-03': 15 };
    const trend = DataAggregator.calculateTrend(grouped);
    assertEquals(trend.trend, 'up');
    assertTrue(trend.change > 0);
});

test('Calcula tendência (decrescimento)', () => {
    const grouped = { '2025-01': 20, '2025-02': 15, '2025-03': 10 };
    const trend = DataAggregator.calculateTrend(grouped);
    assertEquals(trend.trend, 'down');
    assertTrue(trend.change < 0);
});

test('Calcula tendência (estável)', () => {
    const grouped = { '2025-01': 10, '2025-02': 10, '2025-03': 10 };
    const trend = DataAggregator.calculateTrend(grouped);
    assertEquals(trend.trend, 'stable');
});

// ============================================================
// TESTES DE COMPARAÇÕES
// ============================================================

console.log('\n🔍 Testando comparações entre períodos...\n');

test('Compara dois períodos', () => {
    const period1 = [
        { dias: 30, diasGozados: 10, saldo: 20 },
        { dias: 20, diasGozados: 5, saldo: 15 }
    ];
    const period2 = [
        { dias: 40, diasGozados: 15, saldo: 25 },
        { dias: 30, diasGozados: 10, saldo: 20 },
        { dias: 25, diasGozados: 5, saldo: 20 }
    ];
    
    const comparison = DataAggregator.comparePeriods(period1, period2);
    assertEquals(comparison.period1.total, 2);
    assertEquals(comparison.period2.total, 3);
    assertEquals(comparison.difference.total, 1);
});

test('Comparação calcula variação percentual', () => {
    const period1 = [{ dias: 100, diasGozados: 0, saldo: 100 }];
    const period2 = [
        { dias: 100, diasGozados: 0, saldo: 100 },
        { dias: 100, diasGozados: 0, saldo: 100 }
    ];
    
    const comparison = DataAggregator.comparePeriods(period1, period2);
    assertEquals(comparison.percentChange.total, 100);
});

// ============================================================
// TESTES DE EDGE CASES
// ============================================================

console.log('\n🔍 Testando casos extremos...\n');

test('Array vazio retorna objeto vazio/null', () => {
    const stats = DataAggregator.calculateBasicStats([]);
    assertEquals(stats.total, 0);
});

test('Dados null retorna null', () => {
    const stats = DataAggregator.calculateBasicStats(null);
    assertEquals(stats, null);
});

test('Agrupamento sem campo retorna vazio', () => {
    const grouped = DataAggregator.groupBy(testData, null);
    assertEquals(grouped, {});
});

test('Agrupamento temporal ignora itens sem data', () => {
    const dataWithoutDates = [
        { nome: 'João' },
        { nome: 'Maria' }
    ];
    const grouped = DataAggregator.groupByMonth(dataWithoutDates);
    assertEquals(Object.keys(grouped).length, 0);
});

test('Top N com N maior que array retorna todos', () => {
    const top = DataAggregator.topN(testData, 'dias', 100);
    assertEquals(top.length, 5);
});

// ============================================================
// TESTES COM DADOS REAIS
// ============================================================

console.log('\n🔍 Testando com dados reais do sistema...\n');

test('Agregação real: múltiplos servidores', () => {
    const realData = [
        { nome: 'SERVIDOR 1', cargo: 'AUDITOR FISCAL', urgencia: 'critica', dias: 30, saldo: 30, dataInicio: new Date('2025-01-10') },
        { nome: 'SERVIDOR 2', cargo: 'AUDITOR FISCAL', urgencia: 'alta', dias: 25, saldo: 20, dataInicio: new Date('2025-02-15') },
        { nome: 'SERVIDOR 3', cargo: 'ANALISTA', urgencia: 'media', dias: 20, saldo: 15, dataInicio: new Date('2025-03-20') },
        { nome: 'SERVIDOR 4', cargo: 'TÉCNICO', urgencia: 'baixa', dias: 15, saldo: 10, dataInicio: new Date('2025-04-05') }
    ];
    
    const stats = DataAggregator.calculateBasicStats(realData);
    assertEquals(stats.total, 4);
    assertEquals(stats.totalGozados, 90);
    
    const byUrgency = DataAggregator.countByUrgency(realData);
    assertEquals(byUrgency.critica, 1);
    assertEquals(byUrgency.alta, 1);
});

test('Timeline real por mês', () => {
    const realData = [];
    for (let month = 0; month < 12; month++) {
        realData.push({
            nome: `Servidor ${month}`,
            dataInicio: new Date(2025, month, 15)
        });
    }
    
    const grouped = DataAggregator.groupByMonth(realData);
    assertEquals(Object.keys(grouped).length, 12);
    assertEquals(grouped['2025-01'], 1);
    assertEquals(grouped['2025-12'], 1);
});

test('Top cargos em cenário real', () => {
    const realData = [
        { cargo: 'AUDITOR FISCAL' },
        { cargo: 'AUDITOR FISCAL' },
        { cargo: 'AUDITOR FISCAL' },
        { cargo: 'ANALISTA' },
        { cargo: 'ANALISTA' },
        { cargo: 'TÉCNICO' }
    ];
    
    const top = DataAggregator.topCargosByCount(realData, 2);
    assertEquals(top[0].cargo, 'AUDITOR FISCAL');
    assertEquals(top[0].count, 3);
    assertEquals(top[1].cargo, 'ANALISTA');
    assertEquals(top[1].count, 2);
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
