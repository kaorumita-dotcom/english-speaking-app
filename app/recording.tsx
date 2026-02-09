import { useCallback, useEffect, useRef, useState } from "react";
import {
  Text,
  View,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { useKeepAwake } from "expo-keep-awake";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";
import * as FileSystem from "expo-file-system/legacy";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from "react-native-reanimated";

import { ScreenContainer } from "@/components/screen-container";
import { useColors } from "@/hooks/use-colors";
import { trpc } from "@/lib/trpc";
import { addToHistory } from "@/lib/history-store";
import { SpeakingResult } from "@/shared/types";

const RECORDING_DURATION = 60; // seconds
const MIN_DURATION = 10; // minimum seconds to analyze
const COUNTDOWN_SECONDS = 3;

type ScreenState = "countdown" | "recording" | "analyzing" | "error";

export default function RecordingScreen() {
  useKeepAwake();
  const router = useRouter();
  const colors = useColors();
  const params = useLocalSearchParams<{
    topicId: string;
    topicTitle: string;
  }>();
  const topicTitle = params.topicTitle || "Free Talk";

  const [state, setState] = useState<ScreenState>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const isStoppingRef = useRef(false);

  // expo-audio recorder
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 500);

  // Animation
  const pulseScale = useSharedValue(1);
  const pulseOpacity = useSharedValue(0.6);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value,
  }));

  const analyzeMutation = trpc.speaking.analyze.useMutation();

  // Countdown
  useEffect(() => {
    if (state !== "countdown") return;
    if (countdown <= 0) {
      startRecording();
      return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, state]);

  // Recording timer
  useEffect(() => {
    if (state !== "recording") return;
    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        if (next >= RECORDING_DURATION) {
          stopRecording();
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [state]);

  // Pulse animation during recording
  useEffect(() => {
    if (state === "recording") {
      pulseScale.value = withRepeat(
        withTiming(1.15, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
      pulseOpacity.value = withRepeat(
        withTiming(0.3, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    }
  }, [state]);

  const startRecording = useCallback(async () => {
    try {
      // Request microphone permission
      const { granted } = await requestRecordingPermissionsAsync();
      if (!granted) {
        setErrorMsg(
          "Microphone permission is required. Please allow microphone access in your device settings and try again."
        );
        setState("error");
        return;
      }

      // Configure audio mode for recording
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });

      // Prepare and start recording
      await recorder.prepareToRecordAsync();
      recorder.record();

      startTimeRef.current = Date.now();
      isStoppingRef.current = false;
      setState("recording");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
      setErrorMsg(
        "Could not start recording. Please allow microphone permission and try again."
      );
      setState("error");
    }
  }, [recorder]);

  const stopRecording = useCallback(async () => {
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    if (timerRef.current) clearInterval(timerRef.current);

    const actualDuration = Math.max(
      Math.round((Date.now() - startTimeRef.current) / 1000),
      1
    );

    if (actualDuration < MIN_DURATION) {
      setErrorMsg(
        `Please speak for at least ${MIN_DURATION} seconds. You spoke for ${actualDuration} seconds.`
      );
      try {
        await recorder.stop();
      } catch {}
      setState("error");
      return;
    }

    setState("analyzing");

    try {
      // Stop the recorder
      await recorder.stop();

      // Get the recording URI
      const uri = recorder.uri;
      if (!uri) {
        throw new Error("No recording URI available");
      }

      // Read the file as base64
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Determine mime type based on file extension
      const isM4a = uri.endsWith(".m4a") || uri.endsWith(".caf");
      const mimeType = isM4a ? "audio/mp4" : "audio/webm";

      // Send to server for analysis
      const result = await analyzeMutation.mutateAsync({
        audioBase64: base64,
        mimeType,
        topic: topicTitle,
        durationSeconds: actualDuration,
      });

      // Save to history
      const speakingResult: SpeakingResult = {
        id: Date.now().toString(),
        ...result,
        createdAt: new Date().toISOString(),
      };
      await addToHistory(speakingResult);

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Navigate to result
      router.replace({
        pathname: "/result",
        params: { resultId: speakingResult.id },
      });
    } catch (err) {
      console.error("Analysis failed:", err);
      setErrorMsg(
        "Analysis failed. Please check your connection and try again."
      );
      setState("error");
    }
  }, [topicTitle, analyzeMutation, router, recorder]);

  const handleStop = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    stopRecording();
  };

  const handleGoBack = () => {
    // Clean up recorder if still active
    if (recorderState.isRecording) {
      try {
        recorder.stop();
      } catch {}
    }
    if (timerRef.current) clearInterval(timerRef.current);
    router.back();
  };

  const remaining = RECORDING_DURATION - elapsed;
  const progress = elapsed / RECORDING_DURATION;

  return (
    <ScreenContainer
      edges={["top", "bottom", "left", "right"]}
      className="flex-1 items-center justify-center px-6"
    >
      {/* Back button */}
      {(state === "countdown" || state === "error") && (
        <Pressable
          onPress={handleGoBack}
          style={({ pressed }) => [
            {
              position: "absolute",
              top: 60,
              left: 20,
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: colors.surface,
              opacity: pressed ? 0.7 : 1,
              zIndex: 10,
            },
          ]}
        >
          <Text className="text-base font-medium text-foreground">Back</Text>
        </Pressable>
      )}

      {/* Topic */}
      <View className="items-center mb-8">
        <Text className="text-sm font-medium text-muted uppercase tracking-wider mb-1">
          Topic
        </Text>
        <Text className="text-xl font-bold text-foreground text-center">
          {topicTitle}
        </Text>
      </View>

      {/* Countdown State */}
      {state === "countdown" && (
        <View className="items-center">
          <View
            style={{
              width: 160,
              height: 160,
              borderRadius: 80,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 24,
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontSize: 72,
                fontWeight: "800",
              }}
            >
              {countdown}
            </Text>
          </View>
          <Text className="text-lg text-muted">Get ready to speak...</Text>
        </View>
      )}

      {/* Recording State */}
      {state === "recording" && (
        <View className="items-center">
          {/* Pulse circle */}
          <View
            style={{
              width: 200,
              height: 200,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Animated.View
              style={[
                {
                  position: "absolute",
                  width: 200,
                  height: 200,
                  borderRadius: 100,
                  backgroundColor: colors.error,
                },
                pulseStyle,
              ]}
            />
            <View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: colors.error,
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1,
              }}
            >
              <Text
                style={{
                  color: "#FFFFFF",
                  fontSize: 48,
                  fontWeight: "800",
                }}
              >
                {remaining}
              </Text>
              <Text
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: 14,
                }}
              >
                seconds left
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View
            style={{
              width: "100%",
              height: 6,
              backgroundColor: colors.border,
              borderRadius: 3,
              marginTop: 32,
              marginBottom: 24,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                width: `${progress * 100}%`,
                height: "100%",
                backgroundColor: colors.error,
                borderRadius: 3,
              }}
            />
          </View>

          <Text className="text-base text-muted mb-6">
            Keep speaking in English...
          </Text>

          {/* Stop button */}
          <Pressable
            onPress={handleStop}
            style={({ pressed }) => [
              {
                backgroundColor: colors.surface,
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 28,
                borderWidth: 2,
                borderColor: colors.error,
                transform: [{ scale: pressed ? 0.97 : 1 }],
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <Text
              style={{
                color: colors.error,
                fontSize: 18,
                fontWeight: "700",
              }}
            >
              Stop & Analyze
            </Text>
          </Pressable>
        </View>
      )}

      {/* Analyzing State */}
      {state === "analyzing" && (
        <View className="items-center">
          <ActivityIndicator size="large" color={colors.primary} />
          <Text className="text-xl font-bold text-foreground mt-6 mb-2">
            Analyzing your speech...
          </Text>
          <Text className="text-base text-muted text-center">
            Transcribing and generating{"\n"}personalized feedback
          </Text>
        </View>
      )}

      {/* Error State */}
      {state === "error" && (
        <View className="items-center px-4">
          <Text
            style={{
              fontSize: 48,
              marginBottom: 16,
            }}
          >
            😕
          </Text>
          <Text className="text-lg font-bold text-foreground mb-2 text-center">
            Oops!
          </Text>
          <Text className="text-base text-muted text-center mb-6">
            {errorMsg}
          </Text>
          <Pressable
            onPress={handleGoBack}
            style={({ pressed }) => [
              {
                backgroundColor: colors.primary,
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 28,
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
              Go Back
            </Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}
