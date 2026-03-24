# Decibel Platform — Build Progress

## Phase 0: Monorepo Scaffold ✅
**Completed: March 24, 2026**

- Root npm workspaces (`apps/mobile`, `apps/api`, `packages/shared`)
- `packages/shared`: TypeScript types matching Supabase schema (users, items, founder_badges, collections, follows) + design constants (colors, categories)
- `apps/api`: Express server with health check, auth middleware (JWT validation), Supabase service role client
- `apps/mobile`: Fresh Expo SDK 55 app with Expo Router, EAS config matching existing TestFlight identity (project ID `44471fff`, bundle ID `com.decibel.app`)
- `apps/web`: Placeholder
- GitHub repo: https://github.com/swarn2099/decibel-platform
- All packages compile clean, API health endpoint verified

---

## Phase 1: Rebuild Mobile App (Feature Parity) ✅
**Completed: March 24, 2026**

### Screens built (17 routes):
| Screen | File | Status |
|--------|------|--------|
| Root layout | `app/_layout.tsx` | ✅ Auth routing, Poppins fonts, providers |
| Tab bar | `app/(tabs)/_layout.tsx` | ✅ Home / Add / Passport (House, Plus, Ticket icons) |
| Home feed | `app/(tabs)/index.tsx` | ✅ Gradient title, stats bar, trending row, activity feed |
| Discover/Search | `app/(tabs)/add.tsx` | ✅ Debounced search, artist results |
| Passport | `app/(tabs)/passport.tsx` | ✅ Profile header, finds/collections grid |
| Login | `app/(auth)/login.tsx` | ✅ Magic link email auth |
| Leaderboard | `app/leaderboard.tsx` | ✅ Podium top 3, founders/influence/trending × all/month/week |
| Artist detail | `app/artist/[slug].tsx` | ✅ Hero image, founder badge, collect, listen links |
| User profile | `app/profile/[id].tsx` | ✅ Follow/unfollow, social counts, finds grid |
| Search | `app/search.tsx` | ✅ Artists + users tabs |
| Settings | `app/settings.tsx` | ✅ Sign out |
| Followers | `app/followers.tsx` | ✅ List with avatars |
| Following | `app/following.tsx` | ✅ List with avatars |
| Not found | `app/+not-found.tsx` | ✅ |

### Infrastructure:
| Component | File | Notes |
|-----------|------|-------|
| Theme | `src/constants/colors.ts` | Dark + light, exact match to old app |
| Supabase client | `src/lib/supabase.ts` | SecureStore adapter, detectSessionInUrl=false |
| Auth provider | `src/providers/AuthProvider.tsx` | Deep links, session persistence, auto-refresh |
| Query provider | `src/providers/QueryProvider.tsx` | TanStack Query with 5min stale time |
| Auth store | `src/stores/authStore.ts` | Zustand (session, user, loading) |
| UI store | `src/stores/uiStore.ts` | Zustand (onboarding, online status) |
| Date formatting | `src/lib/formatDate.ts` | Relative + absolute |
| Types | `src/types/index.ts` | All using NEW schema names |

### Data hooks (all direct Supabase queries):
| Hook | File | What it does |
|------|------|-------------|
| `useActivityFeed` | `src/hooks/useActivityFeed.ts` | Infinite scroll feed from followed users |
| `useUserStats` | `src/hooks/useUserStats.ts` | Finds, founders, influence counts |
| `useTrendingArtists` | `src/hooks/useTrendingArtists.ts` | Most collected items in 2 weeks |
| `useLeaderboard` | `src/hooks/useLeaderboard.ts` | Rankings with period filters |
| `useArtistProfile` | `src/hooks/useArtistProfile.ts` | Artist detail + founder + fan count + status |
| `useSearch` | `src/hooks/useSearch.ts` | Decibel ILIKE search + user search |
| `useCollect` | `src/hooks/useCollect.ts` | Collect mutation + myCollectedIds |
| `useFollow` | `src/hooks/useFollow.ts` | Follow/unfollow + social counts |
| `usePassport` | `src/hooks/usePassport.ts` | User's finds + collections with item details |

### Components:
| Component | File |
|-----------|------|
| ActivityFeedCard | `src/components/home/ActivityFeedCard.tsx` |
| StatsBar | `src/components/home/StatsBar.tsx` |
| TrendingArtistsRow | `src/components/home/TrendingArtistsRow.tsx` |
| PassportHeader | `src/components/passport/PassportHeader.tsx` |
| SearchResultCard | `src/components/search/SearchResultCard.tsx` |

### Known limitations (to address in later phases):
- RLS may block some direct Supabase queries → Phase 2 (Express API with service role key)
- No "found new artist" flow → Phase 5 (share-a-link)
- No push notifications → Phase 6
- No share card generation
- Passport uses simple tab pills (not collapsible tab view)

---

## Phase 2: Express Backend Service ✅
**Completed: March 24, 2026**

- All API routes: items, users, feed, founders, collections, leaderboard
- Auth middleware validates Supabase JWTs, API uses service role key (bypasses RLS)
- Running on VM in tmux session `decibel-api` at port 3001
- .env symlinked from root

---

## Phase 3: Mobile App Migration (to Express API) ✅
**Completed: March 24, 2026**

- Created `src/lib/api.ts` with apiCall() — Bearer token, 401 retry
- All 9 hooks migrated from direct Supabase to Express API
- API URL: `http://159.203.108.156:3001` for device testing
- Only auth screens (login, settings) still use Supabase directly

---

## Phase 4: Growth Tracking & Portfolio ✅
**Completed: March 24, 2026**

- `item_metrics` table created (Supabase migration)
- metrics.ts service: captureItemMetrics, updateAllItemMetrics, calculateTasteScore, getPortfolioGrowth
- /api/metrics routes: portfolio, update-all (cron), capture
- Founders route captures metrics on founding
- VM cron: weekly metrics update Sundays 3am
- Mobile: usePortfolio hook, taste score badge, best find card, growth % badges on grid

---

## Phase 5: Add Flow (Share-a-Link) ✅
**Completed: March 24, 2026**

- scraper.ts: URL detection (Spotify, Apple Music, SoundCloud, Google Maps, Instagram)
- Deezer API for artist metadata (free, no auth)
- Meta tag fallback for any URL
- POST /api/items/from-url: parse → preview with existing check
- Mobile: Search + Paste Link toggle on Discover tab
- Paste mode: clipboard auto-detect, preview card, Found/Collect buttons
- Founder threshold: 13,000 Deezer fans

---

## Phase 6: Activity & Notifications ✅
**Completed: March 24, 2026**

- `notifications` table created (Supabase migration)
- Notification triggers: collection → founder, follow → followed user, weekly portfolio digest
- /api/notifications: list, unread-count, mark-read, generate-weekly
- Mobile: Activity screen with typed notification rows
- Bell icon on Home screen with unread count badge
- Auto mark-read on screen open, tap to navigate
