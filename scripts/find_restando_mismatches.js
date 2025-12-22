const fs = require('fs');
const path = require('path');

const DataParser = require(path.resolve(__dirname, '..', 'Js', '1-core', 'data-flow', 'DataParser.js'));

const csvPath = path.resolve(__dirname, '..', 'exemplo', 'NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv');

function parseIntSafe(v) {
    if (v === undefined || v === null) return 0;
    const s = String(v).replace(/[^0-9\-]/g, '');
    const n = parseInt(s, 10);
    return isNaN(n) ? 0 : n;
}

try {
    const csv = fs.readFileSync(csvPath, 'utf8');
    const parsed = DataParser.parse(csv);

    const mismatches = [];

    parsed.forEach(servidor => {
        const licencas = servidor.licencas || [];
        // Build set of aquisitivo periods (unique keys ignoring 1899)
        const periodKeys = new Set();
        let diasUsados = 0;
        let ultimoRestando = null;

        licencas.forEach(l => {
            const ai = l.aquisitivoInicio || l.AQUISITIVO_INICIO || '';
            const af = l.aquisitivoFim || l.AQUISITIVO_FIM || '';
            const key = `${ai}|${af}`;
            const keyStr = String(key);
            if (keyStr && !keyStr.includes('1899')) {
                periodKeys.add(key);
            }

            const gozo = parseIntSafe(l.dias || l.GOZO || l.gozo || 0);
            diasUsados += gozo;

            const rest = l.restando || l.RESTANDO || l.restando === 0 ? l.restando : (l.RESTANDO || null);
            if (rest !== undefined && rest !== null && String(rest).trim() !== '') {
                ultimoRestando = parseIntSafe(rest);
            }
        });

        const diasGanhos = periodKeys.size * 90;
        const computedRestando = diasGanhos - diasUsados;
        const reportedRestando = ultimoRestando === null ? null : ultimoRestando;

        if (reportedRestando === null) return; // nothing to compare

        if (computedRestando !== reportedRestando) {
            mismatches.push({
                nome: servidor.nome,
                lotacao: servidor.lotacao || servidor.unidade || '',
                periodos: periodKeys.size,
                diasGanhos,
                diasUsados,
                reportedRestando,
                computedRestando
            });
        }
    });

    // Sort by difference magnitude
    mismatches.sort((a, b) => Math.abs(b.reportedRestando - b.computedRestando) - Math.abs(a.reportedRestando - a.computedRestando));

    console.log('Total mismatches found:', mismatches.length);
    console.log('Top 20 mismatches:');
    mismatches.slice(0, 20).forEach((m, i) => {
        console.log(`${i + 1}. ${m.nome} — periodos:${m.periodos} diasGanhos:${m.diasGanhos} diasUsados:${m.diasUsados} reported:${m.reportedRestando} computed:${m.computedRestando} diff:${m.reportedRestando - m.computedRestando}`);
    });

} catch (err) {
    console.error('Erro ao executar varredura:', err);
}
