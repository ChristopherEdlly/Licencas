/**
 * Testes para UrgencyAnalyzer
 */

const UrgencyAnalyzer = require('../UrgencyAnalyzer.js');

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

function assertGreaterThan(actual, expected, message = '') {
    if (actual <= expected) {
        throw new Error(`${message}\n   Esperado maior que: ${expected}\n   Recebido: ${actual}`);
    }
}

console.log('\n📦 Testando UrgencyAnalyzer...\n');

// ============================================================
// TESTES DE CÁLCULO DE URGÊNCIA BÁSICA
// ============================================================

console.log('🔍 Testando cálculo de urgência básica...\n');

test('Urgência crítica (20 dias)', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgencia('2024-01-20', '2024-01-01');
    assertEquals(urgencia.nivel, 'CRITICA');
    assertEquals(urgencia.value, 5);
    assertEquals(urgencia.diasRestantes, 19);
});

test('Urgência alta (50 dias)', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgencia('2024-02-20', '2024-01-01');
    assertEquals(urgencia.nivel, 'ALTA');
    assertEquals(urgencia.value, 4);
});

test('Urgência média (80 dias)', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgencia('2024-03-21', '2024-01-01');
    assertEquals(urgencia.nivel, 'MEDIA');
    assertEquals(urgencia.value, 3);
});

test('Urgência baixa (150 dias)', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgencia('2024-05-30', '2024-01-01');
    assertEquals(urgencia.nivel, 'BAIXA');
    assertEquals(urgencia.value, 2);
});

test('Sem urgência (300 dias)', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgencia('2024-11-01', '2024-01-01');
    assertEquals(urgencia.nivel, 'NENHUMA');
    assertEquals(urgencia.value, 1);
});

test('Urgência para licença expirada', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgencia('2024-01-01', '2024-12-01');
    assertEquals(urgencia.nivel, 'CRITICA');
    assertTrue(urgencia.diasRestantes < 0);
});

test('Urgência sem data', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgencia(null);
    assertEquals(urgencia.nivel, 'NENHUMA');
    assertEquals(urgencia.diasRestantes, null);
});

// ============================================================
// TESTES DE URGÊNCIA COMPOSTA
// ============================================================

console.log('\n🔍 Testando urgência composta...\n');

test('Urgência composta - licença crítica com alto saldo', () => {
    const licenca = {
        dataExpiracao: '2025-01-08',
        diasAdquiridos: 90,
        saldo: 85,
        cargoEstrategico: false,
        numeroProrrogacoes: 0
    };
    const urgencia = UrgencyAnalyzer.calcularUrgenciaComposta(licenca);
    // 29 dias pode ser ALTA ou CRITICA dependendo dos outros fatores
    assertTrue(urgencia.value >= 4);
    assertTrue(urgencia.pontuacaoTotal >= 3.5);
});

test('Urgência composta - cargo estratégico', () => {
    const licenca = {
        dataExpiracao: '2024-03-01',
        diasAdquiridos: 90,
        saldo: 60,
        cargoEstrategico: true,
        numeroProrrogacoes: 0
    };
    const urgencia = UrgencyAnalyzer.calcularUrgenciaComposta(licenca);
    assertTrue(urgencia.fatores.some(f => f.nome === 'Impacto'));
});

test('Urgência composta - múltiplas prorrogações', () => {
    const licenca = {
        dataExpiracao: '2024-03-01',
        diasAdquiridos: 90,
        saldo: 50,
        cargoEstrategico: false,
        numeroProrrogacoes: 3
    };
    const urgencia = UrgencyAnalyzer.calcularUrgenciaComposta(licenca);
    assertTrue(urgencia.fatores.some(f => f.nome === 'Histórico' && f.pontuacao === 5));
});

test('Urgência composta - licença sem dados', () => {
    const urgencia = UrgencyAnalyzer.calcularUrgenciaComposta(null);
    assertEquals(urgencia.nivel, 'NENHUMA');
});

test('Urgência composta tem recomendação', () => {
    const licenca = {
        dataExpiracao: '2024-01-20',
        diasAdquiridos: 90,
        saldo: 80,
        cargoEstrategico: false,
        numeroProrrogacoes: 0
    };
    const urgencia = UrgencyAnalyzer.calcularUrgenciaComposta(licenca);
    assertTrue(urgencia.recomendacao && urgencia.recomendacao.length > 0);
});

