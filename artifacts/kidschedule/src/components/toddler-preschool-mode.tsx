import React, { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, ChevronRight, CheckCircle2, Star, SkipForward, Sparkles } from "lucide-react";
import { useAmyVoice } from "@/hooks/use-amy-voice";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
type AgeGroupKey = "toddler" | "preschool";

function getTodaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function getDailyStart(key: string, len: number): number {
  const seed = getTodaySeed();
  return (seed + key.charCodeAt(0) * 3) % len;
}

function getStored(key: string): number {
  try {
    const val = localStorage.getItem(key);
    if (!val) return -1;
    const parsed = JSON.parse(val);
    if (parsed.date !== getTodaySeed()) return -1;
    return parsed.index;
  } catch { return -1; }
}

function setStored(key: string, index: number) {
  try { localStorage.setItem(key, JSON.stringify({ date: getTodaySeed(), index })); } catch {}
}

function useRotatingIndex(storageKey: string, items: readonly unknown[]) {
  const [idx, setIdx] = useState<number>(() => {
    const saved = getStored(storageKey);
    if (saved >= 0) return saved % items.length;
    return getDailyStart(storageKey, items.length);
  });

  const next = useCallback(() => {
    setIdx((prev) => {
      const n = (prev + 1) % items.length;
      setStored(storageKey, n);
      return n;
    });
  }, [storageKey, items.length]);

  return { idx, next };
}

// ─────────────────────────────────────────────────────────────
// DATA — Activities, Skills, Parent Tasks, Fun Activities
// ─────────────────────────────────────────────────────────────
type Activity = { emoji: string; title: string; desc: string; duration: string };

const TODDLER_ACTIVITIES: Activity[] = [
  { emoji: "🔴", title: "Colour Hunt",         desc: "Find 3 red things around the house. Say 'red' each time — point, touch, name!", duration: "10 min" },
  { emoji: "⬜", title: "Shape Sort",          desc: "Use a shape sorter toy and guide little hands to match circle, square, and triangle.", duration: "10 min" },
  { emoji: "🐄", title: "Animal Sounds",       desc: "Moo like a cow, bark like a dog, quack like a duck! Make sounds and have toddler mimic you.", duration: "5 min" },
  { emoji: "⚽", title: "Ball Roll",            desc: "Sit on the floor opposite each other and roll a soft ball back and forth. Turn-taking builds social skills!", duration: "10 min" },
  { emoji: "🧱", title: "Block Tower",         desc: "Stack 3 coloured blocks and count together: '1, 2, 3!' — then let them knock it all down!", duration: "10 min" },
  { emoji: "💃", title: "Dance Together",      desc: "Play their favourite song and sway, clap, and stomp along. Movement is learning!", duration: "5 min" },
  { emoji: "🫙", title: "Pour & Fill",         desc: "Give safe containers of different sizes and let them pour water or dry rice between them in the bathtub.", duration: "15 min" },
  { emoji: "🧩", title: "Peg Puzzle",          desc: "Use a simple peg puzzle (animals or shapes). Let them pick up and place each piece — celebrate every one!", duration: "10 min" },
  { emoji: "🎨", title: "Finger Painting",     desc: "Dip a finger in washable paint and make dots, lines, and squiggles on paper together.", duration: "15 min" },
  { emoji: "🧺", title: "Sort by Colour",      desc: "Sort socks or blocks by colour into piles. Name each colour as you go: 'Blue one here!'", duration: "10 min" },
];

