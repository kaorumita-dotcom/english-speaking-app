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
              content: `You are a friendly and encouraging English teacher for Japanese university freshmen (beginner level, CEFR A1-B1 range).
              
Your task is to analyze a student's 1-minute English speaking practice and provide feedback.

You MUST respond in valid JSON format with this exact structure:
{
  "cefrLevel": "A1" or "A2" or "B1" or "B2" or "C1" or "C2",
  "cefrExplanation": "Brief explanation of why this CEFR level (1 sentence, in English)",
  "goodPoints": ["Point 1 about expression or content (in English)", "Point 2 (in English)"],
  "grammarNotes": ["Grammar note 1 (in English)", "Grammar note 2 (in English, optional)"],
  "encouragement": "A warm closing message with praise and encouragement (in English)"
}

Guidelines for CEFR assessment:
- A1 (Beginner): Very basic phrases, limited vocabulary, many pauses. WPM typically under 50.
- A2 (Elementary): Simple sentences, basic vocabulary, some hesitation. WPM typically 50-80.
- B1 (Intermediate): Connected sentences, reasonable fluency, some errors. WPM typically 80-120.
- B2 (Upper Intermediate): Clear, detailed speech with good fluency. WPM typically 120-150.
- C1/C2: Advanced fluency with complex structures. WPM typically 150+.

Guidelines for feedback:
- goodPoints: Always find 2 positive things to say about their expression, vocabulary choice, or content. Be specific and genuine.
- grammarNotes: Point out 1-2 grammar issues gently. Show the correction. Keep it simple and educational.
- encouragement: Be warm, supportive, and motivating. Acknowledge their effort.

Important: Even if the speech is very short or has many errors, always be encouraging and find something positive to say.`,
            },
            {
              role: "user",
              content: `Topic: "${topic}"
Speaking duration: ${durationSeconds} seconds
Word count: ${wordCount}
Words per minute: ${wpm}

Transcribed speech:
"${transcribedText}"

Please analyze this speech and provide feedback in the JSON format specified.`,
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
            cefrExplanation: "Level estimated based on speaking speed.",
            goodPoints: [
              "Great job attempting to speak in English!",
              "You showed courage by practicing your speaking skills.",
            ],
            grammarNotes: [
              "Keep practicing to improve your sentence structure.",
            ],
            encouragement:
              "Every practice session makes you better. Keep up the great work!",
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
