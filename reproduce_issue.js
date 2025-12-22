
const DateUtils = require('./Js/1-core/utilities/DateUtils.js');

function ensureDate(value) {
    if (!value) return null;
    if (value instanceof Date) return value;

    // Tentar parse direto (funciona com "YYYY-MM-DD HH:MM:SS")
    const date = new Date(value);
    if (!isNaN(date.getTime())) {
        return date;
    }
    return null;
}

const csvStart = "2016-02-03 00:00:00"; // Feb 3rd or Mar 2nd?
const csvEnd = "2016-05-02 00:00:00";   // May 2nd or Feb 5th?

console.log("--- Testing ensureDate (DataTransformer logic) ---");
const d1 = ensureDate(csvStart);
const d2 = ensureDate(csvEnd);
console.log(`Input: "${csvStart}" -> Parsed: ${d1} (ISO: ${d1 ? d1.toISOString() : 'null'})`);
console.log(`Input: "${csvEnd}" -> Parsed: ${d2} (ISO: ${d2 ? d2.toISOString() : 'null'})`);

if (d1 && d2) {
    const diff = (d2 - d1) / (1000 * 60 * 60 * 24);
    console.log(`Diff (End - Start): ${diff} days`);
}

console.log("\n--- Testing DateUtils.parseBrazilianDate (fallback logic) ---");
// If the code somehow passes this string to DateUtils (though we saw ensureDate goes first)
const du1 = DateUtils.parseBrazilianDate(csvStart);
console.log(`Input: "${csvStart}" -> Parsed: ${du1}`);
