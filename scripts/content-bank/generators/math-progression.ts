import {
  MATH_STAGES,
  difficultyForLessonIndex,
  learningLevelFor,
  maxNumberForAge,
} from "../constants.js";
import type { AgeBand, MathProgressionPack } from "../types.js";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function ageForStage(stage: string, seq: number): AgeBand {
  if (stage.includes("1-20") || stage.startsWith("Count by")) return seq % 2 === 0 ? "2-4" : "4-6";
  if (stage.includes("21-50")) return "4-6";
  if (stage.includes("51-100")) return "6-8";
  if (stage === "Fractions" || stage === "Word Problems") return seq % 2 === 0 ? "8-10" : "10-12";
  if (stage === "Multiplication" || stage === "Division") return "8-10";
  const bands: AgeBand[] = ["4-6", "6-8", "8-10", "10-12"];
  return bands[seq % bands.length]!;
}

function buildStagePack(
  stage: string,
  seq: number,
  packIndex: number,
): Omit<MathProgressionPack, "id"> {
  const ageBand = ageForStage(stage, seq);
  const difficulty = difficultyForLessonIndex(seq % 5);
  const learningLevel = learningLevelFor(ageBand, seq % 5);
  const max = maxNumberForAge(ageBand);

  const activities: string[] = [];
  const practiceQuestions: string[] = [];
  const answers: string[] = [];
  const amyHints: string[] = [];

  const push = (q: string, a: string, hint: string, act: string) => {
    practiceQuestions.push(q);
    answers.push(a);
    amyHints.push(hint);
    activities.push(act);
  };

  if (stage === "Numbers 1-20") {
    const start = (seq * 3) % 15 + 1;
    push(
      `What number comes after ${start}?`,
      String(start + 1),
      "Count one step forward on your fingers.",
      `Trace numbers ${start} to ${start + 4} in the air.`,
    );
    push(
      `Which is larger: ${start} or ${start + 2}?`,
      String(start + 2),
      "Bigger numbers are farther on the number line.",
      `Place ${start} blocks in a row, then add two more.`,
    );
  } else if (stage === "Numbers 21-50") {
    const n = 21 + (seq * 4) % 25;
    push(`${n} + 1 = ?`, String(n + 1), "Add one more.", `Say ${n - 1}, ${n}, ${n + 1} out loud.`);
    push(`${n + 3} - 3 = ?`, String(n), "Subtract three steps back.", `Jump back three on a number line.`);
  } else if (stage === "Numbers 51-100") {
    const n = 51 + (seq * 5) % 45;
    push(`${n} + 10 = ?`, String(n + 10), "The tens digit grows by one.", `Circle the tens place in ${n}.`);
    push(`${n} - 10 = ?`, String(n - 10), "The tens digit shrinks by one.", `Talk through tens without ones.`);
  } else if (stage.startsWith("Count by")) {
    const step = stage.includes("2") ? 2 : stage.includes("5") ? 5 : 10;
    const start = step;
    const seqList = [0, 1, 2, 3].map((k) => start + k * step).join(", ");
    push(
      `Continue: ${seqList}, ?`,
      String(start + 4 * step),
      `Skip count by ${step}s.`,
      `Clap every ${step}th number up to ${start + 6 * step}.`,
    );
    push(
      `How many steps of ${step} to reach ${start + 5 * step}?`,
      "5",
      "Each jump is the same size.",
      `Draw jumps of ${step} on a line.`,
    );
  } else if (stage === "Patterns") {
    const a = seq % 2 === 0 ? 2 : 3;
    push(`Pattern 3, 6, 9, ?`, String(12), "Add the same amount each time.", `Build the pattern with blocks.`);
    push(`Next in ${a}, ${a * 2}, ${a * 3}, ?`, String(a * 4), "Multiply the position by ${a}.", `Color rows of ${a}.`);
  } else if (stage === "Addition") {
    const x = (seq % 9) + 2;
    const y = (seq % 7) + 1;
    push(`${x} + ${y} = ?`, String(x + y), "Put groups together.", `Draw ${x} stars and ${y} stars.`);
    push(`${x + y} + 1 = ?`, String(x + y + 1), "One more after you add.", `Check with objects.`);
  } else if (stage === "Subtraction") {
    const hi = Math.min(max, 12 + seq);
    const lo = (seq % 5) + 1;
    push(`${hi} - ${lo} = ?`, String(hi - lo), "Cross out and count left.", `Start with ${hi} counters.`);
    push(`${hi} - ${lo} - 1 = ?`, String(hi - lo - 1), "Another one leaves.", `Two-step story on paper.`);
  } else if (stage === "Multiplication") {
    const a = (seq % 6) + 2;
    const b = (seq % 4) + 2;
    push(`${a} × ${b} = ?`, String(a * b), "Think rows of ${a}.", `Array: ${a} rows, ${b} each.`);
    push(`${a} × ${b + 1} = ?`, String(a * (b + 1)), "Add one more row of ${a}.", `Extend the array.`);
  } else if (stage === "Division") {
    const b = (seq % 5) + 2;
    const product = b * ((seq % 6) + 2);
    push(`${product} ÷ ${b} = ?`, String(product / b), "Fair shares.", `Deal ${product} into ${b} groups.`);
    push(`${product + b} ÷ ${b} = ?`, String(product / b + 1), "One more in each group.", `Add one per group.`);
  } else if (stage === "Fractions") {
    push(`Which is larger: 1/2 or 1/4?`, "1/2", "More pieces means smaller slices.", `Fold paper halves, then fourths.`);
    push(`Shade 1/3 of 9 squares. How many?`, "3", "Split 9 into three equal groups.", `Nine grid, color one group.`);
  } else if (stage === "Mental Math") {
    const a = 10 + (seq % 8);
    push(`${a} + 5 = ?`, String(a + 5), "Break 5 into smaller jumps.", `Start at ${a}, hop five.`);
    push(`${a + 10} - 7 = ?`, String(a + 3), "Subtract to a friendly ten.", `Use tens first.`);
  } else if (stage === "Memory Math") {
    push(`Remember: 4, 8, 12. What comes next?`, "16", "Add 4 each time.", `Repeat the list twice.`);
    push(`Recall: 5, 10, 15, ?`, "20", "Count by fives.", `Snap fingers on fives.`);
  } else if (stage === "Logic Math") {
    push(`All even numbers end with 0,2,4,6,8. Is 14 even?`, "Yes", "Check the last digit.", `List even numbers to 20.`);
    push(`If A > B and B > 5, is A > 5?`, "Yes", "Chain the inequality.", "Draw a number line.");
  } else if (stage === "Word Problems") {
    const apples = 3 + (seq % 4);
    push(
      `Mia has ${apples} apples and gets 2 more. How many now?`,
      String(apples + 2),
      "Addition story: combine groups.",
      `Draw ${apples} apples, add 2 more.`,
    );
    push(
      `There are ${apples + 5} stickers and 4 are used. Left?`,
      String(apples + 1),
      "Subtraction story: take away used.",
      `Cross out four stickers.`,
    );
  }

  while (activities.length < 3) {
    push(`Quick check ${activities.length + 1} for ${stage}`, "1", "Think step by step.", `Warm up with counting.`);
  }

  return {
    stage,
    difficulty,
    ageBand,
    learningLevel,
    title: `${stage} — Pack ${seq + 1}`,
    activities: activities.slice(0, 4),
    practiceQuestions: practiceQuestions.slice(0, 5),
    answers: answers.slice(0, 5),
    amyHints: amyHints.slice(0, 5),
    audioText: `Math pack: ${stage}. ${activities[0] ?? "Let us practice."}`,
  };
}

export function generateMathProgressionPacks(): MathProgressionPack[] {
  const packs: MathProgressionPack[] = [];
  let global = 0;

  for (const { stage, packCount } of MATH_STAGES) {
    for (let seq = 0; seq < packCount; seq += 1) {
      global += 1;
      const body = buildStagePack(stage, seq, global);
      packs.push({
        id: `mp-${slug(stage)}-${String(global).padStart(3, "0")}`,
        ...body,
      });
    }
  }

  if (packs.length !== 100) {
    throw new Error(`Expected 100 math progression packs, got ${packs.length}`);
  }
  return packs;
}
