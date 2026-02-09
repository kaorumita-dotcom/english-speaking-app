import AsyncStorage from "@react-native-async-storage/async-storage";
import { SpeakingResult } from "@/shared/types";

const HISTORY_KEY = "speaking_history";

export async function getHistory(): Promise<SpeakingResult[]> {
  try {
    const data = await AsyncStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data) as SpeakingResult[];
  } catch {
    return [];
  }
}

export async function addToHistory(result: SpeakingResult): Promise<void> {
  try {
    const history = await getHistory();
    history.unshift(result); // newest first
    // Keep only last 50 entries
    const trimmed = history.slice(0, 50);
    await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error("Failed to save history:", e);
  }
}

export async function getRecentHistory(count: number = 5): Promise<SpeakingResult[]> {
  const history = await getHistory();
  return history.slice(0, count);
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}
