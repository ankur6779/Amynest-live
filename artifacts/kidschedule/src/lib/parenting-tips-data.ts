import type { AgeGroup } from "./age-groups";

export type TipCategory = "tip" | "health" | "activity" | "guidance";
export type TipLang = "en";

export type TipEntry = {
  id: string;
  en: string;
};

export const CATEGORY_META: Record<
  TipCategory,
  { emoji: string; label: { en: string }; gradient: string; ring: string }
> = {
  tip:      { emoji: "💡", label: { en: "Today's Tip"     }, gradient: "",  ring: "ring-primary"  },
  health:   { emoji: "🩺", label: { en: "Health Tip" }, gradient: "",  ring: "ring-primary" },
  activity: { emoji: "🎯", label: { en: "Activity"        }, gradient: "",      ring: "ring-primary"     },
  guidance: { emoji: "💗", label: { en: "Parent Guidance"  }, gradient: "",     ring: "ring-primary"    },
};

export const PARENTING_TIPS: Record<AgeGroup, Record<TipCategory, TipEntry[]>> = {
  // ─── INFANT (0–1) ────────────────────────────────────────────
  infant: {
    tip: [
      { id: "i-t-1", en: "Keep baby's sleep routine consistent — same time, same lullaby every night." },
      { id: "i-t-2", en: "Use a soft voice when talking before sleep — your tone calms baby's brain." },
      { id: "i-t-3", en: "Respond to every cry within 1 minute — it builds deep trust." },
      { id: "i-t-4", en: "Skin-to-skin contact for 15 minutes daily boosts bonding hormones." },
      { id: "i-t-5", en: "Talk to your baby constantly — narrate what you're doing." },
      { id: "i-t-6", en: "Dim lights 30 minutes before bedtime to signal sleep time." },
      { id: "i-t-7", en: "Avoid screens completely under 18 months — eyes still developing." },
      { id: "i-t-8", en: "Sing the same lullaby every night — repetition gives security." },
    ],
    health: [
      { id: "i-h-1", en: "Burp baby for 5 minutes after every feed to prevent gas." },
      { id: "i-h-2", en: "Check vaccination calendar this month — never skip a due date." },
      { id: "i-h-3", en: "Sterilize bottles in boiling water for 5 minutes daily." },
      { id: "i-h-4", en: "Tummy time 3 times a day strengthens neck and back muscles." },
      { id: "i-h-5", en: "Watch for normal poop color — yellow or mustard is healthy." },
      { id: "i-h-6", en: "Massage baby with warm oil 20 minutes before bath — boosts circulation." },
      { id: "i-h-7", en: "Keep room temperature 24–26°C — neither too hot nor too cold." },
    ],
    activity: [
      { id: "i-a-1", en: "Show a colorful toy and slowly move it side to side — eye tracking." },
      { id: "i-a-2", en: "Play peek-a-boo for 5 minutes — teaches object permanence." },
      { id: "i-a-3", en: "Read a board book aloud — even if baby just looks at pictures." },
      { id: "i-a-4", en: "Place a small mirror in front — babies love seeing faces." },
      { id: "i-a-5", en: "Make different facial expressions — baby will try to copy you." },
      { id: "i-a-6", en: "Gently shake a rattle on each side — helps locate sound." },
      { id: "i-a-7", en: "Hold baby upright and dance slowly to soft music — vestibular fun." },
    ],
    guidance: [
      { id: "i-g-1", en: "Never compare your baby's milestones — every child grows at their own pace." },
      { id: "i-g-2", en: "Trust your gut — if something feels off, talk to the doctor." },
      { id: "i-g-3", en: "Sleep when baby sleeps — your rest matters as much as theirs." },
      { id: "i-g-4", en: "Ask for help — accepting support is not weakness, it's wisdom." },
      { id: "i-g-5", en: "It's okay to feel overwhelmed — you're doing harder work than you realize." },
      { id: "i-g-6", en: "Celebrate small wins — every diaper change and feed counts as parenting." },
    ],
  },

  // ─── TODDLER (1–3) ───────────────────────────────────────────
  toddler: {
    tip: [
      { id: "t-t-1", en: "Offer choices, not commands — 'red shirt or blue?' instead of 'wear this'." },
      { id: "t-t-2", en: "Get down to their eye level when talking — it builds connection fast." },
      { id: "t-t-3", en: "Tantrums mean big feelings — stay calm, hold space, don't argue." },
      { id: "t-t-4", en: "Use 'when-then' instead of 'no' — 'when toys are away, then storytime'." },
      { id: "t-t-5", en: "Praise effort not result — 'you tried so hard!' not just 'good job'." },
      { id: "t-t-6", en: "Read the same book 100 times — repetition builds vocabulary deeply." },
      { id: "t-t-7", en: "Give a 5-minute warning before transitions — toddlers need time to switch." },
      { id: "t-t-8", en: "Limit screen to 30 minutes a day — choose slow, quiet shows." },
    ],
    health: [
      { id: "t-h-1", en: "Brush teeth twice daily — make it a fun song they look forward to." },
      { id: "t-h-2", en: "Offer water in a sippy cup every hour — toddlers forget to drink." },
      { id: "t-h-3", en: "Include 1 fruit and 1 veggie at every meal — even if just a tiny piece." },
      { id: "t-h-4", en: "30 minutes of outdoor play daily — sunlight helps Vitamin D and mood." },
      { id: "t-h-5", en: "Put toddler to bed by 8 PM — sleep before 9 grows brain best." },
      { id: "t-h-6", en: "Avoid sugar drinks completely — water and milk are enough." },
      { id: "t-h-7", en: "Wash hands before every meal with a 20-second song." },
    ],
    activity: [
      { id: "t-a-1", en: "Sort toys by color in 3 baskets — teaches color and order together." },
      { id: "t-a-2", en: "Give a wooden spoon and a pot — the best drum set ever." },
      { id: "t-a-3", en: "Stack cups or blocks then knock them down — physics lesson!" },
      { id: "t-a-4", en: "Sing 'Head Shoulders Knees Toes' — teaches body parts and rhythm." },
      { id: "t-a-5", en: "Hide a toy under a cup and switch — cup game builds memory." },
      { id: "t-a-6", en: "Fill a tray with rice and let them dig with hands — sensory play." },
      { id: "t-a-7", en: "Pretend to cook together with empty pots — imagination starts here." },
    ],
    guidance: [
      { id: "t-g-1", en: "Saying 'no' 100 times a day is normal — they're testing the world." },
      { id: "t-g-2", en: "When you lose your temper, apologize — it teaches them how to repair." },
      { id: "t-g-3", en: "Don't punish for accidents — spilled milk is just spilled milk." },
      { id: "t-g-4", en: "One 'special 10 minutes' a day — undivided attention transforms behavior." },
      { id: "t-g-5", en: "Toddlers can't share until 4 — don't force it, model it instead." },
      { id: "t-g-6", en: "Validate feelings — 'you're sad we left the park' before redirecting." },
    ],
  },

  // ─── PRESCHOOL (3–5) ─────────────────────────────────────────
  preschool: {
    tip: [
      { id: "p-t-1", en: "Ask 'what do you think?' before answering — builds critical thinking." },
      { id: "p-t-2", en: "Read 20 minutes daily — strongest predictor of school success." },
      { id: "p-t-3", en: "Let them pour their own water and dress themselves — independence grows fast." },
      { id: "p-t-4", en: "Use 'I' statements when upset — 'I feel tired' not 'you make me tired'." },
      { id: "p-t-5", en: "Ask open questions about their day — 'best part?' instead of 'how was it?'." },
      { id: "p-t-6", en: "Make mistakes openly — show them how to laugh and try again." },
      { id: "p-t-7", en: "Keep TV out of bedroom — better sleep means better learning." },
      { id: "p-t-8", en: "Family dinner without screens 4x a week — boosts vocabulary by 1000 words." },
    ],
    health: [
      { id: "p-h-1", en: "60 minutes of active play daily — running, jumping, climbing." },
      { id: "p-h-2", en: "Sleep 10–13 hours total including nap — non-negotiable for brain growth." },
      { id: "p-h-3", en: "Brush teeth with parent supervision until age 7 — they miss spots." },
      { id: "p-h-4", en: "Pack 5 colors on the plate — variety prevents picky eating." },
      { id: "p-h-5", en: "Annual eye check from age 3 — many vision issues are silent." },
      { id: "p-h-6", en: "Use the bathroom right before bed — fewer accidents at night." },
      { id: "p-h-7", en: "Limit juice to 120ml a day — water and milk should be the default." },
    ],
    activity: [
      { id: "p-a-1", en: "Make a treasure hunt with 5 picture clues — practices reading and logic." },
      { id: "p-a-2", en: "Play 'I Spy' with colors and shapes — builds vocabulary on the go." },
      { id: "p-a-3", en: "Sort coins by size, value, year — math hidden in fun." },
      { id: "p-a-4", en: "Bake together — measuring cups teach fractions naturally." },
      { id: "p-a-5", en: "Build a fort with blankets and chairs — engineering and creativity!" },
      { id: "p-a-6", en: "Play freeze dance — when music stops, freeze. Self-control practice." },
      { id: "p-a-7", en: "Draw their day in 4 boxes like a comic — storytelling skill." },
    ],
    guidance: [
      { id: "p-g-1", en: "Time-in not time-out — sit together until big feelings pass." },
      { id: "p-g-2", en: "Whisper instead of shouting when they're loud — they'll lean in to listen." },
      { id: "p-g-3", en: "Let them be bored sometimes — boredom births creativity." },
      { id: "p-g-4", en: "Apologize when wrong — kids who see this become emotionally healthy adults." },
      { id: "p-g-5", en: "Avoid 'good girl/boy' labels — say what they did, not what they are." },
      { id: "p-g-6", en: "Connection before correction — hug first, teach second." },
    ],
  },

  // ─── EARLY SCHOOL (5–10) ─────────────────────────────────────
  early_school: {
    tip: [
      { id: "e-t-1", en: "Set a homework-first rule before TV — habit beats willpower every day." },
      { id: "e-t-2", en: "Ask 'what was hard today?' — opens deeper conversations than 'how was school?'." },
      { id: "e-t-3", en: "Give chores with money — earned allowance teaches value early." },
      { id: "e-t-4", en: "Praise the strategy, not the talent — 'smart way to solve it!'." },
      { id: "e-t-5", en: "Plan one screen-free family night a week — board games and laughter." },
      { id: "e-t-6", en: "Let them pack their own school bag — responsibility starts here." },
      { id: "e-t-7", en: "Teach them to lose well — practice in family games every weekend." },
      { id: "e-t-8", en: "Read aloud together even now — listening grows imagination." },
    ],
    health: [
      { id: "e-h-1", en: "9–11 hours of sleep — screens off 1 hour before bed." },
      { id: "e-h-2", en: "60 minutes of physical play or sport every day — non-negotiable." },
      { id: "e-h-3", en: "Pack a protein at every meal — eggs, dal, paneer, chicken." },
      { id: "e-h-4", en: "Keep dental check-up every 6 months — prevents big bills later." },
      { id: "e-h-5", en: "Teach hygiene — handwash, daily bath, clean nails routine." },
      { id: "e-h-6", en: "Watch posture during homework — break every 30 min." },
      { id: "e-h-7", en: "Eye care — 20-20-20 rule: every 20 min, look 20 feet away for 20 sec." },
    ],
    activity: [
      { id: "e-a-1", en: "Make a 'why' jar — they ask 1 curious question daily, you research together." },
      { id: "e-a-2", en: "Cook one simple recipe a week together — math, chemistry, life skill." },
      { id: "e-a-3", en: "Start a small plant project — observe and journal growth." },
      { id: "e-a-4", en: "Family chess or carrom night — strategy thinking grows fast." },
      { id: "e-a-5", en: "Build a paper airplane challenge — test which design flies furthest." },
      { id: "e-a-6", en: "Write and act a 5-minute play — confidence and language together." },
      { id: "e-a-7", en: "Map a treasure hunt around the house — geography starts at home." },
    ],
    guidance: [
      { id: "e-g-1", en: "Listen without solving — sometimes they just need to be heard." },
      { id: "e-g-2", en: "Avoid comparing with siblings or classmates — it kills self-worth slowly." },
      { id: "e-g-3", en: "Allow safe failure — protected kids become fragile adults." },
      { id: "e-g-4", en: "Set screen-time rules together — they follow what they help create." },
      { id: "e-g-5", en: "Praise effort and kindness more than marks — character lasts longer." },
      { id: "e-g-6", en: "Eat dinner together — kids who do are healthier and happier." },
    ],
  },

  // ─── PRE-TEEN (10–15) ────────────────────────────────────────
  pre_teen: {
    tip: [
      { id: "x-t-1", en: "Drive time = talk time — kids open up most when not facing you." },
      { id: "x-t-2", en: "Knock before entering their room — respect builds trust." },
      { id: "x-t-3", en: "Talk about real topics — money, safety, relationships, mental health." },
      { id: "x-t-4", en: "Don't lecture — ask questions and let them think out loud." },
      { id: "x-t-5", en: "Watch a show or play a game they love — entering their world matters." },
      { id: "x-t-6", en: "Set phone curfew — phones out of bedroom by 9 PM." },
      { id: "x-t-7", en: "Teach how to disagree respectfully — model it in your own conversations." },
      { id: "x-t-8", en: "Encourage one passion deeply — depth beats spreading thin." },
    ],
    health: [
      { id: "x-h-1", en: "8–10 hours sleep — growth and brain wiring happen at night." },
      { id: "x-h-2", en: "Daily protein + iron — especially important during growth spurts." },
      { id: "x-h-3", en: "Open conversation about puberty — better from you than the internet." },
      { id: "x-h-4", en: "Encourage 1 sport — physical activity protects mental health." },
      { id: "x-h-5", en: "Limit junk food at home — they eat what's available." },
      { id: "x-h-6", en: "Teach period or shaving care openly — it's just biology, no shame." },
      { id: "x-h-7", en: "Annual full body check-up — catch issues before they grow." },
    ],
    activity: [
      { id: "x-a-1", en: "Plan a weekend trip together — they decide budget, route, food." },
      { id: "x-a-2", en: "Cook a full meal together — recipe, shop, prep, serve." },
      { id: "x-a-3", en: "Watch a documentary together and discuss — sparks real ideas." },
      { id: "x-a-4", en: "Start a small saving goal — let them earn and track." },
      { id: "x-a-5", en: "Teach a life skill — change a tyre, sew a button, set up a router." },
      { id: "x-a-6", en: "Volunteer together once a month — empathy grows by doing." },
      { id: "x-a-7", en: "Read the same book and discuss — book club of two." },
    ],
    guidance: [
      { id: "x-g-1", en: "Their mood swings are not personal — hormones are doing their job." },
      { id: "x-g-2", en: "Pick your battles — clothes and hair are not worth war." },
      { id: "x-g-3", en: "Privacy is a need, not a luxury — give it generously." },
      { id: "x-g-4", en: "Stay curious not furious — ask 'help me understand' before reacting." },
      { id: "x-g-5", en: "Friends matter more than you now — that's healthy, not betrayal." },
      { id: "x-g-6", en: "Stay accessible — be the safe place they return to without judgement." },
    ],
  },
};
