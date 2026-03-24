# CLAUDE.md — Decibel Platform

> This is the root instruction file for Claude Code working on the Decibel platform.

---

## Project Overview

Decibel is a cross-category discovery platform where being first to find emerging things (artists, restaurants, fashion brands, tech products) is the core game. Users "found" items before they blow up, track their growth like a portfolio, and compete with friends on taste.

This is a **fresh monorepo** built from scratch. The old codebases exist as reference only.

---

## Directory Layout

```
~/decibel/                    # THIS PROJECT — monorepo, Claude Code runs here
~/decibel-mobile/             # OLD mobile app — REFERENCE ONLY, do not modify
~/decibel-web/                # OLD web app + backend routes — REFERENCE ONLY, do not modify
```

---

## Reference Code Rules

The old codebases contain working patterns you should study and adapt:

### ~/decibel-mobile/ (old React Native app)
- **Copy the design system exactly.** Fonts, colors, spacing, component styling, dark theme — all of it. The users like how it looks. Do not change the visual identity.
- **Study the Supabase query patterns** for how feed, leaderboard, profiles, founding, collecting, and following work. Recreate the same logic with updated table/column names.
- **Study the Expo Router setup** for tab navigation and screen structure.
- **Study the component architecture** — how feed cards, leaderboard podium, profile stats, and artist detail screens are built.

### ~/decibel-web/ (old Next.js app)
- **Study the scraper scripts** for SoundCloud, Spotify, RA, DICE, EDMTrain. These will be adapted for the Express API.
- **Study the leaderboard calculation logic.**
- **Study the share card / content generator.**
- **Study any API routes** in the Next.js pages/api directory for business logic patterns.

### CRITICAL: Table and column names have changed!

When copying logic from the old code, update ALL references:

| Old | New |
|-----|-----|
| `fans` table | `users` table |
| `performers` table | `items` table |
| `fan_follows` table | `follows` table |
| `fan_id` column | `user_id` column |
| `performer_id` column | `item_id` column |

New columns that didn't exist before:
- `items.category` — text, NOT NULL, default 'music'
- `founder_badges.metric_snapshot` — jsonb, default '{}'

---

## Rules

1. **Read the full PRD** at ~/decibel/PRD.md before starting any work.
2. **Work ONE phase at a time.** Do not start the next phase until Swarn confirms the current phase works on a real device.
3. **After completing each phase**, list every file you created/modified and what Swarn should test.
4. **Copy the design system exactly** from ~/decibel-mobile/. Same colors, fonts, spacing, component patterns, dark theme. Do NOT redesign anything.
5. **Do NOT refactor, optimize, or "improve" anything** that isn't part of the current phase.
6. **Do NOT add features** that aren't specified in the current phase of the PRD.
7. **If something is unclear, ask.** Don't assume or invent requirements.
8. **Verify the app compiles** before declaring a phase complete. Run `npx expo start` for mobile, `npm run dev` for API.
9. **Commit after each completed phase** with a clear message: `feat: phase N — description`
10. **Push to GitHub** after each phase commit.

---

## Current Phase: 0 (Setup)

### Phase 0 tasks:
1. Create the monorepo at ~/decibel/ with the directory structure specified in PRD Section 3
2. Initialize npm workspaces
3. Set up TypeScript configs (root + per package)
4. Set up the shared package with types matching the current database schema
5. Initialize the Expo app in apps/mobile (fresh `npx create-expo-app` with Expo Router)
6. Initialize the Express app in apps/api
7. Create a new GitHub repo called `decibel-platform` and push the initial structure
8. Copy environment variables from old projects into .env
9. Do NOT build any features yet — just the skeleton that compiles

### After Phase 0, move to Phase 1:
Phase 1 is rebuilding the mobile app to match the current Decibel app functionality — home feed, discover/add, profile, leaderboard — using the new schema and the Express API. Reference ~/decibel-mobile/ for ALL UI patterns and business logic. The app should look identical to the current app but run on the new architecture.

---

## Supabase

- **Project ID:** savcbkbgoadjxkjnteqv
- **URL:** https://savcbkbgoadjxkjnteqv.supabase.co
- **Auth:** Email magic links (existing) — mobile app authenticates directly with Supabase
- **API access:** Express backend uses service role key for all database operations
- **Mobile app:** Sends Supabase JWT to Express API in Authorization header

