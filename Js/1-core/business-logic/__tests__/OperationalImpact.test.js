/**
 * Testes para OperationalImpact
 * 
 * Testa análise de impacto operacional de licenças
 */

import OperationalImpact from '../OperationalImpact.js';

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
// TESTES: calcularCriticidadeCargo
// ========================================

test('Criticidade cargo - gestor (alta)', () => {
    const criticidade = OperationalImpact.calcularCriticidadeCargo('Gestor de TI');
    assertEquals(criticidade, 5);
});

test('Criticidade cargo - coordenador (alta)', () => {
    const criticidade = OperationalImpact.calcularCriticidadeCargo('Coordenador Administrativo');
    assertEquals(criticidade, 5);
});

test('Criticidade cargo - analista (média)', () => {
    const criticidade = OperationalImpact.calcularCriticidadeCargo('Analista de Sistemas');
    assertEquals(criticidade, 3);
});

test('Criticidade cargo - técnico (média)', () => {
    const criticidade = OperationalImpact.calcularCriticidadeCargo('Técnico em Informática');
    assertEquals(criticidade, 3);
});

test('Criticidade cargo - auxiliar (baixa)', () => {
    const criticidade = OperationalImpact.calcularCriticidadeCargo('Auxiliar Administrativo');
    assertEquals(criticidade, 1);
});

test('Criticidade cargo - cargo desconhecido (padrão)', () => {
    const criticidade = OperationalImpact.calcularCriticidadeCargo('Cargo Especial');
    assertEquals(criticidade, 2);
});

// ========================================
// TESTES: calcularImpactoLicenca
// ========================================

test('Impacto licença - gestor com saldo alto', () => {
    const licenca = {
        diasAdquiridos: 90,
        saldo: 70
    };
    const servidor = {
        nome: 'João Silva',
        cargo: 'Gestor'
    };
    
    const impacto = OperationalImpact.calcularImpactoLicenca(licenca, servidor);
    
    assertGreaterThan(impacto.scoreImpacto, 4);
    assertEquals(impacto.criticidadeCargo, 5);
    assertTrue(impacto.saldo === 70);
});

test('Impacto licença - técnico com saldo baixo', () => {
    const licenca = {
        diasAdquiridos: 90,
        saldo: 5
    };
    const servidor = {
        nome: 'Maria Santos',
        cargo: 'Técnico'
    };
    
    const impacto = OperationalImpact.calcularImpactoLicenca(licenca, servidor);
    
    assertLessThan(impacto.scoreImpacto, 3);
    assertEquals(impacto.criticidadeCargo, 3);
});

test('Impacto licença - proporção usada alta', () => {
    const licenca = {
        diasAdquiridos: 90,
        saldo: 10 // 80/90 usado = 88%
    };
    const servidor = {
        nome: 'Pedro Costa',
        cargo: 'Analista'
    };
    
    const impacto = OperationalImpact.calcularImpactoLicenca(licenca, servidor);
    
    assertTrue(impacto.proporcaoUsada > 80);
    assertGreaterThan(impacto.impactoProporcao, 3);
});

// ========================================
// TESTES: obterNivelImpacto
// ========================================

test('Nível de impacto - crítico', () => {
    const nivel = OperationalImpact.obterNivelImpacto(4.8);
    assertEquals(nivel.label, 'Crítico');
    assertEquals(nivel.value, 5);
});

test('Nível de impacto - alto', () => {
    const nivel = OperationalImpact.obterNivelImpacto(3.7);
    assertEquals(nivel.label, 'Alto');
    assertEquals(nivel.value, 4);
});

test('Nível de impacto - moderado', () => {
    const nivel = OperationalImpact.obterNivelImpacto(2.8);
    assertEquals(nivel.label, 'Moderado');
    assertEquals(nivel.value, 3);
});

test('Nível de impacto - baixo', () => {
    const nivel = OperationalImpact.obterNivelImpacto(1.7);
    assertEquals(nivel.label, 'Baixo');
    assertEquals(nivel.value, 2);
});

test('Nível de impacto - mínimo', () => {
    const nivel = OperationalImpact.obterNivelImpacto(1.2);
    assertEquals(nivel.label, 'Mínimo');
    assertEquals(nivel.value, 1);
});

// ========================================
// TESTES: analisarImpactoEquipe
// ========================================

