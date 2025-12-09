/**
 * Testes para DataTransformer
 */

const DataTransformer = require('../DataTransformer.js');

// Framework de testes simples
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

function assertExists(value, message = '') {
    if (value === null || value === undefined) {
        throw new Error(`${message}\n   Valor não deveria ser null/undefined`);
    }
}

console.log('\n📦 Testando DataTransformer...\n');

// ============================================================
// TESTES DE PARSE DE PERÍODOS
// ============================================================

console.log('🔍 Testando parse de períodos...\n');

test('Parse período completo (jan/2025 a dez/2025)', () => {
    const result = DataTransformer.parsePeriodoDates('jan/2025 a dez/2025');
    assertExists(result);
    assertExists(result.dataInicio);
    assertExists(result.dataFim);
    assertEquals(result.dataInicio.getMonth(), 0); // Janeiro
    assertEquals(result.dataFim.getMonth(), 11); // Dezembro
});

test('Parse período único (mar/2024)', () => {
    const result = DataTransformer.parsePeriodoDates('mar/2024');
    assertExists(result);
    assertEquals(result.dataInicio.getMonth(), 2); // Março
    assertEquals(result.dataFim.getMonth(), 2); // Março
});

test('Parse período case insensitive', () => {
    const result = DataTransformer.parsePeriodoDates('JAN/2025 a DEZ/2025');
    assertExists(result);
});

test('Parse período inválido retorna null', () => {
    const result = DataTransformer.parsePeriodoDates('período inválido');
    assertEquals(result, null);
});

// ============================================================
// TESTES DE CÁLCULO DE URGÊNCIA
// ============================================================

console.log('\n🔍 Testando cálculo de urgência...\n');

test('Urgência crítica (30 dias ou menos)', () => {
    const licenca = { diasAteInicio: 20 };
    const urgencia = DataTransformer.calculateUrgencia(licenca);
    assertEquals(urgencia, 'critica');
});

test('Urgência alta (31-60 dias)', () => {
    const licenca = { diasAteInicio: 45 };
    const urgencia = DataTransformer.calculateUrgencia(licenca);
    assertEquals(urgencia, 'alta');
});

test('Urgência média (61-90 dias)', () => {
    const licenca = { diasAteInicio: 75 };
    const urgencia = DataTransformer.calculateUrgencia(licenca);
    assertEquals(urgencia, 'media');
});

test('Urgência baixa (mais de 90 dias)', () => {
    const licenca = { diasAteInicio: 120 };
    const urgencia = DataTransformer.calculateUrgencia(licenca);
    assertEquals(urgencia, 'baixa');
});

test('Em gozo (data início passou, data fim não)', () => {
    const licenca = { diasAteInicio: -10, diasAteFim: 20 };
    const urgencia = DataTransformer.calculateUrgencia(licenca);
    assertEquals(urgencia, 'em-gozo');
});

test('Expirada (ambas as datas passaram)', () => {
    const licenca = { diasAteInicio: -40, diasAteFim: -10 };
    const urgencia = DataTransformer.calculateUrgencia(licenca);
    assertEquals(urgencia, 'expirada');
});

// ============================================================
// TESTES DE CÁLCULO DE STATUS
// ============================================================

console.log('\n🔍 Testando cálculo de status...\n');

test('Status pendente (sem datas)', () => {
    const licenca = {};
    const status = DataTransformer.calculateStatus(licenca);
    assertEquals(status, 'pendente');
});

test('Status agendada (futuro)', () => {
    const futuro = new Date();
    futuro.setDate(futuro.getDate() + 60);
    const licenca = {
        dataInicio: futuro,
        dataFim: new Date(futuro.getTime() + 30 * 24 * 60 * 60 * 1000)
    };
    const status = DataTransformer.calculateStatus(licenca);
    assertEquals(status, 'agendada');
});

