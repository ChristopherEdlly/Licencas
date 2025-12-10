/**
 * Test Runner - Roda todos os testes disponíveis
 * Execute: node js/run-all-tests.js
 */

const { execSync } = require('child_process');
const path = require('path');

console.log('🚀 Rodando todos os testes...\n');
console.log('='.repeat(70));

const tests = [
    {
        name: 'DateUtils',
        path: 'js/1-core/utilities/__tests__/DateUtils.test.js'
    },
    {
        name: 'FormatUtils',
        path: 'js/1-core/utilities/__tests__/FormatUtils.test.js'
    },
    {
        name: 'ValidationUtils',
        path: 'js/1-core/utilities/__tests__/ValidationUtils.test.js'
    },
    {
        name: 'MathUtils',
        path: 'js/1-core/utilities/__tests__/MathUtils.test.js'
    },
    {
        name: 'DataParser',
        path: 'js/1-core/data-flow/__tests__/DataParser.test.js'
    },
    {
        name: 'DataTransformer',
        path: 'js/1-core/data-flow/__tests__/DataTransformer.test.js'
    },
    {
        name: 'DataFilter',
        path: 'js/1-core/data-flow/__tests__/DataFilter.test.js'
    },
    {
        name: 'DataFilter (Advanced - Períodos & Ranges)',
        path: 'js/1-core/data-flow/__tests__/DataFilter.enhanced.test.js'
    },
    {
        name: 'DataAggregator',
        path: 'js/1-core/data-flow/__tests__/DataAggregator.test.js'
    },
    {
        name: 'LicencaCalculator',
        path: 'js/1-core/business-logic/__tests__/LicencaCalculator.test.js'
    },
    {
        name: 'UrgencyAnalyzer',
        path: 'js/1-core/business-logic/__tests__/UrgencyAnalyzer.test.js'
    },
    {
        name: 'AposentadoriaAnalyzer',
        path: 'js/1-core/business-logic/__tests__/AposentadoriaAnalyzer.test.js'
    },
    {
        name: 'OperationalImpact',
        path: 'js/1-core/business-logic/__tests__/OperationalImpact.test.js'
    },
    {
        name: 'DataLoader',
        path: 'js/1-core/data-flow/__tests__/DataLoader.test.js'
    },
    {
        name: 'CronogramaParser',
        path: 'js/1-core/data-flow/__tests__/CronogramaParser.test.js'
    },
    // 2-services
    {
        name: 'FileService',
        path: 'js/2-services/__tests__/FileService.test.js'
    },
    {
        name: 'NotificationService',
        path: 'js/2-services/__tests__/NotificationService.test.js'
    },
    // Nota: CacheService e ExportService são testados no browser (usam IndexedDB e DOM)

    // 3-managers/features
    {
        name: 'SearchManager',
        path: 'js/3-managers/features/__tests__/SearchManager.test.js'
    },
    {
        name: 'Feature Managers (Filter, Calendar, Timeline, Reports, Keyboard)',
        path: 'js/3-managers/features/__tests__/FeatureManagers.test.js'
    },

    // 3-managers - Integration Tests
    {
        name: 'Integration Tests (Data Flow Between Managers)',
        path: 'js/3-managers/__tests__/Integration.test.js'
    }
];

let totalPassed = 0;
let totalFailed = 0;

tests.forEach((test, index) => {
    console.log(`\n📦 [${index + 1}/${tests.length}] Rodando: ${test.name}`);
    console.log('-'.repeat(70));
    
    try {
        const output = execSync(`node ${test.path}`, {
            encoding: 'utf-8',
            stdio: 'pipe'
        });
        
        // Extrair estatísticas do output
        const passedMatch = output.match(/✅ Passou: (\d+)/);
        const failedMatch = output.match(/❌ Falhou: (\d+)/);
        
        if (passedMatch) totalPassed += parseInt(passedMatch[1]);
        if (failedMatch) totalFailed += parseInt(failedMatch[1]);
        
        // Mostrar apenas o resumo
        const lines = output.split('\n');
        const summaryIndex = lines.findIndex(line => line.includes('RESUMO DOS TESTES'));
        if (summaryIndex !== -1) {
            console.log(lines.slice(summaryIndex).join('\n'));
        }
        
    } catch (error) {
        console.log(`❌ Erro ao rodar teste ${test.name}`);
        console.log(error.stdout || error.message);
        totalFailed++;
    }
});

// Resumo geral
console.log('\n' + '='.repeat(70));
console.log('📊 RESUMO GERAL DE TODOS OS TESTES');
console.log('='.repeat(70));
console.log(`Total de testes: ${totalPassed + totalFailed}`);
console.log(`✅ Passou: ${totalPassed}`);
console.log(`❌ Falhou: ${totalFailed}`);
console.log(`📈 Taxa de sucesso: ${totalPassed + totalFailed > 0 ? ((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1) : 0}%`);
console.log('='.repeat(70));

if (totalFailed === 0) {
    console.log('\n🎉 TODOS OS TESTES PASSARAM! 🎉\n');
    process.exit(0);
} else {
    console.log(`\n⚠️  ${totalFailed} teste(s) falharam\n`);
    process.exit(1);
}
