/**
 * Testes do CronogramaParser - Parse de Cronogramas Brasileiros
 * Execute: node js/1-core/data-flow/__tests__/CronogramaParser.test.js
 */

const CronogramaParser = require('../CronogramaParser.js');

console.log('🧪 Iniciando testes do CronogramaParser\n');
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

function assertNotNull(value, message = '') {
    if (value === null || value === undefined) {
        throw new Error(message || 'Valor não deveria ser null');
    }
}

function assertNull(value, message = '') {
    if (value !== null) {
        throw new Error(message || `Esperado null, recebido: ${value}`);
    }
}

function assertTrue(value, message = '') {
    if (!value) {
        throw new Error(message || 'Esperado valor verdadeiro');
    }
}

function assertDateEquals(actual, expected, message = '') {
    if (!actual || !expected) {
        throw new Error(`Data null: actual=${actual}, expected=${expected}`);
    }
    if (actual.getTime() !== expected.getTime()) {
        throw new Error(`Datas diferentes: ${actual.toISOString()} !== ${expected.toISOString()}${message ? ' (' + message + ')' : ''}`);
    }
}

// Criar instância do parser
const parser = new CronogramaParser();

// ==================== TESTES DE NORMALIZAÇÃO ====================

test('normalizeMonthKey - deve remover acentos e pontuação', () => {
    assertEquals(parser.normalizeMonthKey('março'), 'marco');
    assertEquals(parser.normalizeMonthKey('Fevereiro.'), 'fevereiro');
    assertEquals(parser.normalizeMonthKey('  JAN  '), 'jan');
});

test('normalizeKey - deve converter para uppercase e remover acentos', () => {
    assertEquals(parser.normalizeKey('lotação'), 'LOTACAO');
    assertEquals(parser.normalizeKey('Início'), 'INICIO');
    assertEquals(parser.normalizeKey('  cargo  '), 'CARGO');
});

// ==================== TESTES DE PARSING DE MÊS ====================

test('parseMesTexto - deve parsear mês abreviado', () => {
    assertEquals(parser.parseMesTexto('jan'), 1);
    assertEquals(parser.parseMesTexto('fev'), 2);
    assertEquals(parser.parseMesTexto('dez'), 12);
});

test('parseMesTexto - deve parsear mês completo', () => {
    assertEquals(parser.parseMesTexto('janeiro'), 1);
    assertEquals(parser.parseMesTexto('março'), 3);
    assertEquals(parser.parseMesTexto('dezembro'), 12);
});

test('parseMesTexto - deve ser case-insensitive', () => {
    assertEquals(parser.parseMesTexto('JAN'), 1);
    assertEquals(parser.parseMesTexto('FEV'), 2);
    assertEquals(parser.parseMesTexto('MARÇO'), 3);
});

test('parseMesTexto - deve retornar null para mês inválido', () => {
    assertNull(parser.parseMesTexto('xyz'));
    assertNull(parser.parseMesTexto(''));
    assertNull(parser.parseMesTexto(null));
});

// ==================== TESTES DE PARSING DE DATA ====================

test('parseDate - formato DD/MM/YYYY', () => {
    const data = parser.parseDate('15/01/2025');
    assertNotNull(data);
    assertDateEquals(data, new Date(2025, 0, 15));
});

test('parseDate - formato MM/YYYY (dia 1 por padrão)', () => {
    const data = parser.parseDate('06/2025');
    assertNotNull(data);
    assertDateEquals(data, new Date(2025, 5, 1), 'Deve ser dia 1 de junho');
});

test('parseDate - formato jan/2025 (mês texto/ano)', () => {
    const data = parser.parseDate('jan/2025');
    assertNotNull(data);
    assertDateEquals(data, new Date(2025, 0, 1), 'Deve ser dia 1 de janeiro');
});

test('parseDate - formato fev/2026 (mês texto/ano)', () => {
    const data = parser.parseDate('fev/2026');
    assertNotNull(data);
    assertDateEquals(data, new Date(2026, 1, 1), 'Deve ser dia 1 de fevereiro');
});

test('parseDate - formato jan-25 (mês-ano abreviado)', () => {
    const data = parser.parseDate('jan-25');
    assertNotNull(data);
    assertDateEquals(data, new Date(2025, 0, 1));
});

