# Performance Research Loop

Autonomous performance optimization program for Jito Cabal. Adapted from the autoresearch experimentation framework — the LLM runs a structured loop of measure → hypothesize → implement → verify cycles to systematically make the site faster and smoother.

## Setup

1. **Agree on a run tag**: e.g. `perf/mar30`. The branch `perf/<tag>` must not already exist.
2. **Create the branch**: `git checkout -b perf/<tag>` from current main.
3. **Establish baseline measurements**: Run Lighthouse CI and record initial scores.
4. **Initialize results.tsv**: Create `perf-results.tsv` with just the header row.
5. **Confirm and go**: Confirm setup looks good, then kick off the loop.

## Measurement

Each optimization is measured by running the dev server and collecting metrics. The key metrics are:

```
lighthouse_perf:    85        # Lighthouse Performance score (0-100)
lcp_ms:             2400      # Largest Contentful Paint (ms)
fid_ms:             120       # First Input Delay (ms)
cls:                0.08      # Cumulative Layout Shift
ttfb_ms:            600       # Time to First Byte (ms)
bundle_kb:          380       # Total JS bundle size (KB gzipped)
hydration_ms:       800       # Time to interactive after hydration
```

Extract metrics via:
```bash
# Build and analyze bundle
npx next build 2>&1 | tee build.log
grep -E "First Load JS|Route" build.log

# Or use Lighthouse CLI
npx lighthouse http://localhost:3000 --output=json --output-path=lighthouse.json --chrome-flags="--headless"
node -e "const r=require('./lighthouse.json');console.log('perf:',r.categories.performance.score*100,'lcp:',r.audits['largest-contentful-paint'].numericValue,'cls:',r.audits['cumulative-layout-shift'].numericValue)"
```

## What You CAN Do

- Modify any file in `src/` — components, pages, layouts, API routes, lib utilities
- Modify `next.config.ts`, `tailwind.config.ts`, `package.json`
- Add or remove dependencies (with justification)
- Restructure component hierarchy, add lazy loading, code splitting
- Replace animation libraries with CSS equivalents
- Optimize API routes, add caching, reduce waterfalls
- Add Suspense boundaries, streaming, prefetching

## What You CANNOT Do

- Break existing functionality — every optimization must preserve current behavior
- Remove features or user-visible elements
- Change the visual design (colors, typography, layout structure)
- Modify database schema or Supabase configuration
- Touch environment variables or secrets
- Skip measurement — every change MUST have before/after numbers

## The Goal

**Maximize Lighthouse Performance score while maintaining visual fidelity and feature completeness.** Secondary goals: minimize bundle size, eliminate jank, achieve butter-smooth 60fps interactions.

## Simplicity Criterion

All else being equal, simpler is better. Removing 60KB of Framer Motion and replacing with 2KB of CSS transitions is a massive win even if the animation is slightly different. Adding a complex service worker for marginal caching gains is not worth it if a simple `Cache-Control` header achieves 80% of the benefit.

## Logging Results

Log each experiment to `perf-results.tsv` (tab-separated):

```
commit	lighthouse_perf	bundle_kb	lcp_ms	cls	status	description
```

- commit: git short hash (7 chars)
- lighthouse_perf: score 0-100 (0 for broken builds)
- bundle_kb: total first-load JS gzipped
- lcp_ms: Largest Contentful Paint
- cls: Cumulative Layout Shift
- status: `keep`, `discard`, or `broken`
- description: what the experiment tried

Example:
```
commit	lighthouse_perf	bundle_kb	lcp_ms	cls	status	description
a1b2c3d	72	380	2400	0.08	keep	baseline
b2c3d4e	78	320	2100	0.05	keep	replace framer-motion NeonCard with CSS transitions
c3d4e5f	79	318	2050	0.05	keep	lazy load BehavioralLanding below fold
d4e5f6g	74	340	2300	0.12	discard	added intersection observer but broke CLS
```

## The Experiment Loop

LOOP FOREVER:

1. **Assess current state**: Check git log, review `perf-results.tsv` for what's been tried
2. **Pick the highest-impact optimization** from the prioritized backlog below
3. **Implement the change** — commit with a descriptive message
4. **Measure**: Run build analysis and/or Lighthouse
5. **Record results** in `perf-results.tsv` (do NOT commit this file)
6. **If improved**: Keep the commit, advance the branch
7. **If worse or broken**: `git reset --hard HEAD~1`, log as `discard`/`broken`
8. **Repeat** — pick the next optimization

## Prioritized Optimization Backlog

Work through these categories in order. Within each category, pick the highest-impact item first.

### Phase 1: Bundle Size Reduction (Biggest Bang)

| # | Optimization | Expected Impact | Files |
|---|-------------|----------------|-------|
| 1.1 | **Remove unused `recharts` dependency** | -40KB gzipped | `package.json` |
| 1.2 | **Replace Framer Motion on NeonCard with CSS** | -15KB + eliminate 20+ JS animation handlers | `src/components/shared/NeonCard.tsx` |
| 1.3 | **Replace Framer Motion on BehavioralLanding with CSS** | -20KB + eliminate scroll listeners | `src/components/landing/BehavioralLanding.tsx` |
| 1.4 | **Replace remaining Framer Motion with CSS/IntersectionObserver** | Remove `framer-motion` entirely (-60KB) | All 15+ motion components |
| 1.5 | **Audit Radix UI imports** — tree-shake unused components | -10KB if unused components found | `package.json`, component imports |
| 1.6 | **Remove `@anthropic-ai/sdk` from client bundle** if server-only | -650KB if leaking to client | Check imports |

