# autoresearch-web

This is an experiment to have the LLM do its own web-performance research on the jito-cabal Next.js app.

## Setup

To set up a new experiment, work with the user to:

1. **Agree on a run tag**: propose a tag based on today's date (e.g. `apr18`). The branch `autoresearch/web/<tag>` must not already exist — this is a fresh run.
2. **Create the branch**: `git checkout -b autoresearch/web/<tag>` from the current default branch.
3. **Read the in-scope files**: the harness is small. Read these:
   - `README.md` — repository context.
   - `harness.mjs` — immutable evaluator. Do not modify.
   - `run.mjs` — entry point. Do not modify.
   - `../package.json` — to know what's already installed.
4. **Verify the harness runs**: from `autoresearch-master/`, run `node run.mjs > run.log 2>&1` and confirm it prints a `load_ms:` line. If not, tell the human to `cd .. && npm install` and retry.
5. **Initialize perf-results.tsv**: create `perf-results.tsv` with just the header row. The baseline is recorded after the first experiment.
6. **Confirm and go**: confirm setup looks good.

Once you get confirmation, kick off the experimentation.

## Experimentation

Each experiment runs on a single machine. The harness runs for a **fixed time budget of ~90 seconds** (cold `next build` + 3 cold Playwright navigations + arch scan). Launch it as: `node run.mjs > run.log 2>&1`.

**What you CAN do:**
- Modify anything under `../src/**`.
- Modify `../next.config.ts`, `../middleware.ts`, `../tailwind.config.*`, `../postcss.config.mjs`.
- Add or remove `import` statements, split components, use `next/dynamic`, migrate client components to server components, tune the webpack/turbopack config, etc.

**What you CANNOT do:**
- Modify `harness.mjs`, `run.mjs`, `program.md`, `README.md`, or `analysis.mjs`. The harness is the ground-truth metric.
- Add runtime dependencies to `../package.json`. DevDependencies for measurement are already installed.
- Modify `../supabase/migrations/**`, or anything under `autoresearch-master/`.
- Alter `*.test.ts` / `*.test.tsx` in ways that change test behavior — no deletions, no `.skip`/`.only`, no loosened assertions, no reduced coverage. Tests may be edited to fix type/lint errors, but not to alter assertions, skip tests, or reduce coverage.
- Change the measurement code itself (Playwright setup, build command, scoring function).

**The goal is simple: get the lowest `load_ms`, with `arch_score` as a tiebreaker.** Since the harness budget is fixed, you don't need to worry about measurement time. Everything else is fair game: swap libraries for lighter alternatives, lazy-load Solana wallet adapters, code-split the dashboard, drop unused CSS, etc.

**Bundle size** (`first_load_js_kb`) is a soft constraint. Some growth is acceptable for meaningful `load_ms` gains, but it should not blow up dramatically (>2x baseline).

**Simplicity criterion**: all else being equal, simpler is better. A small improvement that adds ugly complexity is not worth it. A near-zero improvement from *removing* code is a win — keep it. This directly improves `arch_score`, which is the tiebreaker.

**The first run**: your very first experiment is always the baseline. Run `node run.mjs > run.log 2>&1` against the unmodified checkout.

## Output format

Once the script finishes, it prints a summary block like:

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

Extract the keys with:

```
grep "^load_ms:\|^first_load_js_kb:\|^arch_score:" run.log
```

## Logging results

When an experiment is done, log it to `perf-results.tsv` (tab-separated — commas break in descriptions).

Columns (6):

```
commit	load_ms	first_load_js_kb	arch_score	status	description
```

1. git commit hash (short, 7 chars)
2. `load_ms` achieved (e.g. `1247.5`) — `0` for crashes
3. `first_load_js_kb` (e.g. `187.3`) — `0` for crashes
4. `arch_score` (0-100) — `0` for crashes
5. status: `keep`, `discard`, or `crash`
6. short text description of what this experiment tried

Example:

