import { useInfiniteQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { ActivityFeedItem } from "@/types";

const PAGE_SIZE = 20;

type ActivityFeedResponse = {
  data: {
    items: ActivityFeedItem[];
    has_more: boolean;
    is_fallback: boolean;
  };
};

export function useActivityFeed() {
  const user = useAuthStore((s) => s.user);

  const query = useInfiniteQuery({
    queryKey: ["activity-feed", user?.id],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const res = await apiCall<ActivityFeedResponse>(
        `/api/feed?page=${pageParam as number}&limit=${PAGE_SIZE}`
      );
      return res.data;
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.has_more) return undefined;
      return allPages.length;
    },
    staleTime: 2 * 60 * 1000,
    enabled: !!user?.id,
  });

  const isFallback = query.data?.pages[0]?.is_fallback ?? false;

  return { ...query, isFallback };
}
