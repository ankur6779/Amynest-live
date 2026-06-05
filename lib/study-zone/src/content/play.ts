import type { PlayCategory } from "../types";

const ALPHABET_WORDS: Record<string, { word: string; emoji: string }> = {
  A: { word: "Apple",     emoji: "🍎" },
  B: { word: "Ball",      emoji: "⚽" },
  C: { word: "Cat",       emoji: "🐱" },
  D: { word: "Dog",       emoji: "🐶" },
  E: { word: "Elephant",  emoji: "🐘" },
  F: { word: "Fish",      emoji: "🐟" },
  G: { word: "Grapes",    emoji: "🍇" },
  H: { word: "Horse",     emoji: "🐴" },
  I: { word: "Ice cream", emoji: "🍦" },
  J: { word: "Juice",     emoji: "🧃" },
  K: { word: "Kite",      emoji: "🪁" },
  L: { word: "Lion",      emoji: "🦁" },
  M: { word: "Mango",     emoji: "🥭" },
  N: { word: "Nest",      emoji: "🪺" },
  O: { word: "Orange",    emoji: "🍊" },
  P: { word: "Parrot",    emoji: "🦜" },
  Q: { word: "Queen",     emoji: "👸" },
  R: { word: "Rabbit",    emoji: "🐰" },
  S: { word: "Sun",       emoji: "☀️" },
  T: { word: "Tiger",     emoji: "🐯" },
  U: { word: "Umbrella",  emoji: "☂️" },
  V: { word: "Van",       emoji: "🚐" },
  W: { word: "Watch",     emoji: "⌚" },
  X: { word: "X-ray",     emoji: "🩻" },
  Y: { word: "Yo-yo",     emoji: "🪀" },
  Z: { word: "Zebra",     emoji: "🦓" },
};

const ONES_WORDS = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];

const TENS_WORDS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

/** Speakable English number words for play tiles (1–100). */
export function numberWord(n: number): string {
  if (!Number.isFinite(n) || n < 1) return String(n);
  if (n <= 19) return ONES_WORDS[n]!;
  if (n === 100) return "One Hundred";
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return ones === 0 ? TENS_WORDS[tens]! : `${TENS_WORDS[tens]} ${ONES_WORDS[ones]}`;
  }
  return String(n);
}

