export type AgeTag = "0-1" | "1-3" | "3-5" | "6-10" | "all";
export type ArticleCategory = "Sleep" | "Behavior" | "Nutrition" | "Development" | "Emotional" | "Screen Time" | "Bonding";

export interface Article {
  id: string;
  title: string;
  summary: string;
  ageTags: AgeTag[];
  category: ArticleCategory;
  readTime: number;
  emoji: string;
  content: ArticleSection[];
}

export interface ArticleSection {
  type: "intro" | "heading" | "paragraph" | "bullets" | "tip";
  text?: string;
  items?: string[];
}

export const ARTICLES: Article[] = [
  // ─── SLEEP ────────────────────────────────────────────────────────────────
  {
    id: "infant-sleep-cycles",
    title: "Understanding Your Baby's Sleep Cycles",
    summary: "Newborns sleep differently from adults. Learn why your baby wakes so often and what that means for their development.",
    ageTags: ["0-1"],
    category: "Sleep",
    readTime: 4,
    emoji: "🌙",
    content: [
      { type: "intro", text: "Your baby waking up every 2–3 hours isn't a sign that something is wrong — it's biology. Understanding how infant sleep works can reduce frustration and help you plan better rest for the whole family." },
      { type: "heading", text: "Why Babies Sleep So Differently" },
      { type: "paragraph", text: "Newborns spend about 50% of their sleep in REM (Rapid Eye Movement) sleep, compared to just 20–25% in adults. REM sleep is essential for brain development, neural connection formation, and memory consolidation — which is why babies need so much of it in their first year." },
      { type: "heading", text: "Sleep Cycle Length" },
      { type: "paragraph", text: "A full adult sleep cycle lasts about 90 minutes. An infant's cycle is much shorter — only 45–50 minutes. At the end of each cycle, your baby briefly surfaces to a light sleep state. This is completely normal and not a problem to fix." },
      { type: "heading", text: "Age-by-Age Sleep Expectations" },
      { type: "bullets", items: [
        "0–3 months: 14–17 hours/day, waking every 2–3 hours to feed",
        "3–6 months: Sleep may consolidate to 4–5 hour stretches at night",
        "6–9 months: Many babies can sleep 6+ hours; some still wake 1–2 times",
        "9–12 months: Most babies sleep 10–12 hours at night with 1–2 naps",
      ]},
      { type: "heading", text: "What You Can Do" },
      { type: "bullets", items: [
        "Follow safe sleep guidelines: flat, firm surface, on their back, no loose items",
        "Watch for sleep cues: yawning, eye rubbing, turning head away",
        "Create a short, consistent pre-sleep routine (feed → bath → song → sleep)",
        "Keep night interactions quiet, dark, and boring to signal it's not daytime",
        "Accept that night wakings are temporary — most babies sleep longer by 6 months",
      ]},
      { type: "tip", text: "Amy's Tip: When your baby wakes at night, wait 2–3 minutes before rushing in. Many babies briefly stir and settle back on their own. This small pause can make a big difference over time." },
    ],
  },
  {
    id: "toddler-bedtime-routine",
    title: "Building a Toddler Bedtime Routine That Works",
    summary: "Consistent bedtime rituals dramatically reduce sleep struggles. Here's a science-backed routine you can start tonight.",
    ageTags: ["1-3"],
    category: "Sleep",
    readTime: 3,
    emoji: "🌙",
    content: [
      { type: "intro", text: "Toddlers thrive on predictability. A consistent bedtime routine signals the brain that sleep is coming, reduces cortisol (the stress hormone), and helps your child feel safe enough to let go of the day." },
      { type: "heading", text: "Why Routines Work" },
      { type: "paragraph", text: "Research from the American Academy of Sleep Medicine shows that children with consistent bedtime routines fall asleep faster, wake less overnight, and sleep longer overall. The routine itself is a powerful sleep cue." },
      { type: "heading", text: "The Ideal Toddler Bedtime Window" },
      { type: "paragraph", text: "Most toddlers (1–3 years) need 11–14 hours of total sleep. The ideal bedtime is typically between 7:00–8:00 PM. Overtired toddlers actually have more trouble sleeping due to an adrenaline surge the brain uses to compensate." },
      { type: "heading", text: "A Simple 30-Minute Routine" },
      { type: "bullets", items: [
        "7:00 PM — Wind down: turn off TV, reduce stimulation",
        "7:10 PM — Warm bath (5–10 min): signals body temperature drop that triggers sleep",
        "7:20 PM — Pajamas + 1 small snack if needed",
        "7:25 PM — 1–2 books together (keep it calm and quiet)",
        "7:30 PM — Goodnight song or prayer, lights out",
      ]},
      { type: "heading", text: "Dealing with Resistance" },
      { type: "bullets", items: [
        "Give a 10-minute warning before starting the routine",
        "Let your child make small choices (which book? which pajamas?)",
        "Use a visual bedtime chart with pictures — toddlers love checking off steps",
        "Be consistent even on weekends — the brain doesn't take weekends off",
      ]},
      { type: "tip", text: "Amy's Tip: If your toddler keeps calling out after lights-out, try the 'check-in method': tell them you'll come back to check in 2 minutes. Return briefly, reassure them, and gradually increase the check-in time." },
    ],
  },
  {
    id: "kids-sleep-hygiene",
    title: "Sleep Hygiene for School-Age Kids",
    summary: "Poor sleep affects grades, behavior, and mood. These simple habits help 6–10 year olds get the deep sleep they need.",
    ageTags: ["6-10"],
    category: "Sleep",
    readTime: 3,
    emoji: "🌙",
    content: [
      { type: "intro", text: "School-age children need 9–11 hours of sleep per night, yet surveys show that 30–40% of children this age are chronically under-slept. Poor sleep is linked to ADHD-like symptoms, lower academic performance, and increased emotional reactivity." },
      { type: "heading", text: "Signs of Sleep Deprivation in Kids" },
      { type: "bullets", items: [
        "Difficulty waking in the morning",
        "Irritability, mood swings, or emotional meltdowns",
        "Trouble focusing or remembering things at school",
        "Falling asleep in the car or during quiet time",
        "Seeming 'wired' or hyperactive at bedtime (a sign of overtiredness)",
      ]},
      { type: "heading", text: "The Screen-Sleep Connection" },
      { type: "paragraph", text: "Blue light from screens suppresses melatonin production for up to 3 hours. Even passive TV watching in the hour before bed can delay sleep onset by 30–60 minutes. A 'digital sunset' 1 hour before bed is one of the highest-impact changes you can make." },
      { type: "heading", text: "Good Sleep Hygiene Habits" },
      { type: "bullets", items: [
        "Keep a consistent wake time, even on weekends (within 1 hour)",
        "No screens 60 minutes before bed — try audiobooks, drawing, or reading instead",
        "Keep the bedroom cool (18–20°C / 65–68°F) and dark",
        "Avoid heavy meals or sugary snacks within 2 hours of bedtime",
        "Physical activity during the day improves night-time sleep quality",
      ]},
      { type: "tip", text: "Amy's Tip: Give your child a 'wind-down box' — a basket with a book, some colored pencils, and a small fidget toy. It becomes their signal that the day is ending and sleep is coming." },
    ],
  },

  // ─── BEHAVIOR ─────────────────────────────────────────────────────────────
  {
    id: "toddler-tantrums",
    title: "How to Handle Toddler Tantrums",
    summary: "Tantrums are a normal part of development, not bad parenting. Learn what's happening in your toddler's brain and how to respond.",
    ageTags: ["1-3"],
    category: "Behavior",
    readTime: 5,
    emoji: "😤",
    content: [
      { type: "intro", text: "Toddler tantrums peak between ages 18 months and 3 years. They happen because young children have big emotions but an undeveloped prefrontal cortex — the part of the brain that regulates emotions. It's not manipulation; it's neuroscience." },
      { type: "heading", text: "What's Happening in Your Toddler's Brain" },
      { type: "paragraph", text: "When a toddler is overwhelmed, the amygdala (the brain's alarm system) floods the body with stress hormones. The prefrontal cortex, which would normally regulate this, isn't fully developed until age 25. Your child literally cannot 'calm down' by willpower — they need your calm brain to help regulate theirs. Neuroscientists call this 'co-regulation'." },
      { type: "heading", text: "In-the-Moment Strategy" },
      { type: "bullets", items: [
        "Stay calm — your child's nervous system regulates off yours",
        "Get down to their level and make gentle eye contact",
        "Name the emotion: 'You're SO frustrated right now. That's okay.'",
        "Don't argue, reason, or lecture during the tantrum — the rational brain is offline",
        "Offer comfort without giving in to unreasonable demands",
        "Wait it out safely — don't leave them alone, but don't feed the storm either",
      ]},
      { type: "heading", text: "After the Storm" },
      { type: "paragraph", text: "Once calm (usually within 5–20 minutes), your child's rational brain comes back online. This is the time for a gentle conversation — not punishment. 'What happened? What were you feeling? What could we do differently next time?'" },
      { type: "heading", text: "Prevention Strategies" },
      { type: "bullets", items: [
        "Hunger and tiredness are tantrum triggers — keep regular meals and naps",
        "Give limited choices to build autonomy: 'Do you want the red cup or the blue cup?'",
        "Announce transitions with warnings: 'We're leaving the park in 5 minutes'",
        "Label emotions throughout the day, not just during tantrums",
        "Praise calm behavior: 'I love how you asked nicely for that!'",
      ]},
      { type: "tip", text: "Amy's Tip: When you feel your own frustration rising, take a slow, visible breath. Your child sees it, feels it, and their nervous system begins to calm down with yours. It's the single most powerful thing you can do." },
    ],
  },
  {
    id: "school-behavior-focus",
    title: "Improving Focus and Attention in School-Age Kids",
    summary: "Before assuming ADHD, try these proven strategies. Many focus problems have simple environmental and routine solutions.",
    ageTags: ["6-10"],
    category: "Behavior",
    readTime: 4,
    emoji: "🧠",
    content: [
      { type: "intro", text: "Short attention spans, distractibility, and difficulty with homework are among the most common complaints from parents of school-age children. While some children have ADHD, many focus challenges can be dramatically improved with environmental changes and consistent routines." },
      { type: "heading", text: "The Focus-Sleep-Exercise Triangle" },
      { type: "paragraph", text: "Three factors have the largest evidence base for improving children's attention: adequate sleep, physical exercise, and reduced screen time. A child who gets 9+ hours of sleep and 60 minutes of outdoor physical activity daily will have measurably better focus at school." },
      { type: "heading", text: "Homework Environment" },
      { type: "bullets", items: [
        "Clear desk policy — only the materials needed for the current task",
        "No background TV, music with lyrics, or notifications",
        "Natural light or bright overhead light reduces eye strain and drowsiness",
        "Short breaks matter: 25 minutes of work, 5 minutes of physical movement (not screens)",
        "Same time every day — routine reduces the friction of starting",
      ]},
      { type: "heading", text: "Strengthening Attention" },
      { type: "bullets", items: [
        "Reading physical books (not screens) for 20+ minutes daily builds sustained attention",
        "Puzzles, board games, and LEGO strengthen working memory",
        "Outdoor unstructured play (especially in green spaces) improves focus for up to 2 hours",
        "Mindfulness for kids: even 5 minutes of breathing exercises has measurable effects",
      ]},
      { type: "heading", text: "When to Seek Support" },
      { type: "paragraph", text: "If focus difficulties significantly affect school performance, relationships, or daily functioning despite consistent efforts, speak with your pediatrician. Early support makes a significant difference." },
      { type: "tip", text: "Amy's Tip: Try the 'First-Then' board: 'First homework, then 30 minutes of screen time.' Visual systems give kids a clear finish line and dramatically reduce resistance." },
    ],
  },
  {
    id: "preschool-big-feelings",
    title: "Helping Preschoolers Manage Big Feelings",
    summary: "Ages 3–5 are a critical window for emotional development. These simple tools build lifelong emotional intelligence.",
    ageTags: ["3-5"],
    category: "Behavior",
    readTime: 3,
    emoji: "💛",
    content: [
      { type: "intro", text: "Preschool years are one of the most important periods for emotional development. How children learn to identify, express, and manage emotions at this age shapes their relationships and mental health for decades." },
      { type: "heading", text: "The Emotion Vocabulary" },
      { type: "paragraph", text: "Research by Dr. Marc Brackett at Yale shows that children who can name their emotions precisely are better able to regulate them. 'I'm a little frustrated' is more manageable than a global 'I'm upset.' Aim to teach 20–30 emotion words by age 5." },
      { type: "heading", text: "Tools for the Feeling Big" },
      { type: "bullets", items: [
        "Feelings Wheel: Print one and use it to help your child name emotions precisely",
        "Breathing bubbles: 'Breathe in to blow up the bubble, breathe out to pop it'",
        "The calm-down corner: A cosy space with soft toys, a feelings chart, and sensory items",
        "Emotion faces mirror: Let your child make different emotion faces and name them",
        "Books about feelings: 'The Way I Feel,' 'When Sophie Gets Angry,' 'In My Heart'",
      ]},
      { type: "heading", text: "What Not to Do" },
      { type: "bullets", items: [
        "Don't say 'Stop crying' — emotions need to be felt, not suppressed",
        "Don't dismiss: 'It's not a big deal' — it IS a big deal to them",
        "Don't bribe to stop emotions: 'I'll give you a biscuit if you stop crying'",
        "Don't punish emotional outbursts — teach instead",
      ]},
      { type: "tip", text: "Amy's Tip: Create an 'Emotion of the Day' practice at dinner. Each person shares one emotion they felt during the day and why. This builds vocabulary and shows children that adults have big feelings too." },
    ],
  },

  // ─── NUTRITION ────────────────────────────────────────────────────────────
  {
    id: "infant-feeding",
    title: "Infant Feeding: Breastfeeding and Formula Basics",
    summary: "Everything you need to know about feeding your newborn in the first 6 months — schedules, hunger cues, and common concerns.",
    ageTags: ["0-1"],
    category: "Nutrition",
    readTime: 4,
    emoji: "🍼",
    content: [
      { type: "intro", text: "The first 6 months of life are powered entirely by breastmilk or formula. Getting feeding right is one of the most important things you can do for your baby's growth, immunity, and brain development." },
      { type: "heading", text: "Hunger Cues to Watch For" },
      { type: "bullets", items: [
        "Early cues: rooting (turning head to find the breast), sucking on hands, smacking lips",
        "Middle cues: squirming, bringing hands to mouth repeatedly",
        "Late cues: crying (try to feed before this — a crying baby is harder to latch)",
      ]},
      { type: "heading", text: "How Often to Feed" },
      { type: "bullets", items: [
        "Newborns: every 2–3 hours (8–12 times per day)",
        "1–3 months: every 2.5–3.5 hours",
        "4–6 months: every 3–4 hours",
        "Breastfed babies typically feed more frequently than formula-fed ones",
      ]},
      { type: "heading", text: "Signs of Good Feeding" },
      { type: "bullets", items: [
        "6+ wet nappies per day after day 4",
        "Steady weight gain after initial newborn weight loss (usually recovered by day 10–14)",
        "Baby seems satisfied after feeds, not constantly fussy",
        "You can hear swallowing during breastfeeding",
      ]},
      { type: "heading", text: "Starting Solids (Around 6 Months)" },
      { type: "paragraph", text: "The WHO and AAP recommend introducing solid foods around 6 months. Signs of readiness include: can sit up with support, shows interest in food, has lost the tongue-thrust reflex. Start with single-ingredient purees and introduce one new food every 3–5 days to watch for reactions." },
      { type: "tip", text: "Amy's Tip: Don't stress about perfect feeding schedules in the early weeks. Watch your baby, not the clock. Responsive feeding — feeding when your baby shows hunger cues — is the most evidence-based approach." },
    ],
  },
  {
    id: "picky-eater",
    title: "The Picky Eater Survival Guide",
    summary: "Picky eating is extremely common in toddlers. Here's what's actually happening and how to handle it without power struggles.",
    ageTags: ["1-3", "3-5"],
    category: "Nutrition",
    readTime: 4,
    emoji: "🥦",
    content: [
      { type: "intro", text: "Up to 50% of toddlers are described as picky eaters by their parents. While frustrating, most picky eating is a normal phase of development, driven by a fear of new foods (neophobia) that peaks between ages 2 and 6." },
      { type: "heading", text: "Why Picky Eating Happens" },
      { type: "paragraph", text: "Toddler neophobia (fear of new foods) is believed to be an evolutionary protective mechanism — when children became mobile, refusing unfamiliar foods reduced the risk of accidental poisoning. The brain is doing exactly what it evolved to do." },
      { type: "heading", text: "The Division of Responsibility (Ellyn Satter)" },
      { type: "paragraph", text: "The most evidence-based approach to feeding children. Parents are responsible for WHAT, WHEN, and WHERE food is served. Children are responsible for WHETHER they eat and HOW MUCH. This removes the power struggle entirely." },
      { type: "heading", text: "What Works" },
      { type: "bullets", items: [
        "Serve 1 accepted food alongside new foods — reduces anxiety",
        "Offer new foods 10–15+ times — many children need this many exposures before accepting",
        "Never force, bribe, or make children 'clean their plate'",
        "Eat together as a family — children learn from watching adults eat",
        "Make food fun without pressure: let them touch, smell, or play with new foods",
        "Keep serving sizes tiny for new foods — a pea-sized amount is enough",
      ]},
      { type: "heading", text: "Red Flags (When to Consult a Doctor)" },
      { type: "bullets", items: [
        "Child is losing weight or not growing well",
        "Gagging or vomiting frequently with foods",
        "Fewer than 20 accepted foods with no expansion",
        "Extreme distress at mealtimes or severe sensory reactions",
      ]},
      { type: "tip", text: "Amy's Tip: Never say 'they won't eat that' in front of your child — children live up to our expectations. Instead say 'We're still learning to like this one!' Keep the door open." },
    ],
  },
  {
    id: "kids-nutrition",
    title: "Building Healthy Eating Habits in School-Age Kids",
    summary: "The habits children form between 6–10 will influence their diet for life. Here's how to set a strong foundation.",
    ageTags: ["6-10"],
    category: "Nutrition",
    readTime: 3,
    emoji: "🥗",
    content: [
      { type: "intro", text: "School-age children are increasingly influenced by peers, advertising, and social media when it comes to food. Building positive relationships with food now is one of the greatest gifts you can give your child's long-term health." },
      { type: "heading", text: "What School-Age Kids Need" },
      { type: "bullets", items: [
        "Protein at every meal: eggs, lentils, chicken, paneer, nuts — essential for focus and growth",
        "Complex carbohydrates: whole grains provide sustained energy for school",
        "Iron-rich foods: critical for brain function; include leafy greens, legumes, and red meat",
        "Calcium: 1,000 mg/day — dairy, fortified plant milks, sesame, almonds",
        "Omega-3s: oily fish, walnuts, flaxseed — support brain development and mood",
      ]},
      { type: "heading", text: "The Family Meal Effect" },
      { type: "paragraph", text: "Research consistently shows that children who eat dinner with their family 5+ times per week eat more vegetables, have better academic performance, lower rates of eating disorders, and stronger family bonds. The meal itself matters less than the ritual." },
      { type: "heading", text: "Healthy Lunchbox Ideas" },
      { type: "bullets", items: [
        "Include at least 1 colour: red capsicum, orange carrot, green cucumber",
        "Protein: boiled egg, cheese cube, hummus, or leftover chicken",
        "Complex carb: wholegrain bread, brown rice, or oats",
        "Fruit: whole fruit is better than juice (more fibre, slower sugar release)",
        "Water: not sugary drinks — sweet drinks rewire taste preferences",
      ]},
      { type: "tip", text: "Amy's Tip: Let your child help pack their own lunchbox with a simple checklist: 'something crunchy, something colourful, something sweet.' Choice and involvement dramatically increases the chance they'll actually eat it." },
    ],
  },

  // ─── DEVELOPMENT ──────────────────────────────────────────────────────────
  {
    id: "language-development",
    title: "Boosting Your Toddler's Language Development",
    summary: "The first 3 years are a critical window for language. These research-backed activities can add hundreds of words to your child's vocabulary.",
    ageTags: ["0-1", "1-3"],
    category: "Development",
    readTime: 4,
    emoji: "🗣️",
    content: [
      { type: "intro", text: "By age 3, children who have been talked to richly have heard 30 million more words than children in less language-rich environments. This 'word gap' predicts reading ability, school readiness, and academic success years later." },
      { type: "heading", text: "Language Milestones" },
      { type: "bullets", items: [
        "6 months: babbling (ba-ba, da-da), responds to name",
        "12 months: first words, understands simple instructions ('no', 'bye bye')",
        "18 months: 10–20 words, begins pointing to pictures in books",
        "24 months: 50+ words, combines 2 words ('more juice', 'daddy go')",
        "36 months: 200–300 words, speaks in short sentences",
      ]},
      { type: "heading", text: "The TALK Formula" },
      { type: "bullets", items: [
        "Tune in: follow your child's lead, talk about what they're looking at",
        "Ask questions: 'What's that? What do you think will happen?'",
        "Listen and wait: pause and give them time to respond (count to 5 in your head)",
        "Keep expanding: if they say 'dog', you say 'Yes! A big brown dog is running!'",
      ]},
      { type: "heading", text: "Best Activities for Language Growth" },
      { type: "bullets", items: [
        "Reading aloud daily — even before they understand the words",
        "Narrating your day: 'Now we're washing our hands with soap'",
        "Singing songs and nursery rhymes — rhythm helps language stick",
        "Commenting on their play without directing: 'You're putting the blocks on top of each other!'",
        "Reducing background TV — every minute of adult TV is a minute not talking to your child",
      ]},
      { type: "tip", text: "Amy's Tip: 'Serve and return' interactions are the most powerful for language development. When your baby points at something, look at it with them and name it. When they babble, babble back. These back-and-forth exchanges literally build brain architecture." },
    ],
  },
  {
    id: "preschool-school-readiness",
    title: "Getting Your Preschooler Ready for School",
    summary: "School readiness is about much more than letters and numbers. Here are the most important skills to build in years 3–5.",
    ageTags: ["3-5"],
    category: "Development",
    readTime: 3,
    emoji: "🎒",
    content: [
      { type: "intro", text: "Research from the Harvard Centre on the Developing Child shows that the skills most predictive of school success are not academic skills — they're executive function skills: the ability to pay attention, follow instructions, manage emotions, and work with others." },
      { type: "heading", text: "The Most Important Pre-School Skills" },
      { type: "bullets", items: [
        "Self-regulation: ability to wait, take turns, and manage frustration",
        "Communication: asking for help, expressing needs, listening",
        "Fine motor skills: holding a pencil, using scissors, doing up buttons",
        "Independence: toileting, putting on shoes, carrying their own bag",
        "Social skills: playing cooperatively, sharing, resolving simple conflicts",
      ]},
      { type: "heading", text: "Building These Skills at Home" },
      { type: "bullets", items: [
        "Board games build turn-taking, patience, and resilience",
        "Sensory play (play-dough, sand, water) builds fine motor skills",
        "Let them dress themselves — even when it's slow and imperfect",
        "Read 20+ minutes daily — books build vocabulary and listening skills",
        "Playdates develop social negotiation better than any structured class",
      ]},
      { type: "heading", text: "What Not to Worry About" },
      { type: "paragraph", text: "Not all children need to know letters, numbers, or be able to write their name before starting school. Teachers expect to teach these things. Emotional readiness — being able to separate from parents, follow classroom rules, and manage needs — matters far more." },
      { type: "tip", text: "Amy's Tip: Practice 'school scenarios' at home: 'If you need to go to the toilet, what do you say to the teacher?' Role-playing these moments reduces first-day anxiety enormously." },
    ],
  },

  // ─── EMOTIONAL ────────────────────────────────────────────────────────────
  {
    id: "building-resilience",
    title: "Building Resilience in Children",
    summary: "Resilient children aren't born — they're built. Here's what research says about raising children who bounce back from setbacks.",
    ageTags: ["3-5", "6-10"],
    category: "Emotional",
    readTime: 4,
    emoji: "💪",
    content: [
      { type: "intro", text: "Resilience is not about toughening children up or exposing them to unnecessary hardship. It's about building the internal resources — confidence, problem-solving skills, emotional regulation, and strong relationships — that allow them to recover from setbacks." },
      { type: "heading", text: "The 7 C's of Resilience (Dr. Kenneth Ginsburg)" },
      { type: "bullets", items: [
        "Competence: letting children try and sometimes fail at age-appropriate challenges",
        "Confidence: built through genuine praise for effort, not outcomes",
        "Connection: strong, secure attachment to parents and family",
        "Character: values and a sense of right and wrong",
        "Contribution: feeling that they matter and can make a difference",
        "Coping: having a range of healthy strategies for difficult moments",
        "Control: understanding that their actions have consequences — good and bad",
      ]},
      { type: "heading", text: "The Failure Opportunity" },
      { type: "paragraph", text: "When children experience manageable failures — losing a game, not getting a part in the play, struggling with a hard puzzle — and have supportive adults who help them process and try again, they build neural pathways for resilience. The goal is 'good enough' challenges: hard enough to stretch, achievable enough to succeed." },
      { type: "heading", text: "What Parents Can Do" },
      { type: "bullets", items: [
        "Resist rescuing — let them struggle with age-appropriate challenges",
        "Validate feelings first, problem-solve second: 'That sounds really hard. What do you think you could do?'",
        "Share your own failures and how you handled them",
        "Praise effort and strategy, not intelligence or talent",
        "Read books about characters who face and overcome challenges",
      ]},
      { type: "tip", text: "Amy's Tip: Reframe mistakes with 'Yet': 'You can't do it yet.' This one word shifts the mindset from fixed ('I'm bad at this') to growth ('I'm still learning'). Dr. Carol Dweck's research shows this simple shift has lasting effects." },
    ],
  },
  {
    id: "parent-wellbeing",
    title: "Taking Care of Yourself as a Parent",
    summary: "You cannot pour from an empty cup. Here's why parental wellbeing directly impacts your child's development — and what to do about it.",
    ageTags: ["all"],
    category: "Emotional",
    readTime: 3,
    emoji: "🧘",
    content: [
      { type: "intro", text: "Research consistently shows that parental mental health is one of the strongest predictors of child outcomes. A calm, regulated parent is the single greatest environmental factor in a child's emotional development. This is not a luxury — it's a necessity." },
      { type: "heading", text: "The Co-Regulation Principle" },
      { type: "paragraph", text: "Children regulate their nervous systems off ours. When we're anxious, stressed, or reactive, children's stress hormone levels rise. When we're calm and grounded, they feel safe enough to explore, learn, and grow. Your emotional state is a direct input into your child's nervous system." },
      { type: "heading", text: "Small Practices That Matter" },
      { type: "bullets", items: [
        "5 minutes of quiet: even one moment of solitude daily reduces stress hormones",
        "Sleep prioritisation: chronic sleep deprivation impairs patience and empathy",
        "Social connection: parenting in isolation is one of the strongest risk factors for burnout",
        "Physical movement: 20 minutes of walking improves mood for up to 12 hours",
        "Permission to be imperfect: good-enough parenting is the goal, not perfect parenting",
      ]},
      { type: "heading", text: "Warning Signs of Parental Burnout" },
      { type: "bullets", items: [
        "Feeling emotionally exhausted and detached from your child",
        "Dreading interactions that you usually enjoy",
        "Persistent guilt, shame, or feeling like a bad parent",
        "Chronic irritability and disproportionate reactions",
      ]},
      { type: "tip", text: "Amy's Tip: When you lose it with your child, the 'repair' matters more than the rupture. A simple 'I'm sorry I yelled — that wasn't okay. I love you.' models accountability, emotional regulation, and relationship repair all at once." },
    ],
  },

  // ─── SCREEN TIME ──────────────────────────────────────────────────────────
  {
    id: "screen-time-guide",
    title: "Screen Time: An Evidence-Based Guide for Parents",
    summary: "Not all screen time is equal. Here's what research actually says about screens and child development — and practical limits by age.",
    ageTags: ["0-1", "1-3", "3-5", "6-10"],
    category: "Screen Time",
    readTime: 4,
    emoji: "📱",
    content: [
      { type: "intro", text: "The screen time conversation is more nuanced than it seems. The type of content, the social context, and the child's age all matter. Here's what the current evidence says, without the panic." },
      { type: "heading", text: "Age-by-Age Guidelines (WHO/AAP)" },
      { type: "bullets", items: [
        "Under 18 months: No screens except video calls with family",
        "18–24 months: Only high-quality programming, with parent watching together",
        "2–5 years: Maximum 1 hour/day of high-quality content, with parent co-viewing",
        "6–10 years: Consistent limits on time and content; screens should not displace sleep, exercise, or family time",
      ]},
      { type: "heading", text: "Why It Matters for Young Children" },
      { type: "paragraph", text: "Screens don't 'rot brains,' but passive video watching displaces the experiences children need most: face-to-face interaction, physical exploration, open-ended play, and conversation. Every hour on a screen is an hour away from something else." },
      { type: "heading", text: "Higher Quality vs. Lower Quality" },
      { type: "bullets", items: [
        "Better: interactive, educational, slow-paced (Bluey, Sesame Street, educational apps with feedback)",
        "Worse: fast-paced, commercial, violent, or passive YouTube autoplay",
        "Best when: watched together with a parent who talks about what's happening",
        "Worst when: a substitute for adult attention or used to avoid interaction",
      ]},
      { type: "heading", text: "Creating Healthy Screen Habits" },
      { type: "bullets", items: [
        "No screens during meals — this is consistently linked to better eating habits",
        "No screens 1 hour before bed",
        "Keep devices out of bedrooms",
        "Make a family media plan: planned screen time is healthier than reactive screen time",
        "Model the behaviour you want: put your own phone away during family time",
      ]},
      { type: "tip", text: "Amy's Tip: The 'always something to come back to' rule — screen time ends when there's something to look forward to, not when there's a fight. 'After this episode, we're going to make something together' is far more effective than abrupt shut-off." },
    ],
  },

  // ─── BONDING ──────────────────────────────────────────────────────────────
  {
    id: "secure-attachment",
    title: "Building Secure Attachment With Your Child",
    summary: "Secure attachment is the foundation of everything. Here's what it means, why it matters, and how to build it — even after a rocky start.",
    ageTags: ["0-1", "1-3", "all"],
    category: "Bonding",
    readTime: 5,
    emoji: "❤️",
    content: [
      { type: "intro", text: "Attachment theory, pioneered by John Bowlby and Mary Ainsworth, is one of the most replicated findings in all of developmental psychology. Children who develop secure attachment show better emotional regulation, social skills, academic performance, and mental health outcomes across their lifetime." },
      { type: "heading", text: "What Secure Attachment Looks Like" },
      { type: "bullets", items: [
        "Child is distressed when parent leaves but recovers relatively quickly",
        "Child uses parent as a safe base to explore from",
        "Child is comforted by parent's return",
        "Child seeks parent for comfort when hurt, scared, or unwell",
      ]},
      { type: "heading", text: "How Secure Attachment Develops" },
      { type: "paragraph", text: "Secure attachment is built through thousands of small interactions where the parent notices the child's cues and responds sensitively. It's not about being perfect — it's about being 'good enough' and consistent. Repair after misattunement is actually important for attachment." },
      { type: "heading", text: "Building Moments Every Day" },
      { type: "bullets", items: [
        "Follow their lead in play — let them direct for 10–15 minutes daily",
        "Physical affection: hugs, cuddles, and physical closeness build oxytocin (the bonding hormone)",
        "Get down to their level and make eye contact when they speak to you",
        "Narrate their inner world: 'You look happy — did you love that game?'",
        "Be the safe place they can always come back to, without conditions",
        "Bedtime conversations: 'What was the best part of your day? What was hard?'",
      ]},
      { type: "heading", text: "It's Never Too Late" },
      { type: "paragraph", text: "Research shows that attachment can shift from insecure to secure at any age with consistent, sensitive caregiving. If your relationship has been challenging, it is not fixed. Every warm, responsive interaction you have with your child is building something lasting." },
      { type: "tip", text: "Amy's Tip: 'Special Time' — 15 minutes per day of one-on-one time where your child leads and you follow, with no phones, no direction, and no agenda — is one of the most evidence-based tools in child therapy. It's that simple and that powerful." },
    ],
  },
];

