import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";

export type TrendingArtist = {
  id: string;
  name: string;
  slug: string;
  photo_url: string | null;
  collector_count: number;
};

type TrendingResponse = {
  data: TrendingArtist[];
};

export function useTrendingArtists() {
  const { data, isLoading } = useQuery({
    queryKey: ["trending-artists"],
    queryFn: async () => {
      const res = await apiCall<TrendingResponse>("/api/feed/trending");
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    artists: data ?? [],
    isLoading,
  };
}
