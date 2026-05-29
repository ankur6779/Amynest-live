import {
  AGE_BANDS,
  LIFE_SKILL_TOPICS,
  ageBandForLifeSkillTopic,
} from "../constants.js";
import type { AgeBand, LifeSkillsLesson } from "../types.js";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const STORY_OPENERS = [
  "Mia noticed something tricky at school today.",
  "Jordan wanted to make a better choice at the park.",
  "Sam felt unsure but took one brave breath.",
  "Riley saw a friend who needed help.",
  "Casey remembered what their teacher taught last week.",
];

const SCENARIO_PLACES = [
  "classroom",
  "playground",
  "home kitchen",
  "birthday party",
  "library",
  "sports practice",
  "family dinner",
  "school bus stop",
];

function topicNarrative(
  topic: string,
  ageBand: AgeBand,
  slot: number,
): {
  story: string;
  scenario: string;
  question: string;
  choices: string[];
  correctAnswer: string;
  amyTip: string;
} {
  const opener = STORY_OPENERS[slot % STORY_OPENERS.length]!;
  const place = SCENARIO_PLACES[(slot + topic.length) % SCENARIO_PLACES.length]!;
  const young = ageBand === "2-4" || ageBand === "4-6";

  const templates: Record<
    string,
    () => ReturnType<typeof topicNarrative>
  > = {
    Respect: () => ({
      story: `${opener} A classmate spoke during story time. Mia waited, then said, "I have an idea," instead of interrupting.`,
      scenario: `In the ${place}, someone speaks while you are still talking. What shows respect?`,
      question: "What is the most respectful choice?",
      choices: young
        ? ["Talk louder over them", "Wait, then share calmly", "Walk away angry"]
        : [
            "Interrupt back immediately",
            "Listen, then respond politely",
            "Mock them so they stop",
            "Ignore everyone forever",
          ],
      correctAnswer: young ? "Wait, then share calmly" : "Listen, then respond politely",
      amyTip: "Respect means you treat others the way you want to be heard.",
    }),
    Sharing: () => ({
      story: `${opener} There was one swing left. Jordan asked, "Can we take turns for five minutes each?"`,
      scenario: `At the ${place}, two kids want the same toy at once.`,
      question: "What is a fair sharing plan?",
      choices: [
        "Keep it forever",
        "Set a timer and switch",
        "Hide the toy",
        "Grab it first",
      ],
      correctAnswer: "Set a timer and switch",
      amyTip: "Sharing works when the rule is clear and kind.",
    }),
    Kindness: () => ({
      story: `${opener} A new student sat alone. Sam smiled and asked, "Want to build together?"`,
      scenario: `You see someone left out at the ${place}.`,
      question: "Which action is kind?",
      choices: [
        "Invite them to join",
        "Laugh at them",
        "Pretend you do not see them",
        "Tell others to avoid them",
      ],
      correctAnswer: "Invite them to join",
      amyTip: "Small kind words can change someone's whole day.",
    }),
    Gratitude: () => ({
      story: `${opener} After help cleaning up, Riley said, "Thank you for helping me."`,
      scenario: `A friend helps you at the ${place}.`,
      question: "How do you show gratitude?",
      choices: [
        "Say thank you and mean it",
        "Say nothing",
        "Demand more help",
        "Complain about the help",
      ],
      correctAnswer: "Say thank you and mean it",
      amyTip: "Thank-you words show you noticed someone's effort.",
    }),
    Responsibility: () => ({
      story: `${opener} Casey forgot a library book but told the truth and made a plan to return it.`,
      scenario: `You forgot a task before leaving the ${place}.`,
      question: "What is responsible?",
      choices: [
        "Blame someone else",
        "Hide the mistake",
        "Tell the truth and fix it",
        "Ignore it forever",
      ],
      correctAnswer: "Tell the truth and fix it",
      amyTip: "Responsibility is owning your part, even when it is hard.",
    }),
    Safety: () => ({
      story: `${opener} A ball rolled into the street. Mia stopped at the curb and asked a grown-up for help.`,
      scenario: `Something rolls into the road near the ${place}.`,
      question: "What is the safe choice?",
      choices: [
        "Run into the street",
        "Stop and get a grown-up",
        "Chase without looking",
        "Close your eyes",
      ],
      correctAnswer: "Stop and get a grown-up",
      amyTip: "Safe kids pause, look, and ask adults near roads.",
    }),
    "Stranger Awareness": () => ({
      story: `${opener} A person they did not know offered candy. Jordan walked to a trusted adult right away.`,
      scenario: `A stranger near the ${place} asks you to leave with them.`,
      question: "What should you do?",
      choices: [
        "Go with them for candy",
        "Keep secrets for them",
        "Find your trusted adult immediately",
        "Give your address",
      ],
      correctAnswer: "Find your trusted adult immediately",
      amyTip: "Trusted adults are people your family chose ahead of time.",
    }),
    "Internet Safety": () => ({
      story: `${opener} A pop-up asked for a password. Sam closed it and told a parent.`,
      scenario: `Online game at home asks for your full name and school.`,
      question: "What is safest online?",
      choices: [
        "Share passwords to win",
        "Post your address",
        "Ask a parent before sharing info",
        "Meet strangers from chat",
      ],
      correctAnswer: "Ask a parent before sharing info",
      amyTip: "Private information stays with parents, not public games.",
    }),
    "Emotional Intelligence": () => ({
      story: `${opener} Riley felt jealous but said, "I feel left out," instead of yelling.`,
      scenario: `You feel upset at the ${place}.`,
      question: "What helps your brain calm down?",
      choices: [
        "Name your feeling and breathe",
        "Hit something",
        "Keep feelings secret forever",
        "Blame others only",
      ],
      correctAnswer: "Name your feeling and breathe",
      amyTip: "Naming a feeling is the first step to handling it well.",
    }),
    "Self Confidence": () => ({
      story: `${opener} Casey tried a new puzzle and said, "I can learn this step by step."`,
      scenario: `A task at the ${place} feels too hard at first.`,
      question: "What builds confidence?",
      choices: [
        "Try one small step",
        "Say I am bad at everything",
        "Quit before starting",
        "Copy without learning",
      ],
      correctAnswer: "Try one small step",
      amyTip: "Confidence grows when you practice, not when you wait to be perfect.",
    }),
    Communication: () => ({
      story: `${opener} Mia used a clear voice: "I need help tying my shoe."`,
      scenario: `You need help at the ${place}.`,
      question: "Which message is clearest?",
      choices: [
        "Uh... never mind",
        "I need help with this task, please",
        "You always mess up",
        "Say nothing",
      ],
      correctAnswer: "I need help with this task, please",
      amyTip: "Clear words help adults and friends support you faster.",
    }),
    Teamwork: () => ({
      story: `${opener} The group split jobs: one stacks, one passes, one checks.`,
      scenario: `Your team builds a project at the ${place}.`,
      question: "What helps the team most?",
      choices: [
        "Do every job alone without talking",
        "Assign roles and listen",
        "Leave the team",
        "Only criticize",
      ],
      correctAnswer: "Assign roles and listen",
      amyTip: "Teams win when everyone knows their part.",
    }),
    Leadership: () => ({
      story: `${opener} Jordan encouraged others: "Your idea can work—let us try it."`,
      scenario: `Friends disagree at the ${place}.`,
      question: "What does good leadership look like?",
      choices: [
        "Listen, include ideas, decide fairly",
        "Boss others with meanness",
        "Quit the group",
        "Ignore problems",
      ],
      correctAnswer: "Listen, include ideas, decide fairly",
      amyTip: "Leaders guide with respect, not fear.",
    }),
    "Decision Making": () => ({
      story: `${opener} Sam listed pros and cons before choosing a book report topic.`,
      scenario: `You must pick between two activities at the ${place}.`,
      question: "How do you decide well?",
      choices: [
        "Flip a coin only",
        "Think about safety, time, and kindness",
        "Copy a friend without thinking",
        "Choose the unsafe option",
      ],
      correctAnswer: "Think about safety, time, and kindness",
      amyTip: "Good decisions weigh facts, feelings, and safety.",
    }),
    "Conflict Resolution": () => ({
      story: `${opener} Two friends argued. Riley said, "Let us take turns and replay the rule."`,
      scenario: `You and a friend argue at the ${place}.`,
      question: "What solves conflict peacefully?",
      choices: [
        "Use calm words and find a fair rule",
        "Push to win",
        "Spread rumors",
        "Stay angry all week",
      ],
      correctAnswer: "Use calm words and find a fair rule",
      amyTip: "Pause, breathe, then solve the problem—not the friendship.",
    }),
    "Daily Habits": () => ({
      story: `${opener} Casey made a morning chart: wash face, eat breakfast, pack bag.`,
      scenario: `Mornings before the ${place} feel rushed.`,
      question: "Which habit helps most?",
      choices: [
        "Skip breakfast every day",
        "Follow a simple routine list",
        "Hide your shoes",
        "Stay in pajamas",
      ],
      correctAnswer: "Follow a simple routine list",
      amyTip: "Routines turn hard mornings into automatic steps.",
    }),
    Hygiene: () => ({
      story: `${opener} Mia sang a 20-second song while washing hands before snack.`,
      scenario: `Before snack at the ${place}, hands look dirty.`,
      question: "What is proper hygiene?",
      choices: [
        "Wipe on pants only",
        "Wash with soap and water",
        "Skip cleaning",
        "Share one towel with everyone dirty",
      ],
      correctAnswer: "Wash with soap and water",
      amyTip: "Clean hands protect you and friends from germs.",
    }),
    "Time Management": () => ({
      story: `${opener} Jordan used a timer: homework 20 minutes, then play.`,
      scenario: `You have reading and playtime before the ${place} closes.`,
      question: "How do you manage time?",
      choices: [
        "Do nothing until panic",
        "Plan small blocks with breaks",
        "Play all day, skip tasks",
        "Hide the clock",
      ],
      correctAnswer: "Plan small blocks with breaks",
      amyTip: "Timers help your brain focus on one job at a time.",
    }),
    Empathy: () => ({
      story: `${opener} Sam saw a sad friend and said, "Want to sit together?"`,
      scenario: `A friend cries at the ${place}.`,
      question: "What shows empathy?",
      choices: [
        "Ask how they feel and listen",
        "Laugh at them",
        "Walk away fast",
        "Tell them to stop feeling",
      ],
      correctAnswer: "Ask how they feel and listen",
      amyTip: "Empathy is feeling with someone, not fixing them right away.",
    }),
    "Growth Mindset": () => ({
      story: `${opener} Casey said, "I cannot do it yet," and practiced again.`,
      scenario: `You miss a goal at the ${place}.`,
      question: "Which thought is a growth mindset?",
      choices: [
        "I cannot do it yet, I will practice",
        "I will never learn",
        "Quit instantly",
        "Pretend you did not try",
      ],
      correctAnswer: "I cannot do it yet, I will practice",
      amyTip: 'Adding "yet" tells your brain to keep going.',
    }),
  };

  const builder = templates[topic] ?? templates.Kindness!;
  return builder();
}

export function generateLifeSkillsLessons(): LifeSkillsLesson[] {
  const lessons: LifeSkillsLesson[] = [];
  let index = 0;

  for (let t = 0; t < LIFE_SKILL_TOPICS.length; t += 1) {
    const topic = LIFE_SKILL_TOPICS[t]!;
    for (let slot = 0; slot < 15; slot += 1) {
      const ageBand = ageBandForLifeSkillTopic(t, slot);
      const narrative = topicNarrative(topic, ageBand, slot);
      index += 1;
      lessons.push({
        id: `ls-${slug(topic)}-${String(index).padStart(3, "0")}`,
        ageBand,
        skillCategory: topic,
        title: `${topic}: Real-Life Choice ${slot + 1}`,
        story: narrative.story,
        scenario: narrative.scenario,
        question: narrative.question,
        choices: narrative.choices,
        correctAnswer: narrative.correctAnswer,
        amyTip: narrative.amyTip,
        audioText: `${narrative.story} ${narrative.question}`,
      });
    }
  }

  if (lessons.length !== 300) {
    throw new Error(`Expected 300 life skills lessons, got ${lessons.length}`);
  }
  return lessons;
}
