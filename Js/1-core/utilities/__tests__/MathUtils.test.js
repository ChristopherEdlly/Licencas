/**
 * Testes para MathUtils
 */

const MathUtils = require('../MathUtils.js');

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
    if (actual !== expected) {
        throw new Error(`${message}\n   Esperado: ${expected}\n   Recebido: ${actual}`);
    }
}

function assertApprox(actual, expected, epsilon = 0.01, message = '') {
    if (Math.abs(actual - expected) > epsilon) {
        throw new Error(`${message}\n   Esperado: ~${expected}\n   Recebido: ${actual}`);
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

console.log('\n📦 Testando MathUtils...\n');

// ============================================================
// TESTES DE ESTATÍSTICAS
// ============================================================

console.log('🔍 Testando estatísticas...\n');

test('Soma de números', () => {
    assertEquals(MathUtils.sum([1, 2, 3, 4, 5]), 15);
});

test('Média aritmética', () => {
    assertEquals(MathUtils.average([10, 20, 30]), 20);
});

test('Mediana (ímpar)', () => {
    assertEquals(MathUtils.median([1, 3, 5, 7, 9]), 5);
});

test('Mediana (par)', () => {
    assertEquals(MathUtils.median([1, 2, 3, 4]), 2.5);
});

test('Moda', () => {
    assertEquals(MathUtils.mode([1, 2, 2, 3, 4]), 2);
});

test('Moda (sem repetição)', () => {
    assertEquals(MathUtils.mode([1, 2, 3, 4, 5]), null);
});

test('Desvio padrão', () => {
    const result = MathUtils.standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
    assertApprox(result, 2, 0.1);
});

test('Mínimo', () => {
    assertEquals(MathUtils.min([5, 2, 8, 1, 9]), 1);
});

test('Máximo', () => {
    assertEquals(MathUtils.max([5, 2, 8, 1, 9]), 9);
});

test('Range', () => {
    assertEquals(MathUtils.range([1, 5, 10]), 9);
});

// ============================================================
// TESTES DE ARREDONDAMENTO
// ============================================================

console.log('\n🔍 Testando arredondamentos...\n');

test('Round (0 decimais)', () => {
    assertEquals(MathUtils.round(3.7), 4);
});

test('Round (2 decimais)', () => {
    assertEquals(MathUtils.round(3.14159, 2), 3.14);
});

test('Ceil', () => {
    assertEquals(MathUtils.ceil(3.1), 4);
});

test('Ceil (decimais)', () => {
    assertEquals(MathUtils.ceil(3.141, 2), 3.15);
});

test('Floor', () => {
    assertEquals(MathUtils.floor(3.9), 3);
});

test('Floor (decimais)', () => {
    assertEquals(MathUtils.floor(3.149, 2), 3.14);
});

test('Truncate', () => {
    assertEquals(MathUtils.truncate(3.9), 3);
});

test('Truncate (decimais)', () => {
    assertEquals(MathUtils.truncate(3.987, 2), 3.98);
});

// ============================================================
// TESTES DE PROPORÇÕES
// ============================================================

console.log('\n🔍 Testando proporções e percentuais...\n');

test('Percentual', () => {
    assertEquals(MathUtils.percentage(25, 100), 25);
});

test('Percentual (50%)', () => {
    assertEquals(MathUtils.percentage(50, 100), 50);
});

test('Percentual de valor', () => {
    assertEquals(MathUtils.percentageOf(10, 200), 20);
});

test('Variação percentual (crescimento)', () => {
    assertEquals(MathUtils.percentageChange(100, 150), 50);
});

test('Variação percentual (decréscimo)', () => {
    assertEquals(MathUtils.percentageChange(200, 100), -50);
});

test('Proporção', () => {
    assertEquals(MathUtils.ratio(1, 4), 0.25);
});

// ============================================================
// TESTES DE INTERVALOS
// ============================================================

console.log('\n🔍 Testando intervalos e limites...\n');

test('Clamp (dentro do range)', () => {
    assertEquals(MathUtils.clamp(5, 0, 10), 5);
});

test('Clamp (abaixo do mínimo)', () => {
    assertEquals(MathUtils.clamp(-5, 0, 10), 0);
});

test('Clamp (acima do máximo)', () => {
    assertEquals(MathUtils.clamp(15, 0, 10), 10);
});

test('InRange (inclusivo)', () => {
    assertTrue(MathUtils.inRange(5, 0, 10, true));
});

test('InRange (limite)', () => {
    assertTrue(MathUtils.inRange(10, 0, 10, true));
});

test('InRange (exclusivo)', () => {
    assertFalse(MathUtils.inRange(10, 0, 10, false));
});

test('Normalize', () => {
    assertEquals(MathUtils.normalize(5, 0, 10), 0.5);
});

test('Denormalize', () => {
    assertEquals(MathUtils.denormalize(0.5, 0, 10), 5);
});

// ============================================================
// TESTES DE INTERPOLAÇÃO
// ============================================================

console.log('\n🔍 Testando interpolações...\n');

test('Lerp (meio)', () => {
    assertEquals(MathUtils.lerp(0, 10, 0.5), 5);
});

test('Lerp (início)', () => {
    assertEquals(MathUtils.lerp(0, 10, 0), 0);
});

test('Lerp (fim)', () => {
    assertEquals(MathUtils.lerp(0, 10, 1), 10);
});

test('Inverse lerp', () => {
    assertEquals(MathUtils.inverseLerp(0, 10, 5), 0.5);
});

test('Remap', () => {
    assertEquals(MathUtils.remap(5, 0, 10, 0, 100), 50);
});

test('Remap (outro intervalo)', () => {
    assertEquals(MathUtils.remap(2, 0, 4, 10, 20), 15);
});

// ============================================================
// TESTES DE VALIDAÇÕES
// ============================================================

console.log('\n🔍 Testando validações...\n');

test('É número válido', () => {
    assertTrue(MathUtils.isValidNumber(42));
});

test('Não é número válido (NaN)', () => {
    assertFalse(MathUtils.isValidNumber(NaN));
});

test('Não é número válido (Infinity)', () => {
    assertFalse(MathUtils.isValidNumber(Infinity));
});

test('É inteiro', () => {
    assertTrue(MathUtils.isInteger(5));
});

test('Não é inteiro', () => {
    assertFalse(MathUtils.isInteger(5.5));
});

test('É positivo', () => {
    assertTrue(MathUtils.isPositive(10));
});

test('Não é positivo (zero)', () => {
    assertFalse(MathUtils.isPositive(0));
});

test('É negativo', () => {
    assertTrue(MathUtils.isNegative(-5));
});

test('Aproximadamente igual', () => {
    assertTrue(MathUtils.approximatelyEqual(1.0001, 1.0002, 0.001));
});

test('Não aproximadamente igual', () => {
    assertFalse(MathUtils.approximatelyEqual(1.0, 2.0, 0.001));
});

// ============================================================
// TESTES DE CONVERSÕES
// ============================================================

console.log('\n🔍 Testando conversões...\n');

test('Graus para radianos (180°)', () => {
    assertApprox(MathUtils.degreesToRadians(180), Math.PI, 0.0001);
});

test('Graus para radianos (90°)', () => {
    assertApprox(MathUtils.degreesToRadians(90), Math.PI / 2, 0.0001);
});

test('Radianos para graus (π)', () => {
    assertApprox(MathUtils.radiansToDegrees(Math.PI), 180, 0.0001);
});

test('Radianos para graus (π/2)', () => {
    assertApprox(MathUtils.radiansToDegrees(Math.PI / 2), 90, 0.0001);
});

// ============================================================
// TESTES DE FUNÇÕES ÚTEIS
// ============================================================

console.log('\n🔍 Testando funções úteis...\n');

test('Fatorial (0)', () => {
    assertEquals(MathUtils.factorial(0), 1);
});

test('Fatorial (5)', () => {
    assertEquals(MathUtils.factorial(5), 120);
});

test('Fatorial (10)', () => {
    assertEquals(MathUtils.factorial(10), 3628800);
});

test('Combinação C(5,2)', () => {
    assertEquals(MathUtils.combination(5, 2), 10);
});

test('Combinação C(10,3)', () => {
    assertEquals(MathUtils.combination(10, 3), 120);
});

test('Permutação P(5,2)', () => {
    assertEquals(MathUtils.permutation(5, 2), 20);
});

test('Permutação P(10,3)', () => {
    assertEquals(MathUtils.permutation(10, 3), 720);
});

test('GCD (48, 18)', () => {
    assertEquals(MathUtils.gcd(48, 18), 6);
});

test('GCD (100, 50)', () => {
    assertEquals(MathUtils.gcd(100, 50), 50);
});

test('LCM (4, 6)', () => {
    assertEquals(MathUtils.lcm(4, 6), 12);
});

test('LCM (12, 18)', () => {
    assertEquals(MathUtils.lcm(12, 18), 36);
});

test('É primo (2)', () => {
    assertTrue(MathUtils.isPrime(2));
});

test('É primo (17)', () => {
    assertTrue(MathUtils.isPrime(17));
});

test('Não é primo (4)', () => {
    assertFalse(MathUtils.isPrime(4));
});

test('Não é primo (1)', () => {
    assertFalse(MathUtils.isPrime(1));
});

test('Random no intervalo', () => {
    const value = MathUtils.random(0, 10);
    assertTrue(value >= 0 && value <= 10);
});

test('Random inteiro', () => {
    const value = MathUtils.random(1, 10, true);
    assertTrue(Number.isInteger(value));
    assertTrue(value >= 1 && value < 10);
});

// ============================================================
// TESTES DE EDGE CASES
// ============================================================

console.log('\n🔍 Testando casos extremos...\n');

test('Soma de array vazio', () => {
    assertEquals(MathUtils.sum([]), 0);
});

test('Média de array vazio', () => {
    assertEquals(MathUtils.average([]), 0);
});

test('Percentual com total zero', () => {
    assertEquals(MathUtils.percentage(10, 0), 0);
});

test('Variação percentual com valor antigo zero', () => {
    assertEquals(MathUtils.percentageChange(0, 100), 0);
});

test('Normalize com range zero', () => {
    assertEquals(MathUtils.normalize(5, 5, 5), 0);
});

test('Fatorial de número negativo', () => {
    assertEquals(MathUtils.factorial(-5), 0);
});

test('Combinação inválida (r > n)', () => {
    assertEquals(MathUtils.combination(3, 5), 0);
});

// ============================================================
// TESTES COM DADOS REAIS
// ============================================================

console.log('\n🔍 Testando com dados reais do sistema...\n');

test('Média de dias de licença', () => {
    const dias = [30, 30, 20, 15, 25];
    assertEquals(MathUtils.average(dias), 24);
});

test('Percentual de gozo', () => {
    const gozados = 10;
    const total = 30;
    assertApprox(MathUtils.percentage(gozados, total), 33.33, 0.1);
});

test('Variação de licenças entre períodos', () => {
    const periodo1 = 100;
    const periodo2 = 120;
    assertEquals(MathUtils.percentageChange(periodo1, periodo2), 20);
});

test('Arredondamento de saldo', () => {
    assertEquals(MathUtils.round(29.7), 30);
});

test('Estatísticas de múltiplas licenças', () => {
    const saldos = [30, 25, 20, 15, 30, 10];
    const media = MathUtils.average(saldos);
    const mediana = MathUtils.median(saldos);
    assertApprox(media, 21.67, 0.1);
    assertEquals(mediana, 22.5);
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