// ─── Utilities ─────────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<ArticleCategory, { bg: string; text: string; border: string }> = {
  Sleep:        { bg: "bg-indigo-50",  text: "text-indigo-700",  border: "border-indigo-200" },
  Behavior:     { bg: "bg-rose-50",    text: "text-rose-700",    border: "border-rose-200" },
  Nutrition:    { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  Development:  { bg: "bg-violet-50",  text: "text-violet-700",  border: "border-violet-200" },
  Emotional:    { bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  "Screen Time":{ bg: "bg-sky-50",     text: "text-sky-700",     border: "border-sky-200" },
  Bonding:      { bg: "bg-pink-50",    text: "text-pink-700",    border: "border-pink-200" },
};

export const AGE_TAG_LABELS: Record<AgeTag, string> = {
  "0-1": "0–1 yr",
  "1-3": "1–3 yrs",
  "3-5": "3–5 yrs",
  "6-10": "6–10 yrs",
  "all": "All Ages",
};

export function getArticlesForAgeMonths(totalMonths: number): Article[] {
  if (totalMonths < 12) {
    return ARTICLES.filter(a => a.ageTags.includes("0-1") || a.ageTags.includes("all"));
  } else if (totalMonths < 36) {
    return ARTICLES.filter(a => a.ageTags.includes("1-3") || a.ageTags.includes("all"));
  } else if (totalMonths < 60) {
    return ARTICLES.filter(a => a.ageTags.includes("3-5") || a.ageTags.includes("all"));
  } else {
    return ARTICLES.filter(a => a.ageTags.includes("6-10") || a.ageTags.includes("all"));
  }
}