test('parseDate - formato fev-25 (mês-ano abreviado)', () => {
    const data = parser.parseDate('fev-25');
    assertNotNull(data);
    assertDateEquals(data, new Date(2025, 1, 1));
});

test('parseDate - formato ISO YYYY-MM-DD', () => {
    const data = parser.parseDate('2025-03-15');
    assertNotNull(data);
    assertDateEquals(data, new Date(2025, 2, 15));
});

test('parseDate - deve retornar null para data inválida', () => {
    assertNull(parser.parseDate('32/13/2025'));
    assertNull(parser.parseDate('abc/xyz'));
    assertNull(parser.parseDate(''));
    assertNull(parser.parseDate(null));
});

test('parseDate - deve validar dias do mês corretamente', () => {
    assertNull(parser.parseDate('31/02/2025'), 'Fevereiro não tem 31 dias');
    assertNull(parser.parseDate('30/02/2025'), 'Fevereiro não tem 30 dias');
    assertNotNull(parser.parseDate('28/02/2025'), 'Fevereiro tem 28 dias');
});

test('parseDate - deve tratar ano bissexto', () => {
    assertNotNull(parser.parseDate('29/02/2024'), '2024 é bissexto');
    assertNull(parser.parseDate('29/02/2025'), '2025 não é bissexto');
});

test('parseDate - deve aceitar diferentes formatos de mês texto', () => {
    assertNotNull(parser.parseDate('março/2025'));
    assertNotNull(parser.parseDate('MARÇO/2025'));
    assertNotNull(parser.parseDate('marco/2025'), 'Deve aceitar sem acento');
});

// ==================== TESTES DE FORMATAÇÃO ====================

test('formatDateBR - deve formatar data no formato brasileiro', () => {
    const data = new Date(2025, 0, 15);
    assertEquals(parser.formatDateBR(data), '15/01/2025');
});

test('formatDateBR - deve adicionar zeros à esquerda', () => {
    const data = new Date(2025, 0, 5); // Dia 5
    assertEquals(parser.formatDateBR(data), '05/01/2025');
});

test('formatDateBR - deve retornar string vazia para data inválida', () => {
    assertEquals(parser.formatDateBR(null), '');
    assertEquals(parser.formatDateBR(new Date('invalid')), '');
});

// ==================== TESTES DE ADIÇÃO DE MESES ====================

test('adicionarMeses - deve adicionar 3 meses (90 dias)', () => {
    const inicio = new Date(2025, 0, 1); // 01/01/2025
    const fim = parser.adicionarMeses(inicio, 3);
    // 3 meses = 90 dias -> 01/04/2025
    assertDateEquals(fim, new Date(2025, 3, 1));
});

test('adicionarMeses - deve adicionar 1 mês (30 dias)', () => {
    const inicio = new Date(2025, 0, 1); // 01/01/2025
    const fim = parser.adicionarMeses(inicio, 1);
    // 1 mês = 30 dias -> 31/01/2025
    assertDateEquals(fim, new Date(2025, 0, 31));
});

test('adicionarMeses - deve atravessar ano', () => {
    const inicio = new Date(2025, 11, 15); // 15/12/2025
    const fim = parser.adicionarMeses(inicio, 1);
    // 30 dias depois -> 14/01/2026
    assertDateEquals(fim, new Date(2026, 0, 14));
});

// ==================== TESTES DE PARSING DE CRONOGRAMA ====================

test('parseCronograma - formato "jan/2025 - mar/2025"', () => {
    const licencas = parser.parseCronograma('jan/2025 - mar/2025');

    assertEquals(licencas.length, 1);
    assertEquals(licencas[0].tipo, 'periodo-explicito');
    assertDateEquals(licencas[0].inicio, new Date(2025, 0, 1));
    assertDateEquals(licencas[0].fim, new Date(2025, 2, 1));
});

test('parseCronograma - formato "15/01/2025 - 14/02/2025"', () => {
    const licencas = parser.parseCronograma('15/01/2025 - 14/02/2025');

    assertEquals(licencas.length, 1);
    assertEquals(licencas[0].tipo, 'periodo-explicito');
    assertDateEquals(licencas[0].inicio, new Date(2025, 0, 15));
    assertDateEquals(licencas[0].fim, new Date(2025, 1, 14));
});

