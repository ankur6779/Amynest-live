/**
 * Additional catalog items to reach 40+ per non-animal world.
 * Imported by generate-discovery-worlds-catalog.ts
 */
export type ItemDef = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  funFact: string;
  quizSoundId: string;
  quizPrompt: string;
  sounds: Array<{ id: string; label: string; durationSec?: number }>;
};

export const VEHICLE_EXTRA: ItemDef[] = [
  { id: "forklift", name: "Forklift", category: "construction", emoji: "🏗️", funFact: "Forklifts lift heavy pallets in warehouses.", quizSoundId: "lift-01", quizPrompt: "Beep", sounds: [{ id: "lift-01", label: "Beep" }, { id: "lift-02", label: "Motor" }] },
  { id: "race-car", name: "Race Car", category: "road", emoji: "🏎️", funFact: "Race cars go very fast on tracks.", quizSoundId: "race-01", quizPrompt: "Vroom", sounds: [{ id: "race-01", label: "Engine" }, { id: "race-02", label: "Zoom" }] },
  { id: "scooter", name: "Scooter", category: "road", emoji: "🛴", funFact: "Scooters are fun on sidewalks.", quizSoundId: "scoot-01", quizPrompt: "Roll", sounds: [{ id: "scoot-01", label: "Roll" }] },
  { id: "subway", name: "Subway", category: "road", emoji: "🚇", funFact: "Subways run underground in big cities.", quizSoundId: "subway-01", quizPrompt: "Whoosh", sounds: [{ id: "subway-01", label: "Train" }, { id: "subway-02", label: "Brakes" }] },
  { id: "ferry", name: "Ferry", category: "water", emoji: "⛴️", funFact: "Ferries carry cars across water.", quizSoundId: "ferry-01", quizPrompt: "Horn", sounds: [{ id: "ferry-01", label: "Horn" }] },
  { id: "canoe", name: "Canoe", category: "water", emoji: "🛶", funFact: "Canoes glide with paddles.", quizSoundId: "paddle-01", quizPrompt: "Splash", sounds: [{ id: "paddle-01", label: "Paddle" }] },
  { id: "yacht", name: "Yacht", category: "water", emoji: "🛥️", funFact: "Yachts sail on calm seas.", quizSoundId: "yacht-01", quizPrompt: "Wave", sounds: [{ id: "yacht-01", label: "Waves" }] },
  { id: "glider", name: "Glider", category: "air", emoji: "🪂", funFact: "Gliders float on rising air.", quizSoundId: "glide-01", quizPrompt: "Whoosh", sounds: [{ id: "glide-01", label: "Wind" }] },
  { id: "drone", name: "Drone", category: "air", emoji: "🛸", funFact: "Drones buzz with spinning rotors.", quizSoundId: "drone-01", quizPrompt: "Buzz", sounds: [{ id: "drone-01", label: "Rotors" }] },
  { id: "space-shuttle", name: "Space Shuttle", category: "space", emoji: "🛸", funFact: "Shuttles carried astronauts to space.", quizSoundId: "shuttle-01", quizPrompt: "Blast", sounds: [{ id: "shuttle-01", label: "Launch" }] },
  { id: "lunar-rover", name: "Lunar Rover", category: "space", emoji: "🌙", funFact: "Rovers explored the Moon's surface.", quizSoundId: "rover-01", quizPrompt: "Beep", sounds: [{ id: "rover-01", label: "Beep" }] },
  { id: "segway", name: "Segway", category: "road", emoji: "🛴", funFact: "Segways balance on two wheels.", quizSoundId: "seg-01", quizPrompt: "Hum", sounds: [{ id: "seg-01", label: "Motor" }] },
  { id: "unicycle", name: "Unicycle", category: "road", emoji: "🎪", funFact: "Unicycles have only one wheel.", quizSoundId: "uni-01", quizPrompt: "Ring", sounds: [{ id: "uni-01", label: "Bell" }] },
  { id: "snowplow", name: "Snowplow", category: "construction", emoji: "🚜", funFact: "Snowplows clear winter roads.", quizSoundId: "plow-01", quizPrompt: "Grind", sounds: [{ id: "plow-01", label: "Blade" }] },
];

