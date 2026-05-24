import type {
  OlympiadAgeBand,
  OlympiadDifficulty,
  OlympiadQuestion,
  OlympiadTrackId,
} from "./types.js";

const Q = (
  id: string,
  subject: OlympiadQuestion["subject"],
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
});

function mkMath(
  id: string,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  a: number,
  b: number,
  op: "+" | "-" | "×" | "÷",
  tracks?: OlympiadTrackId[],
): OlympiadQuestion {
  let answer: number;
  let q: string;
  if (op === "+") {
    answer = a + b;
    q = `${a} + ${b} = ?`;
  } else if (op === "-") {
    answer = a - b;
    q = `${a} − ${b} = ?`;
  } else if (op === "×") {
    answer = a * b;
    q = `${a} × ${b} = ?`;
  } else {
    answer = Math.floor(a / b);
    q = `${a} ÷ ${b} = ?`;
  }
  const opts = new Set<number>([answer]);
  for (let i = 1; opts.size < 4; i++) {
    opts.add(answer + i);
    opts.add(Math.max(0, answer - i));
  }
  const nums = [...opts].slice(0, 4);
  const labels = nums.map(String) as [string, string, string, string];
  const correct = nums.indexOf(answer) as 0 | 1 | 2 | 3;
  return Q(
    id,
    "math",
    ageBand,
    difficulty,
    q,
    labels,
    correct,
    `${a} ${op} ${b} = ${answer}`,
    tracks ?? ["math_olympiad"],
  );
}

function mkSeq(
  id: string,
  ageBand: OlympiadAgeBand,
  difficulty: OlympiadDifficulty,
  seq: number[],
  tracks?: OlympiadTrackId[],
): OlympiadQuestion {
  const step = seq[1]! - seq[0]!;
  const next = seq[seq.length - 1]! + step;
  const opts = new Set<number>([next]);
  for (let i = 1; opts.size < 4; i++) {
    opts.add(next + i);
    opts.add(next - i);
  }
  const nums = [...opts].slice(0, 4);
  const labels = nums.map(String) as [string, string, string, string];
  const correct = nums.indexOf(next) as 0 | 1 | 2 | 3;
  const shown = `${seq.join(", ")}, ?`;
  return Q(
    id,
    "reasoning",
    ageBand,
    difficulty,
    `Find the missing number: ${shown}`,
    labels,
    correct,
    `The pattern adds ${step} each time, so the answer is ${next}.`,
    tracks ?? ["math_olympiad", "nso"],
  );
}

