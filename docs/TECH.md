# UNZANAC Platform: Technology Guide

**Audience:** anyone who will build or maintain the platform.
**Related:** [PLAN.md](PLAN.md) (Phase 1 specification) · [ROADMAP.md](ROADMAP.md) (Phases 0–4)

This guide explains which technologies the platform uses, why each was chosen, and how they work together. The platform is **one Next.js application** (public site + admin area), **one PostgreSQL database**, and a few external services.

---

## 1. Core

### TypeScript (language)
- **What:** JavaScript with types. You declare the shape of data, e.g. a member has a `firstName` that is a string.
- **Why:** misspelled fields, missing values and wrong types are caught in the editor before the code runs. That matters for a volunteer project maintained by different people over the years.
- **How:** `.ts`/`.tsx` files are type-checked (`tsc`, `strict` mode, no `any`) and compiled to JavaScript.

### Next.js 16 (framework, built on React)
- **What:** one framework for both the pages and the server code. There are no separate front-end and back-end projects.
- **Why:**
  - **Server rendering:** pages arrive as ready HTML, so budget phones show content without downloading and running much JavaScript. This is how we meet the 150 KB home page budget.
  - **Caching:** public pages are built once and served from a CDN (a network of servers near the visitor) until content changes.
- **How:**
  - **File-based routing:** `src/app/(public)/events/page.tsx` serves `/events`.
  - **Server Components (default):** run only on the server, can query the database, send HTML. None of their code reaches the phone.
  - **Client Components** (`"use client"`): only where the phone needs interaction, such as the multi-step join form or the tap-to-play video. Keep these few and small.
  - **Server Actions:** server functions called by `<form>` submissions, e.g. `publishAnnouncement()`. Forms keep working if JavaScript fails to load.
  - **Revalidation:** after a change, call `revalidateTag("announcements")` so cached public pages are rebuilt.

### PostgreSQL (database)
- **What:** an open-source relational database.
- **Why:**
  - The data is relational: members ↔ households ↔ committees ↔ change history.
  - Postgres enforces constraints (e.g. unique slugs).
  - Transactions make a CSV import succeed or fail as a whole.
  - The `pg_trgm` extension does fuzzy matching for duplicate detection ("Chanda Mwila" vs "Chanda Mwilla").
- **How:** runs as a managed service; the app connects over TLS. Times are stored in UTC (`timestamptz`) and shown in `Africa/Lusaka`.

### Prisma 7 (database toolkit)
- **What:** the layer between the code and Postgres.
- **Why:** the schema is written once in `prisma/schema.prisma`, and Prisma generates a **typed client**, so queries like `prisma.member.findMany({ where: { status: "ACTIVE" } })` are autocompleted and type-checked. It also manages **migrations**.
- **How:**
  1. Edit `schema.prisma`.
  2. `npx prisma migrate dev --name <change>` creates a SQL migration in `prisma/migrations/`.
  3. Commit it.
  4. On deploy, `npx prisma migrate deploy` applies it.
- Configuration is in `prisma.config.ts`. Prisma 7 connects through the `pg` driver via `@prisma/adapter-pg`.

### Tailwind CSS v4 (styling) + shadcn/ui (admin components)
- **What:** utility classes in the markup, e.g. `class="bg-azure-700 text-white rounded-lg px-4 py-3"`.
- **Why:**
  - Only the classes actually used are shipped (usually under 10 KB of CSS).
  - Brand colours are **tokens**, so nobody types raw hex values and contrast rules are easy to follow.
