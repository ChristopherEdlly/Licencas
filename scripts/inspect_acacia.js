const fs = require('fs');
const path = 'exemplo/NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv';
global.FormatUtils = require('../Js/1-core/utilities/FormatUtils.js');
global.DateUtils = require('../Js/1-core/utilities/DateUtils.js');
const DataParser = require('../Js/1-core/data-flow/DataParser.js');
const DT = require('../Js/1-core/data-flow/DataTransformer.js');

const csv = fs.readFileSync(path, 'utf8');
const parsed = DataParser.parse(csv);
console.log('Parsed servidores:', parsed.length);
const acaciaRaw = parsed.find(s => (s.nome || '').toLowerCase().includes('acacia chaves da silva costa'));
if (!acaciaRaw) { console.log('ACACIA not found'); process.exit(0); }
const enriched = DT.enrichServidor ? DT.enrichServidor(acaciaRaw) : (DT && DT.default && DT.default.enrichServidor ? DT.default.enrichServidor(acaciaRaw) : null);
console.log('Enriched acacia summary:');
console.log(' totalDias', enriched.totalDias, 'totalGozados', enriched.totalGozados, 'totalSaldo', enriched.totalSaldo, 'totalLicencas', enriched.totalLicencas);
console.log('Per-license:');
enriched.licencas.forEach((l, i) => {
    console.log(i, l.inicio ? l.inicio.toISOString().slice(0,10) : null, l.fim ? l.fim.toISOString().slice(0,10) : null, 'dias', l.dias, 'diasGozados', l.diasGozados, 'saldo', l.saldo, 'aquisitivoInicio', l.aquisitivoInicio ? l.aquisitivoInicio.toISOString().slice(0,10) : null, 'aquisitivoFim', l.aquisitivoFim ? l.aquisitivoFim.toISOString().slice(0,10) : null);
});

// build periodosMap
const periodosMap = new Map();
enriched.licencas.forEach(lic => {
    let chave;
    if (lic.aquisitivoInicio instanceof Date || lic.aquisitivoFim instanceof Date) {
        const inicioKey = lic.aquisitivoInicio ? lic.aquisitivoInicio.toISOString().slice(0,10) : '';
        const fimKey = lic.aquisitivoFim ? lic.aquisitivoFim.toISOString().slice(0,10) : '';
        chave = `${inicioKey}-${fimKey}`;
    } else {
        const ano = lic.inicio instanceof Date ? lic.inicio.getFullYear() : 'unknown';
        chave = `aquisitivo-${ano}`;
    }

    const existing = periodosMap.get(chave) || { ultimoRestando: 0, ultimaData: null, diasUsados: 0, items: [] };
    existing.diasUsados = (existing.diasUsados || 0) + (lic.diasGozados || 0);
    const candidatoSaldo = (lic.saldo !== undefined && lic.saldo !== null) ? Number(lic.saldo) : 0;
    const licDate = lic.inicio instanceof Date ? lic.inicio : null;
    if (!existing.ultimaData || (licDate && licDate > existing.ultimaData)) {
        existing.ultimaData = licDate;
        existing.ultimoRestando = candidatoSaldo;
    }
    existing.items.push({ inicio: lic.inicio ? lic.inicio.toISOString().slice(0,10) : null, diasGozados: lic.diasGozados, saldo: lic.saldo, aquisitivoInicio: lic.aquisitivoInicio ? lic.aquisitivoInicio.toISOString().slice(0,10) : null, aquisitivoFim: lic.aquisitivoFim ? lic.aquisitivoFim.toISOString().slice(0,10) : null });
    periodosMap.set(chave, existing);
});

console.log('Periodos:');
for (const [k, v] of periodosMap.entries()) {
    console.log(k, JSON.stringify(v, null, 2));
}
console.log('Sum ultimoRestando', Array.from(periodosMap.values()).reduce((s, p) => s + (p.ultimoRestando || 0), 0));
