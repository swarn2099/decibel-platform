import { View, Text, FlatList, Pressable, ActivityIndicator } from "react-native";
import Svg, { Defs, LinearGradient as SvgLinearGradient, Stop, Text as SvgText } from "react-native-svg";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Compass, TrendingUp, Trophy } from "lucide-react-native";
import { useThemeColors } from "@/constants/colors";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useUserStats } from "@/hooks/useUserStats";
import { useTrendingArtists } from "@/hooks/useTrendingArtists";
import { useMyCollectedIds, useCollectItem } from "@/hooks/useCollect";
import { ActivityFeedCard, ActivityFeedEmpty } from "@/components/home/ActivityFeedCard";
import { StatsBar } from "@/components/home/StatsBar";
import { TrendingArtistsRow } from "@/components/home/TrendingArtistsRow";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ActivityFeedItem } from "@/types";

function GradientTitle() {
  const colors = useThemeColors();
  return (
    <Svg height={36} width={180}>
      <Defs>
        <SvgLinearGradient id="grad" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={colors.pink} />
          <Stop offset="0.5" stopColor={colors.purple} />
          <Stop offset="1" stopColor={colors.blue} />
        </SvgLinearGradient>
      </Defs>
      <SvgText fill="url(#grad)" fontSize="28" fontWeight="bold" fontFamily="Poppins_700Bold" x="90" y="28" textAnchor="middle">
        DECIBEL
      </SvgText>
    </Svg>
  );
}

export default function HomeScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const queryClient = useQueryClient();
  const activityFeed = useActivityFeed();
  const userStats = useUserStats();
  const trendingArtists = useTrendingArtists();
  const collectMutation = useCollectItem();
  const { collectedIds } = useMyCollectedIds();
  const [refreshing, setRefreshing] = useState(false);
  const [localCollected, setLocalCollected] = useState<Set<string>>(new Set());

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      activityFeed.refetch(),
      queryClient.invalidateQueries({ queryKey: ["user-stats"] }),
      queryClient.invalidateQueries({ queryKey: ["trending-artists"] }),
    ]);
    setRefreshing(false);
  }, [activityFeed, queryClient]);

  const feedItems = useMemo(
    () => activityFeed.data?.pages.flatMap((p) => p.items) ?? [],
    [activityFeed.data]
  );

  const handleLoadMoreFeed = useCallback(() => {
    if (activityFeed.hasNextPage && !activityFeed.isFetchingNextPage) {
      activityFeed.fetchNextPage();
    }
  }, [activityFeed]);

  const handleCollect = useCallback(
    (itemId: string) => {
      setLocalCollected((prev) => new Set(prev).add(itemId));
      collectMutation.mutate(
        { itemId },
        {
          onError: (error: Error) => {
            if (error.message?.includes("already")) return;
            setLocalCollected((prev) => {
              const next = new Set(prev);
              next.delete(itemId);
              return next;
            });
          },
        }
      );
    },
    [collectMutation]
  );

  const isFallback = activityFeed.isFallback;

  const ListHeader = (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8, paddingBottom: 12, paddingHorizontal: 20 }}>
        <View style={{ flex: 1, flexDirection: "row", gap: 8 }}>
          <Pressable onPress={() => router.push("/leaderboard" as any)} hitSlop={12} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: "center", justifyContent: "center" }}>
            <Trophy size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
        <GradientTitle />
        <View style={{ flex: 1, alignItems: "flex-end" }}>
          <Pressable onPress={() => router.push("/search" as any)} hitSlop={12} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, alignItems: "center", justifyContent: "center" }}>
            <Search size={20} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <StatsBar artists={userStats.finds} founders={userStats.founders} influence={userStats.influence} isLoading={userStats.isLoading} />

      <View style={{ marginBottom: 8 }}>
        <TrendingArtistsRow artists={trendingArtists.artists} isLoading={trendingArtists.isLoading} />
      </View>

      <View style={{ marginBottom: 16, paddingHorizontal: 20 }}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 8 }}>
            {isFallback ? <TrendingUp size={14} color={colors.pink} /> : <Compass size={14} color={colors.purple} />}
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "Poppins_600SemiBold", textTransform: "uppercase", letterSpacing: 1.5 }}>
            {isFallback ? "Trending on Decibel" : "Discovery Feed"}
          </Text>
        </View>
        <Text style={{ color: colors.textDim, fontSize: 12, fontFamily: "Poppins_400Regular", marginTop: 2 }}>
          {isFallback ? "Top finds across the platform" : "See what fans are discovering"}
        </Text>
      </View>
    </>
  );

  const ListFooter = (
    <>
      {activityFeed.isFetchingNextPage && (
        <View style={{ paddingVertical: 16, alignItems: "center" }}>
          <ActivityIndicator color={colors.pink} />
        </View>
      )}
      <View style={{ height: 100 }} />
    </>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <FlatList<ActivityFeedItem>
        data={feedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 20, marginBottom: 12 }}>
            <ActivityFeedCard
              item={item}
              onCollect={handleCollect}
              isCollected={collectedIds.has(item.performer_id) || localCollected.has(item.performer_id)}
            />
          </View>
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          activityFeed.isLoading ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <ActivityIndicator color={colors.pink} />
            </View>
          ) : (
            <View style={{ paddingHorizontal: 20 }}>
              <ActivityFeedEmpty />
            </View>
          )
        }
        ListFooterComponent={ListFooter}
        onEndReached={handleLoadMoreFeed}
        onEndReachedThreshold={0.3}
      />
    </SafeAreaView>
  );
}
