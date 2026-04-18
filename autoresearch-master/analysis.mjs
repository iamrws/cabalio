// Replacement for analysis.ipynb.
// Parses perf-results.tsv and prints a progress report to stdout.
//   node analysis.mjs [path/to/perf-results.tsv]

import { readFileSync } from 'node:fs';

const path = process.argv[2] || 'perf-results.tsv';
const raw = readFileSync(path, 'utf8').trimEnd();
const [header, ...rows] = raw.split(/\r?\n/);
const cols = header.split('\t');
const data = rows.map(line => {
  const v = line.split('\t');
  return Object.fromEntries(cols.map((c, i) => [c, v[i]]));
});

const kept = data.filter(d => d.status === 'keep');
if (!kept.length) {
  console.log('No kept experiments yet.');
  process.exit(0);
}

const baseline = kept[0];
const best     = kept.reduce((a, b) => Number(b.load_ms) < Number(a.load_ms) ? b : a);

const fmtDelta = (from, to) => {
  const d = ((Number(to) - Number(from)) / Number(from)) * 100;
  return `${d >= 0 ? '+' : ''}${d.toFixed(2)}%`;
};

console.log(`Experiments total:   ${data.length}`);
console.log(`  kept:              ${kept.length}`);
console.log(`  discarded:         ${data.filter(d => d.status === 'discard').length}`);
console.log(`  crashed:           ${data.filter(d => d.status === 'crash').length}`);
console.log('');
console.log(`Baseline (${baseline.commit}):  load=${baseline.load_ms}ms  js=${baseline.first_load_js_kb}kb  arch=${baseline.arch_score}`);
console.log(`Best     (${best.commit}):  load=${best.load_ms}ms  js=${best.first_load_js_kb}kb  arch=${best.arch_score}`);
console.log('');
console.log(`Δ load_ms:  ${fmtDelta(baseline.load_ms, best.load_ms)}`);
console.log(`Δ js_kb:    ${fmtDelta(baseline.first_load_js_kb, best.first_load_js_kb)}`);
console.log(`Δ arch:     ${Number(best.arch_score) - Number(baseline.arch_score)} points`);
console.log('');
console.log('Recent kept experiments:');
for (const k of kept.slice(-10)) {
  console.log(`  ${k.commit}  load=${String(k.load_ms).padStart(7)}ms  arch=${String(k.arch_score).padStart(3)}  ${k.description}`);
}