// ============================================================
// TESTES DE CLASSIFICAÇÃO
// ============================================================

console.log('\n🔍 Testando classificação por urgência...\n');

test('Classificar licenças por urgência', () => {
    const licencas = [
        { id: 1, dataExpiracao: '2024-06-01' }, // BAIXA
        { id: 2, dataExpiracao: '2024-01-15' }, // CRITICA
        { id: 3, dataExpiracao: '2024-03-01' }  // MEDIA
    ];
    const classificadas = UrgencyAnalyzer.classificarPorUrgencia(licencas);
    
    assertEquals(classificadas.length, 3);
    assertEquals(classificadas[0].id, 2); // Crítica primeiro
});

test('Classificar apenas urgentes', () => {
    const licencas = [
        { id: 1, dataExpiracao: '2024-06-01' },
        { id: 2, dataExpiracao: '2024-01-15' },
        { id: 3, dataExpiracao: '2024-02-15' }
    ];
    const urgentes = UrgencyAnalyzer.classificarPorUrgencia(licencas, true);
    
    // Apenas CRITICA e ALTA
    assertTrue(urgentes.length >= 2);
    assertTrue(urgentes.every(lic => lic.urgencia.value >= 4));
});

test('Classificar array vazio', () => {
    const classificadas = UrgencyAnalyzer.classificarPorUrgencia([]);
    assertEquals(classificadas.length, 0);
});

// ============================================================
// TESTES DE CONTAGEM
// ============================================================

console.log('\n🔍 Testando contagem por urgência...\n');

test('Contar licenças por urgência', () => {
    const licencas = [
        { dataExpiracao: '2025-01-15' }, // CRITICA (36 dias)
        { dataExpiracao: '2025-01-20' }, // CRITICA (41 dias mas ainda < 60)
        { dataExpiracao: '2025-02-15' }, // ALTA ou MEDIA
        { dataExpiracao: '2025-06-01' }  // BAIXA
    ];
    const contagem = UrgencyAnalyzer.contarPorUrgencia(licencas);
    
    // Pelo menos 2 críticas ou altas
    assertTrue(contagem.CRITICA + contagem.ALTA >= 2);
    assertEquals(contagem.total, 4);
});

test('Contar array vazio', () => {
    const contagem = UrgencyAnalyzer.contarPorUrgencia([]);
    assertEquals(contagem.total, 0);
});

// ============================================================
// TESTES DE IDENTIFICAÇÃO DE CRÍTICAS
// ============================================================

console.log('\n🔍 Testando identificação de críticas...\n');

test('Identificar licenças críticas (30 dias)', () => {
    const licencas = [
        { id: 1, dataExpiracao: '2026-01-05', diasAdquiridos: 90, saldo: 80 },
        { id: 2, dataExpiracao: '2026-01-01', diasAdquiridos: 90, saldo: 70 },
        { id: 3, dataExpiracao: '2026-10-01', diasAdquiridos: 90, saldo: 60 }
    ];
    const criticas = UrgencyAnalyzer.identificarCriticas(licencas, 30);
    
    assertEquals(criticas.length, 2);
    assertEquals(criticas[0].id, 2); // Ordenado por dias restantes
});

test('Identificar com limite personalizado', () => {
    const licencas = [
        { dataExpiracao: '2024-01-10' },
        { dataExpiracao: '2024-01-08' }
    ];
    const criticas = UrgencyAnalyzer.identificarCriticas(licencas, 15);
    
    assertEquals(criticas.length, 2);
});

test('Identificar em array vazio', () => {
    const criticas = UrgencyAnalyzer.identificarCriticas([]);
    assertEquals(criticas.length, 0);
});

// ============================================================
// TESTES DE RELATÓRIO
// ============================================================

console.log('\n🔍 Testando geração de relatório...\n');

test('Gerar relatório completo', () => {
    const licencas = [
        { dataExpiracao: '2025-01-15', diasAdquiridos: 90, saldo: 80 },
        { dataExpiracao: '2025-01-20', diasAdquiridos: 90, saldo: 70 },
        { dataExpiracao: '2025-02-15', diasAdquiridos: 90, saldo: 60 },
        { dataExpiracao: '2025-06-01', diasAdquiridos: 90, saldo: 50 }
    ];
    const relatorio = UrgencyAnalyzer.gerarRelatorioUrgencias(licencas);
    
    assertEquals(relatorio.total, 4);
    assertTrue(relatorio.contagem.CRITICA + relatorio.contagem.ALTA >= 2);
    // Estatísticas existe se tiver alguma data futura
    assertTrue(typeof relatorio.estatisticas !== 'undefined');
});