- **How:** tokens are defined once under `@theme` in `src/app/globals.css`:

  | Token | Hex | Use |
  |---|---|---|
  | `azure-500` | `#5793c9` | Brand colour: large text ≥ 24 px, icons, focus ring, hero band |
  | `azure-700` | `#2f6fa8` | Buttons (white text), links, small Azure text (5.30:1 on white) |
  | `azure-900` | `#1f4f7a` | Headings, wordmark (8.54:1 on white) |
  | `white` | `#ffffff` | Backgrounds |

  Full palette and rules: [PLAN.md §3.3](PLAN.md#33-brand-and-visual-design). Never use `azure-500` for small text: it is only 3.27:1 on white.
- **shadcn/ui** is used **only in the admin area**. It provides accessible components (tables, dialogs, menus) copied into `src/components/ui/`, so they can be edited freely.

---

## 2. Security and data quality

### Better Auth (authentication)
- **What:** an open-source auth library that runs inside the app. It is not an external paid service.
- **Why:** user data stays in our database, there are no per-user fees, and it has the plugins we need now (email + password, TOTP two-factor) and later (phone + one-time code, Phase 2).
- **How:**
  1. Login checks the password hash, then the 6-digit code from the admin's authenticator app.
  2. A **session** row is stored in the database, and a secure, HTTP-only cookie (one page scripts can't read) is set.
  3. Each request reads the cookie → session → user and role.
- Configuration: `src/server/auth.ts`. Route handler: `src/app/api/auth/[...all]/route.ts`.
- Admin accounts are **invite-only**, and two-factor is **required**.

### Permission module (`src/server/policy.ts`)
- **What:** our own code: `can(actor, action, resource)`.
- **Why:** every access rule lives in one place and is covered by a table-driven test for each role × action combination.
- **How:** every server action calls it before touching data. Register queries choose which fields to return by role, so an Editor's query can't return sacrament or family fields, even by mistake.

### Zod (validation)
- **What:** schemas describing valid input, e.g. a phone number must be a valid Zambian number, and a date of birth can't be in the future.
- **Why:** the same schema gives instant feedback in the browser and enforces the rules on the server. Never trust what comes in.
- **How:** `memberSchema.safeParse(formData)` returns typed data or field errors. Schemas live in `src/lib/schemas/`.

### Spam protection
| Layer | How it works |
|---|---|
| **Cloudflare Turnstile** | Free, privacy-friendly CAPTCHA alternative, usually invisible. Loaded only on public form pages |
| **Honeypot** | A hidden field humans never fill in; submissions that fill it are dropped |
| **Rate limiting** | Caps login attempts and form submissions per IP/phone per time window |

### Update-link tokens
- Each member's link holds a 32-byte random token. Only its **SHA-256 hash** is stored, so a database leak doesn't expose usable links.
- Tokens expire (14 days by default), can be revoked, and lock after 5 failed year-of-birth checks.

---

## 3. Content and media

### Cloudflare R2 (file storage for Resources)
- **What:** S3-compatible object storage, used through the AWS S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`).
- **Why:** **no egress (download) fees**, and a 10 GB free tier.
- **How:**
  - **Upload:** the browser asks the server for a presigned PUT URL (10 min) → uploads **directly to R2** (bypassing the server's request size limit) → the server checks the stored object (size, real type via `file-type`) and records it.
  - **Download:** `/resources/[slug]/download` checks visibility → increments the count → redirects to a presigned GET URL (5 min) with `Content-Disposition: attachment`.
  - The bucket is **private**. HTML, SVG and executables are rejected.
- Code: `src/server/storage/`.

### YouTube (videos)
- **What:** videos are hosted on YouTube (channel `@UNZANACMUSICDEPT`). We store only IDs and details.
- **How:**
  - **oEmbed** (`https://www.youtube.com/oembed?url=…&format=json`, no API key): fetches title and thumbnail when an admin pastes a link.
  - **Channel RSS** (`https://www.youtube.com/feeds/videos.xml?channel_id=UC…`): a daily cron imports new uploads as drafts.
  - **Tap to play:** pages show a thumbnail (~15 KB). The `youtube-nocookie.com` player (~1 MB) is inserted only when someone taps play.
- Facebook is **linked, not embedded**: its embeds are heavy and set tracking cookies.
- Code: `src/server/youtube/`.

### Helper libraries
| Library | Job |
|---|---|
| `rrule` | Recurring events (RFC 5545) and `.ics` add-to-calendar files |
| `libphonenumber-js` | Normalises phone numbers to E.164: `0971 234 567` → `+260971234567` |
| `next-intl` | All text kept in `src/messages/*.json`, ready for Bemba and Nyanja |
| `papaparse` | CSV import of the register |
| `exceljs` | Excel export of the register |
| `file-type` | Detects a file's real type from its first bytes |

### PWA (installable app, offline reading)
- **Manifest:** tells the phone the app name, icon (the NAC emblem) and colours (`theme_color #5793c9`, `background_color #ffffff`).
- **Service worker** (Serwist, or a hand-written worker if Serwist doesn't work with Turbopack): a background script that caches `/`, `/announcements` and `/events`. Offline, it shows the cached copy. Online, it shows the cached copy first and refreshes it in the background ("stale-while-revalidate"). Logged-in pages are never cached.

---

## 4. Hosting and operations

| Service | Role | Why |
|---|---|---|
| **Vercel** | Runs the app; serves cached pages from edge locations, including in Africa | Simplest Next.js hosting, free tier, automatic deploys from GitHub |
| **Neon** (managed Postgres 17) | Staging and production database with automatic backups, point-in-time recovery and branching | No server maintenance; the app uses the pooled connection, migrations use the direct one |
| **Vercel Cron** | Daily jobs: expire tokens, retention cleanup, YouTube import, purge deleted files | No separate server |
| **GitHub + GitHub Actions** | Source code and CI | Nothing reaches production without passing the checks |
| **Sentry** | Error reporting, with request bodies and cookies stripped | Find bugs before members report them |
| **Uptime monitor** | Checks `/` and `/admin/login` | Alerts two people if the site goes down |

**Regions:** server functions run in the **same region as the database**. Cached public pages are served from the CDN location nearest the visitor.

**Environments:** local (PostgreSQL 17 installed on the PC; Docker optional) → staging → production (Neon). Each has its own database and R2 bucket. Each has its own database and R2 bucket.

---

## 5. Quality checks (CI on every change)

| Tool | Checks |
|---|---|
| ESLint + TypeScript | Code style and type errors |
| **Vitest** | Unit tests: permissions, recurrence, change diffs, duplicate detection, token checks, brand contrast pairs |
| **Playwright** | Real browser at 360 × 740 runs the critical journeys (see PLAN.md §9) |
| **@axe-core/playwright** | WCAG 2.2 AA accessibility rules on every public page and form |
| **Lighthouse CI** | Performance and byte budgets; the build fails if the home page goes over 150 KB |
| `npm audit`, Dependabot, secret scanning | Vulnerable dependencies and leaked secrets |

---

## 6. How it fits together

### A visitor opens the home page
```
Phone ──► Vercel edge (nearest location)
            ├─ cached HTML available → sent immediately
            └─ not cached → Next.js renders on the server (Prisma → Postgres), caches, sends
Then the service worker stores a copy, so the next visit works even offline.
```

### An admin publishes an announcement
```
Admin form ──► Server Action
           ──► Better Auth: who is this?
           ──► policy.can(): allowed?
           ──► Zod: is the input valid?
           ──► Prisma: save
           ──► audit log entry
           ──► revalidateTag("announcements") → public pages rebuilt
```

### A member uses an update link from WhatsApp
```
/u/<token> ──► hash token → find UpdateToken (not expired, not revoked, not locked)
           ──► year-of-birth check
           ──► form filled in from the Member record
           ──► submit → Submission with changed fields only
           ──► Secretariat reviews "old → new" → approve
           ──► Member updated + MemberChange history + audit log
```

### An admin uploads a resource
```
Admin picks file ──► server returns presigned PUT URL ──► browser uploads straight to R2
                 ──► server checks the object (size, real type) ──► MaterialFile + Material saved
Visitor taps Download ──► /resources/<slug>/download ──► count++ ──► 302 to presigned GET URL (5 min)
```

---

## 7. Running costs (Phase 1)

| Item | Expected cost |
|---|---|
| Vercel, Neon, Cloudflare R2 + Turnstile, Sentry, GitHub, YouTube | Free tiers, expected to be enough for a congregation of this size |
| Domain name | About US$10–20 a year |
| SMS | None in Phase 1 (from Phase 2, only if chosen) |

Review usage every quarter. Set alerts so storage or usage nearing a free-tier limit is noticed before it's billed.
