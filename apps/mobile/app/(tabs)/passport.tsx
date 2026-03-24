import { View, Text, FlatList, Pressable, useWindowDimensions, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Grid3x3, Bookmark, BarChart3 } from "lucide-react-native";
import Svg, { Polyline, Line, Text as SvgText } from "react-native-svg";
import { useAuthStore } from "@/stores/authStore";
import { usePassport, type PassportItem } from "@/hooks/usePassport";
import { useSocialCounts } from "@/hooks/useFollow";
import { usePortfolio, type PortfolioItem } from "@/hooks/usePortfolio";
import { PassportHeader } from "@/components/passport/PassportHeader";
import { useThemeColors } from "@/constants/colors";
import { apiCall } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type UserProfile = {
  id: string;
  name: string | null;
  avatar_url: string | null;
  city: string | null;
  created_at: string;
};

function useUserProfile() {
  const user = useAuthStore((s) => s.user);
  return useQuery<UserProfile | null>({
    queryKey: ["userProfile", user?.id],
    queryFn: async () => {
      try {
        const res = await apiCall<{ data: UserProfile }>(`/api/users/me`);
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!user?.id,
  });
}

const CARD_ASPECT = 1.3; // taller than square (like 4:5)

function formatCardDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function categoryLabel(cat: string): string {
  if (cat === "music") return "Artist";
  return cat.charAt(0).toUpperCase() + cat.slice(1);
}

function CollectionGridCell({ item, cellSize, growthPct }: { item: PassportItem; cellSize: number; growthPct?: number }) {
  const colors = useThemeColors();
  const router = useRouter();
  const cardHeight = cellSize * CARD_ASPECT;

  return (
    <Pressable
      onPress={() => { if (item.item?.slug) router.push(`/artist/${item.item.slug}` as any); }}
      style={{ width: cellSize, height: cardHeight, borderRadius: 10, overflow: "hidden", backgroundColor: colors.card }}
    >
      {item.item?.photo_url ? (
        <Image source={{ uri: item.item.photo_url }} style={{ width: cellSize, height: cardHeight }} contentFit="cover" />
      ) : (
        <View style={{ flex: 1, backgroundColor: colors.card, justifyContent: "center", alignItems: "center" }}>
          <Text style={{ fontSize: 28, color: colors.textSecondary }}>{(item.item?.name ?? "?").charAt(0).toUpperCase()}</Text>
        </View>
      )}
      {/* Growth badge */}
      {growthPct !== undefined && growthPct !== 0 && item.is_founder && (
        <View style={{ position: "absolute", top: 6, right: 6, backgroundColor: growthPct > 0 ? "#00D4AA" : "#FF4D6A", borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2 }}>
          <Text style={{ color: "#FFFFFF", fontSize: 8, fontFamily: "Poppins_600SemiBold" }}>
            {growthPct > 0 ? "↑" : "↓"}{Math.abs(growthPct)}%
          </Text>
        </View>
      )}
      {/* Smooth gradient fade — multi-stop for frosted look */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.05)", "rgba(0,0,0,0.2)", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.8)"]}
        locations={[0, 0.3, 0.5, 0.75, 1]}
        style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: cardHeight * 0.55 }}
      />
      {/* Content at bottom */}
      <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, paddingHorizontal: 7, paddingBottom: 7 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 11, fontFamily: "Poppins_600SemiBold", lineHeight: 14 }} numberOfLines={1}>{item.item?.name ?? "Unknown"}</Text>
        {/* Category chip + date */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
          <View style={{ backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 6, paddingHorizontal: 5, paddingVertical: 1 }}>
            <Text style={{ color: "rgba(255,255,255,0.9)", fontSize: 8, fontFamily: "Poppins_500Medium" }}>
              {categoryLabel(item.item?.category ?? "music")}
            </Text>
          </View>
          {item.is_founder && (
            <Text style={{ color: "rgba(255,255,255,0.6)", fontSize: 8, fontFamily: "Poppins_400Regular" }}>
              {formatCardDate(item.created_at)}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function StatsTabContent({ stats, colors, screenWidth }: { stats: any; colors: ReturnType<typeof useThemeColors>; screenWidth: number }) {
  if (!stats) {
    return (
      <View style={{ alignItems: "center", paddingVertical: 40 }}>
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  const timeline: { date: string; count: number }[] = stats.adds_timeline ?? [];
  const W = screenWidth - 40;
  const H = 160;
  const PAD_L = 35;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 25;
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
      label: String(v),
      y: PAD_T + chartH - (v / maxV) * chartH,
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
      {/* Stat cards row */}
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

      {/* Activity chart */}
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

export default function PassportScreen() {
  const colors = useThemeColors();
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"finds" | "collections" | "stats">("finds");

  const { data: profile } = useUserProfile();
  const { data: passportItems, isLoading } = usePassport();
  const { data: socialCounts } = useSocialCounts();
  const { data: portfolioData } = usePortfolio();
  const user = useAuthStore((s) => s.user);

  // Build growth map from portfolio data
  const growthMap = new Map<string, { growth_pct: number; founding_metric: number; current_metric: number }>();
  for (const p of portfolioData?.portfolio ?? []) {
    growthMap.set(p.item_id, { growth_pct: p.growth_pct, founding_metric: p.founding_metric, current_metric: p.current_metric });
  }
  const tasteScore = portfolioData?.taste_score ?? 0;
  const bestFind = portfolioData?.best_find ?? null;

  // Stats data
  const { data: profileStats } = useQuery({
    queryKey: ["profileStats", profile?.id],
    queryFn: async () => {
      const res = await apiCall<{ data: any }>(`/api/users/me/profile-stats`);
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!profile?.id,
  });

  const finds = (passportItems ?? []).filter((p) => p.is_founder);
  const collections = (passportItems ?? []).filter((p) => !p.is_founder);
  const activeItems = activeTab === "stats" ? [] : activeTab === "finds" ? finds : collections;

  const CELL_GAP = 3;
  const COLUMNS = 3;
  const cellSize = (screenWidth - CELL_GAP * (COLUMNS + 1)) / COLUMNS;

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator color={colors.pink} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList
        data={activeItems}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={{ gap: CELL_GAP, paddingHorizontal: CELL_GAP }}
        contentContainerStyle={{ gap: CELL_GAP, paddingTop: CELL_GAP, paddingBottom: 120 }}
        renderItem={({ item }) => <CollectionGridCell item={item} cellSize={cellSize} growthPct={growthMap.get(item.item_id)?.growth_pct} />}
        ListHeaderComponent={
          <>
            <PassportHeader
              displayName={profile?.name ?? null}
              avatarUrl={profile?.avatar_url ?? null}
              memberSince={profile?.created_at ?? new Date().toISOString()}
              followersCount={socialCounts?.followers_count ?? 0}
              followingCount={socialCounts?.following_count ?? 0}
              findsCount={finds.length}
              collectionsCount={collections.length}
              fanId={profile?.id ?? ""}
            />
            {/* Taste score */}
            {tasteScore > 0 && (
              <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 20, marginBottom: 12, gap: 8 }}>
                <View style={{ backgroundColor: `${colors.purple}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.purple }}>
                    Taste Score: {tasteScore}
                  </Text>
                </View>
              </View>
            )}
            {/* Best find card */}
            {bestFind && bestFind.growth_pct > 0 && (
              <Pressable
                onPress={() => { if (bestFind.item?.slug) router.push(`/artist/${bestFind.item.slug}` as any); }}
                style={{ marginHorizontal: 20, marginBottom: 12, backgroundColor: `${colors.teal}15`, borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}
              >
                <View style={{ width: 40, height: 40, borderRadius: 8, overflow: "hidden", backgroundColor: colors.card }}>
                  {bestFind.item?.photo_url ? (
                    <Image source={{ uri: bestFind.item.photo_url }} style={{ width: 40, height: 40 }} contentFit="cover" />
                  ) : (
                    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                      <Text style={{ fontSize: 16, color: colors.textSecondary }}>{(bestFind.item?.name ?? "?").charAt(0)}</Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, fontFamily: "Poppins_500Medium", color: colors.teal, textTransform: "uppercase", letterSpacing: 0.5 }}>Best Find</Text>
                  <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{bestFind.item?.name}</Text>
                </View>
                <Text style={{ fontSize: 16, fontFamily: "Poppins_700Bold", color: colors.teal }}>↑{bestFind.growth_pct}%</Text>
              </Pressable>
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
          </>
        }
        ListEmptyComponent={
          activeTab === "stats" ? (
            <StatsTabContent stats={profileStats} colors={colors} screenWidth={screenWidth} />
          ) : (
            <View style={{ alignItems: "center", paddingVertical: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 16, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8 }}>
                {activeTab === "finds" ? "No finds yet" : "No collections yet"}
              </Text>
              <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textSecondary, textAlign: "center" }}>
                {activeTab === "finds" ? "Add an artist to start your collection!" : "Collect artists from the feed!"}
              </Text>
            </View>
          )
        }
      />
    </SafeAreaView>
  );
}
