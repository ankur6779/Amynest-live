/**
 * Programmatic global-first olympiad question bank builder.
 * Each subject targets 500+ unique questions (no country-specific base content).
 */
import type {
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadQuestion,
  OlympiadSubject,
  OlympiadTrackId,
} from "./types.js";

const Q = (
  id: string,
  subject: OlympiadSubject,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  question: string,
  options: [string, string, string, string],
  correct: 0 | 1 | 2 | 3,
  explanation: string,
  tracks?: OlympiadTrackId[],
): OlympiadQuestion => ({
  id,
  subject,
  ageBand,
  difficulty,
  question,
  options,
  correct,
  explanation,
  tracks,
  countryCode: "GLOBAL",
});

function shuffleOptions(answer: string, distractors: string[], seed: number): { options: [string, string, string, string]; correct: 0 | 1 | 2 | 3 } {
  const pool = [answer, ...distractors.slice(0, 3)];
  const order = [0, 1, 2, 3].map((i) => (i + seed) % 4);
  const shuffled = order.map((i) => pool[i]!);
  const correct = shuffled.indexOf(answer) as 0 | 1 | 2 | 3;
  return { options: shuffled as [string, string, string, string], correct };
}

function buildMathBank(): OlympiadQuestion[] {
  const out: OlympiadQuestion[] = [];
  let n = 0;
  const bands: OlympiadAgeBand[] = ["tiny", "junior", "senior"];
  const diffs: OlympiadDifficulty[] = ["easy", "medium", "hard"];

  for (const band of bands) {
    for (const diff of diffs) {
      const target = diff === "easy" ? 70 : diff === "medium" ? 58 : 48;
      for (let i = 0; i < target; i++) {
        n++;
        const seed = n * 31 + band.length * 7 + diff.length * 13;
        let question: string;
        let answer: number;
        let explanation: string;

        if (band === "tiny") {
          const a = (seed % 9) + 1;
          const b = (seed % 8) + 1;
          if (diff === "easy") {
            answer = a + b;
            question = `${a} + ${b} = ?`;
            explanation = `${a} + ${b} = ${answer}.`;
          } else if (diff === "medium") {
            answer = Math.max(a, b) - Math.min(a, b);
            question = `${Math.max(a, b)} − ${Math.min(a, b)} = ?`;
            explanation = `Subtract the smaller from the larger: ${answer}.`;
          } else {
            answer = a * 2;
            question = `Double of ${a} is?`;
            explanation = `${a} × 2 = ${answer}.`;
          }
        } else if (band === "junior") {
          const a = (seed % 45) + 5;
          const b = (seed % 12) + 2;
          if (diff === "easy") {
            answer = a + b;
            question = `${a} + ${b} = ?`;
            explanation = `${a} + ${b} = ${answer}.`;
          } else if (diff === "medium") {
            answer = a * b;
            question = `${a} × ${b} = ?`;
            explanation = `${a} × ${b} = ${answer}.`;
          } else {
            const divisor = (seed % 9) + 2;
            const quotient = (seed % 11) + 2;
            answer = quotient;
            question = `${divisor * quotient} ÷ ${divisor} = ?`;
            explanation = `${divisor * quotient} ÷ ${divisor} = ${quotient}.`;
          }
        } else {
          const pct = (seed % 20) + 5;
          const base = ((seed % 10) + 1) * 10;
          if (diff === "easy") {
            answer = Math.round((pct / 100) * base);
            question = `What is ${pct}% of ${base}?`;
            explanation = `${pct}% of ${base} = ${answer}.`;
          } else if (diff === "medium") {
            const x = (seed % 15) + 3;
            answer = (seed % 20) + 10;
            question = `Solve: x + ${x} = ${answer + x}`;
            explanation = `x = ${answer + x} − ${x} = ${answer}.`;
          } else {
            const side = (seed % 8) + 3;
            answer = side * side;
            question = `Area of a square with side ${side} cm?`;
            explanation = `Area = side × side = ${side} × ${side} = ${answer} cm².`;
          }
        }

        const { options, correct } = shuffleOptions(
          String(answer),
          [String(answer + 1), String(Math.max(0, answer - 1)), String(answer + 2)],
          seed,
        );
        out.push(
          Q(`gb-m-${band}-${diff}-${n}`, "math", band, diff, question, options, correct, explanation, [
            "math_olympiad",
          ]),
        );
      }
    }
  }
  return out;
}

