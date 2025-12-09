/**
 * Teste para DateUtils
 * Execute: node js/1-core/utilities/__tests__/DateUtils.test.js
 */

const DateUtils = require('../DateUtils.js');

console.log('🧪 Iniciando testes do DateUtils\n');
console.log('='.repeat(60));

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper para testar
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
    if (actual instanceof Date && expected instanceof Date) {
        if (actual.getTime() !== expected.getTime()) {
            throw new Error(`${message}\n  Esperado: ${expected}\n  Recebido: ${actual}`);
        }
    } else if (actual !== expected) {
        throw new Error(`${message}\n  Esperado: ${expected}\n  Recebido: ${actual}`);
    }
}

function assertNull(actual, message = '') {
    if (actual !== null) {
        throw new Error(`${message}\n  Esperado: null\n  Recebido: ${actual}`);
    }
}

// ==================== TESTES DE PARSING ====================
console.log('\n' + '='.repeat(60));
console.log('📅 TESTES DE PARSING DE DATAS');
console.log('='.repeat(60));

test('Parse "jan/2025" deve retornar 01/01/2025', () => {
    const result = DateUtils.parseBrazilianDate('jan/2025');
    const expected = new Date(2025, 0, 1); // Janeiro = mês 0
    assertEquals(result?.getMonth(), expected.getMonth(), 'Mês');
    assertEquals(result?.getFullYear(), expected.getFullYear(), 'Ano');
});

test('Parse "janeiro/2025" deve retornar 01/01/2025', () => {
    const result = DateUtils.parseBrazilianDate('janeiro/2025');
    const expected = new Date(2025, 0, 1);
    assertEquals(result?.getMonth(), expected.getMonth(), 'Mês');
});

test('Parse "fev/2024" deve retornar 01/02/2024', () => {
    const result = DateUtils.parseBrazilianDate('fev/2024');
    assertEquals(result?.getMonth(), 1, 'Mês'); // Fevereiro = 1
    assertEquals(result?.getFullYear(), 2024, 'Ano');
});

test('Parse "12/2025" (número) deve retornar 01/12/2025', () => {
    const result = DateUtils.parseBrazilianDate('12/2025');
    assertEquals(result?.getMonth(), 11, 'Mês'); // Dezembro = 11
    assertEquals(result?.getFullYear(), 2025, 'Ano');
});

test('Parse "15/03/2024" deve retornar 15/03/2024', () => {
    const result = DateUtils.parseBrazilianDate('15/03/2024');
    assertEquals(result?.getDate(), 15, 'Dia');
    assertEquals(result?.getMonth(), 2, 'Mês'); // Março = 2
    assertEquals(result?.getFullYear(), 2024, 'Ano');
});

test('Parse "2024-03-15" (ISO) deve retornar 15/03/2024', () => {
    const result = DateUtils.parseBrazilianDate('2024-03-15');
    assertEquals(result?.getDate(), 15, 'Dia');
    assertEquals(result?.getMonth(), 2, 'Mês');
    assertEquals(result?.getFullYear(), 2024, 'Ano');
});

test('Parse de string inválida deve retornar null', () => {
    const result = DateUtils.parseBrazilianDate('data inválida');
    assertNull(result);
});

test('Parse de null deve retornar null', () => {
    const result = DateUtils.parseBrazilianDate(null);
    assertNull(result);
});

test('Parse de string vazia deve retornar null', () => {
    const result = DateUtils.parseBrazilianDate('');
    assertNull(result);
});

// ==================== TESTES DE FORMATAÇÃO ====================
console.log('\n' + '='.repeat(60));
console.log('📄 TESTES DE FORMATAÇÃO DE DATAS');
console.log('='.repeat(60));

test('Formatar 15/03/2024 em formato curto', () => {
    const date = new Date(2024, 2, 15);
    const result = DateUtils.formatBrazilianDate(date, 'short');
    assertEquals(result, '15/03/2024');
});

test('Formatar 01/01/2025 em formato longo', () => {
    const date = new Date(2025, 0, 1);
    const result = DateUtils.formatBrazilianDate(date, 'long');
    assertEquals(result, '1 de janeiro de 2025');
});

test('Formatar data inválida deve retornar "-"', () => {
    const result = DateUtils.formatBrazilianDate(null);
    assertEquals(result, '-');
});

// ==================== TESTES DE CÁLCULOS ====================
console.log('\n' + '='.repeat(60));
console.log('🧮 TESTES DE CÁLCULOS DE DATAS');
console.log('='.repeat(60));

test('Diferença de dias entre 01/01/2024 e 31/01/2024 deve ser 30', () => {
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 0, 31);
    const result = DateUtils.diffInDays(date1, date2);
    assertEquals(result, 30);
});

test('Diferença de meses entre 01/01/2024 e 01/06/2024 deve ser 5', () => {
    const date1 = new Date(2024, 0, 1);
    const date2 = new Date(2024, 5, 1);
    const result = DateUtils.diffInMonths(date1, date2);
    assertEquals(result, 5);
});

test('Adicionar 10 dias a 01/01/2024 deve resultar em 11/01/2024', () => {
    const date = new Date(2024, 0, 1);
    const result = DateUtils.addDays(date, 10);
    assertEquals(result?.getDate(), 11);
    assertEquals(result?.getMonth(), 0);
});

test('Adicionar 3 meses a 01/01/2024 deve resultar em 01/04/2024', () => {
    const date = new Date(2024, 0, 1);
    const result = DateUtils.addMonths(date, 3);
    assertEquals(result?.getMonth(), 3); // Abril = 3
});

// ==================== TESTES COM DADOS REAIS ====================
console.log('\n' + '='.repeat(60));
console.log('📊 TESTES COM DADOS DO CSV REAL');
console.log('='.repeat(60));

// Simulando dados que vêm do CSV de licenças
const csvDateExamples = [
    { input: 'jan/2025', expected: new Date(2025, 0, 1) },
    { input: 'dez/2024', expected: new Date(2024, 11, 1) },
    { input: '03/2024', expected: new Date(2024, 2, 1) },
    { input: '15/06/2024', expected: new Date(2024, 5, 15) }
];

csvDateExamples.forEach(({ input, expected }, index) => {
    test(`CSV exemplo ${index + 1}: Parse "${input}"`, () => {
        const result = DateUtils.parseBrazilianDate(input);
        assertEquals(result?.getMonth(), expected.getMonth(), `Mês de "${input}"`);
        assertEquals(result?.getFullYear(), expected.getFullYear(), `Ano de "${input}"`);
    });
});

// ==================== RESUMO DOS TESTES ====================
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO DOS TESTES');
console.log('='.repeat(60));
console.log(`Total de testes: ${totalTests}`);
console.log(`✅ Passou: ${passedTests}`);
console.log(`❌ Falhou: ${failedTests}`);
console.log(`📈 Taxa de sucesso: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (failedTests === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${failedTests} teste(s) falharam\n`);
    process.exit(1);
}
