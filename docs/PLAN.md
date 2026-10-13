# UNZANAC Platform: Phase 1 Plan

**Scope:** public website, admin back office and member register, end to end.
**Status:** working draft, 13 Oct 2026. The register fields follow the New Apostolic Church structure we agreed and will change once the official NAC Zambia format is known.

---

## 1. What Phase 1 delivers

### In scope

1. **Public website** (no login): home page, announcements, events, regular schedule, committees, "New here", contacts, privacy notice.
2. **Join form**: a step-by-step membership and contact form that sends submissions to admin review.
3. **Register updates**: private per-member update links and update campaigns, so members can keep their details current without an account.
4. **Admin back office**: content management, the member register, a review queue, import and export, admin users and an audit log.
5. **Media**: YouTube videos (mainly from the UNZANAC Music Department channel) shown without the heavy player until someone taps play, plus Facebook links.
6. **Resources**: church materials uploaded by admins for members to download.
7. **Installable, low-data PWA** for the public site.

### Out of scope (later phases)

- Member login (phone + OTP), member directory, RSVP, push notifications, SMS
- Committee pages and committee posts, prayer requests, birthdays
- Bemba and Nyanja translations. Text is stored ready for them, but only English ships.
- Members-only resources (needs member login; "Unlisted" links cover this until then)
- Photo galleries, playlists/series, Facebook video embeds

### Success criteria

- The home page loads in under 3 seconds on throttled 3G and transfers under 150 KB.
- Admins can publish an announcement or event from a phone in under a minute.
- The existing register can be imported and duplicates cleaned up.
- An update campaign reaches every member through WhatsApp links and is tracked in one screen.
- WCAG 2.2 AA is met on all public pages and forms.

---

## 2. Users and roles

| Role | Typical person | Purpose |
|---|---|---|
| **Visitor** | Anyone | Reads the public site, submits the join form or an update link |
| **Owner** | Rector or delegate | Full control, including admin users, exports and settings |
| **Register officer** | Secretary or designated minister | Register, review queue, imports, campaigns |
| **Editor** | Ministers, committee leaders | Announcements, events, committees. No access to the register |

### Permission matrix

| Action | Owner | Register officer | Editor |
|---|:-:|:-:|:-:|
| Manage announcements, events, committees | ✅ | ✅ | ✅ |
| Manage videos and resources (upload, replace, archive) | ✅ | ✅ | ✅ |
| Delete a resource permanently | ✅ | ❌ | ❌ |
| Edit site content (home, visit, contacts) | ✅ | ✅ | ❌ |
| View register: name, contact, committees | ✅ | ✅ | ❌ |
| View register: sacraments, family, remarks | ✅ | ✅ | ❌ |
| Review queue (approve or reject submissions) | ✅ | ✅ | ❌ |
| Create campaigns, generate update links | ✅ | ✅ | ❌ |
| Import register | ✅ | ✅ | ❌ |
| Export register | ✅ | ❌ | ❌ |
| Archive member, process removal request | ✅ | ✅ (archive only) | ❌ |
| Manage admin users and roles | ✅ | ❌ | ❌ |
| View audit log | ✅ | ❌ | ❌ |

All permission rules live in `src/server/policy.ts` and are covered by table-driven tests.

---

## 3. Public website

### Sitemap

```
/                       Home
/announcements          All current announcements
/announcements/[slug]   Single announcement (shareable link)
/events                 Upcoming events (list, not a calendar grid)
/events/[slug]          Event detail + "Add to calendar" + directions
/events/[slug]/ics      iCalendar download (RFC 5545)
/committees             Committees and what they do
/committees/[slug]      Committee detail + "I'm interested" link to /join
/watch                  Videos by category (thumbnails or titles-only mode)
/watch/[slug]           Single video: tap-to-play player + "Watch in YouTube app"
/resources              Downloadable materials by category, with search
/resources/[slug]       Material detail (type, size, updated date)
/resources/[slug]/download   Counts the download, then redirects to a short-lived signed link
/visit                  New here / plan your visit
/join                   Step-by-step join form
/u/[token]              Personal register update link
/privacy                Privacy notice (versioned)
/offline                Offline fallback page
```

### Home page sections (360 px first)

1. Header: name, "Plan a visit", "Join"
2. Hero: one welcoming line, plus a **next service card** (date, time, venue, add to calendar, directions)
3. Announcements: pinned items first, then the latest 3, each with "Share on WhatsApp"
4. This week: the next 3–5 events
5. Regular schedule, generated from recurring events marked "show in schedule"
6. Committees: cards with "I'm interested"
7. Latest video: one featured video card (thumbnail loaded only when scrolled into view, player only on tap), "More videos"
8. Resources: the 3 newest materials with type and size, "All resources"
9. New here: short text and a link to `/visit`
10. Contacts: by role, with WhatsApp click-to-chat (`wa.me`) and a link to the map app
11. Verse of the week (optional, editable)
12. Footer: privacy notice, social links (YouTube, Facebook, WhatsApp channel), last updated

### Rules for the public site