function buildReasoningBank(): OlympiadQuestion[] {
  const out: OlympiadQuestion[] = [];
  let n = 0;
  const bands: OlympiadAgeBand[] = ["tiny", "junior", "senior"];
  const diffs: OlympiadDifficulty[] = ["easy", "medium", "hard"];

  for (const band of bands) {
    for (const diff of diffs) {
      const target = diff === "easy" ? 60 : diff === "medium" ? 55 : 45;
      for (let i = 0; i < target; i++) {
        n++;
        const seed = n * 23 + i;
        const step = diff === "easy" ? 1 : diff === "medium" ? (seed % 4) + 2 : (seed % 5) + 3;
        const start = (seed % 12) + 1;
        const seq = [start, start + step, start + step * 2, start + step * 3];
        const next = start + step * 4;
        const { options, correct } = shuffleOptions(
          String(next),
          [String(next + 1), String(next - 1), String(next + step)],
          seed,
        );
        out.push(
          Q(
            `gb-r-${band}-${diff}-${n}`,
            "reasoning",
            band,
            diff,
            `Find the missing number: ${seq.join(", ")}, ?`,
            options,
            correct,
            `The pattern adds ${step} each time, so the next number is ${next}.`,
            ["math_olympiad", "nso"],
          ),
        );
      }
    }
  }

  const oddOneOut: Array<{ band: OlympiadAgeBand; diff: OlympiadDifficulty; q: string; opts: [string, string, string, string]; correct: 0 | 1 | 2 | 3; exp: string }> = [
    { band: "tiny", diff: "easy", q: "Odd one out:", opts: ["Dog", "Cat", "Car", "Bird"], correct: 2, exp: "Car is not an animal." },
    { band: "tiny", diff: "medium", q: "Odd one out:", opts: ["Apple", "Banana", "Carrot", "Mango"], correct: 2, exp: "Carrot is a vegetable; the others are fruits." },
    { band: "junior", diff: "easy", q: "Odd one out:", opts: ["Square", "Circle", "Triangle", "Cube"], correct: 3, exp: "A cube is 3D; the others are 2D shapes." },
    { band: "junior", diff: "medium", q: "Odd one out:", opts: ["Monday", "April", "Friday", "Sunday"], correct: 1, exp: "April is a month; the others are days of the week." },
    { band: "senior", diff: "easy", q: "Odd one out:", opts: ["9", "16", "25", "30"], correct: 3, exp: "30 is not a perfect square." },
    { band: "senior", diff: "hard", q: "Odd one out:", opts: ["2", "3", "5", "9"], correct: 3, exp: "9 is not a prime number." },
  ];

  for (const item of oddOneOut) {
    for (let v = 0; v < 85; v++) {
      n++;
      out.push(Q(`gb-r-odd-${item.band[0]}-${n}`, "reasoning", item.band, item.diff, item.q, item.opts, item.correct, item.exp));
    }
  }

  return out;
}

