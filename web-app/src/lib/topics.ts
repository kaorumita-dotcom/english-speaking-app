import { SpeakingTopic } from "@/types";

export const SPEAKING_TOPICS: SpeakingTopic[] = [
  { id: 1, title: "Your favorite food", emoji: "🍕" },
  { id: 2, title: "Your morning routine", emoji: "🌅" },
  { id: 3, title: "Your best friend", emoji: "👫" },
  { id: 4, title: "Your hometown", emoji: "🏘️" },
  { id: 5, title: "Your hobby", emoji: "🎨" },
  { id: 6, title: "Your dream vacation", emoji: "✈️" },
  { id: 7, title: "Your favorite movie or TV show", emoji: "🎬" },
  { id: 8, title: "Your daily schedule", emoji: "📅" },
  { id: 9, title: "Your family", emoji: "👨‍👩‍👧‍👦" },
  { id: 10, title: "Your favorite season", emoji: "🌸" },
  { id: 11, title: "What you did last weekend", emoji: "🎉" },
  { id: 12, title: "Your favorite music", emoji: "🎵" },
  { id: 13, title: "Your school life", emoji: "🎓" },
  { id: 14, title: "Your pet or dream pet", emoji: "🐾" },
  { id: 15, title: "Your favorite place to relax", emoji: "🏖️" },
  { id: 16, title: "What makes you happy", emoji: "😊" },
  { id: 17, title: "Your favorite sport", emoji: "⚽" },
  { id: 18, title: "Your ideal weekend", emoji: "☀️" },
  { id: 19, title: "A skill you want to learn", emoji: "📚" },
  { id: 20, title: "Your favorite memory", emoji: "💭" },
];

export function getRandomTopic(): SpeakingTopic {
  const index = Math.floor(Math.random() * SPEAKING_TOPICS.length);
  return SPEAKING_TOPICS[index];
}

export function getNextTopic(currentId: number): SpeakingTopic {
  const currentIndex = SPEAKING_TOPICS.findIndex((t) => t.id === currentId);
  const nextIndex = (currentIndex + 1) % SPEAKING_TOPICS.length;
  return SPEAKING_TOPICS[nextIndex];
}
