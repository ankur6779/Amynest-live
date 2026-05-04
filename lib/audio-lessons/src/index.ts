export type AgeBucket = "0-2" | "2-4" | "5-7" | "8-10" | "10+";
export type LangCode = "en";

export interface MultiLang {
  en: string;
}

export interface Lesson {
  id: string;
  title: MultiLang;
  description: MultiLang;
  durationMin: number;
  ageBucket: AgeBucket;
  emoji: string;
  expert: string;
  paragraphs: {
    en: string[];
  };
}

export function getLessonText(lesson: Lesson, _lang?: string) {
  return {
    title: lesson.title.en,
    description: lesson.description.en,
    paragraphs: lesson.paragraphs.en,
  };
}

const L = (l: Lesson): Lesson => l;

export const LESSONS: Lesson[] = [
  // ─── 0–2 yrs ─────────────────────────────────────────────────────
  L({
    id: "infant-sleep-foundations",
    title: {
      en: "The Sleep Foundations Every Newborn Parent Needs",
    },
    description: {
      en: "Wake windows, drowsy-but-awake, the 4-month sleep regression — explained simply.",
    },
    durationMin: 4, ageBucket: "0-2", emoji: "🌙", expert: "Based on AAP & Dr Harvey Karp",
    paragraphs: {
      en: [
        "Newborn sleep is not broken — it is biologically designed to be short, fragmented, and frequent. In the first 12 weeks, your baby has no circadian rhythm yet. Their melatonin production matures around week 8 to 12, which is why bedtimes start to settle only after that point.",
        "The single most useful tool in the first year is the wake window. A wake window is the time your baby stays awake between sleeps. For 0 to 8 weeks it is roughly 45 to 60 minutes. For 3 to 4 months it grows to 75 to 90 minutes. Putting your baby down before they cross their wake window is the #1 way to avoid the over-tired, hard-to-settle spiral.",
        "Place your baby in the crib drowsy but awake. This sounds clinical but it is the bedrock of independent sleep. If they always fall asleep on the breast, bottle, or in your arms, they will wake every sleep cycle (about every 45 minutes) and look for that exact same condition to fall back asleep.",
        "The 4-month sleep regression is not a regression — it is a permanent reorganisation of your baby's sleep architecture. Their sleep now has cycles like an adult, but they do not yet know how to bridge those cycles on their own. This is the right moment to gently teach independent sleep.",
        "Most importantly: a 'good sleeper' is largely made, not born. Consistency over the same 2 weeks beats any single technique. Pick one approach, and stick with it.",
      ],
    },
  }),
  L({
    id: "infant-feeding-cues",
    title: {
      en: "Reading Your Baby's Hunger and Fullness Cues",
    },
    description: {
      en: "Stop watching the clock. Read the baby — early hunger, late hunger, fullness signals.",
    },
    durationMin: 3, ageBucket: "0-2", emoji: "🍼", expert: "Based on WHO & Ellyn Satter",
    paragraphs: {
      en: [
        "Babies are born with one of the most reliable hunger and fullness systems in nature. Our job is to not break it. Schedule-feeding by the clock works against this; cue-feeding works with it.",
        "Early hunger cues: stirring, opening the mouth, turning the head and rooting, hand to mouth. This is the ideal time to feed — baby is calm and feeds efficiently.",
        "Mid hunger cues: stretching, increasing physical movement, fussing. You still have a calm window of a few minutes.",
        "Late hunger cues: crying, agitation, red face. Once a baby is crying from hunger, they are too dysregulated to latch well. Calm them first (skin-to-skin, gentle rocking) before offering the feed.",
        "Fullness cues are equally important: turning away, slowing the suck, falling asleep, pushing the bottle out, closing the mouth. Honour them. Forcing a baby to 'finish the bottle' overrides their satiety system and is one of the earliest causes of feeding battles later.",
      ],
    },
  }),
  L({
    id: "infant-tummy-time",
    title: {
      en: "Tummy Time: The 5-Minute Habit That Changes Everything",
    },
    description: {
      en: "Why tummy time matters, when to start, and how to do it without tears.",
    },
    durationMin: 3, ageBucket: "0-2", emoji: "🤸", expert: "Based on AAP & paediatric PT",
    paragraphs: {
      en: [
        "Tummy time is the single most important developmental activity in the first 6 months. It builds neck strength, shoulder stability, core control, and prepares the baby for rolling, sitting, crawling and even later fine-motor skills.",
        "Start from day one. A 1 to 2 minute session 3 to 5 times a day is the goal. By 3 months, aim for 15 to 30 minutes total per day in short bursts.",
        "Most babies hate it at first. That is normal — it is hard work for them. Get down on the floor face-to-face with your baby. Sing, talk, make eye contact. Your face is the best toy.",
        "If your baby cries within seconds, try chest-to-chest tummy time on your reclined body. It still counts.",
        "Skipping tummy time is linked to delayed gross-motor milestones and to plagiocephaly (flat head). Make it a non-negotiable daily ritual, not a 'when I remember' activity.",
      ],
    },
  }),
  L({
    id: "infant-bonding-language",
    title: {
      en: "How Talking to Your Baby Wires Their Brain",
    },
    description: {
      en: "The 30-million-word gap and why narrating your day matters.",
    },
    durationMin: 3, ageBucket: "0-2", emoji: "🧠", expert: "Based on Hart & Risley research",
    paragraphs: {
      en: [
        "By age 4, children from talk-rich homes have heard roughly 30 million more words than children from talk-poor homes. This gap predicts vocabulary, reading readiness, and academic outcomes years later.",
        "The good news: 'talk-rich' is free. Narrate your day. 'Now mama is rinsing the dal, see the bubbles, the water is warm.' Your baby does not understand the words but their brain is laying down the language scaffolding.",
        "Use parentese, not baby talk. Parentese is real words spoken with exaggerated melody, longer vowels and slightly higher pitch. It is the format babies process best.",
        "Pause and wait. When your baby coos or babbles, respond. Then pause. This 'serve and return' is the foundation of conversation and one of the strongest predictors of later language.",
        "Read aloud daily, even at 3 months. The same book over and over is a feature, not a bug — repetition is how language consolidates.",
      ],
    },
  }),
  L({
    id: "health-early-milestones",
    title: {
      en: "Milestones 0–5: Sign-Posts, Not Deadlines (and the Red Flags You Must Not Wait On)",
    },
    description: {
      en: "What's normal range, what's not, and exactly when to ask for an evaluation.",
    },
    durationMin: 5, ageBucket: "0-2", emoji: "🌱",
    expert: "Based on CDC Learn the Signs / AAP Bright Futures & Indian Academy of Pediatrics",
    paragraphs: {
      en: [
        "Developmental milestones are the typical age range when most children reach a skill — not deadlines. The CDC updated its checklist in 2022 specifically because the old '50 percent of kids do this by X' was making families wait too long. The new checklist marks milestones at the age 75 percent of kids should be doing them. If your child has not, that is the moment to ask, not to wait.",
        "By 12 months, most babies respond to their name, look where you point, babble, and stand with help. By 18 months, single words, walking, pointing to ask for things, and simple play (feeding a doll). By 2 years, two-word phrases, running, and copying you doing chores. By 3 years, short sentences, riding a tricycle, separating from you without a meltdown most days. By 4 years, telling a simple story, drawing a person with two body parts, hopping on one foot.",
        "Red flags that need a same-week paediatric review, no waiting: no babbling by 12 months, no single words by 16 months, no two-word phrases by 24 months, ANY loss of skills they previously had at any age, no eye contact, not responding to their name by 12 months, walking on toes only, hand flapping, lining up toys repeatedly, or major delays compared to siblings at the same age.",
        "The single biggest brain-builder is serve-and-return: your baby coos, you coo back. Your toddler points at a dog, you say 'yes, big brown dog'. This back-and-forth, not flashcards or apps, builds language and the social brain. Harvard's Center on the Developing Child has 30 years of evidence: the quality of these tiny exchanges predicts cognition more than any toy or programme.",
        "If something feels off, trust the gut. Early intervention before age 3 changes the lifelong trajectory of autism, speech delay, motor delay, and learning differences. A normal evaluation reassures you. An early diagnosis gets the help started. Both are wins. The only loss is waiting and watching.",
      ],
    },
  }),

  // ─── 2–4 yrs ─────────────────────────────────────────────────────
  L({
    id: "toddler-tantrums-101",
    title: {
      en: "Why Toddlers Tantrum — and What Actually Works",
    },
    description: {
      en: "The 'flipped lid' brain, co-regulation, and the 3-step in-the-moment script.",
    },
    durationMin: 4, ageBucket: "2-4", emoji: "🌋", expert: "Based on Dr Dan Siegel & Mona Delahooke",
    paragraphs: {
      en: [
        "A tantrum is not bad behaviour. It is a nervous-system event. The thinking part of your toddler's brain — the prefrontal cortex — is biologically incapable of overriding strong emotion until at least age 5, and is still maturing into the mid-twenties.",
        "Dr Dan Siegel calls this the 'flipped lid'. When a toddler is in tantrum, their downstairs brain has taken over and their upstairs brain is offline. Reasoning, consequences, and lectures literally cannot be processed in this state.",
        "The only thing that works in the moment is co-regulation. Your calm body lends regulation to their dysregulated body. Drop your voice, soften your face, slow your breathing.",
        "The 3-step script: (1) 'You are safe.' (2) 'I am right here.' (3) Silence. Stay close, do not lecture. Wait for the wave to pass. The average tantrum lasts 3 to 5 minutes if you do not pour fuel on it.",
        "Repair after, not during. Once your toddler is calm, hug them and say one short sentence: 'That was big. We figured it out together.' That is the lesson they remember — not the lecture you gave at peak storm.",
      ],
    },
  }),
  L({
    id: "toddler-no-phase",
    title: {
      en: "The 'No' Phase: Decoding the Tiny Tyrant",
    },
    description: {
      en: "Why your 2-year-old says no to everything — and the choice trick that ends it.",
    },
    durationMin: 3, ageBucket: "2-4", emoji: "🙅", expert: "Based on Erikson & Janet Lansbury",
    paragraphs: {
      en: [
        "The 'no' phase is not defiance. It is the developmental stage Erik Erikson called Autonomy vs Shame and Doubt. Your toddler is discovering, for the first time, that they are a separate person with their own will.",
        "Saying no is how they practise being themselves. If you crush every no, you can damage this critical sense of agency. If you give in to every no, the home becomes chaos. The middle path is the choice trick.",
        "Replace yes/no questions with two-option choices, both of which you accept. Not 'do you want to wear shoes?' but 'do you want the red shoes or the blue shoes?'. Not 'time for bath' but 'do you want to walk or hop to the bath?'.",
        "Inside the choice, the toddler still feels powerful. Outside the choice, you still set the limit. Both needs are met.",
        "Save your no for the things that truly matter — safety, cruelty, big values. If you are saying no twenty times a day, your toddler will tune you out by lunch.",
      ],
    },
  }),
  L({
    id: "toddler-potty-readiness",
    title: {
      en: "Potty Training: The Readiness Checklist",
    },
    description: {
      en: "Why timing matters more than method, and how to know your child is truly ready.",
    },
    durationMin: 3, ageBucket: "2-4", emoji: "🚽", expert: "Based on AAP & T. Berry Brazelton",
    paragraphs: {
      en: [
        "Potty training fails most often when the child is not yet ready. The American Academy of Pediatrics is clear: readiness, not age, is the trigger.",
        "Look for these signs together: stays dry for 2 hours or more, predictable bowel movements, can pull pants up and down, shows interest in the toilet, can follow simple instructions, hides to poop, dislikes a wet or dirty nappy.",
        "If five of these seven are present, your child is ready. If fewer, wait. Pushing early is the #1 cause of regressions and battles.",
        "When you start: clear three days. Switch to underwear, not pull-ups. Pull-ups feel like a nappy and confuse the body's signal.",
        "Accidents are not failures — they are data. Stay neutral: 'Pee goes in the potty. Let us clean up together.' No shame, no big celebration either. The body learns fastest in a calm, low-stakes environment.",
      ],
    },
  }),
  L({
    id: "toddler-screen-time",
    title: {
      en: "Screen Time Under 5: What the Research Actually Says",
    },
    description: {
      en: "WHO guidelines, why under-2 should not have screens, and how to recover from too much.",
    },
    durationMin: 3, ageBucket: "2-4", emoji: "📱", expert: "Based on WHO & AAP",
    paragraphs: {
      en: [
        "The World Health Organisation recommends zero screen time for children under 2, and no more than 1 hour per day of high-quality, co-viewed content for children 2 to 4. Most of us are far above this — and the research shows real cost.",
        "Under 2, screens compete with the experiences that build the brain: face-to-face talk, tummy time, manipulating real objects. Even background TV reduces parent-child speech by up to 40%.",
        "From 2 to 4, the issue is not just screen time but what it replaces. Every hour on a screen is an hour not spent in the activities — outdoor play, reading, free play, conversation — that actually predict school readiness.",
        "If you have drifted into too much screen time, do not panic. Replace, do not just remove. Stock a basket of high-engagement alternatives: blocks, play dough, outdoor time, sticker books. Boredom is the door to creativity.",
        "Rule of thumb: screens are a tool, not a babysitter. Co-view when possible. Choose slow-paced, language-rich content. Hard cut-off 30 minutes before bed — blue light and stimulation both wreck sleep.",
      ],
    },
  }),
  L({
    id: "health-immunity-truth",
    title: {
      en: "Building Real Immunity: What Works, What's a Myth, When to Worry",
    },
    description: {
      en: "Why 8–12 colds a year is normal, the 3 evidence-based immunity levers, and the red flags.",
    },
    durationMin: 5, ageBucket: "2-4", emoji: "🛡️",
    expert: "Based on Indian Academy of Pediatrics (IAP), WHO & Cochrane Reviews",
    paragraphs: {
      en: [
        "If your toddler caught 8 to 12 colds last year, that is not weak immunity — that is a normal, healthy immune system going through its training years. Children under 5 average 6 to 12 viral infections a year, more if they go to daycare. Each one is a workout for the immune system. By age 6, the rate drops sharply. So before fixing 'low immunity', first know: this is probably normal.",
        "Three things genuinely move the needle on a child's immunity, all backed by strong evidence. One: sleep. A child sleeping under their age-target hours produces fewer antibodies after vaccination and gets sick more often. The targets: 1 to 2 yrs need 11 to 14 hours, 3 to 5 yrs need 10 to 13 hours, 6 to 12 yrs need 9 to 12 hours, including any naps. Two: outdoor play and microbial diversity. The 'old friends' theory and decades of hygiene-hypothesis research show that children who play outside, get a bit dirty, have pets, and eat a fibre-diverse diet build stronger, better-calibrated immune systems. Three: gut health. About 70 percent of immune cells live in the gut. Fibre, fermented foods like yoghurt, dahi, kanji, and a wide variety of plants — not probiotic supplements — feed the right microbes.",
        "The myths to drop. Mega-doses of Vitamin C do not prevent colds in healthy kids — Cochrane reviews are clear on this. Zinc lozenges are not safe for young children. Most 'immunity tonics' on the market have no robust evidence. Cold weather does not cause colds; viruses do. Going out with wet hair does not cause illness. What about Vitamin D? This is the one supplement worth checking — Indian children are widely deficient and a Cochrane review shows supplementation reduces respiratory infections in those who are low. Get a 25-OH-D test before supplementing.",
        "Vaccines are the single biggest immunity intervention in human history. Follow the IAP schedule, including flu shots every year for children 6 months and older. A vaccinated child is not 'overloading' their immune system — they are training it against the worst threats with the smallest risk.",
        "When to actually worry — these are the immune red flags from the Jeffrey Modell Foundation: more than four ear infections in a year, more than two serious sinus infections in a year, more than two pneumonias in a year, two or more deep-tissue or organ infections, recurrent thrush after age 1, failure to thrive, or a family history of immune disease. Any of these = ask your paediatrician for an immune workup, do not just keep treating the next infection.",
      ],
    },
  }),
  L({
    id: "health-hidden-nutrition-gaps",
    title: {
      en: "The Hidden Hunger: Iron, Vitamin D & B12 in Indian Children",
    },
    description: {
      en: "Why a normal-weight, well-fed child can still be deficient — and how to fix it.",
    },
    durationMin: 5, ageBucket: "2-4", emoji: "🥗",
    expert: "Based on ICMR-NIN, WHO First-1000-Days & NFHS-5 data",
    paragraphs: {
      en: [
        "There is a paradox in Indian families: the child eats three meals a day, the plate looks full, the child looks well, and yet blood tests show iron, vitamin D, or B12 deficiency. The NFHS-5 data is striking — 67 percent of Indian under-5s are anaemic. This is not because we feed too little. It is because of WHAT we feed and HOW the body absorbs it.",
        "Iron is the most common deficiency and the one most strongly linked to focus, school performance, and behaviour. The trick is bioavailability. Heme iron from meat, eggs, and fish is absorbed at 15 to 35 percent. Non-heme iron from dal, palak, ragi, and rajma is absorbed at only 2 to 10 percent. Two simple tricks change everything. Add a vitamin C source — nimbu, amla, tomato, capsicum, guava — to the SAME meal as the iron-rich food. This boosts absorption 3 to 4 times. And do NOT serve milk, dahi, chai, or coffee within an hour of an iron meal — calcium and tannins block iron absorption sharply.",
        "Vitamin D is the second silent crisis. 70 to 90 percent of Indian children are deficient even though we have abundant sunshine. Why? Sunscreen, indoor play, school timing during peak sun, dark skin needing more sun exposure, and pollution. The fix needs both: 15 to 20 minutes of midday sun on bare arms and legs three to four times a week, AND fortified foods or a tested supplement if levels are low. Get a 25-OH-D test before supplementing — never guess the dose.",
        "Vitamin B12 hits vegetarian families hardest because it is found mainly in animal foods. Symptoms are sneaky: tiredness, irritability, low appetite, and in severe cases, developmental delay. Sources: eggs, milk, dahi, paneer, fortified cereals. Strict vegetarian or vegan children almost always need a supplement. Iodine, zinc, and omega-3 are the next gaps; iodised salt covers most iodine needs.",
        "What to do this week. Watch for the red flag pattern: tiredness, pale lower eyelids and palms, poor appetite, frequent infections, poor focus, and slow growth. If you see two or more, ask your paediatrician for a CBC, ferritin, 25-OH-D, and B12 test. Then switch to food-first fixes guided by the result. Do not start your child on a multi-vitamin without testing — too much iron or vitamin A can be more dangerous than the deficiency.",
      ],
    },
  }),

  // ─── 5–7 yrs ─────────────────────────────────────────────────────
  L({
    id: "early-school-emotional-regulation",
    title: {
      en: "Building Emotional Regulation in the Early School Years",
    },
    description: {
      en: "Naming feelings, the calm-down corner, and why labels reduce intensity.",
    },
    durationMin: 4, ageBucket: "5-7", emoji: "🌈", expert: "Based on Dr Marc Brackett & RULER approach",
    paragraphs: {
      en: [
        "Between 5 and 7, children are developing the ability to name and reflect on their own feelings — a skill called emotional granularity. Children with high emotional granularity are less aggressive, less anxious, and do better academically. The good news: this skill is teachable.",
        "Step 1: build the vocabulary. Beyond happy, sad, angry — teach frustrated, disappointed, jealous, embarrassed, proud, nervous. Use feelings charts on the fridge. Name your own feelings out loud.",
        "Step 2: validate before you correct. 'You are so frustrated that the tower fell. That makes sense — you worked hard on it.' Validation reduces intensity. Correction without validation amplifies it.",
        "Step 3: build a calm-down corner together. A small space with cushions, a few books, maybe a stuffed animal. Not a punishment zone — a regulation tool. Visit it together when calm so it becomes familiar.",
        "Most importantly: model it. Children learn regulation by watching you regulate, not by being told to calm down. When you mess up, the repair ('I shouted, that was not okay, I am sorry') teaches more than a hundred lectures.",
      ],
    },
  }),
  L({
    id: "early-school-friendship",
    title: {
      en: "Helping Your Child Make and Keep Friends",
    },
    description: {
      en: "The friendship skills that predict lifelong wellbeing — and how to coach them.",
    },
    durationMin: 3, ageBucket: "5-7", emoji: "👫", expert: "Based on Dr Eileen Kennedy-Moore",
    paragraphs: {
      en: [
        "Friendships in the 5 to 7 range are short, intense, and full of conflict. This is normal — your child is learning the skills of negotiation, empathy, and repair in real time.",
        "Coach four core skills: joining play (asking 'can I play?' is the wrong opener — better is to watch, then add value), sharing (start with turn-taking, not splitting), conflict repair ('I am sorry I grabbed it. Can we start over?'), and reading social cues (faces and body language).",
        "Resist the urge to fix every fight. Children build social skill by stumbling through conflict. Step in only for safety, cruelty, or when both children are stuck. Your role is sportscaster, not judge.",
        "Watch for signs of social struggle: comes home alone often, no one to sit with at lunch, says 'nobody likes me'. Do not panic — but do open a calm conversation. Sometimes it is a skill to learn, sometimes a peer-group mismatch.",
        "Quality over quantity. One genuine friendship at this age is worth more than being part of a popular crowd. Help your child invest in it — playdates, small gestures, remembering birthdays.",
      ],
    },
  }),
  L({
    id: "early-school-homework",
    title: {
      en: "Homework Without Tears: A Calm 4-Step System",
    },
    description: {
      en: "End the daily battle with a structure that respects your child's brain.",
    },
    durationMin: 3, ageBucket: "5-7", emoji: "✏️", expert: "Based on Dr Stuart Shanker, self-reg",
    paragraphs: {
      en: [
        "Most homework battles are not motivation problems — they are dysregulation problems. After a full school day, your child's executive function tank is empty. Sitting them down immediately is a recipe for war.",
        "Step 1: snack and movement first. 30 to 45 minutes of free play, outdoor time, or a snack rebuilds the regulation needed to focus. Skip this and the next 60 minutes will be hell.",
        "Step 2: same place, same time. The brain loves predictability. A consistent homework spot with the materials ready cuts setup friction by 80%.",
        "Step 3: micro-chunks with the timer. 10 to 15 minutes work, 5 minutes break, repeat. The 5-minute break is not optional — it is what makes the next chunk possible.",
        "Step 4: be a co-regulator, not an enforcer. Sit nearby, not over their shoulder. Ask 'what is the next step?' not 'why did you not do it?'. Your role is to lend calm focus, not to answer the questions.",
      ],
    },
  }),
  L({
    id: "early-school-growth-mindset",
    title: {
      en: "Praise Effort, Not Smart: Building a Growth Mindset",
    },
    description: {
      en: "Carol Dweck's research, in plain language, with the exact phrases that work.",
    },
    durationMin: 3, ageBucket: "5-7", emoji: "🌱", expert: "Based on Dr Carol Dweck",
    paragraphs: {
      en: [
        "Praising 'You are so smart' actually backfires. Stanford researcher Carol Dweck has shown that children praised for being smart become risk-averse — they avoid challenges that might prove them not-smart. Children praised for effort take on harder challenges and persist longer.",
        "Replace identity praise with process praise. Not 'you are a great artist' but 'I see how carefully you mixed those colours'. Not 'you are so clever' but 'you tried three different ways before that worked'.",
        "Use the word 'yet'. 'I cannot do this' becomes 'I cannot do this yet'. That tiny word reframes failure as a stage, not a verdict.",
        "Talk about your own struggles out loud. 'I am working on being patient — I messed up earlier and I am trying again.' Children learn that effort and failure are part of growth, not a sign that something is wrong with them.",
        "Be careful with results-only feedback. A child who only hears praise for an A on the test learns that the grade is what matters. Praise the practice, the strategy, the persistence — and the grade takes care of itself.",
      ],
    },
  }),
  L({
    id: "health-childhood-obesity",
    title: {
      en: "Childhood Weight Worry: The Family-First Way (No Diets, No Shame)",
    },
    description: {
      en: "AAP-aligned 5-2-1-0 plan, weight-neutral language, and what NOT to do at the table.",
    },
    durationMin: 5, ageBucket: "5-7", emoji: "⚖️",
    expert: "Based on AAP 2023 Clinical Guideline & Ellyn Satter's Division of Responsibility",
    paragraphs: {
      en: [
        "Childhood obesity in India has tripled in twenty years. Urban children are now at the same risk as Western kids. But the way most families try to solve it — restriction, dieting, lecturing — actually backfires. Decades of research show kids who are dieted at home become MORE likely to develop weight problems and disordered eating in their teens. The solution from the 2023 American Academy of Pediatrics guideline is the opposite: family-based behaviour change, not child-targeted restriction.",
        "Rule one: language. Never talk about your child's body, weight, fat, size, or 'diet'. Not even kindly. Studies show parental weight comments — even loving ones — predict body dissatisfaction and disordered eating later. Talk instead about strong bodies, energy, what foods help us run, climb, and focus. The whole family plays. Nobody is on a diet.",
        "Rule two: the AAP-endorsed 5-2-1-0 daily target for the WHOLE family. Five servings of fruit and vegetables. Two hours or less of recreational screen time. One hour of active play. Zero sugary drinks — including juice, sweetened milk, sodas, energy drinks. This works because it focuses on what to ADD, not what to subtract.",
        "Rule three: Ellyn Satter's Division of Responsibility, the most-evidenced eating framework for children. Parents decide WHAT food is offered, WHEN it is offered, and WHERE it is eaten. The child decides WHETHER to eat it and HOW MUCH. No bribing, no forcing, no clearing the plate, no second-helping rules. Trust their hunger and fullness. Pressure increases the very behaviours you are trying to fix.",
        "Rule four: environment beats willpower every time. What is in the home gets eaten. Restock, do not police. Move sweets and chips out of sight. Keep a fruit bowl on the counter. Pre-cut vegetables for snacking. Family meals at the table — no screens — three times a week or more is one of the strongest evidence-based predictors of healthy weight. When to involve the doctor: if your child's BMI percentile is at or above the 95th, or if you see dark velvety skin in neck folds, snoring with pauses, knee pain, or rapid weight gain, ask your paediatrician for a proper assessment. This is medicine, not parenting failure.",
      ],
    },
  }),
  L({
    id: "health-digital-eyes-posture",
    title: {
      en: "Digital Health Beyond Addiction: Eyes, Posture & Sleep",
    },
    description: {
      en: "20-20-20, the outdoor-time myopia shield, tech-neck, and the no-screen-1-hr-before-bed rule.",
    },
    durationMin: 5, ageBucket: "5-7", emoji: "👀",
    expert: "Based on AAP/AAO Joint Statement & All India Ophthalmological Society",
    paragraphs: {
      en: [
        "We talk about screen time as if the only worry is addiction. The bigger silent damage is to the eyes, posture, and sleep of growing kids. Childhood myopia is an epidemic — Asian populations are heading to 80 percent short-sightedness by adulthood. India is on the same curve. The good news: the science of how to protect children is now very clear.",
        "Habit one: the 20-20-20 rule, taught as a game. Every 20 minutes of screen, take a 20-second break and look at something 20 feet away. Why? Up-close focusing for long stretches is the strongest known driver of myopia progression. Set a soft alarm. Make it a family ritual at the dinner table screen-time window. Even a 20-second break resets the focusing muscles.",
        "Habit two: at least 2 hours of daylight outdoor exposure every day. This is the single most-evidenced myopia-protection factor we have. Bright daylight stimulates dopamine release in the retina, which slows the eyeball's elongation that causes short-sight. It does not need to be exercise — even reading outdoors helps. Take walks. Eat a snack on the balcony. Find an outdoor sport.",
        "Habit three: distance and posture. Tablets and phones at arm's length. Top of the monitor at eye level so the head is not tilted down. Feet flat on the floor. Why does it matter? A head tilted forward by 60 degrees puts 27 kilograms of load on a developing cervical spine. Years of this leads to 'tech-neck', headaches, and chronic pain by the teen years. Big screens at proper distance are vastly better for eyes than small screens held close.",
        "Habit four: no screens for one full hour before bed. Bright screen light suppresses melatonin and delays sleep onset by 30 to 60 minutes in children. Worse, the type of content — fast-cut, exciting, social — keeps the brain aroused. Replace the last hour with a wind-down ritual: warm bath, dim lights, reading aloud, gentle stretches, music. And when to see an eye doctor: if your child squints, sits very close to screens or books, tilts their head while reading, complains of headaches, or has a sudden drop in school marks — get a pediatric optometrist appointment. Most childhood vision problems are easily corrected, but only if caught.",
      ],
    },
  }),

  // ─── 8–10 yrs ────────────────────────────────────────────────────
  L({
    id: "tween-independence",
    title: {
      en: "Letting Go: Building Independence in the Tween Years",
    },
    description: {
      en: "Why over-helping hurts, and the 'one notch more' weekly experiment.",
    },
    durationMin: 4, ageBucket: "8-10", emoji: "🪜", expert: "Based on Dr Lenore Skenazy",
    paragraphs: {
      en: [
        "Between 8 and 10, children desperately need to feel competent. Their growing brain craves real-world challenges. Over-helping — packing the bag, signing the diary, fighting their school battles — sends a quiet message: 'I do not believe you can'.",
        "Try the 'one notch more' experiment. Once a week, hand back one task you have been doing for them. Walking to the gate alone. Making their own breakfast. Calling grandma on the phone. Each notch is a vote of confidence.",
        "Expect mistakes — and protect them. A forgotten lunch, a missed homework, a bad grade. These small failures are the cheapest tuition your child will ever pay. Rescue them, and you steal the lesson.",
        "Resist the rescue urge. When they complain, your script is: 'That sounds hard. What do you think you will do?'. You are coaching the problem-solver, not solving the problem.",
        "Independence is built in tiny doses, weekly. By 12, the child you were hovering over at 8 will either be the one who launches with confidence or the one who freezes when you are not there. Start the notches now.",
      ],
    },
  }),
  L({
    id: "tween-sibling-fights",
    title: {
      en: "Sibling Fights: Stop Being the Referee",
    },
    description: {
      en: "Faber & Mazlish's sportscasting method — describe, do not judge.",
    },
    durationMin: 3, ageBucket: "8-10", emoji: "🥊", expert: "Based on Adele Faber & Elaine Mazlish",
    paragraphs: {
      en: [
        "If you are pulled into 12 sibling fights a day, you are training your children to need a referee. The fights will not go away — they will multiply, because the referee has become part of the game.",
        "The shift is from referee to sportscaster. A referee judges and decides. A sportscaster describes the action. 'I see two children both want the same iPad. There is only one iPad. Hmm, this is a tough problem.'",
        "Resist the urge to investigate ('who started it?'). You will get two opposite answers and you cannot prove either. Instead, refuse the role: 'It does not matter who started it. The question is — how do we end it?'",
        "Coach skills, not verdicts. Teach 'I-statements' ('I felt mad when you took it without asking') instead of accusations. Teach the repair ritual: name what you did, name the impact, propose a fix.",
        "Most importantly: protect 1:1 time with each child. Sibling rivalry is rarely about toys or fairness — it is about the bucket of parental attention. A predictable 15 minutes of 1:1 a day, per child, halves most sibling conflict over a few weeks.",
      ],
    },
  }),
  L({
    id: "tween-screen-balance",
    title: {
      en: "Screens, Phones and YouTube: Drawing the Lines That Stick",
    },
    description: {
      en: "What the research says, and how to negotiate limits without daily war.",
    },
    durationMin: 4, ageBucket: "8-10", emoji: "📺", expert: "Based on Dr Jean Twenge & Common Sense Media",
    paragraphs: {
      en: [
        "Between 8 and 10, screen use explodes — and so do conflicts about it. The research is consistent: more than 2 hours a day of recreational screens is associated with worse sleep, lower wellbeing, and lower school performance.",
        "Lines that work are clear, predictable, and co-created. A vague 'not too much' is unenforceable. A specific 'weekdays 30 min after homework, weekends 90 min, never in the bedroom, screens off 60 min before bed' is enforceable.",
        "Build the contract together. A child who helped write the rule fights it less. Ask: 'When do you think screens get in the way of sleep, schoolwork, friends, mood? What is a fair limit?'",
        "Phones in the bedroom is the single biggest mistake. Sleep deteriorates, anxiety rises, and night-time scrolling is where most problems start. Use a charging dock in the kitchen for the whole family — including parents.",
        "Be the model. Children watch your screen habits more than they listen to your screen rules. A no-phones-at-meals rule that you also follow is worth a hundred lectures.",
      ],
    },
  }),
  L({
    id: "tween-talking-to-them",
    title: {
      en: "How to Talk So Your 8 to 10 Year Old Will Actually Listen",
    },
    description: {
      en: "Side-by-side, not face-to-face. The car-conversation rule, and the 5-second pause.",
    },
    durationMin: 3, ageBucket: "8-10", emoji: "💬", expert: "Based on Dr Lisa Damour",
    paragraphs: {
      en: [
        "Tweens are starting to pull away — that is healthy. But they still desperately want to feel known. The trick is changing how you talk, not how often.",
        "Side-by-side beats face-to-face. The car, the kitchen, on a walk — this is where tweens open up. Direct eye contact across a table feels like an interrogation to a 9-year-old.",
        "The 5-second pause: when your child says something hard, do not respond for 5 full seconds. Most parents jump in with advice, judgement, or a question. The pause is what tells your child you actually heard.",
        "Ask better questions. Not 'how was school?' (you will get 'fine'), but 'what was the best part?', 'what was the most boring part?', 'who did you sit with at lunch today?'.",
        "Drop one-word reactions to bombs. When your child tells you something shocking, your face decides whether they ever tell you again. Practise the neutral 'mm, tell me more' — even when your insides are screaming.",
      ],
    },
  }),

  // ─── 10+ yrs (tween / teen) ──────────────────────────────────────
  L({
    id: "teen-brain-101",
    title: {
      en: "Inside the Teen Brain — What Every Parent Should Know",
    },
    description: {
      en: "Why your teen makes wild decisions — and why this is biology, not bad character.",
    },
    durationMin: 4, ageBucket: "10+", emoji: "🧠", expert: "Based on Dr Frances Jensen & Dr B.J. Casey",
    paragraphs: {
      en: [
        "The teen brain is not a finished adult brain making bad decisions. It is a unique biological stage. The limbic system (emotion, reward, social) develops fully by around 14. The prefrontal cortex (judgement, planning, impulse control) is not done until the mid-twenties.",
        "This 10-year gap is the entire story. A 13-year-old can want something with the full force of an adult drive system, but only a fraction of the adult braking system. This is not a flaw — it is what makes adolescents the great explorers, learners and risk-takers our species needs.",
        "What this means for you: lectures land worse, consequences delivered later land better, and emotional reactivity is biological. When your teen 'overreacts', their amygdala is genuinely louder than yours.",
        "Stay regulated yourself. A teen meltdown plus a parent meltdown equals a relationship crack. Your calm body is still doing co-regulation, even at 14.",
        "Pick your battles. Hair, clothes, music, room — let it slide. Safety, cruelty, school engagement, mental health — hold the line. This is the parental version of the choice trick: give them autonomy where it costs little, hold firm where it matters.",
      ],
    },
  }),
  L({
    id: "teen-social-media",
    title: {
      en: "Social Media and Teen Mental Health: The Honest Truth",
    },
    description: {
      en: "What the data shows, what to actually do, and why a delayed phone is a gift.",
    },
    durationMin: 4, ageBucket: "10+", emoji: "📲", expert: "Based on Dr Jonathan Haidt & Dr Jean Twenge",
    paragraphs: {
      en: [
        "Since 2012, rates of teen anxiety, depression and self-harm have risen sharply across many countries — particularly in girls. The strongest culprit, in the research of Dr Jonathan Haidt and others, is the smartphone with social media.",
        "The mechanism: social comparison on a 24/7 scale, sleep displaced by night-time scrolling, real-world play and friendship displaced by feeds, and addictive design loops engineered by trillion-dollar companies.",
        "Four norms now backed by significant research: no smartphone before high school, no social media before 16, phone-free schools, and far more independence and free play in the real world.",
        "If your child already has a phone — do not panic, recalibrate. Move charging out of the bedroom. Set the screens-off time 60 minutes before bed. Use built-in screen time limits. Have a once-a-week phone-down family ritual.",
        "Most importantly: replace, do not just remove. The teens who do best in the 'no phone' families are the ones whose parents fill that time with sport, friends, hobbies, jobs and unstructured outdoor time. The phone is not the only need — the need underneath is connection.",
      ],
    },
  }),
  L({
    id: "teen-staying-connected",
    title: {
      en: "Staying Connected When They Want to Pull Away",
    },
    description: {
      en: "The 1:1 ritual, the car rule, and why showing up boring beats showing up fixing.",
    },
    durationMin: 3, ageBucket: "10+", emoji: "🤝",
    expert: "Based on Dr Lisa Damour & Dr Laurence Steinberg",
    paragraphs: {
      en: [
        "Teens are biologically wired to pull away from parents and toward peers. This is healthy — it is how they prepare to launch. Your job is not to fight it. Your job is to remain the safe base they return to.",
        "Protect a 1:1 ritual that is not about school, behaviour or chores. A weekly walk, a Saturday breakfast, the drive to a class. Keep it sacred and keep it light.",
        "Be available, not intrusive. Sit in the kitchen when they are doing homework. Drive them places. The boring background presence is when teens drop the real things.",
        "When they share something hard — listen, do not fix. Adolescents who feel heard come back. Adolescents who feel lectured stop telling you anything by 14.",
        "Repair publicly when you mess up. 'I overreacted last night and I am sorry. I should have listened.' Teens have a finely-tuned hypocrisy detector. The parent who can apologise keeps their authority.",
      ],
    },
  }),
  L({
    id: "teen-mental-health-signs",
    title: {
      en: "When to Worry: Spotting Real Mental Health Concerns",
    },
    description: {
      en: "Normal teen moods vs warning signs, and exactly what to do next.",
    },
    durationMin: 4, ageBucket: "10+", emoji: "💛",
    expert: "Based on AAP & WHO adolescent mental health guidelines",
    paragraphs: {
      en: [
        "Teen moods can be intense, fast-changing and confusing — and most of the time this is normal. But about 1 in 5 adolescents experiences a real mental-health condition. Knowing the line is one of the most important parenting skills of this decade.",
        "Normal: bad days, irritability, slammed doors, periods of wanting to be alone. These come and go and do not stop your teen from school, friends, food, sleep, or things they once enjoyed.",
        "Warning signs that warrant a professional conversation: persistent low mood for more than 2 weeks, withdrawal from friends and activities they used to love, big sleep or appetite changes, falling grades, talking about being a burden, hopelessness, or any mention of self-harm or suicide.",
        "What to do. Open a calm, private conversation. 'I have noticed you seem really weighed down. I love you and I want to understand. Can you tell me what is going on?'. Listen. Do not minimise. Do not promise to keep it a secret.",
        "Get help early. The first call is your paediatrician — they can screen and refer. Therapy works. Most teen mental-health conditions are highly treatable when caught early. Asking for help is a strength, not a failure of parenting.",
      ],
    },
  }),
  L({
    id: "health-dental-care",
    title: {
      en: "Cavity-Free Childhood: The 4 Habits That Beat 90% of Tooth Decay",
    },
    description: {
      en: "Fluoride from the first tooth, sugar frequency rules, and the bottle-in-bed mistake.",
    },
    durationMin: 4, ageBucket: "2-4", emoji: "🦷",
    expert: "Based on AAPD, WHO Oral Health & Indian Society of Pedodontics",
    paragraphs: {
      en: [
        "Tooth decay is the most common chronic disease of childhood worldwide — and almost 100 percent preventable. By age 5, nearly 50 percent of Indian children already have cavities. The science is settled: four habits prevent 90 percent of them.",
        "Habit one: brush with fluoride toothpaste from the very first tooth. The American Academy of Pediatric Dentistry, the WHO, and the Indian Society of Pedodontics all agree. The amount matters: a smear the size of a rice grain for under-3s, a pea-size dab for ages 3 to 6, a full strip after that. Twice a day, morning and night. The night brush is the most important — saliva drops during sleep so anything left on the teeth feeds bacteria for 8 hours. After brushing, spit, do not rinse. The thin film of fluoride is what works.",
        "Habit two: never put a child to bed with a bottle of milk, juice, or anything but water. This is the single biggest cause of 'bottle-mouth' decay in toddlers. Milk pools around the front teeth all night and ferments. If a bottle is needed for comfort, it must be water only.",
        "Habit three: it is not the AMOUNT of sugar that causes decay — it is the FREQUENCY. Each sugar exposure starts a 20-minute acid attack on enamel. A chocolate after lunch is one attack. The same chocolate eaten one square at a time over an hour is six attacks. So the rule is: sweets and juice only with meals, never sipped or grazed between. Water between meals, always.",
        "Habit four: first dental visit by age 1, or when the first tooth comes — whichever is earlier. The goal is not treatment, it is prevention and a lifelong friendly relationship with the dentist. Parents brush for kids until age 7 or 8 because their hand coordination is not enough before that. And one final thing: avoid sharing spoons and pre-chewing food. Cavity-causing bacteria pass from caregiver mouths to the baby's mouth that way.",
      ],
    },
  }),
];

export const AGE_LABELS: Record<AgeBucket, Record<LangCode, string>> = {
  "0-2": { en: "0–2 years (infant)" },
  "2-4": { en: "2–4 years (toddler)" },
  "5-7": { en: "5–7 years (early school)" },
  "8-10": { en: "8–10 years (tween)" },
  "10+": { en: "10+ years (tween / teen)" },
};

export function getAgeLabel(bucket: AgeBucket, _lang?: string): string {
  return AGE_LABELS[bucket].en;
}

export function lessonsForAge(age: AgeBucket): Lesson[] {
  return LESSONS.filter((l) => l.ageBucket === age);
}