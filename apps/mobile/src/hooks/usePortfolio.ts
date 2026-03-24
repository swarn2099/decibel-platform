import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export type PortfolioItem = {
  item_id: string;
  item: {
    id: string;
    name: string;
    slug: string;
    photo_url: string | null;
    genres: string[] | null;
    category: string;
  };
  awarded_at: string;
  founding_metric: number;
  current_metric: number;
  growth_pct: number;
};

type PortfolioResponse = {
  data: {
    portfolio: PortfolioItem[];
    taste_score: number;
    best_find: PortfolioItem | null;
  };
};

export function usePortfolio(userId?: string) {
  const user = useAuthStore((s) => s.user);
  const targetId = userId ?? user?.id;

  return useQuery({
    queryKey: ["portfolio", targetId],
    queryFn: async () => {
      const path = userId
        ? `/api/metrics/portfolio/${userId}`
        : "/api/metrics/portfolio";
      const res = await apiCall<PortfolioResponse>(path);
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!targetId,
  });
}
