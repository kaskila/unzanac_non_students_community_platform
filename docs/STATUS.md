# Project status

**Updated:** 13 Oct 2026
**Current branch:** `landing-redesign` (built on `m2b-media`)

## Done

| Milestone | Branch | State |
|---|---|---|
| M0 Foundation | `m0-foundation` | Pushed. **Not merged to `main` yet**: open a pull request to run CI for the first time |
| M1 Admin access | `m1-admin-access` | Pushed. All checks pass locally (lint, types, 66 unit, 9 E2E). Ready for review and pull request after M0 |
| M2 Content + public site | `m2-content` | Pushed. All checks pass locally (lint, types, 102 unit, 13 E2E incl. journeys 1 and 2). Ready for pull request after M1 |
| M2b Media + resources | `m2b-media` | Pushed. All checks pass locally (lint, types, 111 unit, 18 E2E incl. journeys 7 and 8). R2 not yet tried for real (no account yet) |

### M1 summary
- Better Auth: invite-only email + password, **required TOTP two-step sign-in**, backup codes, 8-hour idle sessions, rate limits (5 sign-ins/min, lockout after 10 wrong codes).
- Roles `owner` / `register_officer` / `editor`; all rules in `src/server/policy.ts` with a full matrix test.
- `/admin/users` (invite, change role, deactivate, reset link, revoke), `/admin/audit`, `/admin/register` placeholder (403 for editors).
- Bootstrap first owner: `npm run admin:invite-owner -- email "Name"`. Sign in with the **full email address**.
- Dates and numbers use Zambian English (`en-ZM`).

### M2 summary
- Admin: **announcements** (draft, publish, schedule, expiry, pin, category, committee, archive, WhatsApp text to copy), **events** (one-off or repeating weekly / fortnightly / monthly by date / monthly by weekday / last weekday, optional last date; cancel or move a single date with a note), **committees** (create, edit, order, hide), **site content** (home welcome, location, visit page, contacts, social links, verse of the week, versioned privacy notice), dashboard with "nothing posted for 7 days" warning.
- Public: home page with next service card, announcements (pinned first + latest 3), this week, regular schedule, committees, contacts, verse; `/announcements`, `/events` (list grouped by day), `/events/[slug]` + `/ics`, `/committees`, `/visit`, `/privacy`.
- Public pages are prerendered and cached for 5 minutes (`cacheLife("public")`); admin saves call `updateTag()` so changes appear at once. Reads live in `src/server/public.ts`, writes in `src/server/services/*`.
- Internal public links use `NavLink` (`next/link` with prefetch off) so visitors don't download pages they never open.

### M2b summary
- **Media:** paste a YouTube (video, Short, live, playlist) or Facebook link → draft with title from YouTube oEmbed → categorise, feature (one at a time), publish. Channel uploads are imported as drafts nightly (`/api/cron/daily`, `vercel.json`) or with "Check for new uploads"; needs the channel ID in Site content → Social links.
- **Public:** `/watch` (by category; "titles only" mode), `/watch/[slug]` with tap-to-play `youtube-nocookie.com` player and "Watch in the YouTube app"; Facebook videos are link cards. Home shows the featured video and a "Live now" banner while an event with a livestream link is running.
- **Resources:** create → upload straight to storage with a progress bar → server checks size and real type (first bytes, `file-type`) → publish. Replace keeps the link, versions are listed, downloads are counted. Public `/resources` (by category, search), `/resources/[slug]` ("PDF · 1.2 MB"), `/resources/[slug]/download` (count + 5-minute signed link). Unlisted items are link-only. Owners can delete; files are purged 30 days later by the daily job.
- **Storage drivers** (`src/server/storage`): `r2` for staging/production, `local` (`.storage/` + `/api/dev-storage`) for development and E2E, refused in production unless `ALLOW_LOCAL_STORAGE=1`.

