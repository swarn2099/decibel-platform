import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Keyboard, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Search, X, Music, Link2, Star, CheckCircle } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useThemeColors } from "@/constants/colors";
import { useDecibelSearch } from "@/hooks/useSearch";
import { useValidateUrl, useFoundFromUrl } from "@/hooks/useAddFromUrl";
import { useCollectItem } from "@/hooks/useCollect";
import { SearchResultCard } from "@/components/search/SearchResultCard";

type Mode = "search" | "link";

export default function AddScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("search");
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const { data: results, isLoading } = useDecibelSearch(mode === "search" ? debouncedQuery : "");
  const validateMutation = useValidateUrl();
  const foundMutation = useFoundFromUrl();
  const collectMutation = useCollectItem();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Auto-detect music URLs from clipboard
  useEffect(() => {
    (async () => {
      try {
        const hasString = await Clipboard.hasStringAsync();
        if (!hasString) return;
        const text = await Clipboard.getStringAsync();
        if (!text) return;
        const lower = text.toLowerCase();
        const isMusicUrl = lower.includes("open.spotify.com") || lower.includes("music.apple.com") || lower.includes("soundcloud.com");
        if (isMusicUrl) {
          setLinkUrl(text);
          setMode("link");
        }
      } catch {}
    })();
  }, []);

  function handleSubmitLink() {
    if (!linkUrl.trim() || validateMutation.isPending) return;
    Keyboard.dismiss();
    validateMutation.mutate(linkUrl.trim());
  }

  async function handlePasteFromClipboard() {
    const text = await Clipboard.getStringAsync();
    if (text) {
      setLinkUrl(text);
      validateMutation.mutate(text.trim());
    }
  }

  function handleFound() {
    const preview = validateMutation.data?.preview;
    if (!preview) return;

    foundMutation.mutate({
      item_id: validateMutation.data?.existing_item_id ?? undefined,
      name: preview.name,
      photo_url: preview.photo_url,
      genres: preview.genres,
      category: preview.category,
      follower_count: preview.metrics.follower_count,
      monthly_listeners: preview.metrics.monthly_listeners,
      spotify_url: preview.spotify_url,
      spotify_id: preview.spotify_id,
      soundcloud_url: preview.soundcloud_url,
    }, {
      onSuccess: (res) => {
        const data = (res as any).data ?? res;
        const slug = data?.performer?.slug;
        Alert.alert(
          data?.is_founder ? "Founded!" : "Collected!",
          data?.is_founder ? `You're the first to find ${preview.name}!` : `${preview.name} added to your passport.`,
          [{ text: "View", onPress: () => { if (slug) router.push(`/artist/${slug}` as any); } }, { text: "OK" }]
        );
        setLinkUrl("");
        validateMutation.reset();
      },
    });
  }

  function handleCollect() {
    const existingId = validateMutation.data?.existing_item_id;
    if (!existingId) return;
    collectMutation.mutate({ itemId: existingId }, {
      onSuccess: () => {
        Alert.alert("Collected!", "Added to your passport.");
        setLinkUrl("");
        validateMutation.reset();
      },
    });
  }

  function handleReset() {
    setLinkUrl("");
    validateMutation.reset();
    foundMutation.reset();
  }

  const preview = validateMutation.data?.preview;
  const existingFounder = validateMutation.data?.existing_founder;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 28, fontFamily: "Poppins_700Bold", color: colors.text, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20 }}>
          Discover
        </Text>

        {/* Mode toggle */}
        <View style={{ flexDirection: "row", paddingHorizontal: 20, gap: 8, marginBottom: 12 }}>
          <Pressable onPress={() => setMode("search")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 20, backgroundColor: mode === "search" ? colors.pink : colors.card }}>
            <Search size={14} color={mode === "search" ? "#FFFFFF" : colors.textSecondary} />
            <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: mode === "search" ? "#FFFFFF" : colors.textSecondary }}>Search</Text>
          </Pressable>
          <Pressable onPress={() => setMode("link")} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8, borderRadius: 20, backgroundColor: mode === "link" ? colors.pink : colors.card }}>
            <Link2 size={14} color={mode === "link" ? "#FFFFFF" : colors.textSecondary} />
            <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: mode === "link" ? "#FFFFFF" : colors.textSecondary }}>Paste Link</Text>
          </Pressable>
        </View>

        {mode === "search" ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12 }}>
              <Search size={18} color={colors.textTertiary} />
              <TextInput value={query} onChangeText={setQuery} placeholder="Search artists..." placeholderTextColor={colors.textTertiary} autoCapitalize="none" autoCorrect={false} returnKeyType="search" style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, fontFamily: "Poppins_400Regular", color: colors.text }} />
              {query.length > 0 && <Pressable onPress={() => { setQuery(""); Keyboard.dismiss(); }} hitSlop={8}><X size={18} color={colors.textTertiary} /></Pressable>}
            </View>
            {isLoading && debouncedQuery.length >= 2 ? (
              <View style={{ paddingVertical: 32, alignItems: "center" }}><ActivityIndicator color={colors.pink} /></View>
            ) : results && results.length > 0 ? (
              <FlatList data={results} keyExtractor={(item) => item.id} renderItem={({ item }) => <SearchResultCard item={item} />} contentContainerStyle={{ paddingBottom: 100 }} />
            ) : debouncedQuery.length >= 2 ? (
              <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.textSecondary }}>No artists found</Text>
                <Pressable onPress={() => setMode("link")} style={{ marginTop: 12 }}>
                  <Text style={{ fontSize: 14, fontFamily: "Poppins_500Medium", color: colors.pink }}>Try pasting a link instead</Text>
                </Pressable>
              </View>
            ) : (
              <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 }}>
                <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.textSecondary }}>Search for artists</Text>
                <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textTertiary, textAlign: "center", marginTop: 4 }}>
                  Find emerging artists and be the first to discover them
                </Text>
              </View>
            )}
          </>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
            {/* Paste area */}
            {!validateMutation.isSuccess && (
              <>
                <Pressable onPress={handlePasteFromClipboard} disabled={validateMutation.isPending} style={{ borderWidth: 2, borderStyle: "dashed", borderRadius: 16, borderColor: colors.inputBorder, paddingVertical: 40, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                  {validateMutation.isPending ? (
                    <ActivityIndicator color={colors.pink} size="large" />
                  ) : (
                    <>
                      <Music size={32} color={colors.textTertiary} />
                      <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.textSecondary, textAlign: "center", marginTop: 12 }}>Tap to paste a link</Text>
                      <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textTertiary, textAlign: "center", marginTop: 4 }}>Spotify · Apple Music · SoundCloud</Text>
                    </>
                  )}
                </Pressable>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TextInput value={linkUrl} onChangeText={setLinkUrl} onSubmitEditing={handleSubmitLink} placeholder="or paste a link here..." placeholderTextColor={colors.textTertiary} autoCapitalize="none" autoCorrect={false} keyboardType="url" returnKeyType="go" style={{ flex: 1, backgroundColor: colors.inputBg, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.text }} />
                  {linkUrl.length > 0 && <Pressable onPress={handleReset} style={{ padding: 8 }}><X size={16} color={colors.textTertiary} /></Pressable>}
                </View>
              </>
            )}

            {/* Error */}
            {validateMutation.isError && (
              <View style={{ backgroundColor: `${colors.pink}22`, borderRadius: 10, padding: 14, marginTop: 12 }}>
                <Text style={{ fontSize: 13, fontFamily: "Poppins_500Medium", color: colors.pink }}>
                  {(validateMutation.error as Error)?.message ?? "Could not extract data from this URL. Try a different link."}
                </Text>
                <Pressable onPress={handleReset} style={{ marginTop: 8 }}>
                  <Text style={{ fontSize: 13, fontFamily: "Poppins_600SemiBold", color: colors.pink, textDecorationLine: "underline" }}>Try Again</Text>
                </Pressable>
              </View>
            )}

            {/* Preview card */}
            {preview && (
              <View style={{ marginTop: 16 }}>
                <View style={{ backgroundColor: colors.card, borderRadius: 16, overflow: "hidden" }}>
                  {preview.photo_url && (
                    <Image source={{ uri: preview.photo_url }} style={{ width: "100%", height: 200 }} contentFit="cover" />
                  )}
                  <View style={{ padding: 16 }}>
                    <Text style={{ fontSize: 20, fontFamily: "Poppins_700Bold", color: colors.text }}>{preview.name}</Text>
                    <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                      <View style={{ backgroundColor: colors.purple + "30", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 11, fontFamily: "Poppins_500Medium", color: colors.purple }}>{preview.category}</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>{preview.platform}</Text>
                    </View>
                    {preview.metrics.follower_count != null && preview.metrics.follower_count > 0 && (
                      <Text style={{ fontSize: 13, fontFamily: "Poppins_500Medium", color: colors.textSecondary, marginTop: 8 }}>
                        {preview.metrics.follower_count.toLocaleString()} fans
                      </Text>
                    )}

                    {existingFounder && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: `${colors.gold}15`, borderRadius: 8, padding: 8 }}>
                        <Star size={14} color={colors.gold} />
                        <Text style={{ fontSize: 12, fontFamily: "Poppins_500Medium", color: colors.gold }}>
                          Founded by {existingFounder.username}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {/* Action buttons */}
                <View style={{ marginTop: 16, gap: 10 }}>
                  {!existingFounder && !preview.is_above_threshold ? (
                    <Pressable onPress={handleFound} disabled={foundMutation.isPending} style={{ backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: foundMutation.isPending ? 0.6 : 1 }}>
                      <Text style={{ color: "#000000", fontSize: 16, fontFamily: "Poppins_700Bold" }}>★ Found This</Text>
                    </Pressable>
                  ) : existingFounder ? (
                    <Pressable onPress={handleCollect} disabled={collectMutation.isPending} style={{ backgroundColor: colors.pink, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: collectMutation.isPending ? 0.6 : 1 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins_600SemiBold" }}>Collect</Text>
                    </Pressable>
                  ) : (
                    <Pressable onPress={handleFound} disabled={foundMutation.isPending} style={{ backgroundColor: colors.pink, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: foundMutation.isPending ? 0.6 : 1 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins_600SemiBold" }}>Add to Passport</Text>
                    </Pressable>
                  )}

                  <Pressable onPress={handleReset} style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 }}>
                    <X size={14} color={colors.textTertiary} />
                    <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textTertiary }}>Try a different link</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