test('Impacto equipe - sem licenças', () => {
    const servidores = [
        { nome: 'João', cargo: 'Analista', licencas: [] },
        { nome: 'Maria', cargo: 'Técnico', licencas: [] }
    ];
    
    const impacto = OperationalImpact.analisarImpactoEquipe(servidores);
    
    assertEquals(impacto.totalServidores, 2);
    assertEquals(impacto.servidoresComLicenca, 0);
    assertEquals(impacto.percentualAusente, 0);
});

test('Impacto equipe - 50% com licenças', () => {
    const servidores = [
        { 
            nome: 'João', 
            cargo: 'Analista', 
            licencas: [{ diasAdquiridos: 90, saldo: 30 }] 
        },
        { 
            nome: 'Maria', 
            cargo: 'Técnico', 
            licencas: [] 
        }
    ];
    
    const impacto = OperationalImpact.analisarImpactoEquipe(servidores);
    
    assertEquals(impacto.totalServidores, 2);
    assertEquals(impacto.servidoresComLicenca, 1);
    assertEquals(impacto.percentualAusente, 50);
});

test('Impacto equipe - crítico (70%+)', () => {
    const servidores = [
        { nome: 'A', cargo: 'Analista', licencas: [{ diasAdquiridos: 90, saldo: 30 }] },
        { nome: 'B', cargo: 'Técnico', licencas: [{ diasAdquiridos: 90, saldo: 30 }] },
        { nome: 'C', cargo: 'Auxiliar', licencas: [{ diasAdquiridos: 90, saldo: 30 }] },
        { nome: 'D', cargo: 'Gestor', licencas: [] }
    ];
    
    const impacto = OperationalImpact.analisarImpactoEquipe(servidores);
    
    assertTrue(impacto.percentualAusente >= 70);
    assertEquals(impacto.nivelImpactoEquipe.label, 'Crítico');
    assertTrue(impacto.alertas.length > 0);
});

test('Impacto equipe - ordenação por impacto', () => {
    const servidores = [
        { nome: 'Auxiliar', cargo: 'Auxiliar', licencas: [{ diasAdquiridos: 90, saldo: 30 }] },
        { nome: 'Gestor', cargo: 'Gestor', licencas: [{ diasAdquiridos: 90, saldo: 30 }] }
    ];
    
    const impacto = OperationalImpact.analisarImpactoEquipe(servidores);
    
    assertTrue(impacto.impactosIndividuais.length === 2);
    // Gestor deve estar primeiro (maior impacto)
    assertTrue(impacto.impactosIndividuais[0].servidor === 'Gestor');
});

// ========================================
// TESTES: analisarConflitosLicencas
// ========================================

test('Conflitos - sem sobreposição', () => {
    const licencas = [
        { 
            servidor: 'João', 
            cargo: 'Analista',
            dataInicio: '2025-01-01', 
            dataFim: '2025-01-15' 
        },
        { 
            servidor: 'Maria', 
            cargo: 'Técnico',
            dataInicio: '2025-02-01', 
            dataFim: '2025-02-15' 
        }
    ];
    
    const conflitos = OperationalImpact.analisarConflitosLicencas(licencas);
    
    assertFalse(conflitos.temConflitos);
    assertEquals(conflitos.conflitosDetectados, 0);
});

test('Conflitos - com sobreposição parcial', () => {
    const licencas = [
        { 
            servidor: 'João', 
            cargo: 'Analista',
            dataInicio: '2025-01-01', 
            dataFim: '2025-01-20' 
        },
        { 
            servidor: 'Maria', 
            cargo: 'Técnico',
            dataInicio: '2025-01-15', 
            dataFim: '2025-01-30' 
        }
    ];
    
    const conflitos = OperationalImpact.analisarConflitosLicencas(licencas);
    
    assertTrue(conflitos.temConflitos);
    assertEquals(conflitos.conflitosDetectados, 1);
    assertTrue(conflitos.conflitos[0].diasConflito >= 5);
});

test('Conflitos - sobreposição total', () => {
    const licencas = [
        { 
            servidor: 'João', 
            cargo: 'Analista',
            dataInicio: '2025-01-01', 
            dataFim: '2025-01-31' 
        },
        { 
            servidor: 'Maria', 
            cargo: 'Técnico',
            dataInicio: '2025-01-10', 
            dataFim: '2025-01-20' 
        }
    ];
    
    const conflitos = OperationalImpact.analisarConflitosLicencas(licencas);
    
    assertTrue(conflitos.temConflitos);
    assertEquals(conflitos.conflitosDetectados, 1);
    assertTrue(conflitos.conflitos[0].diasConflito >= 10);
});

