/**
 * mergeApproved.js - Mescla lotações aprovadas manualmente
 */

const fs = require('fs');
const path = require('path');

const TABELA_ORIGINAL = path.join(__dirname, 'tabela.csv');
const LOTACOES_APROVADAS = path.join(__dirname, 'lotacoes_aprovadas_manual.csv');
const TABELA_FINAL = path.join(__dirname, 'tabela_final.csv');

function removeBOM(str) {
    if (str.charCodeAt(0) === 0xFEFF) return str.slice(1);
    return str;
}

function main() {
    console.log('📖 Lendo tabela original...');
    const originalContent = removeBOM(fs.readFileSync(TABELA_ORIGINAL, 'utf-8'));
    const originalLines = originalContent.split('\n').map(l => l.trim()).filter(l => l);

    console.log('📖 Lendo lotações aprovadas...');
    const aprovadasContent = removeBOM(fs.readFileSync(LOTACOES_APROVADAS, 'utf-8'));
    const aprovadasLines = aprovadasContent.split('\n').map(l => l.trim()).filter(l => l);

    // Combinar (pular cabeçalhos duplicados)
    const header = originalLines[0];
    const dadosOriginais = originalLines.slice(1);
    const dadosAprovados = aprovadasLines.slice(1); // Pular cabeçalho

    const todasLotacoes = [header, ...dadosOriginais, ...dadosAprovados];

    console.log(`✅ Total: ${todasLotacoes.length - 1} lotações (${dadosOriginais.length} originais + ${dadosAprovados.length} novas)`);

    // Salvar
    const finalContent = todasLotacoes.join('\n') + '\n';
    fs.writeFileSync(TABELA_FINAL, finalContent, 'utf-8');

    console.log(`\n💾 Arquivo final salvo: ${TABELA_FINAL}`);
    console.log('\n✅ Pronto! Use tabela_final.csv como sua nova hierarquia.');
}

main();
