// Types using NEW schema names (users, items, user_id, item_id)

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
};

export type Item = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  soundcloud_url: string | null;
  spotify_url: string | null;
  spotify_id: string | null;
  mixcloud_url: string | null;
  ra_url: string | null;
  instagram_handle: string | null;
  city: string | null;
  genres: string[] | null;
  follower_count: number | null;
  monthly_listeners: number | null;
  claimed: boolean;
  is_chicago_resident: boolean | null;
  category: string;
  verified: boolean;
  created_at: string;
  updated_at: string | null;
};

export type FounderBadge = {
  id: string;
  user_id: string;
  item_id: string;
  awarded_at: string;
  metric_snapshot: Record<string, unknown>;
};

export type Collection = {
  id: string;
  user_id: string;
  item_id: string;
  venue_id: string | null;
  event_date: string | null;
  capture_method: string;
  verified: boolean;
  created_at: string;
  collection_type: string;
};

export type Follow = {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
};

// Leaderboard
export type LeaderboardView = "founders" | "influence" | "trending";
export type TimePeriod = "weekly" | "monthly" | "allTime";
export type LeaderboardEntry = {
  rank: number;
  fanId: string;
  name: string;
  avatarUrl: string | null;
  metric: number;
};

// Activity feed
export type ActivityFeedAction = "discovered" | "collected" | "founded";
export type ActivityFeedItem = {
  id: string;
  fan_id: string;
  fan_name: string;
  fan_avatar: string | null;
  action: ActivityFeedAction;
  performer_id: string;
  performer_name: string;
  performer_slug: string;
  performer_image: string | null;
  performer_genres: string[] | null;
  venue_name: string | null;
  timestamp: string;
};

// Search
export type DecibelSearchResult = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  genres: string[] | null;
  fan_count: number;
};

// Artist detail
export type FounderInfo = {
  name: string | null;
  avatar_url: string | null;
  awarded_at: string;
  user_id: string;
  total_founds?: number;
};

export type ItemFan = {
  id: string;
  name: string;
  avatar_url: string | null;
  type: "founded" | "collected" | "discovered";
  date: string;
};
