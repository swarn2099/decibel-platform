import { useMemo } from "react";
import { View, ScrollView, Pressable, Text, Dimensions, ActivityIndicator } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import { WebView } from "react-native-webview";
import Svg, { Polyline, Line, Text as SvgText } from "react-native-svg";
import { ChevronLeft, Users, Crown, ExternalLink, Star, CheckCircle, Instagram } from "lucide-react-native";
import { Colors, useThemeColors } from "@/constants/colors";
import { useArtistProfile, useArtistFanCount, useArtistFounder, useMyArtistStatus, useArtistMetricsHistory } from "@/hooks/useArtistProfile";
import { useCollectItem, useUncollectItem } from "@/hooks/useCollect";
import { formatDate } from "@/lib/formatDate";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
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
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Simple SVG line chart for monthly listeners */
function ListenersChart({ data, colors }: { data: { date: string; listeners: number }[]; colors: ReturnType<typeof useThemeColors> }) {
  if (data.length < 2) return null;

  const W = SCREEN_WIDTH - 40;
  const H = 140;
  const PAD_L = 45;
  const PAD_R = 10;
  const PAD_T = 10;
  const PAD_B = 25;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const vals = data.map((d) => d.listeners);
  const minV = Math.min(...vals);
  const maxV = Math.max(...vals);
  const range = maxV - minV || 1;

  const points = data.map((d, i) => {
    const x = PAD_L + (i / (data.length - 1)) * chartW;
    const y = PAD_T + chartH - ((d.listeners - minV) / range) * chartH;
    return `${x},${y}`;
  }).join(" ");

  // Y-axis labels
  const yLabels = [minV, minV + range / 2, maxV].map((v) => ({
    label: formatListeners(v),
    y: PAD_T + chartH - ((v - minV) / range) * chartH,
  }));

  // X-axis labels (first and last)
  const xLabels = [
    { label: data[0].date.slice(5), x: PAD_L },
    { label: data[data.length - 1].date.slice(5), x: PAD_L + chartW },
  ];

  const isPositive = vals[vals.length - 1] >= vals[0];
  const lineColor = isPositive ? "#00D4AA" : "#FF4D6A";

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8 }}>Monthly Listeners</Text>
      <View style={{ backgroundColor: colors.card, borderRadius: 12, padding: 12 }}>
        <Svg width={W} height={H}>
          {/* Grid lines */}
          {yLabels.map((yl, i) => (
            <Line key={i} x1={PAD_L} y1={yl.y} x2={PAD_L + chartW} y2={yl.y} stroke={colors.isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"} strokeWidth={1} />
          ))}
          {/* Y labels */}
          {yLabels.map((yl, i) => (
            <SvgText key={`yl${i}`} x={PAD_L - 6} y={yl.y + 4} fill={colors.textSecondary} fontSize={9} fontFamily="Poppins_400Regular" textAnchor="end">{yl.label}</SvgText>
          ))}
          {/* X labels */}
          {xLabels.map((xl, i) => (
            <SvgText key={`xl${i}`} x={xl.x} y={H - 4} fill={colors.textSecondary} fontSize={9} fontFamily="Poppins_400Regular" textAnchor={i === 0 ? "start" : "end"}>{xl.label}</SvgText>
          ))}
          {/* Line */}
          <Polyline points={points} fill="none" stroke={lineColor} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </Svg>
      </View>
    </View>
  );
}

/** Spotify embed WebView */
function SpotifyEmbed({ spotifyId }: { spotifyId: string }) {
  const colors = useThemeColors();
  const embedUrl = `https://open.spotify.com/embed/artist/${spotifyId}?utm_source=generator&theme=0`;

  return (
    <View style={{ marginTop: 16 }}>
      <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 8 }}>Top Tracks</Text>
      <View style={{ borderRadius: 12, overflow: "hidden", height: 352 }}>
        <WebView
          source={{ uri: embedUrl }}
          style={{ flex: 1, backgroundColor: "transparent" }}
          scrollEnabled={false}
          javaScriptEnabled
          allowsInlineMediaPlayback
        />
      </View>
    </View>
  );
}