export const NATURE_EXTRA: ItemDef[] = [
  { id: "foghorn", name: "Fog Horn", category: "ocean", emoji: "🌫️", funFact: "Fog horns warn ships in mist.", quizSoundId: "fog-01", quizPrompt: "Boom", sounds: [{ id: "fog-01", label: "Horn" }] },
  { id: "river", name: "River", category: "forest", emoji: "🏞️", funFact: "Rivers flow toward the sea.", quizSoundId: "river-01", quizPrompt: "Flow", sounds: [{ id: "river-01", label: "Flow" }] },
  { id: "waterfall", name: "Waterfall", category: "forest", emoji: "💧", funFact: "Waterfalls crash into pools below.", quizSoundId: "fall-01", quizPrompt: "Rush", sounds: [{ id: "fall-01", label: "Rush" }] },
  { id: "volcano", name: "Volcano", category: "weather", emoji: "🌋", funFact: "Volcanoes build new land with lava.", quizSoundId: "volc-01", quizPrompt: "Rumble", sounds: [{ id: "volc-01", label: "Rumble" }] },
  { id: "desert-wind", name: "Desert Wind", category: "weather", emoji: "🏜️", funFact: "Desert winds shape sand dunes.", quizSoundId: "desert-01", quizPrompt: "Whoosh", sounds: [{ id: "desert-01", label: "Wind" }] },
  { id: "bamboo", name: "Bamboo Forest", category: "forest", emoji: "🎋", funFact: "Bamboo grows very quickly.", quizSoundId: "bamboo-01", quizPrompt: "Creak", sounds: [{ id: "bamboo-01", label: "Creak" }] },
  { id: "wolf-howling", name: "Distant Wolf", category: "forest", emoji: "🐺", funFact: "Wolves howl across valleys.", quizSoundId: "wolf-01", quizPrompt: "Howl", sounds: [{ id: "wolf-01", label: "Howl" }] },
  { id: "rainbow-after-rain", name: "After Rain", category: "weather", emoji: "🌈", funFact: "Rainbows appear when sun meets rain.", quizSoundId: "after-01", quizPrompt: "Drip", sounds: [{ id: "after-01", label: "Drips" }] },
  { id: "meadow", name: "Meadow", category: "forest", emoji: "🌾", funFact: "Meadows are open grassy fields.", quizSoundId: "meadow-01", quizPrompt: "Rustle", sounds: [{ id: "meadow-01", label: "Grass" }] },
  { id: "aurora", name: "Northern Lights", category: "night", emoji: "🌌", funFact: "Auroras glow in polar skies.", quizSoundId: "aurora-01", quizPrompt: "Hum", sounds: [{ id: "aurora-01", label: "Hum" }] },
  { id: "tide-pool", name: "Tide Pool", category: "ocean", emoji: "🪸", funFact: "Tide pools hold tiny sea creatures.", quizSoundId: "tide-01", quizPrompt: "Splash", sounds: [{ id: "tide-01", label: "Splash" }] },
  { id: "coral-reef", name: "Coral Reef", category: "ocean", emoji: "🪸", funFact: "Reefs are busy underwater cities.", quizSoundId: "reef-01", quizPrompt: "Bubble", sounds: [{ id: "reef-01", label: "Bubbles" }] },
  { id: "mosquito-night", name: "Summer Night", category: "night", emoji: "🌙", funFact: "Warm nights buzz with insects.", quizSoundId: "summer-01", quizPrompt: "Buzz", sounds: [{ id: "summer-01", label: "Buzz" }] },
  { id: "morning-birds", name: "Morning Chorus", category: "forest", emoji: "🌅", funFact: "Birds sing loudest at dawn.", quizSoundId: "dawn-01", quizPrompt: "Tweet", sounds: [{ id: "dawn-01", label: "Birds" }] },
  { id: "storm-surge", name: "Storm Surge", category: "weather", emoji: "🌊", funFact: "Big storms push waves ashore.", quizSoundId: "surge-01", quizPrompt: "Crash", sounds: [{ id: "surge-01", label: "Waves" }] },
  { id: "ice-rain", name: "Freezing Rain", category: "weather", emoji: "🧊", funFact: "Ice rain coats trees in glass.", quizSoundId: "ice-01", quizPrompt: "Tap", sounds: [{ id: "ice-01", label: "Ice" }] },
  { id: "spring-peepers", name: "Spring Peepers", category: "forest", emoji: "🐸", funFact: "Tiny frogs peep in spring.", quizSoundId: "peep-01", quizPrompt: "Peep", sounds: [{ id: "peep-01", label: "Peep" }] },
  { id: "owl-dawn", name: "Dawn Owl", category: "night", emoji: "🦉", funFact: "Some owls call at twilight.", quizSoundId: "dawn-owl-01", quizPrompt: "Hoot", sounds: [{ id: "dawn-owl-01", label: "Hoot" }] },
  { id: "beach-walk", name: "Beach Walk", category: "ocean", emoji: "🏖️", funFact: "Sand crunches under bare feet.", quizSoundId: "sand-01", quizPrompt: "Crunch", sounds: [{ id: "sand-01", label: "Sand" }] },
  { id: "mountain-echo", name: "Mountain Echo", category: "weather", emoji: "⛰️", funFact: "Sounds bounce off mountain walls.", quizSoundId: "echo-01", quizPrompt: "Echo", sounds: [{ id: "echo-01", label: "Echo" }] },
];

