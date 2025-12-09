/**
 * Testes para ValidationUtils
 */

const ValidationUtils = require('../ValidationUtils.js');

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

console.log('\n📦 Testando ValidationUtils...\n');

// ============================================================
// TESTES DE CPF
// ============================================================

console.log('🔍 Testando validação de CPF...\n');

test('CPF válido (com formatação)', () => {
    assertTrue(ValidationUtils.isValidCPF('123.456.789-09'));
});

test('CPF válido (sem formatação)', () => {
    assertTrue(ValidationUtils.isValidCPF('12345678909'));
});

test('CPF inválido (todos zeros)', () => {
    assertFalse(ValidationUtils.isValidCPF('000.000.000-00'));
});

test('CPF inválido (todos iguais)', () => {
    assertFalse(ValidationUtils.isValidCPF('111.111.111-11'));
});

test('CPF inválido (dígito verificador errado)', () => {
    assertFalse(ValidationUtils.isValidCPF('123.456.789-00'));
});

test('CPF inválido (tamanho errado)', () => {
    assertFalse(ValidationUtils.isValidCPF('123.456.789'));
});

test('CPF inválido (string vazia)', () => {
    assertFalse(ValidationUtils.isValidCPF(''));
});

test('CPF inválido (null)', () => {
    assertFalse(ValidationUtils.isValidCPF(null));
});

// ============================================================
// TESTES DE DATAS
// ============================================================

console.log('\n🔍 Testando validação de datas...\n');

test('Data válida (Date object)', () => {
    assertTrue(ValidationUtils.isValidDate(new Date('2024-03-15')));
});

test('Data válida (string ISO)', () => {
    assertTrue(ValidationUtils.isValidDate('2024-03-15'));
});

test('Data inválida (string inválida)', () => {
    assertFalse(ValidationUtils.isValidDate('data inválida'));
});

test('Data inválida (null)', () => {
    assertFalse(ValidationUtils.isValidDate(null));
});

test('Data futura', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    assertTrue(ValidationUtils.isFutureDate(futureDate));
});

test('Data passada', () => {
    const pastDate = new Date('2020-01-01');
    assertTrue(ValidationUtils.isPastDate(pastDate));
});

test('Data dentro do intervalo', () => {
    const date = new Date('2024-06-15');
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    assertTrue(ValidationUtils.isDateInRange(date, start, end));
});

test('Data fora do intervalo', () => {
    const date = new Date('2025-06-15');
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    assertFalse(ValidationUtils.isDateInRange(date, start, end));
});

test('Intervalo de datas válido', () => {
    const start = new Date('2024-01-01');
    const end = new Date('2024-12-31');
    assertTrue(ValidationUtils.isValidDateRange(start, end));
});

test('Intervalo de datas inválido (invertido)', () => {
    const start = new Date('2024-12-31');
    const end = new Date('2024-01-01');
    assertFalse(ValidationUtils.isValidDateRange(start, end));
});

// ============================================================
// TESTES DE PERÍODOS DE LICENÇA
// ============================================================

console.log('\n🔍 Testando validação de períodos de licença...\n');

test('Período válido (com intervalo)', () => {
    assertTrue(ValidationUtils.isValidLicencaPeriodo('jan/2025 a dez/2025'));
});

test('Período válido (mês único)', () => {
    assertTrue(ValidationUtils.isValidLicencaPeriodo('mar/2024'));
});

test('Período válido (case insensitive)', () => {
    assertTrue(ValidationUtils.isValidLicencaPeriodo('JAN/2025 a DEZ/2025'));
});

test('Período inválido (formato errado)', () => {
    assertFalse(ValidationUtils.isValidLicencaPeriodo('janeiro/2025'));
});

test('Período inválido (mês inexistente)', () => {
    assertFalse(ValidationUtils.isValidLicencaPeriodo('xxx/2025'));
});

test('Período inválido (string vazia)', () => {
    assertFalse(ValidationUtils.isValidLicencaPeriodo(''));
});

test('Dias de licença válidos', () => {
    assertTrue(ValidationUtils.isValidDiasLicenca(30));
});

test('Dias de licença válidos (string)', () => {
    assertTrue(ValidationUtils.isValidDiasLicenca('15'));
});