test('Status expirada (passado)', () => {
    const passado = new Date('2020-01-01');
    const licenca = {
        dataInicio: passado,
        dataFim: new Date('2020-12-31')
    };
    const status = DataTransformer.calculateStatus(licenca);
    assertEquals(status, 'expirada');
});

test('Status expirada com saldo', () => {
    const passado = new Date('2020-01-01');
    const licenca = {
        dataInicio: passado,
        dataFim: new Date('2020-12-31'),
        saldo: 15
    };
    const status = DataTransformer.calculateStatus(licenca);
    assertEquals(status, 'expirada-com-saldo');
});

// ============================================================
// TESTES DE ENRIQUECIMENTO DE LICENÇA
// ============================================================

console.log('\n🔍 Testando enriquecimento de licença...\n');

test('Enriquece licença básica', () => {
    const licenca = {
        periodo: 'jan/2025 a dez/2025',
        dias: 30,
        diasGozados: 0,
        saldo: 30
    };
    const enriched = DataTransformer.enrichLicenca(licenca);
    assertExists(enriched);
    assertExists(enriched.dataInicio);
    assertExists(enriched.dataFim);
    assertExists(enriched.urgencia);
    assertExists(enriched.status);
    assertExists(enriched.periodoFormatado);
});

test('Enriquecimento calcula percentual de gozo', () => {
    const licenca = {
        periodo: 'jan/2025',
        dias: 30,
        diasGozados: 15
    };
    const enriched = DataTransformer.enrichLicenca(licenca);
    assertEquals(enriched.percentualGozado, 50);
});

test('Enriquecimento com dados nulos', () => {
    const result = DataTransformer.enrichLicenca(null);
    assertEquals(result, null);
});

test('Enriquecimento preserva campos originais', () => {
    const licenca = {
        periodo: 'mar/2024',
        dias: 15,
        cpf: '123.456.789-09',
        nome: 'João Silva'
    };
    const enriched = DataTransformer.enrichLicenca(licenca);
    assertEquals(enriched.cpf, '123.456.789-09');
    assertEquals(enriched.nome, 'João Silva');
});

// ============================================================
// TESTES DE ENRIQUECIMENTO DE SERVIDOR
// ============================================================

console.log('\n🔍 Testando enriquecimento de servidor...\n');

test('Enriquece servidor básico', () => {
    const servidor = {
        cpf: '12345678909',
        nome: 'MARIA DA SILVA',
        telefone: '11987654321'
    };
    const enriched = DataTransformer.enrichServidor(servidor);
    assertExists(enriched.cpfFormatado);
    assertExists(enriched.nomeFormatado);
    assertExists(enriched.telefoneFormatado);
});

test('Enriquecimento calcula estatísticas de licenças', () => {
    const servidor = {
        cpf: '123',
        nome: 'João',
        licencas: [
            { dias: 30, diasGozados: 10, saldo: 20 },
            { dias: 20, diasGozados: 5, saldo: 15 }
        ]
    };
    const enriched = DataTransformer.enrichServidor(servidor);
    assertEquals(enriched.totalLicencas, 2);
    assertEquals(enriched.totalDias, 50);
    assertEquals(enriched.totalGozados, 15);
    assertEquals(enriched.totalSaldo, 35);
});

test('Identifica licenças urgentes', () => {
    const servidor = {
        cpf: '123',
        licencas: [
            { urgencia: 'critica' },
            { urgencia: 'baixa' }
        ]
    };
    const enriched = DataTransformer.enrichServidor(servidor);
    assertTrue(enriched.temLicencaUrgente);
});

test('Servidor sem licenças urgentes', () => {
    const servidor = {
        cpf: '123',
        licencas: [
            { urgencia: 'baixa' },
            { urgencia: 'media' }
        ]
    };
    const enriched = DataTransformer.enrichServidor(servidor);
    assertFalse(enriched.temLicencaUrgente);
});

// ============================================================
// TESTES DE AGRUPAMENTO
// ============================================================

