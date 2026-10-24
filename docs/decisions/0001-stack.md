# ADR 0001: Application stack

- **Status:** accepted
- **Date:** 2026-10-13

## Context

The platform is built and maintained by volunteers, used mostly on budget Android phones over mobile data, and holds sensitive personal data (church membership). It needs a public site, an admin area and a member register, with member login later.

## Decision

- **One Next.js 16 application** (App Router, Server Components, Server Actions, Cache Components) for both the public site and admin area. No separate API service.
- **TypeScript (strict)**, **Tailwind CSS v4** with brand tokens only, **next-intl** for all text.
- **PostgreSQL** with **Prisma 7** (`prisma-client` generator, `@prisma/adapter-pg`). All timestamps are `timestamptz`.
- **Better Auth** for authentication (added in M1).
- **Vitest** for unit tests; **Playwright + axe-core** for E2E and accessibility; **Lighthouse CI** for performance; **GitHub Actions** for CI.
- Databases: PostgreSQL 17 installed locally for development (Docker optional), **Neon** for staging and production (pooled URL for the app, direct URL for migrations). Hosting target: Vercel, with functions in the same region as the Neon database.

Full rationale: [docs/TECH.md](../TECH.md).

## Consequences

- One codebase and one deploy keeps maintenance small for a volunteer team.
- The App Router ships a fixed amount of framework JavaScript on every page. See [ADR 0002](0002-home-page-budget.md) for its effect on the byte budget.
- Next.js 16 APIs differ from many tutorials; contributors must use the docs bundled in `node_modules/next/dist/docs/`.
