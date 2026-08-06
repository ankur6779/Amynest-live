/**
 * Sprint 3A review — exactly ONE Speech mission.
 * Selection: Age Band × Selected Worry → static lookup only.
 * No AI · No ML · No recommendation engine · No randomness.
 */

import type { FrontDoorAgeBand, FrontDoorWorryId } from "@/v2/front-door/types";
import type { V2GuestSession } from "@/v2/guest";
import type { MissionDifficulty, TodaySpeechMission } from "./types";

/** Default age when guest has not set a band yet. */
export const DEFAULT_MISSION_AGE_BAND: FrontDoorAgeBand = "preschool_3_5";

/** Default worry when guest has not selected one — Speech wedge. */
export const DEFAULT_MISSION_WORRY: FrontDoorWorryId = "speech_talking";

const AGE_BANDS: readonly FrontDoorAgeBand[] = [
  "infant_0_12m",
  "toddler_1_2",
  "preschool_3_5",
  "child_6_8",
  "older_9_plus",
] as const;

const WORRIES: readonly FrontDoorWorryId[] = [
  "speech_talking",
  "sleep",
  "behavior",
  "learning_school",
  "mornings",
  "feeding",
  "something_else",
] as const;

type MissionSeed = {
  missionId: string;
  title: string;
  duration: string;
  difficulty: MissionDifficulty;
  estimatedMinutes: number;
  summary: string;
  steps: readonly [string, string, string];
};

/**
 * Static catalog: every Age × Worry cell is defined once.
 * All missions remain Speech (hero wedge) — worry only flavors the practice.
 */
const MISSION_LOOKUP: Record<
  FrontDoorAgeBand,
  Record<FrontDoorWorryId, MissionSeed>