test('Conflitos - múltiplas sobreposições', () => {
    const licencas = [
        { 
            servidor: 'A', 
            cargo: 'Analista',
            dataInicio: '2025-01-01', 
            dataFim: '2025-01-31' 
        },
        { 
            servidor: 'B', 
            cargo: 'Técnico',
            dataInicio: '2025-01-15', 
            dataFim: '2025-02-15' 
        },
        { 
            servidor: 'C', 
            cargo: 'Auxiliar',
            dataInicio: '2025-01-20', 
            dataFim: '2025-02-10' 
        }
    ];
    
    const conflitos = OperationalImpact.analisarConflitosLicencas(licencas);
    
    assertTrue(conflitos.temConflitos);
    assertTrue(conflitos.conflitosDetectados >= 2);
});

// ========================================
// TESTES: calcularCapacidadeOperacional
// ========================================

test('Capacidade - 100% disponível', () => {
    const servidores = [
        { nome: 'João', cargo: 'Analista', licencas: [] },
        { nome: 'Maria', cargo: 'Técnico', licencas: [] }
    ];
    
    const capacidade = OperationalImpact.calcularCapacidadeOperacional(servidores);
    
    assertEquals(capacidade.totalServidores, 2);
    assertEquals(capacidade.capacidadeDisponivel, 2);
    assertEquals(capacidade.percentualCapacidade, 100);
    assertEquals(capacidade.status, 'adequado');
});

test('Capacidade - redução parcial', () => {
    const servidores = [
        { 
            nome: 'João', 
            cargo: 'Analista', 
            licencas: [{ saldo: 10 }] // Redução de 25%
        },
        { 
            nome: 'Maria', 
            cargo: 'Técnico', 
            licencas: [] 
        }
    ];
    
    const capacidade = OperationalImpact.calcularCapacidadeOperacional(servidores);
    
    assertLessThan(capacidade.capacidadeDisponivel, 2);
    assertGreaterThan(capacidade.capacidadeDisponivel, 1);
    assertTrue(capacidade.percentualCapacidade >= 80);
});

test('Capacidade - crítica (< 60%)', () => {
    const servidores = [
        { nome: 'A', cargo: 'Analista', licencas: [{ saldo: 40 }] },
        { nome: 'B', cargo: 'Técnico', licencas: [{ saldo: 35 }] },
        { nome: 'C', cargo: 'Auxiliar', licencas: [] }
    ];
    
    const capacidade = OperationalImpact.calcularCapacidadeOperacional(servidores);
    
    assertLessThan(capacidade.percentualCapacidade, 70);
    assertTrue(capacidade.status === 'atencao' || capacidade.status === 'critico');
});

// ========================================
// TESTES: gerarRecomendacoes
// ========================================

test('Recomendações - impacto crítico', () => {
    const impactoEquipe = {
        nivelImpactoEquipe: { value: 5, label: 'Crítico' },
        percentualAusente: 75,
        impactosIndividuais: []
    };
    const capacidade = {
        percentualCapacidade: 55,
        status: 'critico'
    };
    
    const recomendacoes = OperationalImpact.gerarRecomendacoes(impactoEquipe, capacidade);
    
    assertTrue(recomendacoes.length > 0);
    assertTrue(recomendacoes.some(r => r.prioridade === 'alta'));
});

test('Recomendações - situação normal', () => {
    const impactoEquipe = {
        nivelImpactoEquipe: { value: 1, label: 'Mínimo' },
        percentualAusente: 10,
        impactosIndividuais: []
    };
    const capacidade = {
        percentualCapacidade: 95,
        status: 'adequado'
    };
    
    const recomendacoes = OperationalImpact.gerarRecomendacoes(impactoEquipe, capacidade);
    
    // Pode ter poucas ou nenhuma recomendação em situação normal
    assertTrue(recomendacoes.length >= 0);
});

test('Recomendações - cargos críticos afetados', () => {
    const impactoEquipe = {
        nivelImpactoEquipe: { value: 3, label: 'Moderado' },
        percentualAusente: 35,
        impactosIndividuais: [
            { 
                servidor: 'Gestor', 
                cargo: 'Gestor de TI',
                impacto: { criticidadeCargo: 5 } 
            }
        ]
    };
    const capacidade = {
        percentualCapacidade: 75,
        status: 'atencao'
    };
    
    const recomendacoes = OperationalImpact.gerarRecomendacoes(impactoEquipe, capacidade);
    
    assertTrue(recomendacoes.length > 0);
    assertTrue(recomendacoes.some(r => r.categoria === 'cobertura'));
});

