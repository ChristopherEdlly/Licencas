/**
 * Testes para AposentadoriaAnalyzer
 * 
 * Testa cálculos de aposentadoria, elegibilidade e projeções
 */

import AposentadoriaAnalyzer from '../AposentadoriaAnalyzer.js';

// Framework de testes simples
const tests = [];
const test = (name, fn) => tests.push({ name, fn });
const assertEquals = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
};
const assertTrue = (value, message) => {
    if (!value) {
        throw new Error(message || 'Expected true, got false');
    }
};
const assertFalse = (value, message) => {
    if (value) {
        throw new Error(message || 'Expected false, got true');
    }
};
const assertGreaterThan = (actual, expected, message) => {
    if (actual <= expected) {
        throw new Error(`${message || 'Greater than assertion failed'}: ${actual} should be > ${expected}`);
    }
};
const assertLessThan = (actual, expected, message) => {
    if (actual >= expected) {
        throw new Error(`${message || 'Less than assertion failed'}: ${actual} should be < ${expected}`);
    }
};

// ========================================
// TESTES: calcularIdade
// ========================================

test('Calcular idade - 30 anos', () => {
    const dataNascimento = '1995-12-09';
    const dataReferencia = '2025-12-09';
    const idade = AposentadoriaAnalyzer.calcularIdade(dataNascimento, dataReferencia);
    assertEquals(idade, 30);
});

test('Calcular idade - não fez aniversário ainda', () => {
    const dataNascimento = '1990-12-31';
    const dataReferencia = '2025-12-09';
    const idade = AposentadoriaAnalyzer.calcularIdade(dataNascimento, dataReferencia);
    assertEquals(idade, 34); // Ainda não chegou 31/12
});

test('Calcular idade - 65 anos', () => {
    const dataNascimento = '1960-01-01';
    const dataReferencia = '2025-12-09';
    const idade = AposentadoriaAnalyzer.calcularIdade(dataNascimento, dataReferencia);
    assertEquals(idade, 65);
});

// ========================================
// TESTES: calcularTempoContribuicao
// ========================================

test('Calcular tempo de contribuição - sem licenças', () => {
    const dataAdmissao = '2015-01-01';
    const dataReferencia = '2025-12-09';
    const tempo = AposentadoriaAnalyzer.calcularTempoContribuicao(dataAdmissao, [], dataReferencia);
    
    assertTrue(tempo.anosContribuicao >= 10.9 && tempo.anosContribuicao <= 11.1);
    assertEquals(tempo.diasLicencaSemRemuneracao, 0);
});

test('Calcular tempo de contribuição - com licença sem remuneração', () => {
    const dataAdmissao = '2015-01-01';
    const licencas = [
        { tipoLicenca: 'Licença sem remuneração', diasAdquiridos: 365 }
    ];
    const tempo = AposentadoriaAnalyzer.calcularTempoContribuicao(dataAdmissao, licencas);
    
    assertEquals(tempo.diasLicencaSemRemuneracao, 365);
    assertTrue(tempo.anosContribuicao < tempo.diasTotais / 365);
});

test('Calcular tempo de contribuição - com licença prêmio', () => {
    const dataAdmissao = '2015-01-01';
    const licencas = [
        { tipoLicenca: 'Licença prêmio', diasAdquiridos: 90 }
    ];
    const tempo = AposentadoriaAnalyzer.calcularTempoContribuicao(dataAdmissao, licencas);
    
    assertEquals(tempo.diasLicencaPremio, 90);
    // Licença prêmio conta para aposentadoria
    assertTrue(tempo.anosContribuicao > 10);
});

// ========================================
// TESTES: verificarElegibilidadeIdade
// ========================================

