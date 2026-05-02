// Shared, platform-agnostic age-segmented content datasets used by both the
// web (`artifacts/kidschedule`) and mobile (`artifacts/amynest-mobile`) Parent
// Hubs. Pure data + helpers — no React, DOM, or React Native imports — so the
// same module can be consumed from a Vite-bundled web app and from an Expo
// React Native bundle without conditional exports.
//
// The datasets are intentionally duplicated from their original web locations
// (`kidschedule/src/lib/age-groups.ts`, `daily-story-section.tsx`,
// `daily-puzzle.tsx`) to keep this module standalone. When updating either
// side, mirror the change here.

// ─── Age groups ───────────────────────────────────────────────────────────────

export type AgeGroup =
  | "infant"
  | "toddler"
  | "preschool"
  | "early_school"
  | "pre_teen";

export function ageMonthsToGroup(totalMonths: number): AgeGroup {
  if (totalMonths < 12) return "infant";
  if (totalMonths < 36) return "toddler";
  if (totalMonths < 60) return "preschool";
  if (totalMonths < 120) return "early_school";
  return "pre_teen";
}

// ─── Skill focus by age group (4 entries each) ────────────────────────────────

export type SkillFocus = { skill: string; activity: string; emoji: string };

export const SKILL_FOCUS_BY_GROUP: Record<AgeGroup, readonly SkillFocus[]> = {
  infant: [
    { skill: "Sensory Development", activity: "Show colorful objects, play gentle music, skin-to-skin contact", emoji: "🌈" },
    { skill: "Motor Skills", activity: "Tummy time (10–15 min), grasp exercises with soft toys", emoji: "🤲" },
    { skill: "Language Foundation", activity: "Talk to your baby constantly, name everything you see", emoji: "👄" },
    { skill: "Bonding", activity: "Eye contact, gentle massage, respond to every coo", emoji: "❤️" },
  ],
  toddler: [
    { skill: "Communication", activity: "Name games, simple songs, picture books with words", emoji: "💬" },
    { skill: "Color & Shape", activity: "Sort colored blocks, identify shapes, color matching games", emoji: "🎨" },
    { skill: "Independence", activity: "Let them choose their clothes, pour own water, self-feed", emoji: "🌟" },
    { skill: "Creativity", activity: "Finger painting, play-doh, building blocks, free drawing", emoji: "✨" },
  ],
  preschool: [
    { skill: "Imagination", activity: "Pretend play, role-play, story making with toys", emoji: "🌈" },
    { skill: "Numbers & Letters", activity: "Count everyday objects, trace letters in sand or paper", emoji: "🔢" },
    { skill: "Social Skills", activity: "Playdate, sharing exercises, group games", emoji: "🤝" },
    { skill: "Fine Motor", activity: "Cutting with scissors, threading beads, puzzles", emoji: "✂️" },
  ],
  early_school: [
    { skill: "Discipline", activity: "30-minute focused study block with a timer, no distractions", emoji: "📖" },
    { skill: "Sports", activity: "Daily 30 min outdoor sport (cricket, football, cycling)", emoji: "⚽" },
    { skill: "Critical Thinking", activity: "Solve a puzzle, play chess, logical brain games", emoji: "🧩" },
    { skill: "Creativity", activity: "Draw, paint, write a short story or poem", emoji: "🎨" },
  ],
  pre_teen: [
    { skill: "Focus & Discipline", activity: "Pomodoro study (25 min focus + 5 min break), no phone", emoji: "🎯" },
    { skill: "Leadership", activity: "Assign them a small responsibility — organize, plan, lead", emoji: "👑" },
    { skill: "Emotional Intelligence", activity: "5-min journal: 3 good things today + 1 challenge", emoji: "📔" },
    { skill: "Physical Fitness", activity: "20-min workout, yoga, or sport they enjoy", emoji: "💪" },
  ],
};

// ─── Moral stories by age group (1–2 entries each) ────────────────────────────

export type AgeStory = { title: string; story: string; moral: string; emoji: string };