### Phase 2: Code Splitting & Lazy Loading

| # | Optimization | Expected Impact | Files |
|---|-------------|----------------|-------|
| 2.1 | **Dynamic import BehavioralLanding** (725 LOC) | Faster initial route load | `src/app/page.tsx` or parent |
| 2.2 | **Dynamic import SearchBar** (264 LOC) | Defer until interaction | `src/components/shared/Header.tsx` |
| 2.3 | **Lazy load heavy page components** (Dashboard 418, Quests 357) | Reduce initial JS per route | Page files |
| 2.4 | **Add `loading.tsx` skeletons** for each route group | Perceived performance + Suspense boundaries | `src/app/(auth)/*/loading.tsx` |

### Phase 3: Network & Data Fetching

| # | Optimization | Expected Impact | Files |
|---|-------------|----------------|-------|
| 3.1 | **Fix Quests waterfall** — parallel fetch season + quests | -1-2s on quests page | `src/app/(auth)/quests/page.tsx` |
| 3.2 | **Deduplicate user summary polling** — Header + UserProvider both poll | -50% redundant requests | `UserProvider.tsx`, `Header.tsx` |
| 3.3 | **Add `Cache-Control` headers to static API responses** | Reduce redundant fetches | API route handlers |
| 3.4 | **Batch reactions API** — single request instead of per-submission | Reduce request count on feed | `src/app/(auth)/feed/page.tsx` |
| 3.5 | **Add `stale-while-revalidate` pattern** to UserProvider | Instant UI with background refresh | `UserProvider.tsx` |

### Phase 4: Rendering Performance

| # | Optimization | Expected Impact | Files |
|---|-------------|----------------|-------|
| 4.1 | **Convert NeonCard hover to CSS `transform`** with `will-change` | GPU-accelerated, no JS overhead | `NeonCard.tsx` |
| 4.2 | **Add `content-visibility: auto`** on off-screen feed items | Skip layout/paint for hidden cards | Feed page CSS |
| 4.3 | **Virtualize long lists** (leaderboard, feed) if >50 items | Eliminate DOM bloat | Leaderboard, Feed pages |
| 4.4 | **Remove noise texture `::before` pseudo-element** or make it static PNG | Eliminate composite layer | Global CSS |
| 4.5 | **Reuse YouTube IFrame player** instead of destroy/recreate per video | Eliminate DOM churn | `AiOrNotPanel.tsx` |

### Phase 5: Font & Asset Optimization

| # | Optimization | Expected Impact | Files |
|---|-------------|----------------|-------|
| 5.1 | **Self-host fonts** instead of fontshare.com | Eliminate external origin, faster TTFB | `src/app/layout.tsx`, `/public/fonts/` |
| 5.2 | **Add `font-display: optional`** for non-critical font | Eliminate FOUT flash | Font CSS |
| 5.3 | **Convert inline SVG data URIs to static files** | Cacheable, smaller CSS | Global styles |
| 5.4 | **Use Next.js `<Image>`** for any raster images | Auto WebP, lazy load, srcset | Components with `<img>` |

### Phase 6: Build & Infra Optimization

| # | Optimization | Expected Impact | Files |
|---|-------------|----------------|-------|
| 6.1 | **Enable `optimizePackageImports`** in next.config | Better tree-shaking for Radix, wallet adapters | `next.config.ts` |
| 6.2 | **Add bundle analyzer** to track regressions | Visibility into future bloat | `next.config.ts`, `package.json` |
| 6.3 | **Set `serverExternalPackages`** for heavy server-only deps | Prevent client bundle contamination | `next.config.ts` |

## Smoothness Targets

| Metric | Current (est.) | Target | Stretch |
|--------|---------------|--------|---------|
| Lighthouse Perf | ~72 | 90+ | 95+ |
| LCP | ~2.4s | <1.5s | <1.0s |
| CLS | ~0.08 | <0.05 | <0.01 |
| FID/INP | ~120ms | <50ms | <30ms |
| Bundle (gzip) | ~380KB | <200KB | <150KB |
| Hydration | ~800ms | <400ms | <200ms |

## Butter-Smooth Checklist

These are the "feel" optimizations that make the difference between fast and *smooth*:

- [ ] All page transitions feel instant (skeleton → content, no blank flash)
- [ ] Hover effects on cards are GPU-accelerated CSS (no JS in the loop)
- [ ] Scroll performance is 60fps (no scroll-linked JS animations)
- [ ] Font loading doesn't cause layout shift (proper fallback metrics)
- [ ] Navigation between auth pages is near-instant (prefetching)
- [ ] Typing in search bar has zero input lag (debounced, no blocking renders)
- [ ] Feed/leaderboard scrolling is smooth even with 100+ items
- [ ] Game panel (AiOrNot) video transitions are seamless (preloaded)
- [ ] Notifications badge updates without page flicker
- [ ] Wallet connect modal appears instantly

## NEVER STOP

Once the experiment loop begins, do NOT pause to ask if you should continue. Run experiments autonomously until manually stopped. If you run out of ideas from the backlog, think harder — profile the build output, read Next.js docs for new optimizations, combine previous near-misses, try more aggressive code splitting strategies. The loop runs until interrupted.
