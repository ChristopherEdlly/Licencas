const path = require('path');
const fs = require('fs');

global.DateUtils = require('../Js/1-core/utilities/DateUtils.js');
global.FormatUtils = require('../Js/1-core/utilities/FormatUtils.js');

const DataParser = require('../Js/1-core/data-flow/DataParser.js');
const DataTransformer = require('../Js/1-core/data-flow/DataTransformer.js');
const ReportsPage = require('../Js/4-pages/ReportsPage.js');

(async () => {
    const csvPath = path.join(__dirname, '..', 'exemplo', 'NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv');
    const csv = fs.readFileSync(csvPath, 'utf8');

    const rawRows = DataParser.parseCSV(csv);
    console.log('rawRows length =', rawRows.length);

    const fakeApp = {};
    const rp = new ReportsPage(fakeApp);

    // Pass raw rows directly as if DataStateManager had raw CSV rows
    const processed = rp._processDataForExport(rawRows);
    console.log('processed length =', processed.length);
    const acacia = processed.find(s => (s.nome || '').includes('ACACIA CHAVES'));
    console.log('acacia exists:', !!acacia);
    if (acacia) console.log('acacia.periodoLicenca:', acacia.periodoLicenca);
})();