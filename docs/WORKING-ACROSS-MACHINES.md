# Working on the platform from more than one machine

GitHub is the single source of truth: <https://github.com/kaskila/unzanac_non_students_community_platform>. Every machine is a copy. You **push before you leave** and **pull when you arrive**.

## What travels and what doesn't

| Travels through GitHub | Stays on each machine (set up once per machine) |
|---|---|
| All code, migrations, tests, docs (`docs/`), `CLAUDE.md` | `.env` (secrets and local settings) |
| `package-lock.json` (exact library versions) | `node_modules/`, `.next/`, the generated Prisma client |
| `prisma/migrations/` (database **structure**) | Your local database **data** (admins, test content) |
| | Claude Code conversations and memory |

Because conversations don't travel, **write decisions into the repo**. `docs/STATUS.md` records where the work stands, and `docs/decisions/` holds the ADRs. A new Claude session on another machine reads those, plus `CLAUDE.md`.

## One-time setup on a new machine

1. **Install**
   - Git and Node.js 24 (LTS).
   - PostgreSQL 17. During install, remember the `postgres` password; you can skip Stack Builder.
   - VS Code and Claude Code, if you use them.
2. **Git identity** (use the same on every machine):
   ```powershell
   git config --global user.name "Kasikila"
   git config --global user.email "your-email@example.com"
   ```
3. **Get the code**:
   ```powershell
   git clone https://github.com/kaskila/unzanac_non_students_community_platform.git
   cd unzanac_non_students_community_platform
   git fetch --all
   git checkout <current branch from docs/STATUS.md>
   ```
   On Windows, Git Credential Manager opens a browser window to sign in to GitHub the first time you push.
4. **Database user and database** (PowerShell, enter the `postgres` password when asked):
   ```powershell
   & "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost `
     -c "CREATE USER unzanac WITH PASSWORD 'unzanac_dev' CREATEDB;" `
     -c "CREATE DATABASE unzanac OWNER unzanac;"
   ```
5. **Settings file**: copy the example, then put a fresh secret in it:
   ```powershell
   Copy-Item .env.example .env
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   Paste the printed value into `BETTER_AUTH_SECRET=""` in `.env`. Each machine can have its own local secret.
6. **Install, migrate, seed**:
   ```powershell
   npm install
   npm run db:migrate
   npm run db:seed
   npx playwright install chromium
   ```
7. **Your admin account on this machine** (local databases are separate, so each machine needs its own):
   ```powershell
   npm run dev
   # in a second terminal:
   npm run admin:invite-owner -- you@example.com "Your Name"
   ```
   Open the link, set a password, then sign in **with the full email address** and enrol your authenticator app. Name the entry in the app so you can tell machines apart, e.g. "UNZANAC (home)" and "UNZANAC (work)".
8. **Check that everything works**:
   ```powershell
   npm run check
   npm run build
   npm run test:e2e
   ```

## Every time you sit down

```powershell
git status                 # should be clean; if not, finish or stash what's there
git pull                   # get what you pushed from the other machine
npm install                # only needed if package-lock.json changed, but harmless
npm run db:migrate         # applies any new migrations to this machine's database
npm run dev
```

Read the "Next steps" section of `docs/STATUS.md`.

## Every time you stop (even for lunch, if you might switch machines)

```powershell
npm run check              # lint, types, unit tests
git add -A
git commit -m "Short description of what changed"
git push
```

If the work is unfinished, commit it anyway with a message like `WIP: invite form validation`. A pushed WIP commit is better than work stranded on the other machine. Update `docs/STATUS.md` when you finish a piece of work or make a decision.

## Branches

- `main` holds finished, reviewed milestones only.
- Each milestone gets its own branch, e.g. `m1-admin-access`, `m2-content`. Open a **pull request** on GitHub to merge it into `main`, so CI runs the full checks first.
- Work on the same branch on both machines. Push before switching machines and pull after, and the branch never splits.
- If `git pull` reports a conflict, it means both machines changed the same lines without a push in between. Git marks the conflicting lines in the files; edit them to the version you want, then `git add`, `git commit`, `git push`.

## Secrets

- **Never commit `.env`**. It's ignored by git on purpose.
- Local secrets (`BETTER_AUTH_SECRET` for your dev database) can differ per machine.
- Staging and production secrets (Neon URLs, auth secret) live **only** in the hosting provider (Vercel) and a password manager. Don't email them or send them over WhatsApp.

## Optional: one shared development database

By default, each machine has its own local database, so data (test admins, sample content) isn't shared. If you want the same data on both machines, create a **Neon branch called `dev`**. Put its pooled URL in `DATABASE_URL` and its direct URL in `DIRECT_URL` in `.env` on both machines.

- Pros: same data everywhere, nothing to install.
- Cons: needs internet, slightly slower, and both machines must apply migrations to the same database. Run `npm run db:migrate` on one machine only per change.

Keep the E2E test database (`unzanac_test`) **local** either way: tests wipe it on every run.

## Claude Code on another machine

- Conversations and Claude's memory are stored per machine, so they don't carry over.
- `CLAUDE.md` (committed) tells Claude where the plan, status and conventions are. Start a session with something like: *"Read docs/STATUS.md and continue with the next step."*
- When Claude runs `npm run test:e2e`, Prisma asks for your explicit consent to reset `unzanac_test`. That's expected.