> = {
  infant_0_12m: {
    speech_talking: {
      missionId: "speech_infant_sound_play",
      duration: "2 min",
      difficulty: "easy",
      estimatedMinutes: 2,
      title: "Sound play together",
      summary: "Make one fun sound and wait for your baby to answer.",
      steps: [
        "Sit face to face where your baby can see your mouth.",
        "Say a warm sound like “ba” or “ma” — then pause.",
        "Smile and wait. Any sound or smile counts as a reply.",
      ],
    },
    sleep: {
      missionId: "speech_infant_soft_voice",
      duration: "2 min",
      difficulty: "easy",
      estimatedMinutes: 2,
      title: "Soft voice before rest",
      summary: "Use one quiet sound to help the body settle.",
      steps: [
        "Dim the light and hold your baby close.",
        "Whisper one soft sound, slow and warm.",
        "Pause and breathe together for a few seconds.",
      ],
    },
    behavior: {
      missionId: "speech_infant_calm_mirror",
      duration: "2 min",
      difficulty: "easy",
      estimatedMinutes: 2,
      title: "Calm face mirror",
      summary: "Show a calm face and one gentle sound.",
      steps: [
        "Catch your baby’s eyes with a soft smile.",
        "Say one gentle sound, then wait.",
        "If they fuss, keep your voice low and steady.",
      ],
    },
    learning_school: {
      missionId: "speech_infant_name_sound",
      duration: "2 min",
      difficulty: "easy",
      estimatedMinutes: 2,
      title: "Hear their name",
      summary: "Say their name once with warmth — early listening starts here.",
      steps: [
        "Hold your baby where they can see you.",
        "Say their name slowly, then smile.",
        "Repeat once more if they look toward you.",
      ],
    },
    mornings: {
      missionId: "speech_infant_morning_hello",
      duration: "2 min",
      difficulty: "easy",
      estimatedMinutes: 2,
      title: "Morning hello sound",
      summary: "Start the day with one bright, gentle hello.",
      steps: [
        "When they wake, lean in close.",
        "Say “hello” slowly with a smile.",
        "Wait for any sound, kick, or gaze back.",
      ],
    },
    feeding: {
      missionId: "speech_infant_feed_talk",
      duration: "2 min",
      difficulty: "easy",
      estimatedMinutes: 2,
      title: "Talk during a feed pause",
      summary: "Add one warm word in a quiet feeding moment.",
      steps: [
        "During a calm pause in feeding, look at your baby.",
        "Say one soft word like “yum” or “here.”",
        "Stay present — no rush to fill the silence.",
      ],
    },
    something_else: {
      missionId: "speech_infant_one_sound",
      duration: "2 min",
      difficulty: "easy",
      estimatedMinutes: 2,
      title: "One sound, one pause",
      summary: "One clear sound and a patient wait — that is enough today.",
      steps: [
        "Face your baby with a relaxed expression.",
        "Offer one simple sound.",
        "Pause and notice any response at all.",
      ],
    },
  },
  toddler_1_2: {
    speech_talking: {
      missionId: "speech_toddler_copy_words",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Copy one word",
      summary: "Offer one clear word and invite your toddler to try it.",
      steps: [
        "Pick one everyday word (ball, milk, or mama).",
        "Say it slowly while pointing to the thing.",
        "Pause and invite: “Your turn.” Celebrate any try.",
      ],
    },
    sleep: {
      missionId: "speech_toddler_night_word",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "One bedtime word",
      summary: "Choose one calm word to close the day.",
      steps: [
        "At bedtime, pick a soft word like “night” or “love.”",
        "Say it slowly while tucking them in.",
        "Invite a whisper back — any try is enough.",
      ],
    },
    behavior: {
      missionId: "speech_toddler_calm_word",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Name the feeling",
      summary: "Give one feeling word when big feelings show up.",
      steps: [
        "Kneel to their level when emotions rise.",
        "Say one feeling word: “mad,” “sad,” or “tired.”",
        "Pause — let them echo or nod. Stay close.",
      ],
    },
    learning_school: {
      missionId: "speech_toddler_label_play",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Label one toy",
      summary: "Name one toy clearly to grow words through play.",
      steps: [
        "Hold up one familiar toy.",
        "Say its name once, clearly.",
        "Offer it and invite: “Can you say it?”",
      ],
    },
    mornings: {
      missionId: "speech_toddler_morning_word",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Morning word practice",
      summary: "Start the morning with one clear word together.",
      steps: [
        "After waking, pick one morning word (up, milk, shoes).",
        "Say it while doing the action.",
        "Invite them to try — smile at any attempt.",
      ],
    },
    feeding: {
      missionId: "speech_toddler_food_word",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Name the bite",
      summary: "Say one food word before a bite.",
      steps: [
        "Hold up the food and say its name once.",
        "Offer a bite and pause.",
        "Celebrate if they try the word — or just listen.",
      ],
    },
    something_else: {
      missionId: "speech_toddler_one_word",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "One word today",
      summary: "One clear word, said slowly — that is today’s win.",
      steps: [
        "Choose one simple word that fits the moment.",
        "Say it face to face.",
        "Wait kindly for any try.",
      ],
    },
  },
  preschool_3_5: {
    speech_talking: {
      missionId: "speech_preschool_name_it",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Name three things",
      summary: "Take turns naming three things you can see right now.",
      steps: [
        "Look around the room together.",
        "You name one thing clearly. Then your child names one.",
        "Keep going until you have three each — cheers for trying.",
      ],
    },
    sleep: {
      missionId: "speech_preschool_wind_down_talk",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Wind-down talk",
      summary: "Share one calm sentence before sleep.",
      steps: [
        "Sit beside them in low light.",
        "Say one calm sentence about tomorrow being okay.",
        "Ask them for one quiet sentence back — or a whisper.",
      ],
    },
    behavior: {
      missionId: "speech_preschool_choice_words",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Two calm choices",
      summary: "Offer two spoken choices to steady a hard moment.",
      steps: [
        "When tension rises, pause your own voice first.",
        "Offer two clear choices out loud.",
        "Let them answer in words or a point — then follow through.",
      ],
    },
    learning_school: {
      missionId: "speech_preschool_school_words",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "School-ready words",
      summary: "Practice three words they may need at school.",
      steps: [
        "Pick three useful words (help, share, bathroom).",
        "Say each one and act a tiny example.",
        "Invite them to say each back once.",
      ],
    },
    mornings: {
      missionId: "speech_preschool_morning_plan",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "Say the morning plan",
      summary: "Speak the next three morning steps out loud together.",
      steps: [
        "Stand where the morning starts (bed or sink).",
        "Say three steps: wake, wash, dress — slowly.",
        "Ask them to repeat the three steps once.",
      ],
    },
    feeding: {
      missionId: "speech_preschool_meal_chat",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "One meal sentence",
      summary: "Share one sentence about the meal — then invite theirs.",
      steps: [
        "At the table, say one sentence about the food.",
        "Ask: “What do you notice?”",
        "Listen fully to their sentence — no corrections.",
      ],
    },
    something_else: {
      missionId: "speech_preschool_see_and_say",
      duration: "3 min",
      difficulty: "easy",
      estimatedMinutes: 3,
      title: "See and say",
      summary: "Point to three things and name them together.",
      steps: [
        "Point to something nearby and name it.",
        "Invite them to point and name the next.",
        "Finish with a third — then a high five.",
      ],
    },
  },
  child_6_8: {
    speech_talking: {
      missionId: "speech_school_tell_me",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Tell me one story",
      summary: "Ask for one short story about their day — listen fully.",
      steps: [
        "Ask: “What was one thing that happened today?”",
        "Listen without correcting words — nod and smile.",
        "Reflect one sentence back: “You felt proud when…”",
      ],
    },
    sleep: {
      missionId: "speech_school_worry_unload",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Unload one worry",
      summary: "Let them name one worry before sleep — then close gently.",
      steps: [
        "Ask: “What’s one thing on your mind tonight?”",
        "Listen without fixing.",
        "Say: “Thank you for telling me. We can rest now.”",
      ],
    },
    behavior: {
      missionId: "speech_school_repair_words",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Repair with words",
      summary: "Practice one short repair sentence after a hard moment.",
      steps: [
        "When calm returns, sit together briefly.",
        "Model: “I’m sorry I… Next time I’ll…”",
        "Invite their version — accept any honest try.",
      ],
    },
    learning_school: {
      missionId: "speech_school_explain_topic",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Explain one school topic",
      summary: "Ask them to teach you one thing from school.",
      steps: [
        "Ask what they learned that felt interesting.",
        "Listen as they explain in their own words.",
        "Ask one curious follow-up — then thank them.",
      ],
    },
    mornings: {
      missionId: "speech_school_morning_checkin",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Morning check-in",
      summary: "One spoken check-in before the day starts.",
      steps: [
        "Ask: “How are you feeling about today — one word?”",
        "Mirror their word back kindly.",
        "Add: “I’m with you. Let’s begin.”",
      ],
    },
    feeding: {
      missionId: "speech_school_table_talk",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Table talk turn",
      summary: "Take turns with one sentence each at a meal.",
      steps: [
        "You share one sentence about your day.",
        "Invite their one sentence.",
        "Keep it light — no grilling, just presence.",
      ],
    },
    something_else: {
      missionId: "speech_school_one_share",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "One share",
      summary: "Invite one thing they want you to know today.",
      steps: [
        "Ask: “What’s one thing you want me to know?”",
        "Listen all the way through.",
        "Thank them for trusting you.",
      ],
    },
  },
  older_9_plus: {
    speech_talking: {
      missionId: "speech_older_explain",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Explain one idea",
      summary: "Invite them to explain something they know to you.",
      steps: [
        "Ask them to teach you one thing they understand well.",
        "Listen and ask one curious follow-up question.",
        "Thank them for teaching you — confidence sticks.",
      ],
    },
    sleep: {
      missionId: "speech_older_brain_dump",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Two-minute brain dump",
      summary: "Let them speak what’s looping before rest.",
      steps: [
        "Set a two-minute timer if helpful.",
        "Invite: “Say what’s still spinning.”",
        "Close with: “That’s enough for tonight. Rest is allowed.”",
      ],
    },
    behavior: {
      missionId: "speech_older_own_it",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Own it in words",
      summary: "Practice naming what happened without shame.",
      steps: [
        "When calm, ask what they noticed about the moment.",
        "Help them name the feeling in one sentence.",
        "Agree one next-time phrase they can use.",
      ],
    },
    learning_school: {
      missionId: "speech_older_teach_back",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Teach-back",
      summary: "Have them teach back one lesson in their own words.",
      steps: [
        "Pick one school topic from today.",
        "Ask them to teach it to you simply.",
        "Reflect what you learned — they hear their clarity.",
      ],
    },
    mornings: {
      missionId: "speech_older_day_intention",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Name the day intention",
      summary: "Speak one intention for the day out loud.",
      steps: [
        "Ask: “What’s one intention for today?”",
        "You share yours in one sentence too.",
        "Keep it light — no pressure to perform.",
      ],
    },
    feeding: {
      missionId: "speech_older_meal_opinion",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Meal opinion",
      summary: "Invite a real opinion about food — practice clear speech.",
      steps: [
        "Ask what they like or would change about the meal.",
        "Listen without debating.",
        "Thank them for a clear answer.",
      ],
    },
    something_else: {
      missionId: "speech_older_open_floor",
      duration: "5 min",
      difficulty: "medium",
      estimatedMinutes: 5,
      title: "Open floor",
      summary: "Give them the floor for one uninterrupted share.",
      steps: [
        "Say: “You have two minutes — I’m listening.”",
        "Do not interrupt.",
        "End with one sentence of appreciation.",
      ],
    },
  },
};

