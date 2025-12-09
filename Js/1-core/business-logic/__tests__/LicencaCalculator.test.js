/**
 * Testes para LicencaCalculator
 */

const LicencaCalculator = require('../LicencaCalculator.js');

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
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`${message}\n   Esperado: ${JSON.stringify(expected)}\n   Recebido: ${JSON.stringify(actual)}`);
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

function assertNull(value, message = '') {
    if (value !== null) {
        throw new Error(`${message}\n   Esperado: null\n   Recebido: ${value}`);
    }
}

console.log('\n📦 Testando LicencaCalculator...\n');

// ============================================================
// TESTES DE CÁLCULO DE DIAS
// ============================================================

console.log('🔍 Testando cálculo de dias...\n');

test('Dias adquiridos padrão (90 dias)', () => {
    const dias = LicencaCalculator.calcularDiasAdquiridos('2020-01-01');
    assertEquals(dias, 90);
});

test('Dias adquiridos sem data', () => {
    const dias = LicencaCalculator.calcularDiasAdquiridos(null);
    assertEquals(dias, 0);
});

test('Dias gozados (período de 30 dias)', () => {
    const dias = LicencaCalculator.calcularDiasGozados('2024-01-01', '2024-01-30');
    assertEquals(dias, 30);
});

test('Dias gozados (1 dia)', () => {
    const dias = LicencaCalculator.calcularDiasGozados('2024-01-01', '2024-01-01');
    assertEquals(dias, 1);
});

test('Dias gozados (sem datas)', () => {
    const dias = LicencaCalculator.calcularDiasGozados(null, null);
    assertEquals(dias, 0);
});

test('Dias gozados (datas inválidas)', () => {
    const dias = LicencaCalculator.calcularDiasGozados('2024-01-30', '2024-01-01');
    assertEquals(dias, 0);
});

test('Dias convertidos (1/3 de 90 dias)', () => {
    const dias = LicencaCalculator.calcularDiasConvertidos(90, 33.33);
    assertEquals(dias, 30);
});

test('Dias convertidos (50% de 60 dias)', () => {
    const dias = LicencaCalculator.calcularDiasConvertidos(60, 50);
    assertEquals(dias, 30);
});

test('Dias convertidos (valores inválidos)', () => {
    const dias = LicencaCalculator.calcularDiasConvertidos(0, 50);
    assertEquals(dias, 0);
});

// ============================================================
// TESTES DE SALDO
// ============================================================

console.log('\n🔍 Testando cálculo de saldo...\n');

test('Saldo total (sem utilização)', () => {
    const saldo = LicencaCalculator.calcularSaldo(90, 0, 0);
    assertEquals(saldo, 90);
});

test('Saldo após gozo parcial', () => {
    const saldo = LicencaCalculator.calcularSaldo(90, 30, 0);
    assertEquals(saldo, 60);
});

test('Saldo após conversão', () => {
    const saldo = LicencaCalculator.calcularSaldo(90, 0, 30);
    assertEquals(saldo, 60);
});

test('Saldo após gozo e conversão', () => {
    const saldo = LicencaCalculator.calcularSaldo(90, 30, 30);
    assertEquals(saldo, 30);
});

test('Saldo negativo retorna zero', () => {
    const saldo = LicencaCalculator.calcularSaldo(90, 100, 0);
    assertEquals(saldo, 0);
});

test('Saldo zerado', () => {
    const saldo = LicencaCalculator.calcularSaldo(90, 60, 30);
    assertEquals(saldo, 0);
});

// ============================================================
// TESTES DE UTILIZAÇÃO
// ============================================================

console.log('\n🔍 Testando utilização...\n');

test('Percentual de utilização (50%)', () => {
    const percentual = LicencaCalculator.calcularPercentualUtilizacao(45, 90);
    assertEquals(percentual, 50);
});

test('Percentual de utilização (100%)', () => {
    const percentual = LicencaCalculator.calcularPercentualUtilizacao(90, 90);
    assertEquals(percentual, 100);
});

