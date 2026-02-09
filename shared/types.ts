/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

// Speaking practice result type
export type SpeakingResult = {
  id: string;
  topic: string;
  transcribedText: string;
  wordCount: number;
  wpm: number;
  durationSeconds: number;
  cefrLevel: string;
  cefrExplanation: string;
  goodPoints: string[];
  grammarNotes: string[];
  encouragement: string;
  createdAt: string; // ISO date string
};

// Speaking topic type
export type SpeakingTopic = {
  id: number;
  title: string;
  emoji: string;
};
