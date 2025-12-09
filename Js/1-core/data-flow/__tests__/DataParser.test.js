/**
 * Teste para DataParser
 * Execute: node js/1-core/data-flow/__tests__/DataParser.test.js
 */

const DataParser = require('../DataParser.js');

console.log('🧪 Iniciando testes do DataParser\n');
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
        console.log('Stack:', error.stack);
    }
}

function assertEquals(actual, expected, message = '') {
    if (actual !== expected) {
        throw new Error(`${message}\n  Esperado: ${expected}\n  Recebido: ${actual}`);
    }
}

function assertGreaterThan(actual, min, message = '') {
    if (actual <= min) {
        throw new Error(`${message}\n  Esperado: > ${min}\n  Recebido: ${actual}`);
    }
}

function assertArrayLength(arr, expected, message = '') {
    if (!Array.isArray(arr)) {
        throw new Error(`${message}\n  Não é um array: ${typeof arr}`);
    }
    if (arr.length !== expected) {
        throw new Error(`${message}\n  Esperado length: ${expected}\n  Recebido: ${arr.length}`);
    }
}

function assertTrue(condition, message = '') {
    if (!condition) {
        throw new Error(`${message}\n  Esperado: true\n  Recebido: false`);
    }
}

// ==================== CSV DE EXEMPLO (DADOS REAIS) ====================
const csvExample = `NUMERO,EMISSAO,UNIDADE,LOTACAO,NOME,CARGO,REF,CPF,RG,AQUISITIVO_INICIO,AQUISITIVO_FIM,A_PARTIR,TERMINO,RESTANDO,GOZO
,,SEFAZ,GERPLAF - Gerência de Planejamento Fiscal,ABILIO CASTANHEIRA ANTUNES BATISTA,AUD. FISCAL TRIBUTARIO,,,,,,,1899-12-30 00:00:00,,0
,,SEFAZ,"GECAP - Gerência de Suporte, Controle e Acompanhamento de Processos",ACACIA CHAVES DA SILVA COSTA,OFICIAL ADMINISTRATIVO,,,,1998-11-16 00:00:00,2003-11-14 00:00:00,2018-11-26 00:00:00,2018-12-25 00:00:00,0(DIAS),30
,,SEFAZ,"GECAP - Gerência de Suporte, Controle e Acompanhamento de Processos",ACACIA CHAVES DA SILVA COSTA,OFICIAL ADMINISTRATIVO,,,,2008-11-13 00:00:00,2013-11-12 00:00:00,2020-11-30 00:00:00,2021-01-28 00:00:00,30(DIAS),60
,,SEFAZ,"GECAP - Gerência de Suporte, Controle e Acompanhamento de Processos",ACACIA CHAVES DA SILVA COSTA,OFICIAL ADMINISTRATIVO,,,,2008-11-13 00:00:00,2013-11-12 00:00:00,2022-11-28 00:00:00,2022-12-27 00:00:00,0(DIAS),30`;

// CSV simples para testes básicos
const csvSimple = `Nome,Idade,Cidade
João Silva,30,São Paulo
Maria Santos,25,Rio de Janeiro
Pedro Costa,35,Brasília`;

// CSV com aspas e vírgulas
const csvComplex = `Nome,Descrição,Valor
"Silva, João",Professor de "Matemática",1000
Maria,"Diretora da Escola ""Central""",2000`;

// ==================== TESTES DE PARSE BÁSICO ====================
console.log('\n' + '='.repeat(60));
console.log('📄 TESTES DE PARSE BÁSICO DE CSV');
console.log('='.repeat(60));

test('Parse CSV simples deve retornar 3 registros', () => {
    const result = DataParser.parseCSV(csvSimple);
    assertArrayLength(result, 3, 'Número de registros');
});

test('Parse CSV deve extrair headers corretamente', () => {
    const result = DataParser.parseCSV(csvSimple);
    assertTrue(result[0].hasOwnProperty('Nome'), 'Deve ter header "Nome"');
    assertTrue(result[0].hasOwnProperty('Idade'), 'Deve ter header "Idade"');
    assertTrue(result[0].hasOwnProperty('Cidade'), 'Deve ter header "Cidade"');
});