test('parseCronograma - data única "jan/2025" (inferir 3 meses)', () => {
    const licencas = parser.parseCronograma('jan/2025', 3);

    assertEquals(licencas.length, 1);
    assertEquals(licencas[0].tipo, 'data-unica');
    assertEquals(licencas[0].meses, 3);
    assertDateEquals(licencas[0].inicio, new Date(2025, 0, 1));
});

test('parseCronograma - data única "15/01/2025" (inferir 3 meses)', () => {
    const licencas = parser.parseCronograma('15/01/2025', 3);

    assertEquals(licencas.length, 1);
    assertEquals(licencas[0].tipo, 'data-unica');
    assertEquals(licencas[0].meses, 3);
    assertDateEquals(licencas[0].inicio, new Date(2025, 0, 15));
});

test('parseCronograma - formato "3 meses a partir de jan/2025"', () => {
    const licencas = parser.parseCronograma('3 meses a partir de jan/2025');

    assertEquals(licencas.length, 1);
    assertEquals(licencas[0].tipo, 'meses-explícitos');
    assertEquals(licencas[0].meses, 3);
    assertDateEquals(licencas[0].inicio, new Date(2025, 0, 1));
});

test('parseCronograma - formato "2 meses em fev/2025"', () => {
    const licencas = parser.parseCronograma('2 meses em fev/2025');

    assertEquals(licencas.length, 1);
    assertEquals(licencas[0].meses, 2);
    assertDateEquals(licencas[0].inicio, new Date(2025, 1, 1));
});

test('parseCronograma - deve retornar array vazio para texto não parseável', () => {
    const licencas = parser.parseCronograma('texto qualquer sem datas');
    assertEquals(licencas.length, 0);
});

test('parseCronograma - deve retornar array vazio para string vazia', () => {
    const licencas = parser.parseCronograma('');
    assertEquals(licencas.length, 0);
});

test('parseCronograma - deve retornar array vazio para null', () => {
    const licencas = parser.parseCronograma(null);
    assertEquals(licencas.length, 0);
});

// ==================== TESTES DE EXTRAÇÃO DE CAMPOS ====================

test('getField - deve encontrar campo com nome exato', () => {
    const dados = { SERVIDOR: 'João Silva', CARGO: 'Auditor' };
    assertEquals(parser.getField(dados, 'SERVIDOR'), 'João Silva');
    assertEquals(parser.getField(dados, 'CARGO'), 'Auditor');
});

test('getField - deve ser case-insensitive', () => {
    const dados = { servidor: 'João Silva' };
    assertEquals(parser.getField(dados, 'SERVIDOR'), 'João Silva');
    assertEquals(parser.getField(dados, 'Servidor'), 'João Silva');
});

test('getField - deve ignorar acentos', () => {
    const dados = { LOTAÇÃO: 'SUTRI' };
    assertEquals(parser.getField(dados, 'LOTACAO'), 'SUTRI');
    assertEquals(parser.getField(dados, 'lotação'), 'SUTRI');
});

test('getField - deve aceitar array de nomes alternativos', () => {
    const dados = { NOME: 'Maria Santos' };
    assertEquals(parser.getField(dados, ['SERVIDOR', 'NOME']), 'Maria Santos');
});

test('getField - deve tentar match aproximado', () => {
    const dados = { 'INICIO DE LICENCA PREMIO': '01/2025' };
    assertEquals(parser.getField(dados, 'INICIO'), '01/2025');
});

test('getField - deve retornar string vazia para campo não encontrado', () => {
    const dados = { SERVIDOR: 'João' };
    assertEquals(parser.getField(dados, 'CPF'), '');
});

// ==================== TESTES DE MÉTODOS ESTÁTICOS ====================

test('extractNome - deve extrair nome do servidor', () => {
    const dados = { SERVIDOR: 'Pedro Costa' };
    assertEquals(CronogramaParser.extractNome(dados), 'Pedro Costa');
});

test('extractNome - deve aceitar campo NOME como alternativa', () => {
    const dados = { NOME: 'Ana Lima' };
    assertEquals(CronogramaParser.extractNome(dados), 'Ana Lima');
});

