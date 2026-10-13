# UNZANAC Community Platform

The website and admin platform for the UNZA congregation of the New Apostolic Church: announcements, events, committees, media, resources and the member register.

- **Plan:** [docs/PLAN.md](docs/PLAN.md) (Phase 1 spec) · [docs/ROADMAP.md](docs/ROADMAP.md) (Phases 0–4)
- **How the technology works:** [docs/TECH.md](docs/TECH.md)
- **Decisions:** [docs/decisions/](docs/decisions/)
- **Where the work stands:** [docs/STATUS.md](docs/STATUS.md) · **Working from several machines:** [docs/WORKING-ACROSS-MACHINES.md](docs/WORKING-ACROSS-MACHINES.md)

## Requirements

- Node.js 20.9 or later (CI uses Node 24)
- PostgreSQL 17 for local development: installed on your PC (recommended), or Docker (optional)

## Databases

| Environment | Database |
|---|---|
| Local | PostgreSQL 17 on your PC (or Docker via `docker-compose.yml`) |
| CI | Postgres 17 service container in GitHub Actions |
| Staging / production | [Neon](https://neon.tech): separate projects or branches for staging and production |

## First-time setup

### 1. Local PostgreSQL

Install PostgreSQL 17 (Windows installer from postgresql.org; skip Stack Builder). Then open **SQL Shell (psql)** or pgAdmin's Query Tool as the `postgres` user and run:

```sql
CREATE USER unzanac WITH PASSWORD 'unzanac_dev' CREATEDB;
CREATE DATABASE unzanac OWNER unzanac;
```

`CREATEDB` is required: `prisma migrate dev` creates a temporary "shadow" database to check migrations.

*Using Docker instead?* Run `npm run db:up`; it creates the same user and database.

### 2. App

```bash
npm install                 # also generates the Prisma client
cp .env.example .env        # local settings; never commit .env
npm run db:migrate          # apply migrations
npm run db:seed             # add the nine committees
npm run dev                 # http://localhost:3000
```

### 3. First admin (owner)

Admin accounts are invite-only, and two-step sign-in (an authenticator app) is required. Create the first owner's invite link:

```bash
npm run admin:invite-owner -- you@example.com "Your Name"
```

Open the printed link, set a password, sign in, and scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator or similar). Owners invite everyone else from **/admin/users**. The script refuses to run once an active owner exists.

### E2E tests and the test database

`npm run test:e2e` runs against a **separate database, `unzanac_test`**, which is **dropped and recreated on every run** (`tests/e2e/global-setup.ts`). The setup refuses any database whose name doesn't end in `_test`. Override it with `E2E_DATABASE_URL`. Your development database is never touched.

### Neon (staging and production)

Set these in the hosting provider's environment variables, never in the repo:

- `DATABASE_URL`: Neon's **pooled** connection string (host contains `-pooler`), used by the app.
- `DIRECT_URL`: Neon's **direct** connection string, used by `prisma migrate deploy`.
- `BETTER_AUTH_SECRET`: a long random value, different for each environment.
- `BETTER_AUTH_URL`: the site's public URL, e.g. `https://unzanac.org`.

Choose the Neon region closest to Zambia that Neon offers, and run the app's server functions in the same region.

## Everyday commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run check` | Lint + type check + unit tests (run before every push) |
| `npm run build` | Production build |
| `npm run test:e2e` | Playwright tests at phone size (360 px), accessibility (axe) and the home page byte budget. Run `npm run build` first |
| `npm run db:migrate -- --name <change>` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:studio` | Browse the local database |
| `npm run db:up` / `db:down` | Start / stop the optional Docker database |
| `npm run icons` | Regenerate app icons from `docs/brand/` |

First time running E2E tests: `npx playwright install chromium`.

## Project layout

```
src/app/            pages and routes (Next.js App Router)
src/components/     UI components (public/, later admin/ and ui/)
src/server/         server-only code: database client, later auth, policy, services
src/lib/            shared helpers: brand palette, committees, site settings
src/messages/       all user-facing text (en.json; Bemba and Nyanja in Phase 3)
src/i18n/           next-intl configuration
prisma/             schema, migrations, seed
tests/unit/         Vitest
tests/e2e/          Playwright
docs/               plan, roadmap, technology guide, decisions, brand assets
```

## Rules of the road

- **Brand colours come from tokens** (`bg-azure-700`, `text-ink`, …), never raw hex. Tailwind's default palette is switched off. Don't use `azure-500` for text smaller than 24 px. See [PLAN.md §3.3](docs/PLAN.md#33-brand-and-visual-design).
- **All text goes in `src/messages/en.json`**, not in components.
- **Server Components by default.** Add `"use client"` only when the phone really needs interactivity; every client component costs data for members.
- **Every change passes CI:** lint, types, unit tests, build, E2E at 360 px, axe (WCAG 2.2 AA), byte budget and Lighthouse.
- **This Next.js version differs from older docs and tutorials.** Read the guides bundled in `node_modules/next/dist/docs/` (see `AGENTS.md`).
