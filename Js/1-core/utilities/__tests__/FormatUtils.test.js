/**
 * Teste para FormatUtils
 * Execute: node js/1-core/utilities/__tests__/FormatUtils.test.js
 */

const FormatUtils = require('../FormatUtils.js');

console.log('🧪 Iniciando testes do FormatUtils\n');
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
    if (actual !== expected) {
        throw new Error(`${message}\n  Esperado: "${expected}"\n  Recebido: "${actual}"`);
    }
}

// ==================== TESTES DE FORMATAÇÃO DE NÚMEROS ====================
console.log('\n' + '='.repeat(60));
console.log('🔢 TESTES DE FORMATAÇÃO DE NÚMEROS');
console.log('='.repeat(60));

test('Formatar 1000 deve retornar "1.000"', () => {
    const result = FormatUtils.formatNumber(1000);
    assertEquals(result, '1.000');
});

test('Formatar 1234567 deve retornar "1.234.567"', () => {
    const result = FormatUtils.formatNumber(1234567);
    assertEquals(result, '1.234.567');
});

test('Formatar 1234.56 com 2 decimais deve retornar "1.234,56"', () => {
    const result = FormatUtils.formatNumber(1234.56, 2);
    assertEquals(result, '1.234,56');
});

test('Formatar 0.5 com 1 decimal deve retornar "0,5"', () => {
    const result = FormatUtils.formatNumber(0.5, 1);
    assertEquals(result, '0,5');
});

test('Formatar null deve retornar "-"', () => {
    const result = FormatUtils.formatNumber(null);
    assertEquals(result, '-');
});

test('Formatar string "1000" deve funcionar', () => {
    const result = FormatUtils.formatNumber('1000');
    assertEquals(result, '1.000');
});

// ==================== TESTES DE FORMATAÇÃO DE MOEDA ====================
console.log('\n' + '='.repeat(60));
console.log('💰 TESTES DE FORMATAÇÃO DE MOEDA');
console.log('='.repeat(60));

test('Formatar R$ 1000 deve retornar "R$ 1.000,00"', () => {
    const result = FormatUtils.formatCurrency(1000);
    assertEquals(result, 'R$ 1.000,00');
});

test('Formatar R$ 1234.56 deve retornar "R$ 1.234,56"', () => {
    const result = FormatUtils.formatCurrency(1234.56);
    assertEquals(result, 'R$ 1.234,56');
});

test('Formatar US$ 100 deve retornar "US$ 100,00"', () => {
    const result = FormatUtils.formatCurrency(100, 'US$');
    assertEquals(result, 'US$ 100,00');
});

test('Formatar null deve retornar "R$ 0,00"', () => {
    const result = FormatUtils.formatCurrency(null);
    assertEquals(result, 'R$ 0,00');
});

// ==================== TESTES DE FORMATAÇÃO DE PERCENTUAL ====================
console.log('\n' + '='.repeat(60));
console.log('📊 TESTES DE FORMATAÇÃO DE PERCENTUAL');
console.log('='.repeat(60));

test('Formatar 0.5 deve retornar "50,0%"', () => {
    const result = FormatUtils.formatPercent(0.5);
    assertEquals(result, '50,0%');
});

test('Formatar 0.755 deve retornar "75,5%"', () => {
    const result = FormatUtils.formatPercent(0.755);
    assertEquals(result, '75,5%');
});

test('Formatar 1 deve retornar "100,0%"', () => {
    const result = FormatUtils.formatPercent(1);
    assertEquals(result, '100,0%');
});

test('Formatar 0.3333 com 2 decimais deve retornar "33,33%"', () => {
    const result = FormatUtils.formatPercent(0.3333, 2);
    assertEquals(result, '33,33%');
});

// ==================== TESTES DE FORMATAÇÃO DE CPF ====================
console.log('\n' + '='.repeat(60));
console.log('🆔 TESTES DE FORMATAÇÃO DE CPF');
console.log('='.repeat(60));

test('Formatar CPF 12345678900 deve retornar "123.456.789-00"', () => {
    const result = FormatUtils.formatCPF('12345678900');
    assertEquals(result, '123.456.789-00');
});

test('Formatar CPF numérico deve funcionar', () => {
    const result = FormatUtils.formatCPF(12345678900);
    assertEquals(result, '123.456.789-00');
});

test('Formatar CPF com pontuação deve limpar e reformatar', () => {
    const result = FormatUtils.formatCPF('123.456.789-00');
    assertEquals(result, '123.456.789-00');
});

test('Formatar CPF inválido (10 dígitos) deve retornar original', () => {
    const result = FormatUtils.formatCPF('1234567890');
    assertEquals(result, '1234567890');
});

test('Formatar CPF null deve retornar "-"', () => {
    const result = FormatUtils.formatCPF(null);
    assertEquals(result, '-');
});

// ==================== TESTES DE FORMATAÇÃO DE TELEFONE ====================
console.log('\n' + '='.repeat(60));
console.log('📱 TESTES DE FORMATAÇÃO DE TELEFONE');
console.log('='.repeat(60));

test('Formatar celular 61987654321 deve retornar "(61) 98765-4321"', () => {
    const result = FormatUtils.formatPhone('61987654321');
    assertEquals(result, '(61) 98765-4321');
});

test('Formatar fixo 6132221234 deve retornar "(61) 3222-1234"', () => {
    const result = FormatUtils.formatPhone('6132221234');
    assertEquals(result, '(61) 3222-1234');
});

