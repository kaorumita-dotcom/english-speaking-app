export type CEFRLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const CEFR_COLORS: Record<CEFRLevel, { bg: string; text: string }> = {
  A1: { bg: "#FEE2E2", text: "#DC2626" },
  A2: { bg: "#FEF3C7", text: "#D97706" },
  B1: { bg: "#D1FAE5", text: "#059669" },
  B2: { bg: "#DBEAFE", text: "#2563EB" },
  C1: { bg: "#E0E7FF", text: "#4F46E5" },
  C2: { bg: "#EDE9FE", text: "#7C3AED" },
};

export const CEFR_LABELS: Record<CEFRLevel, string> = {
  A1: "初級",
  A2: "初中級",
  B1: "中級",
  B2: "中上級",
  C1: "上級",
  C2: "最上級",
};

export function getCEFRColor(level: string): { bg: string; text: string } {
  return CEFR_COLORS[level as CEFRLevel] || CEFR_COLORS.A1;
}

export function getCEFRLabel(level: string): string {
  return CEFR_LABELS[level as CEFRLevel] || "初級";
}
