import { supabase } from "./supabase";

// For device testing: use VM's public IP
// For local simulator: use localhost
const API_BASE = process.env.EXPO_PUBLIC_API_URL || "https://decibel-platform.onrender.com";

export async function apiCall<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Not authenticated");
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...options?.headers,
    },
  });

  if (res.ok) {
    return res.json();
  }

  if (res.status === 401) {
    // Try to refresh session
    const { error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError) {
      // Retry once with fresh token
      const { data: { session: newSession } } = await supabase.auth.getSession();
      if (newSession?.access_token) {
        const retryRes = await fetch(`${API_BASE}${path}`, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${newSession.access_token}`,
            ...options?.headers,
          },
        });
        if (retryRes.ok) return retryRes.json();
      }
    }
  }

  const text = await res.text().catch(() => "Unknown error");
  throw new Error(`API error ${res.status}: ${text}`);
}