test('Elegibilidade por idade - homem 65 anos elegível', () => {
    const servidor = {
        dataNascimento: '1960-01-01',
        dataAdmissao: '2000-01-01',
        sexo: 'M',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadeIdade(servidor);
    
    assertTrue(resultado.elegivel);
    assertTrue(resultado.idadeAtual >= 65);
    assertEquals(resultado.idadeFaltante, 0);
});

test('Elegibilidade por idade - mulher 62 anos elegível', () => {
    const servidor = {
        dataNascimento: '1963-01-01',
        dataAdmissao: '2000-01-01',
        sexo: 'F',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadeIdade(servidor);
    
    assertTrue(resultado.elegivel);
    assertTrue(resultado.idadeAtual >= 62);
});

test('Elegibilidade por idade - não elegível ainda', () => {
    const servidor = {
        dataNascimento: '1980-01-01',
        dataAdmissao: '2010-01-01',
        sexo: 'M',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadeIdade(servidor);
    
    assertFalse(resultado.elegivel);
    assertGreaterThan(resultado.idadeFaltante, 0);
});

test('Elegibilidade por idade - tempo insuficiente', () => {
    const servidor = {
        dataNascimento: '1960-01-01',
        dataAdmissao: '2020-01-01', // Apenas 5 anos
        sexo: 'M',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadeIdade(servidor);
    
    assertFalse(resultado.elegivel);
    assertGreaterThan(resultado.tempoFaltante, 0);
});

// ========================================
// TESTES: verificarElegibilidadeTempoContribuicao
// ========================================

test('Elegibilidade por tempo - homem 35 anos', () => {
    const servidor = {
        dataNascimento: '1980-01-01',
        dataAdmissao: '1990-01-01',
        sexo: 'M',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadeTempoContribuicao(servidor);
    
    assertTrue(resultado.elegivel);
    assertTrue(resultado.tempoContribuicao >= 35);
});

test('Elegibilidade por tempo - mulher 30 anos', () => {
    const servidor = {
        dataNascimento: '1980-01-01',
        dataAdmissao: '1995-01-01',
        sexo: 'F',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadeTempoContribuicao(servidor);
    
    assertTrue(resultado.elegivel);
    assertTrue(resultado.tempoContribuicao >= 30);
});

test('Elegibilidade por tempo - não elegível', () => {
    const servidor = {
        dataNascimento: '1990-01-01',
        dataAdmissao: '2010-01-01',
        sexo: 'M',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadeTempoContribuicao(servidor);
    
    assertFalse(resultado.elegivel);
    assertGreaterThan(resultado.tempoFaltante, 0);
});

// ========================================
// TESTES: verificarElegibilidadePontos
// ========================================

test('Elegibilidade por pontos - homem 100 pontos', () => {
    const servidor = {
        dataNascimento: '1965-01-01', // 60 anos
        dataAdmissao: '1985-01-01', // 40 anos = 100 pontos
        sexo: 'M',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadePontos(servidor);
    
    assertTrue(resultado.elegivel);
    assertTrue(resultado.pontosAtuais >= 100);
});

test('Elegibilidade por pontos - mulher 90 pontos', () => {
    const servidor = {
        dataNascimento: '1970-01-01', // 55 anos
        dataAdmissao: '1990-01-01', // 35 anos = 90 pontos
        sexo: 'F',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadePontos(servidor);
    
    assertTrue(resultado.elegivel);
    assertTrue(resultado.pontosAtuais >= 90);
});

test('Elegibilidade por pontos - não elegível', () => {
    const servidor = {
        dataNascimento: '1990-01-01',
        dataAdmissao: '2010-01-01',
        sexo: 'M',
        licencas: []
    };
    const resultado = AposentadoriaAnalyzer.verificarElegibilidadePontos(servidor);
    
    assertFalse(resultado.elegivel);
    assertGreaterThan(resultado.pontosFaltantes, 0);
});

// ========================================
// TESTES: projetarAposentadoria
// ========================================

test('Projetar aposentadoria - já elegível', () => {
    const servidor = {
        dataNascimento: '1960-01-01',
        dataAdmissao: '1985-01-01',
        sexo: 'M',
        licencas: []
    };
    const projecao = AposentadoriaAnalyzer.projetarAposentadoria(servidor);
    
    assertTrue(projecao.elegivelAgora);
    assertEquals(projecao.diasAteAposentadoria, 0);
});

test('Projetar aposentadoria - não elegível', () => {
    const servidor = {
        dataNascimento: '1990-01-01',
        dataAdmissao: '2010-01-01',
        sexo: 'M',
        licencas: []
    };
    const projecao = AposentadoriaAnalyzer.projetarAposentadoria(servidor);
    
    assertFalse(projecao.elegivelAgora);
    assertGreaterThan(projecao.diasAteAposentadoria, 0);
    assertTrue(projecao.melhorOpcao !== undefined);
});

test('Projetar aposentadoria - múltiplas opções', () => {
    const servidor = {
        dataNascimento: '1990-01-01',
        dataAdmissao: '2010-01-01',
        sexo: 'M',
        licencas: []
    };
    const projecao = AposentadoriaAnalyzer.projetarAposentadoria(servidor);
    
    assertTrue(projecao.todasProjecoes.length > 0);
    // Verifica ordenação por dias até
    if (projecao.todasProjecoes.length > 1) {
        assertTrue(projecao.todasProjecoes[0].diasAte <= projecao.todasProjecoes[1].diasAte);
    }
});

// ========================================
// TESTES: analisarImpactoLicencas
// ========================================

test('Impacto de licenças - sem licenças', () => {
    const servidor = {
        dataNascimento: '1980-01-01',
        dataAdmissao: '2000-01-01',
        sexo: 'M',
        licencas: []
    };
    const impacto = AposentadoriaAnalyzer.analisarImpactoLicencas(servidor);
    
    assertFalse(impacto.temImpacto);
    assertEquals(impacto.diasImpacto, 0);
    assertEquals(impacto.anosImpacto, 0);
});

test('Impacto de licenças - com licença sem remuneração', () => {
    const servidor = {
        dataNascimento: '1980-01-01',
        dataAdmissao: '2000-01-01',
        sexo: 'M',
        licencas: [
            { tipoLicenca: 'Licença sem remuneração', diasAdquiridos: 730 }
        ]
    };
    const impacto = AposentadoriaAnalyzer.analisarImpactoLicencas(servidor);
    
    assertTrue(impacto.temImpacto);
    assertEquals(impacto.diasImpacto, 730);
    assertTrue(impacto.anosImpacto >= 1.9);
});

test('Impacto de licenças - atraso na aposentadoria', () => {
    const servidor = {
        dataNascimento: '1980-01-01',
        dataAdmissao: '2000-01-01',
        sexo: 'M',
        licencas: [
            { tipoLicenca: 'Licença sem remuneração', diasAdquiridos: 365 }
        ]
    };
    const impacto = AposentadoriaAnalyzer.analisarImpactoLicencas(servidor);
    
    assertTrue(impacto.diasAtraso >= 0);
});

// ========================================
// TESTES: gerarRelatorioAposentadoria
// ========================================

test('Gerar relatório - completo', () => {
    const servidor = {
        nome: 'João Silva',
        dataNascimento: '1970-01-01',
        dataAdmissao: '1995-01-01',
        sexo: 'M',
        cargo: 'Analista',
        licencas: []
    };
    const relatorio = AposentadoriaAnalyzer.gerarRelatorioAposentadoria(servidor);
    
    assertTrue(relatorio.servidor !== undefined);
    assertTrue(relatorio.situacaoAtual !== undefined);
    assertTrue(relatorio.elegibilidade !== undefined);
    assertTrue(relatorio.projecao !== undefined);
    assertTrue(relatorio.impactoLicencas !== undefined);
    assertTrue(Array.isArray(relatorio.alertas));
});

test('Gerar relatório - com dados completos', () => {
    const servidor = {
        nome: 'Maria Santos',
        dataNascimento: '1975-01-01',
        dataAdmissao: '2000-01-01',
        sexo: 'F',
        cargo: 'Técnica',
        licencas: [
            { tipoLicenca: 'Licença prêmio', diasAdquiridos: 90 }
        ]
    };
    const relatorio = AposentadoriaAnalyzer.gerarRelatorioAposentadoria(servidor);
    
    assertEquals(relatorio.servidor.nome, 'Maria Santos');
    assertTrue(relatorio.situacaoAtual.idade > 0);
    assertTrue(relatorio.situacaoAtual.tempoContribuicao > 0);
});

test('Gerar relatório - alertas para elegível', () => {
    const servidor = {
        nome: 'Pedro Costa',
        dataNascimento: '1960-01-01',
        dataAdmissao: '1985-01-01',
        sexo: 'M',
        cargo: 'Gestor',
        licencas: []
    };
    const relatorio = AposentadoriaAnalyzer.gerarRelatorioAposentadoria(servidor);
    
    assertTrue(relatorio.alertas.length > 0);
    assertTrue(relatorio.projecao.elegivelAgora);
});

// ========================================
// TESTES: calcularProgressoAposentadoria
// ========================================

test('Calcular progresso - 100% elegível', () => {
    const servidor = {
        dataNascimento: '1960-01-01',
        dataAdmissao: '1985-01-01',
        sexo: 'M',
        licencas: []
    };
    const progresso = AposentadoriaAnalyzer.calcularProgressoAposentadoria(servidor);
    
    assertEquals(progresso.geral, 100);
    assertEquals(progresso.porIdade, 100);
});

test('Calcular progresso - parcial', () => {
    const servidor = {
        dataNascimento: '1990-01-01',
        dataAdmissao: '2010-01-01',
        sexo: 'M',
        licencas: []
    };
    const progresso = AposentadoriaAnalyzer.calcularProgressoAposentadoria(servidor);
    
    assertLessThan(progresso.geral, 100);
    assertGreaterThan(progresso.geral, 0);
    assertTrue(['idade', 'tempo', 'pontos'].includes(progresso.maisProximo));
});

test('Calcular progresso - início de carreira', () => {
    const servidor = {
        dataNascimento: '2000-01-01',
        dataAdmissao: '2020-01-01',
        sexo: 'F',
        licencas: []
    };
    const progresso = AposentadoriaAnalyzer.calcularProgressoAposentadoria(servidor);
    
    assertLessThan(progresso.geral, 50);
    assertGreaterThan(progresso.geral, 0);
});

// ========================================
// TESTES: Cenários Reais
// ========================================

test('Cenário real - servidor próximo à aposentadoria', () => {
    const servidor = {
        nome: 'Ana Paula',
        dataNascimento: '1964-01-01',
        dataAdmissao: '1990-01-01',
        sexo: 'F',
        cargo: 'Coordenadora',
        licencas: [
            { tipoLicenca: 'Licença prêmio', diasAdquiridos: 180 }
        ]
    };
    
    const relatorio = AposentadoriaAnalyzer.gerarRelatorioAposentadoria(servidor);
    const progresso = AposentadoriaAnalyzer.calcularProgressoAposentadoria(servidor);
    
    assertTrue(progresso.geral >= 95);
    assertTrue(relatorio.projecao.elegivelAgora || relatorio.projecao.diasAteAposentadoria < 365);
});

test('Cenário real - impacto significativo de licenças', () => {
    const servidor = {
        dataNascimento: '1980-01-01',
        dataAdmissao: '2000-01-01',
        sexo: 'M',
        licencas: [
            { tipoLicenca: 'Licença sem remuneração', diasAdquiridos: 1095 }, // 3 anos
            { tipoLicenca: 'Licença prêmio', diasAdquiridos: 90 }
        ]
    };
    
    const impacto = AposentadoriaAnalyzer.analisarImpactoLicencas(servidor);
    
    assertTrue(impacto.temImpacto);
    assertTrue(impacto.anosImpacto >= 2.9);
    assertEquals(impacto.licencasSemRemuneracao, 1095);
});

test('Cenário real - servidor jovem', () => {
    const servidor = {
        dataNascimento: '1995-01-01',
        dataAdmissao: '2020-01-01',
        sexo: 'F',
        licencas: []
    };
    
    const projecao = AposentadoriaAnalyzer.projetarAposentadoria(servidor);
    const progresso = AposentadoriaAnalyzer.calcularProgressoAposentadoria(servidor);
    
    assertFalse(projecao.elegivelAgora);
    assertGreaterThan(projecao.diasAteAposentadoria, 0); // Ainda falta tempo
    assertLessThan(progresso.geral, 100); // Não atingiu 100% ainda
});

// ========================================
// Executar todos os testes
// ========================================

let passed = 0;
let failed = 0;

console.log('\n🔍 Executando testes para AposentadoriaAnalyzer...\n');

for (const { name, fn } of tests) {
    try {
        fn();
        console.log(`✅ ${name}`);
        passed++;
    } catch (error) {
        console.log(`❌ ${name}`);
        console.log(`   ${error.message}`);
        failed++;
    }
}

console.log('\n📊 RESUMO DOS TESTES');
console.log(`Total de testes: ${tests.length}`);
console.log(`✅ Passou: ${passed}`);
console.log(`❌ Falhou: ${failed}`);
console.log(`🎯 Taxa de sucesso: ${((passed / tests.length) * 100).toFixed(1)}%\n`);

if (failed === 0) {
    console.log('🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log('⚠️  ALGUNS TESTES FALHARAM\n');
    process.exit(1);
}
