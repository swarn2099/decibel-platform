// Database types matching current Supabase schema

export interface User {
  id: string;
  email: string;
  name: string | null;
  city: string | null;
  avatar_url: string | null;
  app_installed: boolean;
  created_at: string;
  phone: string | null;
  spotify_refresh_token: string | null;
  spotify_connected_at: string | null;
}

export interface Item {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  photo_url: string | null;
  soundcloud_url: string | null;
  mixcloud_url: string | null;
  ra_url: string | null;
  instagram_handle: string | null;
  city: string;
  genres: string[];
  follower_count: number;
  claimed: boolean;
  claimed_by: string | null;
  created_at: string;
  updated_at: string | null;
  is_chicago_resident: boolean | null;
  spotify_url: string | null;
  spotify_id: string | null;
  monthly_listeners: number | null;
  spotify_embed_url: string | null;
  soundcloud_embed_url: string | null;
  apple_music_embed_url: string | null;
  top_track_cached_at: string | null;
  verified: boolean;
  category: string;
}

export interface FounderBadge {
  id: string;
  user_id: string;
  item_id: string;
  awarded_at: string;
  metric_snapshot: Record<string, unknown>;
}

export interface Collection {
  id: string;
  user_id: string;
  item_id: string;
  venue_id: string | null;
  event_date: string | null;
  capture_method: string;
  verified: boolean;
  created_at: string;
  collection_type: string;
}

export interface Follow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

// API response types

export interface ApiResponse<T> {
  data: T;
  error: null;
}

export interface ApiError {
  data: null;
  error: string;
}

export type ApiResult<T> = ApiResponse<T> | ApiError;