export const STORIES_BY_GROUP: Record<AgeGroup, readonly AgeStory[]> = {
  infant: [
    {
      title: "The Gentle Sun",
      story: "Every morning, the sun rises with love to warm the earth. It doesn't shout — it just shines.",
      moral: "Love is shown through gentle presence.",
      emoji: "☀️",
    },
  ],
  toddler: [
    {
      title: "The Little Seed",
      story: "A tiny seed was buried in the ground. It was dark and lonely. But the seed was patient. Every day it drank a little water and felt a little sunlight. One day it pushed through the soil and became a beautiful flower.",
      moral: "Patience and effort lead to beautiful growth.",
      emoji: "🌱",
    },
    {
      title: "The Sharing Elephant",
      story: "Ellie the elephant had a big bag of peanuts. Her friends were hungry. She shared every last peanut and felt so happy inside — happier than when she had them all to herself!",
      moral: "Sharing brings more happiness than keeping.",
      emoji: "🐘",
    },
  ],
  preschool: [
    {
      title: "The Honest Boy",
      story: "Arjun broke a pot while playing. He was scared. But he told his mother the truth. She hugged him and said 'Thank you for being honest.' Arjun felt lighter than ever.",
      moral: "Honesty always feels better than hiding the truth.",
      emoji: "💎",
    },
    {
      title: "The Helpful Rabbit",
      story: "A rabbit found a turtle stuck under a log. The rabbit was small, but asked his friends for help. Together they moved the log. The turtle cried tears of joy.",
      moral: "Asking for help and helping others is strength.",
      emoji: "🐰",
    },
  ],
  early_school: [
    {
      title: "The Hardworking Ant",
      story: "While the grasshopper played all summer, the ant worked hard storing food. When winter came, the ant had plenty and the grasshopper had nothing. The ant shared some food but said, 'Next season, prepare early.'",
      moral: "Hard work today secures your tomorrow.",
      emoji: "🐜",
    },
    {
      title: "The Boy Who Cried Wolf",
      story: "A shepherd boy lied twice about a wolf to get attention. When a real wolf came, no one believed him. He learned his lesson the hard way.",
      moral: "Always tell the truth — once trust is broken, it's hard to rebuild.",
      emoji: "🐺",
    },
  ],
  pre_teen: [
    {
      title: "The Two Stones",
      story: "A teacher showed two stones: one rough, one smooth. 'The rough stone was untouched,' she said. 'The smooth one was polished by challenges. Every difficulty you face polishes you.' The student understood — struggle is the maker of character.",
      moral: "Challenges don't break you — they shape you.",
      emoji: "💎",
    },
    {
      title: "The Empty Jar",
      story: "A professor filled a jar with rocks, then pebbles, then sand. 'Is it full?' he asked. Yes. Then he poured in coffee. The lesson: always make room for what truly matters — family, health, values. The rest is just sand.",
      moral: "Prioritize what truly matters in life.",
      emoji: "🏺",
    },
  ],
};

// ─── Parent tasks by age group (4 entries each) ───────────────────────────────

export type ParentTask = { task: string; time: string; emoji: string };

export const PARENT_TASKS_BY_GROUP: Record<AgeGroup, readonly ParentTask[]> = {
  infant: [
    { task: "Hold your baby for 15 minutes of skin-to-skin time", time: "15 min", emoji: "🤱" },
    { task: "Talk, sing, or narrate your day out loud to your baby", time: "Throughout day", emoji: "🗣️" },
    { task: "Do tummy time exercise with your baby", time: "10 min", emoji: "🏋️" },
    { task: "Check baby's vaccination schedule and upcoming due dates", time: "5 min", emoji: "💉" },
  ],
  toddler: [
    { task: "Read one picture book together before bedtime", time: "15 min", emoji: "📖" },
    { task: "Play a color-sorting or shape-matching game together", time: "20 min", emoji: "🎨" },
    { task: "Sing the alphabet song or count 1–10 together", time: "5 min", emoji: "🎵" },
    { task: "Let your toddler help with one simple task (stacking, sorting)", time: "10 min", emoji: "🌟" },
  ],
  preschool: [
    { task: "Do an art project together (drawing, painting, craft)", time: "30 min", emoji: "🎨" },
    { task: "Tell a story and let them finish it — encourage imagination", time: "15 min", emoji: "📚" },
    { task: "Play pretend together — tea party, kitchen, superhero", time: "20 min", emoji: "🎭" },
    { task: "Praise 3 specific good things they did today", time: "5 min", emoji: "⭐" },
  ],
  early_school: [
    { task: "Spend 15 minutes talking about their school day — really listen", time: "15 min", emoji: "💬" },
    { task: "Do an outdoor activity together (walk, cycle, play catch)", time: "30 min", emoji: "🌳" },
    { task: "Help with homework — guide, don't do it for them", time: "20 min", emoji: "📝" },
    { task: "Share a meal together with no screens — just conversation", time: "30 min", emoji: "🍽️" },
  ],
  pre_teen: [
    { task: "Have a 10-minute open conversation — no judgment zone", time: "10 min", emoji: "💬" },
    { task: "Watch something they like — show genuine interest", time: "30 min", emoji: "📺" },
    { task: "Give them one meaningful responsibility today", time: "Ongoing", emoji: "🌟" },
    { task: "Ask about their dreams and goals — write them down together", time: "15 min", emoji: "🎯" },
  ],
};

// ─── Daily story bank (date-seeded shuffle) ───────────────────────────────────

export type StoryCategory = "moral" | "fun" | "animal" | "learning";

export type DailyStory = {
  id: string;
  emoji: string;
  category: StoryCategory;
  ageMin: number;
  ageMax: number;
  title: string;
  preview: string;
  story: string;
  moral: string;
};

