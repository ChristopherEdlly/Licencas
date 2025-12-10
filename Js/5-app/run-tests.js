/**
 * Script para executar todos os testes da camada 5-app
 * 
 * Executa:
 * - EventBus.test.js
 * - Router.test.js
 * - App.test.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Executando testes da camada 5-app...\n');
console.log('='.repeat(60));

const testFiles = [
    'EventBus.test.js',
    'Router.test.js',
    'App.test.js'
];

let totalPassed = 0;
let totalFailed = 0;
let allTestsPassed = true;

testFiles.forEach((testFile, index) => {
    console.log(`\n[${index + 1}/${testFiles.length}] Executando ${testFile}...`);
    console.log('-'.repeat(60));

    try {
        const testPath = path.join(__dirname, '__tests__', testFile);
        const output = execSync(`node "${testPath}"`, {
            encoding: 'utf-8',
            stdio: 'pipe'
        });

        console.log(output);

        // Extrair estatísticas do output
        const passedMatch = output.match(/✅ Testes passados: (\d+)/);
        const failedMatch = output.match(/❌ Testes falhados: (\d+)/);

        if (passedMatch) totalPassed += parseInt(passedMatch[1]);
        if (failedMatch) {
            const failed = parseInt(failedMatch[1]);
            totalFailed += failed;
            if (failed > 0) allTestsPassed = false;
        }

    } catch (error) {
        console.error(`❌ Erro ao executar ${testFile}:`);
        console.error(error.stdout || error.message);
        allTestsPassed = false;
        totalFailed++;
    }
});

// ==================== RESUMO FINAL ====================

console.log('\n' + '='.repeat(60));
console.log('📊 RESUMO GERAL - CAMADA 5-APP');
console.log('='.repeat(60));
console.log(`✅ Total de testes passados: ${totalPassed}`);
console.log(`❌ Total de testes falhados: ${totalFailed}`);
console.log(`📈 Total geral: ${totalPassed + totalFailed}`);
console.log(`🎯 Taxa de sucesso: ${totalPassed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(60));

if (allTestsPassed) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log('\n⚠️  ALGUNS TESTES FALHARAM ⚠️\n');
    process.exit(1);
}
