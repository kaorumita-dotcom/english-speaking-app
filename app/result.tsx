import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { SpeakingResult } from "@/shared/types";
import { getHistory } from "@/lib/history-store";
import { getCEFRColor, getCEFRLabel } from "@/lib/cefr";

export default function ResultScreen() {
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{ resultId: string }>();
  const [result, setResult] = useState<SpeakingResult | null>(null);

  useEffect(() => {
    loadResult();
  }, [params.resultId]);

  const loadResult = async () => {
    if (!params.resultId) return;
    const history = await getHistory();
    const found = history.find((h) => h.id === params.resultId);
    if (found) setResult(found);
  };

  const handleTryAgain = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.replace("/");
  };

  const handleGoHome = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.replace("/");
  };

  if (!result) {
    return (
      <ScreenContainer
        edges={["top", "bottom", "left", "right"]}
        className="flex-1 items-center justify-center"
      >
        <Text className="text-muted">読み込み中...</Text>
      </ScreenContainer>
    );
  }

  const cefrColor = getCEFRColor(result.cefrLevel);
  const cefrLabel = getCEFRLabel(result.cefrLevel);

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      className="flex-1"
    >
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-6">
          <Text className="text-2xl font-bold text-foreground">
            あなたの結果
          </Text>
          <Text className="text-sm text-muted mt-1">{result.topic}</Text>
        </View>

        {/* WPM & CEFR Score Card */}
        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: 20,
            padding: 24,
            marginBottom: 16,
            borderWidth: 1,
            borderColor: colors.border,
          }}
        >
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-around",
              alignItems: "center",
            }}
          >
            {/* WPM */}
            <View style={{ alignItems: "center" }}>
              <Text
                style={{
                  fontSize: 48,
                  fontWeight: "800",
                  color: colors.primary,
                }}
              >
                {result.wpm}
              </Text>
              <Text className="text-sm font-medium text-muted">
                語 / 分
              </Text>
            </View>

            {/* Divider */}
            <View
              style={{
                width: 1,
                height: 60,
                backgroundColor: colors.border,
              }}
            />

            {/* CEFR */}
            <View style={{ alignItems: "center" }}>
              <View
                style={{
                  backgroundColor: cefrColor.bg,
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                  borderRadius: 12,
                  marginBottom: 4,
                }}
              >
                <Text
                  style={{
                    fontSize: 32,
                    fontWeight: "800",
                    color: cefrColor.text,
                  }}
                >
                  {result.cefrLevel}
                </Text>
              </View>
              <Text className="text-sm font-medium text-muted">
                {cefrLabel}
              </Text>
            </View>
          </View>

          {/* Stats row */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              marginTop: 16,
              gap: 24,
            }}
          >
            <Text className="text-sm text-muted">
              {result.wordCount} 語
            </Text>
            <Text className="text-sm text-muted">
              {result.durationSeconds}秒間
            </Text>
          </View>

          {result.cefrExplanation ? (
            <Text className="text-sm text-muted text-center mt-3">
              {result.cefrExplanation}
            </Text>
          ) : null}
        </View>

        {/* Good Points */}
        {result.goodPoints && result.goodPoints.length > 0 && (
          <View
            style={{
              backgroundColor: "#ECFDF5",
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#A7F3D0",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>✨</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#065F46",
                }}
              >
                良かった点
              </Text>
            </View>
            {result.goodPoints.map((point, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  marginBottom: i < result.goodPoints.length - 1 ? 8 : 0,
                }}
              >
                <Text style={{ color: "#10B981", marginRight: 8, fontSize: 14 }}>
                  •
                </Text>
                <Text
                  style={{
                    color: "#065F46",
                    fontSize: 14,
                    lineHeight: 22,
                    flex: 1,
                  }}
                >
                  {point}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Grammar Notes */}
        {result.grammarNotes && result.grammarNotes.length > 0 && (
          <View
            style={{
              backgroundColor: "#FFFBEB",
              borderRadius: 16,
              padding: 20,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: "#FDE68A",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>📝</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#92400E",
                }}
              >
                文法の注意点
              </Text>
            </View>
            {result.grammarNotes.map((note, i) => (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  marginBottom: i < result.grammarNotes.length - 1 ? 8 : 0,
                }}
              >
                <Text style={{ color: "#F59E0B", marginRight: 8, fontSize: 14 }}>
                  •
                </Text>
                <Text
                  style={{
                    color: "#92400E",
                    fontSize: 14,
                    lineHeight: 22,
                    flex: 1,
                  }}
                >
                  {note}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Encouragement */}
        {result.encouragement && (
          <View
            style={{
              backgroundColor: "#EFF6FF",
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: "#BFDBFE",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
              <Text style={{ fontSize: 20, marginRight: 8 }}>💪</Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  color: "#1E40AF",
                }}
              >
                まとめ・応援メッセージ
              </Text>
            </View>
            <Text
              style={{
                color: "#1E40AF",
                fontSize: 15,
                lineHeight: 24,
              }}
            >
              {result.encouragement}
            </Text>
          </View>
        )}

        {/* Transcribed Text */}
        {result.transcribedText && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: 16,
              padding: 20,
              marginBottom: 24,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: colors.muted,
                marginBottom: 8,
              }}
            >
              あなたのスピーチ（文字起こし）
            </Text>
            <Text
              style={{
                fontSize: 14,
                lineHeight: 22,
                color: colors.foreground,
              }}
            >
              {result.transcribedText}
            </Text>
          </View>
        )}

        {/* Action Buttons */}
        <Pressable
          onPress={handleTryAgain}
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              marginBottom: 12,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 18,
              fontWeight: "700",
            }}
          >
            もう一度チャレンジ
          </Text>
        </Pressable>

        <Pressable
          onPress={handleGoHome}
          style={({ pressed }) => [
            {
              backgroundColor: colors.surface,
              paddingVertical: 16,
              borderRadius: 14,
              alignItems: "center",
              borderWidth: 1,
              borderColor: colors.border,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: colors.foreground,
              fontSize: 18,
              fontWeight: "600",
            }}
          >
            ホームに戻る
          </Text>
        </Pressable>
      </ScrollView>
    </ScreenContainer>
  );
}
