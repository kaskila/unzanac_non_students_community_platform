# Project status

**Updated:** 13 Oct 2026
**Current branch:** `m1-admin-access` (pushed; built on `m0-foundation`)

## Done

| Milestone | Branch | State |
|---|---|---|
| M0 Foundation | `m0-foundation` | Pushed. **Not merged to `main` yet**: open a pull request to run CI for the first time |
| M1 Admin access | `m1-admin-access` | Pushed. All checks pass locally (lint, types, 66 unit, 9 E2E). Ready for review and pull request after M0 |

### M1 summary
- Better Auth: invite-only email + password, **required TOTP two-step sign-in**, backup codes, 8-hour idle sessions, rate limits (5 sign-ins/min, lockout after 10 wrong codes).
- Roles `owner` / `register_officer` / `editor`; all rules in `src/server/policy.ts` with a full matrix test.
- `/admin/users` (invite, change role, deactivate, reset link, revoke), `/admin/audit`, `/admin/register` placeholder (403 for editors).
- Bootstrap first owner: `npm run admin:invite-owner -- email "Name"`. Sign in with the **full email address**.
- Dates and numbers use Zambian English (`en-ZM`).

## Decisions made

- **Byte budget:** critical path ≤ 50 KB, first visit ≤ 200 KB, repeat visit ≤ 20 KB ([ADR 0002](decisions/0002-home-page-budget.md)).
- **Databases:** local PostgreSQL 17 for development (Docker optional), **Neon** for staging and production.
- **"Committee"**, not "group", everywhere (9 committees, PLAN.md §3.4).
- **Brand:** Azure `#5793c9` + White; `azure-700`/`azure-900` for small text (contrast).
- E2E tests use a separate `unzanac_test` database that is reset on every run.

## Next steps

1. Open a pull request `m0-foundation` → `main` on GitHub. Check CI; merge.
2. Open a pull request `m1-admin-access` → `main`. Review; merge.
3. Start **M2: content + public site** on a new branch `m2-content` (PLAN.md §11): site content, committees admin, announcements, events (recurring + .ics), public pages.

## Open items (need someone, not code)

- Accounts for staging: Vercel, Neon (choose the region nearest Zambia), Sentry.
- Official NAC emblem **SVG**, and the district's rules for using the emblem.
- Permanent Facebook page URL (the share link can expire).
- Service times, committee leaders and meeting times, "New here" text (the Phase 0 content pack).
- The existing member register (needed before M3).

## Known issues

- `npm audit` flags high-severity issues in Prisma CLI's bundled MySQL driver and ESLint dependencies. They aren't in the app's runtime; Dependabot will pick up the fixes.
- `experimental.authInterrupts` (for 403 pages) is still experimental in Next.js 16. Recheck on upgrades.
