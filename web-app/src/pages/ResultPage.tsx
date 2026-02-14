import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { SpeakingResult } from "@/types";
import { getHistory } from "@/lib/historyStore";
import { getCEFRColor, getCEFRLabel } from "@/lib/cefr";

export default function ResultPage() {
  const navigate = useNavigate();
  const { resultId } = useParams<{ resultId: string }>();
  const [result, setResult] = useState<SpeakingResult | null>(null);

  useEffect(() => {
    loadResult();
  }, [resultId]);

  const loadResult = () => {
    if (!resultId) return;
    const history = getHistory();
    const found = history.find((h) => h.id === resultId);
    if (found) setResult(found);
  };

  const handleTryAgain = () => {
    navigate("/");
  };

  const handleGoHome = () => {
    navigate("/");
  };

  if (!result) {
    return (
      <ScreenContainer className="flex items-center justify-center">
        <p className="text-muted">読み込み中...</p>
      </ScreenContainer>
    );
  }

  const cefrColor = getCEFRColor(result.cefrLevel);
  const cefrLabel = getCEFRLabel(result.cefrLevel);

  return (
    <ScreenContainer>
      <div className="overflow-auto px-5 pt-4 pb-10">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            あなたの結果
          </h1>
          <p className="text-sm text-muted mt-1">{result.topic}</p>
        </div>

        {/* WPM & CEFR Score Card */}
        <div className="bg-surface rounded-2xl p-6 mb-4 border border-border">
          <div className="flex justify-around items-center">
            {/* WPM */}
            <div className="text-center">
              <p className="text-5xl font-extrabold text-primary">
                {result.wpm}
              </p>
              <p className="text-sm font-medium text-muted mt-1">
                語 / 分
              </p>
            </div>

            {/* Divider */}
            <div className="w-px h-16 bg-border" />

            {/* CEFR */}
            <div className="text-center">
              <div
                className="px-5 py-2.5 rounded-xl mb-1 inline-block"
                style={{ backgroundColor: cefrColor.bg }}
              >
                <span
                  className="text-3xl font-extrabold"
                  style={{ color: cefrColor.text }}
                >
                  {result.cefrLevel}
                </span>
              </div>
              <p className="text-sm font-medium text-muted">
                {cefrLabel}
              </p>
            </div>
          </div>

          {/* Stats row */}
          <div className="flex justify-center mt-4 gap-6">
            <p className="text-sm text-muted">
              {result.wordCount} 語
            </p>
            <p className="text-sm text-muted">
              {result.durationSeconds}秒間
            </p>
          </div>

          {result.cefrExplanation && (
            <p className="text-sm text-muted text-center mt-3">
              {result.cefrExplanation}
            </p>
          )}
        </div>

        {/* Good Points */}
        {result.goodPoints && result.goodPoints.length > 0 && (
          <div className="bg-emerald-50 rounded-2xl p-5 mb-3 border border-emerald-200">
            <div className="flex items-center mb-3">
              <span className="text-xl mr-2">✨</span>
              <h2 className="text-base font-bold text-emerald-900">
                良かった点
              </h2>
            </div>
            {result.goodPoints.map((point, i) => (
              <div
                key={i}
                className="flex mb-2 last:mb-0"
              >
                <span className="text-emerald-500 mr-2 text-sm">•</span>
                <p className="text-sm text-emerald-900 leading-relaxed flex-1">
                  {point}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Grammar Notes */}
        {result.grammarNotes && result.grammarNotes.length > 0 && (
          <div className="bg-amber-50 rounded-2xl p-5 mb-3 border border-amber-200">
            <div className="flex items-center mb-3">
              <span className="text-xl mr-2">📝</span>
              <h2 className="text-base font-bold text-amber-900">
                文法の注意点
              </h2>
            </div>
            {result.grammarNotes.map((note, i) => (
              <div
                key={i}
                className="flex mb-2 last:mb-0"
              >
                <span className="text-amber-500 mr-2 text-sm">•</span>
                <p className="text-sm text-amber-900 leading-relaxed flex-1">
                  {note}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Encouragement */}
        {result.encouragement && (
          <div className="bg-blue-50 rounded-2xl p-5 mb-6 border border-blue-200">
            <div className="flex items-center mb-2">
              <span className="text-xl mr-2">💪</span>
              <h2 className="text-base font-bold text-blue-900">
                まとめ・応援メッセージ
              </h2>
            </div>
            <p className="text-sm text-blue-900 leading-relaxed">
              {result.encouragement}
            </p>
          </div>
        )}

        {/* Transcribed Text */}
        {result.transcribedText && (
          <div className="bg-surface rounded-2xl p-5 mb-6 border border-border">
            <p className="text-sm font-semibold text-muted mb-2">
              あなたのスピーチ（文字起こし）
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {result.transcribedText}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <button
          onClick={handleTryAgain}
          className="w-full bg-primary py-4 rounded-2xl text-center mb-3 hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <span className="text-white text-lg font-bold">
            もう一度チャレンジ
          </span>
        </button>

        <button
          onClick={handleGoHome}
          className="w-full bg-surface py-4 rounded-2xl text-center border border-border hover:opacity-70 transition-opacity"
        >
          <span className="text-foreground text-lg font-semibold">
            ホームに戻る
          </span>
        </button>
      </div>
    </ScreenContainer>
  );
}