export default function ArtistProfileScreen() {
  const colors = useThemeColors();
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();

  const { data: artist, isLoading, isError, refetch } = useArtistProfile(slug ?? "");
  const { data: fanCount } = useArtistFanCount(artist?.id);
  const { data: founder } = useArtistFounder(artist?.id);
  const { data: myStatus } = useMyArtistStatus(artist?.id);
  const { data: metricsHistory } = useArtistMetricsHistory(artist?.id);
  const collectMutation = useCollectItem();
  const uncollectMutation = useUncollectItem();

  const socialLinks = useMemo(() => {
    if (!artist) return [];
    const links: { url: string; label: string; type: "listen" | "social" }[] = [];

    // Listen platforms
    const listenCandidates = [artist.spotify_url, artist.soundcloud_url, artist.mixcloud_url].filter(Boolean) as string[];
    for (const rawUrl of listenCandidates) {
      try {
        const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
        new URL(url);
        const host = new URL(url).hostname.toLowerCase();
        let label = "Listen";
        if (host.includes("spotify")) label = "Spotify";
        else if (host.includes("soundcloud")) label = "SoundCloud";
        else if (host.includes("mixcloud")) label = "Mixcloud";
        links.push({ url, label, type: "listen" });
      } catch {}
    }

    // Instagram
    if (artist.instagram_handle) {
      const handle = artist.instagram_handle;
      const url = handle.startsWith("http") ? handle : `https://www.instagram.com/${handle}`;
      links.push({ url, label: "Instagram", type: "social" });
    }

    // RA
    if (artist.ra_url) {
      const url = artist.ra_url.startsWith("http") ? artist.ra_url : `https://${artist.ra_url}`;
      links.push({ url, label: "Resident Advisor", type: "social" });
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
        {/* Hero — image with NO gradient overlay, just the image */}
        <View style={{ height: HERO_HEIGHT, overflow: "hidden" }}>
          {artist.photo_url ? (
            <Image source={{ uri: artist.photo_url }} style={{ width: "100%", height: HERO_HEIGHT }} contentFit="cover" />
          ) : (
            <LinearGradient colors={gradientColors} style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Text style={{ fontSize: 72, fontFamily: "Poppins_700Bold", color: "rgba(255,255,255,0.3)" }}>{artist.name.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 16 }}>
          {/* Name */}
          <Text style={{ fontSize: 28, fontFamily: "Poppins_700Bold", color: colors.text }}>{artist.name}</Text>

          {/* Stats row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 16, marginTop: 8 }}>
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
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {artist.genres.map((g) => (
                <View key={g} style={{ backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>{g}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action button */}
          <View style={{ marginTop: 16 }}>
            {myStatus === "founded" ? (
              <View style={{ backgroundColor: `${colors.gold}20`, borderRadius: 12, paddingVertical: 12, alignItems: "center" }}>
                <Text style={{ color: colors.gold, fontSize: 15, fontFamily: "Poppins_600SemiBold" }}>★ Founded by you</Text>
              </View>
            ) : myStatus === "collected" ? (
              <Pressable
                onPress={() => { if (artist?.id) uncollectMutation.mutate({ itemId: artist.id }); }}
                disabled={uncollectMutation.isPending}
                style={{ backgroundColor: colors.card, borderRadius: 12, paddingVertical: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, opacity: uncollectMutation.isPending ? 0.6 : 1 }}
              >
                <CheckCircle size={18} color={colors.teal} />
                <Text style={{ color: colors.teal, fontSize: 15, fontFamily: "Poppins_600SemiBold" }}>Collected</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => { if (artist?.id) collectMutation.mutate({ itemId: artist.id }); }}
                disabled={collectMutation.isPending}
                style={{ backgroundColor: colors.pink, borderRadius: 12, paddingVertical: 12, alignItems: "center", opacity: collectMutation.isPending ? 0.6 : 1 }}
              >
                <Text style={{ color: "#FFFFFF", fontSize: 15, fontFamily: "Poppins_600SemiBold" }}>Collect</Text>
              </Pressable>
            )}
          </View>

          {/* Founder profile card */}
          {founder && (
            <Pressable
              onPress={() => router.push(`/profile/${founder.user_id}` as any)}
              style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, marginTop: 16, flexDirection: "row", alignItems: "center", gap: 12 }}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, overflow: "hidden", backgroundColor: colors.bg }}>
                {founder.avatar_url ? (
                  <Image source={{ uri: founder.avatar_url }} style={{ width: 44, height: 44 }} contentFit="cover" />
                ) : (
                  <LinearGradient colors={["#FFD700", "#FF4D6A"]} style={{ width: 44, height: 44, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ fontSize: 18, fontFamily: "Poppins_700Bold", color: "rgba(255,255,255,0.8)" }}>{(founder.name ?? "?").charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Crown size={14} color={colors.gold} />
                  <Text style={{ fontSize: 14, fontFamily: "Poppins_600SemiBold", color: colors.text }}>{founder.name ?? "Unknown"}</Text>
                </View>
                <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary, marginTop: 1 }}>
                  Added {formatShortDate(founder.awarded_at)}{founder.total_founds ? ` · ${founder.total_founds} finds` : ""}
                </Text>
              </View>
              <View style={{ backgroundColor: `${colors.gold}20`, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, fontFamily: "Poppins_600SemiBold", color: colors.gold }}>Founder</Text>
              </View>
            </Pressable>
          )}

          {/* Bio */}
          {artist.bio && (
            <Text style={{ fontSize: 14, fontFamily: "Poppins_400Regular", color: colors.textSecondary, marginTop: 16, lineHeight: 22 }}>{artist.bio}</Text>
          )}

          {/* Spotify embed */}
          {artist.spotify_id && (
            <SpotifyEmbed spotifyId={artist.spotify_id} />
          )}

          {/* Metrics chart */}
          {metricsHistory && metricsHistory.length >= 2 && (
            <ListenersChart data={metricsHistory} colors={colors} />
          )}

          {/* Social & listen links */}
          {socialLinks.length > 0 && (
            <View style={{ marginTop: 16, gap: 8 }}>
              <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.text, marginBottom: 4 }}>Links</Text>
              {socialLinks.map((link) => (
                <Pressable key={link.url} onPress={() => Linking.openURL(link.url)} style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.card, borderRadius: 12, padding: 12 }}>
                  {link.label === "Instagram" ? <Instagram size={16} color={colors.textSecondary} /> : <ExternalLink size={16} color={colors.textSecondary} />}
                  <Text style={{ fontSize: 14, fontFamily: "Poppins_500Medium", color: colors.text }}>{link.label}</Text>
                </Pressable>
              ))}
            </View>
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
}
