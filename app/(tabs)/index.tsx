import { useCallback, useEffect, useState } from "react";
import {
  Text,
  View,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { SpeakingTopic, SpeakingResult } from "@/shared/types";
import { getRandomTopic, getNextTopic } from "@/constants/topics";
import { getRecentHistory } from "@/lib/history-store";
import { getCEFRColor, getCEFRLabel } from "@/lib/cefr";
import { useColors } from "@/hooks/use-colors";

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const [topic, setTopic] = useState<SpeakingTopic>(getRandomTopic());
  const [recentHistory, setRecentHistory] = useState<SpeakingResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      const history = await getRecentHistory(5);
      setRecentHistory(history);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  const handleChangeTopic = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setTopic(getNextTopic(topic.id));
  };

  const handleStartSpeaking = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    router.push({
      pathname: "/recording",
      params: { topicId: topic.id.toString(), topicTitle: topic.title },
    });
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="items-center mb-6">
          <Text className="text-3xl font-bold text-foreground">
            Solo English
          </Text>
          <Text className="text-base text-muted mt-1">
            Practice speaking for 1 minute
          </Text>
        </View>

        {/* Topic Card */}
        <View className="bg-surface rounded-2xl p-6 mb-4 border border-border">
          <Text className="text-sm font-medium text-muted uppercase tracking-wider mb-2">
            Today's Topic
          </Text>
          <View className="flex-row items-center mb-3">
            <Text className="text-4xl mr-3">{topic.emoji}</Text>
            <Text className="text-xl font-bold text-foreground flex-1 flex-shrink">
              {topic.title}
            </Text>
          </View>
          <Pressable
            onPress={handleChangeTopic}
            style={({ pressed }) => [
              {
                alignSelf: "flex-start",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: colors.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text className="text-sm font-medium text-muted">
              Change Topic
            </Text>
          </Pressable>
        </View>

        {/* Start Button */}
        <Pressable
          onPress={handleStartSpeaking}
          style={({ pressed }) => [
            {
              backgroundColor: colors.primary,
              paddingVertical: 18,
              borderRadius: 16,
              alignItems: "center",
              marginBottom: 24,
              transform: [{ scale: pressed ? 0.97 : 1 }],
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 20,
              fontWeight: "700",
            }}
          >
            Start Speaking
          </Text>
          <Text
            style={{
              color: "rgba(255,255,255,0.8)",
              fontSize: 14,
              marginTop: 4,
            }}
          >
            Tap to begin your 1-minute practice
          </Text>
        </Pressable>

        {/* Recent History */}
        <View>
          <Text className="text-lg font-bold text-foreground mb-3">
            Recent Practice
          </Text>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : recentHistory.length === 0 ? (
            <View className="bg-surface rounded-xl p-5 items-center border border-border">
              <Text className="text-muted text-center">
                No practice sessions yet.{"\n"}Start your first session above!
              </Text>
            </View>
          ) : (
            recentHistory.map((item) => {
              const cefrColor = getCEFRColor(item.cefrLevel);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => {
                    router.push({
                      pathname: "/result",
                      params: { resultId: item.id },
                    });
                  }}
                  style={({ pressed }) => [
                    {
                      backgroundColor: colors.surface,
                      borderRadius: 12,
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
                      alignItems: "center",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text className="text-base font-semibold text-foreground">
                        {item.topic}
                      </Text>
                      <Text className="text-sm text-muted mt-1">
                        {new Date(item.createdAt).toLocaleDateString("ja-JP", {
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
                          paddingHorizontal: 10,
                          paddingVertical: 4,
                          borderRadius: 8,
                          marginBottom: 4,
                        }}
                      >
                        <Text
                          style={{
                            color: cefrColor.text,
                            fontWeight: "700",
                            fontSize: 14,
                          }}
                        >
                          {item.cefrLevel}
                        </Text>
                      </View>
                      <Text className="text-sm text-muted">
                        {item.wpm} WPM
                      </Text>
                    </View>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