test('Formatar telefone com pontuação deve limpar e reformatar', () => {
    const result = FormatUtils.formatPhone('(61) 98765-4321');
    assertEquals(result, '(61) 98765-4321');
});

test('Formatar telefone inválido deve retornar original', () => {
    const result = FormatUtils.formatPhone('123');
    assertEquals(result, '123');
});

// ==================== TESTES DE FORMATAÇÃO DE TEXTO ====================
console.log('\n' + '='.repeat(60));
console.log('📝 TESTES DE FORMATAÇÃO DE TEXTO');
console.log('='.repeat(60));

test('Capitalize "joão" deve retornar "João"', () => {
    const result = FormatUtils.capitalize('joão');
    assertEquals(result, 'João');
});

test('Capitalize "MARIA" deve retornar "Maria"', () => {
    const result = FormatUtils.capitalize('MARIA');
    assertEquals(result, 'Maria');
});

test('Title case "joão silva costa" deve retornar "João Silva Costa"', () => {
    const result = FormatUtils.titleCase('joão silva costa');
    assertEquals(result, 'João Silva Costa');
});

test('Title case "maria da silva" deve manter "da" minúsculo', () => {
    const result = FormatUtils.titleCase('maria da silva');
    assertEquals(result, 'Maria da Silva');
});

test('Truncate string longa deve adicionar reticências', () => {
    const long = 'Este é um texto muito longo que precisa ser truncado';
    const result = FormatUtils.truncate(long, 20);
    assertEquals(result, 'Este é um texto m...');
});

test('Truncate string curta não deve modificar', () => {
    const short = 'Texto curto';
    const result = FormatUtils.truncate(short, 20);
    assertEquals(result, 'Texto curto');
});

// ==================== TESTES DE FORMATAÇÃO DE TEMPO ====================
console.log('\n' + '='.repeat(60));
console.log('⏱️  TESTES DE FORMATAÇÃO DE TEMPO');
console.log('='.repeat(60));

test('Formatar 1 dia deve retornar "1 dia"', () => {
    const result = FormatUtils.formatDays(1);
    assertEquals(result, '1 dia');
});

test('Formatar 5 dias deve retornar "5 dias"', () => {
    const result = FormatUtils.formatDays(5);
    assertEquals(result, '5 dias');
});

test('Formatar 0 dias deve retornar "0 dias"', () => {
    const result = FormatUtils.formatDays(0);
    assertEquals(result, '0 dias');
});

test('Formatar 1 mês deve retornar "1 mês"', () => {
    const result = FormatUtils.formatMonths(1);
    assertEquals(result, '1 mês');
});

test('Formatar 12 meses deve retornar "12 meses"', () => {
    const result = FormatUtils.formatMonths(12);
    assertEquals(result, '12 meses');
});

test('Formatar 1 ano deve retornar "1 ano"', () => {
    const result = FormatUtils.formatYears(1);
    assertEquals(result, '1 ano');
});

test('Formatar 5 anos deve retornar "5 anos"', () => {
    const result = FormatUtils.formatYears(5);
    assertEquals(result, '5 anos');
});

// ==================== TESTES DE MANIPULAÇÃO DE STRING ====================
console.log('\n' + '='.repeat(60));
console.log('🔤 TESTES DE MANIPULAÇÃO DE STRING');
console.log('='.repeat(60));

test('Remover acentos de "José María" deve retornar "Jose Maria"', () => {
    const result = FormatUtils.removeAccents('José María');
    assertEquals(result, 'Jose Maria');
});

test('Remover acentos de "São Paulo" deve retornar "Sao Paulo"', () => {
    const result = FormatUtils.removeAccents('São Paulo');
    assertEquals(result, 'Sao Paulo');
});

test('Formatar nome "JOÃO DA SILVA" deve retornar "João da Silva"', () => {
    const result = FormatUtils.formatProperName('JOÃO DA SILVA');
    assertEquals(result, 'João da Silva');
});

test('Formatar nome "maria de souza costa" deve capitalizar corretamente', () => {
    const result = FormatUtils.formatProperName('maria de souza costa');
    assertEquals(result, 'Maria de Souza Costa');
});

test('Limpar string com espaços extras', () => {
    const result = FormatUtils.cleanString('  João   Silva  ');
    assertEquals(result, 'João Silva');
});

test('Limpar string com tabs e quebras de linha', () => {
    const result = FormatUtils.cleanString('João\t\tSilva\n\nCosta');
    assertEquals(result, 'João Silva Costa');
});

// ==================== TESTES COM DADOS REAIS ====================
console.log('\n' + '='.repeat(60));
console.log('📊 TESTES COM DADOS REAIS (CSV)');
console.log('='.repeat(60));

test('Formatar dias de licença: 30 dias', () => {
    const result = FormatUtils.formatDays(30);
    assertEquals(result, '30 dias');
});

test('Formatar nome de servidor em maiúsculas', () => {
    const result = FormatUtils.formatProperName('ACACIA CHAVES DA SILVA COSTA');
    assertEquals(result, 'Acacia Chaves da Silva Costa');
});

test('Formatar cargo em maiúsculas', () => {
    const result = FormatUtils.formatProperName('OFICIAL ADMINISTRATIVO');
    assertEquals(result, 'Oficial Administrativo');
});

test('Formatar percentual de uso de licença: 60/90', () => {
    const percent = 60 / 90;
    const result = FormatUtils.formatPercent(percent, 1);
    assertEquals(result, '66,7%');
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
