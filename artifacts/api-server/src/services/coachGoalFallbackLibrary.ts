import type { GoalFamily } from "../lib/goal-prompts.js";
import { getGoalFamily } from "../lib/goal-prompts.js";
import type { CoachInput, CoachPlan, CoachWin } from "./coachWinGenerationService.js";
import {
  type CoachWinFeedbackEntry,
  type CoachWinLike,
  coachingCategoryForWinNumber,
  isWinTooSimilar,
} from "./coachWinAntiRepetition.js";

type WinTemplate = Omit<CoachWin, "win">;

function agePhrase(ageGroup?: string): string {
  switch (ageGroup) {
    case "0-2":
    case "0–2":
      return "infants and toddlers";
    case "2-4":
    case "2–4":
      return "the 2–4 age range";
    case "5-7":
    case "5–7":
      return "the 5–7 age range";
    case "8-10":
    case "8–10":
      return "the 8–10 age range";
    case "10+":
      return "tweens and teens";
    case "Adult":
    case "Adult (parent self-care)":
      return "you as a parent";
    default:
      return `the ${ageGroup ?? "5–7"} age range`;
  }
}

function mkWin(n: number, tpl: WinTemplate): CoachWin {
  return { ...tpl, win: n };
}

function goalRootCause(family: GoalFamily, goalLabel: string, input: CoachInput): string {
  const age = agePhrase(input.ageGroup);
  const goal = goalLabel.toLowerCase();
  const byFamily: Partial<Record<GoalFamily, string>> = {
    potty:
      `Night-time dryness depends on ADH hormone maturation and bladder capacity — not effort or punishment. ` +
      `Children in ${age} may stay dry by day long before nights catch up; stress and overtiredness slow progress.`,
    selfcare:
      `Parent overwhelm is a nervous-system state, not a character flaw. When ${goal} feels constant, ` +
      `your stress response narrows what you can notice and respond to — small regulation steps restore capacity.`,
    sleep:
      `Sleep challenges at ${age} often reflect circadian timing, sleep associations, or transition stress — not defiance. ` +
      `The brain needs predictable cues to release melatonin and settle.`,
    tantrum:
      `Children in ${age} are still building prefrontal self-regulation. Stress around ${goal} usually signals ` +
      `an unmet need or skill gap, not intentional defiance.`,
  };
  return (
    byFamily[family] ??
    `Children in ${age} are still building self-regulation. Stress around ${goal} often reflects an unmet need or skill gap, not defiance.`
  );
}

