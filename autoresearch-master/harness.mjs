// Immutable evaluation harness for autoresearch-web.
// Analog of Karpathy's prepare.py: one-time setup + fixed measurement.
// DO NOT MODIFY during experimentation.
//
// Measures:
//   - load_ms:          median LCP over 5 cold Playwright navigations
//                       against a production `next start` build. Lower = better.
//                       (Primary KPI, analog of val_bpb.)
//   - first_load_js_kb: First Load JS size parsed from `next build` stdout.
//                       Secondary stable signal, analog of peak_vram_mb.
//   - arch_score:       0-100 composite of ESLint, madge, escomplex, tsc, chunk count.
//                       Higher = better. Tiebreaker KPI.
//
// Time budget: ~90s per experiment, 180s hard kill.

import { execa } from 'execa';
import { chromium } from 'playwright';
import getPort from 'get-port';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Fixed constants (do not modify)
// ---------------------------------------------------------------------------

export const TIME_BUDGET_MS = 90_000;
export const HARD_KILL_MS = 180_000;
export const LCP_RUNS = 5;
export const TARGET_ROUTE = '/';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function median(xs) {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(xs, p) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  // Nearest-rank method: clamp to last index.
  const idx = Math.min(s.length - 1, Math.ceil((p / 100) * s.length) - 1);
  return s[Math.max(0, idx)];
}

async function runCmd(cmd, args, { cwd = REPO_ROOT, timeout = HARD_KILL_MS } = {}) {
  return execa(cmd, args, { cwd, timeout, reject: false, all: true });
}

// ---------------------------------------------------------------------------
// Primary KPI: build + measure LCP
// ---------------------------------------------------------------------------

async function measureStaticJs() {
  // Measure directly from .next/static/chunks — robust across Next versions.
  const dir = path.join(REPO_ROOT, '.next', 'static', 'chunks');
  let files = 0;
  let bytes = 0;
  async function walk(d) {
    let entries;
    try { entries = await fs.readdir(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) await walk(p);
      else if (e.name.endsWith('.js')) {
        files++;
        try { bytes += (await fs.stat(p)).size; } catch { /* ignore */ }
      }
    }
  }
  await walk(dir);
  return { chunks: files, first_load_js_kb: +(bytes / 1024).toFixed(1) };
}

async function buildApp() {
  const r = await runCmd('npm', ['run', 'build'], { timeout: 120_000 });
  if (r.exitCode !== 0) {
    throw new Error(`next build failed:\n${r.all ?? r.stderr}`);
  }
  const { chunks, first_load_js_kb } = await measureStaticJs();
  return { stdout: r.stdout ?? '', first_load_js_kb, chunks };
}

async function measureLcp() {
  const port = await getPort();
  const server = execa('npm', ['run', 'start', '--', '-p', String(port)], {
    cwd: REPO_ROOT,
    env: { ...process.env, NODE_ENV: 'production', NEXT_TELEMETRY_DISABLED: '1' },
  });

  // Wait until the server responds (poll /api/health or just /)
  const url = `http://127.0.0.1:${port}${TARGET_ROUTE}`;
  const deadline = Date.now() + 30_000;
  let ready = false;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok || res.status < 500) { ready = true; break; }
    } catch { /* retry */ }
    await new Promise(r => setTimeout(r, 250));
  }
  if (!ready) {
    server.kill('SIGKILL');
    throw new Error(`next start did not respond on ${url} within 30s`);
  }

  const samples = [];
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  try {
    for (let i = 0; i < LCP_RUNS; i++) {
      const ctx = await browser.newContext({ bypassCSP: true });
      const page = await ctx.newPage();
      await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      const lcp = await page.evaluate(() => new Promise(resolve => {
        let best = 0;
        const po = new PerformanceObserver(list => {
          for (const e of list.getEntries()) best = Math.max(best, e.renderTime || e.startTime || 0);
        });
        try { po.observe({ type: 'largest-contentful-paint', buffered: true }); } catch { /* noop */ }
        setTimeout(() => { po.disconnect(); resolve(best); }, 2_500);
      }));
      const hydrated = await page.evaluate(() => performance.now());
      samples.push(lcp > 0 ? lcp : hydrated);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill('SIGKILL');
    // give Windows a moment to release the port
    await new Promise(r => setTimeout(r, 250));
  }
  const med = median(samples);
  const p90 = percentile(samples, 90);
  const range = samples.length
    ? Math.max(...samples) - Math.min(...samples)
    : 0;
  return {
    median:  med,
    samples: samples.map(s => +s.toFixed(1)),
    p90:     +p90.toFixed(1),
    range:   +range.toFixed(1),
  };
}

// ---------------------------------------------------------------------------
// Secondary KPI: architecture score (0-100)
// ---------------------------------------------------------------------------