console.log('\n🔍 Testando agrupamento de dados...\n');

test('Agrupa licenças por CPF', () => {
    const licencas = [
        { cpf: '111', nome: 'João', periodo: 'jan/2025' },
        { cpf: '111', nome: 'João', periodo: 'fev/2025' },
        { cpf: '222', nome: 'Maria', periodo: 'mar/2025' }
    ];
    const grouped = DataTransformer.groupLicencasByServidor(licencas);
    assertEquals(Object.keys(grouped).length, 2);
    assertEquals(grouped['111'].licencas.length, 2);
    assertEquals(grouped['222'].licencas.length, 1);
});

test('Agrupamento ignora licenças sem CPF', () => {
    const licencas = [
        { cpf: '111', nome: 'João' },
        { nome: 'Sem CPF' },
        { cpf: '222', nome: 'Maria' }
    ];
    const grouped = DataTransformer.groupLicencasByServidor(licencas);
    assertEquals(Object.keys(grouped).length, 2);
});

test('Enriquece servidores com licenças', () => {
    const licencas = [
        { cpf: '111', nome: 'João', periodo: 'jan/2025', dias: 30 },
        { cpf: '111', nome: 'João', periodo: 'fev/2025', dias: 20 }
    ];
    const servidores = DataTransformer.enrichServidoresWithLicencas(licencas);
    assertEquals(servidores.length, 1);
    assertEquals(servidores[0].totalLicencas, 2);
});

// ============================================================
// TESTES DE NORMALIZAÇÃO
// ============================================================

console.log('\n🔍 Testando normalização de dados...\n');

test('Normaliza campos numéricos (string para number)', () => {
    const obj = { dias: '30', valor: '123.45' };
    const normalized = DataTransformer.normalizeNumericFields(obj, ['dias', 'valor']);
    assertEquals(normalized.dias, 30);
    assertEquals(normalized.valor, 123.45);
});

test('Normaliza vírgula decimal', () => {
    const obj = { valor: '123,45' };
    const normalized = DataTransformer.normalizeNumericFields(obj, ['valor']);
    assertEquals(normalized.valor, 123.45);
});

test('Normaliza licença', () => {
    const licenca = { dias: '30', diasGozados: '10', saldo: '20' };
    const normalized = DataTransformer.normalizeLicenca(licenca);
    assertEquals(normalized.dias, 30);
    assertEquals(normalized.diasGozados, 10);
    assertEquals(normalized.saldo, 20);
});

test('Pick mantém apenas campos especificados', () => {
    const obj = { nome: 'João', cpf: '123', idade: 30, cargo: 'Analista' };
    const picked = DataTransformer.pickFields(obj, ['nome', 'cpf']);
    assertEquals(Object.keys(picked).length, 2);
    assertEquals(picked.nome, 'João');
    assertEquals(picked.cpf, '123');
    assertEquals(picked.idade, undefined);
});

test('Omit remove campos especificados', () => {
    const obj = { nome: 'João', cpf: '123', idade: 30 };
    const omitted = DataTransformer.omitFields(obj, ['idade']);
    assertEquals(Object.keys(omitted).length, 2);
    assertEquals(omitted.nome, 'João');
    assertEquals(omitted.idade, undefined);
});

// ============================================================
// TESTES DE TRANSFORMAÇÕES EM LOTE
// ============================================================

console.log('\n🔍 Testando transformações em lote...\n');

test('Transforma array em lote', () => {
    const items = [{ valor: 10 }, { valor: 20 }, { valor: 30 }];
    const transformer = (item) => ({ ...item, dobro: item.valor * 2 });
    const transformed = DataTransformer.transformBatch(items, transformer);
    assertEquals(transformed.length, 3);
    assertEquals(transformed[0].dobro, 20);
});