const PRESCHOOL_ACTIVITIES: Activity[] = [
  { emoji: "✏️", title: "Draw My Family",      desc: "Give crayons and paper and ask them to draw your family. Ask 'Who is that?' and listen to the story!", duration: "15 min" },
  { emoji: "🔤", title: "Letter of the Day",   desc: "Choose 'A'. Find 3 things that start with A. Ant, Apple, Arm! Then try writing it together.", duration: "10 min" },
  { emoji: "🔢", title: "Counting Walk",       desc: "Walk around the room counting things: chairs, windows, toys. Go up to 10 today!", duration: "10 min" },
  { emoji: "📖", title: "Story Quest",         desc: "Read a picture book and stop halfway: 'What do you think happens next?' Really listen to their ideas.", duration: "15 min" },
  { emoji: "✂️", title: "Snip & Stick",        desc: "Practice cutting with safety scissors along lines drawn on paper. Then glue shapes onto card to make art.", duration: "15 min" },
  { emoji: "🧩", title: "6-Piece Puzzle",      desc: "Work a 6–8 piece puzzle together. Talk through each piece: 'Does this one have blue on it?'", duration: "10 min" },
  { emoji: "🎭", title: "Simon Says",          desc: "Play Simon Says to build listening skills and body awareness. Let them be Simon too!", duration: "10 min" },
  { emoji: "🌈", title: "Rainbow Draw",        desc: "Draw a rainbow together — one stripe at a time, naming colours as you go. Practice holding the crayon properly.", duration: "15 min" },
  { emoji: "✈️", title: "Paper Aeroplane",     desc: "Fold a simple paper aeroplane and decorate it together. Then fly it across the room and measure how far!", duration: "10 min" },
  { emoji: "🔍", title: "Pattern Finder",      desc: "Spot patterns in fabric, wallpaper, or tiles: stripes, spots, zigzags. Create your own pattern with blocks or colours.", duration: "10 min" },
];

type SkillItem = { emoji: string; skill: string; task: string; tip: string };

const TODDLER_SKILLS: SkillItem[] = [
  { emoji: "🗣️", skill: "Communication",  task: "Name 5 everyday things together — cup, spoon, chair, ball, door.", tip: "Point to the object and say the word clearly. Pause and wait for them to repeat." },
  { emoji: "🎨", skill: "Creativity",     task: "Give crayons and blank paper — let them draw freely with zero instructions!", tip: "Don't direct the drawing. Ask 'Tell me about your picture!' not 'What is that?'" },
  { emoji: "🤲", skill: "Motor Skills",   task: "Practice transferring small pompoms or blocks from one bowl to another using fingers.", tip: "Fine motor movements like this build the hand strength needed for writing later." },
  { emoji: "🧠", skill: "Memory",        task: "Show 3 toy animals, cover them with a cloth, remove one — 'Which one is missing?'", tip: "Start with 2 objects and build up. Celebrate every correct guess enthusiastically!" },
  { emoji: "🤝", skill: "Social Skills", task: "Practice sharing a toy: take turns holding it for 30 seconds each with a timer.", tip: "Narrate it: 'Now it's your turn. Now it's my turn.' Predictability helps." },
  { emoji: "🌐", skill: "Language",      task: "Read one picture book and point to illustrations — 'What colour is the ball? What sound does the dog make?'", tip: "Toddlers learn language best through real conversation, not passive screen time." },
];

const PRESCHOOL_SKILLS: SkillItem[] = [
  { emoji: "🗣️", skill: "Communication",  task: "Have a 5-minute conversation at their level — ask about their favourite animal and really listen.", tip: "Use 'and then what happened?' to keep them talking. It builds narrative skills." },
  { emoji: "🎨", skill: "Creativity",     task: "Use playdough to make 3 different shapes together: a snake, a ball, and a flat pancake.", tip: "Resist the urge to show them 'the right way' — let their version be perfect." },
  { emoji: "✍️", skill: "Pre-Writing",   task: "Practice drawing straight lines, circles, and zigzags — these shapes form every letter of the alphabet.", tip: "Use dot-to-dot patterns to guide the pen movement without restriction." },
  { emoji: "🧠", skill: "Memory",        task: "Play 'I Went to the Shop' — add one item each turn and try to remember the whole list.", tip: "Rhyming lists are easier to remember — encourage them to make items rhyme!" },
  { emoji: "🔢", skill: "Numeracy",      task: "Count out 5 snack pieces before eating — then eat one at a time counting down: 5, 4, 3, 2, 1!", tip: "Real contexts (like food) make abstract numbers concrete and memorable." },
  { emoji: "💬", skill: "Story Skills",  task: "Ask them to tell you a 3-part story: 'Once there was a… then… and finally…'", tip: "Beginning-middle-end structure is the foundation of all writing. Start with 3 sentences." },
];

type ParentTask = { emoji: string; task: string; why: string; time: string };