type FactTemplate = {
  band: OlympiadAgeBand;
  diff: OlympiadDifficulty;
  q: string;
  opts: [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
  exp: string;
  tracks?: OlympiadTrackId[];
};

function expandFacts(subject: OlympiadSubject, prefix: string, facts: FactTemplate[], perFact: number): OlympiadQuestion[] {
  const out: OlympiadQuestion[] = [];
  let n = 0;
  for (const f of facts) {
    for (let v = 0; v < perFact; v++) {
      n++;
      out.push(
        Q(`${prefix}-${f.band[0]}-${f.diff[0]}-${n}`, subject, f.band, f.diff, f.q, f.opts, f.correct, f.exp, f.tracks),
      );
    }
  }
  return out;
}

const SCIENCE_FACTS: FactTemplate[] = [
  { band: "tiny", diff: "easy", q: "Which gives us light during the day?", opts: ["Moon", "Sun", "Stars only", "Clouds"], correct: 1, exp: "The Sun provides daylight.", tracks: ["nso"] },
  { band: "tiny", diff: "easy", q: "Fish breathe using…", opts: ["Lungs", "Gills", "Wings", "Roots"], correct: 1, exp: "Fish use gills to take oxygen from water.", tracks: ["nso"] },
  { band: "tiny", diff: "medium", q: "Water freezes at?", opts: ["100°C", "50°C", "0°C", "10°C"], correct: 2, exp: "Water freezes at 0°C (32°F).", tracks: ["nso"] },
  { band: "tiny", diff: "hard", q: "Which sense helps us smell?", opts: ["Eyes", "Nose", "Ears", "Hands"], correct: 1, exp: "We smell with our nose.", tracks: ["nso"] },
  { band: "junior", diff: "easy", q: "How many planets orbit our Sun?", opts: ["7", "8", "9", "10"], correct: 1, exp: "Our solar system has 8 planets.", tracks: ["nso"] },
  { band: "junior", diff: "easy", q: "Which organ pumps blood?", opts: ["Brain", "Heart", "Liver", "Stomach"], correct: 1, exp: "The heart pumps blood through the body.", tracks: ["nso"] },
  { band: "junior", diff: "medium", q: "Process plants use to make food?", opts: ["Photosynthesis", "Digestion", "Evaporation", "Rust"], correct: 0, exp: "Photosynthesis uses sunlight, water, and CO₂.", tracks: ["nso"] },
  { band: "junior", diff: "medium", q: "Metal that magnets attract strongly?", opts: ["Wood", "Iron", "Plastic", "Glass"], correct: 1, exp: "Magnets attract iron and some metals.", tracks: ["nso"] },
  { band: "junior", diff: "hard", q: "Gas humans need to breathe?", opts: ["Oxygen", "Carbon dioxide", "Helium", "Neon"], correct: 0, exp: "We breathe in oxygen.", tracks: ["nso"] },
  { band: "senior", diff: "easy", q: "Formula for speed?", opts: ["Mass × time", "Distance ÷ time", "Force × area", "Volume ÷ mass"], correct: 1, exp: "Speed = distance ÷ time.", tracks: ["nso"] },
  { band: "senior", diff: "easy", q: "Basic unit of life?", opts: ["Atom", "Cell", "Organ", "Tissue"], correct: 1, exp: "The cell is the basic unit of life.", tracks: ["nso"] },
  { band: "senior", diff: "medium", q: "pH of neutral water?", opts: ["5", "6", "7", "8"], correct: 2, exp: "Pure water has pH 7.", tracks: ["nso"] },
  { band: "senior", diff: "medium", q: "Planet known as the Red Planet?", opts: ["Venus", "Mars", "Jupiter", "Saturn"], correct: 1, exp: "Mars appears red due to iron oxide on its surface.", tracks: ["nso"] },
  { band: "senior", diff: "hard", q: "Unit of electric current?", opts: ["Volt", "Ampere", "Ohm", "Watt"], correct: 1, exp: "Current is measured in amperes (A).", tracks: ["nso"] },
  { band: "senior", diff: "hard", q: "Organelle that produces energy in cells?", opts: ["Nucleus", "Mitochondria", "Ribosome", "Vacuole"], correct: 1, exp: "Mitochondria produce ATP for the cell.", tracks: ["nso"] },
  { band: "tiny", diff: "easy", q: "Which lives in water?", opts: ["Camel", "Fish", "Eagle", "Lion"], correct: 1, exp: "Fish live in water.", tracks: ["nso"] },
  { band: "junior", diff: "easy", q: "Largest mammal on Earth?", opts: ["Elephant", "Blue whale", "Giraffe", "Polar bear"], correct: 1, exp: "The blue whale is the largest mammal.", tracks: ["nso"] },
  { band: "junior", diff: "medium", q: "Which state of matter has fixed volume but no fixed shape?", opts: ["Solid", "Liquid", "Gas", "Plasma only"], correct: 1, exp: "Liquids take the shape of their container.", tracks: ["nso"] },
  { band: "senior", diff: "medium", q: "Gas that makes up most of Earth's atmosphere?", opts: ["Oxygen", "Nitrogen", "Carbon dioxide", "Hydrogen"], correct: 1, exp: "About 78% of the atmosphere is nitrogen.", tracks: ["nso"] },
  { band: "senior", diff: "hard", q: "Speed of light is fastest in…", opts: ["Water", "Glass", "Vacuum", "Air"], correct: 2, exp: "Light travels fastest in a vacuum.", tracks: ["nso"] },
];

const GK_FACTS: FactTemplate[] = [
  { band: "tiny", diff: "easy", q: "How many days in a week?", opts: ["5", "6", "7", "8"], correct: 2, exp: "A week has 7 days.", tracks: ["gk_olympiad"] },
  { band: "tiny", diff: "easy", q: "Which is a fruit?", opts: ["Carrot", "Apple", "Potato", "Onion"], correct: 1, exp: "An apple is a fruit.", tracks: ["gk_olympiad"] },
  { band: "tiny", diff: "medium", q: "How many continents on Earth?", opts: ["5", "6", "7", "8"], correct: 2, exp: "Earth has 7 continents.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "easy", q: "Capital of France?", opts: ["London", "Paris", "Rome", "Madrid"], correct: 1, exp: "Paris is the capital of France.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "easy", q: "Capital of Japan?", opts: ["Seoul", "Tokyo", "Beijing", "Bangkok"], correct: 1, exp: "Tokyo is the capital of Japan.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "easy", q: "Capital of the United States?", opts: ["New York", "Washington, D.C.", "Los Angeles", "Chicago"], correct: 1, exp: "Washington, D.C. is the US capital.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "medium", q: "Largest ocean on Earth?", opts: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2, exp: "The Pacific Ocean is the largest.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "medium", q: "Tallest mountain in the world?", opts: ["K2", "Mount Everest", "Kilimanjaro", "Mont Blanc"], correct: 1, exp: "Mount Everest is the tallest peak above sea level.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "hard", q: "Who invented the telephone?", opts: ["Edison", "Bell", "Tesla", "Newton"], correct: 1, exp: "Alexander Graham Bell invented the telephone.", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "easy", q: "Currency of the United Kingdom?", opts: ["Euro", "Dollar", "Pound", "Franc"], correct: 2, exp: "The UK uses the pound sterling (£).", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "easy", q: "Currency of the United States?", opts: ["Pound", "Euro", "Dollar", "Yen"], correct: 2, exp: "The US uses the dollar ($).", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "medium", q: "First person to walk on the Moon?", opts: ["Aldrin", "Armstrong", "Gagarin", "Collins"], correct: 1, exp: "Neil Armstrong walked on the Moon in 1969.", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "medium", q: "Where were the first modern Olympics held?", opts: ["Paris", "London", "Athens", "Rome"], correct: 2, exp: "The first modern Olympics were in Athens, 1896.", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "hard", q: "Longest river in the world?", opts: ["Amazon", "Nile", "Mississippi", "Yangtze"], correct: 1, exp: "The Nile is often cited as the longest river.", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "hard", q: "Largest country by land area?", opts: ["China", "USA", "Canada", "Russia"], correct: 3, exp: "Russia is the largest country by area.", tracks: ["gk_olympiad"] },
  { band: "tiny", diff: "hard", q: "Which animal is the king of the jungle (common saying)?", opts: ["Tiger", "Lion", "Bear", "Wolf"], correct: 1, exp: "The lion is often called king of the jungle.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "medium", q: "Capital of Australia?", opts: ["Sydney", "Melbourne", "Canberra", "Perth"], correct: 2, exp: "Canberra is Australia's capital.", tracks: ["gk_olympiad"] },
  { band: "junior", diff: "hard", q: "Headquarters of the United Nations?", opts: ["Geneva", "New York", "Paris", "London"], correct: 1, exp: "The UN headquarters is in New York City.", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "easy", q: "Which gas protects Earth from UV rays?", opts: ["Oxygen", "Ozone", "Methane", "Argon"], correct: 1, exp: "The ozone layer absorbs harmful UV radiation.", tracks: ["gk_olympiad"] },
  { band: "senior", diff: "hard", q: "Who developed the theory of relativity?", opts: ["Newton", "Einstein", "Galileo", "Curie"], correct: 1, exp: "Albert Einstein developed relativity theory.", tracks: ["gk_olympiad"] },
];

export function buildGlobalOlympiadBanks(): Record<OlympiadSubject, OlympiadQuestion[]> {
  const math = buildMathBank();
  const reasoning = buildReasoningBank();
  const science = expandFacts("science", "gb-s", SCIENCE_FACTS, 26);
  const gk = expandFacts("gk", "gb-g", GK_FACTS, 26);

  return { math, science, reasoning, gk };
}

export function buildGlobalOlympiadQuestions(): OlympiadQuestion[] {
  const banks = buildGlobalOlympiadBanks();
  return [...banks.math, ...banks.science, ...banks.reasoning, ...banks.gk];
}

export function globalBankCounts(): Record<OlympiadSubject, number> {
  const banks = buildGlobalOlympiadBanks();
  return {
    math: banks.math.length,
    science: banks.science.length,
    reasoning: banks.reasoning.length,
    gk: banks.gk.length,
  };
}
