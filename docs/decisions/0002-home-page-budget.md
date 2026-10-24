# ADR 0002: Home page byte budget

- **Status:** accepted (13 Oct 2026, option 1)
- **Date:** 2026-10-13

## Context

The spec requires the home page to transfer **under 150 KB** and load in under 3 seconds on 3G. M0 measured an almost empty home page (production build, gzip, 360 px):

| Part | Transferred |
|---|---|
| HTML | 3.8 KB |
| CSS | 3.3 KB |
| Emblem image | 1.9 KB |
| **Our content in total** | **~9 KB** |
| Next.js + React framework JavaScript (6 files) | **~138 KB** |
| **Total** | **149.8 KB** |

The framework cost is fixed: it doesn't grow with content, but it can't be removed from App Router pages. It's larger than the ~90–100 KB estimated in the plan. Any real content (announcements, events, video thumbnail) will push the total over 150 KB.

Facts that matter for the decision:
- The JavaScript loads **asynchronously**. The page is fully readable from the server-rendered HTML + CSS (~9 KB) before any JavaScript arrives, so the speed target (under 3 s on 3G) depends on the HTML and CSS, not the framework.
- Framework files have content-hashed names and are cached for a year. A **repeat visit transfers only the HTML** (~4 KB), and from M6 the service worker serves even that offline.
- Production hosting (Vercel) serves Brotli, which is typically 15–20 % smaller than the gzip measured locally.

## Options

1. **Split the budget (recommended):**
   - *Critical path* (HTML + CSS + above-the-fold images) **≤ 50 KB**: this is what decides how fast the page appears on 3G.
   - *Total first visit* **≤ 200 KB**.
   - *Repeat visit* **≤ 20 KB**.
   - Keeps a strict, testable limit on everything we control; accepts the framework's one-time cost.
2. **Keep 150 KB total.** Content would have to be cut, or pages rebuilt without the framework's client runtime, which would mean dropping the App Router for public pages. That's a large cost for a one-time ~140 KB download.
3. **Keep 150 KB but measure with Brotli** in staging. This buys roughly 20 KB of headroom, which a few features would use up.

## Decision

**Option 1: split budget**, enforced in CI by `tests/e2e/home.spec.ts` (actual network bytes measured through Chrome DevTools) and `lighthouserc.json`:

| Budget | Limit | What it covers |
|---|---|---|
| Critical path | **≤ 50 KB** | HTML + CSS + images + fonts on first visit |
| First visit | **≤ 200 KB** | Everything, including framework JavaScript |
| Repeat visit | **≤ 20 KB** | Second visit with a warm browser cache |

When M1 added 403 pages (`authInterrupts`), the framework JavaScript grew to ~143 KB and the page reached 152.6 KB. That confirmed the single 150 KB limit couldn't hold once real features arrived.

## Consequences

- Our own bytes stay tightly limited (critical path), which is what decides speed on 3G.
- The framework's one-time cost is accepted and capped. Next.js upgrades that grow it are caught by the first-visit budget.
- Images, embeds and client components on public pages must fit inside the critical-path and first-visit limits.