test('Enriquece licenças em lote', () => {
    const licencas = [
        { periodo: 'jan/2025', dias: 30 },
        { periodo: 'fev/2025', dias: 20 }
    ];
    const enriched = DataTransformer.enrichLicencasBatch(licencas);
    assertEquals(enriched.length, 2);
    assertExists(enriched[0].urgencia);
    assertExists(enriched[1].status);
});

test('Filtra nulls em transformação em lote', () => {
    const items = [{ valid: true }, null, { valid: true }];
    const transformed = DataTransformer.transformBatch(items, item => item);
    assertEquals(transformed.length, 2);
});

// ============================================================
// TESTES DE ORDENAÇÃO
// ============================================================

console.log('\n🔍 Testando ordenação...\n');

test('Cria sorter ascendente', () => {
    const items = [{ valor: 30 }, { valor: 10 }, { valor: 20 }];
    const sorter = DataTransformer.createSorter('valor', 'asc');
    const sorted = items.sort(sorter);
    assertEquals(sorted[0].valor, 10);
    assertEquals(sorted[2].valor, 30);
});

test('Cria sorter descendente', () => {
    const items = [{ valor: 10 }, { valor: 30 }, { valor: 20 }];
    const sorter = DataTransformer.createSorter('valor', 'desc');
    const sorted = items.sort(sorter);
    assertEquals(sorted[0].valor, 30);
    assertEquals(sorted[2].valor, 10);
});

test('Ordena licenças por urgência', () => {
    const licencas = [
        { id: 1, urgencia: 'baixa' },
        { id: 2, urgencia: 'critica' },
        { id: 3, urgencia: 'alta' },
        { id: 4, urgencia: 'media' }
    ];
    const sorted = DataTransformer.sortByUrgencia(licencas);
    assertEquals(sorted[0].urgencia, 'critica');
    assertEquals(sorted[1].urgencia, 'alta');
    assertEquals(sorted[2].urgencia, 'media');
    assertEquals(sorted[3].urgencia, 'baixa');
});

test('Ordenação não modifica array original', () => {
    const licencas = [
        { urgencia: 'baixa' },
        { urgencia: 'critica' }
    ];
    const sorted = DataTransformer.sortByUrgencia(licencas);
    assertEquals(licencas[0].urgencia, 'baixa'); // Original não mudou
    assertEquals(sorted[0].urgencia, 'critica'); // Sorted está ordenado
});

// ============================================================
// TESTES COM DADOS REAIS
// ============================================================

console.log('\n🔍 Testando com dados reais do sistema...\n');

test('Enriquece licença real completa', () => {
    const licenca = {
        cpf: '111.444.777-35',
        nome: 'MARIA DA SILVA SANTOS',
        matricula: '123456',
        cargo: 'ANALISTA',
        lotacao: 'SECRETARIA DE EDUCAÇÃO',
        periodo: 'jan/2025 a dez/2025',
        dias: 30,
        diasGozados: 0,
        saldo: 30
    };
    const enriched = DataTransformer.enrichLicenca(licenca);
    assertExists(enriched.dataInicio);
    assertExists(enriched.urgencia);
    assertExists(enriched.status);
    assertExists(enriched.periodoFormatado);
    assertTrue(enriched.dataInicio instanceof Date);
});

test('Processa múltiplas licenças de um servidor', () => {
    const licencas = [
        {
            cpf: '111.444.777-35',
            nome: 'MARIA SILVA',
            periodo: 'jan/2025 a dez/2025',
            dias: 30,
            saldo: 30
        },
        {
            cpf: '111.444.777-35',
            nome: 'MARIA SILVA',
            periodo: 'jan/2026 a dez/2026',
            dias: 30,
            saldo: 30
        }
    ];
    const servidores = DataTransformer.enrichServidoresWithLicencas(licencas);
    assertEquals(servidores.length, 1);
    assertEquals(servidores[0].totalLicencas, 2);
    assertEquals(servidores[0].totalDias, 60);
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