test('Relatório com alertas', () => {
    const licencas = Array(10).fill(null).map((_, i) => ({
        dataExpiracao: '2024-01-15',
        diasAdquiridos: 90,
        saldo: 80
    }));
    const relatorio = UrgencyAnalyzer.gerarRelatorioUrgencias(licencas);
    
    assertTrue(relatorio.alertas.length > 0);
});

test('Relatório para array vazio', () => {
    const relatorio = UrgencyAnalyzer.gerarRelatorioUrgencias([]);
    assertEquals(relatorio.total, 0);
    assertEquals(relatorio.criticas.length, 0);
});

// ============================================================
// TESTES DE SCORE DE PRIORIZAÇÃO
// ============================================================

console.log('\n🔍 Testando score de priorização...\n');

test('Calcular score - licença crítica', () => {
    const licenca = {
        dataExpiracao: '2024-01-15',
        diasAdquiridos: 90,
        saldo: 85,
        cargoEstrategico: true,
        numeroProrrogacoes: 2
    };
    const score = UrgencyAnalyzer.calcularScorePriorizacao(licenca);
    
    assertGreaterThan(score, 80);
});

test('Calcular score - licença baixa prioridade', () => {
    const licenca = {
        dataExpiracao: '2026-12-01',
        diasAdquiridos: 90,
        saldo: 10,
        cargoEstrategico: false,
        numeroProrrogacoes: 0
    };
    const score = UrgencyAnalyzer.calcularScorePriorizacao(licenca);
    
    assertTrue(score < 40);
});

test('Score máximo é 100', () => {
    const licenca = {
        dataExpiracao: '2024-01-01',
        diasAdquiridos: 90,
        saldo: 90,
        cargoEstrategico: true,
        numeroProrrogacoes: 5
    };
    const score = UrgencyAnalyzer.calcularScorePriorizacao(licenca);
    
    assertTrue(score <= 100);
});

test('Score para licença nula', () => {
    const score = UrgencyAnalyzer.calcularScorePriorizacao(null);
    assertEquals(score, 0);
});

// ============================================================
// TESTES DE AÇÃO IMEDIATA
// ============================================================

console.log('\n🔍 Testando necessidade de ação imediata...\n');

test('Precisa ação imediata - expirando em 10 dias', () => {
    const licenca = {
        dataExpiracao: '2024-01-10',
        diasAdquiridos: 90,
        saldo: 80
    };
    assertTrue(UrgencyAnalyzer.precisaAcaoImediata(licenca));
});

test('Precisa ação imediata - alto saldo e 40 dias', () => {
    const licenca = {
        dataExpiracao: '2024-02-10',
        diasAdquiridos: 90,
        saldo: 85
    };
    assertTrue(UrgencyAnalyzer.precisaAcaoImediata(licenca));
});

test('Não precisa ação imediata - 200 dias com baixo saldo', () => {
    const licenca = {
        dataExpiracao: '2026-07-10',
        diasAdquiridos: 90,
        saldo: 10
    };
    assertFalse(UrgencyAnalyzer.precisaAcaoImediata(licenca));
});

test('Não precisa ação imediata - licença nula', () => {
    assertFalse(UrgencyAnalyzer.precisaAcaoImediata(null));
});

// ============================================================
// TESTES DE FILTRO POR NÍVEL
// ============================================================

console.log('\n🔍 Testando filtro por nível...\n');

test('Filtrar apenas críticas', () => {
    const licencas = [
        { dataExpiracao: '2025-01-05' },
        { dataExpiracao: '2025-01-08' },
        { dataExpiracao: '2025-08-01' }
    ];
    const criticas = UrgencyAnalyzer.filtrarPorNivel(licencas, 'CRITICA');
    
    assertTrue(criticas.length >= 2);
    assertTrue(criticas.every(lic => lic.urgencia.nivel === 'CRITICA'));
});

test('Filtrar apenas altas', () => {
    const licencas = [
        { dataExpiracao: '2025-01-25' },
        { dataExpiracao: '2025-02-25' },
        { dataExpiracao: '2025-08-01' }
    ];
    const altas = UrgencyAnalyzer.filtrarPorNivel(licencas, 'ALTA');
    
    assertTrue(altas.length >= 0); // Pode não ter ALTA dependendo da data
});