- Server-rendered. No client JavaScript except the join form and the service worker registration.
- System fonts, no images by default, no embedded maps or video.
- Announcement bodies use limited Markdown (bold, italic, lists, links), rendered and sanitised on the server.
- "Share as text" builds a short WhatsApp-ready text on the server: title, short body, link.
- All text comes from `messages/en.json` through `next-intl`.

### 3.1 Media (videos)

**Sources:**
- YouTube: `https://www.youtube.com/@UNZANACMUSICDEPT` (UNZANAC Music Department), plus any video link an admin pastes (e.g. NAC Zambia broadcasts).
- Facebook: the congregation page, linked from the footer and the Watch page. It is **link only, not embedded**: Facebook embeds load heavy scripts and set tracking cookies, and Facebook's oEmbed needs an app token. Admins can add a Facebook video as a link card (title + "Watch on Facebook").

**Adding videos:**
- *Paste a link:* the server extracts the video ID (watch, `youtu.be`, Shorts, live, playlist URLs) and calls YouTube oEmbed (`https://www.youtube.com/oembed?url=…&format=json`) for the title and thumbnail. No API key needed.
- *Automatic import from the channel (Nice):* a daily cron reads the channel's public RSS feed (`https://www.youtube.com/feeds/videos.xml?channel_id=UC…`, no API key) and adds new uploads as **drafts** for an admin to categorise and publish. The channel ID is looked up from the handle once and saved in site settings.

**Fields:** title, date, description, category (Divine services, Choir & music, Youth, Special events, Teaching), featured (one at a time), optional event or committee, status.

**Low-data playback:**
- Lists and the home page show a thumbnail (`i.ytimg.com/vi/<id>/mqdefault.jpg`, about 15 KB, `loading="lazy"`) with a play button, or titles only.
- The `youtube-nocookie.com` iframe is inserted **only when someone taps play**. It's a small client component, the only JS on these pages.
- Every video has a "Watch in YouTube app" link (`https://youtu.be/<id>`), which opens the app on Android.

**Live banner (Nice):** an event can have a livestream URL. While the event is running, the home page shows a "🔴 Live now" banner linking to it.

### 3.2 Resources (downloads)

**Categories (initial):** Divine service & hymns · Sunday school & religious instruction · Confirmation class · Youth · Choir & music · Notices & forms.

**Fields:** title, description, category, optional committee, visibility (`PUBLIC`, `UNLISTED`; `MEMBERS` added in Phase 2), status, optional expiry.

**Files:**
- Allowed types and limits: PDF ≤ 25 MB, DOCX/PPTX/XLSX ≤ 25 MB, JPG/PNG/WebP ≤ 10 MB, MP3/M4A ≤ 50 MB.
- The real file type is checked from its first bytes, not the extension. **HTML, SVG and executables are blocked.**
- Each item shows its **type and size before download** ("PDF · 1.2 MB").
- Replacing the file keeps the same link; previous versions are kept (`MaterialFile` history).
- Unlisted items don't appear in lists, search or the sitemap; they're reachable only by their link.

**Storage and delivery:**
- **Cloudflare R2** (S3-compatible) in a private bucket. No download fees, and a 10 GB free tier.
- Upload: the admin's browser asks the server for a presigned PUT URL (valid 10 min) and uploads **straight to R2**, avoiding the web server's request size limit. The server then confirms the object exists, checks size and type, and records it.
- Download: `/resources/[slug]/download` checks visibility, increments the download count, and redirects to a presigned GET URL (valid 5 min) with `Content-Disposition: attachment`. Files are never displayed inside the site, and the bucket is never public.
- Deleting a resource removes the R2 object only after a 30-day soft-delete period, so mistakes can be undone.

**Content rules:** NAC International and district material (hymnal, catechism, *community* magazine, official broadcasts) is **linked to its official source**, not uploaded, unless permission has been given. Congregation programmes, notices and lesson sheets can be uploaded.

### 3.3 Brand and visual design

**Brand colours: Azure `#5793c9` and White `#ffffff`.**

Azure on white has a contrast ratio of **3.27:1**. WCAG 2.2 AA accepts that for large text, icons and UI borders (3:1), but **not for normal-size text** (4.5:1). So the brand Azure stays the recognisable colour, and darker shades of the same hue carry small text and buttons.

| Token | Hex | Contrast vs white | Use |
|---|---|---|---|
| `azure-50` | `#eef5fb` | (background) | Section tints, card backgrounds |
| `azure-100` | `#d9e8f5` | (background) | Borders, chips, selected rows |
| `azure-300` | `#86b3dc` | 2.21 | Decoration only; accents in dark mode |
| **`azure-500`** | **`#5793c9`** | **3.27** | **Brand:** header accent, hero band, icons, focus ring, text **≥ 24 px** (or ≥ 19 px bold) |
| `azure-700` | `#2f6fa8` | 5.30 ✅ | Primary buttons (white text), links, small Azure text |
| `azure-900` | `#1f4f7a` | 8.54 ✅ | Headings, wordmark, pressed state |
| `white` | `#ffffff` | n/a | Page background; text on `azure-700`/`azure-900` |
| `ink` | `#1a2433` | 15.62 ✅ | Body text |
| `muted` | `#5b6675` | 5.83 ✅ | Secondary text, dates, file sizes |
| `line` | `#e6edf4` | n/a | Dividers |

