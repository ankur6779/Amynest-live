import { AGE_BANDS, EVENT_PREP_TYPES } from "../constants.js";
import type { AgeBand, EventPrepActivity } from "../types.js";

function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

const THEMES = [
  "Friendship and kindness",
  "Protecting nature",
  "Reading adventures",
  "Space explorers",
  "Healthy habits hero",
  "Community helpers",
  "Festival of lights",
  "Sportsmanship",
  "Inventors and curiosity",
  "Ocean discovery",
  "Music and rhythm",
  "Family traditions",
  "Anti-bullying champions",
  "Dream big goals",
  "Gratitude celebration",
  "Teamwork trophy",
  "Creative art day",
  "Safety superstars",
  "Animal friends",
  "Future leaders",
];

const CONFIDENCE: Array<"gentle" | "building" | "ready"> = [
  "gentle",
  "building",
  "ready",
];

function speechFor(
  eventType: string,
  ageBand: AgeBand,
  theme: string,
  index: number,
): string {
  const short = ageBand === "2-4" || ageBand === "4-6";
  const lines: Record<string, string[]> = {
    Speech: [
      `Good morning everyone. Today I will speak about ${theme}. I learned one kind action can brighten a whole room. Thank you for listening.`,
      `Hello friends and teachers. My topic is ${theme}. I will share one story from my week and one promise I will keep. Thank you.`,
      `Respected guests, students, and teachers. ${theme} matters because small steps become big change. I am proud to stand here today. Thank you.`,
    ],
    Anchoring: [
      `Welcome to our program on ${theme}! Please welcome our first performers with a big smile.`,
      `Good evening everyone. I am your host tonight. Our theme is ${theme}. Let us enjoy each act with cheers.`,
      `Ladies and gentlemen, boys and girls—welcome! Tonight we celebrate ${theme}. Keep your applause ready.`,
    ],
    Presentation: [
      `Hello, my presentation is about ${theme}. Here are three things I learned and one question for you.`,
      `Today I will show what ${theme} means with pictures and examples from school and home.`,
      `I researched ${theme}. My key idea: learn, practice, and share. I welcome your questions at the end.`,
    ],
    "Fancy Dress": [
      `I am dressed as a community helper for ${theme}. I help people stay safe and kind every day.`,
      `My costume shows a curious scientist exploring ${theme}. I observe, ask questions, and learn.`,
      `I represent a tree guardian for ${theme}. I protect plants because Earth is our shared home.`,
    ],
    "Show And Tell": [
      `This object reminds me of ${theme}. I chose it because it teaches me to be responsible.`,
      `I brought something special from home. It connects to ${theme} and a memory with my family.`,
      `Here is my favorite book item. It links to ${theme} and helps me practice reading daily.`,
    ],
    Debate: [
      `I believe ${theme} should be taught in school because kids practice respect early.`,
      `My side supports ${theme}. Reason one: safety. Reason two: kindness. Reason three: teamwork.`,
      `I respect the other view, but ${theme} helps students make better choices every day.`,
    ],
    Storytelling: [
      `Once upon a time, a child faced a problem about ${theme}. With courage and help, the day ended bright.`,
      `Long ago in a small town, friends learned about ${theme}. They listened, shared, and solved together.`,
      `There was a shy student who loved ${theme}. One brave step turned worry into confidence.`,
    ],
    "Quiz Host": [
      `Welcome to the quiz on ${theme}! Question one: what does kindness look like at school?`,
      `It is quiz time about ${theme}. Teams ready? Remember: listen first, answer second.`,
      `Round two of our ${theme} quiz. Clap for every team—even when answers are wrong, we learn.`,
    ],
    "School Assembly": [
      `Please stand for the morning prayer and pledge. Our theme this week is ${theme}.`,
      `Announcements: today we celebrate ${theme}. Let us be safe in lines and kind in halls.`,
      `Before we dismiss, remember ${theme}. Help a friend, thank a teacher, walk safely.`,
    ],
    "Cultural Program": [
      `Our dance shares joy from ${theme}. Watch the rhythm and smile with us.`,
      `This song celebrates ${theme}. Clap on the beat and thank the performers.`,
      `We end with gratitude for ${theme}. Culture teaches us to respect every family story.`,
    ],
  };
  const pool = lines[eventType] ?? lines.Speech!;
  const text = pool[index % pool.length]!;
  if (short && text.length > 280) {
    return text.slice(0, 260).replace(/\s+\S*$/, "") + " Thank you.";
  }
  return text;
}

export function generateEventPrepActivities(): EventPrepActivity[] {
  const activities: EventPrepActivity[] = [];
  let n = 0;

  for (const eventType of EVENT_PREP_TYPES) {
    for (let i = 0; i < 20; i += 1) {
      const ageBand = AGE_BANDS[i % AGE_BANDS.length]!;
      const theme = THEMES[(i + eventType.length) % THEMES.length]!;
      const confidenceLevel = CONFIDENCE[i % CONFIDENCE.length]!;
      const speech = speechFor(eventType, ageBand, theme, i);
      n += 1;
      activities.push({
        id: `ep-${slug(eventType)}-${String(n).padStart(3, "0")}`,
        eventType,
        ageBand,
        confidenceLevel,
        title: `${eventType} Studio ${i + 1}`,
        eventTheme: theme,
        speech,
        practiceTips: [
          "Stand tall, shoulders relaxed, feet steady.",
          "Speak one sentence, breathe, then continue.",
          "Practice in front of a mirror twice daily.",
        ],
        confidenceTips: [
          confidenceLevel === "gentle"
            ? "Start with whisper practice, then normal voice."
            : confidenceLevel === "building"
              ? "Record yourself and listen for clear words."
              : "Teach a friend your opening line to own it.",
          "Smile before your first word—it calms your body.",
          "If you forget, pause and read your next line slowly.",
        ],
        audioText: speech,
      });
    }
  }

  if (activities.length !== 200) {
    throw new Error(`Expected 200 event prep activities, got ${activities.length}`);
  }
  return activities;
}