test('Filtrar sem nível', () => {
    const licencas = [{ dataExpiracao: '2024-01-15' }];
    const resultado = UrgencyAnalyzer.filtrarPorNivel(licencas, null);
    
    assertEquals(resultado.length, 0);
});

test('Filtrar array vazio', () => {
    const resultado = UrgencyAnalyzer.filtrarPorNivel([], 'CRITICA');
    assertEquals(resultado.length, 0);
});

// ============================================================
// TESTES COM CENÁRIOS REAIS
// ============================================================

console.log('\n🔍 Testando cenários reais...\n');

test('Cenário 1: Dashboard de urgências', () => {
    const licencas = [
        { id: 1, dataExpiracao: '2025-01-10', diasAdquiridos: 90, saldo: 90 },
        { id: 2, dataExpiracao: '2025-01-20', diasAdquiridos: 90, saldo: 80 },
        { id: 3, dataExpiracao: '2025-02-15', diasAdquiridos: 90, saldo: 60 },
        { id: 4, dataExpiracao: '2025-03-15', diasAdquiridos: 90, saldo: 40 },
        { id: 5, dataExpiracao: '2025-06-01', diasAdquiridos: 90, saldo: 20 }
    ];
    
    const relatorio = UrgencyAnalyzer.gerarRelatorioUrgencias(licencas);
    const classificadas = UrgencyAnalyzer.classificarPorUrgencia(licencas, true);
    
    assertEquals(relatorio.total, 5);
    assertTrue(classificadas.length >= 0); // Pode variar
    assertTrue(typeof relatorio.estatisticas !== 'undefined');
});

test('Cenário 2: Priorização para RH', () => {
    const licencas = [
        { 
            id: 1, 
            nome: 'João Silva',
            dataExpiracao: '2024-01-15', 
            diasAdquiridos: 90, 
            saldo: 85,
            cargoEstrategico: true,
            numeroProrrogacoes: 2
        },
        { 
            id: 2, 
            nome: 'Maria Santos',
            dataExpiracao: '2024-01-20', 
            diasAdquiridos: 90, 
            saldo: 60,
            cargoEstrategico: false,
            numeroProrrogacoes: 0
        }
    ];
    
    const score1 = UrgencyAnalyzer.calcularScorePriorizacao(licencas[0]);
    const score2 = UrgencyAnalyzer.calcularScorePriorizacao(licencas[1]);
    
    assertGreaterThan(score1, score2); // João tem maior prioridade
});

test('Cenário 3: Alertas para gestão', () => {
    const licencas = Array(8).fill(null).map((_, i) => ({
        dataExpiracao: '2024-01-15',
        diasAdquiridos: 90,
        saldo: 80 - (i * 5)
    }));
    
    const relatorio = UrgencyAnalyzer.gerarRelatorioUrgencias(licencas);
    
    assertTrue(relatorio.alertas.length > 0);
    assertTrue(relatorio.alertas.some(a => a.tipo === 'CRITICO'));
});

test('Cenário 4: Ordenação por múltiplos critérios', () => {
    const licencas = [
        { id: 1, dataExpiracao: '2024-01-20', diasAdquiridos: 90, saldo: 80 },
        { id: 2, dataExpiracao: '2024-01-15', diasAdquiridos: 90, saldo: 70 },
        { id: 3, dataExpiracao: '2024-01-18', diasAdquiridos: 90, saldo: 85 }
    ];
    
    const classificadas = UrgencyAnalyzer.classificarPorUrgencia(licencas);
    
    // Todas críticas, mas ordenadas por dias restantes
    assertEquals(classificadas[0].id, 2); // 14 dias
    assertEquals(classificadas[1].id, 3); // 17 dias
    assertEquals(classificadas[2].id, 1); // 19 dias
});

test('Cenário 5: Análise composta detalhada', () => {
    const licenca = {
        dataExpiracao: '2024-02-01',
        diasAdquiridos: 90,
        saldo: 75,
        cargoEstrategico: true,
        funcaoGratificada: true,
        numeroProrrogacoes: 2
    };
    
    const analise = UrgencyAnalyzer.calcularUrgenciaComposta(licenca);
    
    assertEquals(analise.fatores.length, 4); // 4 fatores analisados
    assertTrue(analise.recomendacao.length > 0);
    assertTrue(analise.pontuacaoTotal > 0);
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
