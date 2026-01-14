/**
 * smartEnrich.js - Enriquecimento INTELIGENTE com dados reais
 *
 * Usa códigos/siglas reais dos arquivos .txt
 * Permite revisão manual antes de aplicar
 */

const fs = require('fs');
const path = require('path');

const TABELA_FILE = path.join(__dirname, 'tabela.csv');
const GERENCIA_FILE = path.join(__dirname, 'Gerencia.txt');
const SUPERINTENDENCIA_FILE = path.join(__dirname, 'Superintendencia.txt');
const OUTPUT_FILE = path.join(__dirname, 'sugestoes_enriquecimento.json');

/**
 * Remove BOM
 */
function removeBOM(str) {
    if (str.charCodeAt(0) === 0xFEFF) return str.slice(1);
    return str;
}

/**
 * Parse linha com formato: "CODIGO - Nome Completo"
 */
function parseLinha(linha) {
    linha = linha.trim();
    if (!linha) return null;

    // Formato: "CODIGO - Nome" ou "CODIGO/SIGLA - Nome"
    const match = linha.match(/^([A-Z0-9\/]+)\s*-\s*(.+)$/);
    if (!match) return null;

    const [, codigo, nome] = match;

    return {
        codigo: codigo.trim(),
        sigla: codigo.trim(),
        nome: nome.trim(),
        original: linha
    };
}

/**
 * Carrega tabela atual
 */
function carregarTabelaAtual() {
    const content = removeBOM(fs.readFileSync(TABELA_FILE, 'utf-8'));
    const rows = content.split('\n').map(l => l.trim()).filter(l => l);

    const lotacoes = new Map();
    const codigos = new Set();

    // Pular cabeçalho
    for (let i = 1; i < rows.length; i++) {
        const parts = rows[i].split(',');
        if (parts.length >= 3) {
            const codigo = parts[0].trim();
            const nome = parts[2].replace(/^"|"$/g, '').trim();

            codigos.add(codigo);
            lotacoes.set(codigo, {
                codigo,
                sigla: parts[1].trim(),
                nome,
                tipo: parts[3] || '',
                superior: parts[4] || ''
            });
        }
    }

    return { lotacoes, codigos };
}

/**
 * Carrega arquivo de lotações (.txt)
 */