Status colours (success, warning, danger) are chosen in M0 and pass the same contrast check.

**Rules:**
- **Hero:** an `azure-500` band with a large white title (≥ 24 px). Supporting text and buttons sit on a white card over the band, never as small white text directly on `azure-500`.
- **Buttons:** primary = `azure-700` background + white text, pressed = `azure-900`; secondary = white background + `azure-700` border and text. Minimum height 44 px.
- **Links:** `azure-700`, always underlined in body text.
- **Focus:** a 3 px `azure-500` outline with 2 px white offset, visible on every interactive element.
- **Never** use `azure-500` (or lighter) for text smaller than 24 px on white.
- **PWA manifest:** `theme_color: #5793c9`, `background_color: #ffffff`.
- **Dark mode (Phase 3):** background `#0f1b26`, text white, accents `azure-500` (5.33:1) and `azure-300` (7.88:1).
- **Implementation:** colours are defined once as Tailwind v4 `@theme` tokens in `src/app/globals.css`; components use tokens, never raw hex values. A unit test re-checks the contrast pairs above.
- **Logo:** the New Apostolic Church emblem (cross, rising sun, water), white on Azure. Source copy: `docs/brand/nac-emblem-azure.png`.
  - **Format:** use an **SVG** in the app (about 1–2 KB, sharp at any size, recolourable). Ask NAC Zambia for the official vector file; until it arrives, use the PNG resized and compressed to WebP.
  - **Versions:** (a) white emblem on an `azure-500` square for the app icon, favicon and header; (b) `azure-500` emblem on white for print and light backgrounds; (c) a maskable PWA icon (emblem inside the central 80 % safe zone) at 192 and 512 px.
  - **Lockup:** emblem + "UNZANAC" wordmark (bold system font, `azure-900` on white, or white on `azure-500` at ≥ 24 px) + optional line "New Apostolic Church · UNZA Congregation".
  - **Rules:** don't change the emblem's proportions or colours beyond white/Azure, and don't add effects. The emblem belongs to the New Apostolic Church, so confirm the district's usage guidelines before launch.

### 3.4 Committees

The congregation is organised into nine committees. They're seeded as `Committee` records and appear on `/committees`, in the join form and in register filters.

| Committee | Slug | Role on the platform |
|---|---|---|
| Organizing | `organizing` | Events: plans and publishes congregation events |
| Testify | `testify` | Committee page; testimony programmes as events |
| Flowering | `flowering` | Committee page; later on duty rosters (Phase 4) |
| Choir / Music / Orchestra | `music` | Owns the YouTube channel `@UNZANACMUSICDEPT`; uploads practice audio and sheet music to Resources (Choir & music category) |
| First Aid | `first-aid` | Committee page; first-aid cover on rosters (Phase 4); "first aid" listed as a skill on the form |
| Catering | `catering` | Committee page; catering duty on rosters (Phase 4) |
| Communication & Media | `comms-media` | **Main Editors**: announcements, events, videos, resources, social links |
| Drama & Poetry | `drama-poetry` | Committee page; performances as events, scripts in Resources |
| Secretariat | `secretariat` | **Register officers**: register, review queue, imports, campaigns |

- The committee mapping only suggests who should hold each **admin role**. Roles are still assigned one person at a time by the Owner; belonging to a committee never grants access by itself.
- Each committee can have one or more **leaders** (`CommitteeMember.role = LEADER`). From Phase 2, leaders see their committee's members and post to it.
- Committees can be added, renamed or hidden in the admin area without code changes.

---

## 4. Join form and register updates

### 4.1 Join form steps (`/join`)

```
Step 1  About your link to the congregation
        ( ) New Apostolic: member of UNZA congregation
        ( ) New Apostolic: transferring to UNZA
        ( ) New Apostolic: member elsewhere, attending here → home congregation, district
        ( ) Friend / guest
Step 2  Personal: first name*, last name*, preferred name, gender, date of birth, marital status
Step 3  Contact: phone* (E.164, default +260), WhatsApp if different, email, residential area
Step 4  Sacraments & confirmation           (New Apostolic only)
        Holy Baptism y/n → date, congregation
        Holy Sealing y/n → date, Apostle (if known)
        Confirmed y/n → date, congregation | in confirmation class y/n
Step 5  Transfer                            (transferring only)
        previous congregation, district, transfer letter available y/n
Step 6  Family: spouse (name, NAC y/n), children (name, date of birth, baptised/sealed)
Step 7  Activities: committees (multi-select), skills, willing to serve y/n
        Organizing · Testify · Flowering · Choir/Music/Orchestra · First Aid ·
        Catering · Communication & Media · Drama & Poetry · Secretariat
Step 8  Emergency contact: name, relationship, phone
Step 9  Consent* (privacy notice version recorded) + declaration
* required
```