test('Percentual de utilização (0%)', () => {
    const percentual = LicencaCalculator.calcularPercentualUtilizacao(0, 90);
    assertEquals(percentual, 0);
});

test('Licença totalmente utilizada', () => {
    assertTrue(LicencaCalculator.isLicencaTotalmenteUtilizada(0));
});

test('Licença não totalmente utilizada', () => {
    assertFalse(LicencaCalculator.isLicencaTotalmenteUtilizada(30));
});

test('Licença parcialmente utilizada', () => {
    assertTrue(LicencaCalculator.isLicencaParcialmenteUtilizada(90, 30));
});

test('Licença não parcialmente utilizada (saldo total)', () => {
    assertFalse(LicencaCalculator.isLicencaParcialmenteUtilizada(90, 90));
});

test('Licença não parcialmente utilizada (saldo zero)', () => {
    assertFalse(LicencaCalculator.isLicencaParcialmenteUtilizada(90, 0));
});

// ============================================================
// TESTES DE DATAS
// ============================================================

console.log('\n🔍 Testando cálculos de datas...\n');

test('Data de término (30 dias)', () => {
    const dataTermino = LicencaCalculator.calcularDataTermino('2024-01-01', 30);
    assertTrue(dataTermino instanceof Date);
});

test('Data de término (dias inválidos)', () => {
    const dataTermino = LicencaCalculator.calcularDataTermino('2024-01-01', 0);
    assertNull(dataTermino);
});

test('Data de término (data inválida)', () => {
    const dataTermino = LicencaCalculator.calcularDataTermino(null, 30);
    assertNull(dataTermino);
});

test('Dias até início (futuro)', () => {
    const dias = LicencaCalculator.calcularDiasAteInicio('2024-12-31', '2024-01-01');
    assertEquals(dias, 365);
});

test('Dias até início (passado)', () => {
    const dias = LicencaCalculator.calcularDiasAteInicio('2024-01-01', '2024-12-31');
    assertEquals(dias, -365);
});

test('Dias até início (sem data)', () => {
    const dias = LicencaCalculator.calcularDiasAteInicio(null);
    assertEquals(dias, 0);
});

// ============================================================
// TESTES DE PERÍODO
// ============================================================

console.log('\n🔍 Testando verificações de período...\n');

test('Licença no período (totalmente dentro)', () => {
    const resultado = LicencaCalculator.isLicencaNoPeriodo(
        '2024-02-01', '2024-02-15',
        '2024-01-01', '2024-03-01'
    );
    assertTrue(resultado);
});

test('Licença no período (início coincide)', () => {
    const resultado = LicencaCalculator.isLicencaNoPeriodo(
        '2024-01-01', '2024-01-15',
        '2024-01-01', '2024-02-01'
    );
    assertTrue(resultado);
});

test('Licença no período (fim coincide)', () => {
    const resultado = LicencaCalculator.isLicencaNoPeriodo(
        '2024-01-15', '2024-02-01',
        '2024-01-01', '2024-02-01'
    );
    assertTrue(resultado);
});

test('Licença fora do período (antes)', () => {
    const resultado = LicencaCalculator.isLicencaNoPeriodo(
        '2023-12-01', '2023-12-15',
        '2024-01-01', '2024-02-01'
    );
    assertFalse(resultado);
});

test('Licença fora do período (depois)', () => {
    const resultado = LicencaCalculator.isLicencaNoPeriodo(
        '2024-03-01', '2024-03-15',
        '2024-01-01', '2024-02-01'
    );
    assertFalse(resultado);
});

test('Contar licenças expirando no período', () => {
    const licencas = [
        { dataExpiracao: '2024-01-15' },
        { dataExpiracao: '2024-02-15' },
        { dataExpiracao: '2024-03-15' }
    ];
    const count = LicencaCalculator.contarLicencasExpirandoNoPeriodo(
        licencas, '2024-01-01', '2024-02-28'
    );
    assertEquals(count, 2);
});