test('Parse CSV deve extrair valores corretamente', () => {
    const result = DataParser.parseCSV(csvSimple);
    assertEquals(result[0].Nome, 'João Silva', 'Nome do primeiro registro');
    assertEquals(result[0].Idade, '30', 'Idade do primeiro registro');
    assertEquals(result[0].Cidade, 'São Paulo', 'Cidade do primeiro registro');
});

test('Parse CSV com aspas deve funcionar', () => {
    const result = DataParser.parseCSV(csvComplex);
    assertArrayLength(result, 2, 'Número de registros');
    assertEquals(result[0].Nome, 'Silva, João', 'Nome com vírgula');
    assertTrue(result[0].Descrição.includes('Matemática'), 'Descrição com aspas internas');
});

test('Parse CSV vazio deve retornar array vazio', () => {
    const result = DataParser.parseCSV('');
    assertArrayLength(result, 0, 'Array vazio');
});

test('Parse CSV com apenas headers deve retornar array vazio', () => {
    const result = DataParser.parseCSV('Nome,Idade,Cidade');
    assertArrayLength(result, 0, 'Sem dados');
});

// ==================== TESTES COM DADOS REAIS ====================
console.log('\n' + '='.repeat(60));
console.log('📊 TESTES COM CSV REAL (LICENÇAS)');
console.log('='.repeat(60));

test('Parse CSV real deve retornar 4 registros', () => {
    const result = DataParser.parseCSV(csvExample);
    assertArrayLength(result, 4, 'Número de registros do CSV real');
});

test('Parse CSV real deve ter todos os headers', () => {
    const result = DataParser.parseCSV(csvExample);
    const headers = Object.keys(result[0]);
    
    assertTrue(headers.includes('NOME'), 'Deve ter header NOME');
    assertTrue(headers.includes('CARGO'), 'Deve ter header CARGO');
    assertTrue(headers.includes('LOTACAO'), 'Deve ter header LOTACAO');
    assertTrue(headers.includes('AQUISITIVO_INICIO'), 'Deve ter header AQUISITIVO_INICIO');
    assertTrue(headers.includes('GOZO'), 'Deve ter header GOZO');
});

test('Parse CSV real deve extrair nomes corretamente', () => {
    const result = DataParser.parseCSV(csvExample);
    assertEquals(result[0].NOME, 'ABILIO CASTANHEIRA ANTUNES BATISTA', 'Nome do primeiro servidor');
    assertEquals(result[1].NOME, 'ACACIA CHAVES DA SILVA COSTA', 'Nome do segundo servidor');
});

test('Parse CSV real deve lidar com aspas em LOTACAO', () => {
    const result = DataParser.parseCSV(csvExample);
    // A lotação tem vírgula, então deve estar entre aspas no CSV
    assertTrue(result[1].LOTACAO.includes('GECAP'), 'Lotação com vírgula');
});

// ==================== TESTES DE MAPEAMENTO DE HEADERS ====================
console.log('\n' + '='.repeat(60));
console.log('🗺️  TESTES DE MAPEAMENTO DE HEADERS');
console.log('='.repeat(60));

test('Mapear header "NOME" deve retornar "nome"', () => {
    const headers = ['NOME', 'CARGO', 'LOTACAO'];
    const map = DataParser.mapHeaders(headers);
    assertEquals(map.NOME, 'nome', 'Mapeamento de NOME');
});

test('Mapear header "Nome Servidor" deve retornar "nome"', () => {
    const headers = ['Nome Servidor', 'Cargo', 'Unidade'];
    const map = DataParser.mapHeaders(headers);
    assertEquals(map['Nome Servidor'], 'nome', 'Mapeamento de Nome Servidor');
});

