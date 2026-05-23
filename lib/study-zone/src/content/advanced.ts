import type { SubjectPack, AdvancedSubjectId, StudyTopicDraft } from "../types";
import { enrichSubjectPacks } from "./enrich-topics";
import {
  IMG_ALGEBRA, IMG_TRIANGLES, IMG_TRIGONOMETRY,
  IMG_QUADRATIC, IMG_STATISTICS, IMG_MENSURATION, IMG_LINEAR_EQ,
  IMG_FORCE_MOTION, IMG_CELLS, IMG_ACIDS_BASES,
  IMG_ELECTRICITY, IMG_DIGESTIVE, IMG_LIGHT_OPTICS,
  IMG_TENSES, IMG_ACTIVE_PASSIVE, IMG_PREPOSITIONS, IMG_REPORTED_SPEECH,
} from "./images";

const ADVANCED_SUBJECTS_DRAFT: Array<Omit<SubjectPack<AdvancedSubjectId>, "topics"> & { topics: StudyTopicDraft[] }> = [
  // ── Math ────────────────────────────────────────────────────────────────────
  {
    id: "math",
    title: "Math",
    emoji: "📐",
    topics: [
      {
        id: "algebra-basics",
        title: "Algebra Basics",
        imageExample: IMG_ALGEBRA,
        notes:
          "Algebra uses letters (variables) in place of unknown numbers.\nAn equation states two expressions are equal, e.g. x + 3 = 7.\nTo solve, perform the same operation on both sides until the variable is alone.\nExample: x + 3 = 7  →  x = 7 − 3  →  x = 4.\nLIKE terms can be added; UNLIKE terms cannot.",
        amyPrompt: "Explain algebra basics — variables and simple equations — for a class 6-8 student with one worked example.",
        questions: [
          { q: "Solve x + 5 = 12", options: ["5", "7", "12", "17"], answer: 1 },
          { q: "If 2x = 10, then x = ?", options: ["2", "5", "10", "20"], answer: 1, hint: "Divide both sides by 2." },
          { q: "Which symbol is a variable?", options: ["+", "5", "x", "="], answer: 2 },
          { q: "Solve x − 4 = 9", options: ["5", "9", "13", "36"], answer: 2 },
          { q: "3x + 1 = 10  →  x = ?", options: ["2", "3", "4", "9"], answer: 1 },
        ],
      },
      {
        id: "linear-equations",
        title: "Linear Equations & Graphs",
        imageExample: IMG_LINEAR_EQ,
        notes:
          "A linear equation in two variables (y = mx + c) gives a straight line when plotted.\n'm' is the slope (steepness of the line).\n'c' is the y-intercept (where the line crosses the y-axis).\nExample: y = 2x + 1 — slope is 2, y-intercept is 1.\nTwo simultaneous linear equations can be solved by substitution or elimination.",
        amyPrompt: "Explain y = mx + c and how to draw a straight-line graph for a class 8-10 student.",
        questions: [
          { q: "In y = mx + c, what is 'm'?", options: ["y-intercept", "slope", "constant", "variable"], answer: 1 },
          { q: "In y = 3x + 5, the y-intercept is?", options: ["3", "5", "8", "x"], answer: 1 },
          { q: "A linear equation gives a ___ graph.", options: ["curve", "circle", "straight line", "parabola"], answer: 2 },
          { q: "Solve: 2x + 3 = 11", options: ["3", "4", "5", "7"], answer: 1 },
        ],
      },
      {
        id: "quadratic-equations",
        title: "Quadratic Equations",
        imageExample: IMG_QUADRATIC,
        notes:
          "A quadratic equation has the form ax² + bx + c = 0 (a ≠ 0).\nIts graph is a U-shaped curve called a parabola.\nRoots (solutions) can be found by factorisation, completing the square or the quadratic formula:\n  x = (−b ± √(b²−4ac)) / 2a\nThe discriminant D = b²−4ac tells us the nature of roots.",
        amyPrompt: "Explain quadratic equations with the formula and one example for a class 9-10 student.",
        questions: [
          { q: "General form of a quadratic equation?", options: ["ax+b=0", "ax²+bx+c=0", "x²=0", "ax³+b=0"], answer: 1 },
          { q: "Graph of a quadratic equation is called?", options: ["Hyperbola", "Parabola", "Ellipse", "Circle"], answer: 1 },
          { q: "Discriminant D = ?", options: ["b²+4ac", "b²-4ac", "2b-ac", "a²-bc"], answer: 1 },
          { q: "Roots of x²−5x+6=0?", options: ["2 and 3", "1 and 6", "−2 and −3", "0 and 5"], answer: 0 },
        ],
      },
      {
        id: "geometry-triangles",
        title: "Triangles",
        imageExample: IMG_TRIANGLES,
        notes:
          "A triangle has 3 sides and 3 angles. The sum of all angles is always 180°.\nTypes by sides: equilateral (all equal), isosceles (two equal), scalene (all different).\nTypes by angles: acute (all < 90°), right (one = 90°), obtuse (one > 90°).\nArea = ½ × base × height. Pythagoras: a² + b² = c² for right triangles.",
        amyPrompt: "Summarise types of triangles, angle-sum and Pythagoras theorem for a class 6-8 student.",
        questions: [
          { q: "Sum of angles in a triangle?",    options: ["90°", "180°", "270°", "360°"], answer: 1 },
          { q: "Triangle with all sides equal?",   options: ["Scalene", "Isosceles", "Equilateral", "Right"], answer: 2 },
          { q: "A triangle with one 90° angle?",  options: ["Acute", "Right", "Obtuse", "Equilateral"], answer: 1 },
          { q: "Two angles are 60° and 70°, the third is?", options: ["40°", "50°", "60°", "70°"], answer: 1 },
        ],
      },
      {
        id: "mensuration",
        title: "Mensuration — Area & Perimeter",
        imageExample: IMG_MENSURATION,
        notes:
          "Mensuration is the branch of math that measures lengths, areas and volumes.\nArea of rectangle = l × b. Perimeter of rectangle = 2(l + b).\nArea of circle = πr². Circumference = 2πr.\nArea of triangle = ½ × base × height.\nVolume of cuboid = l × b × h. Volume of cylinder = πr²h.",
        amyPrompt: "Give area and perimeter formulas for rectangle, circle and triangle for a class 7-9 student.",
        questions: [
          { q: "Area of a rectangle with l=5, b=3?", options: ["8", "15", "16", "30"], answer: 1 },
          { q: "Area of circle formula?",            options: ["2πr", "πr²", "πd", "4πr"], answer: 1 },
          { q: "Perimeter of a square with side 4?", options: ["8", "12", "16", "20"], answer: 2 },
          { q: "Area of triangle = ½ × base × ___?", options: ["length", "width", "height", "radius"], answer: 2 },
        ],
      },
      {
        id: "trigonometry-basics",
        title: "Trigonometry Basics",
        imageExample: IMG_TRIGONOMETRY,
        notes:
          "Trigonometry studies the relationship between angles and sides of a right triangle.\nFor angle θ:\n  sin θ = opposite / hypotenuse\n  cos θ = adjacent / hypotenuse\n  tan θ = opposite / adjacent  (SOH-CAH-TOA)\nKey values: sin 30°=½, cos 60°=½, tan 45°=1, sin 90°=1.",
        amyPrompt: "Explain sin, cos, tan in a right triangle for a class 9-10 student with one worked example.",
        questions: [
          { q: "sin 30° = ?",                  options: ["0", "1/2", "√3/2", "1"], answer: 1 },
          { q: "tan 45° = ?",                  options: ["0", "1/2", "1", "√3"], answer: 2 },
          { q: "cos 0° = ?",                   options: ["0", "1/2", "1", "√3/2"], answer: 2 },
          { q: "opposite / hypotenuse = ?",    options: ["sin", "cos", "tan", "cot"], answer: 0 },
        ],
      },
      {
        id: "statistics-basics",
        title: "Statistics — Mean, Median, Mode",
        imageExample: IMG_STATISTICS,
        notes:
          "Statistics is the study of collecting and analysing data.\nMean = sum of all values ÷ number of values. (Average)\nMedian = the middle value when data is arranged in order.\nMode = the value that appears most often.\nRange = highest value − lowest value.",
        amyPrompt: "Explain mean, median and mode with a worked example for a class 8-10 student.",
        questions: [
          { q: "Mean of 2, 4, 6 = ?",   options: ["3", "4", "5", "6"], answer: 1 },
          { q: "Median of 1, 3, 5, 7, 9 = ?", options: ["3", "5", "7", "4"], answer: 1 },
          { q: "Mode of 2, 3, 3, 5, 3 = ?",   options: ["2", "3", "5", "4"], answer: 1 },
          { q: "Range = highest − ___?",       options: ["mean", "median", "mode", "lowest"], answer: 3 },
        ],
      },
    ],
  },

  // ── Science ──────────────────────────────────────────────────────────────────
  {
    id: "science",
    title: "Science",
    emoji: "⚗️",
    topics: [
      {
        id: "force-motion",
        title: "Force and Motion",
        imageExample: IMG_FORCE_MOTION,
        notes:
          "A force is a push or pull that changes speed, direction or shape of an object.\nNewton's First Law: A body remains at rest or in uniform motion unless an external force acts.\nNewton's Second Law: F = m × a (Force = mass × acceleration).\nNewton's Third Law: Every action has an equal and opposite reaction.",
        amyPrompt: "Explain Newton's three laws of motion with one daily-life example each for a class 8-10 student.",
        questions: [
          { q: "F = m × ?",              options: ["Velocity", "Acceleration", "Distance", "Time"], answer: 1 },
          { q: "Unit of force?",          options: ["Joule", "Watt", "Newton", "Pascal"], answer: 2 },
          { q: "Whose laws describe motion?", options: ["Einstein", "Newton", "Galileo", "Darwin"], answer: 1 },
          { q: "Action and reaction are ___ in magnitude.", options: ["Equal", "Opposite", "Different", "Zero"], answer: 0 },
        ],
      },
      {
        id: "cells",
        title: "Cells — The Building Blocks",
        imageExample: IMG_CELLS,
        notes:
          "All living organisms are made of cells (cell theory).\nCells were first observed by Robert Hooke in 1665.\nPlant cell: has cell wall, chloroplasts and a large central vacuole.\nAnimal cell: no cell wall; usually no chloroplasts.\nNucleus controls all cell activities. Mitochondria is the powerhouse of the cell.",
        amyPrompt: "Compare plant and animal cells with their main parts for a class 8-9 student.",
        questions: [
          { q: "Who first observed cells?",            options: ["Newton", "Darwin", "Hooke", "Mendel"], answer: 2 },
          { q: "Found ONLY in plant cells?",           options: ["Nucleus", "Cell wall", "Cytoplasm", "Mitochondria"], answer: 1 },
          { q: "Which organelle controls the cell?",   options: ["Cytoplasm", "Cell wall", "Nucleus", "Vacuole"], answer: 2 },
          { q: "Where does photosynthesis happen?",    options: ["Nucleus", "Mitochondria", "Chloroplasts", "Vacuole"], answer: 2 },
        ],
      },
      {
        id: "acids-bases",
        title: "Acids, Bases & Salts",
        imageExample: IMG_ACIDS_BASES,
        notes:
          "Acids are sour and turn blue litmus red (lemon juice, vinegar, HCl).\nBases are bitter/soapy and turn red litmus blue (soap, baking soda, NaOH).\npH scale: 0–14. <7 = acidic, 7 = neutral, >7 = basic/alkaline.\nNeutralisation: Acid + Base → Salt + Water.",
        amyPrompt: "Explain the pH scale and neutralisation for a class 7-10 student with everyday examples.",
        questions: [
          { q: "pH of a neutral substance?",     options: ["0", "7", "10", "14"], answer: 1 },
          { q: "Acids turn ___ litmus ___.",     options: ["red, blue", "blue, red", "green, yellow", "yellow, green"], answer: 1 },
          { q: "Acid + Base →?",                 options: ["Acid + Water", "Salt + Water", "Gas + Water", "Salt only"], answer: 1 },
          { q: "Which is acidic?",               options: ["Soap", "Lemon juice", "Pure water", "Baking soda"], answer: 1 },
        ],
      },
      {
        id: "electricity",
        title: "Electricity",
        imageExample: IMG_ELECTRICITY,
        notes:
          "Electric current is the flow of electrons through a conductor.\nOhm's Law: V = I × R  (Voltage = Current × Resistance).\nA circuit needs a source (battery), conducting wires and a load (bulb/motor).\nConductors (copper) allow current to flow; insulators (rubber) do not.\nSeries circuit: one path. Parallel circuit: multiple paths.",
        amyPrompt: "Explain Ohm's law and basic electric circuits for a class 8-10 student with a simple analogy.",
        questions: [
          { q: "Ohm's Law: V = ?",          options: ["I+R", "I×R", "I/R", "I−R"], answer: 1 },
          { q: "Unit of electric current?",  options: ["Volt", "Watt", "Ampere", "Ohm"], answer: 2 },
          { q: "Copper is a good ___?",      options: ["insulator", "conductor", "semiconductor", "magnet"], answer: 1 },
          { q: "In parallel circuits, if one bulb fuses, the rest ___?", options: ["all go off", "stay on", "glow brighter", "explode"], answer: 1 },
        ],
      },
      {
        id: "digestive-system",
        title: "Digestive System",
        imageExample: IMG_DIGESTIVE,
        notes:
          "Digestion breaks food into nutrients the body can absorb.\nPath: Mouth → Oesophagus → Stomach → Small Intestine → Large Intestine → Rectum.\nSaliva in the mouth starts digestion of carbohydrates.\nStomach acid digests proteins. Small intestine absorbs nutrients.\nLarge intestine absorbs water; waste exits as faeces.",
        amyPrompt: "Explain the human digestive system step by step for a class 7-9 student.",
        questions: [
          { q: "Digestion begins in the ___?",      options: ["Stomach", "Mouth", "Liver", "Intestine"], answer: 1 },
          { q: "Nutrients are absorbed in the ___?", options: ["Mouth", "Stomach", "Small intestine", "Large intestine"], answer: 2 },
          { q: "Water is absorbed in the ___?",     options: ["Mouth", "Stomach", "Small intestine", "Large intestine"], answer: 3 },
          { q: "Which organ makes bile?",           options: ["Kidney", "Liver", "Pancreas", "Stomach"], answer: 1 },
        ],
      },
      {
        id: "light-optics",
        title: "Light & Optics",
        imageExample: IMG_LIGHT_OPTICS,
        notes:
          "Light travels in straight lines at 3×10⁸ m/s in a vacuum.\nReflection: light bounces off a surface (Law: angle of incidence = angle of reflection).\nRefraction: light bends when it moves from one medium to another.\nConvex lens converges (focuses) light — used in magnifying glasses.\nConcave lens diverges (spreads) light — used in spectacles for short-sight.",
        amyPrompt: "Explain reflection and refraction of light with everyday examples for a class 8-10 student.",
        questions: [
          { q: "Speed of light in vacuum?",          options: ["3×10⁶ m/s", "3×10⁸ m/s", "3×10¹⁰ m/s", "300 m/s"], answer: 1 },
          { q: "Law of reflection: angle of incidence ___ angle of reflection.", options: ["<", ">", "=", "≠"], answer: 2 },
          { q: "Light bending at a medium change is called?", options: ["Reflection", "Refraction", "Diffraction", "Absorption"], answer: 1 },
          { q: "A convex lens is used in a ___?",   options: ["Spectacles for short sight", "Magnifying glass", "Rear-view mirror", "Periscope"], answer: 1 },
        ],
      },
    ],
  },

  // ── English ───────────────────────────────────────────────────────────────────
  {
    id: "english",
    title: "English",
    emoji: "✍️",
    topics: [
      {
        id: "tenses",
        title: "Tenses Overview",
        imageExample: IMG_TENSES,
        notes:
          "Tense shows WHEN something happens.\nPresent Simple: I write. (now / regularly)\nPast Simple: I wrote. (completed)\nFuture Simple: I will write. (coming)\nEach tense has simple, continuous, perfect and perfect-continuous forms.",
        amyPrompt: "Explain past, present and future tenses with one example sentence each for a class 6-8 student.",
        questions: [
          { q: "'She wrote a poem' — tense?",       options: ["Present", "Past", "Future", "Continuous"], answer: 1 },
          { q: "Future of 'go'?",                   options: ["went", "going", "will go", "gone"], answer: 2 },
          { q: "'I am eating' — tense?",             options: ["Past simple", "Present continuous", "Future simple", "Past continuous"], answer: 1 },
          { q: "Past form of 'run'?",               options: ["runned", "ran", "running", "run"], answer: 1 },
        ],
      },
      {
        id: "active-passive",
        title: "Active and Passive Voice",
        imageExample: IMG_ACTIVE_PASSIVE,
        notes:
          "Active voice: subject does the action — 'Emma writes a letter.'\nPassive voice: action is done to the subject — 'A letter is written by Emma.'\nUse passive when the doer is unknown or unimportant.\nFormation: subject + form of 'be' + past participle + (by + agent).",
        amyPrompt: "Explain how to convert active voice to passive voice with two examples for a class 7-9 student.",
        questions: [
          { q: "Passive of 'He plays football.'?", options: ["Football is played by him.", "Football was played by him.", "Football will be played by him.", "Football has played him."], answer: 0 },
          { q: "'The book was read by Anu.' — voice?", options: ["Active", "Passive", "Imperative", "Interrogative"], answer: 1 },
          { q: "Active voice focuses on the ___?", options: ["Object", "Doer (subject)", "Action only", "Time"], answer: 1 },
          { q: "Passive needs which helper verb form?", options: ["have", "be", "do", "may"], answer: 1 },
        ],
      },
      {
        id: "prepositions",
        title: "Prepositions",
        imageExample: IMG_PREPOSITIONS,
        notes:
          "A preposition is a word that shows the relationship between a noun/pronoun and another word in the sentence.\nPrepositions of place: in, on, under, behind, beside, between, above.\nPrepositions of time: at (at 5 o'clock), on (on Monday), in (in July).\nPrepositions of direction: to, towards, through, across.\nExample: 'The cat is on the mat.' — 'on' is the preposition.",
        amyPrompt: "Explain prepositions of place and time with 5 examples each for a class 6-8 student.",
        questions: [
          { q: "Which is a preposition in 'She sat under the tree'?", options: ["sat", "She", "under", "tree"], answer: 2 },
          { q: "Preposition for days: 'on ___ Monday'?", options: ["at", "in", "on", "by"], answer: 2 },
          { q: "Preposition for exact time: '___ 6 o'clock'?", options: ["on", "in", "at", "by"], answer: 2 },
          { q: "Which shows direction?", options: ["on", "towards", "in", "at"], answer: 1 },
        ],
      },
      {
        id: "reported-speech",
        title: "Reported Speech",
        imageExample: IMG_REPORTED_SPEECH,
        notes:
          "Direct speech repeats the exact words: She said, \"I am happy.\"\nReported (indirect) speech changes the words to describe what was said: She said that she was happy.\nThe tense usually shifts back one step: is → was, will → would, can → could.\nPronoun and time expressions also change: I → she, today → that day.",
        amyPrompt: "Explain how to convert direct speech to reported speech for a class 7-9 student with two examples.",
        questions: [
          { q: "Reported form of 'I am happy' (she said):", options: ["She said she is happy.", "She said that she was happy.", "She says she was happy.", "She told she is happy."], answer: 1 },
          { q: "In reported speech, 'will' becomes?", options: ["shall", "would", "can", "may"], answer: 1 },
          { q: "Direct speech uses ___?",             options: ["Brackets", "Quotation marks", "Question marks only", "Italics"], answer: 1 },
          { q: "In reported speech, 'today' changes to?", options: ["this day", "yesterday", "that day", "the next day"], answer: 2 },
        ],
      },
      {
        id: "essay-writing",
        title: "Essay Writing",
        notes:
          "An essay is a piece of writing that expresses ideas on a topic.\nStructure: Introduction (introduce the topic), Body (explain ideas with examples), Conclusion (summarise).\nAlways use clear, simple sentences. Use connectors: firstly, however, therefore, in conclusion.\nKeep paragraphs focused — one main idea per paragraph.",
        amyPrompt: "Explain how to write a simple essay with introduction, body and conclusion for a class 7-9 student.",
        questions: [
          { q: "An essay has three main parts. First is ___?", options: ["Conclusion", "Body", "Introduction", "Summary"], answer: 2 },
          { q: "Each paragraph should have ___ main idea.", options: ["many", "two", "one", "zero"], answer: 2 },
          { q: "Which is a good connector for conclusion?", options: ["firstly", "however", "in conclusion", "because"], answer: 2 },
          { q: "Introduction should ___?",                  options: ["list all facts", "introduce the topic", "give conclusion", "list questions"], answer: 1 },
        ],
      },
    ],
  },
];

export const ADVANCED_SUBJECTS: SubjectPack<AdvancedSubjectId>[] = enrichSubjectPacks(ADVANCED_SUBJECTS_DRAFT);