test('Contar licenças expirando (array vazio)', () => {
    const count = LicencaCalculator.contarLicencasExpirandoNoPeriodo(
        [], '2024-01-01', '2024-02-28'
    );
    assertEquals(count, 0);
});

// ============================================================
// TESTES DE PROJEÇÃO
// ============================================================

console.log('\n🔍 Testando projeções...\n');

test('Projeção de utilização (esgota em 3 meses)', () => {
    const projecao = LicencaCalculator.calcularProjecaoUtilizacao(90, 30, 6);
    assertEquals(projecao.saldoProjetado, 0);
    assertEquals(projecao.mesEsgotamento, 3);
});

test('Projeção de utilização (não esgota)', () => {
    const projecao = LicencaCalculator.calcularProjecaoUtilizacao(90, 10, 6);
    assertEquals(projecao.saldoProjetado, 30);
    assertEquals(projecao.mesEsgotamento, 9);
});

test('Projeção de utilização (média zero)', () => {
    const projecao = LicencaCalculator.calcularProjecaoUtilizacao(90, 0, 6);
    assertEquals(projecao.saldoProjetado, 90);
    assertNull(projecao.mesEsgotamento);
});

// ============================================================
// TESTES DE ABONO
// ============================================================

console.log('\n🔍 Testando cálculo de abono...\n');

test('Valor de abono (30 dias)', () => {
    const valor = LicencaCalculator.calcularValorAbono(30, 100);
    assertEquals(valor, 3000);
});

test('Valor de abono (15 dias)', () => {
    const valor = LicencaCalculator.calcularValorAbono(15, 200);
    assertEquals(valor, 3000);
});

test('Valor de abono (valores inválidos)', () => {
    const valor = LicencaCalculator.calcularValorAbono(0, 100);
    assertEquals(valor, 0);
});

// ============================================================
// TESTES DE ESTRATÉGIA
// ============================================================

console.log('\n🔍 Testando sugestões de estratégia...\n');

test('Estratégia urgente (30 dias)', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(30, '2024-01-30', '2024-01-01');
    assertEquals(estrategia.estrategia, 'urgente');
    assertEquals(estrategia.urgencia, 'crítica');
});

test('Estratégia programar (90 dias)', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(30, '2024-03-15', '2024-01-01');
    assertEquals(estrategia.estrategia, 'programar');
    assertEquals(estrategia.urgencia, 'alta');
});

test('Estratégia planejar (180 dias)', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(60, '2024-05-15', '2024-01-01');
    assertEquals(estrategia.estrategia, 'planejar');
    assertEquals(estrategia.urgencia, 'média');
});

test('Estratégia converter (saldo baixo)', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(20, '2025-01-01', '2024-01-01');
    assertEquals(estrategia.estrategia, 'converter');
    assertEquals(estrategia.urgencia, 'baixa');
});

test('Estratégia monitorar (sem urgência)', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(90, '2025-01-01', '2024-01-01');
    assertEquals(estrategia.estrategia, 'monitorar');
    assertEquals(estrategia.urgencia, 'baixa');
});

test('Estratégia expirada', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(30, '2024-01-01', '2024-12-01');
    assertEquals(estrategia.estrategia, 'expirada');
    assertEquals(estrategia.urgencia, 'crítica');
});

test('Estratégia sem saldo', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(0, '2024-12-01', '2024-01-01');
    assertEquals(estrategia.estrategia, 'nenhuma');
});

// ============================================================
// TESTES DE VALIDAÇÃO
// ============================================================

console.log('\n🔍 Testando validações...\n');

test('Validação aprovada', () => {
    const validacao = LicencaCalculator.validarSolicitacao(30, 90, '2024-12-01', []);
    assertTrue(validacao.valida);
    assertEquals(validacao.erros.length, 0);
});

