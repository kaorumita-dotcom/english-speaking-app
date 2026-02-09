import { useCallback, useState } from "react";
import {
  Text,
  View,
  FlatList,
  Pressable,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { SpeakingResult } from "@/shared/types";
import { getHistory } from "@/lib/history-store";
import { getCEFRColor, getCEFRLabel } from "@/lib/cefr";

export default function HistoryScreen() {
  const router = useRouter();
  const colors = useColors();
  const [history, setHistory] = useState<SpeakingResult[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [])
  );

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: SpeakingResult }) => {
    const cefrColor = getCEFRColor(item.cefrLevel);
    return (
      <Pressable
        onPress={() => {
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
          router.push({
            pathname: "/result",
            params: { resultId: item.id },
          });
        }}
        style={({ pressed }) => [
          {
            backgroundColor: colors.surface,
            borderRadius: 14,
            padding: 16,
            marginBottom: 10,
            borderWidth: 1,
            borderColor: colors.border,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, marginRight: 12 }}>
            <Text
              style={{
                fontSize: 16,
                fontWeight: "600",
                color: colors.foreground,
                marginBottom: 4,
              }}
            >
              {item.topic}
            </Text>
            <Text
              style={{
                fontSize: 13,
                color: colors.muted,
              }}
            >
              {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <View
              style={{
                backgroundColor: cefrColor.bg,
                paddingHorizontal: 12,
                paddingVertical: 4,
                borderRadius: 8,
                marginBottom: 4,
              }}
            >
              <Text
                style={{
                  color: cefrColor.text,
                  fontWeight: "700",
                  fontSize: 15,
                }}
              >
                {item.cefrLevel}
              </Text>
            </View>
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.primary,
              }}
            >
              {item.wpm} 語/分
            </Text>
          </View>
        </View>

        {/* Preview of feedback */}
        {item.goodPoints && item.goodPoints.length > 0 && (
          <Text
            style={{
              fontSize: 13,
              color: colors.muted,
              marginTop: 8,
              lineHeight: 18,
            }}
            numberOfLines={2}
          >
            {item.goodPoints[0]}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      {/* Header */}
      <View className="mb-4">
        <Text className="text-3xl font-bold text-foreground">練習履歴</Text>
        <Text className="text-base text-muted mt-1">
          これまでのスピーキング練習の記録
        </Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted">読み込み中...</Text>
        </View>
      ) : history.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontSize: 48, marginBottom: 16 }}>🎙️</Text>
          <Text className="text-lg font-semibold text-foreground mb-2">
            まだ記録がありません
          </Text>
          <Text className="text-base text-muted text-center">
            最初のスピーキング練習を{"\n"}完了すると、ここに表示されます
          </Text>
        </View>
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}
