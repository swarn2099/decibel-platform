import { View, Text, FlatList, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { useIsFollowing, useFollowUser, useUnfollowUser, useSocialCounts } from "@/hooks/useFollow";
import { useThemeColors } from "@/constants/colors";

const CARD_ASPECT = 1.3;

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function categoryLabel(cat: string): string {
  if (cat === "music") return "Artist";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

export default function UserProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === id;
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<"finds" | "collections">("finds");

  const { data: profile, isLoading } = useQuery({
    queryKey: ["userProfile", id],
    queryFn: async () => {
      const res = await apiCall<{ data: any }>(`/api/users/${id}`);
      return res.data;
    },
    enabled: !!id,
  });

  const { data: isFollowing } = useIsFollowing(id);
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();
  const { data: socialCounts } = useSocialCounts(id);

  // Use passport endpoint (same as own profile) to get combined + deduplicated list
  const { data: passportItems } = useQuery({
    queryKey: ["passport", id],
    queryFn: async () => {
      const res = await apiCall<{ data: any[] }>(`/api/users/${id}/passport`);
      return res.data ?? [];
    },
    enabled: !!id,
  });

  const finds = (passportItems ?? []).filter((p: any) => p.is_founder);
  const collections = (passportItems ?? []).filter((p: any) => !p.is_founder);
  const activeItems = activeTab === "finds" ? finds : collections;

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
  const cardHeight = cellSize * CARD_ASPECT;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      {/* Top bar */}
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 8 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: "center", fontSize: 16, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{name}</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={activeItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ gap: CELL_GAP, paddingHorizontal: CELL_GAP }}
        contentContainerStyle={{ gap: CELL_GAP, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={{ paddingBottom: 0 }}>
            {/* Avatar + stats row */}
            <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 12, gap: 20 }}>
              <View style={{ width: 80, height: 80, borderRadius: 40, overflow: "hidden", borderWidth: 1, borderColor: colors.cardBorder }}>
                {profile.avatar_url ? (
                  <Image source={{ uri: profile.avatar_url }} style={{ width: 80, height: 80 }} contentFit="cover" />
                ) : (
                  <LinearGradient colors={["#FF4D6A", "#9B6DFF"]} style={{ width: 80, height: 80, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 32, fontFamily: "Poppins_700Bold", color: "rgba(255,255,255,0.8)" }}>{initial}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={{ flex: 1, flexDirection: "row", justifyContent: "space-around" }}>
                <View style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Poppins_700Bold", color: colors.text }}>{finds.length}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Finds</Text>
                </View>
                <Pressable onPress={() => router.push({ pathname: "/followers" as any, params: { fanId: id } })} style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Poppins_700Bold", color: colors.text }}>{socialCounts?.followers_count ?? 0}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Followers</Text>
                </Pressable>
                <Pressable onPress={() => router.push({ pathname: "/following" as any, params: { fanId: id } })} style={{ alignItems: "center" }}>
                  <Text style={{ fontSize: 18, fontFamily: "Poppins_700Bold", color: colors.text }}>{socialCounts?.following_count ?? 0}</Text>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Following</Text>
                </Pressable>
              </View>
            </View>

            {/* Name */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{name}</Text>
            </View>

            {/* Follow button */}
            {!isOwnProfile && (
              <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
                <Pressable
                  onPress={() => {
                    if (isFollowing) unfollowMutation.mutate({ targetUserId: id! });
                    else followMutation.mutate({ targetUserId: id! });
                  }}
                  style={{ paddingVertical: 8, borderRadius: 8, alignItems: "center", backgroundColor: isFollowing ? colors.card : colors.pink, borderWidth: isFollowing ? 1 : 0, borderColor: colors.cardBorder }}
                >
                  <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: isFollowing ? colors.text : "#FFFFFF" }}>
                    {isFollowing ? "Following" : "Follow"}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* Instagram-style tabs */}
            <View style={{ flexDirection: "row", borderTopWidth: 0.5, borderTopColor: colors.isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)", marginBottom: CELL_GAP }}>
              <Pressable onPress={() => setActiveTab("finds")} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === "finds" ? colors.text : "transparent" }}>
                <Text style={{ fontSize: 13, fontFamily: activeTab === "finds" ? "Poppins_600SemiBold" : "Poppins_400Regular", color: activeTab === "finds" ? colors.text : colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Finds
                </Text>
              </Pressable>
              <Pressable onPress={() => setActiveTab("collections")} style={{ flex: 1, alignItems: "center", paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: activeTab === "collections" ? colors.text : "transparent" }}>
                <Text style={{ fontSize: 13, fontFamily: activeTab === "collections" ? "Poppins_600SemiBold" : "Poppins_400Regular", color: activeTab === "collections" ? colors.text : colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Collections
                </Text>
              </Pressable>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const i = item.item;
          return (
            <Pressable onPress={() => { if (i?.slug) router.push(`/artist/${i.slug}` as any); }} style={{ width: cellSize, height: cardHeight, borderRadius: 10, overflow: "hidden", backgroundColor: colors.card }}>
              {i?.photo_url ? (
                <Image source={{ uri: i.photo_url }} style={{ width: cellSize, height: cardHeight }} contentFit="cover" />
              ) : (
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 28, color: colors.textSecondary }}>{(i?.name ?? "?").charAt(0).toUpperCase()}</Text>
                </View>
              )}
              {/* Smooth gradient fade */}
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.75)"]}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: cardHeight * 0.5 }}
              />
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 7, paddingBottom: 7 }}>
                <Text style={{ color: "#FFFFFF", fontSize: 11, fontFamily: "Poppins_600SemiBold", lineHeight: 14 }} numberOfLines={1}>{i?.name ?? "Unknown"}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                  <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
                    <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 8, fontFamily: "Poppins_500Medium" }}>
                      {categoryLabel(i?.category ?? "music")}
                    </Text>
                  </View>
                  {item.is_founder && (
                    <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, fontFamily: "Poppins_400Regular" }}>
                      {formatShortDate(item.created_at)}
                    </Text>
                  )}
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", paddingVertical: 40 }}>
            <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>
              {activeTab === "finds" ? "No finds yet" : "No collections yet"}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