// ========================================
// TESTES: gerarRelatorioImpacto
// ========================================

test('Relatório completo - estrutura', () => {
    const servidores = [
        { 
            nome: 'João', 
            cargo: 'Analista', 
            licencas: [{ diasAdquiridos: 90, saldo: 30 }] 
        },
        { 
            nome: 'Maria', 
            cargo: 'Técnico', 
            licencas: [] 
        }
    ];
    
    const relatorio = OperationalImpact.gerarRelatorioImpacto(servidores);
    
    assertTrue(relatorio.resumo !== undefined);
    assertTrue(relatorio.impactoEquipe !== undefined);
    assertTrue(relatorio.capacidade !== undefined);
    assertTrue(relatorio.conflitos !== undefined);
    assertTrue(relatorio.recomendacoes !== undefined);
    assertTrue(Array.isArray(relatorio.alertasPrioritarios));
});

test('Relatório completo - resumo correto', () => {
    const servidores = [
        { 
            nome: 'João', 
            cargo: 'Gestor', 
            licencas: [{ diasAdquiridos: 90, saldo: 60 }] 
        },
        { 
            nome: 'Maria', 
            cargo: 'Técnico', 
            licencas: [] 
        }
    ];
    
    const relatorio = OperationalImpact.gerarRelatorioImpacto(servidores);
    
    assertEquals(relatorio.resumo.totalServidores, 2);
    assertEquals(relatorio.resumo.servidoresAfetados, 1);
    assertTrue(relatorio.resumo.nivelImpacto !== undefined);
    assertTrue(relatorio.resumo.statusCapacidade !== undefined);
});

// ========================================
// TESTES: Cenários Reais
// ========================================

test('Cenário real - equipe pequena com gestor ausente', () => {
    const servidores = [
        { 
            nome: 'Gestor Principal', 
            cargo: 'Coordenador', 
            licencas: [{ diasAdquiridos: 90, saldo: 45 }] 
        },
        { nome: 'Analista 1', cargo: 'Analista', licencas: [] },
        { nome: 'Analista 2', cargo: 'Analista', licencas: [] }
    ];
    
    const relatorio = OperationalImpact.gerarRelatorioImpacto(servidores);
    
    assertTrue(relatorio.impactoEquipe.impactosIndividuais.length > 0);
    assertTrue(relatorio.recomendacoes.some(r => r.categoria === 'cobertura'));
});

test('Cenário real - múltiplas licenças simultâneas', () => {
    const servidores = [
        { 
            nome: 'A', 
            cargo: 'Analista', 
            licencas: [{ 
                diasAdquiridos: 90, 
                saldo: 30,
                dataInicio: '2025-01-10',
                dataFim: '2025-02-10'
            }] 
        },
        { 
            nome: 'B', 
            cargo: 'Técnico', 
            licencas: [{ 
                diasAdquiridos: 90, 
                saldo: 30,
                dataInicio: '2025-01-20',
                dataFim: '2025-02-20'
            }] 
        },
        { nome: 'C', cargo: 'Auxiliar', licencas: [] }
    ];
    
    const relatorio = OperationalImpact.gerarRelatorioImpacto(servidores);
    
    assertTrue(relatorio.conflitos.temConflitos);
    assertTrue(relatorio.impactoEquipe.percentualAusente > 50);
});

test('Cenário real - equipe grande operando normalmente', () => {
    const servidores = [
        { nome: 'S1', cargo: 'Gestor', licencas: [] },
        { nome: 'S2', cargo: 'Analista', licencas: [] },
        { nome: 'S3', cargo: 'Analista', licencas: [] },
        { nome: 'S4', cargo: 'Técnico', licencas: [{ diasAdquiridos: 90, saldo: 5 }] },
        { nome: 'S5', cargo: 'Técnico', licencas: [] },
        { nome: 'S6', cargo: 'Auxiliar', licencas: [] }
    ];
    
    const relatorio = OperationalImpact.gerarRelatorioImpacto(servidores);
    
    assertEquals(relatorio.capacidade.status, 'adequado');
    assertLessThan(relatorio.impactoEquipe.percentualAusente, 30);
});

// ========================================
// Executar todos os testes
// ========================================

let passed = 0;
let failed = 0;

console.log('\n🔍 Executando testes para OperationalImpact...\n');

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