test('Mapear header desconhecido deve normalizar', () => {
    const headers = ['CAMPO CUSTOMIZADO'];
    const map = DataParser.mapHeaders(headers);
    assertEquals(map['CAMPO CUSTOMIZADO'], 'campo_customizado', 'Normalização de header desconhecido');
});

// ==================== TESTES DE NORMALIZAÇÃO ====================
console.log('\n' + '='.repeat(60));
console.log('🔄 TESTES DE NORMALIZAÇÃO DE DADOS');
console.log('='.repeat(60));

test('Normalizar dados deve usar header map', () => {
    const data = [{ 'NOME': 'João', 'CARGO': 'Analista' }];
    const headerMap = { 'NOME': 'nome', 'CARGO': 'cargo' };
    const result = DataParser.normalizeData(data, headerMap);
    
    assertTrue(result[0].hasOwnProperty('nome'), 'Deve ter propriedade "nome"');
    assertTrue(result[0].hasOwnProperty('cargo'), 'Deve ter propriedade "cargo"');
    assertEquals(result[0].nome, 'João', 'Valor do nome');
});

// ==================== TESTES DO PIPELINE COMPLETO ====================
console.log('\n' + '='.repeat(60));
console.log('⚙️  TESTES DO PIPELINE COMPLETO');
console.log('='.repeat(60));

test('Pipeline completo deve processar CSV simples', () => {
    const result = DataParser.parse(csvSimple);
    assertArrayLength(result, 3, 'Número de registros');
    assertTrue(result[0].hasOwnProperty('nome'), 'Headers normalizados');
});

test('Pipeline completo deve processar CSV real', () => {
    const result = DataParser.parse(csvExample);
    assertArrayLength(result, 4, 'Número de registros do CSV real');
    assertTrue(result[0].hasOwnProperty('nome'), 'Header NOME normalizado');
    assertTrue(result[0].hasOwnProperty('cargo'), 'Header CARGO normalizado');
});

// ==================== TESTES DE PARSE DE LICENÇAS ====================
console.log('\n' + '='.repeat(60));
console.log('📅 TESTES DE PARSE DE LICENÇAS PRÊMIO');
console.log('='.repeat(60));

test('Parse "jan/2025 a dez/2025" deve retornar período', () => {
    const result = DataParser.parseLicencasPremio('jan/2025 a dez/2025');
    assertArrayLength(result, 1, 'Um período');
    assertEquals(result[0].inicio.getMonth(), 0, 'Mês inicial (janeiro)');
    assertEquals(result[0].fim.getMonth(), 11, 'Mês final (dezembro)');
});

test('Parse múltiplos períodos separados por vírgula', () => {
    const result = DataParser.parseLicencasPremio('jan/2024 a jun/2024, jul/2024 a dez/2024');
    assertArrayLength(result, 2, 'Dois períodos');
});

test('Parse com separador "-" deve funcionar', () => {
    const result = DataParser.parseLicencasPremio('01/2025 - 12/2025');
    assertArrayLength(result, 1, 'Um período');
});

test('Parse string vazia deve retornar array vazio', () => {
    const result = DataParser.parseLicencasPremio('');
    assertArrayLength(result, 0, 'Array vazio');
});

// ==================== TESTE DE PERFORMANCE ====================
console.log('\n' + '='.repeat(60));
console.log('⚡ TESTE DE PERFORMANCE');
console.log('='.repeat(60));

test('Parse de CSV grande (100 linhas) deve ser rápido', () => {
    // Gerar CSV com 100 linhas
    let largeCsv = 'Nome,Cargo,Cidade\n';
    for (let i = 0; i < 100; i++) {
        largeCsv += `Pessoa ${i},Cargo ${i},Cidade ${i}\n`;
    }
    
    const start = Date.now();
    const result = DataParser.parse(largeCsv);
    const duration = Date.now() - start;
    
    assertArrayLength(result, 100, '100 registros');
    console.log(`  ⏱️  Tempo de parse: ${duration}ms`);
    assertTrue(duration < 1000, `Deve ser rápido (< 1000ms), foi ${duration}ms`);
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
