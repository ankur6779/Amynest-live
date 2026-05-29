import {
  AGE_BANDS,
  SMART_STUDY_SUBJECTS,
  difficultyForLessonIndex,
  learningLevelFor,
  maxNumberForAge,
} from "../constants.js";
import type { AgeBand, SmartStudyLesson } from "../types.js";

const SHAPES = [
  "circle",
  "square",
  "triangle",
  "rectangle",
  "oval",
  "star",
  "heart",
  "diamond",
];
const COLORS = [
  "red",
  "blue",
  "green",
  "yellow",
  "orange",
  "purple",
  "pink",
  "brown",
];
const ANIMALS = ["dog", "cat", "bird", "fish", "rabbit", "horse", "cow", "frog"];
const PLANETS = ["Mercury", "Venus", "Earth", "Mars", "Jupiter"];
const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "South America", "Australia"];

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function pick<T>(arr: readonly T[], index: number): T {
  return arr[index % arr.length]!;
}

function mathPair(ageBand: AgeBand, seq: number, op: "+" | "-" | "×" | "÷"): [string, string, string] {
  const max = maxNumberForAge(ageBand);
  const a = (seq % Math.min(max, 12)) + 1;
  const b = ((seq * 3) % Math.min(max, 9)) + 1;
  if (op === "+") return [`${a} + ${b} = ?`, String(a + b), `Add ${a} and ${b} together.`];
  if (op === "-") {
    const hi = Math.max(a, b);
    const lo = Math.min(a, b);
    return [`${hi} - ${lo} = ?`, String(hi - lo), `Start with ${hi}, take away ${lo}.`];
  }
  if (op === "×") return [`${a} × ${b} = ?`, String(a * b), `Multiply ${a} groups of ${b}.`];
  const product = a * b;
  return [`${product} ÷ ${b} = ?`, String(a), `Split ${product} into groups of ${b}.`];
}

function titleWithAge(title: string, ageBand: AgeBand): string {
  return `${title} (Ages ${ageBand})`;
}