export const DAILY_STORIES: readonly DailyStory[] = [
  // ── Toddler (12–48 months) ──────────────────────────────────────────────
  { id:"t01", emoji:"🐢", category:"moral",    ageMin:12, ageMax:48,
    title:"The Slow Turtle Wins",
    preview:"A rabbit laughed at a slow turtle. They raced — and the turtle walked right to the finish line!",
    story:"A rabbit laughed at a slow turtle. 'You are so slow!' he said. They decided to race. The rabbit ran very fast, got bored, and stopped to nap under a tree. The turtle walked slowly — one step, then another — and never stopped. When the rabbit woke up, the turtle had already crossed the finish line!",
    moral:"Keep going, even if you're slow. Never give up!" },
  { id:"t02", emoji:"🦁", category:"animal",   ageMin:12, ageMax:48,
    title:"The Kind Lion",
    preview:"A big lion saved a tiny mouse from a net. Years later, the tiny mouse returned the favour!",
    story:"A big lion found a tiny mouse caught in a hunter's net. The lion used his claws to cut the ropes and set the mouse free. 'Thank you!' squeaked the mouse. Years later, the lion was caught in a huge trap. The tiny mouse chewed through the ropes with her little teeth — freeing the great lion!",
    moral:"Even small people can help big ones. Always be kind." },
  { id:"t03", emoji:"🌱", category:"learning", ageMin:12, ageMax:48,
    title:"The Little Seed",
    preview:"A tiny seed was buried underground and waited patiently. One day — it became a beautiful flower!",
    story:"A small seed fell in the dark dirt. It was cold and lonely. 'I want to come out!' the seed whispered. But it waited patiently, drinking tiny drops of water and feeling small bits of sunshine. One morning, the seed pushed up through the soil — and turned into a beautiful bright flower.",
    moral:"Be patient. Good things take time to grow." },
  { id:"t04", emoji:"🐦", category:"fun",      ageMin:12, ageMax:48,
    title:"Two Birds Share",
    preview:"Two birds argued over the sunniest branch. A wise owl showed them something much better — friendship!",
    story:"Two colourful birds lived in the same big tree. Both wanted the best, sunniest branch. 'It's MINE!' chirped one. 'No — MINE!' chirped the other. A wise owl said, 'Share! Take turns.' They tried it — and found they liked chatting with each other! Soon they became the best of friends.",
    moral:"Sharing makes friendships grow." },
  { id:"t05", emoji:"🌙", category:"fun",      ageMin:12, ageMax:48,
    title:"The Moon's Gift",
    preview:"A little girl couldn't sleep. The moon whispered a gentle secret — and she drifted off to the sweetest dream!",
    story:"A little girl lay in bed but couldn't sleep. She looked out her window and saw the round, glowing moon. 'I can't sleep!' she said sadly. The moon whispered, 'I'm here, watching over you. Look how still and peaceful everything is.' The girl smiled, pulled up her blanket, and drifted off to the most beautiful dream.",
    moral:"You are always loved and never alone." },
  { id:"t06", emoji:"🐘", category:"animal",   ageMin:12, ageMax:48,
    title:"The Sharing Elephant",
    preview:"Ellie had a big bag of peanuts and hungry friends. When she shared every last one — she felt the happiest!",
    story:"Ellie the elephant had a big bag of peanuts. Her forest friends were hungry. She shared every last peanut. When they were all gone, Ellie felt something warm inside her heart — happier than when she had kept them all to herself!",
    moral:"Sharing brings more joy than keeping." },
  { id:"t07", emoji:"⭐", category:"fun",      ageMin:12, ageMax:48,
    title:"The Brave Little Star",
    preview:"A tiny star hid behind a cloud, too afraid to shine. Then a little girl looked up and made a wish on her!",
    story:"A small star hid behind a cloud. 'What if no one notices me?' she worried. One night, a little girl looked up and pointed: 'That tiny, perfect star — I'll wish on it!' The little star took a deep breath and shone with all her might. The little girl's wish came true!",
    moral:"Even the smallest light makes a difference." },
  { id:"t08", emoji:"🐰", category:"animal",   ageMin:12, ageMax:48,
    title:"The Helpful Rabbit",
    preview:"A small rabbit found a turtle stuck under a heavy log. She gathered her friends — and they saved the day!",
    story:"A tiny rabbit was hopping through the woods when she found a turtle stuck under a fallen log. The rabbit was small, but clever. She called her friends — a fox, a squirrel, and a bird. Together they pushed and pushed. POP! The log rolled away. The turtle cried happy tears.",
    moral:"Asking for help and helping others is strength." },
  { id:"t09", emoji:"🎨", category:"learning", ageMin:12, ageMax:48,
    title:"Maya's Messy Masterpiece",
    preview:"Maya spilled purple paint on her drawing. She cried — until she looked again and saw something amazing!",
    story:"Maya was painting a house when — splash! — purple paint spilled all over her paper. She cried. 'Ruined!' But her teacher said, 'Look again.' Maya looked. The purple splash looked like mountains! She added trees, a sun, and a rainbow. Her 'mistake' became the most beautiful painting in the class.",
    moral:"Mistakes are often the beginning of something wonderful." },
  { id:"t10", emoji:"🐝", category:"learning", ageMin:12, ageMax:48,
    title:"Busy Bee Bella",
    preview:"Bella the bee was tired and wanted to quit. But she thought of home — and made the most golden honey!",
    story:"Bella the bee was collecting nectar. Her wings were tired and her basket was heavy. 'I want to stop,' she sighed. But she thought of her family waiting at the hive. One more flower. One more. When she finally reached home, she poured out golden honey — and everyone danced!",
    moral:"Hard work brings sweet rewards." },
  { id:"t11", emoji:"🌧️", category:"fun",      ageMin:12, ageMax:48,
    title:"The Rainy Day Surprise",
    preview:"The park trip was cancelled because of rain. But Mummy had a secret idea — and it turned into the best day ever!",
    story:"Riya looked sadly out the window. Rain. Her park trip was cancelled. She pouted. Then Mummy came with paint, glitter, and cardboard. 'Let's make a puppet theatre!' They made puppets, built a stage, and performed a show for the whole family. 'I LOVE rainy days!' Riya declared.",
    moral:"The best adventures start inside your imagination." },
  { id:"t12", emoji:"🐶", category:"animal",   ageMin:12, ageMax:48,
    title:"Bruno Finds His Bark",
    preview:"Bruno the puppy had lost his bark. He searched high and low — until the moment he truly needed it!",
    story:"Bruno the puppy couldn't bark. 'Wh-wh-' he tried, but nothing came out. He asked the cat, the duck, the horse. None could help. Then Bruno saw a cat stuck in a tree. Without thinking, he opened his mouth — 'WOOF!' He'd found his bark — and it saved the cat!",
    moral:"Bravery unlocks things you didn't know you had." },

  // ── Preschool (36–72 months) ────────────────────────────────────────────
  { id:"p01", emoji:"💎", category:"moral",    ageMin:36, ageMax:72,
    title:"The Honest Boy",
    preview:"Arjun broke his grandmother's favourite pot. He could hide it — but he chose to tell the truth instead.",
    story:"Arjun was playing ball inside when — CRASH! — his grandmother's clay pot lay broken on the floor. He could hide the pieces or blame the cat. Instead, he walked to his mother. 'Mamma, I broke it by mistake. I'm so sorry.' His mother hugged him. 'Thank you for telling the truth. That made me prouder than the pot ever did.'",
    moral:"Honesty always feels lighter than hiding the truth." },
  { id:"p02", emoji:"🦉", category:"learning", ageMin:36, ageMax:72,
    title:"The Wise Owl's Test",
    preview:"The forest animals competed to be the cleverest. But the winner wasn't the strongest — it was the most creative!",
    story:"The wise owl challenged every animal: 'Fill this room using only one thing.' The bear brought honey — not enough. The rabbit brought carrots — barely covered the floor. A tiny firefly raised her hand and flew to the centre of the room. She glowed — and golden light filled every corner. Everyone cheered!",
    moral:"True cleverness is using what you have wisely." },
  { id:"p03", emoji:"🌊", category:"moral",    ageMin:36, ageMax:72,
    title:"The River That Shared",
    preview:"A great river gave water to everyone freely. When greedy villagers tried to dam it, they discovered the hard truth!",
    story:"A mighty river shared its water with farmers, fish, birds, and animals. One dry summer, greedy villagers dammed the river. But without its flow, even their own crops started dying. The river whispered, 'When you stop sharing, everyone suffers — including you.' They removed the dam, and all was well again.",
    moral:"When we share, everyone — including ourselves — thrives." },
  { id:"p04", emoji:"🦋", category:"learning", ageMin:36, ageMax:72,
    title:"The Patient Caterpillar",
    preview:"Camille waited inside her cocoon while her friends played outside. Her patience led to the most stunning reward!",
    story:"Camille the caterpillar wrapped herself in a cocoon. Her butterfly friends flew and danced. 'Come out!' they called. 'Not yet,' she said each time. Weeks passed. Then one morning she unzipped her cocoon — and out spread the most stunning wings anyone had ever seen. She soared higher than all the others.",
    moral:"Trust your own timing. Great things are worth the wait." },
  { id:"p05", emoji:"🌍", category:"fun",      ageMin:36, ageMax:72,
    title:"The Village Garden",
    preview:"Five families fought over one garden — until a child had the simplest idea that changed everything!",
    story:"Five families wanted to grow different things in one small garden. They argued and argued. Then little Priya said, 'Why don't we split it? Tomatoes here, flowers there, beans over there!' By summer it was the most beautiful, delicious garden anyone had ever seen — and every family had more food than ever.",
    moral:"Different ideas together make something greater than any one idea alone." },
  { id:"p06", emoji:"🐺", category:"moral",    ageMin:36, ageMax:72,
    title:"The Boy Who Cried Wolf",
    preview:"Rohan lied twice about a wolf to get attention. But when a real wolf came, nobody believed him at all!",
    story:"Rohan was bored watching sheep and shouted 'Wolf! Wolf!' twice as a joke. The villagers came running — and left angry. Then a real wolf appeared. Rohan screamed with all his might. This time, nobody came. He learned the hardest lesson of his life.",
    moral:"Tell the truth always — once trust is broken, it's hard to rebuild." },
  { id:"p07", emoji:"🐜", category:"learning", ageMin:36, ageMax:72,
    title:"The Hardworking Ant",
    preview:"The grasshopper played all summer. The ant worked every day. When winter arrived, only one was prepared!",
    story:"All summer, the grasshopper sang and danced while the ant stored food. 'Why work so hard?' laughed the grasshopper. But when winter arrived, the ant was warm with a full pantry. The shivering grasshopper knocked on the door. The kind ant shared some food — but also said, 'Next summer, prepare early.'",
    moral:"Hard work today secures your tomorrow." },
  { id:"p08", emoji:"🎭", category:"fun",      ageMin:36, ageMax:72,
    title:"The Three Silly Clouds",
    preview:"Three clouds argued about whose rain was the best. A wise sun showed each one exactly where they were needed!",
    story:"Three clouds argued: 'My storm is best!' 'No — my drizzle!' 'My snow!' A wise sun heard them. 'The desert needs your drizzle. The mountains need your snow. The crops need your thunder.' Each cloud found the right place to shine — and the world was happy.",
    moral:"We all have different gifts, and the world needs all of them." },

  // ── Early School (60–108 months) ────────────────────────────────────────
  { id:"e01", emoji:"🏺", category:"learning", ageMin:60, ageMax:108,
    title:"The Empty Jar",
    preview:"A professor filled a jar with rocks, then pebbles, then sand. He still found room for more — what's the lesson?",
    story:"A professor put large rocks in a jar. 'Full?' 'Yes!' He poured in pebbles — they filled the gaps. 'Now?' 'Yes!' He poured in sand. Then coffee. 'This is your life,' he said. 'Rocks are family, health, values. Pebbles are work. Sand is everything else. Put the rocks in first — or there's no room for what truly matters.'",
    moral:"Always put the most important things first." },
  { id:"e02", emoji:"💎", category:"moral",    ageMin:60, ageMax:108,
    title:"The Two Stones",
    preview:"A teacher showed two stones — rough and smooth. The difference between them told a powerful lesson about challenges!",
    story:"A teacher showed two stones. The rough one was jagged. The smooth one shone perfectly. 'This rough stone was never touched by challenge,' she said. 'The smooth one was tumbled by rivers, shaped by difficulty over years.' She held it up. 'Every hard moment in your life is polishing you. Don't run from challenges. They are making you shine.'",
    moral:"Challenges don't break you — they shape you." },
  { id:"e03", emoji:"🦅", category:"animal",   ageMin:60, ageMax:108,
    title:"The Eagle's First Flight",
    preview:"A mother eagle pushed her baby off the edge of the nest. Was that cruel — or the greatest gift she could give?",
    story:"A baby eagle sat in his comfortable nest, too afraid to try his wings. His mother brought food every day. But one morning, she gently nudged him to the edge — then nudged him off. He fell — and then his wings opened, and he soared higher than he'd ever imagined. He turned back to see his mother watching proudly.",
    moral:"The people who push us sometimes love us the most." },
  { id:"e04", emoji:"✏️", category:"learning", ageMin:60, ageMax:108,
    title:"The Pencil's Promise",
    preview:"Before a pencil was packed, its maker gave it five pieces of life advice. The last one will surprise you!",
    story:"A pencil-maker told his pencil five things: 1. You will do great things — only if you allow yourself to be held. 2. You will sometimes need sharpening — it will hurt, but you'll be better after. 3. You can correct your mistakes. 4. The most important part of you is on the inside. 5. Wherever you go, leave a mark. The pencil carried these lessons into the world.",
    moral:"What matters most is who we are inside, and the mark we leave on the world." },
  { id:"e05", emoji:"🧗", category:"fun",      ageMin:60, ageMax:108,
    title:"The Mountain and the River",
    preview:"A mountain laughed at a tiny river trying to pass it. The river said nothing — and then proved it over centuries!",
    story:"A great mountain laughed at a tiny river. 'You'll never get past me!' The river said nothing. It found a small crack and flowed through. Then another. Drop by drop, year by year, the river carved a magnificent canyon through the mountain. Today, millions visit that canyon in awe — the very spot the mountain once thought was impossible.",
    moral:"Patience and persistence overcome almost any obstacle." },
  { id:"e06", emoji:"🪄", category:"fun",      ageMin:60, ageMax:108,
    title:"The Paintbrush That Changed the Street",
    preview:"Meera had one old paintbrush and nothing to paint on. By the end of the week, the whole town had changed!",
    story:"Meera had one old paintbrush. She asked the shopkeeper, 'Can I paint your grey wall?' She painted flowers. The fruit seller said, 'Paint mine too!' She painted fruits. The school principal invited her — she painted children flying kites. Within a week, the whole grey street had burst into colour, and strangers came from other towns just to walk down it.",
    moral:"One small act of creativity can change an entire world." },
  { id:"e07", emoji:"🦊", category:"animal",   ageMin:60, ageMax:108,
    title:"The Fox and the Grapes",
    preview:"A hungry fox tried again and again to reach the grapes. When he finally gave up, what did he tell himself?",
    story:"A hungry fox saw a beautiful bunch of grapes hanging high on a vine. He jumped once — missed. Twice — missed. He tried until exhausted. Then he walked away, muttering, 'Those grapes were probably sour anyway. I didn't really want them.' But deep down, he knew the truth.",
    moral:"Honest disappointment is healthier than making excuses for failure." },
  { id:"e08", emoji:"🏮", category:"moral",    ageMin:60, ageMax:108,
    title:"The Boy with the Lamp",
    preview:"A boy who couldn't walk well sat at a crossroads every night with a small lamp — and became the village's most beloved!",
    story:"In a village without electricity, nights were dark. A boy with a weak leg made himself a lamp from an old tin can. Each evening he sat at the crossroads and lit the way for others. Merchants stopped to thank him. Families stopped to chat. He became the village's most beloved person — not despite his limitation, but because of what he chose to do with it.",
    moral:"Your light can shine brightest in your darkest place." },

  // ── Pre-teen (84–144 months) ────────────────────────────────────────────
  { id:"pt01", emoji:"🔭", category:"learning", ageMin:84, ageMax:144,
    title:"The Stars That Never Move",
    preview:"Sailors navigated oceans for centuries using one fixed star. What does that teach us about our own inner compass?",
    story:"For thousands of years, sailors crossed seas using the North Star — because it never moved, no matter the storm. Great navigators knew: to find your way, you need something fixed to guide you. Today we may not look at stars to navigate — but we can build a North Star inside us. Our values, our honesty, our word. Those are the stars that should never move.",
    moral:"Having principles you never compromise on guides you through life's storms." },
  { id:"pt02", emoji:"🎓", category:"moral",    ageMin:84, ageMax:144,
    title:"The Teacher's Final Exam",
    preview:"On the last day of class, the teacher gave one question — and it had nothing to do with the subject at all!",
    story:"On the last day of school, the professor gave the final exam. Students expected hard questions. But the paper had just one: 'What is the name of the woman who cleans our classroom?' Most had no idea. The professor collected the papers. 'I hope you all pass in life. But success is not just about grades — it's about noticing the people around you. Everyone matters.'",
    moral:"Respect and kindness to every person, regardless of their role, is true intelligence." },
  { id:"pt03", emoji:"🌱", category:"learning", ageMin:84, ageMax:144,
    title:"The Bamboo Grove",
    preview:"Bamboo grows underground for five years with nothing to show — then rockets 90 feet tall in six weeks!",
    story:"A farmer planted bamboo seeds. For five years he watered them every day. Nothing appeared above ground. Not a leaf. His friends laughed. In the sixth year, the bamboo pushed through the soil — and grew 90 feet tall in six weeks. People asked how it was possible. The farmer smiled: 'It spent five years building roots strong enough to hold it up.'",
    moral:"The years when nothing seems to be happening are often when everything important is being built." },
  { id:"pt04", emoji:"🤝", category:"moral",    ageMin:84, ageMax:144,
    title:"The Two Brothers and the Field",
    preview:"Two brothers secretly carried grain to each other's barn every night. Then one moonlit night they finally met...",
    story:"Two brothers owned neighbouring wheat fields. At harvest, one thought: 'My brother has children — he needs more.' He secretly carried sacks to his brother's barn. His brother thought: 'My brother works alone — he deserves more.' He secretly did the same. Each morning both had the same amount. One night they met in the field, both carrying sacks for the other. They embraced without words.",
    moral:"True generosity does not ask to be seen." },
  { id:"pt05", emoji:"🧠", category:"learning", ageMin:84, ageMax:144,
    title:"The Scientist and the Spider",
    preview:"Robert Bruce failed six times in battle and hid in a cave — until he saw a small spider try on its seventh attempt!",
    story:"Robert Bruce had failed six times in battle and was hiding in a cave, ready to give up. He watched a spider try to build a web. The spider failed again and again — on the seventh try, the web held. Robert walked out of that cave a changed man. He fought his seventh battle — and won. He united Scotland. The spider's lesson changed history.",
    moral:"When everything says quit, try one more time. The seventh attempt might change everything." },
];

