# Project status

**Updated:** 13 Oct 2026
**Current branch:** `m2-content` (built on `m1-admin-access`)

## Done

| Milestone | Branch | State |
|---|---|---|
| M0 Foundation | `m0-foundation` | Pushed. **Not merged to `main` yet**: open a pull request to run CI for the first time |
| M1 Admin access | `m1-admin-access` | Pushed. All checks pass locally (lint, types, 66 unit, 9 E2E). Ready for review and pull request after M0 |
| M2 Content + public site | `m2-content` | **In progress.** Built; lint, types, 102 unit tests and build pass. M2 E2E tests (`tests/e2e/content.spec.ts`) written, not yet run |

### M1 summary
- Better Auth: invite-only email + password, **required TOTP two-step sign-in**, backup codes, 8-hour idle sessions, rate limits (5 sign-ins/min, lockout after 10 wrong codes).
- Roles `owner` / `register_officer` / `editor`; all rules in `src/server/policy.ts` with a full matrix test.
- `/admin/users` (invite, change role, deactivate, reset link, revoke), `/admin/audit`, `/admin/register` placeholder (403 for editors).
- Bootstrap first owner: `npm run admin:invite-owner -- email "Name"`. Sign in with the **full email address**.
- Dates and numbers use Zambian English (`en-ZM`).

### M2 summary (so far)
- Admin: **announcements** (draft, publish, schedule, expiry, pin, category, committee, archive, WhatsApp text to copy), **events** (one-off or repeating weekly / fortnightly / monthly by date / monthly by weekday / last weekday, optional last date; cancel or move a single date with a note), **committees** (create, edit, order, hide), **site content** (home welcome, location, visit page, contacts, social links, verse of the week, versioned privacy notice), dashboard with "nothing posted for 7 days" warning.
- Public: home page with next service card, announcements (pinned first + latest 3), this week, regular schedule, committees, contacts, verse; `/announcements`, `/events` (list grouped by day), `/events/[slug]` + `/ics`, `/committees`, `/visit`, `/privacy`.
- Public pages are prerendered and cached for 5 minutes (`cacheLife("public")`); admin saves call `updateTag()` so changes appear at once. Reads live in `src/server/public.ts`, writes in `src/server/services/*`.
- Internal public links use `NavLink` (`next/link` with prefetch off) so visitors don't download pages they never open.

## Decisions made

- **Byte budget:** critical path ≤ 50 KB, first visit ≤ 200 KB, repeat visit ≤ 20 KB ([ADR 0002](decisions/0002-home-page-budget.md)).
- **Databases:** local PostgreSQL 17 for development (Docker optional), **Neon** for staging and production.
- **"Committee"**, not "group", everywhere (9 committees, PLAN.md §3.4).
- **Brand:** Azure `#5793c9` + White; `azure-700`/`azure-900` for small text (contrast).
- E2E tests use a separate `unzanac_test` database that is reset on every run.
- **Recurrence without a library:** events support only the RRULE patterns the admin form offers (`src/lib/recurrence.ts`, fully unit-tested), instead of the `rrule` package. Times are calculated in Lusaka wall-clock time (UTC+2, no daylight saving) and `.ics` files use `TZID=Africa/Lusaka`.
- **Limited Markdown without a library:** `src/lib/markdown.ts` escapes all HTML first, then adds bold, italic, lists and safe links only.
- **Phone numbers:** contacts use a small Zambian normaliser (`src/lib/phone.ts`). The register (M3) moves to `libphonenumber-js` as planned.
- **Events have `isService`**: the home page's "Next service" card shows the next date of a published event marked as a divine service.
- Detail pages (`/announcements/[slug]`, …) stream their content inside `<Suspense>` instead of using `generateStaticParams` (Cache Components requires at least one param at build time). Their data is still cached; unknown slugs show the 404 page with `noindex`.

## Next steps

1. Run `npm run build && npm run test:e2e` (resets `unzanac_test`) and fix anything the M2 journeys find.
2. Fill in real content from the Phase 0 content pack in Admin → Site content and Events (service times, location, contacts).
3. Pull requests: `m1-admin-access` → `main` (includes M0), then `m2-content` → `main`.
4. Then **M2b: media + resources** on `m2b-media` (PLAN.md §11).

## Open items (need someone, not code)

- Accounts for staging: Vercel, Neon (choose the region nearest Zambia), Sentry.
- Official NAC emblem **SVG**, and the district's rules for using the emblem.
- Permanent Facebook page URL (the share link can expire).
- Service times, committee leaders and meeting times, "New here" text (the Phase 0 content pack).
- The existing member register (needed before M3).

## Known issues

- `npm audit` flags high-severity issues in Prisma CLI's bundled MySQL driver and ESLint dependencies. They aren't in the app's runtime; Dependabot will pick up the fixes.
- `experimental.authInterrupts` (for 403 pages) is still experimental in Next.js 16. Recheck on upgrades.
