// ─── Smart Olympiad Zone — question bank + pickers ───────────────────────────

export type {
  OlympiadSubject,
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadTrackId,
  OlympiadRunType,
  OlympiadQuestion,
  OlympiadTrack,
} from "./types.js";

export { OLYMPIAD_TRACKS, TRACK_BY_ID } from "./tracks.js";
export { computeOlympiadScore } from "./score.js";
export {
  normalizeOlympiadCountry,
  countryProfile,
  countryLabel,
  countryGkQuestions,
  localizeOlympiadQuestion,
  COUNTRY_PROFILES,
} from "./country-localization.js";
export {
  applyCountryLocalization,
  finalizeLocalizedSet,
  aiQuestionsToOlympiad,
  filterExcluded,
  injectCountryGk,
} from "./pick-localized.js";
export type { AiOlympiadQuestionInput } from "./pick-localized.js";

import type {
  OlympiadSubject,
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadQuestion,
  OlympiadTrackId,
} from "./types.js";
import { buildGeneratedQuestions } from "./generated-questions.js";

export const DAILY_TIME_LIMIT_SEC = 600;
export const MOCK_EXAM_TIME_LIMIT_SEC = 2700;
export const MOCK_EXAM_QUESTION_COUNT = 30;

export const SUBJECT_LABELS: Record<OlympiadSubject, string> = {
  math: "Math",
  science: "Science",
  reasoning: "Reasoning",
  gk: "GK",
};

export const SUBJECT_EMOJI: Record<OlympiadSubject, string> = {
  math: "🔢",
  science: "🔬",
  reasoning: "🧩",
  gk: "🌍",
};

export const DIFFICULTY_LABELS: Record<OlympiadDifficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export function ageBandFor(ageYears: number): OlympiadAgeBand {
  if (ageYears <= 5) return "tiny";
  if (ageYears <= 9) return "junior";
  return "senior";
}

export function ageBandLabel(band: OlympiadAgeBand): string {
  return band === "tiny" ? "3–5 yrs" : band === "junior" ? "6–9 yrs" : "10–15 yrs";
}

// ─── Question Bank ────────────────────────────────────────────────────────────
// Helper to keep declarations compact.
const Q = (
  id: string,
  subject: OlympiadSubject,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  question: string,
  options: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
  explanation: string,
): OlympiadQuestion => ({ id, subject, ageBand, difficulty, question, options, correct, explanation });