export const HOME_EXTRA: ItemDef[] = [
  { id: "washing-machine", name: "Washing Machine", category: "living", emoji: "🧺", funFact: "Washers spin clothes clean.", quizSoundId: "wash-01", quizPrompt: "Spin", sounds: [{ id: "wash-01", label: "Spin" }] },
  { id: "dryer", name: "Clothes Dryer", category: "living", emoji: "👕", funFact: "Dryers tumble clothes warm and dry.", quizSoundId: "dry-01", quizPrompt: "Tumble", sounds: [{ id: "dry-01", label: "Tumble" }] },
  { id: "dishwasher", name: "Dishwasher", category: "kitchen", emoji: "🍽️", funFact: "Dishwashers spray hot soapy water.", quizSoundId: "dish-01", quizPrompt: "Spray", sounds: [{ id: "dish-01", label: "Spray" }] },
  { id: "coffee-maker", name: "Coffee Maker", category: "kitchen", emoji: "☕", funFact: "Coffee makers drip hot drinks.", quizSoundId: "coffee-01", quizPrompt: "Drip", sounds: [{ id: "coffee-01", label: "Drip" }] },
  { id: "blender-smoothie", name: "Smoothie Blender", category: "kitchen", emoji: "🥤", funFact: "Blenders mix fruit smoothies.", quizSoundId: "smooth-01", quizPrompt: "Whirr", sounds: [{ id: "smooth-01", label: "Blend" }] },
  { id: "garbage-disposal", name: "Garbage Disposal", category: "kitchen", emoji: "🗑️", funFact: "Disposals grind food scraps.", quizSoundId: "dispose-01", quizPrompt: "Grind", sounds: [{ id: "dispose-01", label: "Grind" }] },
  { id: "electric-toothbrush", name: "Electric Toothbrush", category: "bathroom", emoji: "🪥", funFact: "Electric brushes buzz while cleaning teeth.", quizSoundId: "brush-01", quizPrompt: "Buzz", sounds: [{ id: "brush-01", label: "Buzz" }] },
  { id: "bathtub-drain", name: "Bathtub Drain", category: "bathroom", emoji: "🛁", funFact: "Water gurgles as tubs drain.", quizSoundId: "drain-01", quizPrompt: "Gurgle", sounds: [{ id: "drain-01", label: "Drain" }] },
  { id: "baby-monitor", name: "Baby Monitor", category: "bedroom", emoji: "📻", funFact: "Monitors let parents hear babies.", quizSoundId: "monitor-01", quizPrompt: "Hum", sounds: [{ id: "monitor-01", label: "Hum" }] },
  { id: "white-noise", name: "White Noise", category: "bedroom", emoji: "😴", funFact: "Soft noise helps some people sleep.", quizSoundId: "white-01", quizPrompt: "Hiss", sounds: [{ id: "white-01", label: "Hiss" }] },
  { id: "ceiling-fan", name: "Ceiling Fan", category: "bedroom", emoji: "🌀", funFact: "Fans spin air to keep rooms cool.", quizSoundId: "fan-01", quizPrompt: "Whirr", sounds: [{ id: "fan-01", label: "Fan" }] },
  { id: "air-conditioner", name: "Air Conditioner", category: "living", emoji: "❄️", funFact: "AC units hum on hot days.", quizSoundId: "ac-01", quizPrompt: "Hum", sounds: [{ id: "ac-01", label: "AC" }] },
  { id: "heater", name: "Heater", category: "living", emoji: "🔥", funFact: "Heaters warm cold rooms.", quizSoundId: "heat-01", quizPrompt: "Click", sounds: [{ id: "heat-01", label: "Click" }] },
  { id: "smoke-alarm", name: "Smoke Alarm", category: "living", emoji: "🚨", funFact: "Alarms beep to keep us safe.", quizSoundId: "smoke-01", quizPrompt: "Beep", sounds: [{ id: "smoke-01", label: "Beep" }] },
  { id: "washing-hands", name: "Washing Hands", category: "bathroom", emoji: "🧼", funFact: "Soap bubbles pop while scrubbing.", quizSoundId: "soap-01", quizPrompt: "Splash", sounds: [{ id: "soap-01", label: "Water" }] },
  { id: "stove-sizzle", name: "Stove Sizzle", category: "kitchen", emoji: "🍳", funFact: "Food sizzles on a hot pan.", quizSoundId: "sizzle-01", quizPrompt: "Sizzle", sounds: [{ id: "sizzle-01", label: "Sizzle" }] },
  { id: "clock-tick", name: "Wall Clock", category: "living", emoji: "🕰️", funFact: "Clocks tick each second.", quizSoundId: "tick-01", quizPrompt: "Tick", sounds: [{ id: "tick-01", label: "Tick" }] },
  { id: "garage-tools", name: "Garage Tools", category: "garage", emoji: "🔧", funFact: "Tools clank in busy garages.", quizSoundId: "tools-01", quizPrompt: "Clank", sounds: [{ id: "tools-01", label: "Clank" }] },
  { id: "sprinkler", name: "Sprinkler", category: "garage", emoji: "💦", funFact: "Sprinklers water the lawn.", quizSoundId: "sprink-01", quizPrompt: "Spray", sounds: [{ id: "sprink-01", label: "Spray" }] },
  { id: "window-rain", name: "Rain on Window", category: "bedroom", emoji: "🪟", funFact: "Rain taps on glass panes.", quizSoundId: "win-rain-01", quizPrompt: "Tap", sounds: [{ id: "win-rain-01", label: "Rain" }] },
];