test('Validação rejeitada (saldo insuficiente)', () => {
    const validacao = LicencaCalculator.validarSolicitacao(100, 90, '2024-12-01', []);
    assertFalse(validacao.valida);
    assertTrue(validacao.erros.length > 0);
});

test('Validação rejeitada (dias inválidos)', () => {
    const validacao = LicencaCalculator.validarSolicitacao(0, 90, '2024-12-01', []);
    assertFalse(validacao.valida);
    assertTrue(validacao.erros.length > 0);
});

test('Validação rejeitada (data inválida)', () => {
    const validacao = LicencaCalculator.validarSolicitacao(30, 90, null, []);
    assertFalse(validacao.valida);
    assertTrue(validacao.erros.length > 0);
});

test('Validação com conflito', () => {
    const licencasExistentes = [
        { dataInicio: '2024-12-01', dataFim: '2024-12-30' }
    ];
    const validacao = LicencaCalculator.validarSolicitacao(15, 90, '2024-12-15', licencasExistentes);
    assertFalse(validacao.valida);
    assertTrue(validacao.erros.some(e => e.includes('Conflito')));
});

test('Validação sem conflito', () => {
    const licencasExistentes = [
        { dataInicio: '2024-11-01', dataFim: '2024-11-30' }
    ];
    const validacao = LicencaCalculator.validarSolicitacao(15, 90, '2024-12-15', licencasExistentes);
    assertTrue(validacao.valida);
});

test('Validação com aviso (data no passado)', () => {
    const validacao = LicencaCalculator.validarSolicitacao(30, 90, '2020-01-01', []);
    assertTrue(validacao.avisos.length > 0);
});

// ============================================================
// TESTES COM CENÁRIOS REAIS
// ============================================================

console.log('\n🔍 Testando cenários reais...\n');

test('Cenário 1: Servidor com licença parcialmente gozada', () => {
    const adquiridos = 90;
    const gozados = 30;
    const convertidos = 0;
    const saldo = LicencaCalculator.calcularSaldo(adquiridos, gozados, convertidos);
    const percentual = LicencaCalculator.calcularPercentualUtilizacao(gozados, adquiridos);
    
    assertEquals(saldo, 60);
    assertEquals(percentual, 33.33);
    assertTrue(LicencaCalculator.isLicencaParcialmenteUtilizada(adquiridos, saldo));
});

test('Cenário 2: Servidor convertendo 1/3 em abono', () => {
    const adquiridos = 90;
    const convertidos = LicencaCalculator.calcularDiasConvertidos(adquiridos, 33.33);
    const saldo = LicencaCalculator.calcularSaldo(adquiridos, 0, convertidos);
    const valorAbono = LicencaCalculator.calcularValorAbono(convertidos, 150);
    
    assertEquals(convertidos, 30);
    assertEquals(saldo, 60);
    assertEquals(valorAbono, 4500);
});

test('Cenário 3: Licença próxima do vencimento', () => {
    const estrategia = LicencaCalculator.sugerirEstrategia(90, '2024-01-30', '2024-01-01');
    
    assertEquals(estrategia.estrategia, 'urgente');
    assertEquals(estrategia.urgencia, 'crítica');
});

test('Cenário 4: Múltiplas licenças expirando no trimestre', () => {
    const licencas = [
        { dataExpiracao: '2024-01-31' },
        { dataExpiracao: '2024-02-28' },
        { dataExpiracao: '2024-03-31' },
        { dataExpiracao: '2024-04-30' }
    ];
    const count = LicencaCalculator.contarLicencasExpirandoNoPeriodo(
        licencas, '2024-01-01', '2024-03-31'
    );
    
    assertEquals(count, 3);
});

test('Cenário 5: Projeção de esgotamento de saldo', () => {
    const saldoAtual = 60;
    const mediaMensal = 15;
    const projecao = LicencaCalculator.calcularProjecaoUtilizacao(saldoAtual, mediaMensal, 6);
    
    assertEquals(projecao.mesEsgotamento, 4);
    assertEquals(projecao.saldoProjetado, 0);
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
