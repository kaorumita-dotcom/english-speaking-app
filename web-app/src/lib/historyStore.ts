import { SpeakingResult } from "@/types";

const HISTORY_KEY = "speaking_history";

export function getHistory(): SpeakingResult[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data) as SpeakingResult[];
  } catch {
    return [];
  }
}

export function addToHistory(result: SpeakingResult): void {
  try {
    const history = getHistory();
    history.unshift(result); // newest first
    // Keep only last 50 entries
    const trimmed = history.slice(0, 50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}

export function getRecentHistory(count: number = 5): SpeakingResult[] {
  const history = getHistory();
  return history.slice(0, count);
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
