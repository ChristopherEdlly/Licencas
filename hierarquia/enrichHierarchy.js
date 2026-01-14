/**
 * enrichHierarchy.js - Enriquece tabela.csv com dados de hierarquia.csv
 *
 * Uso: node enrichHierarchy.js
 */

const fs = require('fs');
const path = require('path');

// Configuração
const HIERARQUIA_FILE = path.join(__dirname, 'hierarquia.csv');
const TABELA_FILE = path.join(__dirname, 'tabela.csv');
const OUTPUT_FILE = path.join(__dirname, 'tabela_enriquecida.csv');

/**
 * Remove BOM (Byte Order Mark) do início de strings
 */
function removeBOM(str) {
    if (str.charCodeAt(0) === 0xFEFF) {
        return str.slice(1);
    }
    return str;
}

/**
 * Parse CSV simples
 */
function parseCSV(content) {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    const rows = lines.map(line => {
        // Split por tab
        return line.split('\t').map(cell => cell.trim());
    });
    return rows;
}

/**
 * Normaliza nome de lotação para criar código
 */
function normalizarParaCodigo(nome) {
    if (!nome) return '';

    // Remover prefixos comuns
    let normalized = nome
        .replace(/^(CEAC|Gerência|Superintendência|Subsecretaria|Coordenadoria|POSTO FISCAL|Gabinete)\s+/i, '')
        .trim();

    // Pegar primeiras letras ou sigla se já tiver
    const match = nome.match(/^([A-Z]{2,})/);
    if (match) {
        return match[1];
    }

    // Criar sigla a partir do nome
    const palavras = normalized.split(/[\s-_/]+/);
    if (palavras.length === 1) {
        return palavras[0].substring(0, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    // Pegar primeiras letras de cada palavra
    const sigla = palavras
        .filter(p => p.length > 2 || /^[0-9]+$/.test(p)) // Ignorar palavras pequenas exceto números
        .map(p => p[0])
        .join('')
        .toUpperCase();

    return sigla.substring(0, 10);
}

/**
 * Identifica tipo de lotação baseado no nome
 */
function identificarTipo(nome) {
    const nomeUpper = nome.toUpperCase();

    if (nomeUpper.includes('SUBSECRETARIA')) return 'Subsecretaria';
    if (nomeUpper.includes('SUPERINTENDÊNCIA') || nomeUpper.includes('SUPERINTENDENCIA')) return 'Superintendência';
    if (nomeUpper.includes('COORDENADORIA')) return 'Coordenadoria';
    if (nomeUpper.includes('GERÊNCIA') || nomeUpper.includes('GERENCIA')) return 'Gerência';
    if (nomeUpper.includes('CEAC')) return 'CEAC';
    if (nomeUpper.includes('POSTO FISCAL') || nomeUpper.includes('POSTO')) return 'Posto Fiscal';
    if (nomeUpper.includes('CENTRAL DE COMANDO')) return 'Unidade';
    if (nomeUpper.includes('GABINETE')) return 'Gabinete';
    if (nomeUpper.includes('ASSESSORIA')) return 'Assessoria';
    if (nomeUpper.includes('SECRETARIA DE ESTADO')) return 'Secretaria';
    if (nomeUpper.includes('CONSELHO')) return 'Conselho';

    return 'Unidade';
}

/**
 * Carrega tabela atual
 */
function carregarTabelaAtual() {
    const content = fs.readFileSync(TABELA_FILE, 'utf-8');
    const cleanContent = removeBOM(content);
    const rows = cleanContent.split('\n').map(line => line.trim()).filter(line => line);

    const lotacoes = new Map();

    // Pular cabeçalho
    for (let i = 1; i < rows.length; i++) {
        const parts = rows[i].split(',');
        if (parts.length >= 3) {
            const codigo = parts[0].trim();
            const nome = parts[2].replace(/^"|"$/g, '').trim(); // Remover aspas
            lotacoes.set(nome.toUpperCase(), {
                codigo,
                sigla: parts[1].trim(),
                nome: parts[2].replace(/^"|"$/g, '').trim(),
                tipo: parts[3] || '',
                superior: parts[4] || ''
            });
        }
    }

    return lotacoes;
}

/**
 * Extrai lotações de hierarquia.csv
 */
function extrairLotacoes() {
    const content = fs.readFileSync(HIERARQUIA_FILE, 'utf-8');
    const cleanContent = removeBOM(content);
    const rows = parseCSV(cleanContent);

    const lotacoesExtraidas = [];

    rows.forEach((row, idx) => {
        if (idx === 0) return; // Pular cabeçalho

        const [subsecretaria, superintendencia, gerencia] = row;

        // Adicionar cada nível da hierarquia
        if (subsecretaria && subsecretaria.trim()) {
            lotacoesExtraidas.push({
                nome: subsecretaria.trim(),
                nivel: 1,
                superior: 'SEFAZ'
            });
        }

        if (superintendencia && superintendencia.trim()) {
            lotacoesExtraidas.push({
                nome: superintendencia.trim(),
                nivel: 2,
                superior: subsecretaria.trim()
            });
        }

        if (gerencia && gerencia.trim()) {
            lotacoesExtraidas.push({
                nome: gerencia.trim(),
                nivel: 3,
                superior: superintendencia.trim() || subsecretaria.trim()
            });
        }
    });

    return lotacoesExtraidas;
}

/**
 * Mescla lotações
 */
function mesclarLotacoes(tabelaAtual, lotacoesExtraidas) {
    const novasLotacoes = [];
    const codigosUsados = new Set([...tabelaAtual.values()].map(l => l.codigo));

    lotacoesExtraidas.forEach(lotacao => {
        const nomeKey = lotacao.nome.toUpperCase();

        // Se já existe, pular
        if (tabelaAtual.has(nomeKey)) {
            return;
        }

        // Criar novo registro
        let codigo = normalizarParaCodigo(lotacao.nome);

        // Garantir código único
        let tentativa = 1;
        let codigoOriginal = codigo;
        while (codigosUsados.has(codigo)) {
            codigo = `${codigoOriginal}${tentativa}`;
            tentativa++;
        }
        codigosUsados.add(codigo);

        // Identificar superior
        let superiorCodigo = '';
        if (lotacao.superior) {
            const superiorKey = lotacao.superior.toUpperCase();
            const superiorLotacao = tabelaAtual.get(superiorKey);
            if (superiorLotacao) {
                superiorCodigo = superiorLotacao.codigo;
            } else {
                // Tentar encontrar por código
                superiorCodigo = normalizarParaCodigo(lotacao.superior);
            }
        }

        const tipo = identificarTipo(lotacao.nome);

        novasLotacoes.push({
            codigo,
            sigla: codigo,
            nome: lotacao.nome,
            tipo,
            superior: superiorCodigo
        });
    });

    return novasLotacoes;
}

/**
 * Gera CSV enriquecido
 */
function gerarCSVEnriquecido(tabelaAtual, novasLotacoes) {
    const todasLotacoes = [
        ...tabelaAtual.values(),
        ...novasLotacoes
    ];

    // Ordenar por código
    todasLotacoes.sort((a, b) => a.codigo.localeCompare(b.codigo));

    // Gerar CSV
    let csv = 'Código,Sigla,Nome da Lotação,Tipo,Superior\n';

    todasLotacoes.forEach(lotacao => {
        const nome = lotacao.nome.includes(',') ? `"${lotacao.nome}"` : lotacao.nome;
        csv += `${lotacao.codigo},${lotacao.sigla},${nome},${lotacao.tipo},${lotacao.superior}\n`;
    });

    return csv;
}

/**
 * Main
 */
function main() {
    console.log('🔄 Carregando tabela atual...');
    const tabelaAtual = carregarTabelaAtual();
    console.log(`✅ ${tabelaAtual.size} lotações carregadas da tabela atual`);

    console.log('\n🔄 Extraindo lotações de hierarquia.csv...');
    const lotacoesExtraidas = extrairLotacoes();
    console.log(`✅ ${lotacoesExtraidas.length} registros extraídos`);

    // Remover duplicatas
    const lotacoesUnicas = [];
    const nomesVistos = new Set();
    lotacoesExtraidas.forEach(lotacao => {
        if (!nomesVistos.has(lotacao.nome.toUpperCase())) {
            lotacoesUnicas.push(lotacao);
            nomesVistos.add(lotacao.nome.toUpperCase());
        }
    });
    console.log(`✅ ${lotacoesUnicas.length} lotações únicas`);

    console.log('\n🔄 Mesclando lotações...');
    const novasLotacoes = mesclarLotacoes(tabelaAtual, lotacoesUnicas);
    console.log(`✅ ${novasLotacoes.length} novas lotações adicionadas`);

    if (novasLotacoes.length > 0) {
        console.log('\n📋 Amostras de novas lotações:');
        novasLotacoes.slice(0, 10).forEach(l => {
            console.log(`  ${l.codigo.padEnd(15)} ${l.nome.substring(0, 50)}`);
        });
    }

    console.log('\n🔄 Gerando CSV enriquecido...');
    const csvEnriquecido = gerarCSVEnriquecido(tabelaAtual, novasLotacoes);

    console.log(`🔄 Salvando em ${OUTPUT_FILE}...`);
    fs.writeFileSync(OUTPUT_FILE, csvEnriquecido, 'utf-8');

    console.log('\n✅ Processo concluído!');
    console.log(`📊 Total de lotações: ${tabelaAtual.size + novasLotacoes.length}`);
    console.log(`📁 Arquivo gerado: ${OUTPUT_FILE}`);
}

// Executar
try {
    main();
} catch (error) {
    console.error('❌ Erro:', error.message);
    console.error(error.stack);
    process.exit(1);
}