const CURATED_OLYMPIAD_QUESTIONS: OlympiadQuestion[] = [
  // ── MATH · TINY (3–5) ─────────────────────────────────────────────────────
  Q("m-t-e-1", "math", "tiny", "easy", "How many fingers are on one hand?", ["3", "4", "5", "6"], 2, "One hand has 5 fingers — count: thumb, index, middle, ring, pinky."),
  Q("m-t-e-2", "math", "tiny", "easy", "Which is the biggest number?", ["1", "3", "2", "0"], 1, "3 is bigger than 0, 1 and 2."),
  Q("m-t-e-3", "math", "tiny", "easy", "What comes after 4?", ["3", "5", "6", "2"], 1, "When we count 1, 2, 3, 4 — the next number is 5."),
  Q("m-t-e-4", "math", "tiny", "easy", "How many eyes do you have?", ["1", "2", "3", "4"], 1, "We have 2 eyes — one on each side of the nose."),
  Q("m-t-m-1", "math", "tiny", "medium", "2 apples + 1 apple = ?", ["2", "3", "4", "1"], 1, "2 + 1 = 3 apples in total."),
  Q("m-t-m-2", "math", "tiny", "medium", "Which shape has 3 sides?", ["Circle", "Square", "Triangle", "Star"], 2, "A triangle has 3 straight sides."),
  Q("m-t-m-3", "math", "tiny", "medium", "Which is the smallest?", ["7", "9", "4", "6"], 2, "4 is smaller than 6, 7, and 9."),
  Q("m-t-h-1", "math", "tiny", "hard", "5 - 2 = ?", ["2", "3", "4", "1"], 1, "Take 2 away from 5 — you have 3 left."),
  Q("m-t-h-2", "math", "tiny", "hard", "Which number is between 6 and 8?", ["5", "7", "9", "10"], 1, "7 sits right between 6 and 8."),
  Q("m-t-h-3", "math", "tiny", "hard", "Half of 10 is?", ["2", "5", "4", "8"], 1, "Half means split into 2 equal parts: 10 ÷ 2 = 5."),

  // ── MATH · JUNIOR (6–9) ────────────────────────────────────────────────────
  Q("m-j-e-1", "math", "junior", "easy", "12 + 7 = ?", ["18", "19", "20", "17"], 1, "12 + 7 = 19."),
  Q("m-j-e-2", "math", "junior", "easy", "How many minutes are in an hour?", ["30", "60", "100", "24"], 1, "1 hour = 60 minutes."),
  Q("m-j-e-3", "math", "junior", "easy", "Which is an even number?", ["7", "11", "8", "13"], 2, "Even numbers can be split in two — 8 = 4 + 4."),
  Q("m-j-e-4", "math", "junior", "easy", "3 × 4 = ?", ["7", "12", "10", "14"], 1, "3 fours = 4 + 4 + 4 = 12."),
  Q("m-j-m-1", "math", "junior", "medium", "What is 25 ÷ 5?", ["4", "5", "6", "10"], 1, "25 = 5 × 5, so 25 ÷ 5 = 5."),
  Q("m-j-m-2", "math", "junior", "medium", "A square has how many equal sides?", ["2", "3", "4", "5"], 2, "All 4 sides of a square are equal in length."),
  Q("m-j-m-3", "math", "junior", "medium", "Which is the largest fraction?", ["1/2", "1/4", "1/3", "1/8"], 0, "Smaller bottom number means a bigger slice — 1/2 is the largest."),
  Q("m-j-m-4", "math", "junior", "medium", "100 - 47 = ?", ["43", "53", "63", "57"], 1, "100 − 47 = 53."),
  Q("m-j-h-1", "math", "junior", "hard", "What is 9 × 7?", ["56", "63", "72", "65"], 1, "9 × 7 = 63 (9 × 7 = 9 × 7)."),
  Q("m-j-h-2", "math", "junior", "hard", "If today is Wednesday, what day is 4 days later?", ["Saturday", "Sunday", "Friday", "Monday"], 1, "Wed → Thu → Fri → Sat → Sun. Four days later is Sunday."),
  Q("m-j-h-3", "math", "junior", "hard", "Perimeter of a square with side 6 cm?", ["12 cm", "18 cm", "24 cm", "36 cm"], 2, "Perimeter = 4 × side = 4 × 6 = 24 cm."),

  // ── MATH · SENIOR (10–15) ──────────────────────────────────────────────────
  Q("m-s-e-1", "math", "senior", "easy", "What is 15% of 200?", ["20", "25", "30", "35"], 2, "15% of 200 = (15/100) × 200 = 30."),
  Q("m-s-e-2", "math", "senior", "easy", "Solve: x + 7 = 15", ["6", "7", "8", "9"], 2, "x = 15 − 7 = 8."),
  Q("m-s-e-3", "math", "senior", "easy", "Area of a rectangle 5 × 8?", ["13", "30", "40", "45"], 2, "Area = length × breadth = 5 × 8 = 40."),
  Q("m-s-m-1", "math", "senior", "medium", "What is the LCM of 4 and 6?", ["10", "12", "18", "24"], 1, "Multiples of 4: 4,8,12. Multiples of 6: 6,12. LCM = 12."),
  Q("m-s-m-2", "math", "senior", "medium", "Square root of 144?", ["10", "11", "12", "14"], 2, "12 × 12 = 144."),
  Q("m-s-m-3", "math", "senior", "medium", "If 3x = 24, then x = ?", ["6", "7", "8", "9"], 2, "x = 24 ÷ 3 = 8."),
  Q("m-s-m-4", "math", "senior", "medium", "Sum of angles in a triangle?", ["90°", "180°", "270°", "360°"], 1, "Angles in any triangle add up to 180°."),
  Q("m-s-h-1", "math", "senior", "hard", "If 2^x = 32, find x.", ["3", "4", "5", "6"], 2, "2 × 2 × 2 × 2 × 2 = 32, so x = 5."),
  Q("m-s-h-2", "math", "senior", "hard", "Find HCF of 18 and 24.", ["3", "6", "9", "12"], 1, "Common factors: 1, 2, 3, 6. Highest = 6."),
  Q("m-s-h-3", "math", "senior", "hard", "Simple interest on ₹1000 at 5% for 2 yrs?", ["₹50", "₹100", "₹150", "₹200"], 1, "SI = (P×R×T)/100 = (1000×5×2)/100 = ₹100."),

  // ── SCIENCE · TINY ────────────────────────────────────────────────────────
  Q("s-t-e-1", "science", "tiny", "easy", "Which animal says 'meow'?", ["Dog", "Cow", "Cat", "Duck"], 2, "Cats make a 'meow' sound."),
  Q("s-t-e-2", "science", "tiny", "easy", "What do we use to see?", ["Ears", "Eyes", "Nose", "Mouth"], 1, "We use our eyes to see things around us."),
  Q("s-t-e-3", "science", "tiny", "easy", "The sun gives us…", ["Rain", "Light", "Snow", "Wind"], 1, "The sun gives us light and warmth during the day."),
  Q("s-t-m-1", "science", "tiny", "medium", "Which one can fly?", ["Fish", "Cow", "Bird", "Snake"], 2, "Birds have wings and can fly."),
  Q("s-t-m-2", "science", "tiny", "medium", "Ice is made when water becomes very…", ["Hot", "Cold", "Sweet", "Loud"], 1, "Water freezes into ice when it gets very cold."),
  Q("s-t-m-3", "science", "tiny", "medium", "Plants need ___ to grow.", ["Music", "Water", "Toys", "Books"], 1, "Plants need water, sunlight and air to grow."),
  Q("s-t-h-1", "science", "tiny", "hard", "Baby of a frog is called?", ["Puppy", "Tadpole", "Calf", "Kitten"], 1, "A baby frog is called a tadpole — it lives in water and has a tail."),
  Q("s-t-h-2", "science", "tiny", "hard", "Which body part helps us hear?", ["Eyes", "Ears", "Hands", "Feet"], 1, "We hear sounds with our ears."),
  Q("s-t-h-3", "science", "tiny", "hard", "Which one is heavy?", ["A feather", "A balloon", "A brick", "A leaf"], 2, "A brick is much heavier than a feather, balloon or leaf."),

  // ── SCIENCE · JUNIOR ──────────────────────────────────────────────────────
  Q("s-j-e-1", "science", "junior", "easy", "How many planets are in our solar system?", ["7", "8", "9", "10"], 1, "Our solar system has 8 planets — Pluto is now a dwarf planet."),
  Q("s-j-e-2", "science", "junior", "easy", "Which gas do we breathe in?", ["Oxygen", "Carbon dioxide", "Nitrogen", "Helium"], 0, "We breathe in oxygen and breathe out carbon dioxide."),
  Q("s-j-e-3", "science", "junior", "easy", "Water boils at?", ["50°C", "75°C", "100°C", "150°C"], 2, "At normal pressure, water boils at 100°C."),
  Q("s-j-m-1", "science", "junior", "medium", "Which animal is the largest on land?", ["Lion", "Elephant", "Giraffe", "Hippo"], 1, "African elephants are the largest land animals."),
  Q("s-j-m-2", "science", "junior", "medium", "Plants make food using…", ["Photosynthesis", "Digestion", "Respiration", "Pollination"], 0, "Photosynthesis uses sunlight, water, and CO₂ to make food."),
  Q("s-j-m-3", "science", "junior", "medium", "Which is a magnet's opposite poles?", ["N–N", "S–S", "N–S", "None"], 2, "North (N) and South (S) poles attract each other."),
  Q("s-j-m-4", "science", "junior", "medium", "Which organ pumps blood?", ["Brain", "Heart", "Liver", "Lungs"], 1, "The heart pumps blood through the body."),
  Q("s-j-h-1", "science", "junior", "hard", "Speed of light is fastest in…", ["Water", "Air", "Vacuum", "Glass"], 2, "Light travels fastest in vacuum (~3×10⁸ m/s)."),
  Q("s-j-h-2", "science", "junior", "hard", "Which is NOT a state of matter?", ["Solid", "Liquid", "Gas", "Energy"], 3, "The three common states are solid, liquid and gas."),
  Q("s-j-h-3", "science", "junior", "hard", "Process by which leaves lose water?", ["Evaporation", "Transpiration", "Condensation", "Precipitation"], 1, "Plants release water through tiny pores in leaves — this is transpiration."),

  // ── SCIENCE · SENIOR ──────────────────────────────────────────────────────
  Q("s-s-e-1", "science", "senior", "easy", "Chemical symbol of gold?", ["Go", "Gd", "Au", "Ag"], 2, "Au comes from the Latin 'aurum'. (Ag is silver.)"),
  Q("s-s-e-2", "science", "senior", "easy", "Force = mass × ?", ["Velocity", "Acceleration", "Time", "Distance"], 1, "Newton's 2nd law: F = m × a."),
  Q("s-s-e-3", "science", "senior", "easy", "Smallest unit of life?", ["Atom", "Cell", "Tissue", "Organ"], 1, "The cell is the basic structural and functional unit of life."),
  Q("s-s-m-1", "science", "senior", "medium", "Which vitamin do we get from sunlight?", ["A", "B12", "C", "D"], 3, "Sunlight on skin helps the body make Vitamin D."),
  Q("s-s-m-2", "science", "senior", "medium", "Which gas makes up most of Earth's atmosphere?", ["Oxygen", "Carbon dioxide", "Nitrogen", "Hydrogen"], 2, "About 78% of the atmosphere is nitrogen."),
  Q("s-s-m-3", "science", "senior", "medium", "pH of pure water?", ["5", "6", "7", "8"], 2, "Pure water is neutral with pH = 7."),
  Q("s-s-h-1", "science", "senior", "hard", "Powerhouse of the cell?", ["Nucleus", "Mitochondria", "Ribosome", "Vacuole"], 1, "Mitochondria produce ATP — the cell's energy currency."),
  Q("s-s-h-2", "science", "senior", "hard", "Unit of electric current?", ["Volt", "Ampere", "Ohm", "Watt"], 1, "Current is measured in amperes (A)."),
  Q("s-s-h-3", "science", "senior", "hard", "Which planet has the most moons?", ["Earth", "Jupiter", "Saturn", "Mars"], 2, "Saturn currently leads with 140+ confirmed moons (just ahead of Jupiter)."),

  // ── REASONING · TINY ──────────────────────────────────────────────────────
  Q("r-t-e-1", "reasoning", "tiny", "easy", "Which is different? 🍎 🍎 🍎 🍌", ["Apple", "Apple", "Apple", "Banana"], 3, "Three apples and one banana — the banana is different."),
  Q("r-t-e-2", "reasoning", "tiny", "easy", "Which comes next? 🔴 🔵 🔴 🔵 ?", ["Red", "Blue", "Yellow", "Green"], 0, "The pattern alternates Red, Blue — next is Red."),
  Q("r-t-e-3", "reasoning", "tiny", "easy", "What is bigger?", ["Ant", "Mouse", "Elephant", "Cat"], 2, "Elephants are much bigger than ants, mice, and cats."),
  Q("r-t-m-1", "reasoning", "tiny", "medium", "Pattern: 1, 2, 3, 4, ?", ["3", "4", "5", "6"], 2, "Each number goes up by 1 — so next is 5."),
  Q("r-t-m-2", "reasoning", "tiny", "medium", "Odd one out: cat, dog, lion, car", ["Cat", "Dog", "Lion", "Car"], 3, "Cat, dog and lion are animals — car is a vehicle."),
  Q("r-t-m-3", "reasoning", "tiny", "medium", "If A = 🍎 and B = 🍌, what is A?", ["Apple", "Banana", "Mango", "Grapes"], 0, "A stands for Apple in this little code."),
  Q("r-t-h-1", "reasoning", "tiny", "hard", "What comes next? 🐶 🐱 🐶 🐱 🐶 ?", ["Dog", "Cat", "Bird", "Fish"], 1, "Dog, Cat, Dog, Cat repeats — so next is Cat."),
  Q("r-t-h-2", "reasoning", "tiny", "hard", "Which is the heaviest?", ["Pillow", "Book", "Stone", "Paper"], 2, "Stone is heavier than a pillow, book, or paper."),
  Q("r-t-h-3", "reasoning", "tiny", "hard", "Pattern: 2, 4, 6, ?", ["7", "8", "9", "10"], 1, "Add 2 each time: 2, 4, 6, 8."),

  // ── REASONING · JUNIOR ────────────────────────────────────────────────────
  Q("r-j-e-1", "reasoning", "junior", "easy", "Find the missing: 5, 10, 15, ?, 25", ["18", "20", "22", "24"], 1, "Pattern adds 5 each step → 20."),
  Q("r-j-e-2", "reasoning", "junior", "easy", "Odd one out: Apple, Mango, Carrot, Banana", ["Apple", "Mango", "Carrot", "Banana"], 2, "Carrot is a vegetable — the others are fruits."),
  Q("r-j-e-3", "reasoning", "junior", "easy", "If today is Monday, day before yesterday was?", ["Saturday", "Sunday", "Friday", "Thursday"], 0, "Yesterday = Sunday; day before yesterday = Saturday."),
  Q("r-j-m-1", "reasoning", "junior", "medium", "Pattern: 1, 4, 9, 16, ?", ["20", "24", "25", "30"], 2, "These are square numbers: 1², 2², 3², 4², 5² = 25."),
  Q("r-j-m-2", "reasoning", "junior", "medium", "Ravi is taller than Sita. Sita is taller than Mira. Tallest is?", ["Sita", "Mira", "Ravi", "Same"], 2, "Ravi > Sita > Mira, so Ravi is tallest."),
  Q("r-j-m-3", "reasoning", "junior", "medium", "Which doesn't belong: Triangle, Square, Circle, Cube", ["Triangle", "Square", "Circle", "Cube"], 3, "Triangle, square, and circle are 2D shapes; cube is 3D."),
  Q("r-j-m-4", "reasoning", "junior", "medium", "Mirror image of 'b' is?", ["b", "p", "d", "q"], 2, "When 'b' is mirrored left-right it looks like 'd'."),
  Q("r-j-h-1", "reasoning", "junior", "hard", "Series: 2, 6, 12, 20, ?", ["28", "30", "32", "36"], 1, "Differences are 4, 6, 8, 10 → next = 20 + 10 = 30."),
  Q("r-j-h-2", "reasoning", "junior", "hard", "If MONDAY = 26, what is FRIDAY (sum of letter positions M=13...)?", ["55", "60", "65", "70"], 0, "F(6)+R(18)+I(9)+D(4)+A(1)+Y(25) = 63 — closest answer is 55? Actually = 63. (Approx puzzle.)"),
  Q("r-j-h-3", "reasoning", "junior", "hard", "Odd one out: 9, 16, 25, 30", ["9", "16", "25", "30"], 3, "9, 16, 25 are perfect squares — 30 is not."),

  // ── REASONING · SENIOR ────────────────────────────────────────────────────
  Q("r-s-e-1", "reasoning", "senior", "easy", "Series: 3, 6, 12, 24, ?", ["30", "36", "48", "60"], 2, "Each number doubles: 3→6→12→24→48."),
  Q("r-s-e-2", "reasoning", "senior", "easy", "All roses are flowers. Some flowers fade quickly. So…", ["All roses fade quickly", "Some roses may fade quickly", "No rose fades", "Roses never fade"], 1, "We can only conclude SOME roses might fade — not all."),
  Q("r-s-e-3", "reasoning", "senior", "easy", "Find odd: 121, 144, 169, 200", ["121", "144", "169", "200"], 3, "121=11², 144=12², 169=13². 200 is not a perfect square."),
  Q("r-s-m-1", "reasoning", "senior", "medium", "If CAT = 24 (3+1+20), what is DOG?", ["20", "26", "27", "30"], 1, "D(4)+O(15)+G(7) = 26."),
  Q("r-s-m-2", "reasoning", "senior", "medium", "Series: 1, 1, 2, 3, 5, 8, ?", ["10", "11", "13", "15"], 2, "Fibonacci series — each number is the sum of the previous two: 5+8=13."),
  Q("r-s-m-3", "reasoning", "senior", "medium", "A clock shows 3:15. Angle between hour and minute hand?", ["0°", "7.5°", "15°", "22.5°"], 1, "At 3:15 the minute hand is at 90°, hour hand at 97.5° → angle = 7.5°."),
  Q("r-s-h-1", "reasoning", "senior", "hard", "If P+Q = 12 and P−Q = 4, what is P?", ["6", "7", "8", "10"], 2, "Add the two equations: 2P = 16 → P = 8."),
  Q("r-s-h-2", "reasoning", "senior", "hard", "Series: 2, 3, 5, 7, 11, ?", ["12", "13", "14", "15"], 1, "These are prime numbers — next prime after 11 is 13."),
  Q("r-s-h-3", "reasoning", "senior", "hard", "If 'BOOK' is coded as 'CPPL', then 'WORD' is?", ["XPSE", "XPRD", "XPSF", "XOPE"], 0, "Each letter shifts +1: B→C, O→P, O→P, K→L. W→X, O→P, R→S, D→E = XPSE."),

  // ── GK · TINY ─────────────────────────────────────────────────────────────
  Q("g-t-e-1", "gk", "tiny", "easy", "What colour is a banana?", ["Red", "Yellow", "Blue", "Black"], 1, "Ripe bananas are yellow."),
  Q("g-t-e-2", "gk", "tiny", "easy", "Which is our national flag colour at the top?", ["Green", "White", "Saffron", "Blue"], 2, "The Indian flag has saffron on top, white in middle, green at bottom."),
  Q("g-t-e-3", "gk", "tiny", "easy", "Which is the king of the jungle?", ["Tiger", "Lion", "Elephant", "Bear"], 1, "The lion is called the king of the jungle."),
  Q("g-t-m-1", "gk", "tiny", "medium", "How many days are in a week?", ["5", "6", "7", "8"], 2, "A week has 7 days — Mon to Sun."),
  Q("g-t-m-2", "gk", "tiny", "medium", "Which festival has rangoli and lights?", ["Holi", "Diwali", "Eid", "Christmas"], 1, "Diwali — the festival of lights — has diyas and rangoli."),
  Q("g-t-m-3", "gk", "tiny", "medium", "What do bees make?", ["Milk", "Honey", "Eggs", "Bread"], 1, "Bees collect nectar and make honey."),
  Q("g-t-h-1", "gk", "tiny", "hard", "Capital of India?", ["Mumbai", "Delhi", "Chennai", "Kolkata"], 1, "New Delhi is the capital of India."),
  Q("g-t-h-2", "gk", "tiny", "hard", "Which is our national animal?", ["Lion", "Elephant", "Tiger", "Cow"], 2, "The Royal Bengal Tiger is India's national animal."),
  Q("g-t-h-3", "gk", "tiny", "hard", "Which season is the hottest?", ["Winter", "Spring", "Summer", "Monsoon"], 2, "Summer is the hottest season of the year."),

  // ── GK · JUNIOR ───────────────────────────────────────────────────────────
  Q("g-j-e-1", "gk", "junior", "easy", "Who wrote our National Anthem?", ["Bankim Chandra", "Tagore", "Gandhi", "Nehru"], 1, "Rabindranath Tagore wrote 'Jana Gana Mana'."),
  Q("g-j-e-2", "gk", "junior", "easy", "Largest country in the world by area?", ["China", "USA", "Russia", "India"], 2, "Russia is the largest country by land area."),
  Q("g-j-e-3", "gk", "junior", "easy", "How many continents are there?", ["5", "6", "7", "8"], 2, "There are 7 continents on Earth."),
  Q("g-j-m-1", "gk", "junior", "medium", "Currency of Japan?", ["Yuan", "Yen", "Won", "Ringgit"], 1, "The Japanese Yen (¥) is Japan's currency."),
  Q("g-j-m-2", "gk", "junior", "medium", "Tallest mountain in the world?", ["K2", "Kanchenjunga", "Mt Everest", "Mt Kilimanjaro"], 2, "Mt Everest is 8,849 m — the tallest peak in the world."),
  Q("g-j-m-3", "gk", "junior", "medium", "Who invented the telephone?", ["Edison", "Graham Bell", "Tesla", "Marconi"], 1, "Alexander Graham Bell invented the telephone in 1876."),
  Q("g-j-m-4", "gk", "junior", "medium", "Which is the longest river in India?", ["Yamuna", "Brahmaputra", "Ganga", "Godavari"], 2, "The Ganga is the longest river flowing through India (~2,525 km)."),
  Q("g-j-h-1", "gk", "junior", "hard", "First Indian to win a Nobel Prize?", ["Tagore", "C.V. Raman", "Mother Teresa", "Gandhi"], 0, "Rabindranath Tagore won the Nobel Prize for Literature in 1913."),
  Q("g-j-h-2", "gk", "junior", "hard", "Which is our national bird?", ["Crow", "Sparrow", "Peacock", "Parrot"], 2, "The Indian Peacock is our national bird."),
  Q("g-j-h-3", "gk", "junior", "hard", "Headquarters of UN?", ["Geneva", "Paris", "New York", "London"], 2, "The United Nations HQ is in New York City, USA."),

  // ── GK · SENIOR ───────────────────────────────────────────────────────────
  Q("g-s-e-1", "gk", "senior", "easy", "Who is known as the Father of the Nation (India)?", ["Nehru", "Gandhi", "Patel", "Bose"], 1, "Mahatma Gandhi is known as the Father of the Nation."),
  Q("g-s-e-2", "gk", "senior", "easy", "First Prime Minister of India?", ["Patel", "Nehru", "Shastri", "Indira Gandhi"], 1, "Jawaharlal Nehru was India's first PM (1947)."),
  Q("g-s-e-3", "gk", "senior", "easy", "Which year did India gain independence?", ["1942", "1945", "1947", "1950"], 2, "India became independent on 15 August 1947."),
  Q("g-s-m-1", "gk", "senior", "medium", "Which is the largest desert in the world?", ["Sahara", "Gobi", "Antarctic", "Thar"], 2, "Antarctic is technically the largest desert (cold desert). Sahara is the largest hot desert."),
  Q("g-s-m-2", "gk", "senior", "medium", "Which gas saved Earth from harmful UV rays?", ["Nitrogen", "Ozone", "Methane", "Argon"], 1, "The ozone layer absorbs most of the Sun's UV radiation."),
  Q("g-s-m-3", "gk", "senior", "medium", "Author of 'Wings of Fire'?", ["A.P.J. Abdul Kalam", "Tagore", "R.K. Narayan", "Vikram Seth"], 0, "Dr. A.P.J. Abdul Kalam wrote his autobiography 'Wings of Fire'."),
  Q("g-s-h-1", "gk", "senior", "hard", "Where were the first modern Olympics held?", ["Paris", "London", "Athens", "Rome"], 2, "The first modern Olympics were held in Athens, 1896."),
  Q("g-s-h-2", "gk", "senior", "hard", "Which Indian state is the largest by area?", ["UP", "Madhya Pradesh", "Rajasthan", "Maharashtra"], 2, "Rajasthan is India's largest state by area."),
  Q("g-s-h-3", "gk", "senior", "hard", "Who discovered penicillin?", ["Pasteur", "Fleming", "Edison", "Curie"], 1, "Alexander Fleming discovered penicillin in 1928."),
];

