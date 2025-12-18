const fs = require('fs');
const path = require('path');

try {
    // Provide utilities expected by DataTransformer
    global.DateUtils = require('../Js/1-core/utilities/DateUtils.js');
    global.FormatUtils = require('../Js/1-core/utilities/FormatUtils.js');

    const DataParser = require('../Js/1-core/data-flow/DataParser.js');
    const DataTransformer = require('../Js/1-core/data-flow/DataTransformer.js');

    const csvPath = path.join(__dirname, '..', 'exemplo', 'NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv');
    const csv = fs.readFileSync(csvPath, 'utf8');

    console.log('📥 CSV loaded:', csvPath);

    const rows = DataParser.parseCSV(csv);
    console.log('📄 Parsed rows:', rows.length);

    const servidores = DataParser.groupByServidor(rows);
    console.log('👥 Aggregated servidores:', servidores.length);

    const enriched = servidores.map(s => DataTransformer.enrichServidor(s));

    console.log('✅ Enriched servidores sample:');
    enriched.slice(0, 5).forEach(s => {
        console.log(`- ${s.nome} | totalLicencas=${s.totalLicencas} | licencasArr=${(s.licencas||[]).length}`);
    });

    // Basic validation
    let issues = 0;
    enriched.forEach(s => {
        if (!Array.isArray(s.licencas)) {
            console.warn('⚠️ Servidor sem array de licencas:', s.nome);
            issues++;
        }
    });

    console.log(`
Summary: servidores=${enriched.length}, issues=${issues}`);
} catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
}