test('Dias de licença válidos (zero)', () => {
    assertTrue(ValidationUtils.isValidDiasLicenca(0));
});

test('Dias de licença inválidos (negativo)', () => {
    assertFalse(ValidationUtils.isValidDiasLicenca(-5));
});

test('Dias de licença inválidos (não numérico)', () => {
    assertFalse(ValidationUtils.isValidDiasLicenca('abc'));
});

// ============================================================
// TESTES DE CAMPOS OBRIGATÓRIOS
// ============================================================

console.log('\n🔍 Testando validação de campos obrigatórios...\n');

test('Campo obrigatório preenchido (string)', () => {
    assertTrue(ValidationUtils.isRequired('valor'));
});

test('Campo obrigatório vazio (string)', () => {
    assertFalse(ValidationUtils.isRequired(''));
});

test('Campo obrigatório vazio (espaços)', () => {
    assertFalse(ValidationUtils.isRequired('   '));
});

test('Campo obrigatório null', () => {
    assertFalse(ValidationUtils.isRequired(null));
});

test('Campo obrigatório undefined', () => {
    assertFalse(ValidationUtils.isRequired(undefined));
});

test('Campo obrigatório (array não vazio)', () => {
    assertTrue(ValidationUtils.isRequired([1, 2, 3]));
});

test('Campo obrigatório (array vazio)', () => {
    assertFalse(ValidationUtils.isRequired([]));
});

test('Validação de múltiplos campos (todos presentes)', () => {
    const obj = { nome: 'João', cpf: '123', matricula: '456' };
    const result = ValidationUtils.validateRequiredFields(obj, ['nome', 'cpf', 'matricula']);
    assertTrue(result.valid);
    assertEquals(result.missing, []);
});

test('Validação de múltiplos campos (campo faltando)', () => {
    const obj = { nome: 'João', matricula: '456' };
    const result = ValidationUtils.validateRequiredFields(obj, ['nome', 'cpf', 'matricula']);
    assertFalse(result.valid);
    assertEquals(result.missing, ['cpf']);
});

// ============================================================
// TESTES DE FORMATOS
// ============================================================

console.log('\n🔍 Testando validação de formatos...\n');

test('Email válido', () => {
    assertTrue(ValidationUtils.isValidEmail('usuario@exemplo.com'));
});

test('Email inválido (sem @)', () => {
    assertFalse(ValidationUtils.isValidEmail('usuario.exemplo.com'));
});

test('Email inválido (sem domínio)', () => {
    assertFalse(ValidationUtils.isValidEmail('usuario@'));
});

test('Telefone válido (11 dígitos)', () => {
    assertTrue(ValidationUtils.isValidPhone('11987654321'));
});

test('Telefone válido (10 dígitos)', () => {
    assertTrue(ValidationUtils.isValidPhone('1133334444'));
});

test('Telefone válido (com formatação)', () => {
    assertTrue(ValidationUtils.isValidPhone('(11) 98765-4321'));
});

test('Telefone inválido (poucos dígitos)', () => {
    assertFalse(ValidationUtils.isValidPhone('123456'));
});

test('Matrícula válida (numérica)', () => {
    assertTrue(ValidationUtils.isValidMatricula('123456'));
});

test('Matrícula inválida (contém letras)', () => {
    assertFalse(ValidationUtils.isValidMatricula('ABC123'));
});

test('Matrícula inválida (muito longa)', () => {
    assertFalse(ValidationUtils.isValidMatricula('12345678901'));
});

test('Nome válido', () => {
    assertTrue(ValidationUtils.isValidName('João da Silva'));
});

test('Nome válido (com acentos)', () => {
    assertTrue(ValidationUtils.isValidName('José André Gonçalves'));
});

test('Nome inválido (muito curto)', () => {
    assertFalse(ValidationUtils.isValidName('J'));
});

test('Nome inválido (contém números)', () => {
    assertFalse(ValidationUtils.isValidName('João123'));
});

// ============================================================
// TESTES DE NÚMEROS
// ============================================================

console.log('\n🔍 Testando validação de números...\n');

test('Numérico válido (number)', () => {
    assertTrue(ValidationUtils.isNumeric(123));
});

test('Numérico válido (string)', () => {
    assertTrue(ValidationUtils.isNumeric('456.78'));
});

test('Numérico inválido (texto)', () => {
    assertFalse(ValidationUtils.isNumeric('abc'));
});