---

## Database Schema (current state after cleanup)

### users (10 rows)
- id (uuid PK), email (text unique), name (text), city (text), avatar_url (text), app_installed (boolean), created_at (timestamptz), phone (text), spotify_refresh_token (text), spotify_connected_at (timestamptz)

### items (192 rows, all category='music')
- id (uuid PK), name (text), slug (text unique), bio (text), photo_url (text), soundcloud_url (text), mixcloud_url (text), ra_url (text), instagram_handle (text), city (text default 'Chicago'), genres (text[]), follower_count (integer default 0), claimed (boolean default false), claimed_by (uuid), created_at (timestamptz), updated_at (timestamptz), is_chicago_resident (boolean), spotify_url (text), spotify_id (text unique), monthly_listeners (integer), spotify_embed_url (text), soundcloud_embed_url (text), apple_music_embed_url (text), top_track_cached_at (timestamptz), verified (boolean default false), **category (text NOT NULL default 'music')**

### founder_badges (182 rows)
- id (uuid PK), **user_id** (uuid FK→users), **item_id** (uuid FK→items, UNIQUE per item), awarded_at (timestamptz), **metric_snapshot (jsonb default '{}')**

### collections (267 rows)
- id (uuid PK), **user_id** (uuid FK→users), **item_id** (uuid FK→items), venue_id (uuid, all NULL), event_date (date), capture_method (text default 'qr'), verified (boolean default true), created_at (timestamptz), collection_type (text default 'stamp')

### follows (9 rows)
- id (uuid PK), follower_id (uuid FK→users), following_id (uuid FK→users), created_at (timestamptz), UNIQUE(follower_id, following_id)

---

## Tech Stack

- **Mobile:** React Native, Expo (SDK 52+), TypeScript, Expo Router (file-based routing)
- **API:** Express.js, TypeScript, Supabase JS client
- **Database:** Supabase PostgreSQL + Auth
- **Shared:** TypeScript types, constants
- **Monorepo:** npm workspaces
- **Deployment:** Mobile → EAS Build / TestFlight, API → Render (later, run locally for now)
- **Git:** GitHub repo `decibel-platform`

## EAS / Expo Deployment

- **EAS Project ID:** 44471fff-8ba1-46a0-9901-bdaf6ebef534
- **Bundle ID:** com.decibel.app
- **Reusing existing EAS project** — current TestFlight users (Brendan, Holden, etc.) will get updates seamlessly
- **Build:** `cd apps/mobile && eas build --platform ios --profile preview`
- **OTA Update:** `cd apps/mobile && eas update --channel preview --message "description"`
- **IMPORTANT:** When setting up apps/mobile in Phase 0, copy `eas.json` and the EAS-related fields from `~/decibel-mobile/app.json` (projectId, bundleIdentifier, etc.) so the build identity matches the existing TestFlight app

## CLI Tools Available

All authenticated and ready to use:
- **eas** — Expo Application Services (builds, updates, TestFlight)
- **supabase** — Database migrations, schema dumps, project management
- **vercel** — Deployments (for future web app)
- **gh** — GitHub CLI (repo creation, PRs, issues)
- **git** — SSH auth configured for GitHub

---

## Design System (DO NOT CHANGE)

Copy these exactly from ~/decibel-mobile/:

- **Background:** #0B0B0F
- **Card background:** #1A1A22
- **Primary accent:** #9B6DFF (purple)
- **Pink:** #FF4D6A
- **Teal:** #00D4AA
- **Gold/Yellow:** #FFD700
- **Blue:** #4D9AFF
- **Text primary:** #FFFFFF
- **Text secondary:** #CCCCCC
- **Text muted:** #888888
- **Font:** System default (San Francisco)
- **All component styling** — card shapes, shadows, border radius, padding, spacing — copy from old app
- **Leaderboard podium style** — copy exactly
- **Feed card style** — copy exactly
- **Profile layout** — copy and extend with new tabs
- **"Founded" badge styling** — gold, copy exactly
- **"Collect" button styling** — pink, copy exactly

Study every screen in ~/decibel-mobile/app/ and ~/decibel-mobile/components/ to understand the design patterns. Recreate them faithfully.
