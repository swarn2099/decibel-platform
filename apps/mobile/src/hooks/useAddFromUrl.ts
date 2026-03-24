import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";

type UrlPreview = {
  name: string;
  photo_url: string | null;
  category: string;
  platform: string;
  genres: string[];
  metrics: { monthly_listeners?: number; follower_count?: number };
  spotify_url?: string;
  spotify_id?: string;
  soundcloud_url?: string;
  is_above_threshold: boolean;
};

type FromUrlResponse = {
  data: {
    preview: UrlPreview;
    existing_item_id: string | null;
    existing_item_slug: string | null;
    existing_founder: { user_id: string; username: string } | null;
  };
};

type FoundResult = {
  success: boolean;
  is_founder: boolean;
  already_exists: boolean;
  performer: { id: string; name: string; slug: string };
};

export function useValidateUrl() {
  return useMutation({
    mutationFn: async (url: string) => {
      const res = await apiCall<FromUrlResponse>("/api/items/from-url", {
        method: "POST",
        body: JSON.stringify({ url }),
      });
      return res.data;
    },
  });
}

export function useFoundFromUrl() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      item_id?: string;
      name: string;
      slug?: string;
      photo_url?: string | null;
      genres?: string[];
      category?: string;
      follower_count?: number;
      monthly_listeners?: number;
      spotify_url?: string;
      spotify_id?: string;
      soundcloud_url?: string;
    }) => {
      return apiCall<{ data: any }>("/api/founders", {
        method: "POST",
        body: JSON.stringify(params),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["passport"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
  });
}
