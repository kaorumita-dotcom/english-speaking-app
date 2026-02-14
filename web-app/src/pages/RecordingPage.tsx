import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ScreenContainer } from "@/components/ScreenContainer";
import { WebSpeechRecognizer } from "@/lib/speechRecognition";
import { generateFeedback } from "@/lib/anthropicClient";
import { addToHistory } from "@/lib/historyStore";
import type { SpeakingResult } from "@/types";

const RECORDING_DURATION = 60; // seconds
const MIN_DURATION = 10; // minimum seconds to analyze
const COUNTDOWN_SECONDS = 3;

type ScreenState = "countdown" | "recording" | "analyzing" | "error";

export default function RecordingPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const topicTitle = searchParams.get("topicTitle") || "Free Talk";

  const [state, setState] = useState<ScreenState>("countdown");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [currentTranscript, setCurrentTranscript] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recognizerRef = useRef<WebSpeechRecognizer | null>(null);
  const startTimeRef = useRef<number>(0);

  // Check browser support
  useEffect(() => {
    if (!WebSpeechRecognizer.isSupported()) {
      setErrorMsg(
        "お使いのブラウザは音声認識に対応していません。Chrome、Safari、またはEdgeブラウザをご利用ください。"
      );
      setState("error");
    }
  }, []);

  // Countdown timer
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

  // Start recording
  const startRecording = useCallback(async () => {
    try {
      const recognizer = new WebSpeechRecognizer();
      recognizerRef.current = recognizer;

      await recognizer.start((text) => {
        setCurrentTranscript(text);
      });

      startTimeRef.current = Date.now();
      setState("recording");
    } catch (err) {
      console.error("Failed to start recording:", err);
      setErrorMsg(
        "録音を開始できませんでした。マイクの使用許可を確認してもう一度お試しください。"
      );
      setState("error");
    }
  }, []);

  // Stop recording
  const stopRecording = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (!recognizerRef.current) {
      setErrorMsg("録音エラーが発生しました。");
      setState("error");
      return;
    }

    try {
      const { transcript, duration } = await recognizerRef.current.stop();

      if (duration < MIN_DURATION) {
        setErrorMsg(
          `最低${MIN_DURATION}秒以上話してください。今回は${duration}秒でした。`
        );
        setState("error");
        return;
      }

      setState("analyzing");

      // Calculate WPM
      const words = transcript.split(/\s+/).filter((w) => w.length > 0);
      const wordCount = words.length;
      const minutes = duration / 60;
      const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

      // Generate feedback
      const feedback = await generateFeedback({
        transcript,
        topic: topicTitle,
        wordCount,
        wpm,
        durationSeconds: duration,
      });

      // Save to history
      const speakingResult: SpeakingResult = {
        id: Date.now().toString(),
        topic: topicTitle,
        transcribedText: transcript,
        wordCount,
        wpm,
        durationSeconds: duration,
        cefrLevel: feedback.cefrLevel,
        cefrExplanation: feedback.cefrExplanation,
        goodPoints: feedback.goodPoints,
        grammarNotes: feedback.grammarNotes,
        encouragement: feedback.encouragement,
        createdAt: new Date().toISOString(),
      };
      addToHistory(speakingResult);

      navigate(`/result/${speakingResult.id}`, { replace: true });
    } catch (err) {
      console.error("Analysis failed:", err);
      setErrorMsg(
        "分析に失敗しました。通信環境を確認してもう一度お試しください。"
      );
      setState("error");
    } finally {
      recognizerRef.current?.cleanup();
    }
  }, [topicTitle, navigate]);

  const handleStop = () => {
    stopRecording();
  };

  const handleGoBack = () => {
    if (recognizerRef.current) {
      recognizerRef.current.cleanup();
    }
    if (timerRef.current) clearInterval(timerRef.current);
    navigate("/");
  };

  const remaining = RECORDING_DURATION - elapsed;
  const progress = elapsed / RECORDING_DURATION;

  return (
    <ScreenContainer className="flex items-center justify-center px-6 relative">
      {/* Back button */}
      {(state === "countdown" || state === "error") && (
        <button
          onClick={handleGoBack}
          className="absolute top-16 left-5 px-4 py-2 rounded-full bg-surface hover:opacity-70 transition-opacity z-10"
        >
          <span className="text-base font-medium text-foreground">戻る</span>
        </button>
      )}

      <div className="w-full max-w-md">
        {/* Topic */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-muted uppercase tracking-wider mb-1">
            テーマ
          </p>
          <h1 className="text-xl font-bold text-foreground">
            {topicTitle}
          </h1>
        </div>

        {/* Countdown State */}
        {state === "countdown" && (
          <div className="text-center">
            <div className="w-40 h-40 mx-auto rounded-full bg-primary flex items-center justify-center mb-6">
              <span className="text-white text-7xl font-extrabold">
                {countdown}
              </span>
            </div>
            <p className="text-lg text-muted">英語で話す準備をしよう...</p>
          </div>
        )}

        {/* Recording State */}
        {state === "recording" && (
          <div className="text-center">
            {/* Pulse circle */}
            <div className="w-52 h-52 mx-auto flex items-center justify-center relative">
              <div className="absolute w-52 h-52 rounded-full bg-error animate-pulse-recording" />
              <div className="w-40 h-40 rounded-full bg-error flex flex-col items-center justify-center z-10">
                <span className="text-white text-5xl font-extrabold">
                  {remaining}
                </span>
                <span className="text-white/80 text-sm mt-1">秒</span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-border rounded-full mt-8 mb-6 overflow-hidden">
              <div
                className="h-full bg-error rounded-full transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <p className="text-base text-muted mb-6">
              英語で話し続けましょう...
            </p>

            {/* Current transcript preview */}
            {currentTranscript && (
              <div className="bg-surface rounded-xl p-4 mb-6 border border-border max-h-32 overflow-auto">
                <p className="text-sm text-foreground text-left">
                  {currentTranscript}
                </p>
              </div>
            )}

            {/* Stop button */}
            <button
              onClick={handleStop}
              className="px-8 py-3.5 rounded-full bg-surface border-2 border-error text-error text-lg font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            >
              終了して分析する
            </button>
          </div>
        )}

        {/* Analyzing State */}
        {state === "analyzing" && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-6" />
            <h2 className="text-xl font-bold text-foreground mb-2">
              スピーチを分析中...
            </h2>
            <p className="text-base text-muted">
              文字起こしとフィードバックを
              <br />
              生成しています
            </p>
          </div>
        )}

        {/* Error State */}
        {state === "error" && (
          <div className="text-center px-4">
            <span className="text-5xl block mb-4">😕</span>
            <h2 className="text-lg font-bold text-foreground mb-2">
              エラーが発生しました
            </h2>
            <p className="text-base text-muted mb-6">
              {errorMsg}
            </p>
            <button
              onClick={handleGoBack}
              className="px-8 py-3.5 rounded-full bg-primary text-white text-lg font-bold hover:opacity-90 active:scale-[0.97] transition-all"
            >
              戻る
            </button>
          </div>
        )}
      </div>
    </ScreenContainer>
  );
}
