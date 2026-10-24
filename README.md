# UNZANAC Community Platform

[![CI](https://github.com/kaskila/unzanac_non_students_community_platform/actions/workflows/ci.yml/badge.svg)](https://github.com/kaskila/unzanac_non_students_community_platform/actions/workflows/ci.yml)

The website and admin platform of the **UNZA congregation of the New Apostolic Church, Zambia**: announcements, services and activities, committees, videos, downloadable resources and, from milestone M3, the member register.

It is built first for members who are not students: people on **budget Android phones over mobile data**. The home page arrives in about 35 KB, works at 360 px wide, meets WCAG 2.2 AA, and nothing heavy (videos, maps, extra photos) loads until someone asks for it.

---

## Contents

- [What it does](#what-it-does)
- [Project status](#project-status)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Commands](#commands)
- [Testing](#testing)
- [Project layout](#project-layout)
- [Images and brand assets](#images-and-brand-assets)
- [Deployment](#deployment)
- [Working on the code](#working-on-the-code)
- [Documentation](#documentation)

---

## What it does

### Public website (no login)

| Page | What visitors get |
|---|---|
| **Home** (`/`) | Photo slider (changes every 6 s, pausable), welcome message from the Rector, next divine service with "Add to calendar", pinned and latest announcements, this week's activities, regular schedule, committees, featured video, newest resources, contacts |
| **Announcements** (`/announcements`) | Current notices, each with a "Share on WhatsApp" link |
| **Activities** (`/events`) | Services and events for the next two months; event pages with directions and an `.ics` calendar file |
| **Media** (`/watch`) | Videos by category: thumbnails (or titles only, to save data); the YouTube player loads only when someone taps play |
| **Resources** (`/resources`) | Hymn sheets, notices and practice audio to download, with type and size shown first; search; unlisted items by link only |
| **Committees**, **About**, **Contact**, **Plan your visit** | Who we are, how to reach us, what to expect |
| **Church finder** (`/church-finder`) | Zoomable Google map of the church and "Get directions" for the Maps app |
| **Search** (`/search`) | One box across announcements, activities, committees, videos and resources |
| **Privacy policy**, **Terms of use** | Versioned privacy notice; terms (both editable by admins) |

### Admin area (`/admin`, invite-only)

Every admin signs in with email, password **and** an authenticator app (two-step sign-in is required). What each admin can do depends on their role:

| | Owner | Register officer | Editor |
|---|:-:|:-:|:-:|
| Announcements, activities, committees, videos, resources | ✅ | ✅ | ✅ |
| Site content (welcome text, contacts, social links, photos, privacy notice, terms) | ✅ | ✅ | |
| Member register (from M3) | ✅ | ✅ | |
| Export the register, delete resources | ✅ | | |
| Admin users and the audit log | ✅ | | |

All rules live in [`src/server/policy.ts`](src/server/policy.ts) and are covered by a test of every role × action. Every change an admin makes is written to the audit log.

---

## Project status

Phase 1 of the [roadmap](docs/ROADMAP.md): public site, admin area and member register.

| Milestone | State |
|---|---|
| M0 Foundation | ✅ Done |
| M1 Admin access (2FA, roles, audit log) | ✅ Done |
| M2 Content + public site | ✅ Done |
| M2b Media + resources | ✅ Done |
| Landing redesign (from the congregation's mockups) | ✅ Done |
| M3 Member register | 🚧 In progress |
| M4 Join form + review queue · M5 Update links + campaigns · M6 Installable app + offline · M7 Hardening + launch | Planned |

The live, detailed picture (open items, decisions, known issues) is in **[docs/STATUS.md](docs/STATUS.md)**.

---

## Technology

| Concern | Choice |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Cache Components, Server Actions), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4 with brand tokens only (Azure `#5793c9` + white); system fonts |
| Database | PostgreSQL 17 via [Prisma 7](https://www.prisma.io) (`@prisma/adapter-pg`); `pg_trgm` for fuzzy name search |
| Auth | [Better Auth](https://www.better-auth.com): email + password, required TOTP, invite-only, database rate limits |
| Validation | Zod |
| Text and dates | next-intl (English now; Bemba and Nyanja planned), `en-ZM` formats, `Africa/Lusaka` time |
| Files | Cloudflare R2 via the S3 API (local folder in development); `file-type` checks real file types; `sharp` resizes photos to AVIF/WebP |
| Video | YouTube oEmbed and channel RSS, `youtube-nocookie.com` player on tap |
| Tests | Vitest (unit), Playwright + axe-core (end-to-end, accessibility, byte budgets), Lighthouse CI |
| Hosting (planned) | Vercel + Neon Postgres + Cloudflare R2 |

Why each was chosen, in plain language: **[docs/TECH.md](docs/TECH.md)**.

> **Note:** this Next.js version differs from many tutorials. Read the guides in `node_modules/next/dist/docs/` before using a Next.js API (see [AGENTS.md](AGENTS.md)).

---

## Getting started

### Requirements

- **Node.js 24** (20.9 or later works; CI uses 24)
- **PostgreSQL 17**, installed locally (recommended on Windows) or through Docker
- Git

### 1. Database

Create a user and database (in **SQL Shell (psql)** or pgAdmin as the `postgres` user):

```sql
CREATE USER unzanac WITH PASSWORD 'unzanac_dev' CREATEDB;
CREATE DATABASE unzanac OWNER unzanac;
```

`CREATEDB` lets Prisma create its temporary "shadow" database when checking migrations.
Using Docker instead? `npm run db:up` creates the same user and database.

### 2. Install and run

```bash
git clone https://github.com/kaskila/unzanac_non_students_community_platform.git
cd unzanac_non_students_community_platform
npm install                 # also generates the Prisma client
cp .env.example .env        # then set BETTER_AUTH_SECRET (see below)
npm run db:migrate          # create the tables
npm run db:seed             # add the nine committees
npm run dev                 # http://localhost:3000
```

Generate a secret for `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 3. Your admin account

Admin accounts are invite-only. Create the first Owner's invite link:

```bash
npm run admin:invite-owner -- you@example.com "Your Name"
```

Open the link, set a password, sign in **with the full email address**, and scan the QR code with an authenticator app (Google Authenticator, Microsoft Authenticator, …). The script refuses to run once an Owner exists; Owners invite everyone else from **Admin → Admin users**.

Working from more than one computer? Follow **[docs/WORKING-ACROSS-MACHINES.md](docs/WORKING-ACROSS-MACHINES.md)**.

---

## Environment variables

Copy [`.env.example`](.env.example) to `.env`. **Never commit `.env`.** Staging and production values live only in the hosting provider and a password manager.

| Variable | Needed | Purpose |
|---|---|---|
| `DATABASE_URL` | always | Postgres connection. On Neon: the **pooled** string (`-pooler`), with `?sslmode=require` |
| `DIRECT_URL` | Neon | Direct (non-pooled) connection for migrations |
| `BETTER_AUTH_SECRET` | always | Long random secret; different per environment |
| `BETTER_AUTH_URL` | always | The site's own address, e.g. `http://localhost:3000` |
| `NEXT_PUBLIC_SITE_URL` | always | Public address used in share text, `.ics` files and links |
| `CRON_SECRET` | production | Protects `/api/cron/daily` (Vercel Cron sends it as a Bearer token) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | staging, production | Cloudflare R2 for resources and uploaded photos. Unset locally: files go to `.storage/` |
| `STORAGE_DRIVER` | optional | `r2` or `local` to force a storage driver |

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run check` | Lint + type check + unit tests. **Run before every push** |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run test:e2e` | End-to-end tests (run `npm run build` first) |
| `npm run db:migrate -- --name <change>` | Create and apply a migration after editing `prisma/schema.prisma` |
| `npm run db:deploy` | Apply migrations (staging/production) |
| `npm run db:seed` | Seed the committees |
| `npm run db:studio` | Browse the local database |
| `npm run db:up` / `db:down` | Start / stop the optional Docker database |
| `npm run admin:invite-owner -- <email> "<name>"` | Invite link for the first Owner |
| `npm run hero` | Rebuild the built-in home photos and the Rector's portrait (see below) |
| `npm run icons` | Rebuild the app icons from `docs/brand/` |

---

## Testing

```bash
npm run check                 # lint, types, unit tests (Vitest)
npm run build
npx playwright install chromium   # first time only
npm run test:e2e              # Playwright
```

- **Unit tests** (`tests/unit/`) cover the permission matrix, recurring events, `.ics` files, Markdown, phone numbers, file checks, brand contrast and more.
- **End-to-end tests** (`tests/e2e/`) run the critical journeys from [PLAN.md §9](docs/PLAN.md) at **360 px**, check every public page with **axe (WCAG 2.2 AA)**, and measure the home page's **byte budget** like a real 2× phone ([ADR 0002](docs/decisions/0002-home-page-budget.md): critical path ≤ 50 KB, first visit ≤ 200 KB, repeat visit ≤ 20 KB).
- E2E uses a **separate database, `unzanac_test`, which is dropped and recreated on every run**. Setup refuses any database whose name doesn't end in `_test`; your development data is never touched. When an AI agent runs the tests, Prisma asks for your consent before the reset.
- **CI** (GitHub Actions) runs all of the above plus Lighthouse on every pull request and every push to `main`.

---

## Project layout

```
src/
  app/
    (public)/          public pages: home, announcements, events, watch, resources, committees, …
    admin/             admin area (sign-in, 2FA, and the protected modules)
    api/               auth, daily cron, local storage (development only)
    images/            uploaded home photos, served from storage
  components/
    public/            public UI (header, menu, slider, welcome, footer, …)
    admin/             admin forms and fields
  server/              server-only code
    services/          one module per area: announcements, events, videos, materials, admins, …
    storage/           R2 and local storage drivers
    policy.ts          every permission rule
    public.ts          cached reads for public pages
  lib/                 shared helpers (dates, recurrence, Markdown, phone, files, site content, …)
  messages/en.json     all user-facing text
prisma/                schema, migrations, seed
assets/                original photos (not served; see "Images")
public/                static files served as-is (icons, emblem, generated photos)
scripts/               invite-owner, generate-hero, generate-icons
tests/unit/            Vitest
tests/e2e/             Playwright
docs/                  plan, roadmap, status, technology guide, decisions, brand
```

---

## Images and brand assets

- **Brand:** Azure `#5793c9` and white, defined once as tokens in [`src/app/globals.css`](src/app/globals.css) and checked for contrast by a unit test. Azure on white (and white on Azure) is only used for text of 24 px and above, or 18.7 px bold. Rules: [PLAN.md §3.3](docs/PLAN.md#33-brand-and-visual-design).
- **Built-in home photos** and the **Rector's portrait**: originals live in `assets/` (not public). `npm run hero` writes small AVIF and WebP versions to `public/hero/` (about 16 KB for the first photo on a phone). To change them, replace the files in `assets/hero-photos/` or `assets/people/rector.png` (and the list in [`src/lib/hero.ts`](src/lib/hero.ts)), then run `npm run hero`.
- **Photos uploaded by admins** (Admin → Home photos) replace the built-in ones automatically. They are checked, resized, stripped of location data and stored in R2.
- **Emblem:** the New Apostolic Church emblem belongs to the Church. The official SVG and usage guidelines are still to come from the district.

---

## Deployment

Planned setup (see [docs/STATUS.md](docs/STATUS.md) for what is done):

1. **Neon** Postgres: separate staging and production databases, region nearest Zambia.
2. **Cloudflare R2**: one private bucket per environment, an API token per bucket, and a CORS rule allowing `PUT` from the site's address (browsers upload straight to R2).
3. **Vercel**: connect the GitHub repository, set the environment variables above, and run server functions in the same region as the database. `vercel.json` schedules the daily job (YouTube import, storage clean-up).
4. Migrations run with `npm run db:deploy`. Pull requests are checked by CI; `main` holds reviewed milestones only.

Before launch (M7): Content-Security-Policy (allowing `youtube-nocookie.com` and the Google Maps embed), security review, backup restore drill.

---

## Working on the code

- **Branches:** one branch per milestone (e.g. `m3-register`), merged into `main` through a pull request once CI is green.
- **Before pushing:** `npm run check`; before a pull request also `npm run build` and `npm run test:e2e`.
- **Commits** are authored as **Kasikila** (`git config user.name "Kasikila"`).
- **Conventions** (details in [CLAUDE.md](CLAUDE.md)):
  - brand tokens only, never raw colours; Tailwind's default palette is switched off;
  - every user-facing text in `src/messages/en.json`;
  - Server Components by default; a client component only where the phone needs interactivity (each one costs members data);
  - every permission check through `src/server/policy.ts`; admin changes write to the audit log;
  - say "committee", never "group";
  - update `docs/STATUS.md` when a piece of work is finished or a decision is made.
- **Security:** never commit secrets; `npm audit` should report 0 vulnerabilities; keep Next.js patched (it refuses to build a version with a known advisory). Report security problems privately to the maintainers, not in a public issue.

---

## Documentation

| Document | What's in it |
|---|---|
| [docs/STATUS.md](docs/STATUS.md) | Where the work stands, decisions, open items, known issues. **Start here** |
| [docs/PLAN.md](docs/PLAN.md) | Phase 1 specification: pages, admin modules, data model, security, quality targets |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Phases 0–4 |
| [docs/TECH.md](docs/TECH.md) | The technology, explained in plain language |
| [docs/decisions/](docs/decisions/) | Architecture decision records (stack, byte budget) |
| [docs/WORKING-ACROSS-MACHINES.md](docs/WORKING-ACROSS-MACHINES.md) | Setting up and switching between computers |

---

No open-source licence has been chosen yet. Please ask the maintainers before reusing this code or its content.
