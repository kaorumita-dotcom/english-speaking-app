import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { SpeakingResult } from "@/types";
import { getHistory } from "@/lib/historyStore";
import { getCEFRColor } from "@/lib/cefr";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [history, setHistory] = useState<SpeakingResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(() => {
    try {
      const data = getHistory();
      setHistory(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return (
    <ScreenContainer className="px-5 pt-4">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-3xl font-bold text-foreground">練習履歴</h1>
        <p className="text-base text-muted mt-1">
          これまでのスピーキング練習の記録
        </p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted">読み込み中...</p>
        </div>
      ) : history.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center">
          <span className="text-5xl mb-4">🎙️</span>
          <p className="text-lg font-semibold text-foreground mb-2">
            まだ記録がありません
          </p>
          <p className="text-base text-muted text-center">
            最初のスピーキング練習を
            <br />
            完了すると、ここに表示されます
          </p>
        </div>
      ) : (
        <div className="overflow-auto pb-6">
          {history.map((item) => {
            const cefrColor = getCEFRColor(item.cefrLevel);
            return (
              <button
                key={item.id}
                onClick={() => navigate(`/result/${item.id}`)}
                className="w-full bg-surface rounded-2xl p-4 mb-2.5 border border-border hover:opacity-70 transition-opacity text-left"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 mr-3">
                    <p className="text-base font-semibold text-foreground mb-1">
                      {item.topic}
                    </p>
                    <p className="text-sm text-muted">
                      {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex flex-col items-end">
                    <div
                      className="px-3 py-1 rounded-lg mb-1"
                      style={{ backgroundColor: cefrColor.bg }}
                    >
                      <span
                        className="font-bold text-sm"
                        style={{ color: cefrColor.text }}
                      >
                        {item.cefrLevel}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-primary">
                      {item.wpm} 語/分
                    </p>
                  </div>
                </div>

                {/* Preview of feedback */}
                {item.goodPoints && item.goodPoints.length > 0 && (
                  <p className="text-sm text-muted mt-2 line-clamp-2">
                    {item.goodPoints[0]}
                  </p>
                )}
              </button>
            );
          })}
        </div>
      )}
    </ScreenContainer>
  );
}
