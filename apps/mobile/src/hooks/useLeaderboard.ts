import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import type { LeaderboardView, TimePeriod, LeaderboardEntry } from "@/types";

type LeaderboardResponse = {
  data: LeaderboardEntry[];
};

export function useLeaderboard({ view, period }: { view: LeaderboardView; period: TimePeriod }) {
  const user = useAuthStore((s) => s.user);
  const periodParam = period === "allTime" ? "all" : period === "monthly" ? "month" : "week";

  const query = useQuery({
    queryKey: ["leaderboard", view, period],
    queryFn: async () => {
      const res = await apiCall<LeaderboardResponse>(
        `/api/leaderboard?type=${view}&period=${periodParam}`
      );
      return res.data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const entries = query.data ?? [];
  const userPosition = entries.find((e) => e.fanId === user?.id) ?? null;

  return {
    entries,
    userPosition,
    currentFanId: user?.id ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
