import { useState, useEffect, useCallback } from "react";
import { View, Text, TextInput, Pressable, FlatList, ActivityIndicator, Keyboard } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";
import { useRouter } from "expo-router";
import { useThemeColors } from "@/constants/colors";
import { useDecibelSearch } from "@/hooks/useSearch";
import { SearchResultCard } from "@/components/search/SearchResultCard";

export default function AddScreen() {
  const colors = useThemeColors();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data: results, isLoading } = useDecibelSearch(debouncedQuery);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={["top"]}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 28, fontFamily: "Poppins_700Bold", color: colors.text, paddingTop: 16, paddingBottom: 12, paddingHorizontal: 20 }}>
          Discover
        </Text>

        {/* Search bar */}
        <View style={{ flexDirection: "row", alignItems: "center", marginHorizontal: 20, marginBottom: 16, backgroundColor: colors.inputBg, borderRadius: 12, borderWidth: 1, borderColor: colors.inputBorder, paddingHorizontal: 12 }}>
          <Search size={18} color={colors.textTertiary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search artists..."
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            style={{ flex: 1, paddingVertical: 12, paddingHorizontal: 8, fontSize: 15, fontFamily: "Poppins_400Regular", color: colors.text }}
          />
          {query.length > 0 && (
            <Pressable onPress={() => { setQuery(""); Keyboard.dismiss(); }} hitSlop={8}>
              <X size={18} color={colors.textTertiary} />
            </Pressable>
          )}
        </View>

        {/* Results */}
        {isLoading && debouncedQuery.length >= 2 ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <ActivityIndicator color={colors.pink} />
          </View>
        ) : results && results.length > 0 ? (
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <SearchResultCard item={item} />}
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        ) : debouncedQuery.length >= 2 ? (
          <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.textSecondary }}>No artists found</Text>
            <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textTertiary, textAlign: "center", marginTop: 4 }}>
              Try a different search or add a new artist by pasting a link
            </Text>
          </View>
        ) : (
          <View style={{ alignItems: "center", paddingVertical: 40, paddingHorizontal: 20 }}>
            <Text style={{ fontSize: 15, fontFamily: "Poppins_500Medium", color: colors.textSecondary }}>Search for artists</Text>
            <Text style={{ fontSize: 13, fontFamily: "Poppins_400Regular", color: colors.textTertiary, textAlign: "center", marginTop: 4 }}>
              Find emerging artists and be the first to discover them
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
