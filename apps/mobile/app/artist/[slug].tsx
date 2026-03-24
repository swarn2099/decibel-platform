import { useMemo } from "react";
import { View, ScrollView, Pressable, Text, Dimensions, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { ChevronLeft, Users, Crown, ExternalLink } from "lucide-react-native";
import { Colors, useThemeColors } from "@/constants/colors";
import { useArtistProfile, useArtistFanCount, useArtistFounder, useMyArtistStatus } from "@/hooks/useArtistProfile";
import { useCollectItem } from "@/hooks/useCollect";
import { formatDate } from "@/lib/formatDate";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.4;

const GRADIENT_PAIRS = [
  [Colors.pink, Colors.purple],
  [Colors.purple, Colors.blue],
  [Colors.blue, Colors.teal],
  [Colors.teal, Colors.pink],
  [Colors.yellow, Colors.pink],
];

function getGradientForName(name: string): [string, string] {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GRADIENT_PAIRS[Math.abs(hash) % GRADIENT_PAIRS.length] as [string, string];
}

function formatListeners(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function ArtistProfileScreen() {
  const colors = useThemeColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const { data: artist, isLoading, isError, refetch } = useArtistProfile(slug ?? "");
  const { data: fanCount } = useArtistFanCount(artist?.id);
  const { data: founder } = useArtistFounder(artist?.id);
  const { data: myStatus } = useMyArtistStatus(artist?.id);
  const collectMutation = useCollectItem();

  const listenLinks = useMemo(() => {
    if (!artist) return [];
    const links: { url: string; label: string }[] = [];
    const candidates = [artist.spotify_url, artist.soundcloud_url, artist.mixcloud_url].filter(Boolean) as string[];
    for (const rawUrl of candidates) {
      try {
        const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
        new URL(url);
        const host = new URL(url).hostname.toLowerCase();
        let label = "Listen";
        if (host.includes("spotify")) label = "Spotify";
        else if (host.includes("soundcloud")) label = "SoundCloud";
        else if (host.includes("mixcloud")) label = "Mixcloud";
        links.push({ url, label });
      } catch {}
    }
    return links;
  }, [artist]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="light" />
        <ActivityIndicator color={colors.pink} />
      </View>
    );
  }

  if (!artist || isError) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center" }}>
        <StatusBar style="light" />
        <Pressable onPress={() => router.back()} style={{ position: "absolute", top: 54, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
          <ChevronLeft size={24} color="#FFFFFF" />
        </Pressable>
        <Text style={{ color: colors.textSecondary, fontSize: 15, fontFamily: "Poppins_500Medium" }}>Artist not found</Text>
        <Pressable onPress={() => refetch()} style={{ marginTop: 12, backgroundColor: colors.pink, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 }}>
          <Text style={{ color: "#FFFFFF", fontFamily: "Poppins_600SemiBold" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  const gradientColors = getGradientForName(artist.name);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <StatusBar style="light" />
      <Pressable onPress={() => router.back()} style={{ position: "absolute", top: 54, left: 16, zIndex: 10, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" }}>
        <ChevronLeft size={24} color="#FFFFFF" />
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={{ height: HERO_HEIGHT, overflow: "hidden" }}>
          {artist.photo_url ? (
            <>
              <Image source={{ uri: artist.photo_url }} style={{ width: "100%", height: HERO_HEIGHT }} contentFit="cover" />
              <LinearGradient colors={["transparent", colors.bg]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: HERO_HEIGHT * 0.5 }} />
            </>
          ) : (
            <LinearGradient colors={gradientColors} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 72, fontFamily: "Poppins_700Bold", color: "rgba(255,255,255,0.3)" }}>{artist.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, marginTop: -40 }}>
          <Text style={{ fontSize: 28, fontFamily: "Poppins_700Bold", color: "#FFFFFF" }}>{artist.name}</Text>
          {artist.city && <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: colors.textSecondary, marginTop: 2 }}>{artist.city}</Text>}

          {/* Stats row */}
          <View style={{ flexDirection: "row", gap: 16, marginTop: 12 }}>
            {artist.monthly_listeners != null && artist.monthly_listeners > 0 && (
              <Text style={{ fontSize: 13, fontFamily: "Poppins_500Medium", color: colors.textSecondary }}>
                {formatListeners(artist.monthly_listeners)} listeners
              </Text>
            )}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Users size={14} color={colors.textSecondary} />
              <Text style={{ fontSize: 13, fontFamily: "Poppins_500Medium", color: colors.textSecondary }}>{fanCount ?? 0} fans</Text>
            </View>
          </View>

          {/* Genres */}
          {artist.genres && artist.genres.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12 }}>
              {artist.genres.map((g) => (
                <View key={g} style={{ backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Founder badge */}
          {founder && (
            <View style={{ backgroundColor: `${colors.gold}15`, borderRadius: 12, padding: 14, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Crown size={20} color={colors.gold} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.gold }}>
                  Founded by {founder.name ?? "Unknown"}
                </Text>
                <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textTertiary }}>
                  {formatDate(founder.awarded_at)}
                </Text>
              </View>
            </View>
          )}

          {/* Bio */}
          {artist.bio && (
            <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: colors.textSecondary, marginTop: 16, lineHeight: 22 }}>{artist.bio}</Text>
          )}

          {/* Listen links */}
          {listenLinks.length > 0 && (
            <View style={{ marginTop: 16, gap: 8 }}>
              {listenLinks.map((link) => (
                <Pressable key={link.url} onPress={() => Linking.openURL(link.url)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 12 }}>
                  <ExternalLink size={16} color={colors.textSecondary} />
                  <Text style={{ fontSize: 14, fontFamily: "Poppins_500Medium", color: colors.text }}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* Action button */}
          <View style={{ marginTop: 20, marginBottom: 40 }}>
            {myStatus === "founded" ? (
              <View style={{ backgroundColor: `${colors.gold}20`, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ color: colors.gold, fontSize: 16, fontFamily: "Poppins_600SemiBold" }}>★ Founded by you</Text>
              </View>
            ) : myStatus === "collected" ? (
              <View style={{ backgroundColor: colors.card, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ color: colors.textSecondary, fontSize: 16, fontFamily: "Poppins_500Medium" }}>In your passport</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => { if (artist?.id) collectMutation.mutate({ itemId: artist.id }); }}
                disabled={collectMutation.isPending}
                style={{ backgroundColor: colors.pink, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: collectMutation.isPending ? 0.6 : 1 }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins_600SemiBold" }}>Collect</Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
