# Decibel Platform PRD — Monorepo Migration & Feature Roadmap

> **For Claude Code execution on DigitalOcean VM (159.203.108.156)**
> Generated: March 24, 2026
> Author: Swarn

---

## Table of Contents

1. [Context & Background](#1-context--background)
2. [Architecture Overview](#2-architecture-overview)
3. [Monorepo Setup](#3-monorepo-setup)
4. [Phase 1: Fix What's Broken](#4-phase-1-fix-whats-broken)
5. [Phase 2: Express Backend Service](#5-phase-2-express-backend-service)
6. [Phase 3: Mobile App Migration](#6-phase-3-mobile-app-migration)
7. [Phase 4: Growth Tracking & Portfolio](#7-phase-4-growth-tracking--portfolio)
8. [Phase 5: Add Flow (Share-a-Link)](#8-phase-5-add-flow-share-a-link)
9. [Phase 6: Activity & Notifications](#9-phase-6-activity--notifications)
10. [Database Schema (Current State)](#10-database-schema-current-state)
11. [Design System](#11-design-system)
12. [Reference Code](#12-reference-code)
13. [Deployment](#13-deployment)

---

## 1. Context & Background

### What is this project?

Decibel is pivoting from a Chicago underground music discovery app to a **cross-category discovery platform** where being first to find emerging things (artists, restaurants, fashion brands, tech products) is the core game. The name "Decibel" is a working title — it will change.

### What exists today?

- **React Native / Expo mobile app** at `~/decibel-mobile/` — OLD APP, REFERENCE ONLY. Do not modify. Study for UI patterns, design system, and Supabase query logic.
- **Next.js web app + backend** at `~/decibel-web/` — OLD APP, REFERENCE ONLY. Do not modify. Study for scraper scripts, leaderboard logic, and API routes.
- **New monorepo** at `~/decibel/` — THIS IS WHERE ALL NEW CODE LIVES. Claude Code runs here. Read CLAUDE.md at root.
- **Supabase database** (project `savcbkbgoadjxkjnteqv`) — just cleaned up and renamed:
  - `fans` → `users` (10 rows)
  - `performers` → `items` (192 rows, all category='music')
  - `fan_follows` → `follows` (9 rows)
  - `founder_badges` stayed as `founder_badges` but columns renamed: `fan_id` → `user_id`, `performer_id` → `item_id` (182 rows)
  - `collections` stayed but columns renamed: `fan_id` → `user_id`, `performer_id` → `item_id` (267 rows)
  - New columns added: `items.category` (text, default 'music'), `founder_badges.metric_snapshot` (jsonb, default '{}')
  - Many old tables cleared (events, venues, fan_tiers, fan_badges, etc.) but not dropped

### What are we building?

A new monorepo with three packages:
1. **`apps/mobile`** — React Native / Expo app (evolved from decibel-mobile)
2. **`apps/api`** — Express.js backend service (new, deployed to Render)
3. **`apps/web`** — Web app (future, not built yet, placeholder only)

### Core product features (current + new):

**Existing (needs to work again):**
- User auth (Supabase Auth)
- Home feed showing friends' founds and collections
- Search and add artists (founder mechanic)
- Leaderboard (Most Founders, Highest Influence, Trending)
- User profiles with founder count and collections
- Follow/unfollow users
- Collect items from feed

**New (to be built in phases):**
- Growth tracking / portfolio view (metric snapshots over time)
- Share-a-link add flow (share URLs from Spotify, Google Maps, Instagram, etc.)
- Activity / notification center
- Cross-category support (restaurants as second category)
- Taste board (photo-verified, future phase — NOT in this PRD)

### Key principles:

1. **Reference the old code, don't copy it blindly.** The old mobile app at `~/decibel-mobile` and web app at `~/decibel` have working patterns for Supabase queries, UI components, and business logic. Use them as reference but rewrite for the new schema (table/column renames).
2. **Mobile-first.** The Express API exists to serve the mobile app. Don't build web features yet.
3. **The founder mechanic is the core of the product.** Every design decision should reinforce the "I found it first" game.
4. **Keep the existing dark aesthetic.** The app's visual identity (dark backgrounds, pink/purple/teal accents) is established and liked by users. Don't change the design language.

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────┐
│                   Monorepo                       │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │apps/mobile│  │ apps/api │  │ apps/web │      │
│  │ Expo/RN  │  │ Express  │  │ (future) │      │
│  └────┬─────┘  └────┬─────┘  └──────────┘      │
│       │              │                           │
│  ┌────┴──────────────┴────┐                     │
│  │    packages/shared     │                     │
│  │  types, constants,     │                     │
│  │  validation schemas    │                     │
│  └────────────────────────┘                     │
└─────────────────────────────────────────────────┘
         │                │
         │                │
    ┌────┴────┐     ┌────┴─────┐
    │Supabase │     │ Claude   │
    │ DB+Auth │     │ Code VM  │
    └─────────┘     │ (async)  │
                    └──────────┘
```

### Tech stack:

- **Mobile:** React Native, Expo, TypeScript, Expo Router
- **API:** Express.js, TypeScript, Supabase JS client (service role)
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **Shared:** TypeScript types, Zod schemas, constants
- **Monorepo tooling:** Turborepo (or npm workspaces if simpler)
- **Deployment:** API → Render, Mobile → TestFlight via EAS

### Auth flow:

1. Mobile app authenticates directly with Supabase Auth (email magic link or OAuth)
2. Mobile app receives a Supabase JWT
3. Mobile app sends JWT in `Authorization: Bearer <token>` header to Express API
4. Express API validates JWT using Supabase's `getUser()` with the token
5. Express API uses Supabase service role key for database operations

---

## 3. Monorepo Setup

### Directory structure:

```
~/decibel/
├── CLAUDE.md                 # Instructions for Claude Code (READ THIS FIRST)
├── PRD.md                    # This file
├── package.json              # Root workspace config
├── tsconfig.base.json        # Shared TS config
├── .env                      # Shared env vars
├── .gitignore
├── README.md
│
├── apps/
│   ├── mobile/               # React Native / Expo app
│   │   ├── app/              # Expo Router file-based routing
│   │   ├── components/       # UI components
│   │   ├── hooks/            # Custom hooks
│   │   ├── services/         # API client, auth
│   │   ├── stores/           # State management (Zustand or context)
│   │   ├── constants/        # App constants, colors, config
│   │   ├── assets/           # Images, fonts
│   │   ├── app.json          # Expo config
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── api/                  # Express backend
│   │   ├── src/
│   │   │   ├── index.ts          # Entry point
│   │   │   ├── middleware/       # Auth, error handling, logging
│   │   │   │   ├── auth.ts       # JWT validation
│   │   │   │   └── error.ts      # Error handler
│   │   │   ├── routes/           # Route definitions
│   │   │   │   ├── items.ts      # CRUD for items
│   │   │   │   ├── users.ts      # User profiles, follows
│   │   │   │   ├── feed.ts       # Activity feed
│   │   │   │   ├── founders.ts   # Founding mechanic
│   │   │   │   ├── collections.ts # Collection mechanic
│   │   │   │   ├── leaderboard.ts # Leaderboard queries
│   │   │   │   └── health.ts     # Health check
│   │   │   ├── services/         # Business logic
│   │   │   │   ├── supabase.ts   # Supabase client init
│   │   │   │   ├── scraper.ts    # URL parsing + data extraction
│   │   │   │   └── metrics.ts    # Growth tracking logic
│   │   │   └── types/            # API-specific types
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── web/                  # Future web app (placeholder)
│       └── README.md
│
├── packages/
│   └── shared/               # Shared code between apps
│       ├── src/
│       │   ├── types.ts      # Database types, API request/response types
│       │   ├── constants.ts  # Categories, thresholds, colors
│       │   ├── schemas.ts    # Zod validation schemas
│       │   └── utils.ts      # Shared utilities
│       ├── package.json
│       └── tsconfig.json
│
├── CLAUDE.md                 # Instructions for Claude Code
└── PRD.md                    # This file
```

### Setup commands:

```bash
mkdir -p ~/decibel/{apps/{mobile,api,web},packages/shared}
cd ~/decibel
npm init -y
# Then create GitHub repo and push:
gh repo create decibel-platform --public --source=. --remote=origin
git init && git add . && git commit -m "chore: initial monorepo scaffold" && git push -u origin main
```

### Root package.json workspaces:

```json
{
  "name": "decibel-platform",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ]
}
```

### Environment variables needed:

```env
# Supabase
SUPABASE_URL=https://savcbkbgoadjxkjnteqv.supabase.co
SUPABASE_ANON_KEY=<anon key>
SUPABASE_SERVICE_ROLE_KEY=<service role key>

# API
API_PORT=3001
API_URL=http://localhost:3001  # or Render URL in production

# Future
GOOGLE_PLACES_API_KEY=<for restaurant category>
```

---

## 4. Phase 0: Monorepo Scaffold

**Priority: Do this first. No features, just skeleton.**

1. Create the directory structure at `~/decibel/` as specified in Section 3
2. Initialize npm workspaces in root package.json
3. Set up tsconfig.base.json and per-package tsconfig.json files
4. Initialize `packages/shared` with TypeScript types matching the current database schema (users, items, founder_badges, collections, follows)
5. Initialize `apps/api` with a basic Express server that starts and responds to `GET /health`
6. Initialize `apps/mobile` with a fresh `npx create-expo-app` using Expo Router (file-based routing, TypeScript template)
7. Create a new GitHub repo called `decibel-platform`, init git, push scaffold
8. Copy `.env` values from old projects (Supabase URL, keys)
9. Verify: `npm run dev` in apps/api starts Express, `npx expo start` in apps/mobile launches Expo

### Definition of done for Phase 0:
- [ ] Monorepo structure exists at ~/decibel/
- [ ] npm workspaces resolve between packages
- [ ] Shared types compile
- [ ] Express API starts on port 3001 and responds to health check
- [ ] Expo app launches in simulator or on device (blank screen is fine)
- [ ] GitHub repo exists and scaffold is pushed
- [ ] CLAUDE.md and PRD.md are in the repo root

---

## 5. Phase 1: Rebuild Mobile App (Feature Parity)

**Goal: The app looks and works identically to the current Decibel app, but built fresh in the monorepo with correct table/column names.**

This is a full rebuild, NOT a patch of the old app. Study every screen in `~/decibel-mobile/` and recreate it in `~/decibel/apps/mobile/`. The design system, component styling, spacing, fonts, colors, and layouts must match exactly. The data layer uses the new table/column names.

### Screens to rebuild (study ~/decibel-mobile/ for each):

**Tab Bar:** 3 tabs — Home, Discover (was "Add"), Profile (was "Passport")

**Home Tab:**
- Category filter pills at top: All | Music (more categories later)
- Small leaderboard preview: horizontal scroll of top 3 this week, tapping opens full leaderboard modal
- Activity feed: founds + collections from followed users
- Each feed card: user avatar + name, action ("founded" in gold / "collected" in pink), item name + photo, category pill, metric at founding if found, Collect button
- Pull to refresh
- Copy the feed card design exactly from ~/decibel-mobile/

**Discover Tab:**
- Search bar at top
- "Hot Right Now" section: items with most collections recently
- "New Finds" section: recently founded items
- Search results showing items with founder info
- Add new item flow: search for artist → confirm → found
- Copy the search and add flow from ~/decibel-mobile/
- Update all queries to use `items` table instead of `performers`

**Profile Tab:**
- Top section: avatar, name, taste score (placeholder for now), total founds, total collections, followers/following counts, edit button
- Three inner tabs: Founds | Taste Board | Stats
  - **Founds:** grid/list of items you founded — item image, name, category pill, founded date. Copy the card style from old app.
  - **Taste Board:** placeholder — show "Coming Soon" text or empty state
  - **Stats:** basic stats — total founds, total collections, member since. Simple version is fine.
- Copy the profile header layout from ~/decibel-mobile/

**Leaderboard (modal/sheet from Home):**
- Podium top 3 (copy exactly from old app)
- Ranked list below
- Filter pills: Most Founders | Highest Influence | Trending
- Time filter: All Time | This Month | This Week
- Copy the leaderboard design exactly from ~/decibel-mobile/

**Item Detail Screen:**
- Item photo, name, category pill
- Bio/description if available
- Who founded it (avatar, name, date)
- List of collectors
- Listen/view links (Spotify, SoundCloud, etc.)
- Collect button or "Founded by you" badge
- Copy layout from old app's artist detail screen

**Other User Profile Screen:**
- Same as own profile but with Follow/Unfollow button instead of Edit
- Shows their founds and collections

**Notification Bell:**
- Icon in top nav, tapping shows notifications (can be empty/placeholder for now)
- Unread count badge

### Data layer:

For Phase 1, the mobile app talks directly to Supabase (same as old app). We'll migrate to Express API in Phase 2. This means:
- Use `@supabase/supabase-js` in the mobile app
- All queries use new table/column names (users, items, follows, user_id, item_id)
- Auth flows remain the same (Supabase Auth magic links)

### Definition of done for Phase 1:
- [ ] All screens listed above are built and functional
- [ ] Design matches old app exactly (dark theme, colors, spacing, component styles)
- [ ] Home feed loads and shows founds/collections from followed users
- [ ] Leaderboard loads with correct data and podium
- [ ] Can search for and found new artists
- [ ] Can collect items from feed
- [ ] Can follow/unfollow users
- [ ] Profile shows correct counts and lists
- [ ] Item detail screen works
- [ ] App runs on real device via Expo Go or dev build
- [ ] All committed and pushed to GitHub

---

## 5. Phase 2: Express Backend Service

**After Phase 1 is complete and the mobile app works again.**

### Why Express?

The mobile app currently talks directly to Supabase. This works for simple CRUD but we need a backend for:
- URL parsing and scraping (the share-a-link add flow)
- Growth metric snapshot jobs (scheduled)
- Complex queries (leaderboard calculations, feed aggregation)
- Future: AI workflows, notification generation

### Setup:

```bash
cd ~/decibel-platform/apps/api
npm init -y
npm install express cors helmet dotenv @supabase/supabase-js
npm install -D typescript @types/express @types/node @types/cors ts-node nodemon
```

### Express app structure:

**`src/index.ts`** — Entry point:
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { healthRouter } from './routes/health';
import { itemsRouter } from './routes/items';
import { usersRouter } from './routes/users';
import { feedRouter } from './routes/feed';
import { foundersRouter } from './routes/founders';
import { collectionsRouter } from './routes/collections';
import { leaderboardRouter } from './routes/leaderboard';
import { authMiddleware } from './middleware/auth';
import { errorHandler } from './middleware/error';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

// Public routes
app.use('/health', healthRouter);

// Protected routes (require valid Supabase JWT)
app.use('/api/items', authMiddleware, itemsRouter);
app.use('/api/users', authMiddleware, usersRouter);
app.use('/api/feed', authMiddleware, feedRouter);
app.use('/api/founders', authMiddleware, foundersRouter);
app.use('/api/collections', authMiddleware, collectionsRouter);
app.use('/api/leaderboard', authMiddleware, leaderboardRouter);

app.use(errorHandler);

const PORT = process.env.API_PORT || 3001;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
```

**`src/middleware/auth.ts`** — JWT validation:
```typescript
import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Invalid token' });

  (req as any).user = user;
  next();
}
```

### API Routes to implement:

**Items:**
- `GET /api/items/:id` — Get item details
- `GET /api/items/search?q=<query>&category=<category>` — Search items
- `POST /api/items` — Create new item (with founder badge)
- `GET /api/items/:id/metrics` — Get item growth metrics

**Users:**
- `GET /api/users/me` — Get current user profile
- `GET /api/users/:id` — Get user profile by ID
- `PUT /api/users/me` — Update current user profile
- `GET /api/users/:id/founds` — Get user's founder badges with items
- `GET /api/users/:id/collections` — Get user's collections with items
- `POST /api/users/:id/follow` — Follow user
- `DELETE /api/users/:id/follow` — Unfollow user
- `GET /api/users/:id/followers` — Get user's followers
- `GET /api/users/:id/following` — Get user's following

**Feed:**
- `GET /api/feed` — Get activity feed (founds + collections from followed users)
- `GET /api/feed?category=<category>` — Filter feed by category

**Founders:**
- `POST /api/founders` — Found an item (create founder badge + item if new)
- `GET /api/founders/check/:itemId` — Check if item is already founded

**Collections:**
- `POST /api/collections` — Collect an item
- `DELETE /api/collections/:id` — Remove collection

**Leaderboard:**
- `GET /api/leaderboard?type=<founders|influence|trending>&period=<all|month|week>&category=<all|music|restaurants>` — Get leaderboard

### Migration path:

Phase 2 is about standing up the Express API and having it work alongside the existing Supabase direct queries. Don't rip out all Supabase queries from the mobile app at once. Instead:

1. Build the Express API with all routes
2. Create an API client in the mobile app (`services/api.ts`)
3. Gradually migrate mobile app screens to use the Express API instead of direct Supabase queries
4. Start with the most complex queries (feed, leaderboard) and leave simple reads on Supabase direct

### Definition of done for Phase 2:
- [ ] Express API runs locally and responds to health check
- [ ] All routes defined and returning data
- [ ] Auth middleware validates Supabase JWTs
- [ ] Mobile app has API client configured
- [ ] At least feed and leaderboard routes are consumed by mobile app
- [ ] API deployed to Render (or running in tmux on VM for now)

---

## 6. Phase 3: Mobile App Migration

**After Phase 2 API is running.**

Migrate the mobile app to use the Express API for all data operations. This phase also includes UI improvements based on the new product vision.

### Tab structure (3 tabs):

```
┌──────────┬──────────┬──────────┐
│   Home   │ Discover │ Profile  │
└──────────┴──────────┴──────────┘
```

**Tab 1: Home**
- Category filter pills at top: All | Music | (more categories later)
- Leaderboard preview (horizontal scroll, top 3 this week) — tapping opens full leaderboard modal
- Activity feed: mixed founds + collections from followed users
- Each feed card shows: user avatar + name, action (founded/collected), item name + photo, category pill, metric at founding (if found), Collect button
- Tapping item → Item Detail screen
- Tapping user → User Profile screen

**Tab 2: Discover**
- Search bar at top (placeholder: "Search artists, restaurants, brands...")
- Category filter pills below search
- "Hot Right Now" section: items gaining the most collections recently
- "New Finds" section: recently founded items
- Search results show items with founder info and collect/found status
- If item not in system → Add New flow (Phase 5)

**Tab 3: Profile**
- Top: avatar, name, taste score, total founds, total collections, followers/following, edit profile button, share profile button
- Three inner tabs:
  - **Founds**: grid of items you founded, each showing item image, name, category pill, metric at founding → current metric, growth %. Sortable by: recent, most growth, category
  - **Taste Board**: placeholder for future phase — show "Coming Soon" or hide
  - **Stats**: total founds by category, hit rate, best find, influence (how many people collected your finds), taste score breakdown

### Notifications:
- Bell icon in top-right of Home tab (or global nav)
- Opens notification sheet/page
- Notification types: portfolio updates, social (someone collected your find), milestones, competitive alerts
- Unread count badge on bell icon

### Item Detail screen:
- Item photo, name, category pill
- Current metric + growth chart (line chart from founding to now) — placeholder until Phase 4
- Who founded it (avatar, name, timestamp, metric at founding)
- List of collectors (avatars)
- Link out to source (Spotify, Google Maps, website)
- Collect button (if not collected) or "Founded by you" badge

### Definition of done for Phase 3:
- [ ] 3-tab navigation working
- [ ] Home feed with category filter pills
- [ ] Leaderboard preview on Home
- [ ] Discover tab with search and sections
- [ ] Profile with 3 inner tabs (Founds, Taste Board placeholder, Stats)
- [ ] Item Detail screen
- [ ] Notification bell icon (even if empty for now)
- [ ] All data flowing through Express API

---

## 7. Phase 4: Growth Tracking & Portfolio

**The most important new feature. This is what makes people come back.**

### Metric snapshots:

When a user founds an item, capture the current metrics in `founder_badges.metric_snapshot`:

```json
{
  "snapshot_date": "2026-03-24",
  "monthly_listeners": 312,
  "spotify_followers": 45,
  "instagram_followers": 230,
  "collections_count": 0
}
```

### Periodic metric updates:

Create a new table `item_metrics` to store time-series metric data:

```sql
CREATE TABLE item_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES items(id),
  metric_date date NOT NULL DEFAULT CURRENT_DATE,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(item_id, metric_date)
);
```

A scheduled job (cron on VM via Claude Code, or Render cron) runs weekly:
1. For each item in the database, scrape current metrics from available sources
2. Insert a row into `item_metrics` with the latest data
3. Calculate growth deltas since founding

### Portfolio view (Profile → Founds tab):

Each founded item card shows:
- Item image + name
- Category pill
- "Founded at X listeners" (from metric_snapshot)
- "Now at Y listeners" (from latest item_metrics)
- Growth indicator: green arrow + percentage if growing, red if declining, gray if flat
- Highlight card at top: "Best Find: [name] — up X% since you found"

### Weekly digest:

Generate a summary for each user:
- How many of their founds grew
- Their best performing find this week
- How many people collected their finds
- Leaderboard position change

For now, this can be a screen in the app (Activity tab or notification). Push notifications come later.

### Taste Score calculation:

```
taste_score = Σ (growth_weight × recency_weight) for each found item

growth_weight = log(current_metric / founding_metric) — capped at reasonable max
recency_weight = decays over time (recent finds weighted more)
```

Only count top 10-20 best-performing finds toward visible taste score (per Perplexity's suggestion — don't penalize for duds).

### Definition of done for Phase 4:
- [ ] Metric snapshot captured on every new found
- [ ] `item_metrics` table created
- [ ] Scheduled job that updates metrics weekly
- [ ] Portfolio view shows growth indicators on each found
- [ ] "Best Find" highlight card on profile
- [ ] Taste score calculated and displayed on profile
- [ ] Activity screen shows portfolio digest

---

## 8. Phase 5: Add Flow (Share-a-Link)

**The universal add flow that works across all categories.**

### How it works:

User shares a URL to the app (via iOS share sheet or paste in Discover tab) → API detects URL pattern → routes to correct scraper → pulls data → returns preview → user confirms → item created + founder badge awarded.

### URL pattern detection:

```typescript
function detectCategory(url: string): { category: string; platform: string } {
  if (url.includes('spotify.com') || url.includes('music.apple.com')) 
    return { category: 'music', platform: 'spotify' };
  if (url.includes('maps.google.com') || url.includes('goo.gl/maps') || url.includes('maps.app.goo.gl'))
    return { category: 'restaurants', platform: 'google_places' };
  if (url.includes('instagram.com'))
    return { category: 'fashion', platform: 'instagram' };
  if (url.includes('producthunt.com'))
    return { category: 'tech', platform: 'producthunt' };
  // Fallback: scrape meta tags
  return { category: 'unknown', platform: 'meta_scrape' };
}
```

### API endpoint:

```
POST /api/items/from-url
Body: { url: string }
Response: {
  preview: {
    name: string,
    photo_url: string,
    category: string,
    platform: string,
    metrics: { monthly_listeners?: number, google_reviews?: number, ... },
    is_above_threshold: boolean,
    existing_item_id?: string,  // if already in system
    existing_founder?: { user_id: string, username: string }  // if already founded
  }
}
```

Then the mobile app shows the preview and the user confirms:
- If below threshold + unclaimed → "You're the first! Found this?" → creates item + founder badge
- If below threshold + already founded → "Founded by [user]. Collect?" → creates collection
- If above threshold → "This is already well-known. Add to your Taste Board?" (future)

### Scraper implementations (start with music only):

**Music (Spotify/Apple Music URL):**
- Extract artist ID from URL
- Scrape artist page for: name, photo, monthly listeners, follower count, genres
- Note: Spotify API is dead. Use web scraping or existing scraper scripts from `~/decibel`

**Restaurants (Google Maps URL) — Phase 2 category, build later:**
- Extract place ID from Google Maps URL
- Hit Google Places API: name, photo, review count, rating, address, category
- Threshold: under 500 reviews

**Fallback (any URL):**
- Fetch page, extract og:title, og:image, og:description from meta tags
- User manually selects category
- No automatic metrics (user can add manually or skip)

### Definition of done for Phase 5:
- [ ] Share sheet extension receives URLs in mobile app
- [ ] API endpoint parses URLs and returns preview data
- [ ] Music scraper works for Spotify and Apple Music URLs
- [ ] Preview screen shows item details and founder/collect options
- [ ] Item creation + founder badge from URL flow works end to end
- [ ] Handles edge cases: already founded, above threshold, invalid URL

---

## 9. Phase 6: Activity & Notifications

### Activity center (accessed via bell icon):

Two sections:
1. **Portfolio** — growth updates for your founds
   - "Your find [artist] gained +1,200 listeners this week"
   - "5 people collected your find [restaurant] this week"
   - "[artist] you founded just crossed 10,000 listeners!"

2. **Social** — interactions from other users
   - "[user] collected your find [item]"
   - "[user] started following you"
   - "[user] just passed you on the weekly leaderboard"

### Implementation:

Create a `notifications` table (reuse the existing `notifications_log` table):

```sql
-- notifications_log already exists, just use it
-- Columns: id, user_id, type, title, body, data (jsonb), sent_at, read_at
```

Generate notifications from:
1. The weekly metric snapshot job (portfolio updates)
2. Collection events (social)
3. Follow events (social)
4. Leaderboard position changes (competitive)

### Definition of done for Phase 6:
- [ ] Notification bell icon shows unread count
- [ ] Activity screen shows portfolio + social notifications
- [ ] Notifications generated on collection, follow, and metric updates
- [ ] Read/unread state tracked
- [ ] Tapping a notification navigates to the relevant screen

---

## 10. Database Schema (Current State)

### Active tables:

**users** (was fans):
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| email | text | unique |
| name | text | display name |
| city | text | nullable |
| avatar_url | text | nullable |
| app_installed | boolean | default false |
| created_at | timestamptz | |

**items** (was performers):
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name | text | |
| slug | text | unique |
| bio | text | nullable |
| photo_url | text | nullable |
| soundcloud_url | text | nullable |
| spotify_url | text | nullable |
| spotify_id | text | unique, nullable |
| instagram_handle | text | nullable |
| city | text | default 'Chicago' |
| genres | text[] | default '{}' |
| follower_count | integer | default 0 |
| monthly_listeners | integer | nullable |
| category | text | NOT NULL, default 'music' |
| claimed | boolean | default false |
| claimed_by | uuid | nullable |
| verified | boolean | default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |
| + various embed URLs | text | nullable, music-specific |

**founder_badges:**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| item_id | uuid | FK → items, UNIQUE |
| awarded_at | timestamptz | |
| metric_snapshot | jsonb | default '{}' |

**collections:**
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK → users |
| item_id | uuid | FK → items |
| venue_id | uuid | nullable (all NULL now) |
| event_date | date | nullable |
| capture_method | text | default 'qr' |
| verified | boolean | default true |
| created_at | timestamptz | |
| collection_type | text | default 'stamp' |

**follows** (was fan_follows):
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| follower_id | uuid | FK → users |
| following_id | uuid | FK → users |
| created_at | timestamptz | |
| UNIQUE(follower_id, following_id) |

### New table to create:

**item_metrics** (for growth tracking):
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, gen_random_uuid() |
| item_id | uuid | FK → items |
| metric_date | date | default CURRENT_DATE |
| data | jsonb | metrics object |
| created_at | timestamptz | default now() |
| UNIQUE(item_id, metric_date) |

---

## 11. Design System

### Keep the existing aesthetic from Decibel:

- **Background:** #0B0B0F (near black)
- **Card background:** #1A1A22
- **Primary accent:** #9B6DFF (purple)
- **Secondary accents:** #FF4D6A (pink), #00D4AA (teal), #FFD700 (yellow/gold), #4D9AFF (blue)
- **Text primary:** #FFFFFF
- **Text secondary:** #CCCCCC
- **Text muted:** #888888
- **Font:** System default (San Francisco on iOS)
- **Category pill colors:** Music = purple, Restaurants = pink, Fashion = teal, Tech = blue

### Component patterns to maintain:

- Dark cards with subtle shadow for feed items
- Podium-style top 3 on leaderboard
- Pink "Collect" buttons
- Gold "Founded" badges
- Color-coded category pills on every item

### Reference the old app:

Look at `~/decibel-mobile` for existing component implementations. The UI patterns are good — the data layer just needs updating.

---

## 12. Reference Code

### Old mobile app: `~/decibel-mobile`

This contains:
- Working Expo Router setup with tab navigation
- Supabase auth integration
- Feed component with found/collected cards
- Leaderboard with podium
- Artist search and founding flow
- Profile screen with stats
- Follow/unfollow logic

**Use this as reference for all UI patterns and business logic. Update table/column names to match new schema.**

### Old web app: `~/decibel`

This contains:
- Next.js app with Supabase integration
- Scraper scripts for SoundCloud, RA, DICE, EDMTrain, 19hz
- Artist profile pages
- Leaderboard calculations
- Content generator for share cards

**Use the scraper scripts as reference for the Express API scraping logic.**

---

## 13. Deployment

### Mobile app:
- Continue using EAS Build for TestFlight distribution
- Update `app.json` / `eas.json` as needed for the monorepo path
- Build from `apps/mobile` directory

### Express API:
- **For development:** Run locally or in tmux on VM
- **For production:** Deploy to Render
  - Connect GitHub repo
  - Set root directory to `apps/api`
  - Set build command: `npm install && npm run build`
  - Set start command: `npm run start`
  - Add environment variables in Render dashboard

### Render setup:
- Web Service (not static site)
- Node environment
- Auto-deploy on push to main branch
- Free tier is fine for now (spins down after inactivity — acceptable for 10 users)

---

## Execution Order

1. **Phase 0** — Monorepo scaffold. Skeleton that compiles. GitHub repo created.
2. **Phase 1** — Rebuild mobile app with feature parity. Looks and works like current Decibel. Direct Supabase queries.
3. **Phase 2** — Stand up Express API with all routes. Deploy to Render or run on VM.
4. **Phase 3** — Migrate mobile app to use Express API. New tab structure (Home, Discover, Profile with 3 inner tabs).
5. **Phase 4** — Growth tracking, portfolio view, taste score. The key retention feature.
6. **Phase 5** — Share-a-link add flow. The key acquisition feature.
7. **Phase 6** — Activity center and notifications.

Each phase should be a working, shippable state. Don't start Phase N+1 until Phase N is testable on a real device via TestFlight.