const TODDLER_PARENT_TASKS: ParentTask[] = [
  { emoji: "👁️", task: "Give 10 minutes of focused floor time",      why: "Getting down to their level sends a powerful message: you are my priority right now.", time: "10 min" },
  { emoji: "🗣️", task: "Narrate your morning routine aloud",          why: "Running commentary (I'm making coffee now!) builds vocabulary at an amazing rate.", time: "15 min" },
  { emoji: "📵", task: "One hour of phone-free connection time",      why: "Toddlers notice when you're distracted. Presence is the greatest gift at this age.", time: "60 min" },
  { emoji: "🤗", task: "Give 5 genuine, specific compliments today",  why: "'You put the block in exactly the right spot!' beats 'Good job!' for building real confidence.", time: "All day" },
  { emoji: "🎵", task: "Sing one nursery rhyme together",             why: "Rhyme and rhythm build phonological awareness — the #1 predictor of early reading success.", time: "5 min" },
  { emoji: "🌳", task: "Go outside for 20 minutes of free exploration", why: "Nature play reduces cortisol (stress hormone) and boosts sensory development.", time: "20 min" },
  { emoji: "📚", task: "Read one picture book at bedtime",            why: "Children read to daily have a vocabulary 1.4 million words larger by age 5.", time: "15 min" },
  { emoji: "🧘", task: "Regulate yourself before correcting behaviour", why: "Toddlers co-regulate — your calm state literally calms their nervous system.", time: "30 sec pause" },
];

const PRESCHOOL_PARENT_TASKS: ParentTask[] = [
  { emoji: "❓", task: "Ask 3 open-ended questions and really listen", why: "Open questions (What did you love today?) build critical thinking and self-expression.", time: "10 min" },
  { emoji: "🤲", task: "Let them make a real choice today",           why: "What to wear or which snack builds autonomy and reduces power struggles significantly.", time: "5 min" },
  { emoji: "🎮", task: "Play their favourite game on their terms",    why: "Following their lead in play shows you value their ideas — this builds deep trust.", time: "15 min" },
  { emoji: "💪", task: "Catch them being good — say it out loud",     why: "'I noticed you waited patiently!' locks in the behaviour better than any punishment.", time: "All day" },
  { emoji: "🌙", task: "Create a calming bedtime ritual together",    why: "Consistent pre-sleep routines reduce night anxiety and improve sleep quality for both of you.", time: "20 min" },
  { emoji: "📖", task: "Read a book and stop for predictions",        why: "'What do you think will happen next?' builds inferential thinking — a crucial comprehension skill.", time: "15 min" },
  { emoji: "🎨", task: "Do one creative activity without showing them how", why: "Process-led creativity (vs. result-led) builds intrinsic motivation and resilience.", time: "20 min" },
  { emoji: "🔄", task: "Let them try something hard before helping", why: "The struggle is the skill — productive frustration builds problem-solving capacity.", time: "5 min" },
];

type FunActivity = { emoji: string; name: string; how: string; giggle: string };

const TODDLER_FUN: FunActivity[] = [
  { emoji: "🫧", name: "Bubble Chase",     how: "Blow bubbles and chase them together — pop every single one!", giggle: "Try popping them with your nose!" },
  { emoji: "🥣", name: "Sensory Bin",      how: "Fill a tub with dry rice and hide 5 small toys — dig and find them!", giggle: "Make a treasure map sound when they find one!" },
  { emoji: "🧻", name: "Tunnel Crawl",     how: "Make a tunnel from sofa cushions — crawl through together!", giggle: "Make monster roars from the other side!" },
  { emoji: "🥄", name: "Spoon Race",       how: "Carry a ball on a spoon from one end of the room to the other without dropping it!", giggle: "Start really slow and get faster each round!" },
  { emoji: "🎈", name: "Balloon Juggle",   how: "Tap a balloon in the air and see how long you can keep it off the floor!", giggle: "Count how many taps before it falls!" },
  { emoji: "🧼", name: "Foam Play",        how: "Spread shaving foam on a tray — let them draw patterns and shapes with their fingers.", giggle: "Write their name in the foam!" },
];

