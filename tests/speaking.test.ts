import { describe, expect, it } from "vitest";
import { SPEAKING_TOPICS, getRandomTopic, getNextTopic } from "../constants/topics";
import { getCEFRColor, getCEFRLabel } from "../lib/cefr";

describe("Speaking Topics", () => {
  it("should have 20 topics", () => {
    expect(SPEAKING_TOPICS.length).toBe(20);
  });

  it("each topic should have id, title, and emoji", () => {
    SPEAKING_TOPICS.forEach((topic) => {
      expect(topic.id).toBeDefined();
      expect(typeof topic.id).toBe("number");
      expect(topic.title).toBeDefined();
      expect(typeof topic.title).toBe("string");
      expect(topic.title.length).toBeGreaterThan(0);
      expect(topic.emoji).toBeDefined();
      expect(typeof topic.emoji).toBe("string");
    });
  });

  it("getRandomTopic should return a valid topic", () => {
    const topic = getRandomTopic();
    expect(topic).toBeDefined();
    expect(topic.id).toBeGreaterThanOrEqual(1);
    expect(topic.id).toBeLessThanOrEqual(20);
    expect(topic.title.length).toBeGreaterThan(0);
  });

  it("getNextTopic should return the next topic in sequence", () => {
    const next = getNextTopic(1);
    expect(next.id).toBe(2);
  });

  it("getNextTopic should wrap around from last to first", () => {
    const next = getNextTopic(20);
    expect(next.id).toBe(1);
  });
});

describe("CEFR Utilities", () => {
  it("getCEFRColor should return correct colors for each level", () => {
    const levels = ["A1", "A2", "B1", "B2", "C1", "C2"];
    levels.forEach((level) => {
      const color = getCEFRColor(level);
      expect(color).toBeDefined();
      expect(color.bg).toBeDefined();
      expect(color.text).toBeDefined();
      expect(typeof color.bg).toBe("string");
      expect(typeof color.text).toBe("string");
    });
  });

  it("getCEFRColor should return A1 colors for unknown level", () => {
    const color = getCEFRColor("X1");
    expect(color.bg).toBe("#FEE2E2");
    expect(color.text).toBe("#DC2626");
  });

  it("getCEFRLabel should return correct labels", () => {
    expect(getCEFRLabel("A1")).toBe("Beginner");
    expect(getCEFRLabel("A2")).toBe("Elementary");
    expect(getCEFRLabel("B1")).toBe("Intermediate");
    expect(getCEFRLabel("B2")).toBe("Upper Intermediate");
    expect(getCEFRLabel("C1")).toBe("Advanced");
    expect(getCEFRLabel("C2")).toBe("Proficient");
  });

  it("getCEFRLabel should return Beginner for unknown level", () => {
    expect(getCEFRLabel("X1")).toBe("Beginner");
  });
});

describe("SpeakingResult type structure", () => {
  it("should accept a valid SpeakingResult object", () => {
    const result = {
      id: "123",
      topic: "Your favorite food",
      transcribedText: "I like sushi very much.",
      wordCount: 6,
      wpm: 72,
      durationSeconds: 5,
      cefrLevel: "A2",
      cefrExplanation: "Elementary level with basic vocabulary.",
      goodPoints: ["Good vocabulary choice!", "Nice topic coverage."],
      grammarNotes: ["Consider using 'a lot' instead of 'very much'."],
      encouragement: "Great job! Keep practicing!",
      createdAt: new Date().toISOString(),
    };

    expect(result.id).toBe("123");
    expect(result.wordCount).toBe(6);
    expect(result.wpm).toBe(72);
    expect(result.cefrLevel).toBe("A2");
    expect(result.goodPoints.length).toBe(2);
    expect(result.grammarNotes.length).toBe(1);
  });
});