function carregarArquivoLotacoes(filePath, tipo) {
    if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ Arquivo não encontrado: ${filePath}`);
        return [];
    }

    const content = removeBOM(fs.readFileSync(filePath, 'utf-8'));
    const lines = content.split('\n');

    const lotacoes = [];

    lines.forEach(linha => {
        const parsed = parseLinha(linha);
        if (parsed) {
            lotacoes.push({
                ...parsed,
                tipo,
                sugeridoPor: path.basename(filePath)
            });
        }
    });

    return lotacoes;
}

/**
 * Identifica tipo baseado no nome
 */
function identificarTipo(nome) {
    const nomeUpper = nome.toUpperCase();

    if (nomeUpper.includes('SUPERINTENDÊNCIA') || nomeUpper.includes('SUPERINTENDENCIA'))
        return 'Superintendência';
    if (nomeUpper.includes('GERÊNCIA') || nomeUpper.includes('GERENCIA'))
        return 'Gerência';
    if (nomeUpper.includes('ASSESSORIA'))
        return 'Assessoria';
    if (nomeUpper.includes('CONTADORIA'))
        return 'Gerência';
    if (nomeUpper.includes('CENTRO DE ATENDIMENTO') || nomeUpper.includes('CEAC'))
        return 'CEAC';
    if (nomeUpper.includes('UNIDADE'))
        return 'Unidade';

    return 'Unidade';
}

/**
 * Sugere superior baseado no tipo
 */
function sugerirSuperior(lotacao, tabelaAtual) {
    const tipo = lotacao.tipo;

    // Gerências geralmente estão sob Superintendências
    if (tipo === 'Gerência') {
        // Tentar mapear por padrão de nome
        const nome = lotacao.nome.toUpperCase();

        if (nome.includes('FISCAL') || nome.includes('TRIBUTAR') || nome.includes('ARRECADA'))
            return 'SUPLAF';
        if (nome.includes('AUDIT') || nome.includes('FISCALIZA'))
            return 'SUFI';
        if (nome.includes('CRÉDIT') || nome.includes('CONTENCIOSO') || nome.includes('DÍVIDA'))
            return 'SUCOF';
        if (nome.includes('FINAN') || nome.includes('TESOUR'))
            return 'SUFIP';
        if (nome.includes('PESSOAL') || nome.includes('ADMINIST'))
            return 'SUPAG';
        if (nome.includes('TECNOLOGIA') || nome.includes('INFORM'))
            return 'SUTEC';
        if (nome.includes('PLANEJAMENTO') || nome.includes('PROJETO'))
            return 'SUPLAN';

        return ''; // Deixar vazio para revisão manual
    }

    // Superintendências estão sob Subsecretarias
    if (tipo === 'Superintendência') {
        const nome = lotacao.nome.toUpperCase();

        if (nome.includes('RECEITA') || nome.includes('FISCAL') || nome.includes('TRIBUT'))
            return 'SURE';
        if (nome.includes('TESOUR') || nome.includes('FINANÇAS'))
            return 'STE';
        if (nome.includes('GOVERN') || nome.includes('TECNOLOGIA') || nome.includes('ADMIN'))
            return 'SUGT';

        return ''; // Deixar vazio para revisão manual
    }

    // CEACs estão sob SUFI
    if (tipo === 'CEAC') {
        return 'SUFI';
    }

    return '';
}

/**
 * Main
 */
function main() {
    console.log('🔄 Carregando tabela atual...');
    const { lotacoes: tabelaAtual, codigos: codigosExistentes } = carregarTabelaAtual();
    console.log(`✅ ${tabelaAtual.size} lotações existentes`);

    console.log('\n🔄 Carregando arquivos de lotações...');

    const gerencias = carregarArquivoLotacoes(GERENCIA_FILE, 'Gerência');
    console.log(`   Gerencias: ${gerencias.length}`);

    const superintendencias = carregarArquivoLotacoes(SUPERINTENDENCIA_FILE, 'Superintendência');
    console.log(`   Superintendências: ${superintendencias.length}`);

    const todasLotacoes = [...gerencias, ...superintendencias];
    console.log(`✅ Total extraído: ${todasLotacoes.length}`);

    console.log('\n🔄 Filtrando lotações novas...');
    const novas = todasLotacoes.filter(lot => !codigosExistentes.has(lot.codigo));
    console.log(`✅ ${novas.length} lotações novas encontradas`);

    if (novas.length === 0) {
        console.log('\n✅ Nenhuma lotação nova para adicionar!');
        return;
    }

    // Ajustar tipo se necessário
    novas.forEach(lot => {
        if (!lot.tipo || lot.tipo === '') {
            lot.tipo = identificarTipo(lot.nome);
        }
    });

    // Sugerir superior
    novas.forEach(lot => {
        lot.superiorSugerido = sugerirSuperior(lot, tabelaAtual);
        lot.superior = lot.superiorSugerido; // Usar sugestão como padrão
    });

    console.log('\n📋 Amostra de novas lotações:');
    novas.slice(0, 10).forEach(lot => {
        console.log(`  ${lot.codigo.padEnd(12)} ${lot.tipo.padEnd(18)} ${lot.nome.substring(0, 50)}`);
        if (lot.superior) {
            console.log(`  ${''.padEnd(12)} → Superior: ${lot.superior}`);
        }
    });

    // Salvar sugestões em JSON para revisão
    const output = {
        timestamp: new Date().toISOString(),
        totalExistentes: tabelaAtual.size,
        totalNovas: novas.length,
        sugestoes: novas.map(lot => ({
            codigo: lot.codigo,
            sigla: lot.sigla,
            nome: lot.nome,
            tipo: lot.tipo,
            superior: lot.superior,
            sugeridoPor: lot.sugeridoPor,
            original: lot.original,
            status: 'pendente', // pendente, aprovado, rejeitado
            observacoes: ''
        }))
    };

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    console.log(`\n✅ Sugestões salvas em: ${OUTPUT_FILE}`);
    console.log('\n📝 Próximos passos:');
    console.log('   1. Abra sugestoes_enriquecimento.json');
    console.log('   2. Revise cada entrada (código, nome, tipo, superior)');
    console.log('   3. Marque status como "aprovado" ou "rejeitado"');
    console.log('   4. Execute: node applyEnrichment.js para aplicar');
}

try {
    main();
} catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
}