function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const result = [...arr];
  let s = (seed ^ 0xdeadbeef) >>> 0;
  for (let i = result.length - 1; i > 0; i--) {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

/**
 * Returns today's curated story pool for a child of `ageMonths` old. Uses a
 * date-seeded shuffle so the same child sees the same order all day, then a
 * fresh selection tomorrow. Mirrors `getDailyPool` from
 * `kidschedule/src/components/daily-story-section.tsx`.
 *
 * `today` is injectable so tests can pin a deterministic date.
 */
export function getDailyStoryPool(
  ageMonths: number,
  today: Date = new Date(),
): DailyStory[] {
  const dateSeed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  const eligible = DAILY_STORIES.filter(
    (s) => ageMonths >= s.ageMin && ageMonths <= s.ageMax,
  );

  const cats: StoryCategory[] = ["moral", "fun", "animal", "learning"];
  const byCategory: Record<StoryCategory, DailyStory[]> = {
    moral:    seededShuffle(eligible.filter((s) => s.category === "moral"),    dateSeed),
    fun:      seededShuffle(eligible.filter((s) => s.category === "fun"),      dateSeed + 1),
    animal:   seededShuffle(eligible.filter((s) => s.category === "animal"),   dateSeed + 2),
    learning: seededShuffle(eligible.filter((s) => s.category === "learning"), dateSeed + 3),
  };

  const selected: DailyStory[] = [];
  const used = new Set<string>();
  const take = (pool: DailyStory[]) => {
    for (const s of pool) {
      if (!used.has(s.id)) {
        selected.push(s);
        used.add(s.id);
        return;
      }
    }
  };
  for (const c of cats) take(byCategory[c]);
  const fullShuffled = seededShuffle(eligible, dateSeed + 99);
  for (const s of fullShuffled) {
    if (!used.has(s.id)) {
      selected.push(s);
      used.add(s.id);
    }
  }
  return selected;
}

// ─── Daily puzzle bank (adaptive difficulty) ──────────────────────────────────

export type PuzzleDifficulty = "easy" | "medium" | "hard";

export type DailyPuzzle = {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: PuzzleDifficulty;
  visual?: string;
  audioQ?: string;
};

export const DAILY_PUZZLES: readonly DailyPuzzle[] = [
  // ── EASY (preschool, 3–5 years) ────────────────────────────────────────
  { id:"e01", difficulty:"easy", question:"What comes after A, B, C?",         options:["D","E","F","G"], correctAnswer:"D", visual:"🔤" },
  { id:"e02", difficulty:"easy", question:"What colour is the sky on a sunny day?", options:["Green","Blue","Red","Yellow"], correctAnswer:"Blue", visual:"☀️🌤️" },
  { id:"e03", difficulty:"easy", question:"How many fingers are on ONE hand?",  options:["4","6","5","10"], correctAnswer:"5", visual:"✋" },
  { id:"e04", difficulty:"easy", question:"Which animal says Moo?",              options:["Dog","Cat","Cow","Duck"], correctAnswer:"Cow", visual:"🐄" },
  { id:"e05", difficulty:"easy", question:"What shape is a ball?",               options:["Square","Triangle","Circle","Rectangle"], correctAnswer:"Circle", visual:"⚽" },
  { id:"e06", difficulty:"easy", question:"What comes after the number 4?",     options:["3","6","7","5"], correctAnswer:"5", visual:"4️⃣ → ?" },
  { id:"e07", difficulty:"easy", question:"Which fruit is yellow and curved?",   options:["Apple","Banana","Grape","Mango"], correctAnswer:"Banana", visual:"🍌" },
  { id:"e08", difficulty:"easy", question:"How many wheels does a car have?",   options:["2","3","4","6"], correctAnswer:"4", visual:"🚗" },
  { id:"e09", difficulty:"easy", question:"What do bees make?",                  options:["Milk","Honey","Butter","Juice"], correctAnswer:"Honey", visual:"🐝🍯" },
  { id:"e10", difficulty:"easy", question:"Which is the biggest animal?",        options:["Cat","Dog","Elephant","Rabbit"], correctAnswer:"Elephant", visual:"🐘" },
  { id:"e11", difficulty:"easy", question:"How many sides does a triangle have?", options:["2","4","5","3"], correctAnswer:"3", visual:"🔺" },
  { id:"e12", difficulty:"easy", question:"What do plants need to grow?",        options:["Sand and Ice","Sun and Water","Dark and Cold","Wind and Fire"], correctAnswer:"Sun and Water", visual:"🌱☀️💧" },
  { id:"e13", difficulty:"easy", question:"Which one can fly?",                  options:["Dog","Fish","Bird","Cat"], correctAnswer:"Bird", visual:"🐦" },
  { id:"e14", difficulty:"easy", question:"What colour is grass?",               options:["Blue","Red","Yellow","Green"], correctAnswer:"Green", visual:"🌿" },
  { id:"e15", difficulty:"easy", question:"How many days are in a week?",        options:["5","6","8","7"], correctAnswer:"7", visual:"📅" },
  { id:"e16", difficulty:"easy", question:"Which season is the coldest?",        options:["Summer","Spring","Winter","Autumn"], correctAnswer:"Winter", visual:"❄️🌨️" },
  { id:"e17", difficulty:"easy", question:"What do we use to brush our teeth?",  options:["Comb","Spoon","Toothbrush","Towel"], correctAnswer:"Toothbrush", visual:"🪥" },
  { id:"e18", difficulty:"easy", question:"Which number is the biggest?",        options:["3","7","2","5"], correctAnswer:"7", visual:"🔢" },

  // ── MEDIUM (early school, 6–10 years) ──────────────────────────────────
  { id:"m01", difficulty:"medium", question:"What is 8 × 7?",                   options:["54","56","63","48"], correctAnswer:"56" },
  { id:"m02", difficulty:"medium", question:"Which planet is closest to the Sun?", options:["Venus","Earth","Mercury","Mars"], correctAnswer:"Mercury" },
  { id:"m03", difficulty:"medium", question:"How many months are in a year?",   options:["10","11","12","13"], correctAnswer:"12" },
  { id:"m04", difficulty:"medium", question:"What is the capital of India?",     options:["Mumbai","Delhi","Chennai","Kolkata"], correctAnswer:"Delhi" },
  { id:"m05", difficulty:"medium", question:"What is 144 ÷ 12?",                options:["10","14","11","12"], correctAnswer:"12" },
  { id:"m06", difficulty:"medium", question:"Who invented the telephone?",       options:["Edison","Einstein","Bell","Newton"], correctAnswer:"Bell" },
  { id:"m07", difficulty:"medium", question:"What is 7² (seven squared)?",      options:["14","42","56","49"], correctAnswer:"49" },
  { id:"m08", difficulty:"medium", question:"How many sides does a hexagon have?", options:["5","8","6","7"], correctAnswer:"6" },
  { id:"m09", difficulty:"medium", question:"Which is the largest ocean?",       options:["Atlantic","Indian","Pacific","Arctic"], correctAnswer:"Pacific" },
  { id:"m10", difficulty:"medium", question:"What is 25 + 37?",                  options:["52","62","61","63"], correctAnswer:"62" },
  { id:"m11", difficulty:"medium", question:"What gas do plants breathe in?",    options:["Oxygen","Nitrogen","Carbon Dioxide","Hydrogen"], correctAnswer:"Carbon Dioxide" },
  { id:"m12", difficulty:"medium", question:"How many zeroes are in one million?", options:["5","7","4","6"], correctAnswer:"6" },
  { id:"m13", difficulty:"medium", question:"What is 25% of 200?",               options:["40","60","25","50"], correctAnswer:"50" },
  { id:"m14", difficulty:"medium", question:"Which instrument has 88 keys?",     options:["Guitar","Violin","Flute","Piano"], correctAnswer:"Piano" },
  { id:"m15", difficulty:"medium", question:"What is the boiling point of water in °C?", options:["90","100","80","110"], correctAnswer:"100" },
  { id:"m16", difficulty:"medium", question:"How many continents are on Earth?", options:["5","6","7","8"], correctAnswer:"7" },
  { id:"m17", difficulty:"medium", question:"What is the square root of 81?",    options:["7","8","10","9"], correctAnswer:"9" },
  { id:"m18", difficulty:"medium", question:"A triangle has angles of 60°, 60° and ___?", options:["90°","60°","45°","80°"], correctAnswer:"60°" },

  // ── HARD (pre-teen, 10–15 years) ───────────────────────────────────────
  { id:"h01", difficulty:"hard", question:"A train travels at 60 km/h for 2.5 hours. How far?", options:["120 km","150 km","180 km","90 km"], correctAnswer:"150 km" },
  { id:"h02", difficulty:"hard", question:"What is the value of π to 2 decimal places?", options:["3.41","3.12","3.14","3.17"], correctAnswer:"3.14" },
  { id:"h03", difficulty:"hard", question:"If 5x = 35, what is x?",             options:["5","8","6","7"], correctAnswer:"7" },
  { id:"h04", difficulty:"hard", question:"Who wrote Romeo and Juliet?",          options:["Dickens","Austen","Shakespeare","Tolstoy"], correctAnswer:"Shakespeare" },
  { id:"h05", difficulty:"hard", question:"What is the speed of light (approx)?", options:["200,000 km/s","3,00,000 km/s","1,50,000 km/s","5,00,000 km/s"], correctAnswer:"3,00,000 km/s" },
  { id:"h06", difficulty:"hard", question:"What is the chemical symbol for Gold?", options:["Go","Gd","Au","Ag"], correctAnswer:"Au" },
  { id:"h07", difficulty:"hard", question:"In a class of 40, 60% are girls. How many boys?", options:["20","18","24","16"], correctAnswer:"16" },
  { id:"h08", difficulty:"hard", question:"What is the smallest prime number?",  options:["0","3","1","2"], correctAnswer:"2" },
  { id:"h09", difficulty:"hard", question:"Which element has atomic number 1?",  options:["Helium","Oxygen","Carbon","Hydrogen"], correctAnswer:"Hydrogen" },
  { id:"h10", difficulty:"hard", question:"What is 15% of 360?",                 options:["48","54","60","45"], correctAnswer:"54" },
  { id:"h11", difficulty:"hard", question:"The sum of angles in a quadrilateral is:", options:["180°","270°","360°","540°"], correctAnswer:"360°" },
  { id:"h12", difficulty:"hard", question:"If you fold a paper in half twice, how many layers?", options:["2","4","6","8"], correctAnswer:"4" },
  { id:"h13", difficulty:"hard", question:"What is the powerhouse of the cell?", options:["Nucleus","Ribosome","Mitochondria","Golgi Body"], correctAnswer:"Mitochondria" },
  { id:"h14", difficulty:"hard", question:"Solve: 2² + 3² + 4² = ?",            options:["25","27","29","30"], correctAnswer:"29" },
  { id:"h15", difficulty:"hard", question:"What is the freezing point of water in Fahrenheit?", options:["0°F","100°F","32°F","212°F"], correctAnswer:"32°F" },
  { id:"h16", difficulty:"hard", question:"A rectangle is 12cm × 8cm. What is its perimeter?", options:["40 cm","96 cm","32 cm","20 cm"], correctAnswer:"40 cm" },
  { id:"h17", difficulty:"hard", question:"A palindrome reads the same forwards and backwards. Which of these is one?", options:["race","level","tiger","panel"], correctAnswer:"level" },
  { id:"h18", difficulty:"hard", question:"What fraction of a day is 6 hours?",  options:["1/3","1/6","1/4","1/2"], correctAnswer:"1/4" },
];

export const PUZZLE_PER_SESSION = 5;

export function puzzleDateSeed(dateStr: string, childName: string): number {
  const str = dateStr + childName;
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function defaultPuzzleDifficulty(group: AgeGroup): PuzzleDifficulty {
  if (group === "preschool") return "easy";
  if (group === "early_school") return "medium";
  if (group === "pre_teen") return "hard";
  // infant/toddler shouldn't reach the puzzle (gated by ageYears>=3) but
  // fall back to easy for safety.
  return "easy";
}

export function adjustPuzzleDifficulty(
  cur: PuzzleDifficulty,
  correctStreak: number,
  wrongStreak: number,
): PuzzleDifficulty {
  if (correctStreak >= 3) {
    if (cur === "easy") return "medium";
    if (cur === "medium") return "hard";
  }
  if (wrongStreak >= 2) {
    if (cur === "hard") return "medium";
    if (cur === "medium") return "easy";
  }
  return cur;
}

/**
 * Pick `n` puzzles for a session, biased toward unused ids and shuffled
 * deterministically by `seed`. Falls back gracefully if the difficulty
 * pool is exhausted. Mirrors `pickPuzzles` from the web component.
 */
export function pickPuzzles(
  diff: PuzzleDifficulty,
  seed: number,
  used: readonly string[],
  n: number,
): DailyPuzzle[] {
  let pool: DailyPuzzle[] = DAILY_PUZZLES.filter(
    (p) => p.difficulty === diff && !used.includes(p.id),
  );
  if (pool.length < n) pool = DAILY_PUZZLES.filter((p) => p.difficulty === diff);
  if (pool.length < n) pool = [...DAILY_PUZZLES];
  const src = [...pool];
  let s = seed;
  for (let i = src.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [src[i], src[j]] = [src[j]!, src[i]!];
  }
  return src.slice(0, n);
}