- Friends and guests skip steps 4–6, so their form takes about a minute.
- Progress is saved in `localStorage` so a dropped connection doesn't lose answers. Saving is wrapped in try/catch and the form works without it.
- Anti-spam: a hidden honeypot field, a rate limit per IP, and Cloudflare Turnstile loaded on `/join` only.
- On submit, a `Submission` is created (type `JOIN`, status `PENDING`), and the person sees a thank-you page with the next service.

### 4.2 Update links (`/u/[token]`)

- The link holds a 32-byte random token. Only its **SHA-256 hash** is stored.
- A link belongs to one member, expires after 14 days by default, and can be revoked.
- Optional check before details are shown: the member enters their year of birth. Five failed attempts lock the link.
- The page shows the same steps as the join form, already filled in, plus a one-tap **"Everything is correct"**.
- Submitting creates a `Submission` (type `UPDATE`) holding **only the changed fields**. "Everything is correct" records a confirmation and updates `lastVerifiedAt` without needing review.
- Phone numbers are partly hidden on screen (`+260 97•• ••• 567`) until the member chooses to edit them.

### 4.3 Campaigns

- Admins create a campaign with a name, a close date and a message template, e.g. *"Hi {firstName}, please confirm your details for the UNZANAC register: {link}"*.
- Links are generated for all active members or a filtered set.
- A tracker shows each member as **not sent / sent / opened / confirmed / changes submitted**.
- "Mark as sent" and "Copy message" per member, plus "Copy reminders for all who haven't responded".
- When a campaign closes, its unused links expire.

---

## 5. Admin back office (`/admin`)

| Module | Capabilities |
|---|---|
| **Dashboard** | Next event, pending reviews, campaign progress, announcements expiring soon, a warning when nothing has been posted for 7 days |
| **Announcements** | Draft, publish, schedule, pin, expiry, category or committee, preview, copy as WhatsApp text, archive |
| **Events** | Create and edit, recurrence (weekly, monthly), cancel or move a single date, venue and map link, audience, "show in regular schedule" |
| **Committees** | Create and edit, meeting info, contact, order, public on/off, members (from the register) |
| **Site content** | Hero text, visit page, contacts, social links (YouTube, Facebook, WhatsApp), verse of the week, privacy notice (a new version means new consents) |
| **Media** | Paste a YouTube or Facebook link → auto title and thumbnail → categorise, feature, publish; inbox of drafts from the channel's RSS; live links on events |
| **Resources** | Upload (straight to storage, with progress bar), categorise, set visibility, replace file, version history, download counts, archive, copy share text for WhatsApp |
| **Register** | Search (name, phone, fuzzy matching), filters (status, relation, committee, area, last verified), profile, edit, household links, change history |
| **Review queue** | Join and update submissions; each field shown as **old value → new value** with approve all, approve some, reject or mark as spam; possible duplicates flagged with a merge option |
| **Import** | Upload CSV, match columns to fields, preview (new, update, duplicate, error rows), commit, undo the whole batch |
| **Export** | CSV or XLSX of the filtered register. Owner only, logged, sensitive columns opt-in |
| **Campaigns** | See §4.3 |
| **Admin users** | Invite (copyable link), set role, deactivate, reset 2FA, last login |
| **Audit log** | Every create, update, delete, publish, approve, export, login and failed login |
| **Weekly sheet** | Printable page of this week's announcements and events |

The admin area uses shadcn/ui components. It sits outside the public byte budget but must still be usable at 360 px.

---

## 6. Architecture

For a plain-language explanation of each technology and how they work together, see [TECH.md](TECH.md).

### Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router, server components, server actions), TypeScript strict |
| Styling | Tailwind CSS v4; shadcn/ui in admin only |
| Database | PostgreSQL 16+, Prisma 7 (`prisma.config.ts`, `@prisma/adapter-pg`), `pg_trgm` extension for fuzzy search |
| Auth (admins) | Better Auth: email + password, **TOTP 2FA required**, invite-only, no public sign-up |
| Validation | Zod: one schema per form, shared by client and server |
| Dates | Stored as UTC `timestamptz`, shown in `Africa/Lusaka`; `rrule` for recurrence |
| Phones | `libphonenumber-js`, default region ZM, stored in E.164 |
| i18n | `next-intl` (English only in Phase 1) |
| Import/export | `papaparse` (CSV in), `exceljs` (XLSX out) |
| File storage | Cloudflare R2 through the AWS S3 SDK (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`); `file-type` to check what a file really is |
| Video | YouTube oEmbed + channel RSS; `youtube-nocookie.com` player loaded on tap |
| PWA | Web manifest + Serwist service worker (falls back to a hand-written worker if it doesn't work with Turbopack) |
| Spam protection | Honeypot + rate limiting + Cloudflare Turnstile on public forms |
| Design tokens | Tailwind v4 `@theme` in `globals.css` (brand palette in §3.3) |
| Monitoring | Sentry (personal data removed from reports), uptime monitor |

### Request flow

```
Page / server action
   └─ validate input (Zod)
   └─ service function          src/server/services/*
        └─ policy.can(actor, action, resource)   → throws if denied
        └─ Prisma query with a role-based field selection
        └─ audit.log(...)
        └─ revalidateTag(...)    → public pages refresh
```

- **Public pages** are cached and refreshed every 5 minutes, and immediately when content changes (`revalidateTag`). Most visits never reach the database.
- **Field-level protection:** register queries choose which fields to return by role, so an Editor's request can never return sacrament data, even by mistake.
- **No separate REST API in Phase 1.** Route handlers exist only for `ics`, auth and cron.

### Folder structure

```
src/
  app/
    (public)/               home, announcements, events, committees, visit, join, u/[token], privacy
    admin/                  dashboard, announcements, events, committees, content,
                            register, review, import, export, campaigns, users, audit
    api/auth/[...all]/      Better Auth
    api/cron/daily/         cleanup jobs + YouTube RSS import (protected by a secret)
  components/public/  components/admin/  components/ui/
  server/
    db.ts  auth.ts  policy.ts  audit.ts  rate-limit.ts
    services/               announcements, events, committees, content, members,
                            submissions, tokens, campaigns, imports, exports, admins,
                            videos, materials
    storage/                r2.ts (presign upload/download, delete), file-checks.ts
    youtube/                parse-url.ts, oembed.ts, rss.ts
  lib/
    forms/member-fields.ts  ONE field definition list (type, step, condition, roles)
    schemas/  dates.ts  phone.ts  share-text.ts  markdown.ts
  messages/en.json
prisma/
  schema.prisma  migrations/  seed.ts
tests/
  unit/  e2e/
docs/
  PLAN.md  decisions/  ADMIN-GUIDE.md
```

`lib/forms/member-fields.ts` drives the join form, the update form, the review screen, import column matching and export columns. Adding a register field means one entry there plus a migration.

---

## 7. Data model (draft)

```prisma
// ── Admin auth (Better Auth core tables: user, session, account, verification, twoFactor) ──
// user gets: role AdminRole, active Boolean, memberId String? (link to Member, used in Phase 2)

enum AdminRole        { OWNER REGISTER_OFFICER EDITOR }

// ── Content ──
model Announcement {
  id         String   @id @default(cuid())
  slug       String   @unique
  title      String
  body       String                       // limited Markdown
  category   AnnouncementCategory @default(GENERAL)
  committeeId    String?
  pinned     Boolean  @default(false)
  status     ContentStatus @default(DRAFT) // DRAFT | PUBLISHED | ARCHIVED
  publishAt  DateTime?                    // future = scheduled
  expiresAt  DateTime?
  authorId   String
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Event {
  id             String   @id @default(cuid())
  slug           String   @unique
  title          String
  details        String?
  venue          String
  mapUrl         String?
  audience       String?                  // "Everyone", "Youth", ...
  startsAt       DateTime
  endsAt         DateTime
  rrule          String?                  // RFC 5545, null = one-off
  showInSchedule Boolean  @default(false)
  committeeId        String?
  status         ContentStatus @default(DRAFT)
  exceptions     EventException[]
}

model EventException {
  id              String   @id @default(cuid())
  eventId         String
  occurrenceStart DateTime                // the date being changed
  cancelled       Boolean  @default(false)
  newStart        DateTime?
  newEnd          DateTime?
  note            String?
  @@unique([eventId, occurrenceStart])
}

model Committee {
  id          String  @id @default(cuid())
  slug        String  @unique
  name        String
  description String?
  meetingInfo String?
  contactName String?
  contactPhone String?
  sortOrder   Int     @default(0)
  isPublic    Boolean @default(true)
  members     CommitteeMember[]
}

model SiteContent {                        // hero, visit, contacts, verse, ...
  key         String   @id
  value       Json
  updatedById String
  updatedAt   DateTime @updatedAt
}

model PrivacyNotice {
  version     Int      @id
  body        String
  publishedAt DateTime
}

// ── Media & resources ──
enum VideoSource      { YOUTUBE FACEBOOK }
enum VideoKind        { VIDEO LIVE PLAYLIST }
enum MaterialVisibility { PUBLIC UNLISTED }   // MEMBERS added in Phase 2

model Video {
  id           String   @id @default(cuid())
  slug         String   @unique
  source       VideoSource @default(YOUTUBE)
  externalId   String                     // YouTube video/playlist id, or Facebook URL
  kind         VideoKind @default(VIDEO)
  title        String
  description  String?
  category     VideoCategory
  thumbnailUrl String?
  recordedAt   DateTime?
  featured     Boolean  @default(false)
  status       ContentStatus @default(DRAFT)  // RSS imports arrive as DRAFT
  eventId      String?
  committeeId      String?
  createdAt    DateTime @default(now())
  @@unique([source, externalId])
}

model Material {
  id            String   @id @default(cuid())
  slug          String   @unique
  title         String
  description   String?
  category      MaterialCategory
  committeeId       String?
  visibility    MaterialVisibility @default(PUBLIC)
  status        ContentStatus @default(DRAFT)
  currentFileId String?  @unique
  downloadCount Int      @default(0)
  expiresAt     DateTime?
  deletedAt     DateTime?                  // soft delete; R2 object purged after 30 days
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  files         MaterialFile[]
}

model MaterialFile {
  id           String   @id @default(cuid())
  materialId   String
  storageKey   String   @unique            // materials/<materialId>/<cuid>.<ext>
  fileName     String                      // original name, sanitised
  mimeType     String
  sizeBytes    Int
  sha256       String
  uploadedById String
  uploadedAt   DateTime @default(now())
}

// Event gets: livestreamUrl String?

// ── Register ──
enum MemberRelation   { NAC_UNZA NAC_TRANSFERRING NAC_VISITING FRIEND }
enum MemberStatus     { ACTIVE INACTIVE MOVED TRANSFERRED_OUT DECEASED ERASED }
enum HouseholdRole    { HEAD SPOUSE CHILD OTHER }

model Member {
  id                 String   @id @default(cuid())
  memberNo           String?  @unique
  firstName          String
  lastName           String
  preferredName      String?
  gender             Gender?
  dateOfBirth        DateTime? @db.Date
  maritalStatus      MaritalStatus?
  phone              String?            // E.164, indexed, not unique (families share)
  whatsapp           String?
  email              String?
  residentialArea    String?
  occupationCategory OccupationCategory?
  occupation         String?

  relation           MemberRelation
  homeCongregation   String?
  homeDistrict       String?

  baptised           Boolean?
  baptismDate        DateTime? @db.Date
  baptismCongregation String?
  sealed             Boolean?
  sealingDate        DateTime? @db.Date
  sealingApostle     String?
  confirmed          Boolean?
  confirmationDate   DateTime? @db.Date
  confirmationCongregation String?
  inConfirmationClass Boolean?

  transferFrom       String?
  transferDistrict   String?
  transferLetter     Boolean?
  transferConfirmedAt DateTime?

  emergencyName      String?
  emergencyRelation  String?
  emergencyPhone     String?

  skills             String?
  willingToServe     Boolean?

  householdId        String?
  householdRole      HouseholdRole?

  status             MemberStatus @default(ACTIVE)
  joinedAt           DateTime?
  lastVerifiedAt     DateTime?
  careMinisterId     String?            // admin user
  remarks            String?            // office use
  consentVersion     Int?
  consentAt          DateTime?

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  committees         CommitteeMember[]
  changes            MemberChange[]
  tokens             UpdateToken[]
  @@index([phone])
  @@index([lastName, firstName])
}

model Household   { id String @id @default(cuid())  name String  members Member[] }

model CommitteeMember {
  memberId String
  committeeId String
  role     CommitteeRole @default(MEMBER)       // MEMBER | LEADER
  @@id([memberId, committeeId])
}

enum SubmissionType   { JOIN UPDATE CONFIRM }
enum SubmissionStatus { PENDING APPROVED PARTIAL REJECTED SPAM }

model Submission {
  id            String   @id @default(cuid())
  type          SubmissionType
  status        SubmissionStatus @default(PENDING)
  memberId      String?               // set for UPDATE/CONFIRM, and on JOIN approval
  data          Json                  // JOIN: full payload, UPDATE: changed fields only
  campaignId    String?
  tokenId       String?
  duplicateOf   String[]              // candidate member ids
  consentVersion Int
  ipHash        String?
  submittedAt   DateTime @default(now())
  reviewedById  String?
  reviewedAt    DateTime?
  reviewNote    String?
}

model UpdateToken {
  id            String   @id @default(cuid())
  tokenHash     String   @unique      // sha256(token)
  memberId      String
  campaignId    String?
  expiresAt     DateTime
  sentAt        DateTime?
  firstOpenedAt DateTime?
  usedAt        DateTime?
  failedChecks  Int      @default(0)
  revokedAt     DateTime?
}

model Campaign {
  id          String   @id @default(cuid())
  name        String
  message     String                  // template with {firstName} {link}
  opensAt     DateTime
  closesAt    DateTime
  createdById String
  tokens      UpdateToken[]
}

model MemberChange {
  id           String   @id @default(cuid())
  memberId     String
  field        String
  oldValue     Json?
  newValue     Json?
  source       ChangeSource            // ADMIN | SUBMISSION | IMPORT
  submissionId String?
  importId     String?
  changedById  String?
  at           DateTime @default(now())
  @@index([memberId, at])
}

model ImportBatch {
  id           String   @id @default(cuid())
  fileName     String
  mapping      Json
  rowCount     Int
  createdCount Int
  updatedCount Int
  skippedCount Int
  createdById  String
  createdAt    DateTime @default(now())
  undoneAt     DateTime?
}

// ── Audit ──
model AuditLog {
  id         String   @id @default(cuid())
  actorId    String?                    // null = public/system
  action     String                     // "announcement.publish", "register.export", ...
  entityType String
  entityId   String?
  meta       Json?
  ipHash     String?
  at         DateTime @default(now())
  @@index([entityType, entityId])
  @@index([at])
}
```

---

## 8. Security and privacy

### Security (target: OWASP ASVS Level 2)

- Admin accounts are invite-only, with **required TOTP 2FA**, sessions that end after 8 hours idle, and a rate limit on login attempts.
- Server actions check the request origin (built into Next.js). Every action re-checks permissions on the server.
- Security headers: strict Content-Security-Policy, HSTS, `X-Content-Type-Options`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- Update tokens are stored only as hashes, expire, can be revoked, and lock after failed checks.
- Public forms are protected by honeypot, IP rate limits and Turnstile.
- No personal data in logs. Sentry strips request bodies and cookies.
- Uploads: file types checked against an allow-list using the file's content; HTML, SVG and executables are rejected; files are always served as downloads from R2, never from the site's own domain; the bucket is private and access goes through short-lived signed URLs.
- Content-Security-Policy allows only `youtube-nocookie.com` in frames, `i.ytimg.com` for images, and the R2 host as a redirect target.
- Dependabot and GitHub secret scanning are on. `npm audit` runs in CI.
- Secrets live only in the host's environment variables, and `.env.example` documents them.

### Privacy (Zambia Data Protection Act 2021)

- Church membership shows religious affiliation, so the register is treated as **sensitive personal data**.
- Collect only the fields in §4.1, each with a written purpose recorded in the privacy notice.
- Consent is explicit and versioned; each submission stores the notice version it accepted.
- Retention: rejected and spam submissions are deleted after 90 days, expired tokens after 30 days, and the audit log is kept for 2 years.
- **Removal request:** an admin action that blanks the record's personal data, sets status `ERASED`, and keeps only the change history entry saying it was erased.
- Exports are Owner-only, logged, and leave out sensitive columns unless chosen.
- To do: confirm whether the congregation or NAC Zambia must register with the Office of the Data Protection Commissioner.

---

## 9. Quality standards

| Area | Target | How it's enforced |
|---|---|---|
| Performance | Home ≤150 KB transferred, LCP < 2.5 s on Slow 4G, CLS < 0.1 | Lighthouse CI budgets fail the build |
| Accessibility | WCAG 2.2 AA | `@axe-core/playwright` on every public page and form, plus a manual TalkBack pass before launch |
| Layout | Usable at 360 px, tap targets ≥ 44 px | Playwright runs at 360×740 |
| Types and lint | `strict`, no `any`, ESLint | CI |
| Unit tests | policy matrix, recurrence, share text, diffing, dedupe, token checks | Vitest |
| End-to-end | The critical journeys below | Playwright against a real Postgres |
| Offline | Home, announcements and events readable offline after one visit | Playwright offline test |

**Critical journeys (end-to-end):**
1. Admin logs in with 2FA → publishes an announcement → it appears on the home page.
2. Admin creates a weekly service → the next service card and the schedule are correct → .ics downloads.
3. Visitor completes the join form (NAC path and friend path) → register officer approves → member is in the register.
4. Register officer imports a CSV → duplicates are flagged → commit → undo.
5. Campaign → member opens the link → year-of-birth check → edits phone → review shows the diff → approve → change history updated.
6. Editor tries to open `/admin/register` → access denied.
7. Editor pastes a YouTube link → title and thumbnail filled in → publish → the Watch page loads **no YouTube script** until play is tapped.
8. Editor uploads a PDF → it appears in Resources with type and size → a visitor downloads it → the count increases; an unlisted item is missing from lists but opens by its link; an `.html` upload is rejected.

**Risk to watch:** the Next.js App Router ships roughly 90–100 KB of framework JavaScript on its own. The 150 KB budget leaves little room. M0 measures it on an empty page; if it doesn't fit, we decide then (raise the budget, or serve the home page without hydration).

---

## 10. Environments, delivery and operations

| Environment | Purpose | Database |
|---|---|---|
| Local | Development | PostgreSQL 17 on the developer's PC (Docker optional), seeded |
| Staging | Testing on real phones, demos | Neon (staging branch or project) |
| Production | Live | Neon (production) with point-in-time recovery |

- **Hosting (recommended to start):** Vercel for the app, with server functions in the **same region as the database**, plus **Neon** Postgres in the nearest region Neon offers. The app connects through Neon's **pooled** URL (`DATABASE_URL`); migrations use the **direct** URL (`DIRECT_URL`). Cached public pages are served from African edge locations, so the database distance mainly affects admin pages and form submissions.
- **CI/CD (GitHub Actions):** install → lint → typecheck → unit tests → build → e2e + axe → Lighthouse. Main is protected and needs green CI; merging deploys to staging; a tagged release promotes to production.
- **Migrations:** `prisma migrate deploy` runs on deploy. Data-changing migrations need a written rollback note.
- **Cron (daily):** delete expired tokens and old spam, close campaigns, apply retention rules, import new YouTube uploads as drafts, purge soft-deleted R2 objects older than 30 days.
- **File storage:** Cloudflare R2, with separate buckets for staging and production. Its contents aren't covered by database backups, so a weekly sync copies the bucket to a second location.
- **Backups:** provider point-in-time recovery, plus a weekly encrypted `pg_dump` to separate storage. **Restore drill before launch, then every quarter.**
- **Monitoring:** Sentry errors, an uptime check on `/` and `/admin/login`, and an alert to two people.
- **Accounts** (domain, hosting, database, Cloudflare/R2, Sentry, Turnstile; the YouTube and Facebook pages already exist) are registered to a shared congregation email address, with two people holding access.

---

## 11. Milestones

Estimates assume one developer working about 20–25 hours a week. Each milestone ends with a staging deploy tested on a budget Android phone.

| # | Milestone | Weeks | Deliverables | Exit criteria |
|---|---|---|---|---|
| **M0** | Foundation | 1 | Repo, Next 16 + Tailwind + Prisma 7 + next-intl, local Postgres (Docker optional), seed, CI pipeline with every check, Sentry, staging deploy, ADR-001 (stack) | Push to main → green CI → staging; empty home page within budget (or budget decision recorded) |
| **M1** | Admin access | 1 | Better Auth email + password + required TOTP, invite links, roles, `policy.ts` + matrix tests, admin layout, admin users screen, audit log | Owner invites an Editor; Editor is blocked from register routes (tested) |
| **M2** | Content + public site | 2 | Site content, committees, announcements (schedule, pin, expiry, share text), events (rrule, exceptions, .ics), all public pages, caching + revalidation, privacy notice | Journeys 1 & 2 pass; Lighthouse and axe green |
| **M2b** | Media + resources | 1 | Video model, YouTube link parsing + oEmbed, tap-to-play player, Watch pages, channel RSS import to drafts, Facebook link cards, R2 setup, direct uploads, file checks, Resources pages, signed downloads, versions, counts, live banner | Journeys 7 & 8 pass; home page still within budget with the featured video |
| **M3** | Register core | 1 | Member + Household models, register list/search/filter/profile/edit, change history, CSV import with mapping, dedupe and undo, export | Journey 4 passes; the real register imports cleanly on staging |
| **M4** | Join form + review | 1.5 | `member-fields.ts`, multi-step `/join` with conditional steps, saved progress, spam protection, review queue with diff, duplicate merge | Journey 3 passes for both paths; form works at 360 px with axe green |
| **M5** | Update links + campaigns | 1 | Tokens, `/u/[token]`, year-of-birth check, "Everything is correct", campaign tracker, copyable messages | Journey 5 passes; journey 6 passes |
| **M6** | PWA + polish | 1 | Manifest, service worker, offline page, weekly printable sheet, dashboard, performance tuning, manual accessibility pass | Offline test passes; budgets met |
| **M7** | Hardening + launch | 1 | ASVS checklist, security headers, retention cron, backup restore drill, `ADMIN-GUIDE.md`, production deploy, real register import, pilot campaign to 20–30 members | Checklist complete; restore drill timed and recorded; pilot running |

**Total: about 10.5 weeks to a production pilot.**

### Definition of done (every feature)

- Works at 360 px; tap targets ≥ 44 px; keyboard and screen-reader usable
- Zod validation on the server; permission checked through `policy.ts`; audit logged where it changes data
- Unit tests for logic; Playwright test if it's part of a critical journey
- axe clean; public page byte budget met
- Text in `messages/en.json`
- Admin guide updated if admins will use it

---

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| The official NAC register format differs from our fields | Rework | Single field definition list (`member-fields.ts`); get the format before M3 |
| The 150 KB budget can't be met with App Router | Slower first load | Measured in M0, decision recorded early |
| An update link is forwarded to someone else | Exposure of one member's data | Year-of-birth check, partly hidden phones, 14-day expiry, revocation, logged opens |
| Spam on the join form | A cluttered queue | Honeypot, rate limit, Turnstile, "mark as spam" |
| The register leaks through an export | Serious privacy breach | Owner-only, logged, sensitive columns opt-in, 2FA |
| Only one developer | Project stalls | ADRs, admin guide, README, a second person with deploy access |
| Copyrighted NAC material is uploaded | Takedown, damaged trust with church leadership | Content rule in §3.2, a reminder on the upload screen, link to official sources instead |
| Members-only material shared as "Unlisted" spreads beyond members | Material seen by outsiders | Use Unlisted only for low-sensitivity items until member login (Phase 2) |
| Storage costs grow with audio files | Unexpected bill | Size limits, R2 has no download fees, usage alert at 8 GB |
| Admins don't adopt it | Stale site | Posting from a phone in under a minute, WhatsApp share, a dashboard warning when nothing is posted |

---

## 13. Assumptions (open to change)

1. The congregation is UNZA congregation, New Apostolic Church Zambia. The register fields follow §4.1 until the official format is available.
2. Announcements and events are all public in Phase 1.
3. Admins send update links through WhatsApp by hand; there's no SMS in Phase 1.
4. One shared congregation email will own the service accounts.
5. English only at launch.
6. Videos come mainly from YouTube `@UNZANACMUSICDEPT`. Facebook is linked, not embedded. The Facebook share link (`facebook.com/share/1WjcVHhGBa`) must be replaced with the page's permanent URL in site settings.
7. Admins and Editors (including committee leaders) can upload resources; only Owners delete permanently.
8. Members-only resources wait for Phase 2; until then, "Unlisted" links are used for low-sensitivity items.
9. Church guidance allows publishing service and choir recordings; consent is obtained for videos that clearly show children.

## 14. Next phases

See [ROADMAP.md](ROADMAP.md) for the phase-by-phase plan (Phases 0–4), with goals, scope, milestones and exit criteria for each.
