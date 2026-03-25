import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator, Keyboard, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { X, Music, Star } from "lucide-react-native";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { useShareIntentContext } from "expo-share-intent";
import { useThemeColors } from "@/constants/colors";
import { useValidateUrl, useFoundFromUrl } from "@/hooks/useAddFromUrl";
import { useCollectItem } from "@/hooks/useCollect";

export default function AddScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [linkUrl, setLinkUrl] = useState("");

  const validateMutation = useValidateUrl();
  const foundMutation = useFoundFromUrl();
  const collectMutation = useCollectItem();

  // Handle shared URLs from iOS share sheet
  let shareIntent: any = null;
  try { shareIntent = useShareIntentContext(); } catch {}

  useEffect(() => {
    const sharedUrl = shareIntent?.shareIntent?.webUrl ?? shareIntent?.shareIntent?.text;
    if (sharedUrl && typeof sharedUrl === "string" && sharedUrl.startsWith("http")) {
      setLinkUrl(sharedUrl);
      validateMutation.mutate(sharedUrl);
    }
  }, [shareIntent?.shareIntent]);

  // Auto-detect URLs from clipboard
  useEffect(() => {
    (async () => {
      try {
        const hasString = await Clipboard.hasStringAsync();
        if (!hasString) return;
        const text = await Clipboard.getStringAsync();
        if (!text) return;
        const lower = text.toLowerCase();
        const isUrl = lower.includes("open.spotify.com") || lower.includes("music.apple.com") || lower.includes("soundcloud.com") || lower.includes("instagram.com") || lower.includes("tiktok.com");
        if (isUrl) {
          setLinkUrl(text);
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
      instagram_handle: (preview as any).instagram_handle,
    }, {
      onSuccess: (res) => {
        const data = (res as any).data ?? res;
        // New items return the item with slug; existing items return the badge
        const slug = data?.slug ?? data?.performer?.slug;
        const isNew = !validateMutation.data?.existing_item_id;
        Alert.alert(
          isNew ? "Founded!" : "Founded!",
          isNew ? `You're the first to find ${preview.name}!` : `You founded ${preview.name}!`,
          [
            ...(slug ? [{ text: "View", onPress: () => router.push(`/artist/${slug}` as any) }] : []),
            { text: "OK" },
          ]
        );
        setLinkUrl("");
        validateMutation.reset();
      },
      onError: (error: Error) => {
        if (error.message?.includes("409") || error.message?.includes("already")) {
          Alert.alert("Already Founded", "This artist has already been founded by someone.");
        } else {
          Alert.alert("Error", error.message ?? "Something went wrong");
        }
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
        <Text style={{ fontSize: 28, fontFamily: "Poppins_700Bold", color: colors.text, paddingTop: 16, paddingBottom: 16 }}>
          Add a Find
        </Text>

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
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textTertiary, textAlign: "center", marginTop: 4 }}>Spotify · Apple Music · Instagram · TikTok · any link</Text>
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
              {preview.photo_url ? (
                <Image source={{ uri: preview.photo_url }} style={{ width: "100%", height: 200 }} contentFit="cover" />
              ) : (
                <View style={{ width: "100%", height: 160, backgroundColor: colors.purple + "15", justifyContent: "center", alignItems: "center" }}>
                  <Text style={{ fontSize: 48, fontFamily: "Poppins_700Bold", color: colors.purple + "40" }}>{preview.name.charAt(0).toUpperCase()}</Text>
                </View>
              )}
              <View style={{ padding: 16 }}>
                <Text style={{ fontSize: 20, fontFamily: "Poppins_700Bold", color: colors.text }}>{preview.name}</Text>
                <View style={{ flexDirection: "row", gap: 8, marginTop: 6 }}>
                  <View style={{ backgroundColor: colors.purple + "30", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 11, fontFamily: "Poppins_500Medium", color: colors.purple }}>{preview.category}</Text>
                  </View>
                  <Text style={{ fontSize: 12, fontFamily: "Poppins_400Regular", color: colors.textSecondary }}>{preview.platform}</Text>
                </View>
                {(preview.metrics.monthly_listeners ?? preview.metrics.follower_count) != null && (preview.metrics.monthly_listeners ?? preview.metrics.follower_count)! > 0 && (
                  <Text style={{ fontSize: 13, fontFamily: "Poppins_500Medium", color: colors.textSecondary, marginTop: 8 }}>
                    {(preview.metrics.monthly_listeners ?? preview.metrics.follower_count)!.toLocaleString()} {preview.metrics.monthly_listeners ? "followers" : "fans"}
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
              {existingFounder ? (
                <Pressable onPress={handleCollect} disabled={collectMutation.isPending} style={{ backgroundColor: colors.pink, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: collectMutation.isPending ? 0.6 : 1 }}>
                  <Text style={{ color: "#FFFFFF", fontSize: 16, fontFamily: "Poppins_600SemiBold" }}>Collect</Text>
                </Pressable>
              ) : preview.is_above_threshold ? (
                <View style={{ backgroundColor: colors.card, borderRadius: 12, paddingVertical: 16, paddingHorizontal: 20, alignItems: "center", gap: 4 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 15, fontFamily: "Poppins_600SemiBold" }}>Too mainstream</Text>
                  <Text style={{ color: colors.textTertiary, fontSize: 12, fontFamily: "Poppins_400Regular", textAlign: "center" }}>
                    Decibel is for discovering underground finds before they blow up
                  </Text>
                </View>
              ) : (
                <Pressable onPress={handleFound} disabled={foundMutation.isPending} style={{ backgroundColor: colors.gold, borderRadius: 12, paddingVertical: 14, alignItems: "center", opacity: foundMutation.isPending ? 0.6 : 1 }}>
                  <Text style={{ color: "#000000", fontSize: 16, fontFamily: "Poppins_700Bold" }}>★ Found This</Text>
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
    </SafeAreaView>
  );
}
