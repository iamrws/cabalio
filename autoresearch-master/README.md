# autoresearch-web

Autonomous web-performance research for **jito-cabal** (Next.js 16 + React 19 + Supabase + Solana wallet), deployed as the [`cabalio`](https://github.com/) repository.

A direct port of Andrej Karpathy's [autoresearch](https://github.com/karpathy/autoresearch) pattern. Original: edit `train.py`, train an LLM for 5 minutes, minimize `val_bpb`. Here: edit `jito-cabal/src/**`, build + cold-load the production app, minimize `load_ms`, maximize `arch_score`.

## The idea

Point an agent at `program.md` and let it run overnight. It edits the Next.js app, runs one experiment (build + 3 cold Playwright navigations + architecture scan, ~90s), checks whether loading speed improved, keeps or `git reset`s, then repeats. You wake up to a log of experiments and (hopefully) a faster site.

## KPIs

| Metric | Direction | Analog in original |
|---|---|---|
| `load_ms` — median LCP over 3 cold navigations | **lower is better** (primary) | `val_bpb` |
| `first_load_js_kb` — First Load JS parsed from `next build` stdout | lower is better (stable signal) | `peak_vram_mb` |
| `arch_score` — 0-100 composite of ESLint, madge circular deps, cyclomatic complexity, chunk count, `tsc` errors | **higher is better** (secondary) | — (new) |

The primary KPI dominates. `arch_score` is a tiebreaker: if `load_ms` is within 2% of the current best, a higher `arch_score` wins.

## Files

| File | Role | Modified by |
|---|---|---|
| `harness.mjs` | Immutable evaluator — builds, launches `next start`, drives Playwright, computes `arch_score` | **nobody** |
| `run.mjs` | Entry point — prints the grep-able summary block | **nobody** |
| `analysis.mjs` | Parses `perf-results.tsv`, prints trend report | human |
| `program.md` | Agent playbook | human |
| `perf-results.tsv` | Experiment log (untracked) | agent |

The agent's experiment surface is `../src/**`, `../next.config.ts`, `../middleware.ts`, `../tailwind.config.*`, `../postcss.config.mjs`. Off-limits: `harness.mjs`, `run.mjs`, `program.md`, `*.test.ts`, `../supabase/migrations/**`, `../package.json` dependencies (one-time install only).

## Quick start

```bash
# 1. From the jito-cabal repo root — install the harness devDeps (one-time)
cd ..
npm install

# 2. Run a baseline experiment
cd autoresearch-master
node run.mjs > run.log 2>&1

# 3. Read the result
grep "^load_ms:\|^arch_score:\|^first_load_js_kb:" run.log
```

Expected output:

```
---
load_ms:          1247.5
first_load_js_kb: 187.3
arch_score:       78
build_seconds:    34.2
measure_seconds:  21.8
arch_seconds:     17.9
total_seconds:    73.9
budget_seconds:   90
---
```

Once that works, the setup is good — hand the agent `program.md` and let it run.

## Design choices

- **No Lighthouse.** Prior `PERF_RESEARCH.md` attempts here found Lighthouse slow and flaky. We use Playwright + `PerformanceObserver` for LCP directly: deterministic, ~15s per run, no composite scoring.
- **Cross-file edits allowed.** Unlike `train.py` (one file holds the model), Next.js performance is distributed across layouts, route handlers, dynamic imports, and config. Restricting the agent to one file would starve the search.
- **Fixed 90s budget.** ~40 experiments/hour, ~300 overnight. Hard kill at 180s.
- **One branch per run.** The agent works on `autoresearch/web/<tag>`. Keeps main clean; `git reset` reverts failed experiments cleanly.

## Platform support

Tested on Windows 11 / Node 20+. Playwright ships Chromium — no system-Chrome dependency. `npm install` in `jito-cabal/` provisions everything the harness needs.

## License

MIT. Original concept © Andrej Karpathy.
