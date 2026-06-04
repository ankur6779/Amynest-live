export type NutritionLibraryCategory =
  | "Recipes"
  | "Meal Planning"
  | "Healthy Eating"
  | "Lactose Free"
  | "Desserts"
  | "Family Nutrition";

export type NutritionLibraryBookItem = {
  id: string;
  title: string;
  fileName: string;
  category: NutritionLibraryCategory;
  sizeBytes: number;
  sizeLabel: string;
  available?: boolean;
};

export type NutritionLibraryBooksResponse = {
  books: NutritionLibraryBookItem[];
  gcsConfigured?: boolean;
  total?: number;
};

export type NutritionLibrarySignedUrlResponse = {
  url: string;
  fileName: string;
  title: string;
  expiresAt: string;
};
