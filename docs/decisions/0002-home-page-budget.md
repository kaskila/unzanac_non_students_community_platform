# ADR 0002: Home page byte budget

- **Status:** proposed, waiting for a decision
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

Pending. Until it's made, CI enforces the original 150 KB total, which will start failing once real content is added in M2.
