/** GCS folder for Nutrition Library PDFs (amynest-audio-storage). */
export const NUTRITION_LIBRARY_GCS_PREFIX = "nutrition-hub/books";

export type NutritionLibraryCategory =
  | "Recipes"
  | "Meal Planning"
  | "Healthy Eating"
  | "Lactose Free"
  | "Desserts"
  | "Family Nutrition";

export type NutritionLibraryBook = {
  id: string;
  title: string;
  fileName: string;
  category: NutritionLibraryCategory;
  sizeBytes: number;
  sizeLabel: string;
};

export const NUTRITION_LIBRARY_BOOKS: NutritionLibraryBook[] = [
  {
    id: "30-minute-meals",
    title: "30-Minute Meals",
    fileName: "30-Minute Meals.pdf",
    category: "Meal Planning",
    sizeBytes: 11_300_000,
    sizeLabel: "11.3 MB",
  },
  {
    id: "delicious-recipe-ebook",
    title: "Delicious Recipe Ebook",
    fileName: "Delicious Recipe ebook.pdf",
    category: "Recipes",
    sizeBytes: 8_000_000,
    sizeLabel: "8 MB",
  },
  {
    id: "easy-weeknight-meals",
    title: "Easy Weeknight Meals",
    fileName: "Easy Weeknight Meals.pdf",
    category: "Meal Planning",
    sizeBytes: 11_400_000,
    sizeLabel: "11.4 MB",
  },
  {
    id: "everyday-easy-recipes",
    title: "Everyday Easy Recipes",
    fileName: "Everyday Easy Recipes.pdf",
    category: "Recipes",
    sizeBytes: 9_500_000,
    sizeLabel: "9.5 MB",
  },
  {
    id: "healthy-eating-habits",
    title: "Healthy Eating Habits",
    fileName: "Healthy Eating Habits.pdf",
    category: "Healthy Eating",
    sizeBytes: 7_900_000,
    sizeLabel: "7.9 MB",
  },
  {
    id: "healthy-recipes-ebook",
    title: "Healthy Recipes Ebook",
    fileName: "Healthy Recipes Ebook.pdf",
    category: "Recipes",
    sizeBytes: 14_100_000,
    sizeLabel: "14.1 MB",
  },
  {
    id: "lactose-free-recipes",
    title: "Lactose-Free Recipes",
    fileName: "Lactose-Free Recipes.pdf",
    category: "Lactose Free",
    sizeBytes: 68_600_000,
    sizeLabel: "68.6 MB",
  },
  {
    id: "simple-home-cooking",
    title: "Simple Home Cooking",
    fileName: "Simple Home Cooking.pdf",
    category: "Recipes",
    sizeBytes: 10_400_000,
    sizeLabel: "10.4 MB",
  },
  {
    id: "sourdough-starter-guide",
    title: "Sourdough Starter Guide",
    fileName: "Sourdough Starter Guide.pdf",
    category: "Family Nutrition",
    sizeBytes: 10_700_000,
    sizeLabel: "10.7 MB",
  },
  {
    id: "sugar-free-dessert-recipes",
    title: "Sugar-Free Dessert Recipes",
    fileName: "Sugar-Free Dessert Recipes.pdf",
    category: "Desserts",
    sizeBytes: 13_900_000,
    sizeLabel: "13.9 MB",
  },
];

const byFileName = new Map(
  NUTRITION_LIBRARY_BOOKS.map((b) => [b.fileName, b]),
);

export function getNutritionLibraryBookByFileName(
  fileName: string,
): NutritionLibraryBook | undefined {
  return byFileName.get(fileName);
}

/** Candidate object keys — supports legacy uploads under `Nutrition Hub/`. */
export function nutritionLibraryGcsCandidates(fileName: string): string[] {
  const copyPrefix = fileName.startsWith("Copy of ")
    ? fileName
    : `Copy of ${fileName}`;
  return [
    `${NUTRITION_LIBRARY_GCS_PREFIX}/${fileName}`,
    `Nutrition Hub/${fileName}`,
    `Nutrition Hub/${copyPrefix}`,
  ];
}