/** Per-family starter wins — win #1 and #2 must differ across families. */
const FAMILY_INITIAL_WINS: Record<GoalFamily, [WinTemplate, WinTemplate]> = {
  potty: [
    {
      title: "Track morning wet and dry",
      objective: "See whether nights or mornings need the first focus",
      deep_explanation:
        "Night dryness follows a different timeline than day training. A simple log reveals patterns — late fluids, overtiredness, or deep sleep — so you stop guessing.",
      actions: [
        "Note dry vs wet each morning for 5 days",
        "Record last drink time the night before",
        "Celebrate dry mornings without big rewards",
      ],
      example:
        "After logging, Maya saw wet mornings followed late juice — shifting fluids earlier helped within a week.",
      mistake_to_avoid: "Punishing wet nights — shame slows bladder awareness.",
      micro_task: "Start a 5-day morning log tonight.",
      duration: "5–7 days",
      science_reference: "AAP toilet-training readiness",
    },
    {
      title: "Build a calm bedtime bathroom habit",
      objective: "Link sleep with a predictable bathroom cue",
      deep_explanation:
        "A short, boring bathroom stop before sleep creates a cue without pressure. Consistency matters more than perfect results on night one.",
      actions: [
        "Add toilet + pajamas in the same order nightly",
        "Keep the trip calm — no quizzes or lectures",
        "Use the same phrase: 'Last bathroom before sleep'",
      ],
      example:
        "Raj added a 2-minute bathroom stop before stories; night waking dropped even before full dryness.",
      mistake_to_avoid: "Making bedtime bathroom feel like a test they can fail.",
      micro_task: "Pick one bedtime phrase and use it tonight.",
      duration: "1–2 weeks",
      science_reference: "BJ Fogg — Tiny Habits",
    },
  ],
  selfcare: [
    {
      title: "Pause before you react",
      objective: "Create space when overwhelm spikes",
      deep_explanation:
        "A brief pause lowers cortisol enough for your prefrontal cortex to come back online. Parent regulation is the intervention when daily life feels unmanageable.",
      actions: [
        "At the first heat flash, stop speaking for 3 breaths",
        "Name one body signal (jaw, chest, hands)",
        "Choose one word to say next instead of reacting",
      ],
      example:
        "When dishes piled up, Leena paused, said 'I need a minute,' and returned calmer — the kids matched her tone.",
      mistake_to_avoid: "Pushing through until you snap and then blaming yourself.",
      micro_task: "Practice one 3-breath pause before the next hard moment.",
      duration: "3–5 days",
      science_reference: "Polyvagal Theory (Stephen Porges)",
    },
    {
      title: "Name one thing you control today",
      objective: "Shrink overwhelm into a single actionable focus",
      deep_explanation:
        "Overwhelm grows when everything feels equally urgent. Picking one controllable step restores agency without requiring a perfect day.",
      actions: [
        "Write one task that would make today 5% easier",
        "Drop or defer two things that are not essential today",
        "Tell someone your one priority so it feels real",
      ],
      example:
        "Instead of fixing the whole house, Ana chose 'laundry in the machine' — finishing one thing unlocked the rest.",
      mistake_to_avoid: "Trying to reorganize your entire life in one evening.",
      micro_task: "Post one sticky note with today's single focus.",
      duration: "3–5 days",
      science_reference: "Behavioral Activation",
    },
  ],
  sleep: [
    {
      title: "Anchor a 30-minute wind-down",
      objective: "Signal the brain that sleep is coming",
      deep_explanation:
        "Melatonin release depends on dim light and repeating cues. A short, identical wind-down teaches the body to settle faster.",
      actions: [
        "Pick 3 steps in the same order nightly",
        "Dim lights 30 minutes before bed",
        "Keep the sequence under 30 minutes",
      ],
      example:
        "Bath → pajamas → one story in the same order cut bedtime battles from 45 to 15 minutes.",
      mistake_to_avoid: "Changing the routine every night when it 'doesn't work' yet.",
      micro_task: "Write tonight's 3-step wind-down on a card.",
      duration: "1 week",
      science_reference: "Matthew Walker — sleep hygiene",
    },
    {
      title: "Use a boring night-waking response",
      objective: "Keep night visits calm and brief",
      deep_explanation:
        "Night waking persists when it accidentally becomes high-reward (long cuddles, screens, snacks). A calm, boring response helps sleep associations fade.",
      actions: [
        "Same short phrase every wake-up",
        "Minimal talking and light",
        "Return child to bed within 5 minutes when safe",
      ],
      example:
        "Parent says 'It's sleep time' and walks back — no debate. Within a week, calls shortened.",
      mistake_to_avoid: "Escalating attention at 2 a.m. because you're exhausted.",
      micro_task: "Agree on one night-waking phrase tonight.",
      duration: "1–2 weeks",
      science_reference: "Jodi Mindell — pediatric sleep",
    },
  ],
  tantrum: [
    {
      title: "Connect before you correct",
      objective: "Lower escalation before you coach",
      deep_explanation:
        "Connection lowers cortisol so the child can receive guidance. Naming what you see activates co-regulation pathways.",
      actions: [
        "Get on eye level before speaking",
        "Name what you see without judgment",
        "Wait 10 seconds before giving an instruction",
      ],
      example:
        "Sara knelt down: 'You look really frustrated.' Her son paused and named the problem.",
      mistake_to_avoid: "Explaining or lecturing before the child feels heard.",
      micro_task: "Use one feeling word at the next hard moment.",
      duration: "2–3 days",
      science_reference: "Gottman emotion coaching",
    },
    {
      title: "Identify the real trigger",
      objective: "Stop guessing — find the pattern",
      deep_explanation:
        "Most recurring tantrums have predictable triggers: hunger, tiredness, transitions, or sensory overload.",
      actions: [
        "Track time, situation, and last meal for 3 days",
        "Look for patterns before the meltdown",
        "Ask softly when calm: 'What was hardest today?'",
      ],
      example:
        "Every tantrum happened 5–6 p.m. — earlier snack solved most episodes.",
      mistake_to_avoid: "Treating each meltdown as random bad behaviour.",
      micro_task: "Log the next episode in three lines on your phone.",
      duration: "3 days",
      science_reference: "ABC behavioural analysis",
    },
  ],
  aggression: [
    {
      title: "Block safely without shaming",
      objective: "Stop harm while keeping connection",
      deep_explanation:
        "Hitting is communication under stress. A calm block protects everyone while the nervous system settles.",
      actions: [
        "Move hands or bodies apart with a neutral voice",
        "Say 'I won't let you hit' — not 'You're bad'",
        "Stay nearby until breathing slows",
      ],
      example:
        "Mom blocked a swipe and said 'Hands are for gentle.' The child cried, then accepted a hug.",
      mistake_to_avoid: "Long lectures mid-incident.",
      micro_task: "Practice the one-line safety script aloud once today.",
      duration: "3–5 days",
      science_reference: "Mona Delahooke — Beyond Behaviors",
    },
    {
      title: "Teach one replacement phrase",
      objective: "Give words for the feeling behind hitting",
      deep_explanation:
        "Replacement skills must be practised when calm, then prompted in hard moments.",
      actions: [
        "Pick one phrase: 'I'm mad' or 'Need space'",
        "Practise during play, not during conflict",
        "Prompt the phrase before frustration peaks",
      ],
      example:
        "During car rides they practised 'I'm frustrated' — hitting dropped within two weeks.",
      mistake_to_avoid: "Expecting new words mid-meltdown without practice.",
      micro_task: "Role-play the phrase once at dinner.",
      duration: "1–2 weeks",
      science_reference: "Ross Greene — CPS",
    },
  ],
  defiance: [
    {
      title: "Offer two real choices",
      objective: "Share control inside your limit",
      deep_explanation:
        "Autonomy reduces resistance when both options are acceptable to you.",
      actions: [
        "Frame as 'A or B' — both must be OK",
        "Avoid choices during full meltdown",
        "Honour the choice once made",
      ],
      example: "'Red cup or blue cup?' ended the standoff over dinner.",
      mistake_to_avoid: "Fake choices that are really threats.",
      micro_task: "Use one genuine choice at the next transition.",
      duration: "3–4 days",
      science_reference: "Self-Determination Theory (Deci & Ryan)",
    },
    {
      title: "Hold one limit warmly",
      objective: "Stay kind and firm at the same time",
      deep_explanation:
        "Wobbling limits teach escalation works. Warmth plus consistency builds safety.",
      actions: [
        "Validate feeling, repeat limit once",
        "Stay nearby without debating",
        "Follow through every time today",
      ],
      example: "'I know — and shoes still go on.' Said calmly, repeated once.",
      mistake_to_avoid: "Caving when the protest gets loud.",
      micro_task: "Pick one limit to hold warmly today.",
      duration: "1 week",
      science_reference: "Diana Baumrind — authoritative parenting",
    },
  ],
  emotional: [
    {
      title: "Name feelings during calm moments",
      objective: "Build emotional vocabulary before crises",
      deep_explanation:
        "Emotion naming during calm moments strengthens interoception and reduces intensity later.",
      actions: [
        "Label your own feeling once daily",
        "Invite child to pick a feeling word at bedtime",
        "Use books or charts — no quiz",
      ],
      example: "Bedtime feeling check-ins cut morning outbursts within a week.",
      mistake_to_avoid: "Only talking about feelings during meltdowns.",
      micro_task: "One feelings check-in at bedtime tonight.",
      duration: "1 week",
      science_reference: "Lisa Feldman Barrett — emotion granularity",
    },
    {
      title: "Co-regulate with breath together",
      objective: "Lend your calm nervous system",
      deep_explanation:
        "Children borrow regulation from parents before they can self-regulate.",
      actions: [
        "Breathe slowly where they can see you",
        "Soften shoulders and voice",
        "Validate first, teach later",
      ],
      example: "Audible 4-7-8 breathing — child joined in within days.",
      mistake_to_avoid: "Teaching breathing mid-crisis only.",
      micro_task: "Two shared breaths before a tricky transition.",
      duration: "3–5 days",
      science_reference: "Stephen Porges — Polyvagal Theory",
    },
  ],
  separation: [
    {
      title: "Create a goodbye ritual",
      objective: "Make separations predictable and brief",
      deep_explanation:
        "Identical goodbyes signal 'you will return' and reduce protest.",
      actions: [
        "Same words + gesture every departure",
        "Keep goodbye under 30 seconds",
        "Never sneak away",
      ],
      example: "High-five + 'See you after snack' — drop-off tears shortened in days.",
      mistake_to_avoid: "Long emotional goodbyes that prolong distress.",
      micro_task: "Agree on one goodbye script tonight.",
      duration: "1 week",
      science_reference: "Attachment theory (Bowlby)",
    },
    {
      title: "Practice short separations at home",
      objective: "Build tolerance in low-stakes settings",
      deep_explanation:
        "Graded exposure in safe contexts builds confidence for bigger separations.",
      actions: [
        "Leave room for 2 minutes while child plays",
        "Return cheerfully — no drama",
        "Increase time slowly over a week",
      ],
      example: "Two-minute kitchen trips became easy before daycare started.",
      mistake_to_avoid: "Starting with the hardest separation first.",
      micro_task: "One 2-minute practice separation today.",
      duration: "1–2 weeks",
      science_reference: "Graduated exposure",
    },
  ],
  screen: [
    {
      title: "Set one clear screen window",
      objective: "Replace vague limits with a visible schedule",
      deep_explanation:
        "Predictable windows reduce negotiation and dopamine-driven protest.",
      actions: [
        "Pick start and end time for screens today",
        "Post the schedule where everyone sees it",
        "Use a timer children can see",
      ],
      example: "Screens 4–4:30 p.m. only — fights dropped when the rule was visible.",
      mistake_to_avoid: "Open-ended 'just a little more' extensions.",
      micro_task: "Write today's screen window on paper.",
      duration: "1 week",
      science_reference: "Anna Lembke — Dopamine Nation",
    },
    {
      title: "Pre-load an offline alternative",
      objective: "Make the non-screen path easy",
      deep_explanation:
        "Environment design beats willpower — have the alternative ready before asking to stop.",
      actions: [
        "Place one engaging offline activity where screens usually happen",
        "Invite choice: 'Tablet off — puzzle or drawing?'",
        "Join for the first 5 minutes",
      ],
      example: "A Lego bin on the TV stand replaced automatic Netflix at transition time.",
      mistake_to_avoid: "Offering nothing attractive when screens end.",
      micro_task: "Set out one offline activity before screen time today.",
      duration: "3–5 days",
      science_reference: "Behavioural environment design",
    },
  ],
  focus: [
    {
      title: "Clear one distraction zone",
      objective: "Reduce cognitive load before asking for focus",
      deep_explanation:
        "Working memory is limited — fewer visible distractions improve attention immediately.",
      actions: [
        "Remove phone from the workspace",
        "One task visible at a time",
        "Timer visible for short bursts",
      ],
      example: "Homework at the kitchen table with phones in a basket — completion time halved.",
      mistake_to_avoid: "Multitasking instructions while asking for focus.",
      micro_task: "Clear one surface for a 10-minute focus burst.",
      duration: "3–5 days",
      science_reference: "Cognitive load theory (Sweller)",
    },
    {
      title: "Use a 5-minute focus burst",
      objective: "Build attention span gradually",
      deep_explanation:
        "Short intervals with clear breaks train sustained attention without burnout.",
      actions: [
        "Set timer for 5 minutes",
        "One task only — no switching",
        "Celebrate completion, not perfection",
      ],
      example: "Five minutes of reading daily grew to fifteen over two weeks.",
      mistake_to_avoid: "Starting with hour-long expectations.",
      micro_task: "One 5-minute timed task today.",
      duration: "1–2 weeks",
      science_reference: "Pomodoro-style attention training",
    },
  ],
  learning: [
    {
      title: "Praise effort, not ability",
      objective: "Build growth mindset during learning tasks",
      deep_explanation: "Process praise reinforces strategies children can repeat.",
      actions: [
        "Notice one strategy: 'You kept trying different ways'",
        "Avoid 'You're so smart'",
        "Ask what helped them persist",
      ],
      example: "'You stuck with that hard word' — child attempted harder problems next.",
      mistake_to_avoid: "Praising speed or innate talent only.",
      micro_task: "One process-praise sentence at homework time.",
      duration: "1 week",
      science_reference: "Carol Dweck — growth mindset",
    },
    {
      title: "Match tasks to attention span",
      objective: "Right-size learning sessions",
      deep_explanation:
        "Sessions longer than attention capacity create resistance and shame.",
      actions: [
        "Cap focused work at age-appropriate minutes",
        "Break into chunks with movement",
        "End on a small win when possible",
      ],
      example: "Ten-minute maths blocks with a jump break — resistance faded.",
      mistake_to_avoid: "Marathon sessions that end in tears.",
      micro_task: "Set a timer for one right-sized block today.",
      duration: "3–5 days",
      science_reference: "Zone of Proximal Development (Vygotsky)",
    },
  ],
  eating: [
    {
      title: "Follow division of responsibility",
      objective: "Parent decides what/when; child decides whether/how much",
      deep_explanation:
        "Pressure at the table increases refusal. Clear roles restore trust with hunger cues.",
      actions: [
        "Offer one safe food each meal",
        "No forcing, bribing, or grazing between meals",
        "Stay neutral about bites taken",
      ],
      example: "Neutral plates — child tried broccoli on day nine without comment.",
      mistake_to_avoid: "Short-order cooking after refusal.",
      micro_task: "Include one safe food at the next meal.",
      duration: "2 weeks",
      science_reference: "Ellyn Satter — Division of Responsibility",
    },
    {
      title: "Offer neutral exposure to new foods",
      objective: "Build familiarity without pressure",
      deep_explanation:
        "Repeated low-pressure exposure reduces food neophobia over time.",
      actions: [
        "Place a tiny portion on the plate — no comment",
        "Let child serve themselves when possible",
        "Repeat the same food 10+ times",
      ],
      example: "Peas on the side every Tuesday — tasted on attempt 12.",
      mistake_to_avoid: "Hiding vegetables or forcing one bite.",
      micro_task: "Add one pea-sized portion of a new food tonight.",
      duration: "2–3 weeks",
      science_reference: "Mere-exposure effect",
    },
  ],
  stubborn: [
    {
      title: "Change the setup, not the child",
      objective: "Prevent power struggles before they start",
      deep_explanation:
        "Many standoffs are environmental — change the cue, not the lecture.",
      actions: [
        "Notice where the battle repeats",
        "Adjust timing, order, or tools",
        "Give micro-autonomy in that moment",
      ],
      example: "Shoes by the door — leaving stopped being a daily fight.",
      mistake_to_avoid: "Repeating the same command louder.",
      micro_task: "Change one environmental cue today.",
      duration: "3–5 days",
      science_reference: "Choice architecture",
    },
    {
      title: "Track small cooperation wins",
      objective: "Notice progress to avoid giving up",
      deep_explanation:
        "Behaviour change is invisible day-to-day — tracking prevents discouragement.",
      actions: [
        "Note one 5% better moment each evening",
        "Share the win briefly in the morning",
        "Compare only to last week",
      ],
      example: "A jar of 'cooperation wins' kept parents going through week two.",
      mistake_to_avoid: "Comparing to other families' children.",
      micro_task: "Text yourself one small win tonight.",
      duration: "1 week",
      science_reference: "Behavioural self-monitoring",
    },
  ],
  coparenting: [
    {
      title: "Sync on one rule this week",
      objective: "Present a unified front on the highest-impact limit",
      deep_explanation:
        "Split rules invite testing. One aligned limit reduces triangulation.",
      actions: [
        "15-minute parent huddle — pick one rule",
        "Agree on exact words both will use",
        "Review mid-week without blame",
      ],
      example: "Both parents used 'Screens off at 7' — testing stopped within days.",
      mistake_to_avoid: "Undermining each other in front of the child.",
      micro_task: "Schedule a 15-minute sync tonight.",
      duration: "1 week",
      science_reference: "Family systems theory",
    },
    {
      title: "Use a guilt reframe script",
      objective: "Stop guilt from leaking into parenting",
      deep_explanation:
        "Parent guilt narrows patience. Brief cognitive reframes restore capacity.",
      actions: [
        "Name the guilt thought out loud",
        "Ask 'What would I tell a friend?'",
        "Choose one small repair action",
      ],
      example: "'I'm doing enough for today' — parent returned calmer after work.",
      mistake_to_avoid: "Over-apologising to the child for adult stress.",
      micro_task: "Write one reframe sentence on a card.",
      duration: "3–5 days",
      science_reference: "Kristin Neff — self-compassion",
    },
  ],
  toddler: [
    {
      title: "Sportscast the moment",
      objective: "Describe without judging during toddler storms",
      deep_explanation:
        "Toddlers need to feel seen before they can shift. Sportscasting lowers shame.",
      actions: [
        "Narrate what you see: 'You wanted the red cup'",
        "Pause — don't fix immediately",
        "Offer one choice when calm enough",
      ],
      example: "'Big feelings — you wanted up' — toddler settled faster than when lectured.",
      mistake_to_avoid: "Long explanations toddlers can't process mid-storm.",
      micro_task: "Sportscast one moment today without fixing.",
      duration: "3–5 days",
      science_reference: "Janet Lansbury — RIE",
    },
    {
      title: "Offer two toddler-sized choices",
      objective: "Meet autonomy needs inside limits",
      deep_explanation:
        "Autonomy explosions at 2–4 are developmental — real choices reduce NO battles.",
      actions: [
        "Both options must be safe and OK with you",
        "Keep language short",
        "Honour the pick",
      ],
      example: "'Walk or be carried?' — leaving the park improved.",
      mistake_to_avoid: "Choices that aren't real ('Cooperate or timeout').",
      micro_task: "One two-choice moment at the next transition.",
      duration: "3–5 days",
      science_reference: "Erikson — autonomy vs shame",
    },
  ],
  siblings: [
    {
      title: "Schedule 15 minutes per child",
      objective: "Fill attention buckets before rivalry spikes",
      deep_explanation:
        "Sibling conflict often reflects attention hunger, not malice.",
      actions: [
        "Child picks the activity",
        "Phone away, timer on",
        "Separate slots — not shared",
      ],
      example: "Daily 15-minute slots — hitting incidents dropped within a week.",
      mistake_to_avoid: "Only intervening during fights.",
      micro_task: "Book one 15-minute slot today.",
      duration: "1–2 weeks",
      science_reference: "Adler — attention goals",
    },
    {
      title: "Sportscast sibling conflicts",
      objective: "Coach skills instead of picking winners",
      deep_explanation:
        "Referee mode teaches kids to perform for verdicts. Description builds problem-solving.",
      actions: [
        "Describe what you see neutrally",
        "Ask each child one feeling word",
        "Prompt one solution — don't impose",
      ],
      example: "'Two kids, one toy' — they agreed on a timer without parent picking sides.",
      mistake_to_avoid: "Always blaming the older child.",
      micro_task: "Sportscast one conflict without a verdict.",
      duration: "1 week",
      science_reference: "Faber & Mazlish",
    },
  ],
  transitions: [
    {
      title: "Preview the event with visuals",
      objective: "Reduce surprise before a big transition",
      deep_explanation:
        "Pre-loading cuts in-the-moment overwhelm by half for many children.",
      actions: [
        "Show photos or draw what will happen",
        "Walk through timeline in simple steps",
        "Answer one worry question",
      ],
      example: "Hospital photo tour — day-of meltdown was shorter each visit.",
      mistake_to_avoid: "Surprising them with the transition.",
      micro_task: "Show one picture or story of what's next.",
      duration: "3–5 days",
      science_reference: "Carol Gray — Social Stories",
    },
    {
      title: "Pack a comfort kit together",
      objective: "Give a portable sense of safety",
      deep_explanation:
        "Transitional objects anchor security in unfamiliar settings.",
      actions: [
        "Child picks 2–3 comfort items",
        "Practice using the kit at home",
        "Keep kit visible on travel day",
      ],
      example: "Snacks + small toy in a backpack — airport day stayed manageable.",
      mistake_to_avoid: "Packing without the child's input.",
      micro_task: "Choose one comfort item for the next outing.",
      duration: "2–3 days",
      science_reference: "Donald Winnicott — transitional objects",
    },
  ],
  obesity: [
    {
      title: "Apply the 5-2-1-0 daily target",
      objective: "Use evidence-based family health anchors",
      deep_explanation:
        "Small daily targets beat restrictive diets for sustainable family change.",
      actions: [
        "5 fruits/veg, ≤2 hrs recreational screen, 1 hr active play, 0 sugary drinks",
        "Track one target today — not all four",
        "Use weight-neutral language",
      ],
      example: "Family tracked active play only — other targets followed naturally.",
      mistake_to_avoid: "Commenting on body size or weight.",
      micro_task: "Pick one 5-2-1-0 target for today.",
      duration: "2 weeks",
      science_reference: "AAP IHBLT guideline",
    },
    {
      title: "Swap one pantry item",
      objective: "Change the environment, not willpower",
      deep_explanation: "What is visible and easy is what gets eaten.",
      actions: [
        "Remove one ultra-processed default snack",
        "Add one whole-food alternative at eye level",
        "Involve child in picking the swap",
      ],
      example: "Sugary cereal out, oats in — breakfast resistance eased.",
      mistake_to_avoid: "Emptying the entire pantry at once.",
      micro_task: "One swap at the next grocery run.",
      duration: "1 week",
      science_reference: "Ellyn Satter — feeding dynamics",
    },
  ],
  nutrition: [
    {
      title: "Pair iron with vitamin C",
      objective: "Improve absorption at one meal",
      deep_explanation:
        "Bioavailability matters — pairing boosts non-heme iron absorption 3–4×.",
      actions: [
        "Serve dal/leafy greens with lemon or tomato",
        "Avoid tea/dairy with the iron meal",
        "Note energy changes over a week",
      ],
      example: "Rajma + tomato salad — fatigue improved over two weeks.",
      mistake_to_avoid: "Supplementing without testing.",
      micro_task: "Add vitamin C to one iron-rich meal today.",
      duration: "2 weeks",
      science_reference: "ICMR-NIN iron absorption guidance",
    },
    {
      title: "Run a hidden-hunger symptom check",
      objective: "Know when to ask the paediatrician",
      deep_explanation:
        "Hidden deficiencies look like picky eating or low focus — flags need testing.",
      actions: [
        "Check pallor, fatigue, frequent illness, hair/skin changes",
        "Log symptoms for 7 days",
        "Book paediatric review if 2+ flags persist",
      ],
      example: "Fatigue + pallor — CBC showed low ferritin; food-first plan followed.",
      mistake_to_avoid: "Self-prescribing multivitamins.",
      micro_task: "Note today's energy and appetite.",
      duration: "1 week",
      science_reference: "WHO hidden hunger",
    },
  ],
  immunity: [
    {
      title: "Protect sleep as immunity work",
      objective: "Prioritize rest before supplements",
      deep_explanation:
        "Sleep deprivation halves antibody response — rest is primary prevention.",
      actions: [
        "Set age-appropriate bedtime window",
        "Dim lights 30 minutes before bed",
        "Track illness frequency for 2 weeks",
      ],
      example: "Earlier bedtime — colds spaced farther apart within a month.",
      mistake_to_avoid: "Relying on unproven 'immunity tonics'.",
      micro_task: "Move bedtime 15 minutes earlier tonight.",
      duration: "2 weeks",
      science_reference: "Prather — sleep and immunity",
    },
    {
      title: "Add outdoor play daily",
      objective: "Support microbiome diversity safely",
      deep_explanation:
        "Outdoor time and microbial exposure calibrate immune training in childhood.",
      actions: [
        "60 minutes outside when possible",
        "Include dirt/nature play safely",
        "Hand-wash before meals — not constantly",
      ],
      example: "Park time after school — infection frequency normalized over months.",
      mistake_to_avoid: "Keeping children sterile indoors year-round.",
      micro_task: "One outdoor block today regardless of weather.",
      duration: "2 weeks",
      science_reference: "Hygiene hypothesis",
    },
  ],
  dental: [
    {
      title: "Brush twice with fluoride paste",
      objective: "Establish the non-negotiable dental habit",
      deep_explanation:
        "Twice-daily fluoride brushing prevents most childhood caries.",
      actions: [
        "Rice-grain paste 0–3 yrs, pea-size 3–6 yrs",
        "Parent supervises until age 7–8",
        "Spit, don't rinse",
      ],
      example: "Sticker chart for brushing — cavities stopped progressing at check-up.",
      mistake_to_avoid: "Skipping night brush when tired.",
      micro_task: "Set a phone reminder for tonight's brush.",
      duration: "2 weeks",
      science_reference: "AAPD fluoride guidance",
    },
    {
      title: "Limit sugar frequency, not just amount",
      objective: "Reduce acid attacks on enamel",
      deep_explanation:
        "Each sugar exposure creates a 20-minute acid attack — frequency matters most.",
      actions: [
        "Sweet treats only with meals",
        "Water between meals",
        "No bottle in bed except water",
      ],
      example: "Juice only at lunch — dentist noted improvement at 6-month visit.",
      mistake_to_avoid: "Sipping sweet drinks throughout the day.",
      micro_task: "Swap one sip drink for water today.",
      duration: "2 weeks",
      science_reference: "Early childhood caries research",
    },
  ],
  digitalhealth: [
    {
      title: "Use the 20-20-20 eye rule",
      objective: "Protect vision during screen use",
      deep_explanation:
        "Regular distance focusing reduces digital eye strain in developing eyes.",
      actions: [
        "Every 20 minutes, look 20 feet away for 20 seconds",
        "Make it a game with a timer",
        "Arm's-length screen distance",
      ],
      example: "Kitchen timer — headache complaints dropped within a week.",
      mistake_to_avoid: "Screens close to the face for long stretches.",
      micro_task: "One 20-20-20 break during today's screen time.",
      duration: "1 week",
      science_reference: "AAO digital eye strain guidance",
    },
    {
      title: "Get two hours of daylight",
      objective: "Protect against myopia progression",
      deep_explanation:
        "Outdoor light is the strongest modifiable factor in childhood myopia risk.",
      actions: [
        "Schedule outdoor time before homework",
        "Walk part of school commute outside",
        "Track minutes with a simple tally",
      ],
      example: "After-school park hour — optometrist noted stable prescription.",
      mistake_to_avoid: "Replacing outdoor time with more indoor activities.",
      micro_task: "30 minutes outside today before screens.",
      duration: "2 weeks",
      science_reference: "Outdoor time myopia prevention studies",
    },
  ],
  development: [
    {
      title: "Do a milestone check-in",
      objective: "Separate typical variation from red flags",
      deep_explanation:
        "Milestones are signposts — patterns over time matter more than one delay.",
      actions: [
        "Review age-appropriate milestones calmly",
        "Note one strength and one question",
        "Book paediatric review if red flags appear",
      ],
      example: "Late walking + good social smile — paediatrician reassured and gave exercises.",
      mistake_to_avoid: "Panic-comparing to social media milestones.",
      micro_task: "Write one observed strength today.",
      duration: "3–5 days",
      science_reference: "CDC Learn the Signs",
    },
    {
      title: "Practice serve-and-return play",
      objective: "Build brain architecture through interaction",
      deep_explanation:
        "Back-and-forth interactions matter more than educational videos for early development.",
      actions: [
        "Follow child's lead for 5 minutes",
        "Respond to sounds/gestures warmly",
        "Name what they're exploring",
      ],
      example: "Diaper-change babble games — language exploded over months.",
      mistake_to_avoid: "Replacing interaction with passive screen time under age 2.",
      micro_task: "Five minutes of follow-their-lead play today.",
      duration: "1 week",
      science_reference: "Harvard Center on the Developing Child",
    },
  ],
  generic: [
    {
      title: "Connect before you correct",
      objective: "Open communication so your child listens",
      deep_explanation:
        "Connection lowers cortisol so guidance can land. Skip this and other strategies feel uphill.",
      actions: [
        "Get on eye level before speaking",
        "Name what you see without judgment",
        "Wait 10 seconds before instructing",
      ],
      example:
        "Knelt down: 'You look upset' — child named the problem within 30 seconds.",
      mistake_to_avoid: "Talking from across the room while distracted.",
      micro_task: "Five minutes of special time today.",
      duration: "2–3 days",
      science_reference: "Daniel Siegel — Whole-Brain Child",
    },
    {
      title: "Identify the real trigger",
      objective: "Find the pattern behind the behaviour",
      deep_explanation:
        "Recurring behaviour usually has a predictable trigger — solve the cause, not only the symptom.",
      actions: [
        "Track time, situation, and last meal/sleep for 3 days",
        "Look for patterns",
        "Ask softly when calm",
      ],
      example: "Every meltdown at 5 p.m. — earlier snack solved it.",
      mistake_to_avoid: "Treating behaviour as random misbehaviour.",
      micro_task: "Log the next hard moment in three lines.",
      duration: "3 days",
      science_reference: "ABC behavioural analysis",
    },
  ],
};