function buildLessonBody(
  subject: string,
  ageBand: AgeBand,
  seq: number,
): Omit<SmartStudyLesson, "id" | "ageBand" | "subject" | "difficulty" | "learningLevel"> {
  const n = maxNumberForAge(ageBand);
  const shape = pick(SHAPES, seq);
  const color = pick(COLORS, seq);
  const animal = pick(ANIMALS, seq);
  const planet = pick(PLANETS, seq);
  const continent = pick(CONTINENTS, seq);
  const countTarget = Math.min(n, 5 + seq + (ageBand === "2-4" ? 0 : ageBand === "4-6" ? 3 : 8));

  switch (subject) {
    case "Numbers": {
      const num = (seq % n) + 1;
      return {
        title: `Meet Number ${num}`,
        description: `Learn what the number ${num} means and where you see it.`,
        lessonContent: `The number ${num} tells how many things you have. Look around your room and find ${num} objects you can touch. Count them slowly: one, two, up to ${num}. When you see the digit ${num}, remember that picture in your mind.`,
        questions: [
          `How many fingers do you show for ${num}?`,
          `Which group has ${num} items?`,
          `What comes after ${num === n ? num : num + 1}?`,
        ],
        answers: [
          `Show ${num} fingers.`,
          `The group with exactly ${num}.`,
          num === n ? String(num) : String(num + 1),
        ],
        funFact: `Athletes often wear jersey number ${num} when it is their favorite digit.`,
        amyExplanation: `Numbers are labels for amounts. ${num} means a set of ${num} things, not a random squiggle.`,
        audioText: `Let's explore the number ${num}. Can you find ${num} things near you?`,
      };
    }
    case "Counting": {
      const start = (seq % Math.max(1, n - 5)) + 1;
      const end = Math.min(start + 4, n);
      const line = Array.from({ length: end - start + 1 }, (_, i) => start + i).join(", ");
      return {
        title: `Count From ${start} to ${end}`,
        description: `Practice counting forward in order without skipping.`,
        lessonContent: `Counting forward means saying numbers in order: ${line}. Point to each object as you say one number. If you skip a number, the total will be wrong, so go slowly and match one touch to one word.`,
        questions: [
          `What number comes right after ${start}?`,
          `How many numbers are from ${start} to ${end}?`,
          `Say the list out loud: ${start} to ${end}.`,
        ],
        answers: [String(start + 1), String(end - start + 1), line],
        funFact: `Bees can share directions by dancing in patterns—nature uses counting too.`,
        amyExplanation: `Each step up adds one more. Your voice and your finger should move together.`,
        audioText: `Count with me from ${start} to ${end}. Tap each item as you say the number.`,
      };
    }
    case "Addition": {
      const [q, ans, hint] = mathPair(ageBand, seq, "+");
      return {
        title: `Adding Small Groups ${seq + 1}`,
        description: `Combine two groups to find the total.`,
        lessonContent: `Addition puts groups together. ${hint} Picture ${q.replace(" = ?", "")} as blocks in two piles, then push the piles into one line and count every block.`,
        questions: [q, `Which shows addition: 2+3 or 3-2?`, `If you have 1 more, what happens to the total?`],
        answers: [ans, "2+3", "The total grows by 1."],
        funFact: `Grocery stores use addition when they scan items and add prices.`,
        amyExplanation: `Plus means "and also." More objects in the story means a bigger number at the end.`,
        audioText: `Try this addition: ${q.replace(" = ?", "")}. Say the total when you are ready.`,
      };
    }
    case "Subtraction": {
      const [q, ans, hint] = mathPair(ageBand, seq, "-");
      return {
        title: `Take Away Practice ${seq + 1}`,
        description: `Find what is left after some are removed.`,
        lessonContent: `Subtraction tells what remains. ${hint} Draw the starting amount, cross out the part that leaves, and count what is still there.`,
        questions: [q, `Does subtraction make the number bigger or smaller?`, `If zero leave, what is left?`],
        answers: [ans, "Smaller", "The same amount."],
        funFact: `When you eat a snack, you subtract food from the plate.`,
        amyExplanation: `Minus means "take away." The story gets shorter, so the number gets smaller.`,
        audioText: `Solve this take-away: ${q.replace(" = ?", "")}.`,
      };
    }
    case "Multiplication": {
      const [q, ans, hint] = mathPair(ageBand, seq, "×");
      return {
        title: `Equal Groups ×${seq + 1}`,
        description: `See multiplication as rows and columns of the same size.`,
        lessonContent: `Multiplication is fast adding of equal groups. ${hint} Imagine rows of stickers with the same count in every row.`,
        questions: [q, `How many in 3 groups of 2?`, `Is 4×2 the same as 2×4?`],
        answers: [ans, "6", "Yes, both equal 8."],
        funFact: `Egg cartons are a real-life array: rows and columns of eggs.`,
        amyExplanation: `Times means "groups of." Count one group, then jump by that same amount again.`,
        audioText: `Think in equal groups: ${q.replace(" = ?", "")}.`,
      };
    }
    case "Division": {
      const [q, ans, hint] = mathPair(ageBand, seq, "÷");
      return {
        title: `Sharing Fairly ${seq + 1}`,
        description: `Split a total into equal shares.`,
        lessonContent: `Division shares fairly. ${hint} Deal one to each friend, then another round, until nothing is left. The rounds tell the answer.`,
        questions: [q, `If 12 cookies go to 4 friends, each gets?`, `Can leftovers happen with fair shares?`],
        answers: [ans, "3", "No—fair shares have none left."],
        funFact: `Pizza slices are division: one whole shared into equal pieces.`,
        amyExplanation: `Divide asks "how many each?" Everyone gets the same when it is fair.`,
        audioText: `Share equally: ${q.replace(" = ?", "")}.`,
      };
    }
    case "Patterns": {
      const motifs = ["🔴", "🔵", "🔴", "🔵", "🔴"];
      const next = seq % 2 === 0 ? "🔵" : "🟢";
      return {
        title: `Pattern Detectives ${seq + 1}`,
        description: `Spot what repeats and predict the next piece.`,
        lessonContent: `A pattern repeats a rule. Look at ${motifs.join(" ")}. The colors alternate. The rule is red, blue, red, blue. Use the rule to guess what comes next before you peek.`,
        questions: [
          `What comes after the last red in ${motifs.join("")}?`,
          `Name the rule in one sentence.`,
          `Make a clap-stomp pattern: what repeats?`,
        ],
        answers: ["Blue", "Colors alternate red then blue.", "Clap-stomp repeats."],
        funFact: `Stripes on zebras are patterns that help them blend together.`,
        amyExplanation: `Find the repeating chunk, then copy it again. Patterns are rules you can trust.`,
        audioText: `Look at the colors: red, blue, red, blue. What should come next?`,
      };
    }
    case "Shapes": {
      return {
        title: `Shape Spotting: ${shape}`,
        description: `Learn sides, corners, and where ${shape}s appear.`,
        lessonContent: `A ${shape} is a flat shape you can draw. Trace it in the air with your finger. Hunt your home for objects that look like a ${shape} when you peek from the front.`,
        questions: [
          `Is a wheel a ${shape}?`,
          `How many corners does a ${shape} usually have?`,
          `Draw a ${shape} in the air.`,
        ],
        answers: [
          shape === "circle" || shape === "oval" ? "Yes" : "Maybe—check the outline",
          shape === "circle" ? "0 round" : shape === "triangle" ? "3" : "4 or more",
          `Trace a ${shape}.`,
        ],
        funFact: `Architects combine shapes to design strong buildings.`,
        amyExplanation: `Shapes have rules. Corners and curves tell you which name fits.`,
        audioText: `Can you find something shaped like a ${shape} near you?`,
      };
    }
    case "Colors": {
      return {
        title: `Color Quest: ${color}`,
        description: `Connect the color word to real objects.`,
        lessonContent: `${color.charAt(0).toUpperCase() + color.slice(1)} is a color you see on objects, not a thing by itself. Find three ${color} items. Say the color word after you point so your brain links the word and the sight.`,
        questions: [
          `Name one ${color} food.`,
          `Is the sky always ${color}?`,
          `Mix idea: ${color} + white makes a lighter shade.`,
        ],
        answers: [
          color === "red" ? "Apple" : color === "yellow" ? "Banana" : `${color} item`,
          "No—sky changes with weather",
          "True—tints are lighter",
        ],
        funFact: `Rainbows show many colors in order when sunlight bends through raindrops.`,
        amyExplanation: `Color words describe what you see. Point first, then label.`,
        audioText: `Point to something ${color}. Say "${color}" when you find it.`,
      };
    }
    case "Measurement": {
      const units = ageBand === "2-4" || ageBand === "4-6" ? "hand spans" : "centimeters";
      return {
        title: `Measure It ${seq + 1}`,
        description: `Compare longer, shorter, heavier, and lighter.`,
        lessonContent: `Measurement answers "how much?" Use ${units} to compare two objects. Put them side by side without guessing—check with the same tool both times.`,
        questions: [
          `Which is longer: pencil or book?`,
          `Why use the same tool twice?`,
          `What unit did we practice?`,
        ],
        answers: ["Book (usually)", "So the compare is fair", units],
        funFact: `Bakers measure flour so cookies taste the same every batch.`,
        amyExplanation: `Pick a tool, use it the same way, then read the result.`,
        audioText: `Choose two objects. Which one is longer when you line them up?`,
      };
    }
    case "Time": {
      const hours = [7, 8, 9, 12, 3, 6][seq % 6]!;
      return {
        title: `Time Talk: ${hours} o'clock`,
        description: `Read hours on a clock and link them to daily routines.`,
        lessonContent: `When the small hand points to ${hours} and the tall hand points to 12, people say "${hours} o'clock." Connect that time to something you do: breakfast, school, or bedtime.`,
        questions: [
          `Where does the tall hand point at o'clock?`,
          `What might you do at ${hours} o'clock?`,
          `How many hours on a clock face?`,
        ],
        answers: ["12", "A daily routine", "12"],
        funFact: `Sundials told time many years ago using shadows from bright daylight.`,
        amyExplanation: `The small hand names the hour. The tall hand on 12 means zero extra minutes.`,
        audioText: `Imagine the clock shows ${hours} o'clock. What are you doing then?`,
      };
    }
    case "Money": {
      const coins = ageBand === "2-4" ? "1 cent" : ageBand === "4-6" ? "5 cents" : "10 cents";
      return {
        title: `Money Sense ${seq + 1}`,
        description: `Understand coins, value, and fair trades.`,
        lessonContent: `Each coin has a value. Today focus on ${coins}. Bigger numbers mean more buying power. Never share payment cards; coins and bills are practice tools with a grown-up nearby.`,
        questions: [
          `Do two 5-cent coins equal one 10-cent coin?`,
          `Should you give passwords for money apps?`,
          `What does "price" mean?`,
        ],
        answers: ["Yes", "No—keep passwords private", "How much something costs"],
        funFact: `Piggy banks help kids practice saving small amounts over time.`,
        amyExplanation: `Add coin values before you decide if you have enough.`,
        audioText: `If you have two 5-cent coins, do they match one 10-cent coin?`,
      };
    }
    case "Logic": {
      return {
        title: `Logic Lab ${seq + 1}`,
        description: `Use clues to decide what must be true.`,
        lessonContent: `Logic puzzles give clues. If all dogs bark, and Max is a dog, then Max barks. Follow each clue one line at a time—no skipping.`,
        questions: [
          `All squares have 4 sides. This shape has 4 sides. Must it be a square?`,
          `If A is taller than B, and B is taller than C, who is tallest?`,
          `What is the first step in a logic puzzle?`,
        ],
        answers: ["Not always—a rectangle too", "A", "Read the clues carefully"],
        funFact: `Chess players use logic to plan several moves ahead.`,
        amyExplanation: `Clues chain together. Write or say each step before you answer.`,
        audioText: `Listen to the clues. What must be true at the end?`,
      };
    }
    case "Memory": {
      return {
        title: `Memory Chain ${seq + 1}`,
        description: `Hold a short list in your mind and recall it.`,
        lessonContent: `Look at five words: apple, book, chair, drum, egg. Say them twice, then cover and repeat. Link each word to a picture in a silly story to help them stick.`,
        questions: [
          `Which was third in the list?`,
          `Why use a silly story?`,
          `How many items were in the list?`,
        ],
        answers: ["chair", "Stories help brains store words", "5"],
        funFact: `Musicians remember songs by chunking notes into phrases.`,
        amyExplanation: `Picture the list as a cartoon path through your house.`,
        audioText: `Remember: apple, book, chair, drum, egg. Which was in the middle?`,
      };
    }
    case "Observation": {
      return {
        title: `Eagle Eyes ${seq + 1}`,
        description: `Notice details that change or stay the same.`,
        lessonContent: `Observation means slow looking. Compare two pictures or two rooms. Ask: what color changed? what is missing? what is new?`,
        questions: [
          `What is one detail easy to miss?`,
          `Why go slowly?`,
          `Name a tool scientists use to observe far away.`,
        ],
        answers: ["Small color or shape shifts", "Speed makes you skip clues", "Telescope or microscope"],
        funFact: `Detectives write notes so they do not forget tiny clues.`,
        amyExplanation: `Scan left to right, then top to bottom, like reading.`,
        audioText: `Look around for ten seconds. What is one detail you did not notice before?`,
      };
    }
    case "Science Basics": {
      return {
        title: `Science Spark: ${animal}`,
        description: `Learn how living things eat, move, and grow.`,
        lessonContent: `A ${animal} is a living thing. It needs food, water, air, and shelter. Watch how it moves—does it hop, swim, or fly? Living things also grow bigger over time.`,
        questions: [
          `Is a ${animal} living or non-living?`,
          `What does every animal need?`,
          `How does a ${animal} usually move?`,
        ],
        answers: ["Living", "Food, water, air, shelter", "Depends—observe a safe example"],
        funFact: `Frogs start as tadpoles and change shape as they grow.`,
        amyExplanation: `If it grows and eats, science calls it living.`,
        audioText: `Think about a ${animal}. What does it need to stay healthy?`,
      };
    }
    case "Geography Basics": {
      return {
        title: `World Watch: ${continent}`,
        description: `Explore continents, land, water, and maps.`,
        lessonContent: `${continent} is a large land area on Earth. Maps use colors and shapes to show land and oceans. Find north on a compass rose to line up directions.`,
        questions: [
          `Is ${continent} land or ocean?`,
          `What does a map show?`,
          `Name one thing maps help people do.`,
        ],
        answers: ["Land", "Places from above", "Travel or learn locations"],
        funFact: `Earth has more ocean than land, but continents hold billions of people.`,
        amyExplanation: `Maps are pictures with rules—always check the legend keys.`,
        audioText: `Find ${continent} on a globe or map in your mind. Is it land or water?`,
      };
    }
    case "Language": {
      const word = pick(["happy", "gentle", "brave", "curious", "polite"], seq);
      return {
        title: `Word Power: ${word}`,
        description: `Use describing words in clear sentences.`,
        lessonContent: `The word "${word}" describes a feeling or style. Say: "The puppy is ${word}." Try another sentence with a person or object you know.`,
        questions: [
          `Use "${word}" in a sentence.`,
          `Is "${word}" a noun or adjective?`,
          `Give a synonym for "${word}".`,
        ],
        answers: [
          `Sample: I feel ${word} today.`,
          "Adjective",
          word === "happy" ? "glad" : "kind",
        ],
        funFact: `English has more words than most languages because it borrows from many places.`,
        amyExplanation: `Adjectives color your sentences. Put them near the noun they describe.`,
        audioText: `Make a sentence with the word ${word}.`,
      };
    }
    case "Vocabulary": {
      const vocab = pick(["observe", "compare", "predict", "measure", "record"], seq);
      return {
        title: `Vocabulary Builder: ${vocab}`,
        description: `Learn a strong word and use it correctly.`,
        lessonContent: `"${vocab}" means to ${vocab === "observe" ? "watch carefully" : vocab === "compare" ? "look for similarities and differences" : vocab === "predict" ? "guess what will happen next using clues" : vocab === "measure" ? "find size or amount with a tool" : "write down what you saw"}. Use it when you do science or math talk.`,
        questions: [
          `What does "${vocab}" mean?`,
          `Use "${vocab}" in a school sentence.`,
          `Which is a ${vocab} action: look, sleep, snack?`,
        ],
        answers: [
          "See lesson",
          `We will ${vocab} our results.`,
          vocab === "sleep" ? "look" : "look",
        ],
        funFact: `Scientists keep notebooks to record what they observe each day.`,
        amyExplanation: `Big words are tools. Say them in real sentences to own them.`,
        audioText: `New word: ${vocab}. Can you say it in your own sentence?`,
      };
    }
    case "Reading": {
      const passage =
        ageBand === "2-4"
          ? `The ${color} ${animal} sits by the ${shape}.`
          : `On ${continent}, students read books that teach stories and facts. A ${animal} appeared in a tale about teamwork.`;
      return {
        title: `Read and Understand ${seq + 1}`,
        description: `Read a short passage and answer meaning questions.`,
        lessonContent: `Read aloud: "${passage}" Point to each word. After reading, retell the sentence in your own words without looking.`,
        questions: [
          `Who or what is the story about?`,
          `Which word tells the color or place?`,
          `Retell one sentence in your words.`,
        ],
        answers: [
          animal,
          passage.includes(color) ? color : continent,
          "Your retell",
        ],
        funFact: `Reading aloud helps your eyes and ears learn together.`,
        amyExplanation: `Read once for sounds, once for meaning.`,
        audioText: `Read: ${passage} What is it mostly about?`,
      };
    }
    default:
      return buildLessonBody("Numbers", ageBand, seq);
  }
}

export function generateSmartStudyLessons(): SmartStudyLesson[] {
  const lessons: SmartStudyLesson[] = [];
  let global = 0;

  for (const ageBand of AGE_BANDS) {
    for (const subject of SMART_STUDY_SUBJECTS) {
      for (let seq = 0; seq < 5; seq += 1) {
        global += 1;
        const body = buildLessonBody(subject, ageBand, seq);
        const difficulty = difficultyForLessonIndex(seq);
        lessons.push({
          id: `ss-${slug(ageBand)}-${slug(subject)}-${seq + 1}`,
          ageBand,
          subject,
          difficulty,
          learningLevel: learningLevelFor(ageBand, seq),
          ...body,
          title: titleWithAge(body.title, ageBand),
        });
      }
    }
  }

  if (lessons.length !== 500) {
    throw new Error(`Expected 500 smart study lessons, got ${lessons.length}`);
  }
  return lessons;
}
