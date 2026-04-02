# Navigation & Page Restructure — Design Spec

## Problem Statement
1. Landing nav uses internal jargon (Pillars, Engine, Simulator) that means nothing to visitors
2. Dashboard and Leaderboard are only accessible via footer — no primary nav path into the app
3. Three sub-pages (Engine, Pillars, Simulator) fragment one topic into confusing separate routes
4. Hero content appears left-aligned/uncentered, especially on mobile
5. Homepage CTA "Test the Simulator" sends cold visitors to advanced content
6. No clear identity statement for first-time visitors

## Solution

### New Page Structure
```
/                → Home (with identity statement, centered hero)
/how-it-works    → Consolidated page (Pillars + Engine + Simulator sections)
/leaderboard     → Public leaderboard (social proof, visible without auth)
/roadmap         → Roadmap (unchanged, label is clear)
```

### New Landing Nav
```
[JC Logo]   How It Works   Leaderboard   Roadmap   [Connect Wallet →]
```

### Changes Required

#### 1. Create `/how-it-works` consolidated page
- Section 1: Philosophy (from Pillars — three SDT cards)
- Section 2: The Pipeline (from Engine — 5-step process)
- Section 3: What We Refuse to Build (from Engine — anti-patterns)
- Section 4: Try the Simulator (from Simulator — interactive toggles)
- Section 5: CTA — "Connect Wallet" / "View Leaderboard"
- All content centered with `max-w-7xl mx-auto text-center` for headings

#### 2. Update Landing Nav
- Replace: Pillars, Engine, Simulator, Roadmap
- With: How It Works, Leaderboard, Roadmap
- Add Connect Wallet CTA button (always visible, not just desktop)

#### 3. Center hero content on homepage
- Add `text-center` to hero heading and subhead on mobile (when preview cards hidden)
- Center CTAs on mobile: `justify-center` on the button row
- Center feature chips on mobile

#### 4. Fix homepage CTAs
- Primary CTA: "How It Works" (replaces "Test the Simulator")
- Secondary CTA: "Open Dashboard" (keep)

#### 5. Update footer
- Remove "Learn" column (pages no longer exist as separate routes)
- Keep Platform column with Dashboard, Leaderboard, Submit, Quests

#### 6. Keep old routes working
- `/pillars`, `/engine`, `/simulator` should redirect to `/how-it-works`
- Or simply keep the files but remove them from nav

### Scope Guardrails
- DO NOT change auth pages, sidebar, mobile nav, or any app functionality
- DO NOT change the Roadmap page content
- DO NOT add new dependencies
- Only modify: landing nav, landing pages, homepage, footer