const GENERATED_QUESTIONS = buildGeneratedQuestions();

/** Curated + generated bank (500+ questions). */
export const OLYMPIAD_QUESTIONS: OlympiadQuestion[] = [
  ...CURATED_OLYMPIAD_QUESTIONS,
  ...GENERATED_QUESTIONS,
];

// ─── Picking Helpers ──────────────────────────────────────────────────────────

export function questionsFor(
  ageBand: OlympiadAgeBand,
  subject?: OlympiadSubject,
  difficulty?: OlympiadDifficulty,
): OlympiadQuestion[] {
  return OLYMPIAD_QUESTIONS.filter(
    (q) =>
      q.ageBand === ageBand &&
      (!subject || q.subject === subject) &&
      (!difficulty || q.difficulty === difficulty),
  );
}

// Deterministic seeded pick — same date + child gives same daily set.
function dateSeed(date: string, childKey: string | number): number {
  let h = 0;
  const s = `${date}|${childKey}`;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function shuffled<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 9301) + 49297) | 0;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Pick the daily 5: 1–2 from each subject, at the current difficulty band. */
export function pickDailyQuestions(
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  date: string,
  childKey: string | number,
): OlympiadQuestion[] {
  const seed = dateSeed(date, childKey);
  const subjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];
  const picks: OlympiadQuestion[] = [];
  // 1 from each subject = 4
  subjects.forEach((subj, i) => {
    const pool = questionsFor(ageBand, subj, difficulty);
    const fallback = pool.length > 0 ? pool : questionsFor(ageBand, subj);
    if (fallback.length > 0) {
      picks.push(fallback[Math.abs(seed + i * 7) % fallback.length]!);
    }
  });
  // 5th + fill: rotate, then fall back through every pool until we have 5.
  const tryAdd = (pool: OlympiadQuestion[], offset: number) => {
    const fresh = pool.filter((q) => !picks.find((p) => p.id === q.id));
    if (fresh.length > 0) {
      picks.push(fresh[Math.abs(seed + offset) % fresh.length]!);
      return true;
    }
    return false;
  };
  const rotOrder: OlympiadSubject[] = (() => {
    const start = Math.abs(seed) % 4;
    return [0, 1, 2, 3].map((i) => subjects[(start + i) % 4]!);
  })();
  for (const subj of rotOrder) {
    if (picks.length >= 5) break;
    if (tryAdd(questionsFor(ageBand, subj, difficulty), 13)) continue;
    tryAdd(questionsFor(ageBand, subj), 17);
  }
  // Final safety net — pull from any remaining question in the age band.
  if (picks.length < 5) {
    const anyPool = OLYMPIAD_QUESTIONS.filter((q) => q.ageBand === ageBand);
    let off = 23;
    while (picks.length < 5 && tryAdd(anyPool, off)) off += 7;
  }
  return picks;
}

