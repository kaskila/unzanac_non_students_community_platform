# UNZANAC Community Platform

Website and admin platform for the UNZA congregation of the New Apostolic Church (Zambia). Built for non-student members first, on budget Android phones over mobile data.

**Start here:** `docs/STATUS.md` (where the work stands and what's next). Then `docs/PLAN.md` (Phase 1 spec), `docs/ROADMAP.md` (phases), `docs/TECH.md` (stack), `docs/decisions/` (ADRs), `docs/WORKING-ACROSS-MACHINES.md`.

@AGENTS.md

## Conventions

- Next.js 16 with Cache Components: read `node_modules/next/dist/docs/` before using Next APIs. Session reads go inside `<Suspense>`; actions use `refresh()`/`updateTag()`.
- Brand tokens only (`bg-azure-700`, `text-ink`…). Tailwind's default palette is disabled. Never use `azure-500` for text under 24 px.
- All user-facing text goes in `src/messages/en.json`. Dates and numbers are formatted as `en-ZM`, time zone `Africa/Lusaka`.
- Every permission check goes through `src/server/policy.ts` (`requirePermission` in `src/server/session.ts`). Admin changes write to the audit log.
- Server Components by default; client components only where the phone needs interactivity.
- Prisma 7: all `DateTime` fields use `@db.Timestamptz(3)`. Run `npx prisma generate` after migrations.
- Say "committee", never "group".
- Before finishing: `npm run check`, `npm run build`, `npm run test:e2e`. E2E resets `unzanac_test`; Prisma asks the user for consent when an AI agent runs it.
- Update `docs/STATUS.md` when a piece of work is finished or a decision is made.
- Commit and push as **Kasikila** (`git config user.name "Kasikila"` in this repo; check before committing).