const NUMBER_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export const PLAY_CATEGORIES: PlayCategory[] = [
  {
    id: "alphabets",
    title: "Alphabets",
    emoji: "🔤",
    items: Object.entries(ALPHABET_WORDS).map(([letter, { word, emoji }]) => ({
      id: letter,
      label: letter,
      speak: `${letter} for ${word}`,
      emoji,
    })),
  },
  {
    id: "numbers",
    title: "Numbers",
    emoji: "🔢",
    items: Array.from({ length: 100 }, (_, i) => {
      const n = i + 1;
      return {
        id: String(n),
        label: String(n),
        speak: numberWord(n),
        emoji: n <= 10 ? NUMBER_EMOJIS[n - 1] : undefined,
      };
    }),
  },
  {
    id: "colors",
    title: "Colors",
    emoji: "🎨",
    items: [
      { id: "red",    label: "Red",    speak: "Red",    emoji: "🔴" },
      { id: "blue",   label: "Blue",   speak: "Blue",   emoji: "🔵" },
      { id: "green",  label: "Green",  speak: "Green",  emoji: "🟢" },
      { id: "yellow", label: "Yellow", speak: "Yellow", emoji: "🟡" },
      { id: "orange", label: "Orange", speak: "Orange", emoji: "🟠" },
      { id: "purple", label: "Purple", speak: "Purple", emoji: "🟣" },
      { id: "pink",   label: "Pink",   speak: "Pink",   emoji: "🌸" },
      { id: "brown",  label: "Brown",  speak: "Brown",  emoji: "🟫" },
      { id: "black",  label: "Black",  speak: "Black",  emoji: "⚫" },
      { id: "white",  label: "White",  speak: "White",  emoji: "⚪" },
    ],
  },
  {
    id: "shapes",
    title: "Shapes",
    emoji: "🔷",
    items: [
      { id: "circle",    label: "Circle",    speak: "Circle",    emoji: "⭕" },
      { id: "square",    label: "Square",    speak: "Square",    emoji: "🟦" },
      { id: "triangle",  label: "Triangle",  speak: "Triangle",  emoji: "🔺" },
      { id: "rectangle", label: "Rectangle", speak: "Rectangle", emoji: "▭" },
      { id: "star",      label: "Star",      speak: "Star",      emoji: "⭐" },
      { id: "heart",     label: "Heart",     speak: "Heart",     emoji: "❤️" },
      { id: "diamond",   label: "Diamond",   speak: "Diamond",   emoji: "💎" },
      { id: "oval",      label: "Oval",      speak: "Oval",      emoji: "🥚" },
    ],
  },
  {
    id: "animals",
    title: "Animals",
    emoji: "🐾",
    items: [
      { id: "dog",      label: "Dog",      speak: "Dog",      emoji: "🐶" },
      { id: "cat",      label: "Cat",      speak: "Cat",      emoji: "🐱" },
      { id: "cow",      label: "Cow",      speak: "Cow",      emoji: "🐮" },
      { id: "horse",    label: "Horse",    speak: "Horse",    emoji: "🐴" },
      { id: "lion",     label: "Lion",     speak: "Lion",     emoji: "🦁" },
      { id: "tiger",    label: "Tiger",    speak: "Tiger",    emoji: "🐯" },
      { id: "elephant", label: "Elephant", speak: "Elephant", emoji: "🐘" },
      { id: "monkey",   label: "Monkey",   speak: "Monkey",   emoji: "🐵" },
      { id: "bear",     label: "Bear",     speak: "Bear",     emoji: "🐻" },
      { id: "rabbit",   label: "Rabbit",   speak: "Rabbit",   emoji: "🐰" },
      { id: "fish",     label: "Fish",     speak: "Fish",     emoji: "🐟" },
      { id: "bird",     label: "Bird",     speak: "Bird",     emoji: "🐦" },
    ],
  },
  {
    id: "fruits",
    title: "Fruits & Food",
    emoji: "🍎",
    items: [
      { id: "apple",      label: "Apple",      speak: "Apple",      emoji: "🍎" },
      { id: "banana",     label: "Banana",     speak: "Banana",     emoji: "🍌" },
      { id: "orange",     label: "Orange",     speak: "Orange",     emoji: "🍊" },
      { id: "mango",      label: "Mango",      speak: "Mango",      emoji: "🥭" },
      { id: "grapes",     label: "Grapes",     speak: "Grapes",     emoji: "🍇" },
      { id: "strawberry", label: "Strawberry", speak: "Strawberry", emoji: "🍓" },
      { id: "watermelon", label: "Watermelon", speak: "Watermelon", emoji: "🍉" },
      { id: "pineapple",  label: "Pineapple",  speak: "Pineapple",  emoji: "🍍" },
      { id: "bread",      label: "Bread",      speak: "Bread",      emoji: "🍞" },
      { id: "milk",       label: "Milk",       speak: "Milk",       emoji: "🥛" },
      { id: "rice",       label: "Rice",       speak: "Rice",       emoji: "🍚" },
      { id: "egg",        label: "Egg",        speak: "Egg",        emoji: "🥚" },
    ],
  },
  {
    id: "rhymes",
    title: "Rhymes",
    emoji: "🎵",
    items: [
      {
        id: "twinkle",
        label: "Twinkle Twinkle",
        speak: "Twinkle twinkle little star, how I wonder what you are. Up above the world so high, like a diamond in the sky.",
        emoji: "⭐",
        body: "Twinkle, twinkle, little star,\nHow I wonder what you are.\nUp above the world so high,\nLike a diamond in the sky.",
      },
      {
        id: "baa-baa",
        label: "Baa Baa Black Sheep",
        speak: "Baa baa black sheep, have you any wool? Yes sir, yes sir, three bags full.",
        emoji: "🐑",
        body: "Baa baa black sheep, have you any wool?\nYes sir, yes sir, three bags full.\nOne for the master, one for the dame,\nAnd one for the little boy who lives down the lane.",
      },
      {
        id: "humpty",
        label: "Humpty Dumpty",
        speak: "Humpty Dumpty sat on a wall. Humpty Dumpty had a great fall.",
        emoji: "🥚",
        body: "Humpty Dumpty sat on a wall,\nHumpty Dumpty had a great fall.\nAll the king's horses and all the king's men\nCouldn't put Humpty together again.",
      },
      {
        id: "jack-jill",
        label: "Jack and Jill",
        speak: "Jack and Jill went up the hill to fetch a pail of water.",
        emoji: "👫",
        body: "Jack and Jill went up the hill\nTo fetch a pail of water.\nJack fell down and broke his crown,\nAnd Jill came tumbling after.",
      },
      {
        id: "wheels",
        label: "Wheels on the Bus",
        speak: "The wheels on the bus go round and round, round and round, round and round, all through the town.",
        emoji: "🚌",
        body: "The wheels on the bus go round and round,\nRound and round, round and round.\nThe wheels on the bus go round and round,\nAll through the town.",
      },
      {
        id: "old-macdonald",
        label: "Old MacDonald",
        speak: "Old MacDonald had a farm, E I E I O.",
        emoji: "🚜",
        body: "Old MacDonald had a farm, E I E I O.\nAnd on his farm he had a cow, E I E I O.\nWith a moo moo here and a moo moo there.",
      },
      {
        id: "mary",
        label: "Mary Had a Little Lamb",
        speak: "Mary had a little lamb, its fleece was white as snow.",
        emoji: "🐑",
        body: "Mary had a little lamb,\nIts fleece was white as snow.\nAnd everywhere that Mary went,\nThe lamb was sure to go.",
      },
      {
        id: "incy",
        label: "Incy Wincy Spider",
        speak: "Incy wincy spider climbed up the water spout. Down came the rain and washed the spider out.",
        emoji: "🕷️",
        body: "Incy wincy spider climbed up the water spout.\nDown came the rain and washed the spider out.\nOut came the sun and dried up all the rain,\nAnd incy wincy spider climbed up the spout again.",
      },
      {
        id: "row-boat",
        label: "Row Your Boat",
        speak: "Row, row, row your boat, gently down the stream.",
        emoji: "🚣",
        body: "Row, row, row your boat,\nGently down the stream.\nMerrily, merrily, merrily, merrily,\nLife is but a dream.",
      },
      {
        id: "rain-rain",
        label: "Rain Rain Go Away",
        speak: "Rain rain go away, come again another day.",
        emoji: "🌧️",
        body: "Rain rain go away,\nCome again another day.\nLittle Johnny wants to play,\nRain rain go away.",
      },
    ],
  },
];
