# Jito Cabal — Feature Roadmap & Technical Research

> Generated 2026-03-29. Reference doc for planning next development phases.

---

## Table of Contents

1. [Current State Summary](#current-state-summary)
2. [Account Page Audit](#account-page-audit)
3. [Feature Gap Analysis](#feature-gap-analysis)
4. [Database Schema Map](#database-schema-map)
5. [API Endpoint Inventory](#api-endpoint-inventory)
6. [Prioritized Feature Requests](#prioritized-feature-requests)
7. [Technical Debt](#technical-debt)
8. [Implementation Notes](#implementation-notes)

---

## Current State Summary

### What's Working
- **Auth**: Wallet signature auth (nonce/sign/verify), holder verification via Helius DAS API, session cookies with CSRF
- **Submissions**: Three types (X posts, blogs, art), duplicate detection, rate limiting, moderation workflow
- **AI Scoring**: Claude API with 5-dimension scoring (relevance 30%, originality 25%, effort 20%, engagement 15%, accuracy 10%)
- **Points & Tiers**: Immutable ledger, streak bonuses (+5%/day capped at 1.5x), 6 achievement tiers, 10 XP levels
- **Leaderboard**: Weekly brackets (30-member cohorts), all-time view, 30s cache
- **Streaks**: Shield system, comeback bonus, 1-day grace period
- **Seasons**: Role selection (Builder/Scout/Guardian/Curator), quests, world boss, signal storms
- **AI-or-Not Game**: YouTube Shorts voting, consensus-based scoring, independent streak
- **Admin Portal**: Moderation queue, manual points, season management, audit trail

### What's Broken or Disabled
- **Rewards claiming**: Built but feature-gated (`REWARDS_CLAIM_ENABLED=false`). Needs treasury + payout pipeline.
- **Community stats endpoint**: TODO in code, not implemented. Landing page stats show zeros.
- **Avatar URL**: Field exists in DB, fetched by API, but never displayed (profile uses initials).

---

## Account Page Audit

**File**: `src/app/(auth)/profile/[address]/page.tsx`
**API**: `src/app/api/profile/[address]/route.ts`
**Redirect**: `/profile/me` → `/profile/[walletAddress]` (server-side)

### Currently Displayed
| Section | Data Shown |
|---------|-----------|
| Header card | Initials avatar, display name (or truncated wallet), wallet address, level badge, streak badge, weekly points |
| Stats grid (5 cols) | Submissions, Approved, Total Points, Avg Score, Best Streak |
| Contributions | Last 50 submissions — title, type, date, status, points |
| Points history | Last 20 ledger entries — type, delta, timestamp |
| Badges | 9 available badges with earned/unearned state |

### Available in API but NOT Displayed
| Data | Status |
|------|--------|
| `avatar_url` | Fetched, never rendered (initials shown instead) |
| `rewards[]` | Fetched for self/admin, not rendered on profile |
| `x_handle` / `x_user_id` | In DB, not fetched or displayed |
| `nft_mint_address` | In DB, not displayed |
| `holder_verified_at` | In DB, not displayed |
| `scoring_breakdown` | Per-submission, not displayed |
| `reactions` | Table exists, not fetched for profile |

### Completely Missing from Account Page
- **No edit profile** — display name, avatar upload, bio
- **No settings page** — notification prefs, privacy, theme
- **No rewards section** — despite data being available
- **No NFT holder badge** — despite verification data existing
- **No X/Twitter link** — despite handle being stored
- **No account management** — deletion, export, security

### Visibility Rules
- Non-self viewers: only see approved submissions and `submission_approved` point entries
- Rewards only returned for `is_self || is_admin`
- `viewer: { is_self, is_admin }` context object available

### Badge System (9 badges)
| ID | Icon | Requirement |
|----|------|-------------|
| `first_blood` | ⚡ | First submission |
| `thread_weaver` | 🧵 | 5 X post submissions |
| `wordsmith` | ✍️ | 5 blog submissions |
| `artist` | 🎨 | 5 art submissions |
| `perfectionist` | 💎 | Score 90+ |
| `iron_will` | 🔥 | 30-day streak |
| `century` | 💯 | 100 total submissions |
| `top_cabal` | 👑 | #1 weekly leaderboard |
| `consistent` | 📅 | Submit every week for 4 weeks |

### Level System (10 levels)
| Level | Name | XP Required |
|-------|------|-------------|
| 1 | Initiate | 0 |
| 2 | Acolyte | 100 |
| 3 | Sentinel | 300 |
| 4 | Guardian | 600 |
| 5 | Warden | 1,000 |
| 6 | Oracle | 1,500 |
| 7 | Phantom | 2,500 |
| 8 | Sovereign | 4,000 |
| 9 | Architect | 6,000 |
| 10 | Shadow Council | 10,000 |

### Tier System (6 tiers — separate from levels)
Tiers: Newcomer → Contributor → Guide → Champion → Legend → Founder
Unlocks include: badges, themes, mentor opt-in, council access, challenge sponsorship, community spotlight

---

## Feature Gap Analysis

### Critical Gaps (High Impact — No Workaround)

#### 1. Notifications System
- **Status**: Completely missing
- **Impact**: Users don't know when submissions are approved/rejected, tiers unlocked, quests completed, or rewards available
- **Requires**: `notifications` table, in-app notification UI, optional email delivery
- **Scope**: ~3-5 days

#### 2. Profile Editing
- **Status**: No endpoint, no UI
- **Impact**: Users can't set display name, avatar, or link social accounts
- **Requires**: `PATCH /api/me/profile` endpoint, edit form UI, avatar upload integration
- **Scope**: ~2 days

#### 3. Activity Feed
- **Status**: Points feed exists (personal only), no community feed
- **Impact**: No sense of community activity, no social proof
- **Requires**: Community activity timeline component, aggregated events
- **Scope**: ~2-3 days

#### 4. Community Stats Endpoint
- **Status**: TODO in `CommunityStats.tsx`, endpoint not built
- **Impact**: Landing page stats all show zero
- **Requires**: `GET /api/community-stats` returning aggregate counts
- **Scope**: ~0.5 day

### Medium Gaps (Moderate Impact)

#### 5. Real-Time Updates
- **Status**: All data fetched on page load with `cache: 'no-store'`, no live updates
- **Impact**: Stale leaderboards, no live notifications
- **Options**: Supabase Realtime subscriptions, polling, or SSE
- **Scope**: ~2-3 days

#### 6. Rewards Payout Pipeline
- **Status**: Endpoint built but disabled. Missing treasury setup and SOL transfer logic
- **Impact**: Users earn rewards they can't claim
- **Requires**: Treasury wallet, payout worker, transaction tracking
- **Scope**: ~3-5 days

#### 7. Content Search & Filtering
- **Status**: No search anywhere
- **Impact**: Can't find specific submissions, creators, or content
- **Requires**: Full-text search index, filter UI, date range queries
- **Scope**: ~2 days

#### 8. User Settings Page
- **Status**: No settings infrastructure
- **Impact**: No notification prefs, privacy controls, or theme selection
- **Requires**: `user_preferences` table or JSONB column, settings UI
- **Scope**: ~2 days

#### 9. Submission Reactions (Social)
- **Status**: `reactions` table exists in DB, not used anywhere in UI
- **Impact**: No social engagement layer on submissions
- **Requires**: Reaction buttons on submission cards, API endpoints
- **Scope**: ~1-2 days

#### 10. Creator Analytics
- **Status**: Scoring breakdown stored but not displayed to users
- **Impact**: Users can't understand what makes high-scoring content
- **Requires**: Radar chart or breakdown display, trend graphs
- **Scope**: ~2 days

### Lower Gaps

#### 11. Governance/Voting
- No DAO features, community polls, or content voting

#### 12. Messaging/DMs
- No member-to-member communication

#### 13. Referral System
- No referral tracking or bonuses

#### 14. Data Export
- No CSV/JSON export for submissions or points history

#### 15. Appeals Process
- No way for users to appeal rejected submissions

---

## Database Schema Map

### 28 Tables

```
CORE
├── users ─────────────── wallet, display_name, avatar_url, level, xp, streak, badges (JSONB)
├── submissions ────────── type, url, title, content, scores, status, points_awarded, content_hash
├── reactions ──────────── submission_id, wallet, type (fire/hundred/brain/art/clap)
├── points_ledger ──────── wallet, entry_type, points_delta, metadata (JSONB) [IMMUTABLE]
└── rewards ───────────── wallet, week_number, amount_lamports, status, tx_signature

AUTH & SECURITY
├── auth_nonces ────────── nonce, wallet, used, timestamps
├── admin_wallets ──────── wallet, active, added_by
├── audit_logs ─────────── action, actor, target, details (JSONB) [APPEND-ONLY]
└── rate_limits ────────── wallet, action, count, window_start

SEASONS
├── seasons ───────────── name, theme, status, start/end dates, config (JSONB)
├── season_roles ──────── role_key, title, description, perks
├── season_member_state ── wallet, role_key, opt_out, last_role_change_at
├── season_quests ──────── title, rules, points_reward, role_key
├── season_quest_submissions ── wallet, evidence_type, evidence_id, status
├── season_events ──────── type, active, multiplier, start/end, note
├── season_world_boss_progress ── metric_key, current_value, target_value
└── season_world_boss_updates ── metric_key, delta, idempotency_key

ENGAGEMENT
├── member_streak_state ── current_days, shields, last_activity, broken_at, comeback_used
├── next_action_templates ── action_id, title, reason, conditions
├── point_reason_catalog ── reason_key, label, explanation
├── engagement_events ──── event_type, wallet, properties (JSONB)
├── weekly_snapshots ───── week snapshot data

GAME
├── game_votes ─────────── wallet, video_id, vote, matched_consensus, points
├── game_player_state ──── wallet, points, streak

REWARDS
└── reward_claims ──────── reward_id, wallet, idempotency_key, amount, status, tx_sig
```

### Key RPC Functions
- `increment_game_state(wallet, points_delta, new_streak)` — atomic game state update
- `increment_user_xp(wallet, delta)` — atomic XP increment
- `consume_nonce(nonce, wallet)` — atomic nonce consumption
- `cleanup_expired_nonces()` — periodic cleanup
- `aggregate_leaderboard_weekly(week_start, week_end)` — SQL-side leaderboard
- `aggregate_leaderboard_alltime()` — SQL-side all-time rankings

### Entity Relationships
```
users 1:N → submissions 1:N → reactions
users 1:N → points_ledger
users 1:N → rewards 1:1 → reward_claims
users 1:1 → member_streak_state
users 1:1 → game_player_state
users 1:N → game_votes
users N:M → seasons (via season_member_state)
seasons 1:N → season_roles
seasons 1:N → season_quests 1:N → season_quest_submissions
seasons 1:N → season_events
seasons 1:N → season_world_boss_progress
```

---

## API Endpoint Inventory

### Auth (3 endpoints — all working)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/auth/nonce` | Working |
| POST | `/api/auth/verify` | Working |
| GET/DELETE | `/api/auth/session` | Working |

### User (5 endpoints — all working)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/me/summary` | Working |
| GET | `/api/me/command-center` | Working |
| GET | `/api/me/points-feed` | Working (paginated) |
| POST | `/api/me/next-action/impression` | Working |
| GET | `/api/profile/[address]` | Working |

### Submissions (4 endpoints — all working)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/submissions` | Working |
| GET | `/api/submissions` | Working (scope=mine\|community) |
| GET | `/api/submissions/[id]` | Working |
| POST | `/api/uploads/image` | Working (malware scan) |

### Leaderboard (1 endpoint — working)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/leaderboard` | Working (range=week\|all) |

### Rewards (1 endpoint — disabled)
| Method | Path | Status |
|--------|------|--------|
| POST | `/api/rewards/claim` | **DISABLED** (503, needs treasury) |

### Game (2 endpoints — working)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/game/shorts` | Working |
| POST | `/api/game/vote` | Working |

### Seasons (7 endpoints — all working)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/seasons/current` | Working |
| GET | `/api/seasons/current/quests` | Working |
| POST | `/api/seasons/current/quests/[id]/submit` | Working |
| POST | `/api/seasons/current/opt-out` | Working |
| POST | `/api/seasons/current/role` | Working |

### Admin (6 endpoints — all working)
| Method | Path | Status |
|--------|------|--------|
| GET | `/api/admin/submissions` | Working |
| POST | `/api/admin/submissions/[id]/review` | Working |
| POST | `/api/admin/points` | Working |
| GET/POST | `/api/admin/seasons` | Working |
| POST | `/api/admin/seasons/[id]/signal-storm` | Working |
| POST | `/api/admin/seasons/[id]/world-boss/progress` | Working |

### New Endpoints (built 2026-03-29)
| Method | Path | Status |
|--------|------|--------|
| GET/PATCH | `/api/me/profile` | **Working** — get/edit display name |
| GET | `/api/community-stats` | **Working** — public aggregate stats |
| GET/POST | `/api/submissions/[id]/react` | **Working** — reaction toggle |

### Still Missing Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| PUT | `/api/me/settings` | Notification prefs, privacy, theme |
| GET/POST | `/api/notifications` | User notifications |
| GET | `/api/search` | Full-text search |

---

## Prioritized Feature Requests

### Phase 1: Account Page & Quick Wins (3-4 days)

| # | Feature | Scope | Impact | Status |
|---|---------|-------|--------|--------|
| 1.1 | **Profile editing** — display name, avatar upload, X handle display | 2d | High | ✅ Done (display name) |
| 1.2 | **Community stats endpoint** — unblock landing page zeros | 0.5d | Medium | ✅ Done |
| 1.3 | **Show rewards on profile** — data exists, just wire UI | 0.5d | Medium | ✅ Done |
| 1.4 | **Show NFT holder badge + verification date** on profile | 0.5d | Low | ✅ Done |
| 1.5 | **Redesign account page** — match Vault aesthetic, add edit mode, rewards tab | 1d | High | ✅ Done |

### Phase 2: Notifications & Social (4-5 days)

| # | Feature | Scope | Impact | Status |
|---|---------|-------|--------|--------|
| 2.1 | **Notifications table + API** — submission decisions, tier ups, achievements | 2d | Critical | ✅ Done |
| 2.2 | **In-app notification bell** — unread count, dropdown, mark-read | 1d | Critical | ✅ Done |
| 2.3 | **Submission reactions** — wire existing `reactions` table to UI | 1-2d | Medium | ✅ Done (API + dashboard UI) |
| 2.4 | **Community activity feed** on dashboard — recent approvals, milestones | 1d | Medium | ✅ Done |

### Phase 3: Engagement & Analytics (3-4 days)

| # | Feature | Scope | Impact | Status |
|---|---------|-------|--------|--------|
| 3.1 | **Creator analytics** — scoring breakdown radar chart, submission trends | 2d | Medium | ✅ Partial (breakdown in profile tabs) |
| 3.2 | **User settings page** — notification prefs, privacy toggle, theme | 1-2d | Medium | ✅ Done |
| 3.3 | **Content search & filtering** — full-text search, type/date filters | 1-2d | Medium | ✅ Done |

### Phase 4: Commerce & Rewards (3-5 days)

| # | Feature | Scope | Impact | Status |
|---|---------|-------|--------|--------|
| 4.1 | **Treasury setup docs** — SOL wallet, funding, security | 1d | High | ✅ Done |
| 4.2 | **Enable rewards claiming** — payout worker, tx tracking | 2-3d | High | ✅ Done |
| 4.3 | **Reward projections** — show estimated earnings based on current pace | 1d | Medium | ✅ Done |

### Phase 5: Real-Time & Polish (3-4 days)

| # | Feature | Scope | Impact | Status |
|---|---------|-------|--------|--------|
| 5.1 | **Supabase Realtime** — live leaderboard, notification delivery | 2d | Medium | Pending |
| 5.2 | **Data export** — CSV download for submissions, points | 0.5d | Low | Pending |
| 5.3 | **Appeals process** — rejected submission appeal workflow | 1-2d | Medium | Pending |

### Future Phases
- Governance/voting system
- Member-to-member messaging
- Referral tracking and bonuses
- Mentor matching system
- Challenge sponsorship mechanics
- Mobile PWA optimization

---

## Technical Debt

| Issue | Severity | Notes |
|-------|----------|-------|
| No real-time infrastructure | Medium | All data is fetch-on-load. Supabase Realtime available but unused. |
| Single Supabase client (lazy singleton) | Low | Works fine at current scale, may need pooling later. |
| No request caching | Medium | Every page load hits DB. Consider ISR or edge caching. |
| Analytics events recorded but never visualized | Low | `engagement_events` table fills up with no dashboard. |
| Game points separate from main points | Low | `game_player_state` vs `points_ledger` — intentional but could confuse users. |
| Audit logs are fire-and-forget | Medium | Silently swallows failures. Could lose critical records. |
| No structured logging/tracing | Medium | Only `console.error` in error paths. No observability. |
| `REWARDS_CLAIM_ENABLED` not in `.env.example` | Low | Code checks it but it's undocumented. |
| Rate limiting is wallet-based only | Low | No IP fallback if wallet spoofing occurs. |

---

## Implementation Notes

### Key Files for Account Page Work
```
src/app/(auth)/profile/[address]/page.tsx    ← Profile display
src/app/api/profile/[address]/route.ts       ← Profile API
src/app/api/me/summary/route.ts              ← User summary
src/app/api/auth/session/route.ts            ← Session management
src/lib/types.ts                             ← Types, badges, levels
src/lib/points.ts                            ← Level/XP calculations
src/lib/db.ts                                ← Supabase client
src/lib/sql/rpc-functions.sql                ← Database functions
```

### Design System Reference
- **Font headings**: `font-display` (Clash Display)
- **Font body**: `font-sans` (Satoshi)
- **Accent**: `#D4A853` (gold) — CSS var `--accent`
- **Base bg**: `#08080a` — CSS var `--bg-base`
- **Buttons on gold**: use `text-[#08080a]` for dark text on gold backgrounds
- **Cards**: `NeonCard` component with gold hover glow

### Supabase Migrations Location
```
supabase/migrations/
├── 20260324_command_center_seasons.sql
├── 20260325_auth_nonces.sql
├── 20260325_security_audit_fixes.sql
├── 20260325_security_audit_v2.sql
└── 20260325_leaderboard_aggregation.sql
```