const PRESCHOOL_FUN: FunActivity[] = [
  { emoji: "🎤", name: "Mini DJ",          how: "Take turns being the DJ — each person picks a song and everyone has to dance to it!", giggle: "Invent a silly family dance move!" },
  { emoji: "🕵️", name: "Detective Hunt",  how: "Hide 5 objects around the room. Draw a simple map and let them find each one.", giggle: "Give hot/cold clues for the trickier ones!" },
  { emoji: "👨‍🍳", name: "Junior Chef",      how: "Make a simple snack together — arrange fruit into a smiley face on a plate.", giggle: "Let them give it a fancy restaurant name!" },
  { emoji: "🌋", name: "Volcano!",         how: "Mix baking soda in a cup and pour vinegar — watch it bubble and fizz together!", giggle: "Make dramatic explosion sound effects!" },
  { emoji: "🎭", name: "Puppet Show",      how: "Make sock puppets and put on a 2-minute show for a stuffed animal audience.", giggle: "Make the audience clap and cheer after!" },
  { emoji: "🗺️", name: "Floor Map",        how: "Use masking tape to make roads on the floor. Drive toy cars along the city you built together.", giggle: "Add a 'traffic jam' and honk!" },
];

// ─────────────────────────────────────────────────────────────
// STORIES
// ─────────────────────────────────────────────────────────────
type Story = { emoji: string; title: string; story: string; moral: string };

const TODDLER_STORIES: Story[] = [
  { emoji: "🐢", title: "The Slow Turtle Wins",    story: "A rabbit laughed at a slow turtle. They had a race. The rabbit ran fast, then stopped to nap. The turtle walked slowly but never stopped — and reached the finish line first! The rabbit woke up and couldn't believe it.",       moral: "Keep going, even if you're slow. Never give up!" },
  { emoji: "🦁", title: "The Kind Lion",            story: "A big lion found a tiny mouse caught in a net. The lion used his claws to cut the ropes and set the mouse free. Years later, the lion got caught in a hunter's trap. The tiny mouse chewed through the ropes and saved him!",       moral: "Even small people can help big ones. Always be kind." },
  { emoji: "🌱", title: "The Little Seed",          story: "A small seed fell in the dirt. It was dark and cold underground. 'I want to come out!' cried the seed. But it waited and waited. Then one morning, sunshine and water helped it push up through the soil. It grew into a beautiful flower!",  moral: "Be patient. Good things take time to grow." },
  { emoji: "🐦", title: "Two Birds Share",          story: "Two birds lived in one tree. They argued over who got the best branch. A wise old owl said, 'Share! Take turns on the sunny branch.' They tried it — and became the best of friends!",  moral: "Sharing makes friendships grow." },
  { emoji: "🌙", title: "The Moon's Gift",          story: "A little girl couldn't sleep. She looked out her window and saw the moon shining. The moon whispered, 'I'm here, watching over you.' The girl smiled, snuggled under her blanket, and drifted off to a beautiful dream.",  moral: "You are always loved and never alone." },
];

const PRESCHOOL_STORIES: Story[] = [
  { emoji: "🦉", title: "The Wise Owl's Test",     story: "The forest animals argued about who was the cleverest. The old owl gave them all a test: 'Fill this room using only one thing.' The rabbit brought carrots — not enough. The bear brought honey — too sticky! Then a tiny firefly said: 'I'll fill it with light!' and everyone could suddenly see perfectly.",  moral: "True cleverness is using what you have in a smart way." },
  { emoji: "🌊", title: "The River That Shared",   story: "A wide river shared its water with farmers, fish, birds, and thirsty animals. One dry summer, people wanted to dam it up. But the river said, 'If you block me, nothing will grow.' They listened. They shared carefully and everyone had enough.",  moral: "When we share resources, everyone thrives." },
  { emoji: "⭐", title: "The Star Who Was Afraid", story: "A little star was afraid to shine because the other stars were brighter. 'What if no one looks at me?' she worried. A girl below pointed up: 'Look at that special little star!' The girl had been searching for exactly that tiny, perfect star to make her wish upon.", moral: "Your uniqueness is exactly what the world is looking for." },
  { emoji: "🎨", title: "Maya's Messy Masterpiece", story: "Maya spilled purple paint by accident. She cried — her picture was ruined! But then she looked again. The purple splash looked like a mountain range! She added trees and a sunset. Her 'mistake' became the best painting in the class.", moral: "Mistakes often become the best parts of your story." },
  { emoji: "🌍", title: "The Village Garden",       story: "A village had one garden but five families who all wanted to grow different things. They argued until a child said, 'Why not plant everything in different spots?' They divided the garden — tomatoes here, flowers there, beans over there. By summer it was the most beautiful garden anyone had ever seen.", moral: "Different ideas together make something greater than any one alone." },
  { emoji: "🦋", title: "The Patient Caterpillar", story: "A caterpillar wrapped itself in a cocoon. Her friends flew and played while she waited. 'Don't you want to come out?' they called. 'Not yet,' she said. She waited until she was ready — and when she finally emerged, she could fly higher than any of them.",  moral: "Trust your own timing. Everything good comes to those who wait." },
];

