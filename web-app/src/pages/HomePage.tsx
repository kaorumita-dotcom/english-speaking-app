import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScreenContainer } from "@/components/ScreenContainer";
import type { SpeakingTopic, SpeakingResult } from "@/types";
import { getRandomTopic, getNextTopic } from "@/lib/topics";
import { getRecentHistory } from "@/lib/historyStore";
import { getCEFRColor } from "@/lib/cefr";

export default function HomePage() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState<SpeakingTopic>(getRandomTopic());
  const [recentHistory, setRecentHistory] = useState<SpeakingResult[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(() => {
    try {
      const history = getRecentHistory(5);
      setRecentHistory(history);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleChangeTopic = () => {
    setTopic(getNextTopic(topic.id));
  };

  const handleStartSpeaking = () => {
    navigate(`/recording?topicId=${topic.id}&topicTitle=${encodeURIComponent(topic.title)}`);
  };

  return (
    <ScreenContainer className="px-5 pt-4">
      <div className="overflow-auto pb-6" style={{ flexGrow: 1 }}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground">
            独り言英会話
          </h1>
          <p className="text-base text-muted mt-1">
            1分間、英語で話してみよう
          </p>
        </div>

        {/* Topic Card */}
        <div className="bg-surface rounded-2xl p-6 mb-4 border border-border">
          <p className="text-sm font-medium text-muted uppercase tracking-wider mb-2">
            今日のテーマ
          </p>
          <div className="flex items-center mb-3">
            <span className="text-4xl mr-3">{topic.emoji}</span>
            <p className="text-xl font-bold text-foreground flex-1">
              {topic.title}
            </p>
          </div>
          <button
            onClick={handleChangeTopic}
            className="px-4 py-2 rounded-full bg-border text-sm font-medium text-muted hover:opacity-70 transition-opacity"
          >
            テーマを変える
          </button>
        </div>

        {/* Start Button */}
        <button
          onClick={handleStartSpeaking}
          className="w-full bg-primary py-[18px] rounded-2xl text-center mb-6 hover:opacity-90 active:scale-[0.97] transition-all"
        >
          <p className="text-white text-xl font-bold">
            スピーキング開始
          </p>
          <p className="text-white/80 text-sm mt-1">
            タップして1分間の練習を始めよう
          </p>
        </button>

        {/* Recent History */}
        <div>
          <h2 className="text-lg font-bold text-foreground mb-3">
            最近の練習
          </h2>
          {loading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : recentHistory.length === 0 ? (
            <div className="bg-surface rounded-xl p-5 text-center border border-border">
              <p className="text-muted">
                まだ練習記録がありません。
                <br />
                上のボタンから最初の練習を始めましょう！
              </p>
            </div>
          ) : (
            recentHistory.map((item) => {
              const cefrColor = getCEFRColor(item.cefrLevel);
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(`/result/${item.id}`)}
                  className="w-full bg-surface rounded-xl p-4 mb-2.5 border border-border hover:opacity-70 transition-opacity text-left"
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <p className="text-base font-semibold text-foreground">
                        {item.topic}
                      </p>
                      <p className="text-sm text-muted mt-1">
                        {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end">
                      <div
                        className="px-2.5 py-1 rounded-lg mb-1"
                        style={{
                          backgroundColor: cefrColor.bg,
                        }}
                      >
                        <span
                          className="font-bold text-sm"
                          style={{
                            color: cefrColor.text,
                          }}
                        >
                          {item.cefrLevel}
                        </span>
                      </div>
                      <p className="text-sm text-muted">
                        {item.wpm} 語/分
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </ScreenContainer>
  );
}
