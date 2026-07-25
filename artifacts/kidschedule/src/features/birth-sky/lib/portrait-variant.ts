/**
 * Resolve Amy Girl / Amy Boy portrait variant from the child's name.
 * Deterministic — no backend fields required.
 */

const BOY_NAMES = new Set(
  [
    "john",
    "james",
    "liam",
    "noah",
    "oliver",
    "elijah",
    "lucas",
    "mason",
    "ethan",
    "logan",
    "aiden",
    "arjun",
    "aarav",
    "vihaan",
    "kabir",
    "reyansh",
    "advait",
    "ishaan",
    "rohan",
    "vikram",
    "alex",
    "max",
    "leo",
    "jack",
    "harry",
    "samuel",
    "benjamin",
    "henry",
    "william",
    "michael",
    "daniel",
    "matthew",
    "david",
    "joseph",
    "thomas",
    "ryan",
    "jay",
    "raj",
    "dev",
    "om",
    "adi",
    "veer",
    "neil",
    "sam",
    "ben",
    "joe",
    "tom",
    "child 2",
    "child 3",
    "child 5",
  ].map((n) => n.toLowerCase()),
);

const GIRL_NAMES = new Set(
  [
    "amy",
    "emma",
    "olivia",
    "ava",
    "sophia",
    "isabella",
    "mia",
    "charlotte",
    "amelia",
    "harper",
    "aanya",
    "anaya",
    "kiara",
    "myra",
    "sara",
    "zara",
    "priya",
    "meera",
    "diya",
    "isha",
    "luna",
    "aria",
    "ella",
    "grace",
    "lily",
    "chloe",
    "sofia",
    "aisha",
    "nina",
    "maya",
    "riya",
    "anika",
  ].map((n) => n.toLowerCase()),
);

export type AmyPortraitVariant = "girl" | "boy";

function hashName(name: string): number {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Pick a stable Amy Girl / Amy Boy portrait for this child. */
export function resolveAmyPortraitVariant(childName: string): AmyPortraitVariant {
  const key = childName.trim().toLowerCase();
  if (!key) return "girl";
  if (BOY_NAMES.has(key)) return "boy";
  if (GIRL_NAMES.has(key)) return "girl";
  // Heuristic endings common in English / Indic diminutives
  if (/(a|i|y|ee|ah)$/i.test(key) && !/(jay|ray|roy|guy)$/i.test(key)) {
    return "girl";
  }
  if (/(an|en|on|am|im|ar|er|o)$/i.test(key)) {
    return "boy";
  }
  return hashName(key) % 2 === 0 ? "girl" : "boy";
}