### Landing redesign (from the congregation's mockup)
- Grey page with a white header card (emblem, name, **Church finder** → visit page directions, **Contact** → `/contact`) and an Azure menu bar: Home, Committees, Announcements, Activities (`/events`), Media (`/watch`), About (`/about`), plus a search box (`/search`, across announcements, activities, committees, videos, resources). On phones the menu folds into "Menu".
- Menu text is 19px bold so white on Azure passes WCAG as large text (3.27:1).
- **Home photos** (Admin → Home photos): uploaded with a required description, checked to be JPG/PNG/WebP, resized to 480/960/1440px WebP banners (camera location data removed), served from `/images/hero/…` with year-long caching. The slider loads only the first photo; others load when the visitor swipes or taps an arrow.
- New editable "About us" text under Site content.
- **Welcome section** under the slider (from the congregation's design): the Rector's portrait (built-in, `assets/people/rector.png` → `npm run hero`), "Rector: Shephard Liswaniso", the heading and the framed welcome message; all texts editable under Site content → Home page welcome.
- **Footer** from the design: Azure band with emblem, "New Apostolic Church / UNZA Congregation", YouTube · TikTok · Facebook · WhatsApp icons (shown when a link is set; WhatsApp = the congregation's group link) and Privacy policy · Terms of use (`/terms`, starting text for leadership to review).
- Home page budget, measured like a real phone (360px at 2× density, as Lighthouse does): critical path ~35 KB of 50, first visit ~179 KB (Lighthouse ~189 KB) of 200. Photos are served as AVIF (WebP fallback); the slider's first photo is 16 KB; the Rector's portrait and the video thumbnail load only when scrolled near. The framework's JavaScript (~145 KB) is most of the first visit, so anything new near the top of the home page needs a size check.

## Decisions made

- **Byte budget:** critical path ≤ 50 KB, first visit ≤ 200 KB, repeat visit ≤ 20 KB ([ADR 0002](decisions/0002-home-page-budget.md)).
- **Databases:** local PostgreSQL 17 for development (Docker optional), **Neon** for staging and production.
- **"Committee"**, not "group", everywhere (9 committees, PLAN.md §3.4).
- **Brand:** Azure `#5793c9` + White; `azure-700`/`azure-900` for small text (contrast).
- E2E tests use a separate `unzanac_test` database that is reset on every run. Spec files create their own admins with `inviteAdmin()` (test-only, `tests/e2e/invite-admin.ts`) and use their own `x-forwarded-for` address so parallel sign-ins don't share a rate limit.
- **Recurrence without a library:** events support only the RRULE patterns the admin form offers (`src/lib/recurrence.ts`, fully unit-tested), instead of the `rrule` package. Times are calculated in Lusaka wall-clock time (UTC+2, no daylight saving) and `.ics` files use `TZID=Africa/Lusaka`.
- **Limited Markdown without a library:** `src/lib/markdown.ts` escapes all HTML first, then adds bold, italic, lists and safe links only.
- **Phone numbers:** contacts use a small Zambian normaliser (`src/lib/phone.ts`). The register (M3) moves to `libphonenumber-js` as planned.
- **Events have `isService`**: the home page's "Next service" card shows the next date of a published event marked as a divine service.
- Detail pages (`/announcements/[slug]`, …) stream their content inside `<Suspense>` instead of using `generateStaticParams` (Cache Components requires at least one param at build time). Their data is still cached; unknown slugs show the 404 page with `noindex`.

## Next steps

1. Fill in real content from the Phase 0 content pack in Admin → Site content and Events (service times, location, contacts).
2. **R2 setup for staging:** create a private bucket per environment, an API token, and a CORS rule allowing `PUT` from the site's origin; set `R2_*` and `CRON_SECRET` in Vercel (`.env.example`). Then try journey 8 on staging.
3. Pull requests: `m1-admin-access` → `main` (includes M0), then `m2-content` → `main`.
4. Then **M3: register core** on `m3-register` (PLAN.md §11). Needs the existing register file.

## Open items (need someone, not code)

- Accounts for staging: Vercel, Neon (choose the region nearest Zambia), Sentry.
- Official NAC emblem **SVG**, and the district's rules for using the emblem.
- Permanent Facebook page URL (the share link can expire).
- Service times, committee leaders and meeting times, "New here" text (the Phase 0 content pack).
- The existing member register (needed before M3).

## Known issues

- **Stale public page after a save, under concurrent traffic:** if a cached page (e.g. the home page) is being re-rendered at the moment an admin saves, that render can finish after `updateTag()` and keep the old content until the next 5-minute refresh. Seen only when E2E specs load "/" in parallel; tests use `gotoFresh()`. Fix to investigate: a second `revalidateTag` shortly after the save, or a shorter cache life for the home page.

- Security: Next.js upgraded 16.4.0 → **16.4.3** on 24 Oct 2026 (fixes a critical remote-code-execution advisory in `use cache`, plus image-optimisation RCE and a server-action DoS). `npm audit fix` also cleared the Prisma CLI dependency advisories: `npm audit` reports 0 vulnerabilities. Next.js now stops builds when the installed version has a known advisory, so keep it patched (Dependabot is on).
- `experimental.authInterrupts` (for 403 pages) is still experimental in Next.js 16. Recheck on upgrades.
