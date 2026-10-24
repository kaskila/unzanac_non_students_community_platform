# UNZANAC Platform: Phase-by-Phase Roadmap

**Status:** working draft, 13 Oct 2026
**Brand:** Azure `#5793c9` and White `#ffffff` (full rules in [PLAN.md §3.3](PLAN.md#33-brand-and-visual-design))
**Detailed Phase 1 specification:** [PLAN.md](PLAN.md)

Estimates assume one developer working about 20–25 hours a week.

---

## At a glance

| Phase | Name | Goal | Length | Who logs in |
|---|---|---|---|---|
| **0** | Groundwork | Content, accounts and decisions ready to build on | 1 week (alongside Phase 1 M0) | Nobody |
| **1** | Public platform + register | Public site, admin area, register, media, resources | ~10.5 weeks | Admins only |
| **2** | Member access | Members log in, manage their own record, RSVP, get notifications | ~5.5 weeks | Admins + members |
| **3** | Belonging | Committee life, welcome, prayer, wider reach (SMS, local languages) | ~5 weeks | Admins + members |
| **4** | Congregation life | Rosters, attendance, reports, pastoral care | ~6 weeks | Admins + members |

**About 7 months in total** from the start of Phase 1 to the end of Phase 4, not counting the gaps between phases.

### Gate between phases
A phase starts only when the previous one is **live and being used**. Each gate checks:
1. The exit criteria of the finished phase are met.
2. A short member survey (5 questions) has been done and read.
3. Usage numbers from the admin dashboard have been reviewed.
4. No open high-severity security or privacy issues.
5. The admin guide and README are up to date.

### Work that happens in every phase
- Brand palette, accessibility (WCAG 2.2 AA) and the home page byte budget (critical path ≤ 50 KB, first visit ≤ 200 KB, repeat visit ≤ 20 KB (ADR 0002)) are checked automatically in CI.
- Permission rules are tested for every new role and action.
- Every new type of personal data gets a stated purpose and a privacy notice update before it's collected.
- A backup restore drill once a quarter.
- Short records of key technical decisions (ADRs) in `docs/decisions/`.

---

## Phase 0: Groundwork

**Goal:** everything Phase 1 needs from people (not code) is gathered, so development never waits on content.

| Item | Output | Owner |
|---|---|---|
| Content pack | Service times, venue and directions, "New here" text, contacts by role, leaders and meeting times for each committee, verse of the week. ✅ Committee list received (9 committees, PLAN.md §3.4) | Congregation contact |
| Register | Existing register file (Excel/CSV) or paper form; official NAC Zambia format if one exists | Register officer |
| Brand | ✅ Azure `#5793c9` + White; ✅ logo (NAC emblem, PNG in `docs/brand/`). Still needed: the official **SVG** of the emblem and the district's emblem usage guidelines | Rector / delegate |
| Media | Confirm permission to publish recordings; permanent Facebook page URL; YouTube channel ID for `@UNZANACMUSICDEPT` | Music department |
| Accounts | Shared congregation email; domain; GitHub, hosting, database, Cloudflare (R2 + Turnstile), Sentry, all owned by that email with two people holding access | Developer + Rector |
| Privacy | Draft privacy notice; check registration with the Data Protection Commissioner | Rector / delegate |
| People | First Owner named; register officers from the **Secretariat**; 2–3 Editors from **Communication & Media** | Rector |

**Exit criteria:** content pack received; accounts created; first admins named. Missing items have placeholders and are listed as open, without blocking M0–M1.

---

## Phase 1: Public platform + register (~10.5 weeks)

**Goal:** a fast public site anyone can use, and an admin area that runs announcements, events, media, resources and the member register, with **no member login yet**.

| # | Milestone | Weeks | Main deliverables |
|---|---|---|---|
| M0 | Foundation | 1 | Repo, Next.js 16 + Tailwind (brand tokens) + Prisma 7, CI with every quality check, staging, byte budget measured and decided (ADR 0002) |
| M1 | Admin access | 1 | Admin login + required 2FA, invites, roles, permission module, audit log |
| M2 | Content + public site | 2 | Site content, committees, announcements, events (recurring, .ics), all public pages |
| M2b | Media + resources | 1 | YouTube (tap-to-play, channel import), Facebook links, R2 uploads and downloads |
| M3 | Register core | 1 | Register, households, change history, CSV import with duplicate checks, export |
| M4 | Join form + review | 1.5 | Step-by-step NAC join form, review queue showing changes, duplicate merge |
| M5 | Update links + campaigns | 1 | Private update links, "Everything is correct", campaign tracker |
| M6 | PWA + polish | 1 | Installable, readable offline, printable weekly sheet, dashboard |
| M7 | Hardening + launch | 1 | Security checklist, backup restore drill, admin guide, production, pilot |

**Exit criteria:**
- Live in production; the real register imported and cleaned.
- First update campaign sent to all members, with **≥ 50 % responses** within 4 weeks.
- Announcements or events posted at least weekly for 4 weeks in a row.
- Home page within its byte budget (critical path ≤ 50 KB, first visit ≤ 200 KB, repeat visit ≤ 20 KB (ADR 0002)) and WCAG 2.2 AA checks green.
- Pilot survey done.

Full specification: [PLAN.md](PLAN.md).

---

## Phase 2: Member access (~5.5 weeks)

**Goal:** members log in with their phone and use the platform as *their* congregation space: their own record, members-only content, RSVPs and notifications.

### Scope

**Login**
- Phone number + one-time code (Better Auth phone number plugin). Email magic link as a free fallback.
- **Accounts link to existing register records** by phone number. If there's no match, or several, an admin decides; nobody gets register data by guessing a number.
- SMS provider chosen by comparing price per message in Zambia (Africa's Talking, Twilio, WhatsApp OTP via Meta Cloud API). A spending cap, a rate limit per phone and IP, and a CAPTCHA after repeated failures protect against SMS fraud.
- The update links from Phase 1 keep working for members who never log in.

**Member portal (`/me`)**
- View my details; edit them. Contact details are saved straight away; sacrament, family and status changes go to the review queue.
- My household, my committees (join or leave requests).
- Privacy: choose what other members see (name, committees, optional photo), see what is held, download my data, request removal.

**Members-only content**
- New `MEMBERS` visibility for announcements, events and resources.
- Signed download links check the session for members-only files.

**Directory**
- Browse members by committee; shows only what each member chose to share.
- Phone numbers visible only to admins and that member's committee leaders.

**Events**
- RSVP (Going / Not going) on each event date, headcount for admins and committee leaders, list of who is coming.

**Notifications**
- Opt-in Web Push: new announcements (by category), event reminders 24 hours before.
- Notification preferences page.

**New role: committee leader**
- Sees their committee's members (name, phone, committees only), posts announcements tagged to their committee, sees RSVPs for their committee's events.

### Milestones

| # | Milestone | Weeks | Done when |
|---|---|---|---|
| P2-M1 | Phone login + linking | 1.5 | Pilot members log in; account linking passes tests for matched, unmatched and ambiguous phones |
| P2-M2 | Member portal + privacy | 1 | A member edits contact details (saved straight away) and a sacrament date (goes to review); data download works |
| P2-M3 | Members-only content + directory | 1 | Members-only items hidden when logged out (tested); directory respects every privacy setting |
| P2-M4 | RSVP + push | 1.5 | RSVP headcount correct across recurring dates; push reminder arrives 24 hours before |
| P2-M5 | Hardening | 0.5 | ASVS review of the new auth flows; SMS spending cap tested; permission matrix updated |

**Exit criteria:**
- **≥ 60 %** of active members have logged in at least once.
- RSVPs used for at least two events.
- Zero permission-test failures; no privacy incidents.

---

## Phase 3: Belonging (~5 weeks)

**Goal:** members feel known and connected, especially newcomers and non-students, and nobody is left out by data cost or language.

### Scope

**Committee pages**
- Each committee gets a page: about, meeting times, leaders, upcoming events, resources, and **posts by leaders**.
- Members can react ("🙏", "👍"). No open comments, so no moderation load.

**Welcome**
- New member welcome flow: a welcome message, the next service, a suggested committee.
- **Welcome buddy:** an admin assigns an existing member to each newcomer; both are notified.
- A "New this month" list for admins and leaders, so newcomers are greeted by name.

**Prayer requests**
- Members submit a request. **Private to the Rector and ministers by default**; the member can choose to share it with the congregation (anonymously or by name).
- Shared requests are checked by an admin before they appear.

**Milestones**
- Opt-in birthday and anniversary greetings (members choose whether to show them).

**Reach**
- **SMS for key notices**: admins mark an announcement "important", and it goes by SMS to members without push enabled. Only if there's a budget, with a cost shown before sending.
- **Weekly digest:** an automatic weekly summary as push, plus a WhatsApp-ready text for admins to post.

**Language and comfort**
- **Bemba and Nyanja** for public pages, the join form and the update form. The text structure is ready from Phase 1; this phase adds translations, reviewed by native speakers in the congregation.
- **Dark mode** using the dark-mode brand tokens (PLAN.md §3.3).

### Milestones

| # | Milestone | Weeks |
|---|---|---|
| P3-M1 | Committee pages + leader posts + reactions | 1.5 |
| P3-M2 | Welcome flow, buddies, new-this-month, birthdays | 1 |
| P3-M3 | Prayer requests with privacy and review | 1 |
| P3-M4 | SMS for key notices + weekly digest | 0.5 |
| P3-M5 | Bemba/Nyanja + dark mode + accessibility retest | 1 |

**Exit criteria:**
- Every active committee has a page with at least one post a month.
- **≥ 70 %** of newcomers in the phase have a buddy assigned within 7 days.
- Translations reviewed and signed off by native speakers.

---

## Phase 4: Congregation life (~6 weeks)

**Goal:** the platform supports how the congregation is run: who serves when, who attended, and what the Rector and district need to know.

### Scope

**Duty rosters**
- Rosters for ushers, choir, Sunday school teachers, cleaning and so on.
- Members see their duties, ask for swaps (approved by the roster leader), and get reminders.

**Attendance**
- Ushers record a headcount per service on a phone, which works offline and syncs later.
- Optional per-member attendance for classes such as confirmation class and Sunday school.

**Media library extended**
- Playlists and series, audio library (choir practice tracks, recorded services if permitted), search across videos and resources.

**Pastoral care**
- Care ministers log visits and follow-ups for the members assigned to them.
- **Most sensitive data in the system:** visible only to the Rector and the assigned minister, every view audited.

**Reports**
- For the Rector and district: membership numbers and trends, newcomers, transfers, sacrament milestones (e.g. confirmation-age children), attendance trends, register completeness.
- Export in the **official NAC district format** (once it's known).

**Contributions (only if church leadership approves)**
- Shows how to contribute (e.g. mobile money details). Collecting or recording money is a separate decision with separate security and audit requirements.

### Milestones

| # | Milestone | Weeks |
|---|---|---|
| P4-M1 | Duty rosters + swaps + reminders | 1.5 |
| P4-M2 | Attendance (offline-capable) | 1 |
| P4-M3 | Media library: playlists, audio, search | 1 |
| P4-M4 | Pastoral care log with strict access | 1 |
| P4-M5 | Reports + district export | 1 |
| P4-M6 | Hardening, accessibility retest, handover review | 0.5 |

**Exit criteria:**
- Rosters used for all regular services for a month.
- Rector receives the monthly report from the platform instead of compiling it by hand.
- An external security review (a volunteer professional or paid review) of the whole system.

---

## Beyond Phase 4 (ideas, not committed)

- Integration with official NAC Zambia systems, if they exist and allow it
- Native app wrapper (only if the PWA can't do something members need)
- Multi-congregation support for other congregations in the district

---

## Summary timeline

```
Weeks:   1   2   3   4   5   6   7   8   9  10  11 | gate | 12 ... 17 | gate | 18 ... 22 | gate | 23 ... 28
Phase 0  ███
Phase 1  ███████████████████████████████████████████
Phase 2                                                     ██████████
Phase 3                                                                        █████████
Phase 4                                                                                           ██████████
```

Gates usually add 2–4 weeks between phases for the pilot, survey and fixes.
