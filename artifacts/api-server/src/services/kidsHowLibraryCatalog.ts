/** GCS folder: amynest-audio-storage / Answer to How */
export const KIDS_HOW_GCS_PREFIX = "Answer to How";

export type KidsHowLibraryEntry = {
  id: string;
  gcsPath: string;
};

/** Allow-listed PDFs — must match kidschedule kids-how-books catalog. */
export const KIDS_HOW_LIBRARY: KidsHowLibraryEntry[] = [
  { id: "did-you-know-amazing-answers", gcsPath: `${KIDS_HOW_GCS_PREFIX}/Did You Know Amazing Answers to the Questions You Ask.pdf` },
  { id: "how-clouds-are-made", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How Clouds are Made.pdf` },
  { id: "how-food-works", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How Food Works - The Facts Visually Explained.pdf` },
  { id: "how-it-works-amazing-vehicles", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Amazing Vehicles.pdf` },
  { id: "how-it-works-101-facts", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of 101 Amazing Facts You Need to Know.pdf` },
  { id: "how-it-works-amazing-animals", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Amazing Animals.pdf` },
  { id: "how-it-works-curious-questions", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Amazing Answers to Curious Questions.pdf` },
  { id: "how-it-works-elements", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Elements.pdf` },
  { id: "how-it-works-incredible-history", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of Incredible History.pdf` },
  { id: "how-it-works-human-body", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How It Works - Book of the Human Body.pdf` },
  { id: "how-things-work-encyclopedia", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How Things Work Encyclopedia.pdf` },
  { id: "how-to-be-a-genius", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Be a Genius.pdf` },
  { id: "how-to-be-a-math-genius", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Be a Math Genius.pdf` },
  { id: "how-to-make-a-better-world", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Make a Better World For Every Kid Who Wants to Make a Difference.pdf` },
  { id: "how-to-play-chess", gcsPath: `${KIDS_HOW_GCS_PREFIX}/How to Play Chess.pdf` },
];

const byId = new Map(KIDS_HOW_LIBRARY.map((b) => [b.id, b]));

export function getKidsHowLibraryEntry(bookId: string): KidsHowLibraryEntry | undefined {
  return byId.get(bookId);
}
