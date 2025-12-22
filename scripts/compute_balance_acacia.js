const fs = require('fs');
const path = require('path');

const DataParser = require(path.resolve(__dirname, '..', 'Js', '1-core', 'data-flow', 'DataParser.js'));
// Provide DateUtils global expected by the old calculator
global.DateUtils = require(path.resolve(__dirname, '..', 'Js', '1-core', 'utilities', 'DateUtils.js'));
const LicencaCalculator = require(path.resolve(__dirname, '..', 'js - old', 'core', 'LicencaCalculator.js'));

const csvPath = path.resolve(__dirname, '..', 'exemplo', 'NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv');

try {
    const csv = fs.readFileSync(csvPath, 'utf8');
    const parsed = DataParser.parse(csv);

    const fragment = 'ACACIA MARIA MENEZES';
    const found = parsed.filter(p => (p.nome || '').toUpperCase().includes(fragment));
    if (found.length === 0) {
        console.log('Servidor não encontrado');
        process.exit(0);
    }

    const servidor = found[0];
    const licencas = servidor.licencas || [];

    // Mapear para formato esperado pelo LicencaCalculator antigo
    const registros = licencas.map(l => ({
        AQUISITIVO_INICIO: l.aquisitivoInicio || l.AQUISITIVO_INICIO,
        AQUISITIVO_FIM: l.aquisitivoFim || l.AQUISITIVO_FIM,
        GOZO: l.dias || l.GOZO || 0,
        RESTANDO: l.restando || l.RESTANDO || '0'
    }));

    const calc = new LicencaCalculator();
    const balanco = calc.calcularBalancoLicencas(registros);

    console.log('=== Balance for', servidor.nome, '===');
    console.log('Registros count:', registros.length);
    console.log('Dias Ganhos:', balanco.diasGanhos);
    console.log('Dias Usados:', balanco.diasUsados);
    console.log('Dias Restantes:', balanco.diasRestantes);
    console.log('Periodos:', balanco.periodosAquisitivos ? balanco.periodosAquisitivos.length : 'n/a');

} catch (err) {
    console.error('Erro:', err);
}