test('extractLotacao - deve extrair lotação', () => {
    const dados = { LOTACAO: 'SUTRI' };
    assertEquals(CronogramaParser.extractLotacao(dados), 'SUTRI');
});

test('extractCargo - deve extrair cargo', () => {
    const dados = { CARGO: 'Analista' };
    assertEquals(CronogramaParser.extractCargo(dados), 'Analista');
});

test('extractPeriodo - deve extrair período com INICIO e FINAL', () => {
    const dados = { INICIO: 'jan/2025', FINAL: 'mar/2025' };
    const periodo = CronogramaParser.extractPeriodo(dados);
    assertEquals(periodo.inicio, 'jan/2025');
    assertEquals(periodo.fim, 'mar/2025');
});

test('extractPeriodo - deve usar CRONOGRAMA se INICIO/FINAL não existirem', () => {
    const dados = { CRONOGRAMA: 'fev/2025 - abr/2025' };
    const periodo = CronogramaParser.extractPeriodo(dados);
    assertEquals(periodo.inicio, 'fev/2025 - abr/2025');
    assertEquals(periodo.fim, '');
});

// ==================== TESTES DE PARSING DE LINHA CSV ====================

test('parseLinha - deve parsear linha CSV simples', () => {
    const linha = 'João Silva,Auditor,SUTRI';
    const headers = ['SERVIDOR', 'CARGO', 'LOTACAO'];
    const dados = parser.parseLinha(linha, headers);

    assertEquals(dados.SERVIDOR, 'João Silva');
    assertEquals(dados.CARGO, 'Auditor');
    assertEquals(dados.LOTACAO, 'SUTRI');
});

test('parseLinha - deve suportar vírgulas dentro de aspas', () => {
    const linha = '"Silva, João","Auditor Fiscal",SUTRI';
    const headers = ['SERVIDOR', 'CARGO', 'LOTACAO'];
    const dados = parser.parseLinha(linha, headers);

    assertEquals(dados.SERVIDOR, 'Silva, João');
    assertEquals(dados.CARGO, 'Auditor Fiscal');
});

test('parseLinha - deve tratar campos vazios', () => {
    const linha = 'João Silva,,SUTRI';
    const headers = ['SERVIDOR', 'CARGO', 'LOTACAO'];
    const dados = parser.parseLinha(linha, headers);

    assertEquals(dados.SERVIDOR, 'João Silva');
    assertEquals(dados.CARGO, '');
    assertEquals(dados.LOTACAO, 'SUTRI');
});

test('parseLinha - deve ignorar colunas extras sem header', () => {
    const linha = 'João Silva,Auditor,SUTRI,Extra';
    const headers = ['SERVIDOR', 'CARGO', 'LOTACAO'];
    const dados = parser.parseLinha(linha, headers);

    assertEquals(dados.SERVIDOR, 'João Silva');
    assertEquals(dados.CARGO, 'Auditor');
    assertEquals(dados.LOTACAO, 'SUTRI');
    assertTrue(!dados.hasOwnProperty('Extra'));
});

// ==================== TESTES DE EDGE CASES ====================

test('parseDate - deve lidar com espaços extras', () => {
    const data = parser.parseDate('  jan/2025  ');
    assertNotNull(data);
    assertDateEquals(data, new Date(2025, 0, 1));
});

test('parseCronograma - deve lidar com espaços extras em períodos', () => {
    const licencas = parser.parseCronograma('  jan/2025   -   mar/2025  ');
    assertEquals(licencas.length, 1);
});

test('getField - deve retornar string vazia para dados null', () => {
    assertEquals(parser.getField(null, 'SERVIDOR'), '');
});

test('parseDate - deve validar anos realistas (1900-2100)', () => {
    assertNull(parser.parseDate('01/01/1899'));
    assertNotNull(parser.parseDate('01/01/1900'));
    assertNotNull(parser.parseDate('01/01/2100'));
    assertNull(parser.parseDate('01/01/2101'));
});

// ==================== RESUMO ====================

console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO DOS TESTES - CronogramaParser');
console.log('='.repeat(70));
console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passou: ${passedTests}`);
console.log(`❌ Falhou: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(70));

if (failedTests === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} teste(s) falharam\n`);
    process.exit(1);
}