// ─────────────────────────────────────────────────────────────
// DoneExplosion — gamified feedback overlay
// ─────────────────────────────────────────────────────────────
function DoneExplosion({ visible, message }: { visible: boolean; message: string }) {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 rounded-3xl flex items-center justify-center bg-white/80 dark:bg-slate-900/70 backdrop-blur-sm z-10 pointer-events-none animate-in fade-in duration-200">
      <div className="text-center animate-in zoom-in-75 duration-300">
        <div className="text-5xl mb-2 animate-bounce">⭐</div>
        <p className="font-quicksand text-xl font-bold text-yellow-600">{message}</p>
        <div className="flex justify-center gap-1 mt-2">
          {["✨", "🌟", "💫"].map((s, i) => (
            <span key={i} className="text-xl animate-bounce" style={{ animationDelay: `${i * 0.1}s` }}>{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const DONE_MESSAGES = [
  "Great job! 🎉", "You did it! ⭐", "Amazing! 🌟", "Superstar! 💫", "Brilliant! 🏆", "Wonderful! 🎊",
];

// ─────────────────────────────────────────────────────────────
// InteractiveCard — single card with Done / Next
// ─────────────────────────────────────────────────────────────
interface InteractiveCardProps {
  emoji: string;
  sectionLabel: string;
  title: string;
  desc: string;
  meta?: string;
  extra?: React.ReactNode;
  accent: { bg: string; border: string; title: string; badge: string; badgeBg: string };
  onDone: () => void;
  onNext: () => void;
  doneCount: number;
  totalCount: number;
}

function InteractiveCard({ emoji, sectionLabel, title, desc, meta, extra, accent, onDone, onNext, doneCount, totalCount }: InteractiveCardProps) {
  const [showExplosion, setShowExplosion] = useState(false);
  const [doneMsg] = useState(() => DONE_MESSAGES[Math.floor(Math.random() * DONE_MESSAGES.length)]);

  const handleDone = () => {
    setShowExplosion(true);
    setTimeout(() => {
      setShowExplosion(false);
      onDone();
    }, 1100);
  };

  return (
    <Card className={`rounded-3xl border-2 ${accent.border} ${accent.bg} shadow-none relative overflow-hidden`}>
      <DoneExplosion visible={showExplosion} message={doneMsg} />
      <CardContent className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{emoji}</span>
            <span className={`text-sm font-bold ${accent.title}`}>{sectionLabel}</span>
          </div>
          {doneCount > 0 && (
            <Badge className={`text-xs font-bold ${accent.badgeBg} ${accent.badge} border-0`}>
              ✅ {doneCount} done today
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="bg-white/70 dark:bg-white/5 rounded-2xl p-4 border border-white dark:border-white/10 mb-4 min-h-[80px]">
          <p className={`font-quicksand text-base font-bold ${accent.title} dark:text-white mb-1`}>{title}</p>
          <p className="text-sm text-foreground/80 dark:text-white/85 leading-relaxed">{desc}</p>
          {meta && <p className={`text-xs mt-2 font-medium ${accent.badge} dark:text-white/70`}>{meta}</p>}
          {extra}
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleDone}
            disabled={showExplosion}
            className="flex-1 rounded-full h-10 font-bold bg-green-500 hover:bg-green-600 text-white border-0 text-sm shadow-sm"
          >
            <CheckCircle2 className="h-4 w-4 mr-1.5" /> Done!
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onNext}
            className={`rounded-full h-10 px-4 font-bold border-2 ${accent.border} ${accent.title} bg-white/80 hover:bg-white text-sm`}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// StoryPlayer — with Read Aloud + Next Story
// ─────────────────────────────────────────────────────────────
function StoryPlayer({ stories, childName, accentColor }: { stories: Story[]; childName: string; accentColor: string }) {
  const { idx, next } = useRotatingIndex(`amynest_story_${accentColor}`, stories);
  const { speak, stop, speaking, loading } = useAmyVoice();

  const story = stories[idx];

  const handleSpeak = () => {
    if (speaking || loading) { stop(); return; }
    speak(`${story.title}. ${story.story}. The moral is: ${story.moral}`);
  };

  const handleNext = () => {
    stop();
    next();
  };

  return (
    <Card className="rounded-3xl border-2 border-amber-200 dark:border-amber-400/30 bg-gradient-to-br from-amber-50 dark:from-amber-500/15 to-orange-50 dark:to-orange-500/15 shadow-none">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">📖</span>
          <div className="flex-1">
            <h3 className="font-quicksand text-base font-bold text-amber-900 dark:text-amber-100">Story Time for {childName}</h3>
            <p className="text-xs text-amber-700 dark:text-amber-200">Short moral stories · {idx + 1} of {stories.length}</p>
          </div>
        </div>

        {/* Story card */}
        <div className="bg-white dark:bg-white/5 rounded-2xl p-4 border border-amber-100 dark:border-amber-400/30 mb-3">
          <div className="flex items-start justify-between mb-3 gap-2">
            <h4 className="font-quicksand font-bold text-lg text-amber-900 dark:text-amber-100">
              {story.emoji} {story.title}
            </h4>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSpeak}
              className={`shrink-0 rounded-full h-8 px-3 text-xs font-bold border-amber-300 transition-all ${(speaking || loading) ? "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200" : "text-amber-700 dark:text-amber-200 hover:bg-amber-50 dark:bg-amber-500/15"}`}
            >
              {(speaking || loading)
                ? <><VolumeX className="h-3 w-3 mr-1" />{loading ? "…" : "Stop"}</>
                : <><Volume2 className="h-3 w-3 mr-1" />Read Aloud</>}
            </Button>
          </div>
          <p className="text-sm text-foreground/80 leading-relaxed italic mb-4">
            "{story.story}"
          </p>
          <div className="bg-amber-50 dark:bg-amber-500/15 rounded-xl p-3 border border-amber-200 dark:border-amber-400/30">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-200 mb-1">💡 Moral</p>
            <p className="text-sm text-amber-900 dark:text-amber-100 font-semibold">{story.moral}</p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleNext}
            className="flex-1 rounded-full h-9 border-amber-300 text-amber-800 dark:text-amber-200 font-bold text-sm hover:bg-amber-100 dark:bg-amber-500/20"
          >
            <SkipForward className="h-4 w-4 mr-1.5" /> Next Story
          </Button>
        </div>

        <p className="text-[10px] text-amber-600 mt-3 text-center">
          📚 Read this story to {childName} at bedtime for a meaningful connection moment
        </p>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// ToddlerPreschoolMode — MAIN EXPORT
// ─────────────────────────────────────────────────────────────
export type ToddlerShowOnly = "activity" | "skill" | "task" | "fun" | "story";

interface ToddlerPreschoolModeProps {
  ageGroup: "toddler" | "preschool";
  childName: string;
  ageYears: number;
  ageMonths: number;
  showOnly?: ToddlerShowOnly | null;
}

export function ToddlerPreschoolMode({ ageGroup, childName, ageYears, ageMonths, showOnly }: ToddlerPreschoolModeProps) {
  const isToddler = ageGroup === "toddler";
  const label = isToddler ? "Toddler Mode" : "Preschool Mode";
  const headerEmoji = isToddler ? "🍼" : "🎒";
  const ageLabel = isToddler ? "1–3 Years" : "3–5 Years";

  const activities = isToddler ? TODDLER_ACTIVITIES : PRESCHOOL_ACTIVITIES;
  const skills = isToddler ? TODDLER_SKILLS : PRESCHOOL_SKILLS;
  const parentTasks = isToddler ? TODDLER_PARENT_TASKS : PRESCHOOL_PARENT_TASKS;
  const funList = isToddler ? TODDLER_FUN : PRESCHOOL_FUN;
  const stories = isToddler ? TODDLER_STORIES : PRESCHOOL_STORIES;

  const ns = `amynest_${ageGroup}`;

  // Rotating indices — persist per category per day
  const { idx: actIdx, next: nextAct } = useRotatingIndex(`${ns}_act`, activities);
  const { idx: skillIdx, next: nextSkill } = useRotatingIndex(`${ns}_skill`, skills);
  const { idx: taskIdx, next: nextTask } = useRotatingIndex(`${ns}_task`, parentTasks);
  const { idx: funIdx, next: nextFun } = useRotatingIndex(`${ns}_fun`, funList);

  // Done counts (reset each day)
  const [doneCounts, setDoneCounts] = useState<Record<string, number>>(() => {
    try {
      const saved = localStorage.getItem(`${ns}_done_counts`);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      if (parsed.date !== getTodaySeed()) return {};
      return parsed.counts;
    } catch { return {}; }
  });

  const incrementDone = (key: string) => {
    setDoneCounts((prev) => {
      const next = { ...prev, [key]: (prev[key] ?? 0) + 1 };
      try { localStorage.setItem(`${ns}_done_counts`, JSON.stringify({ date: getTodaySeed(), counts: next })); } catch {}
      return next;
    });
  };

  const totalDone = Object.values(doneCounts).reduce((a, b) => a + b, 0);

  const accentActivity  = { bg: "bg-blue-50 dark:bg-blue-500/15",   border: "border-blue-200 dark:border-blue-400/30",   title: "text-blue-900 dark:text-blue-100",   badge: "text-blue-700 dark:text-blue-200",   badgeBg: "bg-blue-100 dark:bg-blue-500/20" };
  const accentSkill     = { bg: "bg-violet-50 dark:bg-violet-500/15", border: "border-violet-200 dark:border-violet-400/30", title: "text-violet-900 dark:text-violet-100", badge: "text-violet-700 dark:text-violet-200", badgeBg: "bg-violet-100 dark:bg-violet-500/20" };
  const accentTask      = { bg: "bg-rose-50 dark:bg-rose-500/15",   border: "border-rose-200 dark:border-rose-400/30",   title: "text-rose-900 dark:text-rose-100",   badge: "text-rose-700 dark:text-rose-200",   badgeBg: "bg-rose-100 dark:bg-rose-500/20" };
  const accentFun       = { bg: "bg-green-50 dark:bg-green-500/15",  border: "border-green-200 dark:border-green-400/30",  title: "text-green-900 dark:text-green-100",  badge: "text-green-700 dark:text-green-200",  badgeBg: "bg-green-100 dark:bg-green-500/20" };

  const act   = activities[actIdx];
  const skill = skills[skillIdx];
  const task  = parentTasks[taskIdx];
  const fun   = funList[funIdx];

  const show = (section: ToddlerShowOnly) => !showOnly || showOnly === section;

  return (
    <div className="space-y-5">

      {/* ── Hero Banner — hidden in focused view ── */}
      {!showOnly && <div className={`rounded-3xl border-2 p-5 ${
        isToddler
          ? "bg-gradient-to-br from-purple-50 dark:from-purple-500/15 via-pink-50 dark:via-pink-500/15 to-blue-50 dark:to-blue-500/15 border-purple-200 dark:border-purple-400/30"
          : "bg-gradient-to-br from-blue-50 dark:from-blue-500/15 via-green-50 dark:via-green-500/15 to-teal-50 dark:to-teal-500/15 border-blue-200 dark:border-blue-400/30"
      }`}>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-5xl">{headerEmoji}</div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <Badge className={`font-bold text-xs ${isToddler ? "bg-purple-100 dark:bg-purple-500/20 text-purple-800 dark:text-purple-200 border-purple-300" : "bg-blue-100 dark:bg-blue-500/20 text-blue-800 dark:text-blue-200 border-blue-300"}`}>
                {label}
              </Badge>
              <Badge variant="outline" className="text-xs font-medium">{ageLabel}</Badge>
              {totalDone > 0 && (
                <Badge className="bg-yellow-100 dark:bg-yellow-500/20 text-yellow-800 dark:text-yellow-200 border-yellow-300 text-xs font-bold">
                  ⭐ {totalDone} done today
                </Badge>
              )}
            </div>
            <h2 className="font-quicksand text-xl font-bold text-foreground">Today for {childName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              {ageYears > 0 ? `${ageYears} yr ${ageMonths > 0 ? `${ageMonths} mo` : ""}` : `${ageMonths} months`} · Activities rotate daily
            </p>
          </div>
        </div>

        {/* Star tracker */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-muted-foreground">Today's Stars:</span>
          {Array.from({ length: Math.max(5, totalDone + 2) }, (_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 transition-all duration-300 ${i < totalDone ? "text-yellow-500 fill-yellow-500" : "text-gray-200 fill-gray-200"}`}
            />
          ))}
          {totalDone >= 4 && (
            <span className="text-xs font-bold text-yellow-600 ml-1">🎊 Super Parent Day!</span>
          )}
        </div>
      </div>}

      {/* ── 🎯 Today Activity ── */}
      {show("activity") && <InteractiveCard
        emoji="🎯"
        sectionLabel="Today's Activity"
        title={act.title}
        desc={act.desc}
        meta={`⏱ ${act.duration}`}
        accent={accentActivity}
        onDone={() => { nextAct(); incrementDone("act"); }}
        onNext={nextAct}
        doneCount={doneCounts["act"] ?? 0}
        totalCount={activities.length}
      />}

      {/* ── 🧠 Skill Builder ── */}
      {show("skill") && <InteractiveCard
        emoji="🧠"
        sectionLabel="Skill Builder"
        title={`Today's Focus: ${skill.skill}`}
        desc={skill.task}
        meta={`💡 ${skill.tip}`}
        accent={accentSkill}
        onDone={() => { nextSkill(); incrementDone("skill"); }}
        onNext={nextSkill}
        doneCount={doneCounts["skill"] ?? 0}
        totalCount={skills.length}
      />}

      {/* ── ❤️ Parent Task ── */}
      {show("task") && <InteractiveCard
        emoji="❤️"
        sectionLabel="Your Parent Task"
        title={task.task}
        desc={task.why}
        meta={`⏱ ${task.time}`}
        accent={accentTask}
        onDone={() => { nextTask(); incrementDone("task"); }}
        onNext={nextTask}
        doneCount={doneCounts["task"] ?? 0}
        totalCount={parentTasks.length}
      />}

      {/* ── 🎮 Fun Activity ── */}
      {show("fun") && <InteractiveCard
        emoji="🎮"
        sectionLabel="Fun Activity"
        title={fun.name}
        desc={fun.how}
        meta={`😄 ${fun.giggle}`}
        accent={accentFun}
        onDone={() => { nextFun(); incrementDone("fun"); }}
        onNext={nextFun}
        doneCount={doneCounts["fun"] ?? 0}
        totalCount={funList.length}
      />}

      {/* ── 📖 Story Time ── */}
      {show("story") && <StoryPlayer
        stories={stories}
        childName={childName}
        accentColor={ageGroup}
      />}

      {/* ── 🌟 All Done Banner — only in full view ── */}
      {!showOnly && totalDone >= 4 && (
        <Card className="rounded-3xl border-2 border-yellow-300 bg-gradient-to-br from-yellow-50 dark:from-yellow-500/15 to-amber-50 dark:to-amber-500/15 shadow-none">
          <CardContent className="p-5 text-center">
            <div className="text-4xl mb-2">🏆</div>
            <h3 className="font-quicksand text-lg font-bold text-yellow-800 dark:text-yellow-200 mb-1">You're a Super Parent Today!</h3>
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              {childName} is lucky to have you showing up this way. Every one of these moments shapes who they become. 💛
            </p>
            <div className="flex justify-center gap-2 mt-3 flex-wrap">
              {["🌟", "⭐", "💫", "✨", "🌟"].map((s, i) => (
                <span key={i} className="text-xl animate-bounce" style={{ animationDelay: `${i * 0.15}s` }}>{s}</span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
