/** GCS folder: amynest-audio-storage / Answer to How */
export const KIDS_HOW_GCS_PREFIX = "Answer to How";

export type KidsHowCategory =
  | "Amazing Answers"
  | "Facts & Knowledge"
  | "Science"
  | "Nature"
  | "Animals"
  | "Human Body"
  | "History"
  | "Vehicles"
  | "Elements"
  | "Genius & Learning"
  | "Math"
  | "Chess"
  | "Better World";

export interface LearningBook {
  id: string;
  title: string;
  category: KidsHowCategory;
  description: string;
  gcsPath: string;
  coverImage?: string;
  /** Extra terms for client-side search */
  keywords: string[];
}

export const KIDS_HOW_CATEGORIES: readonly KidsHowCategory[] = [
  "Amazing Answers",
  "Facts & Knowledge",
  "Science",
  "Nature",
  "Animals",
  "Human Body",
  "History",
  "Vehicles",
  "Elements",
  "Genius & Learning",
  "Math",
  "Chess",
  "Better World",
] as const;

export const KIDS_HOW_BOOKS: LearningBook[] = [
  {
    id: "did-you-know-amazing-answers",
    title: "Did You Know Amazing Answers to the Questions You Ask",
    category: "Amazing Answers",
    description:
      "Bright answers to the curious questions children ask every day.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/Did You Know Amazing Answers to the Questions You Ask.pdf`,
    keywords: ["questions", "answers", "curious", "facts"],
  },
  {
    id: "how-clouds-are-made",
    title: "How Clouds are Made",
    category: "Science",
    description: "Discover how clouds form and float across the sky.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How Clouds are Made.pdf`,
    keywords: ["weather", "sky", "water cycle", "clouds"],
  },
  {
    id: "how-food-works",
    title: "How Food Works – The Facts Visually Explained",
    category: "Science",
    description: "See how food fuels your body with clear visual facts.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How Food Works - The Facts Visually Explained.pdf`,
    keywords: ["nutrition", "digestion", "health", "eating"],
  },
  {
    id: "how-it-works-amazing-vehicles",
    title: "How It Works – Amazing Vehicles",
    category: "Vehicles",
    description: "Explore planes, trains, cars and incredible machines.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Amazing Vehicles.pdf`,
    keywords: ["transport", "machines", "engineering", "cars"],
  },
  {
    id: "how-it-works-101-facts",
    title: "How It Works – Book of 101 Amazing Facts You Need to Know",
    category: "Facts & Knowledge",
    description: "One hundred one bite-sized facts to amaze and share.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of 101 Amazing Facts You Need to Know.pdf`,
    keywords: ["facts", "trivia", "knowledge", "101"],
  },
  {
    id: "how-it-works-amazing-animals",
    title: "How It Works – Book of Amazing Animals",
    category: "Animals",
    description: "Meet wild creatures and learn how they live and survive.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Amazing Animals.pdf`,
    keywords: ["wildlife", "zoo", "habitats", "creatures"],
  },
  {
    id: "how-it-works-curious-questions",
    title: "How It Works – Book of Amazing Answers to Curious Questions",
    category: "Amazing Answers",
    description: "Satisfy big questions with stunning explanations.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Amazing Answers to Curious Questions.pdf`,
    keywords: ["why", "how", "curious", "explained"],
  },
  {
    id: "how-it-works-elements",
    title: "How It Works – Book of Elements",
    category: "Elements",
    description: "Journey through the periodic table and what things are made of.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Elements.pdf`,
    keywords: ["chemistry", "periodic table", "atoms", "science"],
  },
  {
    id: "how-it-works-incredible-history",
    title: "How It Works – Book of Incredible History",
    category: "History",
    description: "Travel through time with epic moments from the past.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Incredible History.pdf`,
    keywords: ["ancient", "civilizations", "past", "timeline"],
  },
  {
    id: "how-it-works-human-body",
    title: "How It Works – Book of the Human Body",
    category: "Human Body",
    description: "See how muscles, bones, and organs work together.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of the Human Body.pdf`,
    keywords: ["anatomy", "health", "organs", "biology"],
  },
  {
    id: "how-things-work-encyclopedia",
    title: "How Things Work Encyclopedia",
    category: "Facts & Knowledge",
    description: "An illustrated encyclopedia of everyday inventions.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How Things Work Encyclopedia.pdf`,
    keywords: ["encyclopedia", "inventions", "everyday", "how things work"],
  },
  {
    id: "how-to-be-a-genius",
    title: "How to Be a Genius",
    category: "Genius & Learning",
    description: "Brain-boosting tricks to think creatively and learn faster.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Be a Genius.pdf`,
    keywords: ["thinking", "creativity", "brain", "learning"],
  },
  {
    id: "how-to-be-a-math-genius",
    title: "How to Be a Math Genius",
    category: "Math",
    description: "Fun math puzzles and strategies to become a number whiz.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Be a Math Genius.pdf`,
    keywords: ["numbers", "puzzles", "arithmetic", "mathematics"],
  },
  {
    id: "how-to-make-a-better-world",
    title: "How to Make a Better World",
    category: "Better World",
    description: "Ideas for kids who want to help people and the planet.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Make a Better World For Every Kid Who Wants to Make a Difference.pdf`,
    keywords: ["kindness", "environment", "community", "activism"],
  },
  {
    id: "how-to-play-chess",
    title: "How to Play Chess",
    category: "Chess",
    description: "Learn the rules, moves, and strategies of chess step by step.",
    gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Play Chess.pdf`,
    keywords: ["board game", "strategy", "checkmate", "pieces"],
  },
];

const bookById = new Map(KIDS_HOW_BOOKS.map((b) => [b.id, b]));

export function getKidsHowBook(id: string): LearningBook | undefined {
  return bookById.get(id);
}

/** API path for signed PDF preview — never expose raw GCS URLs to clients. */
export function kidsHowPreviewApiPath(bookId: string): string {
  return `/api/kids-how-library/preview-url?bookId=${encodeURIComponent(bookId)}`;
}

export function filterKidsHowBooks(
  books: LearningBook[],
  query: string,
  category: KidsHowCategory | "all",
): LearningBook[] {
  const q = query.trim().toLowerCase();
  return books.filter((book) => {
    if (category !== "all" && book.category !== category) return false;
    if (!q) return true;
    const haystack = [
      book.title,
      book.category,
      book.description,
      ...book.keywords,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}
