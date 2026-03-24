import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";

export function useIsFollowing(targetUserId: string | undefined) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["isFollowing", user?.id, targetUserId],
    queryFn: async () => {
      const res = await apiCall<{ data: { is_following: boolean } }>(
        `/api/users/${targetUserId}/is-following`
      );
      return res.data?.is_following ?? false;
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      return apiCall(`/api/users/${targetUserId}/follow`, { method: "POST" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing"] });
      queryClient.invalidateQueries({ queryKey: ["socialCounts"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      return apiCall(`/api/users/${targetUserId}/follow`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["isFollowing"] });
      queryClient.invalidateQueries({ queryKey: ["socialCounts"] });
      queryClient.invalidateQueries({ queryKey: ["activity-feed"] });
    },
  });
}

export function useSocialCounts(userId?: string) {
  const user = useAuthStore((s) => s.user);
  const targetId = userId ?? user?.id;

  return useQuery({
    queryKey: ["socialCounts", targetId],
    queryFn: async () => {
      const res = await apiCall<{ data: { followers_count: number; following_count: number } }>(
        `/api/users/${targetId}/social-counts`
      );
      return res.data;
    },
    enabled: !!targetId,
    staleTime: 5 * 60 * 1000,
  });
}