test('Numérico inválido (string vazia)', () => {
    assertFalse(ValidationUtils.isNumeric(''));
});

test('Número no intervalo', () => {
    assertTrue(ValidationUtils.isInRange(50, 0, 100));
});

test('Número fora do intervalo', () => {
    assertFalse(ValidationUtils.isInRange(150, 0, 100));
});

test('Inteiro válido', () => {
    assertTrue(ValidationUtils.isInteger(42));
});

test('Inteiro inválido (decimal)', () => {
    assertFalse(ValidationUtils.isInteger(42.5));
});

// ============================================================
// TESTES DE VALIDAÇÃO COMPLEXA
// ============================================================

console.log('\n🔍 Testando validação complexa de objetos...\n');

test('Servidor válido', () => {
    const servidor = {
        cpf: '123.456.789-09',
        nome: 'João Silva',
        matricula: '123456'
    };
    const result = ValidationUtils.validateServidorRecord(servidor);
    assertTrue(result.valid);
    assertEquals(result.errors, []);
});

test('Servidor inválido (CPF faltando)', () => {
    const servidor = {
        nome: 'João Silva',
        matricula: '123456'
    };
    const result = ValidationUtils.validateServidorRecord(servidor);
    assertFalse(result.valid);
    assertTrue(result.errors.length > 0);
});

test('Servidor inválido (CPF inválido)', () => {
    const servidor = {
        cpf: '000.000.000-00',
        nome: 'João Silva',
        matricula: '123456'
    };
    const result = ValidationUtils.validateServidorRecord(servidor);
    assertFalse(result.valid);
    assertTrue(result.errors.includes('CPF inválido'));
});

test('Licença válida (básica)', () => {
    const licenca = {
        periodo: 'jan/2025 a dez/2025',
        dias: 30
    };
    const result = ValidationUtils.validateLicencaRecord(licenca);
    assertTrue(result.valid);
    assertEquals(result.errors, []);
});

test('Licença válida (com datas)', () => {
    const licenca = {
        periodo: 'jan/2025 a mar/2025',
        dias: 90,
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-03-31')
    };
    const result = ValidationUtils.validateLicencaRecord(licenca);
    assertTrue(result.valid);
    assertEquals(result.errors, []);
});

test('Licença inválida (período faltando)', () => {
    const licenca = {
        dias: 30
    };
    const result = ValidationUtils.validateLicencaRecord(licenca);
    assertFalse(result.valid);
    assertTrue(result.errors.includes('Período é obrigatório'));
});

test('Licença inválida (datas invertidas)', () => {
    const licenca = {
        periodo: 'jan/2025',
        dias: 30,
        dataInicio: new Date('2025-03-31'),
        dataFim: new Date('2025-01-01')
    };
    const result = ValidationUtils.validateLicencaRecord(licenca);
    assertFalse(result.valid);
    assertTrue(result.errors.includes('Data de início deve ser anterior à data de fim'));
});

// ============================================================
// TESTES COM DADOS REAIS
// ============================================================

console.log('\n🔍 Testando com dados reais do sistema...\n');

test('CPF real formatado', () => {
    // CPF válido gerado para teste: 111.444.777-35
    assertTrue(ValidationUtils.isValidCPF('111.444.777-35'));
});

test('Período de licença real', () => {
    assertTrue(ValidationUtils.isValidLicencaPeriodo('jan/2025 a dez/2025'));
});

test('Validação de servidor completo (dados reais)', () => {
    const servidor = {
        cpf: '111.444.777-35', // CPF válido para teste
        nome: 'MARIA DA SILVA SANTOS',
        matricula: '123456',
        cargo: 'Analista',
        lotacao: 'SECRETARIA DE EDUCAÇÃO'
    };
    const result = ValidationUtils.validateServidorRecord(servidor);
    assertTrue(result.valid);
});

test('Validação de licença completa (dados reais)', () => {
    const licenca = {
        periodo: 'jan/2025 a dez/2025',
        dias: 30,
        diasGozados: 0,
        saldo: 30,
        dataInicio: new Date('2025-01-01'),
        dataFim: new Date('2025-12-31')
    };
    const result = ValidationUtils.validateLicencaRecord(licenca);
    assertTrue(result.valid);
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
