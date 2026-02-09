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

// ============================================================
// Web-specific recording helper (uses MediaRecorder directly)
// ============================================================
class WebRecorder {
  private stream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private _uri: string | null = null;
  private _isRecording = false;

  get uri() {
    return this._uri;
  }
  get isRecording() {
    return this._isRecording;
  }

  async prepare(): Promise<void> {
    // Check if mediaDevices is available
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      throw new Error("MEDIA_DEVICES_NOT_AVAILABLE");
    }
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.chunks = [];
    this._uri = null;
  }

  start(): void {
    if (!this.stream) throw new Error("Not prepared");
    const options: MediaRecorderOptions = {};
    if (typeof MediaRecorder !== "undefined") {
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        options.mimeType = "audio/webm;codecs=opus";
      } else if (MediaRecorder.isTypeSupported("audio/webm")) {
        options.mimeType = "audio/webm";
      } else if (MediaRecorder.isTypeSupported("audio/mp4")) {
        options.mimeType = "audio/mp4";
      }
    }
    this.mediaRecorder = new MediaRecorder(this.stream, options);
    this.mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) this.chunks.push(e.data);
    };
    this.mediaRecorder.start();
    this._isRecording = true;
  }

  async stop(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder) {
        reject(new Error("No recorder"));
        return;
      }
      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.chunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        });
        this._uri = URL.createObjectURL(blob);
        this._isRecording = false;
        // Stop all tracks
        this.stream?.getTracks().forEach((t) => t.stop());
        resolve(this._uri);
      };
      this.mediaRecorder.stop();
    });
  }

  async getBase64(): Promise<{ base64: string; mimeType: string }> {
    if (this.chunks.length === 0) throw new Error("No recording data");
    const blob = new Blob(this.chunks, {
      type: this.mediaRecorder?.mimeType || "audio/webm",
    });
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < uint8.length; i++) {
      binary += String.fromCharCode(uint8[i]);
    }
    const base64 = btoa(binary);
    return { base64, mimeType: blob.type || "audio/webm" };
  }

  cleanup(): void {
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this._isRecording = false;
  }
}

// ============================================================
// Main Recording Screen Component
// ============================================================
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

  // Native recorder (expo-audio) - used on iOS/Android
  const nativeRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const nativeRecorderState = useAudioRecorderState(nativeRecorder, 500);

  // Web recorder - used on web platform
  const webRecorderRef = useRef<WebRecorder | null>(null);

  const isWeb = Platform.OS === "web";

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

  // ---- Start Recording ----
  const startRecording = useCallback(async () => {
    try {
      if (isWeb) {
        // Web: use MediaRecorder directly
        const webRec = new WebRecorder();
        try {
          await webRec.prepare();
        } catch (err: any) {
          if (err?.message === "MEDIA_DEVICES_NOT_AVAILABLE") {
            setErrorMsg(
              "Microphone is not available in this browser environment. Please open the app in a browser that supports microphone access (Chrome, Firefox, Safari), or use the Expo Go app on your phone for the best experience."
            );
            setState("error");
            return;
          }
          throw err;
        }
        webRec.start();
        webRecorderRef.current = webRec;
      } else {
        // Native: use expo-audio
        const { granted } = await requestRecordingPermissionsAsync();
        if (!granted) {
          setErrorMsg(
            "Microphone permission is required. Please allow microphone access in your device settings and try again."
          );
          setState("error");
          return;
        }
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await nativeRecorder.prepareToRecordAsync();
        nativeRecorder.record();
      }

      startTimeRef.current = Date.now();
      isStoppingRef.current = false;
      setState("recording");

      if (!isWeb) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (err) {
      console.error("Failed to start recording:", err);
      setErrorMsg(
        "Could not start recording. Please allow microphone permission and try again."
      );
      setState("error");
    }
  }, [isWeb, nativeRecorder]);

  // ---- Stop Recording ----
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
        if (isWeb) {
          await webRecorderRef.current?.stop();
          webRecorderRef.current?.cleanup();
        } else {
          await nativeRecorder.stop();
        }
      } catch {}
      setState("error");
      return;
    }

    setState("analyzing");

    try {
      let base64: string;
      let mimeType: string;

      if (isWeb) {
        // Web: get base64 from WebRecorder
        await webRecorderRef.current?.stop();
        const data = await webRecorderRef.current!.getBase64();
        base64 = data.base64;
        mimeType = data.mimeType;
        webRecorderRef.current?.cleanup();
      } else {
        // Native: stop recorder and read file
        await nativeRecorder.stop();
        const uri = nativeRecorder.uri;
        if (!uri) throw new Error("No recording URI available");

        // Dynamic import for native file system
        const FileSystem = await import("expo-file-system/legacy");
        base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const isM4a = uri.endsWith(".m4a") || uri.endsWith(".caf");
        mimeType = isM4a ? "audio/mp4" : "audio/webm";
      }

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

      if (!isWeb) {
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
  }, [topicTitle, analyzeMutation, router, isWeb, nativeRecorder]);

  const handleStop = () => {
    if (!isWeb) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    stopRecording();
  };

  const handleGoBack = () => {
    // Clean up
    if (isWeb) {
      webRecorderRef.current?.cleanup();
    } else if (nativeRecorderState.isRecording) {
      try {
        nativeRecorder.stop();
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
