import { View, Text, FlatList, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Grid3x3, Bookmark, BarChart3 } from "lucide-react-native";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Svg, { Polyline, Line, Text as SvgText } from "react-native-svg";
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

function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatsTabContent({ stats, colors, screenWidth }: { stats: any; colors: ReturnType<typeof useThemeColors>; screenWidth: number }) {
  if (!stats) {
    return <View style={{ alignItems: "center", paddingVertical: 40 }}><ActivityIndicator color={colors.pink} /></View>;
  }

  const timeline: { date: string; count: number }[] = stats.adds_timeline ?? [];
  const W = screenWidth - 40;
  const H = 160;
  const PAD_L = 35; const PAD_R = 10; const PAD_T = 10; const PAD_B = 25;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  let chartSvg = null;
  if (timeline.length >= 2) {
    const vals = timeline.map((d) => d.count);
    const maxV = Math.max(...vals, 1);
    const points = timeline.map((d, i) => {
      const x = PAD_L + (i / (timeline.length - 1)) * chartW;
      const y = PAD_T + chartH - (d.count / maxV) * chartH;
      return `${x},${y}`;
    }).join(" ");

    const yLabels = [0, Math.ceil(maxV / 2), maxV].map((v) => ({
      label: String(v), y: PAD_T + chartH - (v / maxV) * chartH,
    }));

    chartSvg = (
      <Svg width={W} height={H}>
        {yLabels.map((yl, i) => (
          <Line key={i} x1={PAD_L} y1={yl.y} x2={PAD_L + chartW} y2={yl.y} stroke={colors.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth={1} />
        ))}
        {yLabels.map((yl, i) => (
          <SvgText key={`yl${i}`} x={PAD_L - 6} y={yl.y + 4} fill={colors.textSecondary} fontSize={9} textAnchor="end">{yl.label}</SvgText>
        ))}
        <SvgText x={PAD_L} y={H - 4} fill={colors.textSecondary} fontSize={9} textAnchor="start">{timeline[0].date.slice(5)}</SvgText>
        <SvgText x={PAD_L + chartW} y={H - 4} fill={colors.textSecondary} fontSize={9} textAnchor="end">{timeline[timeline.length - 1].date.slice(5)}</SvgText>
        <Polyline points={points} fill="none" stroke={colors.purple} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </Svg>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, gap: 16 }}>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontFamily: "Poppins_700Bold", color: colors.text }}>{stats.total_finds}</Text>
          <Text style={{ fontSize: 11, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Total Finds</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontFamily: "Poppins_700Bold", color: colors.text }}>{formatListeners(stats.avg_listeners)}</Text>
          <Text style={{ fontSize: 11, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Avg Listeners</Text>
        </View>
        <View style={{ flex: 1, backgroundColor: colors.card, borderRadius: 12, padding: 14, alignItems: "center" }}>
          <Text style={{ fontSize: 22, fontFamily: "Poppins_700Bold", color: colors.purple }}>#{stats.rank}</Text>
          <Text style={{ fontSize: 11, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>of {stats.total_peers}</Text>
        </View>
      </View>
      <View>
        <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8 }}>Adds per Day (30d)</Text>
        <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 12 }}>
          {chartSvg ?? (
            <View style={{ height: 100, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>Not enough data yet</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function UserProfileScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const currentUser = useAuthStore((s) => s.user);
  const isOwnProfile = currentUser?.id === id;
  const { width: screenWidth } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<"finds" | "collections" | "stats">("finds");

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

  const { data: passportItems } = useQuery({
    queryKey: ["passport", id],
    queryFn: async () => {
      const res = await apiCall<{ data: any[] }>(`/api/users/${id}/passport`);
      return res.data ?? [];
    },
    enabled: !!id,
  });

  const { data: profileStats } = useQuery({
    queryKey: ["profileStats", id],
    queryFn: async () => {
      const res = await apiCall<{ data: any }>(`/api/users/${id}/profile-stats`);
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!id,
  });

  const finds = (passportItems ?? []).filter((p: any) => p.is_founder);
  const collections = (passportItems ?? []).filter((p: any) => !p.is_founder);
  const activeItems = activeTab === "stats" ? [] : activeTab === "finds" ? finds : collections;

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

            <View style={{ paddingHorizontal: 20, paddingBottom: 12 }}>
              <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{name}</Text>
            </View>

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

            {/* Tabs with icons */}
            <View style={{ flexDirection: "row", justifyContent: "center", gap: 24, paddingTop: 4, marginBottom: 10 }}>
              {([
                { key: "finds" as const, label: "Finds", Icon: Grid3x3 },
                { key: "collections" as const, label: "Collections", Icon: Bookmark },
                { key: "stats" as const, label: "Stats", Icon: BarChart3 },
              ]).map(({ key, label, Icon }) => (
                <Pressable key={key} onPress={() => setActiveTab(key)} style={{ alignItems: "center", paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: activeTab === key ? colors.text : "transparent" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <Icon size={15} color={activeTab === key ? colors.text : colors.textSecondary} strokeWidth={activeTab === key ? 2.5 : 1.8} />
                    <Text style={{ fontSize: 11, fontFamily: activeTab === key ? "Poppins_600SemiBold" : "Poppins_400Regular", color: activeTab === key ? colors.text : colors.textSecondary, letterSpacing: 0.5, textTransform: "uppercase" }}>
                      {label}
                    </Text>
                  </View>
                </Pressable>
              ))}
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
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"]}
                locations={[0, 0.3, 0.5, 0.75, 1]}
                style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: cardHeight * 0.55 }}
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
          activeTab === "stats" ? (
            <StatsTabContent stats={profileStats} colors={colors} screenWidth={screenWidth} />
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 40 }}>
              <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>
                {activeTab === "finds" ? "No finds yet" : "No collections yet"}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
