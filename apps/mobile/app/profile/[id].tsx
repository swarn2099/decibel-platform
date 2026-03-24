import { View, Text, FlatList, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/authStore";
import { useIsFollowing, useFollowUser, useUnfollowUser, useSocialCounts } from "@/hooks/useFollow";
import { useThemeColors } from "@/constants/colors";

export default function UserProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === id;
  const { width: screenWidth } = useWindowDimensions();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", id],
    queryFn: async () => {
      const { data } = await supabase.from("users").select("*").eq("id", id!).single();
      return data;
    },
    enabled: !!id,
  });

  const { data: isFollowing } = useIsFollowing(id);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const { data: socialCounts } = useSocialCounts(id);

  const { data: founds } = useQuery({
    queryKey: ["userFounds", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("founder_badges")
        .select("id, item_id, awarded_at, items!inner(id, name, slug, photo_url)")
        .eq("user_id", id!)
        .order("awarded_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!id,
  });

  if (isLoading || !profile) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <Pressable onPress={() => router.back()} style={{ paddingHorizontal: 16, paddingVertical: 12 }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.pink} />
        </View>
      </SafeAreaView>
    );
  }

  const name = profile.name ?? "User";
  const initial = name.charAt(0).toUpperCase();
  const CELL_GAP = 3;
  const cellSize = (screenWidth - CELL_GAP * 4) / 3;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 18, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={founds ?? []}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ gap: CELL_GAP, paddingHorizontal: CELL_GAP }}
        contentContainerStyle={{ gap: CELL_GAP, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 20, paddingBottom: 16 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, overflow: "hidden", borderWidth: 1, borderColor: colors.cardBorder }}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 72, height: 72 }} contentFit="cover" />
                ) : (
                  <LinearGradient colors={["#FF4D6A", "#9B6DFF"]} style={{ width: 72, height: 72, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 28, fontFamily: "Poppins_700Bold", color: "rgba(255,255,255,0.8)" }}>{initial}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-around" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{socialCounts?.followers_count ?? 0}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Followers</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{socialCounts?.following_count ?? 0}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Following</Text>
                </View>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{founds?.length ?? 0}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Finds</Text>
                </View>
              </View>
            </View>

            {!isOwnProfile && (
              <Pressable
                onPress={() => {
                  if (isFollowing) unfollowMutation.mutate({ targetUserId: id! });
                  else followMutation.mutate({ targetUserId: id! });
                }}
                style={{ marginTop: 12, paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: isFollowing ? colors.card : colors.pink, borderWidth: isFollowing ? 1 : 0, borderColor: colors.cardBorder }}
              >
                <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: isFollowing ? colors.text : "#FFFFFF" }}>
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </Pressable>
            )}

            <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginTop: 16 }}>Finds</Text>
          </View>
        }
        renderItem={({ item }) => {
          const i = Array.isArray(item.items) ? item.items[0] : item.items;
          return (
            <Pressable onPress={() => { if (i?.slug) router.push(`/artist/${i.slug}` as any); }} style={{ width: cellSize, height: cellSize, borderRadius: 6, overflow: "hidden", backgroundColor: colors.card }}>
              {i?.photo_url ? (
                <Image source={{ uri: i.photo_url }} style={{ width: cellSize, height: cellSize }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 24, color: colors.textSecondary }}>{(i?.name ?? "?").charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "40%", backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end", paddingHorizontal: 6, paddingBottom: 4 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontFamily: "Poppins_600SemiBold" }} numberOfLines={1}>{i?.name ?? "Unknown"}</Text>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>No finds yet</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
