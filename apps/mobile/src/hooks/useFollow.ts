import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";

export function useIsFollowing(targetUserId: string | undefined) {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["isFollowing", user?.id, targetUserId],
    queryFn: async () => {
      const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId!)
        .maybeSingle();

      return !!data;
    },
    enabled: !!user?.id && !!targetUserId && user.id !== targetUserId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      const { error } = await supabase.from("follows").insert({
        follower_id: user!.id,
        following_id: targetUserId,
      });
      if (error) throw error;
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
  const user = useAuthStore((s) => s.user);

  return useMutation({
    mutationFn: async ({ targetUserId }: { targetUserId: string }) => {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user!.id)
        .eq("following_id", targetUserId);
      if (error) throw error;
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
      const { count: followersCount } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("following_id", targetId!);

      const { count: followingCount } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .eq("follower_id", targetId!);

      return {
        followers_count: followersCount ?? 0,
        following_count: followingCount ?? 0,
      };
    },
    enabled: !!targetId,
    staleTime: 5 * 60 * 1000,
  });
}
