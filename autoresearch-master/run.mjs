// Entry point — analog of `uv run train.py`.
// Usage (from the autoresearch-master/ directory):
//   node run.mjs > run.log 2>&1
//
// Prints a grep-able summary block in the same shape as Karpathy's
// autoresearch output, then exits. Never modify this file during
// experimentation — the agent modifies jito-cabal/src/** instead.

import { runExperiment, TIME_BUDGET_MS } from './harness.mjs';

const started = Date.now();

try {
  const r = await runExperiment();

  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  // Grep-able summary block, mirroring Karpathy's format.
  console.log('---');
  console.log(`load_ms:          ${r.load_ms.toFixed(1)}`);
  console.log(`first_load_js_kb: ${r.first_load_js_kb.toFixed(1)}`);
  console.log(`arch_score:       ${r.arch_score}`);
  console.log(`build_seconds:    ${(r.build_ms / 1000).toFixed(1)}`);
  console.log(`measure_seconds:  ${(r.measure_ms / 1000).toFixed(1)}`);
  console.log(`arch_seconds:     ${(r.arch_ms / 1000).toFixed(1)}`);
  console.log(`total_seconds:    ${elapsed}`);
  console.log(`budget_seconds:   ${(TIME_BUDGET_MS / 1000).toFixed(0)}`);
  console.log('---');
  console.log('arch_breakdown:  ', JSON.stringify(r.breakdown));
  process.exit(0);
} catch (err) {
  console.error('EXPERIMENT FAILED');
  console.error(err?.stack || err);
  // Emit zero-valued summary so the loop can still record a crash row.
  console.log('---');
  console.log('load_ms:          0');
  console.log('first_load_js_kb: 0');
  console.log('arch_score:       0');
  console.log(`total_seconds:    ${((Date.now() - started) / 1000).toFixed(1)}`);
  console.log('---');
  process.exit(1);
}
