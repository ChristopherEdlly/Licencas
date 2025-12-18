const fs = require('fs');
const path = require('path');

const DataParser = require(path.resolve(__dirname, '..', 'Js', '1-core', 'data-flow', 'DataParser.js'));
let DataTransformer;
// Load utilities into global so DataTransformer can use them in Node
const DateUtils = require(path.resolve(__dirname, '..', 'Js', '1-core', 'utilities', 'DateUtils.js'));
const FormatUtils = require(path.resolve(__dirname, '..', 'Js', '1-core', 'utilities', 'FormatUtils.js'));
global.DateUtils = DateUtils;
global.FormatUtils = FormatUtils;

try {
  DataTransformer = require(path.resolve(__dirname, '..', 'Js', '1-core', 'data-flow', 'DataTransformer.js'));
} catch (e) {
  // fallback to global if not CommonJS-exported
  DataTransformer = global.DataTransformer;
}
const csvPath = path.resolve(__dirname, '..', 'exemplo', 'NOTIFICACAO_DE_LICENCA_PREMIO_ATUALIZADA(Sheet1).csv');
const csv = fs.readFileSync(csvPath, 'utf8');

console.log('Parsing CSV...');
const rows = DataParser.parseCSV(csv);
console.log('Parsed rows:', rows.length);

// Normalize using mapHeaders + normalizeData
const headers = Object.keys(rows[0] || {});
const headerMap = DataParser.mapHeaders(headers);
const normalized = DataParser.normalizeData(rows, headerMap);

// find abilio
const matches = normalized.filter(r => (r.NOME || r.nome || '').toString().toUpperCase().includes('ABILIO'));
console.log('Matches:', matches.length);
if (matches.length > 0) {
  console.log(matches[0]);
}

// Try grouping
const grouped = DataParser.groupByServidor(normalized);
const gmatch = grouped.find(s => (s.nome || '').toUpperCase().includes('ABILIO'));
console.log('\nGrouped match:');
console.log(gmatch);

// Try enriching via DataTransformer if available
if (DataTransformer && typeof DataTransformer.enrichServidoresBatch === 'function') {
  const enriched = DataTransformer.enrichServidoresBatch(grouped);
  const em = enriched.find(s => (s.nome || '').toUpperCase().includes('ABILIO'));
  console.log('\nEnriched match:');
  console.log(em);
}
