/**
 * Lightweight word → emoji lookup for Spelling Mastery picture cues.
 *
 * Used by Dictation to render a non-audio visual hint alongside the
 * written clue, so the mode never hard-depends on audio playing. Only
 * concrete, picturable nouns are mapped — abstract / CVC-filler words
 * (e.g. "zit", "nub") return null and simply render no emoji.
 *
 * Keys are exact lowercased word matches. Keep additions alphabetical-ish
 * within a category so the map stays easy to scan.
 */
const WORD_EMOJI: Record<string, string> = {
  // Animals
  cat: "🐱", dog: "🐶", pig: "🐷", hen: "🐔", chick: "🐤", duck: "🦆", frog: "🐸",
  fish: "🐟", bird: "🐦", bat: "🦇", bug: "🐛", bee: "🐝", ant: "🐜", cow: "🐮",
  goat: "🐐", lamb: "🐑", sheep: "🐑", horse: "🐴", foal: "🐴", colt: "🐴",
  calf: "🐮", yak: "🐃", fox: "🦊", bear: "🐻", lion: "🦁", tiger: "🐯",
  monkey: "🐵", mouse: "🐭", rat: "🐀", rabbit: "🐰", snake: "🐍", snail: "🐌",
  spider: "🕷️", owl: "🦉", penguin: "🐧", whale: "🐳", shark: "🦈", crab: "🦀",
  octopus: "🐙", turtle: "🐢", elephant: "🐘", zebra: "🦓", giraffe: "🦒",
  deer: "🦌", wolf: "🐺", panda: "🐼", koala: "🐨", camel: "🐫", dolphin: "🐬",

  // Food + drink
  cake: "🍰", milk: "🥛", jam: "🍓", egg: "🥚", rice: "🍚", soup: "🍲", meat: "🍖",
  bread: "🍞", apple: "🍎", banana: "🍌", grape: "🍇", lemon: "🍋", peach: "🍑",
  pear: "🍐", plum: "🫐", corn: "🌽", carrot: "🥕", peas: "🫛", bean: "🫘",
  cheese: "🧀", honey: "🍯", candy: "🍬", cookie: "🍪", pizza: "🍕", fries: "🍟",
  donut: "🍩", icecream: "🍨", pie: "🥧", nut: "🥜", water: "💧", tea: "🍵",

  // Nature + weather
  sun: "☀️", moon: "🌙", star: "⭐", tree: "🌳", leaf: "🍃", flower: "🌸",
  rose: "🌹", tulip: "🌷", daisy: "🌼", lily: "🌷", seed: "🌱", plant: "🪴",
  grass: "🌿", bush: "🌳", rain: "🌧️", snow: "❄️", wind: "💨", cloud: "☁️",
  fire: "🔥", rainbow: "🌈", hill: "⛰️", rock: "🪨", stone: "🪨", lake: "🏞️",
  river: "🏞️", pond: "💧", beach: "🏖️", sand: "🏖️", shell: "🐚", wave: "🌊",

  // Body
  hand: "✋", foot: "🦶", nose: "👃", eyes: "👀", ears: "👂", lips: "👄",
  hair: "💇", face: "😀", arm: "💪", leg: "🦵", toe: "🦶", knee: "🦵",
  teeth: "🦷", tooth: "🦷", heart: "❤️", brain: "🧠",

  // Objects + toys
  ball: "⚽", toy: "🧸", bell: "🔔", book: "📖", pen: "🖊️", cup: "☕", mug: "☕",
  box: "📦", bag: "👜", hat: "🎩", cap: "🧢", kite: "🪁", drum: "🥁", net: "🥅",
  key: "🔑", lock: "🔒", clock: "🕐", bed: "🛏️", chair: "🪑", table: "🪑",
  door: "🚪", window: "🪟", lamp: "💡", gift: "🎁", flag: "🚩", bell2: "🔔",
  brush: "🖌️", broom: "🧹", spoon: "🥄", fork: "🍴", plate: "🍽️", clock2: "🕐",

  // Vehicles + places
  bus: "🚌", car: "🚗", truck: "🚚", train: "🚆", ship: "🚢", boat: "⛵",
  plane: "✈️", bike: "🚲", rocket: "🚀", farm: "🚜", barn: "🏠", house: "🏠",
  home: "🏠", school: "🏫", shop: "🏪", tent: "⛺", castle: "🏰", bridge: "🌉",

  // Misc concrete
  fan: "🪭", rug: "🧶", log: "🪵", web: "🕸️", gem: "💎", map: "🗺️",
  cone: "🍦", crown: "👑", coin: "🪙", drop: "💧",
};

/** Returns a picture-cue emoji for the word, or null when none is mapped. */
export function spellingWordEmoji(word: string): string | null {
  const key = (word ?? "").trim().toLowerCase();
  if (!key) return null;
  return WORD_EMOJI[key] ?? null;
}
