# THE SYSTEM

A premium, RPG-style habit tracker. Real-life habits become **quests**; completing
them earns **XP**, raises **stats** (STR / INT / VIT / AGI / DISC / FOC / CHA),
levels up your **Player**, and advances your **Rank** (E → D → C → B → A → S → SS).

Original branding, original UI, original icon set. No copyrighted characters,
logos, or artwork — just a cinematic, dark "System interface" aesthetic built
from scratch (deep-space panels, thin luminous borders, controlled glow).

## Stack

- **Backend:** Node.js + Express, zero external DB — persistence via Node's
  built-in `node:sqlite`. Auth is a lightweight HMAC-signed session token +
  `scrypt` password hashing (no third-party auth/JWT library needed).
- **Frontend:** Vanilla JS (ES modules), no build step, no framework. Custom
  CSS design system with four themes (System Dark, Void, Aether, Light System).
- All XP is recorded as an auditable transaction log (`xp_transactions`), not
  just a single mutable counter — progression is fully reconstructable.

## Run it

```bash
cd system
npm install
npm start
# open http://localhost:4000
```

Copy `.env.example` to `.env` to override the port, secret, or data directory.
Data is stored in `system/data/system.db` (SQLite), created automatically.

## What's implemented

- **Personal mode** — "Begin as Player" creates an instant, private, local
  profile with no signup.
- **Public mode** — email/password accounts, fully isolated per-user data,
  `is_admin` flag gates `/api/admin/*` (tune XP values, level curve, rank
  thresholds, achievement definitions).
- **Onboarding** — focus areas → goal → auto-generated starter quest set +
  a 90-day first mission ("The First Ascent").
- **Quests** — daily / weekdays / weekly-target / monthly-target frequencies,
  5 difficulty tiers (Easy → Boss) with configurable XP, notes, stat linkage.
  Complete/undo with full side-effect pipeline: XP → stat XP → level →
  rank → streak → perfect-day → achievement checks, all in one transaction.
- **Progression** — level curve + rank thresholds are server-configured
  (admin-tunable), streaks (current/longest) computed from real completion
  history (recomputed from scratch on undo, never just decremented), perfect
  days tracked separately.
- **Views** — Home dashboard, Quest Log (today / all / missions + create/edit/
  delete), Progression (milestone map + calendar heatmap), Player Status +
  Analytics (XP-over-time, weekly rate, best days, weakest habits) +
  Achievements gallery, Profile (theme, avatar, sound, reduced motion,
  visible-stats, logout).
- **Feel** — level-up / rank-up / achievement-unlock cinematic overlays,
  toast notifications, synthesized WebAudio SFX (off by default), mobile
  bottom-nav layout tested at 390×844.

## API surface

See `server/routes/*.routes.js`. Summary: `/api/auth/*` (guest, register,
login, onboarding), `/api/quests/*` (CRUD, complete, undo), `/api/player/*`
(status, progression, achievements, calendar, analytics, missions),
`/api/settings`, `/api/admin/*`.