export const INSTRUMENT_EXTRA: ItemDef[] = [
  { id: "cello", name: "Cello", category: "strings", emoji: "🎻", funFact: "Cellos play deep warm notes.", quizSoundId: "cello-01", quizPrompt: "Deep", sounds: [{ id: "cello-01", label: "Cello" }] },
  { id: "banjo", name: "Banjo", category: "strings", emoji: "🪕", funFact: "Banjos twang in folk music.", quizSoundId: "banjo-01", quizPrompt: "Twang", sounds: [{ id: "banjo-01", label: "Banjo" }] },
  { id: "bass-guitar", name: "Bass Guitar", category: "strings", emoji: "🎸", funFact: "Bass guitars keep the low beat.", quizSoundId: "bass-01", quizPrompt: "Thump", sounds: [{ id: "bass-01", label: "Bass" }] },
  { id: "oboe", name: "Oboe", category: "woodwind", emoji: "🎵", funFact: "Oboes have a reedy sweet tone.", quizSoundId: "oboe-01", quizPrompt: "Sweet", sounds: [{ id: "oboe-01", label: "Oboe" }] },
  { id: "bassoon", name: "Bassoon", category: "woodwind", emoji: "🎵", funFact: "Bassoons play low woodwind lines.", quizSoundId: "bassoon-01", quizPrompt: "Low", sounds: [{ id: "bassoon-01", label: "Bassoon" }] },
  { id: "pan-flute", name: "Pan Flute", category: "woodwind", emoji: "🪈", funFact: "Pan flutes have many tubes.", quizSoundId: "pan-01", quizPrompt: "Trill", sounds: [{ id: "pan-01", label: "Flute" }] },
  { id: "bagpipes", name: "Bagpipes", category: "brass", emoji: "📯", funFact: "Bagpipes use air-filled bags.", quizSoundId: "bag-01", quizPrompt: "Drone", sounds: [{ id: "bag-01", label: "Drone" }] },
  { id: "bugle", name: "Bugle", category: "brass", emoji: "🎺", funFact: "Bugles play simple brass calls.", quizSoundId: "bugle-01", quizPrompt: "Call", sounds: [{ id: "bugle-01", label: "Bugle" }] },
  { id: "snare-drum", name: "Snare Drum", category: "percussion", emoji: "🥁", funFact: "Snare drums rattle when struck.", quizSoundId: "snare-01", quizPrompt: "Crack", sounds: [{ id: "snare-01", label: "Snare" }] },
  { id: "bongo", name: "Bongos", category: "percussion", emoji: "🥁", funFact: "Bongos are paired hand drums.", quizSoundId: "bongo-01", quizPrompt: "Tap", sounds: [{ id: "bongo-01", label: "Bongo" }] },
  { id: "castanets", name: "Castanets", category: "percussion", emoji: "🪇", funFact: "Castanets click in flamenco dance.", quizSoundId: "cast-01", quizPrompt: "Click", sounds: [{ id: "cast-01", label: "Click" }] },
  { id: "gong", name: "Gong", category: "percussion", emoji: "🔔", funFact: "Gongs ring with one big strike.", quizSoundId: "gong-01", quizPrompt: "Gong", sounds: [{ id: "gong-01", label: "Gong" }] },
  { id: "kalimba", name: "Kalimba", category: "percussion", emoji: "🎹", funFact: "Kalimbas pluck metal tines.", quizSoundId: "kalimba-01", quizPrompt: "Plink", sounds: [{ id: "kalimba-01", label: "Plink" }] },
  { id: "accordion", name: "Accordion", category: "woodwind", emoji: "🪗", funFact: "Accordions squeeze air through reeds.", quizSoundId: "acc-01", quizPrompt: "Squeeze", sounds: [{ id: "acc-01", label: "Accordion" }] },
  { id: "organ", name: "Pipe Organ", category: "strings", emoji: "🎹", funFact: "Organs fill big halls with sound.", quizSoundId: "organ-01", quizPrompt: "Boom", sounds: [{ id: "organ-01", label: "Organ" }] },
  { id: "sitar", name: "Sitar", category: "strings", emoji: "🪕", funFact: "Sitars have many resonant strings.", quizSoundId: "sitar-01", quizPrompt: "Twang", sounds: [{ id: "sitar-01", label: "Sitar" }] },
  { id: "steel-drum", name: "Steel Drum", category: "percussion", emoji: "🥁", funFact: "Steel drums ring like tropical bells.", quizSoundId: "steel-01", quizPrompt: "Ring", sounds: [{ id: "steel-01", label: "Steel" }] },
  { id: "timpani", name: "Timpani", category: "percussion", emoji: "🥁", funFact: "Timpani are big kettle drums.", quizSoundId: "timp-01", quizPrompt: "Boom", sounds: [{ id: "timp-01", label: "Timpani" }] },
  { id: "whistle-recorder", name: "Train Whistle", category: "brass", emoji: "🚂", funFact: "Train whistles blow two tones.", quizSoundId: "train-01", quizPrompt: "Toot", sounds: [{ id: "train-01", label: "Whistle" }] },
  { id: "shaker", name: "Shaker", category: "percussion", emoji: "🪇", funFact: "Shakers rattle with beads inside.", quizSoundId: "shake-01", quizPrompt: "Shake", sounds: [{ id: "shake-01", label: "Shake" }] },
];
