const path = require('path');
const fs = require('fs');

global.DateUtils = require('../Js/1-core/utilities/DateUtils.js');
global.FormatUtils = require('../Js/1-core/utilities/FormatUtils.js');

const DataParser = require('../Js/1-core/data-flow/DataParser.js');
const DataTransformer = require('../Js/1-core/data-flow/DataTransformer.js');
const DataStateManager = require('../Js/3-managers/state/DataStateManager.js');
const ReportsPage = require('../Js/4-pages/ReportsPage.js');

(async () => {
    const csvPath = path.join(__dirname, '..', 'exemplo', 'NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv');
    const csv = fs.readFileSync(csvPath, 'utf8');

    const rawRows = DataParser.parseCSV(csv);
    // Simulate legacy raw rows stored in DataStateManager
    const dsm = new DataStateManager();
    // setAllServidores expects enriched shape, but we'll simulate legacy raw rows
    dsm.setAllServidores(rawRows);

    // Make global like browser
    global.window = global;
    global.window.dataStateManager = dsm;

    const fakeApp = { dataStateManager: dsm };
    const rp = new ReportsPage(fakeApp);

    // pick a server name present in rawRows
    const nome = 'ACACIA CHAVES DA SILVA COSTA';
    const firstRaw = rawRows.find(r => (r.NOME || '').includes('ACACIA CHAVES'));
    console.log('firstRaw keys:', Object.keys(firstRaw));

    // Create a minimal servidor object as present in DataStateManager's filtered list (single row)
    const servidorRow = { NOME: firstRaw.NOME, NOME_original: firstRaw.NOME };
    // In real UI, servidor objects might be one of the raw rows
    const periodo = rp._formatPeriodoLicenca(servidorRow);
    console.log('reconstructed periodo:', periodo);
})();