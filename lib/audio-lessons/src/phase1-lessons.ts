import type { Lesson } from "./lesson-types.js";

const P = (l: Lesson): Lesson => l;

/** Phase 1 expansion: +4 lessons per age bucket (English, global). */
export const PHASE1_LESSONS: Lesson[] = [
  // ─── 0–2 ─────────────────────────────────────────────────────────
  P({
    id: "infant-colic-soothing",
    tier: "quick",
    title: { en: "Colic & Evening Fussiness: What Actually Helps" },
    description: { en: "The 5 S's, overstimulation, and when fussiness needs a doctor." },
    durationMin: 3,
    ageBucket: "0-2",
    emoji: "🌙",
    expert: "Based on Dr Harvey Karp & AAP",
    paragraphs: {
      en: [
        "Colic is defined as intense crying for more than 3 hours a day, more than 3 days a week, for at least 3 weeks — usually peaking around 6 to 8 weeks. It is not your fault, and it is not because you are doing something wrong.",
        "Dr Harvey Karp's 5 S framework helps many families: Swaddle, Side/stomach position only while held, Shush (white noise), Swing (gentle motion), and Suck (pacifier or clean finger). Used together, these mimic the womb and calm the nervous system.",
        "Reduce evening overload: dim lights, fewer visitors, shorter wake windows before bed. If crying is high-pitched, feverish, or baby is not feeding or gaining weight, call your paediatrician the same day — that is not colic.",
      ],
    },
  }),
  P({
    id: "infant-safe-sleep-environment",
    tier: "standard",
    title: { en: "Safe Sleep Setup in Any Climate" },
    description: { en: "Room temperature, firm surface, smoke-free air, and what to skip." },
    durationMin: 5,
    ageBucket: "0-2",
    emoji: "🛏️",
    expert: "Based on AAP safe sleep guidelines",
    paragraphs: {
      en: [
        "Safe sleep saves lives. Always place baby on their back, on a firm flat mattress with a fitted sheet only — no pillows, bumpers, soft toys, or weighted blankets in the sleep space.",
        "Room temperature should feel comfortable to a lightly dressed adult — not hot. Overheating is a risk factor. Dress baby in one layer more than you would wear, not a mountain of blankets.",
        "Share the room, not the bed, for at least the first 6 months where possible. If you bring baby into bed for feeding, plan to return them to their own space before you fall asleep.",
        "Keep the air smoke-free. Avoid car seat or swing sleep for long stretches — when baby falls asleep in a seat, move them to a flat crib as soon as you can.",
        "If you use a pacifier at sleep time, offer it consistently once breastfeeding is established. One safe setup, repeated every night, helps baby's brain predict sleep faster.",
      ],
    },
  }),
  P({
    id: "infant-vaccines-well-visits",
    tier: "standard",
    title: { en: "Vaccines & Well-Baby Visits: The Calm Parent Guide" },
    description: { en: "Why the schedule exists, how to prepare, and normal post-vaccine fussiness." },
    durationMin: 5,
    ageBucket: "0-2",
    emoji: "💉",
    expert: "Based on WHO & national immunisation schedules",
    paragraphs: {
      en: [
        "Routine vaccines train the immune system against serious diseases without giving your child the full illness. National schedules exist because millions of children have been studied — the timing is not random.",
        "Before the visit: feed well, bring comfort items, dress in easy layers. Tell the nurse if your child had a fever or unusual reaction last time.",
        "After vaccines, mild fever, fussiness, or a sore leg for 24 to 48 hours is common. Offer extra cuddles, fluids, and paracetamol only if your clinician advises it for your child's age and weight.",
        "True red flags are rare but urgent: non-stop crying for 3+ hours, limpness, high fever that will not respond to medication, or hives — seek care immediately.",
        "Keeping a small card or app photo of the vaccination record saves stress when you travel or change clinics. Prevention is one of the highest-return parenting decisions you will make.",
      ],
    },
  }),
  P({
    id: "infant-when-to-call-doctor",
    tier: "quick",
    title: { en: "When to Call the Doctor Tonight (0–12 Months)" },
    description: { en: "Fever rules, breathing, hydration, and trust-your-gut moments." },
    durationMin: 3,
    ageBucket: "0-2",
    emoji: "🩺",
    expert: "Based on AAP & WHO infant danger signs",
    paragraphs: {
      en: [
        "Under 3 months, any fever of 38°C / 100.4°F or higher needs same-day medical review — babies this young can look 'okay' while infections progress quickly.",
        "Call urgently for fast breathing, blue or grey lips, a sunken soft spot, no wet nappy for 8+ hours, green vomit, blood in stool, or if baby is hard to wake or unusually floppy.",
        "Trust your gut. If something feels wrong after a fall, a rash that does not blanch when pressed, or sudden inconsolable crying, you are allowed to seek help without apologising for 'overreacting'.",
      ],
    },
  }),

  // ─── 2–4 ─────────────────────────────────────────────────────────
  P({
    id: "toddler-picky-eating",
    tier: "standard",
    title: { en: "Picky Eating Without Mealtime Wars" },
    description: { en: "Division of responsibility, exposure, and what not to bargain with." },
    durationMin: 5,
    ageBucket: "2-4",
    emoji: "🥦",
    expert: "Based on Ellyn Satter & WHO feeding guidance",
    paragraphs: {
      en: [
        "Picky eating peaks between 2 and 6. It is rarely about defiance — it is about control, texture sensitivity, and normal neophobia (fear of new foods).",
        "Parents decide what, when, and where food is offered. The child decides whether to eat and how much. Bribing with dessert teaches 'vegetables are punishment, sweets are reward'.",
        "Offer a safe food you know they usually eat alongside one small new or disliked food — no pressure to touch it. Repeated neutral exposure, sometimes 15+ times, is how acceptance builds.",
        "Keep meals short — 20 to 30 minutes — then end calmly. Grazing all day kills appetite at dinner.",
        "Growth is the metric, not a clean plate. If weight and energy are fine, your job is atmosphere, not force-feeding.",
      ],
    },
  }),
  P({
    id: "toddler-hitting-biting",
    tier: "standard",
    title: { en: "Hitting & Biting: Stop, Soothe, Teach" },
    description: { en: "Why toddlers aggress, the in-the-moment script, and prevention." },
    durationMin: 5,
    ageBucket: "2-4",
    emoji: "✋",
    expert: "Based on Dr Laura Markham & AAP",
    paragraphs: {
      en: [
        "Hitting and biting are common between 18 months and 3 years. The toddler brain is emotional first, verbal second. They are communicating a need with the fastest tool they have.",
        "In the moment: block gently, low voice — 'I will not let you hit. Hitting hurts.' Remove or create space. Do not lecture while their lid is flipped.",
        "After calm returns, name the feeling and one alternative: 'You were mad. Next time we stomp feet or use words.' Practice when calm, not during storm.",
        "Prevention beats reaction: hungry, tired toddlers aggress more. Watch wake windows and offer sensory outlets — push, pull, carry heavy things.",
        "If aggression is daily, targeted, or injures others, log patterns and speak to your paediatrician — sometimes sensory or speech delay is underneath.",
      ],
    },
  }),
  P({
    id: "toddler-daycare-transition",
    tier: "quick",
    title: { en: "Starting Daycare or Preschool: A Gentle Transition" },
    description: { en: "Short goodbyes, comfort objects, and predictable pick-up." },
    durationMin: 3,
    ageBucket: "2-4",
    emoji: "🏫",
    expert: "Based on attachment research",
    paragraphs: {
      en: [
        "Separation protest at drop-off is normal for weeks, not days. A long, emotional goodbye actually increases distress — children read your anxiety.",
        "Use the same 3-step ritual every day: specific hug, one sentence ('I will pick you up after snack'), leave confidently. Teachers are trained to help after you go.",
        "Send a comfort object if policy allows — a photo in the bag, same lunch box, same pick-up person when possible.",
      ],
    },
  }),
  P({
    id: "toddler-routines-transitions",
    tier: "standard",
    title: { en: "Routines & Transitions: Ending the Daily Battles" },
    description: { en: "Visual schedules, warnings, and bedtime anchors." },
    durationMin: 5,
    ageBucket: "2-4",
    emoji: "⏰",
    expert: "Based on executive function research",
    paragraphs: {
      en: [
        "Toddlers hate surprises because their prefrontal cortex cannot hold the next step in mind. Routines are external executive function — they lower fights by 50% or more in many homes.",
        "Use a 2-minute warning before every change: 'After this song, we wash hands.' Pair with a visual strip — pictures of eat, play, bath, book, bed.",
        "Anchor bedtime to the same 3 things in the same order every night. Brains learn to release melatonin on cue when the sequence is predictable.",
        "Expect regression with travel, illness, or guests. Return to the same chart without shame — 'We are back to our chart tonight.'",
        "Parents who narrate the schedule aloud model calm transitions: 'Now shoes, then car. First shoes.'",
      ],
    },
  }),

  // ─── 5–7 ─────────────────────────────────────────────────────────
  P({
    id: "early-school-bullying",
    tier: "standard",
    title: { en: "Bullying vs Conflict: What Parents Should Do" },
    description: { en: "Questions to ask, when to escalate, and coaching assertiveness." },
    durationMin: 5,
    ageBucket: "5-7",
    emoji: "🛡️",
    expert: "Based on stopbullying.gov & UNESCO guidance",
    paragraphs: {
      en: [
        "Conflict is mutual; bullying is repeated, intentional, and involves a power imbalance. Both hurt — but the response differs.",
        "Ask open questions: 'Who was there? What happened before? How did you feel?' Avoid 'just ignore it' — that teaches helplessness.",
        "Coach assertive phrases: 'Stop. I don't like that.' Walking toward a teacher. Role-play at home when calm.",
        "Document dates and details if it repeats. Schools need facts to act. Escalate in writing if verbal reports stall.",
        "Watch for sleep changes, stomach aches before school, or sudden withdrawal — bullying often hides behind physical complaints.",
      ],
    },
  }),
  P({
    id: "early-school-lying",
    tier: "quick",
    title: { en: "When Young Children Lie (And How to Respond)" },
    description: { en: "Developmental truth, safety lies, and building honesty." },
    durationMin: 3,
    ageBucket: "5-7",
    emoji: "🤥",
    expert: "Based on Dr Victoria Talwar",
    paragraphs: {
      en: [
        "Lying around 5 to 7 is often cognitive progress — they can hold two stories in mind. It is not moral failure.",
        "Stay neutral: 'I heard two stories. Help me understand what really happened.' Avoid cornering with evidence traps that teach smarter lying.",
        "Praise truth-telling when it was hard: 'Thank you for telling me you broke it. We can fix things when I know the truth.'",
      ],
    },
  }),
  P({
    id: "early-school-exam-anxiety",
    tier: "standard",
    title: { en: "Early Test & School Anxiety" },
    description: { en: "Body calm tools, preparation without pressure, and teacher partnership." },
    durationMin: 5,
    ageBucket: "5-7",
    emoji: "📝",
    expert: "Based on APA child anxiety guidance",
    paragraphs: {
      en: [
        "Stomach aches on school mornings, tears before quizzes, and perfectionism at 6 or 7 are common — especially in high-expectation environments.",
        "Teach body-downshift tools: balloon breathing, 5-4-3-2-1 senses, a 'worry time' 10 minutes after school — not at bedtime.",
        "Prepare practically: sleep, breakfast with protein, materials ready the night before. Process praise: 'You practised the hard words' beats 'you must get full marks'.",
        "Partner with teachers early. A quiet seat, extra time once, or a check-in emoji can prevent shame spirals.",
        "If anxiety blocks school attendance for 2+ weeks or includes panic attacks, seek a child psychologist — early help is highly effective.",
      ],
    },
  }),
  P({
    id: "early-school-sibling-rivalry",
    tier: "standard",
    title: { en: "Sibling Rivalry in the Early School Years" },
    description: { en: "Fair is not equal, 1:1 time, and sportscasting fights." },
    durationMin: 5,
    ageBucket: "5-7",
    emoji: "👧",
    expert: "Based on Adele Faber & Elaine Mazlish",
    paragraphs: {
      en: [
        "Sibling conflict is training ground for negotiation — your job is coach, not full-time judge.",
        "Fair does not mean identical. Older children often need later bedtimes; younger need more physical help. Explain differences without comparison.",
        "Protect 15 minutes of 1:1 time per child daily — phone away. Rivalry is often a bid for exclusive attention.",
        "Sportscast fights without picking sides: 'Two kids, one tablet. Hmm.' Let them propose solutions when safe.",
        "Never compare aloud: 'Why can't you be like your brother?' Comparison poisons both children.",
      ],
    },
  }),

  // ─── 8–10 ────────────────────────────────────────────────────────
  P({
    id: "tween-puberty-basics",
    tier: "standard",
    title: { en: "Puberty Basics Before the Conversation Finds You" },
    description: { en: "Normalize body changes, privacy, and calm Q&A." },
    durationMin: 5,
    ageBucket: "8-10",
    emoji: "🌱",
    expert: "Based on AAP & WHO adolescent health",
    paragraphs: {
      en: [
        "Puberty is starting earlier worldwide — many children first hear about bodies from peers or the internet if home is silent.",
        "Use books and short, matter-of-fact chats: body hair, sweat, periods or wet dreams, emotional waves. One topic per conversation beats one overwhelming lecture.",
        "Normalize privacy: closed doors, knocking, no teasing siblings about changes.",
        "Answer questions without disgust. If you need a pause, say 'Good question — let me find a clear answer and come back tonight.'",
        "If mood, body image, or secrecy spikes suddenly, keep connection — shame grows in silence.",
      ],
    },
  }),
  P({
    id: "tween-cyberbullying",
    tier: "standard",
    title: { en: "Cyberbullying & Online Meanness" },
    description: { en: "Screenshot, block, report, and when to involve school." },
    durationMin: 5,
    ageBucket: "8-10",
    emoji: "💻",
    expert: "Based on Common Sense Media",
    paragraphs: {
      en: [
        "Online harm can follow a child home. Teach: do not respond in anger, screenshot evidence, block, report on-platform, tell a trusted adult the same day.",
        "Distinguish drama from danger — repeated targeting, threats, or exclusion from groups needs adult intervention.",
        "Keep devices in shared spaces until habits are strong. Know the apps — names change monthly.",
        "Never punish a child for reporting ('I will take your phone if you tell me') — that ends disclosure.",
        "Schools increasingly have cyber policies. Written reports with dates beat angry DMs to other parents.",
      ],
    },
  }),
  P({
    id: "tween-pocket-money",
    tier: "quick",
    title: { en: "Pocket Money & Responsibility" },
    description: { en: "Allowance tied to learning, not bribery for chores." },
    durationMin: 3,
    ageBucket: "8-10",
    emoji: "💰",
    expert: "Based on financial literacy research for families",
    paragraphs: {
      en: [
        "Small regular allowance teaches planning better than random handouts. Keep amounts simple and age-appropriate.",
        "Separate 'family jobs we all do' from paid extras if you use paid tasks — otherwise children negotiate brushing teeth.",
        "Use three jars: spend, save, give. Let them make small mistakes now — a blown 10-dollar lesson beats a blown credit card at 19.",
      ],
    },
  }),
  P({
    id: "tween-exam-stress",
    tier: "standard",
    title: { en: "Exam Pressure Without Burning Them Out" },
    description: { en: "Sleep, spacing study, and separating worth from scores." },
    durationMin: 5,
    ageBucket: "8-10",
    emoji: "📚",
    expert: "Based on learning science & child wellbeing research",
    paragraphs: {
      en: [
        "Scores at 8 to 10 predict habits more than destiny — but children often believe one bad test defines them.",
        "Protect sleep first — memory consolidation happens in sleep, not in midnight cramming.",
        "Teach spaced practice: 20 minutes most days beats 2 hours the night before.",
        "Separate person from paper: 'This mark is feedback on the work, not on you.' Share your own failure stories.",
        "If tears, avoidance, or somatic complaints appear every test cycle, discuss load with school and consider counselling before secondary school pressure peaks.",
      ],
    },
  }),

  // ─── 10+ ─────────────────────────────────────────────────────────
  P({
    id: "teen-exam-boards-stress",
    tier: "standard",
    title: { en: "Big Exam Years: Support Without Taking Over" },
    description: { en: "Structure, breaks, and parent anxiety containment." },
    durationMin: 6,
    ageBucket: "10+",
    emoji: "📖",
    expert: "Based on adolescent learning & stress research",
    paragraphs: {
      en: [
        "High-stakes exam seasons raise cortisol for the whole house. Your regulation is contagious — anxious hovering increases teen avoidance.",
        "Co-create a weekly plan with breaks built in — brains need 5-minute movement every 45 to 50 minutes.",
        "Feed the brain: hydration, protein, regular meals. Caffeine and skipped breakfast spike jitters.",
        "Offer help as optional: 'Want me to quiz you or leave you quiet?' Respect closed doors with agreed check-in times.",
        "Watch for panic, self-harm talk, or total shutdown — those need professional support, not tougher schedules.",
      ],
    },
  }),
  P({
    id: "teen-substance-awareness",
    tier: "standard",
    title: { en: "Vaping, Alcohol & Peer Pressure: Early Conversations" },
    description: { en: "Facts without scare tactics, exit scripts, and family rules." },
    durationMin: 5,
    ageBucket: "10+",
    emoji: "🚭",
    expert: "Based on CDC & adolescent health programmes",
    paragraphs: {
      en: [
        "Conversations before first exposure land better than lectures after trouble. Start with curiosity: 'What are kids saying about vaping at school?'",
        "Give short facts: nicotine rewires teen brains faster; alcohol impairs judgement and sleep; cannabis affects motivation and driving.",
        "Role-play exits: 'No thanks, I get tested for sport' / 'My mum picks me up — smell check.'",
        "Clear family rules with consistent consequences — ambiguity invites testing.",
        "If you suspect use, stay calm enough to keep talking. Punishment-only approaches often drive secrecy.",
      ],
    },
  }),
  P({
    id: "teen-consent-boundaries",
    tier: "quick",
    title: { en: "Consent, Boundaries & Respectful Relationships" },
    description: { en: "Body autonomy, digital boundaries, and respecting 'no'." },
    durationMin: 3,
    ageBucket: "10+",
    emoji: "🤝",
    expert: "Based on UNESCO comprehensive sexuality education framework",
    paragraphs: {
      en: [
        "Consent is ongoing permission that can be withdrawn — for touch, photos, jokes, and group chats. Model stopping when someone says no, including with siblings.",
        "Digital consent matters: ask before posting their photo; teach them to never forward intimate images — legal and emotional harm is severe.",
        "Porn is not sex education — if they have seen it, stay calm, correct myths, and restate real relationships need respect and communication.",
      ],
    },
  }),
  P({
    id: "teen-parent-teen-repair",
    tier: "standard",
    title: { en: "Repair After You & Your Teen Collide" },
    description: { en: "Apologies that land, rebuilding trust, and staying the safe base." },
    durationMin: 5,
    ageBucket: "10+",
    emoji: "💬",
    expert: "Based on Dr Dan Siegel & Dr Lisa Damour",
    paragraphs: {
      en: [
        "Every parent–teen pair has ruptures. Repair predicts long-term closeness more than never fighting.",
        "A good apology names impact without excuses: 'I yelled. That was scary. I am sorry.' Not 'Sorry but you made me…'",
        "Repair timing: after both bodies are calm — often hours later. A text can open the door: 'Can we try that conversation again?'",
        "Invite their version: 'What was that like for you?' Listen without defending.",
        "One repaired conflict teaches your teen they can come back to you when life hits hard — that is the goal, not winning the argument.",
      ],
    },
  }),
];
