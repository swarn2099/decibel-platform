import { View, Text, ScrollView, Pressable } from "react-native";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import type { TrendingArtist } from "@/hooks/useTrendingArtists";

function ArtistCircle({ artist }: { artist: TrendingArtist }) {
  const colors = useThemeColors();
  const router = useRouter();
  const initials = artist.name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Pressable onPress={() => router.push(`/artist/${artist.slug}` as any)} style={{ alignItems: "center", gap: 4, width: 64 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
        {artist.photo_url ? (
          <Image source={{ uri: artist.photo_url }} style={{ width: 56, height: 56 }} contentFit="cover" />
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 18, fontFamily: "Poppins_600SemiBold" }}>{initials}</Text>
        )}
      </View>
      <Text style={{ color: colors.textPrimary, fontSize: 11, fontFamily: "Poppins_500Medium", textAlign: "center", maxWidth: 64 }} numberOfLines={1}>
        {artist.name}
      </Text>
      <Text style={{ color: colors.textTertiary, fontSize: 10, fontFamily: "Poppins_400Regular" }}>
        {artist.collector_count} {artist.collector_count === 1 ? "fan" : "fans"}
      </Text>
    </Pressable>
  );
}

function PlaceholderCircle() {
  const colors = useThemeColors();
  return (
    <View style={{ alignItems: "center", gap: 4, width: 64 }}>
      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.cardBorder }} />
      <View style={{ width: 48, height: 10, borderRadius: 4, backgroundColor: colors.card }} />
    </View>
  );
}

export function TrendingArtistsRow({ artists, isLoading }: { artists: TrendingArtist[]; isLoading: boolean }) {
  const colors = useThemeColors();

  if (!isLoading && artists.length === 0) return null;

  return (
    <View style={{ paddingBottom: 8 }}>
      <View style={{ paddingHorizontal: 20, marginBottom: 12, flexDirection: "row", alignItems: "center" }}>
        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "Poppins_600SemiBold", textTransform: "uppercase", letterSpacing: 1.5 }}>
          Trending
        </Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16 }}>
        {isLoading
          ? Array.from({ length: 5 }).map((_, i) => <PlaceholderCircle key={i} />)
          : [...artists].sort((a, b) => b.collector_count - a.collector_count).map((artist) => (
              <ArtistCircle key={artist.id} artist={artist} />
            ))}
      </ScrollView>
    </View>
  );
}