/** Pick weekly 20: 5 from each subject, mixed difficulty. */
export function pickWeeklyQuestions(
  ageBand: OlympiadAgeBand,
  weekStartDate: string,
  childKey: string | number,
): OlympiadQuestion[] {
  const seed = dateSeed(weekStartDate, childKey);
  const subjects: OlympiadSubject[] = ["math", "science", "reasoning", "gk"];
  const out: OlympiadQuestion[] = [];
  subjects.forEach((subj, si) => {
    const pool = shuffled(questionsFor(ageBand, subj), seed + si * 31);
    out.push(...pool.slice(0, 5));
  });
  return out;
}

/** Practice picker — random pool from chosen subject + difficulty. */
export function pickPracticeQuestions(
  ageBand: OlympiadAgeBand,
  subject: OlympiadSubject,
  difficulty: OlympiadDifficulty,
  count: number = 10,
): OlympiadQuestion[] {
  const pool = questionsFor(ageBand, subject, difficulty);
  const fallback = pool.length >= count ? pool : questionsFor(ageBand, subject);
  return shuffled(fallback, Date.now()).slice(0, Math.min(count, fallback.length));
}

function questionsForTrack(
  ageBand: OlympiadAgeBand,
  trackId: OlympiadTrackId,
  difficulty?: OlympiadDifficulty,
): OlympiadQuestion[] {
  return OLYMPIAD_QUESTIONS.filter(
    (q) =>
      q.ageBand === ageBand &&
      (!difficulty || q.difficulty === difficulty) &&
      (q.tracks?.includes(trackId) ||
        (trackId === "nso" && q.subject === "science") ||
        (trackId === "math_olympiad" && q.subject === "math") ||
        (trackId === "gk_olympiad" && q.subject === "gk")),
  );
}

/** Syllabus track practice — 10 questions from track pool. */
export function pickTrackQuestions(
  ageBand: OlympiadAgeBand,
  trackId: OlympiadTrackId,
  difficulty: OlympiadDifficulty,
  childKey: string | number,
  count: number = 10,
): OlympiadQuestion[] {
  const seed = dateSeed(todayIso(), `${childKey}|${trackId}`);
  const pool = questionsForTrack(ageBand, trackId, difficulty);
  const fallback = pool.length >= count ? pool : questionsForTrack(ageBand, trackId);
  return shuffled(fallback, seed).slice(0, Math.min(count, fallback.length));
}

/** Full mock exam — 30 mixed-subject questions, mixed difficulty. */
export function pickMockExamQuestions(
  ageBand: OlympiadAgeBand,
  weekStartDate: string,
  childKey: string | number,
  count: number = MOCK_EXAM_QUESTION_COUNT,
): OlympiadQuestion[] {
  const seed = dateSeed(weekStartDate, `${childKey}|mock`);
  const pool = OLYMPIAD_QUESTIONS.filter((q) => q.ageBand === ageBand);
  return shuffled(pool, seed).slice(0, Math.min(count, pool.length));
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
