// Simple Node test to verify ReportsPage period-filtering logic for ACACIA
const servidores = [
  {
    NOME: 'ACACIA CHAVES DA SILVA COSTA',
    licencas: [
      { inicio: '2018-11-26', fim: '2018-12-25' },
      { inicio: '2020-11-30', fim: '2021-01-28' },
      { inicio: '2022-11-28', fim: '2022-12-27' },
      { inicio: '2022-12-28', fim: '2023-01-26' },
      { inicio: '2024-02-01', fim: '2024-01-31' },
      { inicio: '2024-12-26', fim: '2025-01-24' },
      { inicio: '2025-11-06', fim: '2025-10-07' },
      { inicio: '2025-01-11', fim: '2025-12-30' }
    ]
  }
];

// Active filter: 01/12/2025 -> 31/12/2025
const active = { start: '2025-12-01', end: '2025-12-31' };

function toDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function filterLicencasByActive(licencas, active) {
  const start = toDate(active.start) || null;
  const end = toDate(active.end) || null;
  if (!start && !end) return licencas;
  return (licencas || []).filter(l => {
    const li = toDate(l.inicio) || null;
    const lf = toDate(l.fim) || null;
    if (!li && !lf) return false;
    const licStart = li || lf;
    const licEnd = lf || li;
    if (start && licEnd && licEnd < start) return false;
    if (end && licStart && licStart > end) return false;
    return true;
  });
}

const result = servidores.map(s => {
  const effective = filterLicencasByActive(s.licencas, active);
  return { nome: s.NOME, originalCount: s.licencas.length, filteredCount: effective.length, filtered: effective };
});

console.log(JSON.stringify(result, null, 2));

// Exit with non-zero if filteredCount === originalCount (meaning filter didn't reduce)
if (result.some(r => r.filteredCount === r.originalCount)) process.exit(1);
process.exit(0);