export function resolveMissionAgeBand(
  ageBand: FrontDoorAgeBand | null | undefined,
): FrontDoorAgeBand {
  return ageBand ?? DEFAULT_MISSION_AGE_BAND;
}

export function resolveMissionWorry(
  worry: FrontDoorWorryId | null | undefined,
): FrontDoorWorryId {
  return worry ?? DEFAULT_MISSION_WORRY;
}

/** The single Speech mission for Today — Age × Worry static lookup. */
export function getTodaySpeechMission(
  session:
    | Pick<V2GuestSession, "ageBand" | "name" | "worry">
    | null
    | undefined,
): TodaySpeechMission {
  const ageBand = resolveMissionAgeBand(session?.ageBand);
  const worry = resolveMissionWorry(session?.worry);
  const seed = MISSION_LOOKUP[ageBand][worry];
  const name = session?.name?.trim() || null;
  const title = name ? `${seed.title} with ${name}` : seed.title;

  return {
    missionId: seed.missionId,
    domain: "speech",
    ageBand,
    worry,
    title,
    duration: seed.duration,
    difficulty: seed.difficulty,
    estimatedMinutes: seed.estimatedMinutes,
    summary: seed.summary,
    steps: seed.steps,
    ctaLabel: "Start today's step",
  };
}

/** All mission ids across the Age × Worry table (for tests / invariants). */
export function listSpeechMissionIds(): readonly string[] {
  const ids: string[] = [];
  for (const age of AGE_BANDS) {
    for (const worry of WORRIES) {
      ids.push(MISSION_LOOKUP[age][worry].missionId);
    }
  }
  return ids;
}

/** Expose table size for regression (5 ages × 7 worries). */
export function missionLookupCellCount(): number {
  return AGE_BANDS.length * WORRIES.length;
}