async function scoreEslint() {
  const r = await runCmd('npx', ['--yes', 'eslint', 'src', '-f', 'json'], { timeout: 60_000 });
  try {
    const reports = JSON.parse(r.stdout || '[]');
    const errors = reports.reduce((a, x) => a + (x.errorCount || 0), 0);
    const warnings = reports.reduce((a, x) => a + (x.warningCount || 0), 0);
    return { errors, warnings };
  } catch {
    return { errors: -1, warnings: -1 };
  }
}

async function scoreMadge() {
  const r = await runCmd('npx', ['--yes', 'madge', '--circular', '--extensions', 'ts,tsx', '--json', 'src'], { timeout: 60_000 });
  try {
    const cycles = JSON.parse(r.stdout || '[]');
    return Array.isArray(cycles) ? cycles.length : 0;
  } catch { return -1; }
}

async function scoreEscomplex() {
  // typhonjs-escomplex can't parse TSX directly; use ts-complex via cli fallback: count files > threshold.
  // Pragmatic proxy: average "cyclomatic" from a tiny AST walk using sloc.
  // We use `npx cloc` — but to keep deps minimal, just count long functions as a proxy.
  const r = await runCmd('node', ['-e', `
    const fs = require('fs');
    const path = require('path');
    const root = path.resolve('src');
    let totalFns = 0, totalComplexity = 0;
    function walk(d) {
      if (!fs.existsSync(d)) return;
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, f.name);
        if (f.isDirectory()) walk(p);
        else if (/\\.(ts|tsx|mjs|js|jsx)$/.test(f.name) && !/\\.test\\./.test(f.name)) {
          const src = fs.readFileSync(p, 'utf8');
          const fns = src.match(/\\b(function|=>)\\b/g) || [];
          for (const _ of fns) totalFns++;
          const branches = src.match(/\\b(if|else|for|while|case|catch|\\?\\?|\\|\\||&&)\\b/g) || [];
          totalComplexity += branches.length;
        }
      }
    }
    walk(root);
    const avg = totalFns ? totalComplexity / totalFns : 0;
    console.log(JSON.stringify({ avg, totalFns }));
  `], { timeout: 30_000 });
  try { return JSON.parse(r.stdout).avg; } catch { return -1; }
}

async function scoreTsc() {
  const r = await runCmd('npx', ['--yes', 'tsc', '--noEmit'], { timeout: 120_000 });
  const errs = (r.stdout || '').match(/error TS\d+/g) || [];
  return errs.length;
}

function archScoreFrom({ eslint, cycles, avgComplexity, tsErrors, chunks }) {
  let score = 100;
  if (eslint.errors   >= 0) score -= Math.min(40, eslint.errors * 2);
  if (eslint.warnings >= 0) score -= Math.min(10, Math.floor(eslint.warnings * 0.25));
  if (cycles          >= 0) score -= Math.min(20, cycles * 5);
  if (avgComplexity   >= 0) score -= Math.min(15, Math.max(0, avgComplexity - 5) * 1.5);
  if (tsErrors        >= 0) score -= Math.min(15, tsErrors * 3);
  // Chunk count bell curve around ~20 chunks (penalise both too few and chunk spam)
  if (chunks          >= 0) score -= Math.min(5, Math.abs(chunks - 20) * 0.25);
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function architectureScore(chunks) {
  const [eslint, cycles, avgComplexity, tsErrors] = await Promise.all([
    scoreEslint(),
    scoreMadge(),
    scoreEscomplex(),
    scoreTsc(),
  ]);
  return {
    arch_score: archScoreFrom({ eslint, cycles, avgComplexity, tsErrors, chunks }),
    breakdown:  { eslint, cycles, avgComplexity, tsErrors, chunks },
  };
}

// ---------------------------------------------------------------------------
// Main experiment runner
// ---------------------------------------------------------------------------

export async function runExperiment() {
  const t0 = Date.now();
  const build = await buildApp();
  const buildMs = Date.now() - t0;

  const tLcp = Date.now();
  const lcp = await measureLcp();
  const lcpMs = Date.now() - tLcp;

  const tArch = Date.now();
  const { arch_score, breakdown } = await architectureScore(build.chunks);
  const archMs = Date.now() - tArch;

  // Attach LCP noise-floor diagnostics to the breakdown. These are for agent
  // decision-making only; the TSV schema (and the scalar `load_ms` KPI) are
  // unchanged so existing rows stay compatible.
  const breakdownWithLcp = {
    ...breakdown,
    lcp_samples: lcp.samples,
    lcp_p90:     lcp.p90,
    lcp_range:   lcp.range,
  };

  const total = Date.now() - t0;
  return {
    load_ms:          +lcp.median.toFixed(1),
    first_load_js_kb: +build.first_load_js_kb.toFixed(1),
    arch_score,
    build_ms:         buildMs,
    measure_ms:       lcpMs,
    arch_ms:          archMs,
    total_seconds:    +(total / 1000).toFixed(1),
    breakdown:        breakdownWithLcp,
  };
}
