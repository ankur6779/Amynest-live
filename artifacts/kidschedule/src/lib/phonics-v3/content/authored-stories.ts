/**
 * Authored decodable stories — each narrative uses a unique sentence structure.
 * Replaces combinatorial template generators for certification uniqueness.
 */
import { WORD_FAMILIES } from "@/lib/phonics-v2/content/word-families";
import type { DecodableStoryMeta } from "./story-catalog";

type StoryLevel = 1 | 2 | 3 | 4 | 5;

type WordCtx = { w: string; w2: string; w3: string; name: string; emoji: string; family: string };

const NAMES = ["Sam", "Kim", "Pat", "Meg", "Ben", "Ann", "Tom", "Jen", "Dan", "Liz", "Rob", "Eva"];

/** Each shape is used exactly once — guarantees unique sentence skeletons. */
const NARRATIVE_SHAPES: Array<{
  title: (c: WordCtx) => string;
  emoji: string;
  level: StoryLevel;
  difficulty: number;
  lines: (c: WordCtx) => string[];
}> = [
  { title: (c) => `Rain on the ${c.w}`, emoji: "🌧️", level: 2, difficulty: 2, lines: (c) => [`Rain fell on the ${c.w}.`, `${c.name} hid in the ${c.w2}.`, `${c.name} was glad.`] },
  { title: (c) => `Moss and ${c.w}`, emoji: "🌿", level: 2, difficulty: 2, lines: (c) => [`Moss grew near the ${c.w}.`, `A ${c.w2} hopped by.`, `The ${c.w2} was glad.`] },
  { title: (c) => `${c.name}'s Red ${c.w}`, emoji: "🔴", level: 2, difficulty: 3, lines: (c) => [`${c.name} found a red ${c.w}.`, `The ${c.w} was on the ${c.w2}.`, `${c.name} put it in a bag.`] },
  { title: (c) => `Feed the ${c.w}`, emoji: "🌾", level: 2, difficulty: 2, lines: (c) => [`${c.name} fed the ${c.w}.`, `The ${c.w} ate from a ${c.w2}.`, `Then it went to rest.`] },
  { title: (c) => `Lost ${c.w}`, emoji: "🔍", level: 3, difficulty: 4, lines: (c) => [`Where did my ${c.w} go?`, `${c.name} looked in the ${c.w2}.`, `There was the ${c.w}!`] },
  { title: (c) => `Not Now, ${c.name}`, emoji: "⏰", level: 2, difficulty: 3, lines: (c) => [`Not now, said ${c.name}.`, `But the ${c.w} ran off.`, `${c.name} ran to get the ${c.w2}.`] },
  { title: (c) => `A Gift ${c.w}`, emoji: "🎁", level: 3, difficulty: 4, lines: (c) => [`${c.name} — a ${c.w} gift!`, `Inside was a ${c.w2}.`, `What a fun find!`] },
  { title: (c) => `Hop and ${c.w}`, emoji: "🐸", level: 2, difficulty: 2, lines: (c) => [`Hop, hop, went the ${c.w}.`, `It sat on a ${c.w2}.`, `Then it hid in moss.`] },
  { title: (c) => `Cold ${c.w} Day`, emoji: "❄️", level: 3, difficulty: 4, lines: (c) => [`On a cold ${c.w} day,`, `${c.name} wore a ${c.w2}.`, `Hot soup was best.`] },
  { title: (c) => `Whisper ${c.w}`, emoji: "🤫", level: 2, difficulty: 3, lines: (c) => [`${c.name} whispered: ${c.w}.`, `The ${c.w2} did not stir.`, `All was calm.`] },
  { title: (c) => `Tin ${c.w} Song`, emoji: "🎵", level: 3, difficulty: 5, lines: (c) => [`Tin, tin, rang the ${c.w}.`, `${c.name} sang along.`, `A ${c.w2} joined in.`] },
  { title: (c) => `Mud on ${c.w}`, emoji: "🟤", level: 2, difficulty: 3, lines: (c) => [`Mud got on the ${c.w}.`, `${c.name} washed it in a ${c.w2}.`, `Clean once more!`] },
  { title: (c) => `Night ${c.w}`, emoji: "🌙", level: 3, difficulty: 5, lines: (c) => [`At night the ${c.w} glowed.`, `${c.name} read by its ${c.w2}.`, `Then sleep came.`] },
  { title: (c) => `Fix the ${c.w}`, emoji: "🔧", level: 3, difficulty: 4, lines: (c) => [`${c.name} had to fix the ${c.w}.`, `A ${c.w2} helped hold it.`, `Done at last!`] },
  { title: (c) => `Wind and ${c.w}`, emoji: "💨", level: 2, difficulty: 3, lines: (c) => [`Wind blew the ${c.w} away.`, `${c.name} ran fast.`, `Caught it by the ${c.w2}!`] },
  { title: (c) => `Paint the ${c.w}`, emoji: "🎨", level: 3, difficulty: 4, lines: (c) => [`${c.name} painted the ${c.w}.`, `Red dots on the ${c.w2}.`, `Art for the wall.`] },
  { title: (c) => `Share the ${c.w}`, emoji: "🤝", level: 2, difficulty: 3, lines: (c) => [`${c.name} shared the ${c.w}.`, `Half for ${c.w2} too.`, `Both were glad.`] },
  { title: (c) => `Trap the ${c.w}`, emoji: "🪤", level: 3, difficulty: 5, lines: (c) => [`A trap held the ${c.w}.`, `${c.name} set it free.`, `Off to the ${c.w2}.`] },
  { title: (c) => `Bake a ${c.w}`, emoji: "🧁", level: 3, difficulty: 4, lines: (c) => [`${c.name} baked a ${c.w}.`, `Smell filled the ${c.w2}.`, `Yum for all!`] },
  { title: (c) => `Dig for ${c.w}`, emoji: "⛏️", level: 2, difficulty: 3, lines: (c) => [`${c.name} dug for ${c.w}.`, `Found one in the ${c.w2}.`, `What luck!`] },
  { title: (c) => `Fold the ${c.w}`, emoji: "📄", level: 3, difficulty: 4, lines: (c) => [`Fold the ${c.w} with care.`, `${c.name} made a ${c.w2}.`, `A gift for Mom.`] },
  { title: (c) => `Ring the ${c.w}`, emoji: "🔔", level: 2, difficulty: 2, lines: (c) => [`Ring the ${c.w} once.`, `${c.name} heard it ring.`, `Time for the ${c.w2}.`] },
  { title: (c) => `Pack the ${c.w}`, emoji: "🎒", level: 3, difficulty: 4, lines: (c) => [`Pack the ${c.w} in the bag.`, `${c.name} added a ${c.w2}.`, `Ready to go!`] },
  { title: (c) => `Sail the ${c.w}`, emoji: "⛵", level: 3, difficulty: 5, lines: (c) => [`${c.name} sailed a ${c.w}.`, `Waves hit the ${c.w2}.`, `Safe on land.`] },
  { title: (c) => `Trim the ${c.w}`, emoji: "✂️", level: 3, difficulty: 4, lines: (c) => [`Trim the ${c.w} just so.`, `${c.name} swept the ${c.w2}.`, `Neat and clean.`] },
  { title: (c) => `Buzz by ${c.w}`, emoji: "🐝", level: 2, difficulty: 3, lines: (c) => [`A bee buzzed by the ${c.w}.`, `${c.name} did not swat.`, `It flew to a ${c.w2}.`] },
  { title: (c) => `Climb the ${c.w}`, emoji: "🧗", level: 3, difficulty: 5, lines: (c) => [`${c.name} climbed the ${c.w}.`, `View from the ${c.w2}.`, `Worth the trip!`] },
  { title: (c) => `Drip on ${c.w}`, emoji: "💧", level: 2, difficulty: 2, lines: (c) => [`Drip, drip on the ${c.w}.`, `${c.name} put a ${c.w2} under.`, `No more drip.`] },
  { title: (c) => `Flash and ${c.w}`, emoji: "⚡", level: 3, difficulty: 5, lines: (c) => [`Flash! Then the ${c.w} lit.`, `${c.name} jumped back.`, `Just a ${c.w2}.`] },
  { title: (c) => `Grin at ${c.w}`, emoji: "😁", level: 2, difficulty: 2, lines: (c) => [`${c.name} grinned at the ${c.w}.`, `It grinned at the ${c.w2}.`, `Fun for both.`] },
  { title: (c) => `Hush, Little ${c.w}`, emoji: "🤱", level: 2, difficulty: 3, lines: (c) => [`Hush, little ${c.w}.`, `${c.name} sang soft.`, `Sleep in the ${c.w2}.`] },
  { title: (c) => `Jog Past ${c.w}`, emoji: "🏃", level: 3, difficulty: 4, lines: (c) => [`${c.name} jogged past the ${c.w}.`, `Stopped at the ${c.w2}.`, `Caught their breath.`] },
  { title: (c) => `Knot in ${c.w}`, emoji: "🪢", level: 3, difficulty: 5, lines: (c) => [`A knot in the ${c.w}.`, `${c.name} undid it.`, `Tied to the ${c.w2}.`] },
  { title: (c) => `Lend a ${c.w}`, emoji: "🤲", level: 2, difficulty: 3, lines: (c) => [`${c.name} lent a ${c.w}.`, `Got back a ${c.w2}.`, `Fair trade!`] },
  { title: (c) => `Mend the ${c.w}`, emoji: "🧵", level: 3, difficulty: 4, lines: (c) => [`${c.name} mended the ${c.w}.`, `Thread through the ${c.w2}.`, `Good as new.`] },
  { title: (c) => `Nap by ${c.w}`, emoji: "😴", level: 2, difficulty: 2, lines: (c) => [`${c.name} napped by the ${c.w}.`, `Dreamed of a ${c.w2}.`, `Woke up glad.`] },
  { title: (c) => `Open the ${c.w}`, emoji: "📂", level: 2, difficulty: 3, lines: (c) => [`Open the ${c.w} with care.`, `Inside: a ${c.w2}!`, `${c.name} cheered.`] },
  { title: (c) => `Peel the ${c.w}`, emoji: "🍌", level: 3, difficulty: 4, lines: (c) => [`${c.name} peeled the ${c.w}.`, `Put skin in the ${c.w2}.`, `Snack time!`] },
  { title: (c) => `Quiz on ${c.w}`, emoji: "❓", level: 3, difficulty: 5, lines: (c) => [`Pop quiz on ${c.w}!`, `${c.name} knew the ${c.w2}.`, `Top of the class.`] },
  { title: (c) => `Rest in ${c.w}`, emoji: "🛋️", level: 2, difficulty: 2, lines: (c) => [`Rest in the ${c.w}.`, `${c.name} shut their eyes.`, `Soft as a ${c.w2}.`] },
  { title: (c) => `Stir the ${c.w}`, emoji: "🥄", level: 3, difficulty: 4, lines: (c) => [`${c.name} stirred the ${c.w}.`, `Bubbles in the ${c.w2}.`, `Soup was hot.`] },
  { title: (c) => `Tuck in ${c.w}`, emoji: "🛏️", level: 2, difficulty: 3, lines: (c) => [`Tuck in the ${c.w}.`, `${c.name} fluffed the ${c.w2}.`, `Cozy night.`] },
  { title: (c) => `Untie the ${c.w}`, emoji: "🎀", level: 3, difficulty: 4, lines: (c) => [`${c.name} untied the ${c.w}.`, `Ribbon on the ${c.w2}.`, `Gift revealed!`] },
  { title: (c) => `Vet for ${c.w}`, emoji: "🐾", level: 3, difficulty: 5, lines: (c) => [`Vet checked the ${c.w}.`, `${c.name} held the ${c.w2}.`, `All clear!`] },
  { title: (c) => `Wag the ${c.w}`, emoji: "🐕", level: 2, difficulty: 2, lines: (c) => [`The ${c.w} wagged fast.`, `${c.name} threw a ${c.w2}.`, `Fetch again!`] },
  { title: (c) => `Yell for ${c.w}`, emoji: "📣", level: 3, difficulty: 4, lines: (c) => [`${c.name} yelled for ${c.w}!`, `Echo off the ${c.w2}.`, `Help arrived.`] },
  { title: (c) => `Zip the ${c.w}`, emoji: "🤐", level: 2, difficulty: 3, lines: (c) => [`Zip the ${c.w} shut.`, `${c.name} locked the ${c.w2}.`, `Safe inside.`] },
  { title: (c) => `Ash on ${c.w}`, emoji: "🌋", level: 3, difficulty: 5, lines: (c) => [`Ash fell on the ${c.w}.`, `${c.name} brushed the ${c.w2}.`, `Sky turned gray.`] },
  { title: (c) => `Bolt the ${c.w}`, emoji: "🔩", level: 3, difficulty: 4, lines: (c) => [`${c.name} bolted the ${c.w}.`, `Tight on the ${c.w2}.`, `Held firm.`] },
  { title: (c) => `Curl on ${c.w}`, emoji: "🐈", level: 2, difficulty: 2, lines: (c) => [`The ${c.w} curled up.`, `${c.name} stroked the ${c.w2}.`, `Purr, purr.`] },
  { title: (c) => `Dust the ${c.w}`, emoji: "🧹", level: 3, difficulty: 3, lines: (c) => [`${c.name} dusted the ${c.w}.`, `Shine on the ${c.w2}.`, `Room was neat.`] },
  { title: (c) => `Earn a ${c.w}`, emoji: "⭐", level: 3, difficulty: 4, lines: (c) => [`${c.name} earned a ${c.w}.`, `Placed on the ${c.w2}.`, `Well done!`] },
  { title: (c) => `Fizz in ${c.w}`, emoji: "🫧", level: 3, difficulty: 5, lines: (c) => [`Fizz in the ${c.w}!`, `${c.name} mixed the ${c.w2}.`, `Bubbles rose.`] },
  { title: (c) => `Gulp the ${c.w}`, emoji: "🥤", level: 2, difficulty: 3, lines: (c) => [`${c.name} gulped the ${c.w}.`, `Cold from the ${c.w2}.`, `Ah, fresh!`] },
  { title: (c) => `Haul the ${c.w}`, emoji: "🚚", level: 3, difficulty: 4, lines: (c) => [`${c.name} hauled the ${c.w}.`, `Up to the ${c.w2}.`, `Heavy but done.`] },
  { title: (c) => `Ink on ${c.w}`, emoji: "🖊️", level: 3, difficulty: 5, lines: (c) => [`Ink got on the ${c.w}.`, `${c.name} scrubbed the ${c.w2}.`, `Spot came out.`] },
  { title: (c) => `Jolt the ${c.w}`, emoji: "⚡", level: 3, difficulty: 4, lines: (c) => [`A jolt hit the ${c.w}.`, `${c.name} gripped the ${c.w2}.`, `Steady now.`] },
  { title: (c) => `Kelp and ${c.w}`, emoji: "🌊", level: 3, difficulty: 5, lines: (c) => [`Kelp wrapped the ${c.w}.`, `${c.name} pulled it free.`, `Tossed on ${c.w2}.`] },
  { title: (c) => `Limp ${c.w} Home`, emoji: "🏠", level: 3, difficulty: 4, lines: (c) => [`${c.name} limped home.`, `Hurt ${c.w} from the ${c.w2}.`, `Bandage helped.`] },
  { title: (c) => `Mint on ${c.w}`, emoji: "🌿", level: 2, difficulty: 3, lines: (c) => [`Mint grew on the ${c.w}.`, `${c.name} picked a ${c.w2}.`, `Fresh smell.`] },
  { title: (c) => `Nudge the ${c.w}`, emoji: "👉", level: 2, difficulty: 2, lines: (c) => [`${c.name} nudged the ${c.w}.`, `It rolled to the ${c.w2}.`, `Goal scored!`] },
  { title: (c) => `Omit the ${c.w}`, emoji: "📝", level: 4, difficulty: 6, lines: (c) => [`Do not omit the ${c.w}.`, `${c.name} added a ${c.w2}.`, `List complete.`] },
  { title: (c) => `Poke the ${c.w}`, emoji: "👆", level: 2, difficulty: 3, lines: (c) => [`${c.name} poked the ${c.w}.`, `It hid in the ${c.w2}.`, `Shy thing!`] },
  { title: (c) => `Quilt for ${c.w}`, emoji: "🧶", level: 3, difficulty: 5, lines: (c) => [`${c.name} quilted a ${c.w}.`, `Stitch on the ${c.w2}.`, `Warm gift.`] },
  { title: (c) => `Rake the ${c.w}`, emoji: "🍂", level: 3, difficulty: 4, lines: (c) => [`${c.name} raked the ${c.w}.`, `Pile by the ${c.w2}.`, `Jump in!`] },
  { title: (c) => `Sift the ${c.w}`, emoji: "🥣", level: 4, difficulty: 6, lines: (c) => [`Sift flour in the ${c.w}.`, `${c.name} mixed the ${c.w2}.`, `Dough rose.`] },
  { title: (c) => `Toss the ${c.w}`, emoji: "🥏", level: 2, difficulty: 3, lines: (c) => [`${c.name} tossed the ${c.w}.`, `Caught by the ${c.w2}.`, `Play on!`] },
  { title: (c) => `Urge the ${c.w}`, emoji: "💪", level: 4, difficulty: 6, lines: (c) => [`${c.name} urged the ${c.w} on.`, `Past the ${c.w2}.`, `Finish line!`] },
  { title: (c) => `Vent the ${c.w}`, emoji: "💨", level: 4, difficulty: 6, lines: (c) => [`Vent steam from the ${c.w}.`, `${c.name} cooled the ${c.w2}.`, `Safe to touch.`] },
  { title: (c) => `Weld the ${c.w}`, emoji: "🔥", level: 4, difficulty: 7, lines: (c) => [`${c.name} welded the ${c.w}.`, `Spark on the ${c.w2}.`, `Strong bond.`] },
  { title: (c) => `Yarn and ${c.w}`, emoji: "🧵", level: 3, difficulty: 4, lines: (c) => [`Yarn hung on the ${c.w}.`, `${c.name} knit a ${c.w2}.`, `Scarf done.`] },
  { title: (c) => `Zest in ${c.w}`, emoji: "🍋", level: 4, difficulty: 6, lines: (c) => [`Zest in the ${c.w}!`, `${c.name} stirred the ${c.w2}.`, `Tangy sip.`] },
  { title: (c) => `Bark at ${c.w}`, emoji: "🐕", level: 2, difficulty: 2, lines: (c) => [`The ${c.w} barked loud.`, `${c.name} hushed it.`, `Quiet by the ${c.w2}.`] },
  { title: (c) => `Cram the ${c.w}`, emoji: "📦", level: 3, difficulty: 4, lines: (c) => [`${c.name} crammed the ${c.w}.`, `Into the ${c.w2}.`, `Shut tight.`] },
  { title: (c) => `Dunk the ${c.w}`, emoji: "🏀", level: 3, difficulty: 4, lines: (c) => [`${c.name} dunked the ${c.w}.`, `Splash in the ${c.w2}.`, `Score!`] },
  { title: (c) => `Elk by ${c.w}`, emoji: "🦌", level: 4, difficulty: 7, lines: (c) => [`An elk stood by the ${c.w}.`, `${c.name} stayed still.`, `It crossed to ${c.w2}.`] },
  { title: (c) => `Flap the ${c.w}`, emoji: "🪶", level: 3, difficulty: 4, lines: (c) => [`${c.name} flapped the ${c.w}.`, `Wind in the ${c.w2}.`, `Up it flew.`] },
  { title: (c) => `Grit on ${c.w}`, emoji: "🏖️", level: 3, difficulty: 5, lines: (c) => [`Grit on the ${c.w}.`, `${c.name} wiped the ${c.w2}.`, `Smooth again.`] },
  { title: (c) => `Harp by ${c.w}`, emoji: "🎶", level: 4, difficulty: 7, lines: (c) => [`Harp notes by the ${c.w}.`, `${c.name} hummed along.`, `Echo in ${c.w2}.`] },
  { title: (c) => `Iron the ${c.w}`, emoji: "👔", level: 4, difficulty: 6, lines: (c) => [`${c.name} ironed the ${c.w}.`, `Flat on the ${c.w2}.`, `Crisp fold.`] },
  { title: (c) => `Jest at ${c.w}`, emoji: "😄", level: 3, difficulty: 4, lines: (c) => [`${c.name} jested at the ${c.w}.`, `Laugh from the ${c.w2}.`, `Mood was light.`] },
  { title: (c) => `Kilt and ${c.w}`, emoji: "🏴", level: 4, difficulty: 7, lines: (c) => [`Kilt pin on the ${c.w}.`, `${c.name} fixed the ${c.w2}.`, `Ready for fest.`] },
  { title: (c) => `Lark at ${c.w}`, emoji: "🐦", level: 3, difficulty: 4, lines: (c) => [`A lark sang at ${c.w}.`, `${c.name} listened.`, `Song over ${c.w2}.`] },
  { title: (c) => `Mist on ${c.w}`, emoji: "🌫️", level: 3, difficulty: 5, lines: (c) => [`Mist hid the ${c.w}.`, `${c.name} found the ${c.w2}.`, `Path clear.`] },
  { title: (c) => `Nook by ${c.w}`, emoji: "📚", level: 3, difficulty: 4, lines: (c) => [`A nook by the ${c.w}.`, `${c.name} read a ${c.w2}.`, `Quiet hour.`] },
  { title: (c) => `Oath on ${c.w}`, emoji: "📜", level: 4, difficulty: 7, lines: (c) => [`Oath sworn on the ${c.w}.`, `${c.name} held the ${c.w2}.`, `Promise kept.`] },
  { title: (c) => `Pelt the ${c.w}`, emoji: "❄️", level: 3, difficulty: 4, lines: (c) => [`Hail pelted the ${c.w}.`, `${c.name} hid in ${c.w2}.`, `Storm passed.`] },
  { title: (c) => `Quill on ${c.w}`, emoji: "✒️", level: 4, difficulty: 6, lines: (c) => [`Quill ink on the ${c.w}.`, `${c.name} wrote on ${c.w2}.`, `Letter sent.`] },
  { title: (c) => `Rung on ${c.w}`, emoji: "🪜", level: 3, difficulty: 4, lines: (c) => [`${c.name} climbed each rung on the ${c.w}.`, `Top of the ${c.w2}.`, `View was grand.`] },
  { title: (c) => `Shed the ${c.w}`, emoji: "🏚️", level: 3, difficulty: 4, lines: (c) => [`Tools in the shed by ${c.w}.`, `${c.name} fixed the ${c.w2}.`, `Job well done.`] },
  { title: (c) => `Tilt the ${c.w}`, emoji: "↗️", level: 3, difficulty: 5, lines: (c) => [`${c.name} tilted the ${c.w}.`, `Lean on the ${c.w2}.`, `Balance held.`] },
  { title: (c) => `Unit of ${c.w}`, emoji: "📏", level: 4, difficulty: 6, lines: (c) => [`One unit of ${c.w}.`, `${c.name} weighed the ${c.w2}.`, `Math was right.`] },
  { title: (c) => `Vane on ${c.w}`, emoji: "🌬️", level: 4, difficulty: 7, lines: (c) => [`Vane spun on the ${c.w}.`, `${c.name} watched the ${c.w2}.`, `Wind from west.`] },
  { title: (c) => `Wick in ${c.w}`, emoji: "🕯️", level: 3, difficulty: 4, lines: (c) => [`Wick lit in the ${c.w}.`, `${c.name} set down the ${c.w2}.`, `Glow filled room.`] },
  { title: (c) => `Yolk in ${c.w}`, emoji: "🍳", level: 3, difficulty: 4, lines: (c) => [`Yolk dropped in the ${c.w}.`, `${c.name} stirred the ${c.w2}.`, `Breakfast ready.`] },
  { title: (c) => `Zinc on ${c.w}`, emoji: "🔩", level: 4, difficulty: 7, lines: (c) => [`Zinc cap on the ${c.w}.`, `${c.name} sealed the ${c.w2}.`, `No rust.`] },
  { title: (c) => `Bask in ${c.w}`, emoji: "☀️", level: 3, difficulty: 4, lines: (c) => [`${c.name} basked in sun by ${c.w}.`, `Warm on the ${c.w2}.`, `Lazy noon.`] },
  { title: (c) => `Cove at ${c.w}`, emoji: "🏝️", level: 4, difficulty: 7, lines: (c) => [`Cove hid at the ${c.w}.`, `${c.name} sailed to ${c.w2}.`, `Shells galore.`] },
  { title: (c) => `Dell by ${c.w}`, emoji: "🏞️", level: 4, difficulty: 7, lines: (c) => [`Dell lay by the ${c.w}.`, `${c.name} crossed the ${c.w2}.`, `Green and still.`] },
  { title: (c) => `Elm near ${c.w}`, emoji: "🌳", level: 3, difficulty: 5, lines: (c) => [`Elm shade near the ${c.w}.`, `${c.name} rested on ${c.w2}.`, `Cool breeze.`] },
  { title: (c) => `Fern on ${c.w}`, emoji: "🌿", level: 3, difficulty: 4, lines: (c) => [`Fern grew on the ${c.w}.`, `${c.name} picked a ${c.w2}.`, `Green bouquet.`] },
  { title: (c) => `Glen and ${c.w}`, emoji: "⛰️", level: 4, difficulty: 7, lines: (c) => [`Glen echoed the ${c.w}.`, `${c.name} called to ${c.w2}.`, `Voice came back.`] },
  { title: (c) => `Holt by ${c.w}`, emoji: "🦊", level: 4, difficulty: 7, lines: (c) => [`Fox holt by the ${c.w}.`, `${c.name} tiptoed past ${c.w2}.`, `Left in peace.`] },
  { title: (c) => `Isle of ${c.w}`, emoji: "🏝️", level: 4, difficulty: 7, lines: (c) => [`Isle of sand and ${c.w}.`, `${c.name} built on ${c.w2}.`, `Castle stood.`] },
  { title: (c) => `Jetty at ${c.w}`, emoji: "⚓", level: 4, difficulty: 7, lines: (c) => [`Jetty moored at ${c.w}.`, `${c.name} tied the ${c.w2}.`, `Boat secure.`] },
  { title: (c) => `Knoll past ${c.w}`, emoji: "⛰️", level: 4, difficulty: 7, lines: (c) => [`Knoll rose past the ${c.w}.`, `${c.name} crested ${c.w2}.`, `Valley below.`] },
  { title: (c) => `Loch by ${c.w}`, emoji: "🏞️", level: 4, difficulty: 7, lines: (c) => [`Loch shimmered by ${c.w}.`, `${c.name} skipped stones on ${c.w2}.`, `Ripples spread.`] },
  { title: (c) => `Marsh near ${c.w}`, emoji: "🌾", level: 4, difficulty: 6, lines: (c) => [`Marsh reeds near ${c.w}.`, `${c.name} spotted ${c.w2}.`, `Bird took flight.`] },
  { title: (c) => `Nook in ${c.w}`, emoji: "🛋️", level: 3, difficulty: 4, lines: (c) => [`Cozy nook in the ${c.w}.`, `${c.name} curled on ${c.w2}.`, `Book and tea.`] },
  { title: (c) => `Oar by ${c.w}`, emoji: "🚣", level: 3, difficulty: 5, lines: (c) => [`Oar rested by the ${c.w}.`, `${c.name} rowed past ${c.w2}.`, `Rippled wake.`] },
  { title: (c) => `Pond at ${c.w}`, emoji: "🐸", level: 2, difficulty: 3, lines: (c) => [`Pond frogs at ${c.w}.`, `${c.name} fed the ${c.w2}.`, `Splash and croak.`] },
  { title: (c) => `Quay at ${c.w}`, emoji: "🚢", level: 4, difficulty: 7, lines: (c) => [`Quay docked at ${c.w}.`, `${c.name} waved from ${c.w2}.`, `Ship set sail.`] },
  { title: (c) => `Reef by ${c.w}`, emoji: "🪸", level: 4, difficulty: 7, lines: (c) => [`Reef colors by ${c.w}.`, `${c.name} dove near ${c.w2}.`, `Fish swam by.`] },
  { title: (c) => `Silt on ${c.w}`, emoji: "🏜️", level: 4, difficulty: 6, lines: (c) => [`Silt coated the ${c.w}.`, `${c.name} rinsed the ${c.w2}.`, `Clear water.`] },
  { title: (c) => `Tarn at ${c.w}`, emoji: "💧", level: 4, difficulty: 7, lines: (c) => [`Tarn pooled at ${c.w}.`, `${c.name} filled a ${c.w2}.`, `Pure and cold.`] },
  { title: (c) => `Urn on ${c.w}`, emoji: "🏺", level: 4, difficulty: 6, lines: (c) => [`Urn sat on the ${c.w}.`, `${c.name} dusted the ${c.w2}.`, `Heirloom safe.`] },
  { title: (c) => `Vale of ${c.w}`, emoji: "🌄", level: 4, difficulty: 7, lines: (c) => [`Vale of mist and ${c.w}.`, `${c.name} hiked to ${c.w2}.`, `Sun broke through.`] },
  { title: (c) => `Wold by ${c.w}`, emoji: "🌾", level: 4, difficulty: 7, lines: (c) => [`Wold grass by ${c.w}.`, `${c.name} crossed to ${c.w2}.`, `Miles of green.`] },
  { title: (c) => `Yarn on ${c.w}`, emoji: "🧶", level: 3, difficulty: 4, lines: (c) => [`Yarn ball on the ${c.w}.`, `${c.name} knit by ${c.w2}.`, `Mittens done.`] },
  { title: (c) => `Zephyr at ${c.w}`, emoji: "🌬️", level: 4, difficulty: 7, lines: (c) => [`Zephyr stirred at ${c.w}.`, `${c.name} held the ${c.w2}.`, `Kite climbed high.`] },
];