/** ~400 programmatic questions to supplement the curated bank. */
export function buildGeneratedQuestions(): OlympiadQuestion[] {
  const out: OlympiadQuestion[] = [];
  let n = 0;

  const bands: OlympiadAgeBand[] = ["tiny", "junior", "senior"];
  const diffs: OlympiadDifficulty[] = ["easy", "medium", "hard"];

  for (const band of bands) {
    for (const diff of diffs) {
      const count = diff === "easy" ? 20 : diff === "medium" ? 15 : 10;
      for (let i = 0; i < count; i++) {
        n++;
        const seed = n * 17 + band.length;
        let a: number;
        let b: number;
        let op: "+" | "-" | "×" | "÷";
        if (band === "tiny") {
          a = (seed % 8) + 1;
          b = (seed % 5) + 1;
          op = diff === "hard" ? "-" : "+";
        } else if (band === "junior") {
          a = (seed % 40) + 5;
          b = (seed % 12) + 2;
          op = diff === "easy" ? "+" : diff === "medium" ? "×" : "÷";
          if (op === "÷") {
            b = (seed % 9) + 2;
            a = b * ((seed % 10) + 2);
          }
        } else {
          a = (seed % 80) + 10;
          b = (seed % 15) + 3;
          op = diff === "easy" ? "×" : diff === "medium" ? "÷" : "+";
          if (op === "÷") {
            b = (seed % 11) + 2;
            a = b * ((seed % 12) + 3);
          }
        }
        out.push(mkMath(`gen-m-${band[0]}-${diff[0]}-${n}`, band, diff, a, b, op));
      }
    }
  }

  for (const band of bands) {
    for (const diff of diffs) {
      for (let i = 0; i < 12; i++) {
        n++;
        const start = (n % 5) + 1;
        const step = diff === "easy" ? 1 : diff === "medium" ? 2 : (n % 3) + 3;
        const seq = [start, start + step, start + step * 2, start + step * 3];
        out.push(mkSeq(`gen-r-${band[0]}-${diff[0]}-${n}`, band, diff, seq));
      }
    }
  }

  const scienceFacts: Array<{
    band: OlympiadAgeBand;
    diff: OlympiadDifficulty;
    q: string;
    opts: [string, string, string, string];
    correct: 0 | 1 | 2 | 3;
    exp: string;
  }> = [
    { band: "tiny", diff: "easy", q: "Which helps plants make food?", opts: ["Moon", "Sunlight", "Wind", "Rain only"], correct: 1, exp: "Plants use sunlight for photosynthesis." },
    { band: "tiny", diff: "easy", q: "Fish live in…", opts: ["Trees", "Water", "Sky", "Sand"], correct: 1, exp: "Fish need water to breathe through gills." },
    { band: "tiny", diff: "medium", q: "Which season has falling leaves?", opts: ["Summer", "Autumn", "Spring", "Winter only"], correct: 1, exp: "Many trees shed leaves in autumn." },
    { band: "junior", diff: "easy", q: "Which planet is closest to the Sun?", opts: ["Venus", "Mercury", "Mars", "Earth"], correct: 1, exp: "Mercury is the innermost planet." },
    { band: "junior", diff: "medium", q: "What do magnets attract?", opts: ["Plastic", "Iron", "Wood", "Paper"], correct: 1, exp: "Magnets attract iron and some other metals." },
    { band: "junior", diff: "hard", q: "Which gas do plants release?", opts: ["CO₂", "Oxygen", "Nitrogen", "Helium"], correct: 1, exp: "Plants release oxygen during photosynthesis." },
    { band: "senior", diff: "easy", q: "Speed = distance ÷ ?", opts: ["Mass", "Time", "Force", "Area"], correct: 1, exp: "Speed = distance / time." },
    { band: "senior", diff: "medium", q: "DNA stands for…", opts: ["Deoxyribonucleic acid", "Dynamic nuclear acid", "Dual nitrogen atom", "Dense nucleic alloy"], correct: 0, exp: "DNA is deoxyribonucleic acid." },
    { band: "senior", diff: "hard", q: "Which blood cells fight infection?", opts: ["RBC", "WBC", "Platelets", "Plasma only"], correct: 1, exp: "White blood cells (WBC) fight germs." },
  ];

  scienceFacts.forEach((f, i) => {
    for (let v = 0; v < 15; v++) {
      n++;
      out.push(Q(`gen-s-${f.band[0]}-${i}-${v}`, "science", f.band, f.diff, f.q, f.opts, f.correct, f.exp, ["nso"]));
    }
  });

  const gkFacts: Array<{
    band: OlympiadAgeBand;
    diff: OlympiadDifficulty;
    q: string;
    opts: [string, string, string, string];
    correct: 0 | 1 | 2 | 3;
    exp: string;
  }> = [
    { band: "tiny", diff: "easy", q: "Which animal has a trunk?", opts: ["Lion", "Elephant", "Cat", "Dog"], correct: 1, exp: "Elephants use their trunk to drink and grab food." },
    { band: "tiny", diff: "medium", q: "How many colours in a rainbow?", opts: ["5", "6", "7", "8"], correct: 2, exp: "A rainbow has 7 colours — VIBGYOR." },
    { band: "junior", diff: "easy", q: "Capital of France?", opts: ["London", "Paris", "Rome", "Berlin"], correct: 1, exp: "Paris is the capital of France." },
    { band: "junior", diff: "medium", q: "Largest ocean on Earth?", opts: ["Atlantic", "Indian", "Pacific", "Arctic"], correct: 2, exp: "The Pacific Ocean is the largest." },
    { band: "junior", diff: "hard", q: "Who painted the Mona Lisa?", opts: ["Picasso", "Da Vinci", "Van Gogh", "Monet"], correct: 1, exp: "Leonardo da Vinci painted the Mona Lisa." },
    { band: "senior", diff: "easy", q: "UNESCO protects world…", opts: ["Banks", "Heritage sites", "Airports", "Stadiums"], correct: 1, exp: "UNESCO lists World Heritage Sites." },
    { band: "senior", diff: "medium", q: "Currency of the UK?", opts: ["Euro", "Dollar", "Pound", "Yen"], correct: 2, exp: "The British Pound (£) is UK currency." },
    { band: "senior", diff: "hard", q: "First man on the Moon?", opts: ["Aldrin", "Armstrong", "Gagarin", "Collins"], correct: 1, exp: "Neil Armstrong walked on the Moon in 1969." },
  ];

  gkFacts.forEach((f, i) => {
    for (let v = 0; v < 15; v++) {
      n++;
      out.push(Q(`gen-g-${f.band[0]}-${i}-${v}`, "gk", f.band, f.diff, f.q, f.opts, f.correct, f.exp, ["gk_olympiad"]));
    }
  });

  return out;
}
