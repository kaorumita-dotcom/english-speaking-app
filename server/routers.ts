import { z } from "zod";
import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { transcribeAudio } from "./_core/voiceTranscription";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  speaking: router({
    // Upload audio and get transcription + AI feedback
    analyze: publicProcedure
      .input(
        z.object({
          audioBase64: z.string(),
          mimeType: z.string().default("audio/webm"),
          topic: z.string(),
          durationSeconds: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const { audioBase64, mimeType, topic, durationSeconds } = input;

        // 1. Upload audio to S3
        const audioBuffer = Buffer.from(audioBase64, "base64");
        const ext = mimeType.includes("webm") ? "webm" : mimeType.includes("mp4") ? "m4a" : "wav";
        const fileKey = `speaking/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

        const { url: audioUrl } = await storagePut(fileKey, audioBuffer, mimeType);

        // 2. Transcribe audio using Whisper
        const transcription = await transcribeAudio({
          audioUrl,
          language: "en",
          prompt: `The speaker is a Japanese university student practicing English speaking about the topic: ${topic}`,
        });

        if ("error" in transcription) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: transcription.error,
            cause: transcription,
          });
        }

        const transcribedText = transcription.text.trim();

        // 3. Calculate WPM
        const words = transcribedText
          .split(/\s+/)
          .filter((w) => w.length > 0);
        const wordCount = words.length;
        const minutes = durationSeconds / 60;
        const wpm = minutes > 0 ? Math.round(wordCount / minutes) : 0;

        // 4. Determine CEFR level based on WPM and content
        // 5. Get AI feedback using LLM
        const feedbackResponse = await invokeLLM({
          messages: [
            {
              role: "system",
              content: `あなたは日本の大学1年生（英語初級レベル、CEFR A1〜B1程度）を対象とした、優しく励ましてくれる英語の先生です。

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

重要：スピーチが非常に短かったり、多くの誤りがあっても、必ず励まし、良い点を見つけてください。すべてのフィードバックは日本語で書いてください。`,
            },
            {
              role: "user",
              content: `テーマ: "${topic}"
スピーキング時間: ${durationSeconds}秒
語数: ${wordCount}
1分あたりの語数 (WPM): ${wpm}

文字起こしされたスピーチ:
"${transcribedText}"

上記のスピーチを分析し、指定されたJSON形式でフィードバックを提供してください。`,
            },
          ],
          response_format: { type: "json_object" },
        });

        let feedback;
        try {
          const content = feedbackResponse.choices[0].message.content;
          const contentStr = typeof content === "string" ? content : JSON.stringify(content);
          feedback = JSON.parse(contentStr);
        } catch {
          // Fallback feedback if LLM parsing fails
          feedback = {
            cefrLevel: wpm < 50 ? "A1" : wpm < 80 ? "A2" : wpm < 120 ? "B1" : "B2",
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

        return {
          transcribedText,
          wordCount,
          wpm,
          durationSeconds,
          cefrLevel: feedback.cefrLevel || "A1",
          cefrExplanation: feedback.cefrExplanation || "",
          goodPoints: feedback.goodPoints || [],
          grammarNotes: feedback.grammarNotes || [],
          encouragement: feedback.encouragement || "",
          topic,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
