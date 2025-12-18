const path = require('path');
const fs = require('fs');

// Provide utilities for DataTransformer
global.DateUtils = require('../Js/1-core/utilities/DateUtils.js');
global.FormatUtils = require('../Js/1-core/utilities/FormatUtils.js');

const DataParser = require('../Js/1-core/data-flow/DataParser.js');
const DataTransformer = require('../Js/1-core/data-flow/DataTransformer.js');
const ReportsPage = require('../Js/4-pages/ReportsPage.js');

(async () => {
    const csvPath = path.join(__dirname, '..', 'exemplo', 'NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv');
    const csv = fs.readFileSync(csvPath, 'utf8');

    const rows = DataParser.parseCSV(csv);
    const servidores = DataParser.groupByServidor(rows);
    const enriched = DataTransformer.enrichServidoresBatch(servidores);

    console.log('Enriched sample counts:');
    const acacia = enriched.find(s => (s.nome || '').includes('ACACIA CHAVES'));
    console.log('ACACIA found:', !!acacia);
    if (acacia) {
        console.log('acacia.totalLicencas =', acacia.totalLicencas);
        console.log('acacia.licencas.length =', (acacia.licencas||[]).length);
        console.log('acacia.licencas[0]:', acacia.licencas[0]);
    }

    // Instantiate ReportsPage with fake app
    const fakeApp = {};
    const rp = new ReportsPage(fakeApp);

    // Use the internal method to process data for export
    const processed = rp._processDataForExport(enriched);
    console.log('Processed sample:');
    const pAcacia = processed.find(s => (s.nome || '').includes('ACACIA CHAVES'));
    console.log('pAcacia exists:', !!pAcacia);
    if (pAcacia) {
        console.log('periodoLicenca:', pAcacia.periodoLicenca);
        console.log('periodosDetalhados length:', (pAcacia.periodosDetalhados || []).length);
        console.log('periodosDetalhados sample:', pAcacia.periodosDetalhados.slice(0,3));
    }

})();