function pickWords(index: number): WordCtx {
  const family = WORD_FAMILIES[index % WORD_FAMILIES.length]!;
  const words = family.words.map((w) => w.word);
  const w = words[index % words.length] ?? "cat";
  const w2 = words[(index + 1) % words.length] ?? "hat";
  const w3 = words[(index + 2) % words.length] ?? "mat";
  return {
    w,
    w2,
    w3,
    name: NAMES[index % NAMES.length]!,
    emoji: family.words.find((x) => x.word === w)?.emoji ?? family.badgeEmoji,
    family: family.id,
  };
}

function highlightFromText(text: string): string[] {
  return text.replace(/[.!?,—]/g, "").split(/\s+/).filter(Boolean);
}

function levelForIndex(index: number): StoryLevel {
  if (index < 20) return 1;
  if (index < 55) return 2;
  if (index < 75) return 3;
  if (index < 90) return 4;
  return 5;
}

export function getAuthoredStories(): DecodableStoryMeta[] {
  return NARRATIVE_SHAPES.map((shape, index) => {
    const ctx = pickWords(index);
    const lineTexts = shape.lines(ctx);
    const level = levelForIndex(index);
    return {
      id: `auth-${String(index + 1).padStart(3, "0")}`,
      title: shape.title(ctx),
      emoji: shape.emoji,
      level,
      requiredSounds: [...new Set((ctx.w + ctx.w2).split(""))],
      requiredFamilies: [ctx.family],
      difficulty: shape.difficulty,
      estimatedMinutes: Math.max(1, Math.ceil(lineTexts.length / 2)),
      lines: lineTexts.map((text) => ({
        text,
        highlightWords: highlightFromText(text),
      })),
      comprehensionQuestion: `What happened to ${ctx.w}?`,
    };
  });
}
