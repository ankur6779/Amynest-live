import type { AgeGroup, AgeGroupStory } from '../types.js';

export const STORIES_BY_GROUP: Record<AgeGroup, AgeGroupStory[]> = {
  infant: [
    {
      title: "The Gentle Sun",
      story: "Every morning, the sun rises with love to warm the earth. It doesn't shout — it just shines.",
      moral: "Love is shown through gentle presence.",
      emoji: "☀️",
    },
  ],
  toddler: [
    {
      title: "The Little Seed",
      story: "A tiny seed was buried in the ground. It was dark and lonely. But the seed was patient. Every day it drank a little water and felt a little sunlight. One day it pushed through the soil and became a beautiful flower.",
      moral: "Patience and effort lead to beautiful growth.",
      emoji: "🌱",
    },
    {
      title: "The Sharing Elephant",
      story: "Ellie the elephant had a big bag of peanuts. Her friends were hungry. She shared every last peanut and felt so happy inside — happier than when she had them all to herself!",
      moral: "Sharing brings more happiness than keeping.",
      emoji: "🐘",
    },
  ],
  preschool: [
    {
      title: "The Honest Boy",
      story: "Arjun broke a pot while playing. He was scared. But he told his mother the truth. She hugged him and said 'Thank you for being honest.' Arjun felt lighter than ever.",
      moral: "Honesty always feels better than hiding the truth.",
      emoji: "💎",
    },
    {
      title: "The Helpful Rabbit",
      story: "A rabbit found a turtle stuck under a log. The rabbit was small, but asked his friends for help. Together they moved the log. The turtle cried tears of joy.",
      moral: "Asking for help and helping others is strength.",
      emoji: "🐰",
    },
  ],
  early_school: [
    {
      title: "The Hardworking Ant",
      story: "While the grasshopper played all summer, the ant worked hard storing food. When winter came, the ant had plenty and the grasshopper had nothing. The ant shared some food but said, 'Next season, prepare early.'",
      moral: "Hard work today secures your tomorrow.",
      emoji: "🐜",
    },
    {
      title: "The Boy Who Cried Wolf",
      story: "A shepherd boy lied twice about a wolf to get attention. When a real wolf came, no one believed him. He learned his lesson the hard way.",
      moral: "Always tell the truth — once trust is broken, it's hard to rebuild.",
      emoji: "🐺",
    },
  ],
  pre_teen: [
    {
      title: "The Two Stones",
      story: "A teacher showed two stones: one rough, one smooth. 'The rough stone was untouched,' she said. 'The smooth one was polished by challenges. Every difficulty you face polishes you.' The student understood — struggle is the maker of character.",
      moral: "Challenges don't break you — they shape you.",
      emoji: "💎",
    },
    {
      title: "The Empty Jar",
      story: "A professor filled a jar with rocks, then pebbles, then sand. 'Is it full?' he asked. Yes. Then he poured in coffee. The lesson: always make room for what truly matters — family, health, values. The rest is just sand.",
      moral: "Prioritize what truly matters in life.",
      emoji: "🏺",
    },
  ],
};