```
commit	load_ms	first_load_js_kb	arch_score	status	description
a1b2c3d	1247.5	187.3	78	keep	baseline
b2c3d4e	1189.2	182.1	79	keep	dynamic import the wallet adapter
c3d4e5f	1301.8	189.5	75	discard	swap radix dialog for custom modal
d4e5f6g	0	0	0	crash	inline all images (OOM in next build)
```

**Diagnostic LCP fields (not in the TSV):** the harness's `arch_breakdown` JSON
now also exposes `lcp_samples` (the raw 5-run array), `lcp_p90` (90th
percentile), and `lcp_range` (max − min). These are diagnostic signals that
feed into the decision rule above — for example, a tight `lcp_range` justifies
keeping a small improvement that would otherwise look like noise. They are
**not** logged to `perf-results.tsv`: the TSV schema stays at 6 columns
(`commit`, `load_ms`, `first_load_js_kb`, `arch_score`, `status`,
`description`) so historical rows remain valid. Read the fields from `run.log`
when a decision is borderline.

## Decision rule (keep vs discard)

The harness's LCP noise floor (σ≈15-20ms over a median-of-5) means a 1-2% swing
can be pure measurement noise. The thresholds below are noise-aware:

- `load_ms` lower than the current branch tip by **more than 5%** → **keep** (clearly above noise floor).
- `load_ms` within **±5%** of the current tip AND `arch_score` strictly higher → **keep** (tiebreak on architecture).
- `load_ms` lower by **2-5%** AND `lcp_range` **< 20ms** → **keep** (small but stable improvement, range confirms it isn't noise).
- otherwise → **discard** (`git reset --hard` back to the branch tip before the experiment).

Track only the branch-tip metric as "current best," not the all-time best — this lets the agent explore monotonically.

## The experiment loop

The experiment runs on a dedicated branch (e.g. `autoresearch/web/apr18`).

LOOP FOREVER:

1. Look at the git state: current branch/commit.
2. Pick an experimental idea. Examples: lazy-load Solana adapters, dynamic-import the dashboard, dedupe Radix imports, move a client component to the server, reduce Tailwind generated CSS, swap `lucide-react` for tree-shakable icon imports, enable `next.config.ts` experimental compile options, remove dead deps.
3. Edit files under `../src/**` (or the allowed config files).
4. `git add -A && git commit -m "exp: <short idea>"` (single line, no body).
5. Run the experiment: `node run.mjs > run.log 2>&1` from `autoresearch-master/`.
6. Read the results: `grep "^load_ms:\|^first_load_js_kb:\|^arch_score:" run.log`.
7. If grep output is empty, the run crashed. `tail -n 50 run.log` to read the stack trace and attempt a fix. If you can't get it working after a few attempts, give up and mark `crash`.
8. Record the results in `perf-results.tsv` (do NOT commit this file — it's in `.gitignore`).
9. Apply the decision rule above: `keep` advances the branch (commit stays), `discard` does `git reset --hard HEAD~1`.

**Timeout**: each experiment should take ~90 seconds total. If a run exceeds 180 seconds, kill it (`Ctrl+C`) and treat it as a `crash`.

**Crashes**: if a run crashes (build error, TypeScript error, runtime exception, etc.), use judgment. Dumb typo or missing import → fix and re-run. Idea fundamentally broken → skip, log `crash`, move on.

**NEVER STOP**: once the experiment loop has begun (after setup), do NOT pause to ask the human if you should continue. Do NOT ask "should I keep going?" or "is this a good stopping point?". The human might be asleep and expects you to continue indefinitely until manually stopped. You are autonomous. If you run out of ideas, think harder — read Next.js docs referenced in the code, re-read `../src/app/layout.tsx` for new angles, try combining previous near-misses, try more radical changes (drop a dependency, rewrite a page as static). The loop runs until the human interrupts you, period.

A realistic session: each experiment ~90s → ~40/hour → ~300 while the human sleeps. They wake up to a log of experiments, all completed by you while they slept.

## Deployment

After each `keep`, push the branch to GitHub:

```
git push origin autoresearch/web/<tag>
```

This satisfies the "always deploy to GitHub" rule without polluting `main`.