function tpl(
  title: string,
  objective: string,
  goalContext: string,
  category: string,
): WinTemplate {
  const actions: [string, string, string] = [
    `"${title}": write the exact words or steps you'll use today`,
    `"${title}": schedule one calm-moment practice this week for ${goalContext}`,
    `"${title}" (${category.replace(/_/g, " ")}): jot what shifted — even 5% counts`,
  ];
  return {
    title,
    objective: `${objective} for ${goalContext}`,
    deep_explanation:
      `This step targets the ${category.replace(/_/g, " ")} layer of change — a distinct angle from prior wins. ` +
      `Small, repeatable actions build trust when working on ${goalContext}.`,
    actions,
    example:
      `Instead of fixing everything at once, the parent tried "${title.toLowerCase()}" and saw a small shift.`,
    mistake_to_avoid: "Adding more rules when the current step still feels too hard.",
    micro_task: `Write one reminder for "${title}" today.`,
    duration: "3–7 days",
    science_reference: "Behaviour-change science",
  };
}

function familySpecificTitle(base: string, family: GoalFamily): string {
  if (family === "generic") return base;
  const prefix: Partial<Record<GoalFamily, string>> = {
    sleep: "Sleep:",
    screen: "Screens:",
    eating: "Meals:",
    tantrum: "Tantrums:",
    toddler: "Toddler:",
    siblings: "Siblings:",
    potty: "Potty:",
    selfcare: "You:",
  };
  const p = prefix[family];
  if (!p || base.startsWith(p)) return base;
  return `${p} ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
}

function extendedWinPool(family: GoalFamily, goalLabel: string): WinTemplate[] {
  const g = goalLabel.toLowerCase();
  const pools: Partial<Record<GoalFamily, WinTemplate[]>> = {
    potty: [
      tpl("Shift fluids earlier", "Reduce late-day drinking", g, "routine"),
      tpl("Use a night-light path", "Make bathroom trips easy", g, "environment"),
      tpl("Celebrate dry mornings quietly", "Reinforce progress without pressure", g, "reinforcement"),
      tpl("Pause training after illness", "Protect trust during setbacks", g, "reflection"),
      tpl("Check constipation blockers", "Rule out hidden physical barriers", g, "observation"),
      tpl("Let child choose pajamas", "Autonomy lowers bedtime stress", g, "communication"),
      tpl("Stay neutral on accidents", "Coach without shame", g, "emotional"),
      tpl("Review log with paediatrician if needed", "Know when to seek help", g, "problem_solving"),
      tpl("Hold consistency 14 nights", "Lock the new pattern", g, "skill_building"),
      tpl("Frame dryness as body learning", "Build identity, not compliance", g, "parent_regulation"),
    ],
    selfcare: [
      tpl("Complete one stress cycle", "Move stress through your body", g, "parent_regulation"),
      tpl("Set a 10-minute boundary", "Protect non-negotiable rest", g, "communication"),
      tpl("Simplify one environment zone", "Reduce visual overwhelm", g, "environment"),
      tpl("Ask for one concrete help", "Share load instead of heroics", g, "problem_solving"),
      tpl("Track energy peaks and crashes", "Plan hard tasks strategically", g, "observation"),
      tpl("Use a shutdown ritual", "Signal work/day is done", g, "routine"),
      tpl("Reframe guilt in writing", "Challenge cognitive distortions", g, "reflection"),
      tpl("Micro-celebrate one win", "Notice progress to stay motivated", g, "reinforcement"),
      tpl("Practice paired regulation", "Co-regulate with partner or friend", g, "emotional"),
      tpl("Pick tomorrow's one priority", "Prevent next-day overwhelm", g, "skill_building"),
    ],
  };

  const defaultPool: WinTemplate[] = [
    tpl("Set one clear expectation", "Reduce confusion with one rule", g, "communication"),
    tpl("Offer two real choices", "Autonomy inside limits", g, "skill_building"),
    tpl("Co-regulate before correcting", "Lend your calm", g, "emotional"),
    tpl("Hold the limit kindly", "Warmth plus firmness", g, "parent_regulation"),
    tpl("Build the missing skill", "Teach before expecting", g, "skill_building"),
    tpl("Repair after rupture", "Reconnect after mistakes", g, "reflection"),
    tpl("Track tiny wins daily", "Notice partial progress", g, "observation"),
    tpl("Hold consistency 14 days", "Survive the extinction burst", g, "routine"),
    tpl("Maintain through setbacks", "Regression is normal", g, "problem_solving"),
    tpl("Make it a family value", "Identity-based change", g, "reinforcement"),
  ];

  const base = pools[family] ?? defaultPool;
  return base.map((w) => ({
    ...w,
    title: familySpecificTitle(w.title, family),
  }));
}

export function buildGoalSpecificInitialFallback(
  goalId: string,
  goalLabel: string,
  input: CoachInput,
): CoachPlan {
  const family = familyForGoal(goalId);
  const [w1, w2] = FAMILY_INITIAL_WINS[family];
  return {
    title: `${goalLabel} — start here`,
    root_cause: goalRootCause(family, goalLabel, input),
    summary:
      "Two starter wins below; mark each step and tap Next — Amy will load the next win when you're ready.",
    wins: [mkWin(1, w1), mkWin(2, w2)],
  };
}

export function buildGoalSpecificFullFallback(
  goalId: string,
  goalLabel: string,
  input: CoachInput,
): CoachPlan {
  const initial = buildGoalSpecificInitialFallback(goalId, goalLabel, input);
  const family = familyForGoal(goalId);
  const extended = extendedWinPool(family, goalLabel);
  const wins = [...initial.wins, ...extended.map((t, i) => mkWin(i + 3, t))];
  return {
    title: goalLabel,
    root_cause: initial.root_cause,
    summary:
      "This is a structured 12-step plan that moves from connection → consistent expectations → skill-building → repair → habit lock-in.",
    wins,
  };
}

export function buildGoalSpecificFallbackWin(
  goalId: string,
  goalLabel: string,
  input: CoachInput,
  winNumber: number,
  recentWins: CoachWinLike[] = [],
  feedback: CoachWinFeedbackEntry[] = [],
): CoachWin {
  const full = buildGoalSpecificFullFallback(goalId, goalLabel, input);
  const candidates = full.wins.filter((w) => w.win >= winNumber);

  const lastFeedback = feedback[feedback.length - 1];
  let pool = [...candidates];

  if (lastFeedback?.feedback === "yes") {
    pool = pool.filter((w) => w.win > lastFeedback.winNumber);
  } else if (lastFeedback?.feedback === "somewhat") {
    pool = [...pool.slice(1), ...pool.slice(0, 1)];
  } else if (lastFeedback?.feedback === "no") {
    const blockedCategory = coachingCategoryForWinNumber(lastFeedback.winNumber);
    pool.sort((a, b) => {
      const catA = coachingCategoryForWinNumber(a.win);
      const catB = coachingCategoryForWinNumber(b.win);
      const aBlocked = catA === blockedCategory ? 1 : 0;
      const bBlocked = catB === blockedCategory ? 1 : 0;
      if (aBlocked !== bBlocked) return aBlocked - bBlocked;
      return catA.localeCompare(catB);
    });
    pool = [...pool.slice(2), ...pool.slice(0, 2)];
  }

  for (const candidate of pool) {
    if (!isWinTooSimilar(candidate, recentWins)) {
      const adapted =
        lastFeedback?.feedback === "somewhat" && candidate.win === winNumber
          ? {
              ...candidate,
              title: `${candidate.title} (smaller step)`,
              objective: `A gentler variation: ${candidate.objective}`,
            }
          : lastFeedback?.feedback === "no"
            ? {
                ...candidate,
                title: candidate.title.startsWith("Try ")
                  ? candidate.title
                  : `Try a different angle: ${candidate.title.charAt(0).toLowerCase()}${candidate.title.slice(1)}`,
              }
            : candidate;
      return { ...adapted, win: winNumber };
    }
  }

  const fallback = full.wins[winNumber - 1] ?? full.wins[full.wins.length - 1]!;
  return { ...fallback, win: winNumber };
}

export function certificationWinsForGoal(
  goalId: string,
  goalLabel: string,
  input: CoachInput,
  count = 10,
): CoachWin[] {
  const full = buildGoalSpecificFullFallback(goalId, goalLabel, input);
  return full.wins.slice(0, count);
}

export function certificationReport(goalIds: { id: string; label: string }[]): {
  goalId: string;
  label: string;
  firstTenTitles: string[];
  duplicateTitles: string[];
  duplicateActionSteps: string[];
}[] {
  const input: CoachInput = { ageGroup: "5-7", severity: "moderate", routine: "Inconsistent" };
  return goalIds.map(({ id, label }) => {
    const wins = certificationWinsForGoal(id, label, input, 10);
    const titles = wins.map((w) => w.title);
    const duplicateTitles = titles.filter((t, i) => titles.indexOf(t) !== i);
    const allActions = wins.flatMap((w) => w.actions);
    const duplicateActions = allActions.filter((a, i) => allActions.indexOf(a) !== i);
    return {
      goalId: id,
      label,
      firstTenTitles: titles,
      duplicateTitles: [...new Set(duplicateTitles)],
      duplicateActionSteps: [...new Set(duplicateActions)],
    };
  });
}

function familyForGoal(goalId: string): GoalFamily {
  return getGoalFamily(goalId);
}
