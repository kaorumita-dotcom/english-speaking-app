import Anthropic from "@anthropic-ai/sdk";

export interface FeedbackParams {
  transcript: string;
  topic: string;
  wordCount: number;
  wpm: number;
  durationSeconds: number;
}

export interface FeedbackResult {
  cefrLevel: string;
  cefrExplanation: string;
  goodPoints: string[];
  grammarNotes: string[];
  encouragement: string;
}

/**
 * Generate feedback for speaking practice using Anthropic API
 */
export async function generateFeedback(
  params: FeedbackParams
): Promise<FeedbackResult> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not set, using fallback feedback');
    return getFallbackFeedback(params.wpm);
  }

  const client = new Anthropic({
    apiKey,
    dangerouslyAllowBrowser: true,
  });

  const systemPrompt = `あなたは日本の大学1年生（英語初級レベル、CEFR A1〜B1程度）を対象とした、優しく励ましてくれる英語の先生です。

あなたの仕事は、学生の1分間の英語スピーキング練習を分析し、フィードバックを提供することです。

必ず以下のJSON形式で回答してください：
{
  "cefrLevel": "A1" または "A2" または "B1" または "B2" または "C1" または "C2",
  "cefrExplanation": "このCEFRレベルと判定した理由（日本語で1文）",
  "goodPoints": ["表現や内容の良い点1（日本語）", "表現や内容の良い点2（日本語）"],
  "grammarNotes": ["文法の注意点1（日本語で、正しい表現も示す）", "文法の注意点2（日本語、任意）"],
  "encouragement": "まとめの褒め言葉と励ましのメッセージ（日本語）"
}

CEFRレベルの判定基準：
- A1（初級）：非常に基本的なフレーズ、語彙が限られている、ポーズが多い。WPMは通常50未満。
- A2（初中級）：簡単な文、基本的な語彙、多少のためらい。WPMは通常50〜80。
- B1（中級）：文をつなげて話せる、まずまずの流暢さ、いくつかの誤り。WPMは通常80〜120。
- B2（中上級）：明確で詳細なスピーチ、良い流暢さ。WPMは通常120〜150。
- C1/C2：複雑な構文を使った高度な流暢さ。WPMは通常150以上。

フィードバックのガイドライン：
- goodPoints：表現、語彙の選び方、内容について必ず2つの良い点を見つけてください。具体的で誠実に褒めてください。
- grammarNotes：文法の問題点を1〜2つ、優しく指摘してください。正しい表現を示してください。シンプルで教育的に。
- encouragement：温かく、支持的で、やる気を引き出すメッセージにしてください。学生の努力を認めてください。

重要：スピーチが非常に短かったり、多くの誤りがあっても、必ず励まし、良い点を見つけてください。すべてのフィードバックは日本語で書いてください。`;

  const userPrompt = `テーマ: "${params.topic}"
スピーキング時間: ${params.durationSeconds}秒
語数: ${params.wordCount}
1分あたりの語数 (WPM): ${params.wpm}

文字起こしされたスピーチ:
"${params.transcript}"

上記のスピーチを分析し、指定されたJSON形式でフィードバックを提供してください。`;

  try {
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    // Extract text content from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Anthropic API');
    }

    // Parse JSON response
    const feedback = JSON.parse(content.text);

    return {
      cefrLevel: feedback.cefrLevel || "A1",
      cefrExplanation: feedback.cefrExplanation || "",
      goodPoints: feedback.goodPoints || [],
      grammarNotes: feedback.grammarNotes || [],
      encouragement: feedback.encouragement || "",
    };
  } catch (error) {
    console.error("Failed to generate feedback from Anthropic API:", error);

    // Check if it's a rate limit error
    if (error instanceof Error && error.message.includes('429')) {
      console.warn('Rate limit exceeded, using fallback feedback');
    }

    // Return fallback feedback
    return getFallbackFeedback(params.wpm);
  }
}

/**
 * Generate fallback feedback based on WPM when API call fails
 */
function getFallbackFeedback(wpm: number): FeedbackResult {
  const cefrLevel = wpm < 50 ? "A1" : wpm < 80 ? "A2" : wpm < 120 ? "B1" : "B2";

  return {
    cefrLevel,
    cefrExplanation: "スピーキング速度に基づいてレベルを推定しました。",
    goodPoints: [
      "英語で話そうとチャレンジしたこと自体が素晴らしいです！",
      "スピーキング練習に取り組む姿勢がとても良いです。",
    ],
    grammarNotes: [
      "文の構造をさらに練習していきましょう。",
    ],
    encouragement:
      "練習を重ねるたびに上達していきます。この調子で頑張りましょう！",
  };
}
