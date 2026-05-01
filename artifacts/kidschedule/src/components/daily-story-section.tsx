import { useState, useMemo, useCallback } from "react";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// ─── Types ────────────────────────────────────────────────────────────────────

type StoryCategory = "moral" | "fun" | "animal" | "learning";

type Story = {
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

// ─── Category config ──────────────────────────────────────────────────────────

const CAT: Record<StoryCategory, { label: string; color: string; bg: string; dot: string }> = {
  moral:    { label: "Moral",    color: "#a855f7", bg: "rgba(168,85,247,0.12)", dot: "#a855f7" },
  fun:      { label: "Fun",      color: "#f59e0b", bg: "rgba(245,158,11,0.12)", dot: "#f59e0b" },
  animal:   { label: "Animal",   color: "#10b981", bg: "rgba(16,185,129,0.12)", dot: "#10b981" },
  learning: { label: "Learning", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", dot: "#3b82f6" },
};

// ─── Story bank ───────────────────────────────────────────────────────────────

const ALL_STORIES: Story[] = [
  // ── Toddler (12–48 months) ────────────────────────────────────────────────
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

  // ── Preschool (36–72 months) ──────────────────────────────────────────────
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

  // ── Early School (60–108 months) ──────────────────────────────────────────
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

  // ── Pre-teen (84–144 months) ──────────────────────────────────────────────
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

// ─── Date-seeded shuffle ──────────────────────────────────────────────────────

function seededShuffle<T>(arr: T[], seed: number): T[] {
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

// ─── Story pool for child's age & today's date ────────────────────────────────

function getDailyPool(ageMonths: number): Story[] {
  const today = new Date();
  const dateSeed =
    today.getFullYear() * 10000 +
    (today.getMonth() + 1) * 100 +
    today.getDate();

  const eligible = ALL_STORIES.filter(
    s => ageMonths >= s.ageMin && ageMonths <= s.ageMax,
  );

  // Ensure category diversity — one of each per day if possible
  const cats: StoryCategory[] = ["moral", "fun", "animal", "learning"];
  const byCategory: Record<StoryCategory, Story[]> = {
    moral:    seededShuffle(eligible.filter(s => s.category === "moral"),    dateSeed),
    fun:      seededShuffle(eligible.filter(s => s.category === "fun"),      dateSeed + 1),
    animal:   seededShuffle(eligible.filter(s => s.category === "animal"),   dateSeed + 2),
    learning: seededShuffle(eligible.filter(s => s.category === "learning"), dateSeed + 3),
  };

  // Interleave: take 1 from each category, then extras
  const selected: Story[] = [];
  let catIdx = 0;
  const used = new Set<string>();

  const take = (pool: Story[]) => {
    for (const s of pool) {
      if (!used.has(s.id)) { selected.push(s); used.add(s.id); return; }
    }
  };
  // First round: 1 per category
  for (const c of cats) take(byCategory[c]);
  // Rest: top-up from the full pool
  const fullShuffled = seededShuffle(eligible, dateSeed + 99);
  for (const s of fullShuffled) {
    if (!used.has(s.id)) { selected.push(s); used.add(s.id); }
  }
  void catIdx;
  return selected;
}

// ─── Category badge ───────────────────────────────────────────────────────────

function CatBadge({ category }: { category: StoryCategory }) {
  const c = CAT[category];
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full"
      style={{ background: c.bg, color: c.color }}
    >
      <span
        className="inline-block w-1.5 h-1.5 rounded-full"
        style={{ background: c.dot }}
      />
      {c.label}
    </span>
  );
}

// ─── Story card (featured) ────────────────────────────────────────────────────

function FeaturedCard({
  story, isPlaying, onPlay, expanded, onToggleExpand,
}: {
  story: Story;
  isPlaying: boolean;
  onPlay(): void;
  expanded: boolean;
  onToggleExpand(): void;
}) {
  const c = CAT[story.category];
  return (
    <div
      className="rounded-3xl border overflow-hidden mb-3"
      style={{
        borderColor: c.color + "30",
        background: `linear-gradient(135deg,${c.bg} 0%,transparent 100%)`,
      }}
    >
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-400/20 text-amber-700 dark:text-amber-300">
              ⭐ Featured
            </span>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-400/20 text-emerald-700 dark:text-emerald-300">
              🌅 New Today
            </span>
          </div>
          <CatBadge category={story.category} />
        </div>

        <div className="flex gap-3 mb-3">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-4xl border"
            style={{ background: c.bg, borderColor: c.color + "30" }}
          >
            {story.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-quicksand font-black text-lg text-foreground leading-snug mb-1">
              {story.title}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
              {story.preview}
            </p>
          </div>
        </div>
      </div>

      {/* Full story (expandable) */}
      {expanded && (
        <div className="px-4 pb-3">
          <div className="rounded-2xl p-4 border" style={{ background: "rgba(255,255,255,0.5)", borderColor: c.color + "20" }}>
            <p className="text-sm text-foreground leading-relaxed italic mb-3">
              "{story.story}"
            </p>
            <div className="rounded-xl p-3" style={{ background: c.bg }}>
              <p className="text-[11px] font-black mb-0.5" style={{ color: c.color }}>
                💡 Moral of the Story
              </p>
              <p className="text-sm font-semibold text-foreground">{story.moral}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={onPlay}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold border transition-all active:scale-95"
          style={{
            background: isPlaying ? c.bg : "transparent",
            borderColor: c.color + "40",
            color: c.color,
          }}
        >
          {isPlaying ? "⏸ Stop" : "🔊 Read Aloud"}
        </button>
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 text-white"
          style={{ background: c.color }}
        >
          {expanded ? "✕ Close" : "📖 Read Story"}
        </button>
      </div>
    </div>
  );
}

// ─── Story card (compact) ─────────────────────────────────────────────────────

function StoryCard({
  story, isPlaying, onPlay, expanded, onToggleExpand,
}: {
  story: Story;
  isPlaying: boolean;
  onPlay(): void;
  expanded: boolean;
  onToggleExpand(): void;
}) {
  const c = CAT[story.category];
  return (
    <div
      className="rounded-2xl border p-3 mb-2 transition-all"
      style={{
        borderColor: expanded ? c.color + "40" : "var(--border)",
        background: expanded ? c.bg : "transparent",
      }}
    >
      <div className="flex gap-3 items-start">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl border"
          style={{ background: c.bg, borderColor: c.color + "25" }}
        >
          {story.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-bold text-sm text-foreground truncate">{story.title}</span>
            <CatBadge category={story.category} />
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {story.preview}
          </p>
        </div>
      </div>

      {/* Expanded story */}
      {expanded && (
        <div className="mt-3 rounded-xl p-3 border" style={{ borderColor: c.color + "20", background: "rgba(255,255,255,0.4)" }}>
          <p className="text-xs text-foreground leading-relaxed italic mb-2">"{story.story}"</p>
          <div className="rounded-lg p-2.5" style={{ background: c.bg }}>
            <p className="text-[10px] font-black mb-0.5" style={{ color: c.color }}>💡 Moral</p>
            <p className="text-xs font-semibold text-foreground">{story.moral}</p>
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 mt-2.5">
        <button
          onClick={onPlay}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95"
          style={{ borderColor: c.color + "30", color: c.color, background: isPlaying ? c.bg : "transparent" }}
        >
          {isPlaying ? "⏸ Stop" : "🔊 Aloud"}
        </button>
        <button
          onClick={onToggleExpand}
          className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-black transition-all active:scale-95 text-white"
          style={{ background: c.color }}
        >
          {expanded ? "✕ Close" : "📖 Read"}
        </button>
      </div>
    </div>
  );
}

// ─── Main exported component ──────────────────────────────────────────────────

interface DailyStorySectionProps {
  ageMonths: number;
  childName: string;
}

export function DailyStorySection({ ageMonths, childName }: DailyStorySectionProps) {
  const pool = useMemo(() => getDailyPool(ageMonths), [ageMonths]);

  const PAGE = 5;
  const [page,       setPage]       = useState(0);
  const [expanded,   setExpanded]   = useState<Set<string>>(new Set());
  const [playingId,  setPlayingId]  = useState<string | null>(null);

  const { speak, stop } = useAmyVoice();

  const visible = useMemo(
    () => pool.slice(0, (page + 1) * PAGE),
    [pool, page],
  );

  const toggleExpand = useCallback((id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handlePlay = useCallback((story: Story) => {
    if (playingId === story.id) {
      stop();
      setPlayingId(null);
      return;
    }
    stop();
    setPlayingId(story.id);
    void speak(`${story.title}. ${story.story}. The moral is: ${story.moral}`).then(() => {
      setPlayingId(null);
    });
  }, [playingId, speak, stop]);

  const hasMore = visible.length < pool.length;

  if (pool.length === 0) return null;

  const [featured, ...rest] = visible as [Story, ...Story[]];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs text-amber-600 dark:text-amber-300 font-semibold">
            📅 Daily stories for {childName} · {visible.length} shown
          </p>
        </div>
        <div className="flex gap-1">
          {(["moral","fun","animal","learning"] as StoryCategory[]).map(c => (
            <span
              key={c}
              className="w-2 h-2 rounded-full"
              style={{ background: CAT[c].dot }}
              title={CAT[c].label}
            />
          ))}
        </div>
      </div>

      {/* Featured story */}
      <FeaturedCard
        story={featured}
        isPlaying={playingId === featured.id}
        onPlay={() => handlePlay(featured)}
        expanded={expanded.has(featured.id)}
        onToggleExpand={() => toggleExpand(featured.id)}
      />

      {/* Remaining stories */}
      {rest.map(story => (
        <StoryCard
          key={story.id}
          story={story}
          isPlaying={playingId === story.id}
          onPlay={() => handlePlay(story)}
          expanded={expanded.has(story.id)}
          onToggleExpand={() => toggleExpand(story.id)}
        />
      ))}

      {/* Load More */}
      {hasMore && (
        <button
          onClick={() => setPage(p => p + 1)}
          className="w-full mt-3 py-3 rounded-2xl border-2 border-dashed text-sm font-bold text-amber-600 dark:text-amber-300 border-amber-200 dark:border-amber-400/30 hover:bg-amber-50 dark:hover:bg-amber-400/10 transition-all active:scale-[0.98]"
        >
          📚 Load 5 More Stories
        </button>
      )}

      {/* No more stories */}
      {!hasMore && pool.length > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-3">
          ✨ You've seen all stories for today — check back tomorrow for new ones!
        </p>
      )}

      <p className="text-[10px] text-muted-foreground mt-3 text-center">
        📖 Read these stories to {childName} at bedtime for a meaningful connection moment
      </p>
    </div>
  );
}
