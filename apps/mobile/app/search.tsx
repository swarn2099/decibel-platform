import { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { ChevronLeft, Search as SearchIcon, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import { useDecibelSearch, useUserSearch } from "@/hooks/useSearch";
import { SearchResultCard } from "@/components/search/SearchResultCard";

export default function SearchScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tab, setTab] = useState<"artists" | "users">("artists");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: artistResults, isLoading: artistsLoading } = useDecibelSearch(tab === "artists" ? debouncedQuery : "");
  const { data: userResults, isLoading: usersLoading } = useUserSearch(tab === "users" ? debouncedQuery : "");
  const isLoading = tab === "artists" ? artistsLoading : usersLoading;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 8 }}>
        <Pressable onPress={() => router.back()} style={{ width: 40, height: 40, justifyContent: "center", alignItems: "center" }}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12, marginRight: 8 }}>
          <SearchIcon size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search artists or users..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8, fontSize: 15, fontFamily: "Poppins_400Regular", color: colors.text }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); Keyboard.dismiss(); }}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 8 }}>
        <Pressable onPress={() => setTab("artists")} style={{ flex: 1, paddingVertical: 6, borderRadius: 16, alignItems: "center", backgroundColor: tab === "artists" ? colors.pink : colors.card }}>
          <Text style={{ fontSize: 12, fontFamily: "Poppins_600SemiBold", color: tab === "artists" ? "#FFFFFF" : colors.textSecondary }}>Artists</Text>
        </Pressable>
        <Pressable onPress={() => setTab("users")} style={{ flex: 1, paddingVertical: 6, borderRadius: 16, alignItems: "center", backgroundColor: tab === "users" ? colors.pink : colors.card }}>
          <Text style={{ fontSize: 12, fontFamily: "Poppins_600SemiBold", color: tab === "users" ? "#FFFFFF" : colors.textSecondary }}>Users</Text>
        </Pressable>
      </View>

      {isLoading && debouncedQuery.length >= 2 ? (
        <View style={{ paddingVertical: 32, alignItems: "center" }}><ActivityIndicator color={colors.pink} /></View>
      ) : tab === "artists" && artistResults && artistResults.length > 0 ? (
        <FlatList data={artistResults} keyExtractor={(item) => item.id} renderItem={({ item }) => <SearchResultCard item={item} />} contentContainerStyle={{ paddingBottom: 100 }} />
      ) : tab === "users" && userResults && userResults.length > 0 ? (
        <FlatList
          data={userResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => router.push(`/profile/${item.id}` as any)} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingHorizontal: 20 }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.card, overflow: "hidden", alignItems: "center", justifyContent: "center" }}>
                {item.avatar_url ? <Image source={{ uri: item.avatar_url }} style={{ width: 40, height: 40 }} contentFit="cover" /> : <Text style={{ fontSize: 16, fontFamily: "Poppins_600SemiBold", color: colors.textSecondary }}>{(item.name ?? "?").charAt(0).toUpperCase()}</Text>}
              </View>
              <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.text }}>{item.name ?? item.email}</Text>
            </Pressable>
          )}
          contentContainerStyle={{ paddingBottom: 100 }}
        />
      ) : debouncedQuery.length >= 2 ? (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.textSecondary }}>No results found</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}
