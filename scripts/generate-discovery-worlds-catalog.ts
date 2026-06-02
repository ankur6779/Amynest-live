/**
 * Generates discovery world manifest.json files (catalog only — no audio).
 * Run: node --import tsx/esm scripts/generate-discovery-worlds-catalog.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

type SoundDef = { id: string; label: string; durationSec?: number };
type ItemDef = {
  id: string;
  name: string;
  category: string;
  emoji: string;
  funFact: string;
  quizSoundId: string;
  quizPrompt: string;
  sounds: SoundDef[];
};

type CategoryDef = { id: string; label: string; emoji: string };

function waveform(seed: number): number[] {
  return [0.3, 0.5 + (seed % 3) * 0.1, 0.8, 0.4 + (seed % 2) * 0.2];
}

function buildItem(worldFolder: string, item: ItemDef) {
  const base = `worlds/${worldFolder}/${item.category}/${item.id}`;
  const primary = item.sounds[0]!;
  return {
    id: item.id,
    name: item.name,
    category: item.category,
    emoji: item.emoji,
    imageGcsPath: `${base}/hero.webp`,
    heroRealGcsPath: `${base}/hero.webp`,
    heroCartoonGcsPath: `${base}/card.webp`,
    funFact: item.funFact,
    quizSoundId: item.quizSoundId,
    quizPrompt: item.quizPrompt,
    narration: {
      intro: `This is ${item.name.toLowerCase()}.`,
      introGcsPath: `${base}/narration-intro.mp3`,
      soundCue: `Listen to ${item.name.toLowerCase()}.`,
      soundCueGcsPath: `${base}/narration-sound.mp3`,
    },
    sounds: item.sounds.map((s, i) => ({
      id: s.id,
      label: s.label,
      gcsPath: `${base}/${s.id}.mp3`,
      durationSec: s.durationSec ?? 1.2 + (i % 3) * 0.3,
      waveform: waveform(item.id.length + i),
    })),
  };
}

function writeManifest(
  pkg: string,
  worldId: string,
  categories: CategoryDef[],
  items: ItemDef[],
  worldFolder: string,
) {
  const manifest = {
    version: 1,
    worldId,
    categories,
    items: items.map((it) => buildItem(worldFolder, it)),
  };
  const path = join(import.meta.dirname, "..", "lib", pkg, "src", "manifest.json");
  writeFileSync(path, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Wrote ${path} (${manifest.items.length} items)`);
}

const VEHICLE_CATEGORIES: CategoryDef[] = [
  { id: "road", label: "Road", emoji: "🛣️" },
  { id: "construction", label: "Construction", emoji: "🚧" },
  { id: "emergency", label: "Emergency", emoji: "🚨" },
  { id: "air", label: "Air", emoji: "✈️" },
  { id: "water", label: "Water", emoji: "⛵" },
  { id: "space", label: "Space", emoji: "🚀" },
];

const VEHICLE_ITEMS: ItemDef[] = [
  { id: "car", name: "Car", category: "road", emoji: "🚗", funFact: "Cars have four wheels and an engine.", quizSoundId: "engine-01", quizPrompt: "Vroom", sounds: [{ id: "engine-01", label: "Engine" }, { id: "horn-01", label: "Horn" }] },
  { id: "bus", name: "School Bus", category: "road", emoji: "🚌", funFact: "Buses carry many passengers at once.", quizSoundId: "bus-01", quizPrompt: "Beep beep", sounds: [{ id: "bus-01", label: "Bus horn" }] },
  { id: "truck", name: "Truck", category: "road", emoji: "🚚", funFact: "Trucks move heavy loads on big wheels.", quizSoundId: "truck-01", quizPrompt: "Rumble", sounds: [{ id: "truck-01", label: "Engine" }] },
  { id: "motorcycle", name: "Motorcycle", category: "road", emoji: "🏍️", funFact: "Motorcycles have two wheels and go fast.", quizSoundId: "bike-01", quizPrompt: "Vroom", sounds: [{ id: "bike-01", label: "Rev" }] },
  { id: "bicycle", name: "Bicycle", category: "road", emoji: "🚲", funFact: "Bicycles are powered by pedaling.", quizSoundId: "bell-01", quizPrompt: "Ring", sounds: [{ id: "bell-01", label: "Bell" }] },
  { id: "taxi", name: "Taxi", category: "road", emoji: "🚕", funFact: "Taxis take people where they need to go.", quizSoundId: "taxi-01", quizPrompt: "Honk", sounds: [{ id: "taxi-01", label: "Horn" }] },
  { id: "train", name: "Train", category: "road", emoji: "🚂", funFact: "Trains ride on long metal tracks.", quizSoundId: "whistle-01", quizPrompt: "Choo choo", sounds: [{ id: "whistle-01", label: "Whistle" }] },
  { id: "tram", name: "Tram", category: "road", emoji: "🚊", funFact: "Trams share city streets with cars.", quizSoundId: "tram-01", quizPrompt: "Ding", sounds: [{ id: "tram-01", label: "Bell" }] },
  { id: "skateboard", name: "Skateboard", category: "road", emoji: "🛹", funFact: "Skateboards roll on four small wheels.", quizSoundId: "roll-01", quizPrompt: "Roll", sounds: [{ id: "roll-01", label: "Wheels" }] },
  { id: "ambulance", name: "Ambulance", category: "emergency", emoji: "🚑", funFact: "Ambulances help people quickly.", quizSoundId: "siren-01", quizPrompt: "Wee oo", sounds: [{ id: "siren-01", label: "Siren" }] },
  { id: "police-car", name: "Police Car", category: "emergency", emoji: "🚓", funFact: "Police cars keep neighborhoods safe.", quizSoundId: "police-01", quizPrompt: "Wee oo", sounds: [{ id: "police-01", label: "Siren" }] },
  { id: "fire-truck", name: "Fire Truck", category: "emergency", emoji: "🚒", funFact: "Fire trucks carry ladders and hoses.", quizSoundId: "fire-01", quizPrompt: "Neeno", sounds: [{ id: "fire-01", label: "Siren" }] },
  { id: "bulldozer", name: "Bulldozer", category: "construction", emoji: "🚜", funFact: "Bulldozers push dirt and rocks.", quizSoundId: "dozer-01", quizPrompt: "Rrr", sounds: [{ id: "dozer-01", label: "Engine" }] },
  { id: "excavator", name: "Excavator", category: "construction", emoji: "🏗️", funFact: "Excavators dig with a long arm.", quizSoundId: "dig-01", quizPrompt: "Clank", sounds: [{ id: "dig-01", label: "Digging" }] },
  { id: "crane", name: "Crane", category: "construction", emoji: "🏗️", funFact: "Cranes lift heavy things high up.", quizSoundId: "crane-01", quizPrompt: "Whirr", sounds: [{ id: "crane-01", label: "Motor" }] },
  { id: "cement-mixer", name: "Cement Mixer", category: "construction", emoji: "🚧", funFact: "Mixers spin wet cement in a drum.", quizSoundId: "mix-01", quizPrompt: "Spin", sounds: [{ id: "mix-01", label: "Mixer" }] },
  { id: "dump-truck", name: "Dump Truck", category: "construction", emoji: "🚛", funFact: "Dump trucks tip loads out the back.", quizSoundId: "dump-01", quizPrompt: "Beep", sounds: [{ id: "dump-01", label: "Backup beep" }] },
  { id: "airplane", name: "Airplane", category: "air", emoji: "✈️", funFact: "Airplanes fly high above the clouds.", quizSoundId: "plane-01", quizPrompt: "Whoosh", sounds: [{ id: "plane-01", label: "Jet" }] },
  { id: "helicopter", name: "Helicopter", category: "air", emoji: "🚁", funFact: "Helicopters spin blades on top.", quizSoundId: "chopper-01", quizPrompt: "Thump", sounds: [{ id: "chopper-01", label: "Rotors" }] },
  { id: "hot-air-balloon", name: "Hot Air Balloon", category: "air", emoji: "🎈", funFact: "Balloons float with hot air inside.", quizSoundId: "burner-01", quizPrompt: "Whoosh", sounds: [{ id: "burner-01", label: "Burner" }] },
  { id: "jet", name: "Jet", category: "air", emoji: "🛩️", funFact: "Jets are very fast airplanes.", quizSoundId: "jet-01", quizPrompt: "Zoom", sounds: [{ id: "jet-01", label: "Afterburner" }] },
  { id: "boat", name: "Motorboat", category: "water", emoji: "🚤", funFact: "Boats glide across lakes and rivers.", quizSoundId: "boat-01", quizPrompt: "Splash", sounds: [{ id: "boat-01", label: "Motor" }] },
  { id: "ship", name: "Ship", category: "water", emoji: "🚢", funFact: "Ships sail across the ocean.", quizSoundId: "ship-01", quizPrompt: "Horn", sounds: [{ id: "ship-01", label: "Horn" }] },
  { id: "submarine", name: "Submarine", category: "water", emoji: "🔱", funFact: "Submarines travel under the water.", quizSoundId: "sonar-01", quizPrompt: "Ping", sounds: [{ id: "sonar-01", label: "Sonar" }] },
  { id: "sailboat", name: "Sailboat", category: "water", emoji: "⛵", funFact: "Wind pushes sailboats across water.", quizSoundId: "wind-01", quizPrompt: "Flap", sounds: [{ id: "wind-01", label: "Sails" }] },
  { id: "rocket", name: "Rocket", category: "space", emoji: "🚀", funFact: "Rockets blast off into space.", quizSoundId: "launch-01", quizPrompt: "Blast", sounds: [{ id: "launch-01", label: "Launch" }] },
  { id: "satellite", name: "Satellite", category: "space", emoji: "🛰️", funFact: "Satellites orbit Earth far above us.", quizSoundId: "beep-01", quizPrompt: "Beep", sounds: [{ id: "beep-01", label: "Signal" }] },
];

const NATURE_CATEGORIES: CategoryDef[] = [
  { id: "weather", label: "Weather", emoji: "⛈️" },
  { id: "forest", label: "Forest", emoji: "🌲" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
  { id: "night", label: "Night", emoji: "🌙" },
];

const NATURE_ITEMS: ItemDef[] = [
  { id: "rain", name: "Rain", category: "weather", emoji: "🌧️", funFact: "Rain helps plants grow.", quizSoundId: "rain-01", quizPrompt: "Pitter patter", sounds: [{ id: "rain-01", label: "Rain" }] },
  { id: "thunder", name: "Thunder", category: "weather", emoji: "⛈️", funFact: "Thunder follows lightning.", quizSoundId: "thunder-01", quizPrompt: "Boom", sounds: [{ id: "thunder-01", label: "Thunder" }] },
  { id: "wind", name: "Wind", category: "weather", emoji: "💨", funFact: "Wind moves air across the land.", quizSoundId: "wind-01", quizPrompt: "Whoosh", sounds: [{ id: "wind-01", label: "Wind" }] },
  { id: "snow", name: "Snow", category: "weather", emoji: "❄️", funFact: "Snow is frozen water crystals.", quizSoundId: "snow-01", quizPrompt: "Crunch", sounds: [{ id: "snow-01", label: "Snow" }] },
  { id: "hail", name: "Hail", category: "weather", emoji: "🌨️", funFact: "Hail falls as ice pellets.", quizSoundId: "hail-01", quizPrompt: "Tap tap", sounds: [{ id: "hail-01", label: "Hail" }] },
  { id: "forest-birds", name: "Forest Birds", category: "forest", emoji: "🐦", funFact: "Birds sing in the morning forest.", quizSoundId: "birds-01", quizPrompt: "Tweet", sounds: [{ id: "birds-01", label: "Birds" }] },
  { id: "owl", name: "Owl", category: "forest", emoji: "🦉", funFact: "Owls hunt quietly at night.", quizSoundId: "hoot-01", quizPrompt: "Hoot", sounds: [{ id: "hoot-01", label: "Hoot" }] },
  { id: "creek", name: "Creek", category: "forest", emoji: "🏞️", funFact: "Creeks babble over smooth stones.", quizSoundId: "creek-01", quizPrompt: "Babble", sounds: [{ id: "creek-01", label: "Water" }] },
  { id: "leaves", name: "Rustling Leaves", category: "forest", emoji: "🍃", funFact: "Wind shakes leaves on trees.", quizSoundId: "leaves-01", quizPrompt: "Rustle", sounds: [{ id: "leaves-01", label: "Leaves" }] },
  { id: "frog", name: "Frog", category: "forest", emoji: "🐸", funFact: "Frogs croak near ponds.", quizSoundId: "frog-01", quizPrompt: "Ribbit", sounds: [{ id: "frog-01", label: "Croak" }] },
  { id: "ocean-waves", name: "Ocean Waves", category: "ocean", emoji: "🌊", funFact: "Waves crash on sandy shores.", quizSoundId: "waves-01", quizPrompt: "Whoosh", sounds: [{ id: "waves-01", label: "Waves" }] },
  { id: "whale", name: "Whale", category: "ocean", emoji: "🐋", funFact: "Whales are giant ocean mammals.", quizSoundId: "whale-01", quizPrompt: "Song", sounds: [{ id: "whale-01", label: "Call" }] },
  { id: "dolphins", name: "Dolphins", category: "ocean", emoji: "🐬", funFact: "Dolphins click and whistle.", quizSoundId: "dolphin-01", quizPrompt: "Click", sounds: [{ id: "dolphin-01", label: "Clicks" }] },
  { id: "seagulls", name: "Seagulls", category: "ocean", emoji: "🕊️", funFact: "Seagulls cry near the beach.", quizSoundId: "gull-01", quizPrompt: "Squawk", sounds: [{ id: "gull-01", label: "Cry" }] },
  { id: "underwater", name: "Underwater", category: "ocean", emoji: "🫧", funFact: "Bubbles pop under the sea.", quizSoundId: "bubble-01", quizPrompt: "Blub", sounds: [{ id: "bubble-01", label: "Bubbles" }] },
  { id: "crickets", name: "Crickets", category: "night", emoji: "🦗", funFact: "Crickets chirp on warm nights.", quizSoundId: "cricket-01", quizPrompt: "Chirp", sounds: [{ id: "cricket-01", label: "Chirp" }] },
  { id: "night-owl", name: "Night Owl", category: "night", emoji: "🌙", funFact: "Owls are awake when we sleep.", quizSoundId: "night-hoot-01", quizPrompt: "Hoot", sounds: [{ id: "night-hoot-01", label: "Hoot" }] },
  { id: "campfire", name: "Campfire", category: "night", emoji: "🔥", funFact: "Campfires crackle and glow.", quizSoundId: "fire-01", quizPrompt: "Crackle", sounds: [{ id: "fire-01", label: "Crackle" }] },
  { id: "stars-wind", name: "Night Breeze", category: "night", emoji: "✨", funFact: "Gentle wind blows on clear nights.", quizSoundId: "breeze-01", quizPrompt: "Soft", sounds: [{ id: "breeze-01", label: "Breeze" }] },
  { id: "rain-on-tent", name: "Rain on Tent", category: "night", emoji: "⛺", funFact: "Rain taps on camping tents.", quizSoundId: "tent-rain-01", quizPrompt: "Tap", sounds: [{ id: "tent-rain-01", label: "Rain" }] },
];

const HOME_CATEGORIES: CategoryDef[] = [
  { id: "kitchen", label: "Kitchen", emoji: "🍳" },
  { id: "bathroom", label: "Bathroom", emoji: "🛁" },
  { id: "bedroom", label: "Bedroom", emoji: "🛏️" },
  { id: "living", label: "Living Room", emoji: "🛋️" },
  { id: "garage", label: "Garage & Door", emoji: "🚪" },
];

const HOME_ITEMS: ItemDef[] = [
  { id: "blender", name: "Blender", category: "kitchen", emoji: "🥤", funFact: "Blenders mix smoothies fast.", quizSoundId: "blend-01", quizPrompt: "Whirr", sounds: [{ id: "blend-01", label: "Blend" }] },
  { id: "microwave", name: "Microwave", category: "kitchen", emoji: "📻", funFact: "Microwaves heat food quickly.", quizSoundId: "micro-01", quizPrompt: "Beep", sounds: [{ id: "micro-01", label: "Beep" }] },
  { id: "kettle", name: "Kettle", category: "kitchen", emoji: "☕", funFact: "Kettles boil water for tea.", quizSoundId: "kettle-01", quizPrompt: "Bubble", sounds: [{ id: "kettle-01", label: "Boil" }] },
  { id: "dishes", name: "Dishes", category: "kitchen", emoji: "🍽️", funFact: "Dishes clink when we set the table.", quizSoundId: "clink-01", quizPrompt: "Clink", sounds: [{ id: "clink-01", label: "Clink" }] },
  { id: "fridge", name: "Refrigerator", category: "kitchen", emoji: "🧊", funFact: "Fridges hum to stay cold.", quizSoundId: "fridge-01", quizPrompt: "Hum", sounds: [{ id: "fridge-01", label: "Hum" }] },
  { id: "toaster", name: "Toaster", category: "kitchen", emoji: "🍞", funFact: "Toasters pop toast up.", quizSoundId: "toast-01", quizPrompt: "Pop", sounds: [{ id: "toast-01", label: "Pop" }] },
  { id: "flush", name: "Toilet Flush", category: "bathroom", emoji: "🚽", funFact: "Flushing moves water away.", quizSoundId: "flush-01", quizPrompt: "Whoosh", sounds: [{ id: "flush-01", label: "Flush" }] },
  { id: "shower", name: "Shower", category: "bathroom", emoji: "🚿", funFact: "Showers spray warm water.", quizSoundId: "shower-01", quizPrompt: "Spray", sounds: [{ id: "shower-01", label: "Shower" }] },
  { id: "faucet", name: "Faucet", category: "bathroom", emoji: "🚰", funFact: "Faucets drip and flow.", quizSoundId: "tap-01", quizPrompt: "Drip", sounds: [{ id: "tap-01", label: "Water" }] },
  { id: "hair-dryer", name: "Hair Dryer", category: "bathroom", emoji: "💇", funFact: "Dryers blow warm air.", quizSoundId: "dryer-01", quizPrompt: "Whirr", sounds: [{ id: "dryer-01", label: "Blow" }] },
  { id: "alarm-clock", name: "Alarm Clock", category: "bedroom", emoji: "⏰", funFact: "Alarms wake us in the morning.", quizSoundId: "alarm-01", quizPrompt: "Ring", sounds: [{ id: "alarm-01", label: "Alarm" }] },
  { id: "snoring", name: "Snoring", category: "bedroom", emoji: "😴", funFact: "Some people snore while asleep.", quizSoundId: "snore-01", quizPrompt: "Zzz", sounds: [{ id: "snore-01", label: "Snore" }] },
  { id: "lullaby", name: "Lullaby", category: "bedroom", emoji: "🎵", funFact: "Soft songs help babies sleep.", quizSoundId: "lull-01", quizPrompt: "Hum", sounds: [{ id: "lull-01", label: "Hum" }] },
  { id: "tv", name: "Television", category: "living", emoji: "📺", funFact: "TVs play shows and movies.", quizSoundId: "tv-01", quizPrompt: "Static", sounds: [{ id: "tv-01", label: "TV" }] },
  { id: "vacuum", name: "Vacuum", category: "living", emoji: "🧹", funFact: "Vacuums suck up dust.", quizSoundId: "vac-01", quizPrompt: "Vroom", sounds: [{ id: "vac-01", label: "Vacuum" }] },
  { id: "door-knock", name: "Door Knock", category: "living", emoji: "🚪", funFact: "We knock before entering.", quizSoundId: "knock-01", quizPrompt: "Knock", sounds: [{ id: "knock-01", label: "Knock" }] },
  { id: "phone-ring", name: "Phone Ring", category: "living", emoji: "📞", funFact: "Phones ring when someone calls.", quizSoundId: "ring-01", quizPrompt: "Ring", sounds: [{ id: "ring-01", label: "Ring" }] },
  { id: "keys", name: "Keys", category: "living", emoji: "🔑", funFact: "Keys jingle in pockets.", quizSoundId: "keys-01", quizPrompt: "Jingle", sounds: [{ id: "keys-01", label: "Jingle" }] },
  { id: "garage-door", name: "Garage Door", category: "garage", emoji: "🏠", funFact: "Garage doors roll up and down.", quizSoundId: "garage-01", quizPrompt: "Rumble", sounds: [{ id: "garage-01", label: "Motor" }] },
  { id: "doorbell", name: "Doorbell", category: "garage", emoji: "🔔", funFact: "Doorbells tell us someone is here.", quizSoundId: "bell-01", quizPrompt: "Ding", sounds: [{ id: "bell-01", label: "Ding" }] },
];

const INSTRUMENT_CATEGORIES: CategoryDef[] = [
  { id: "strings", label: "Strings", emoji: "🎻" },
  { id: "woodwind", label: "Woodwind", emoji: "🎷" },
  { id: "brass", label: "Brass", emoji: "🎺" },
  { id: "percussion", label: "Percussion", emoji: "🥁" },
];

const INSTRUMENT_ITEMS: ItemDef[] = [
  { id: "piano", name: "Piano", category: "strings", emoji: "🎹", funFact: "Pianos have black and white keys.", quizSoundId: "piano-01", quizPrompt: "Plink", sounds: [{ id: "piano-01", label: "Notes" }] },
  { id: "guitar", name: "Guitar", category: "strings", emoji: "🎸", funFact: "Guitars have six strings.", quizSoundId: "guitar-01", quizPrompt: "Strum", sounds: [{ id: "guitar-01", label: "Strum" }] },
  { id: "violin", name: "Violin", category: "strings", emoji: "🎻", funFact: "Violins use a bow to play.", quizSoundId: "violin-01", quizPrompt: "Sweet", sounds: [{ id: "violin-01", label: "Bow" }] },
  { id: "harp", name: "Harp", category: "strings", emoji: "🪕", funFact: "Harps have many vertical strings.", quizSoundId: "harp-01", quizPrompt: "Plink", sounds: [{ id: "harp-01", label: "Pluck" }] },
  { id: "ukulele", name: "Ukulele", category: "strings", emoji: "🪕", funFact: "Ukuleles sound bright and happy.", quizSoundId: "uke-01", quizPrompt: "Strum", sounds: [{ id: "uke-01", label: "Strum" }] },
  { id: "flute", name: "Flute", category: "woodwind", emoji: "🪈", funFact: "Flutes are blown across a hole.", quizSoundId: "flute-01", quizPrompt: "Trill", sounds: [{ id: "flute-01", label: "Flute" }] },
  { id: "clarinet", name: "Clarinet", category: "woodwind", emoji: "🎵", funFact: "Clarinets use a single reed.", quizSoundId: "clarinet-01", quizPrompt: "Warm", sounds: [{ id: "clarinet-01", label: "Clarinet" }] },
  { id: "saxophone", name: "Saxophone", category: "woodwind", emoji: "🎷", funFact: "Saxophones are shiny and curved.", quizSoundId: "sax-01", quizPrompt: "Jazzy", sounds: [{ id: "sax-01", label: "Sax" }] },
  { id: "recorder", name: "Recorder", category: "woodwind", emoji: "🎶", funFact: "Many kids learn recorder first.", quizSoundId: "recorder-01", quizPrompt: "Toot", sounds: [{ id: "recorder-01", label: "Toot" }] },
  { id: "harmonica", name: "Harmonica", category: "woodwind", emoji: "🎵", funFact: "Harmonicas fit in your hand.", quizSoundId: "harm-01", quizPrompt: "Whee", sounds: [{ id: "harm-01", label: "Blow" }] },
  { id: "trumpet", name: "Trumpet", category: "brass", emoji: "🎺", funFact: "Trumpets are loud and bright.", quizSoundId: "trumpet-01", quizPrompt: "Ta da", sounds: [{ id: "trumpet-01", label: "Trumpet" }] },
  { id: "trombone", name: "Trombone", category: "brass", emoji: "🎺", funFact: "Trombones slide to change pitch.", quizSoundId: "bone-01", quizPrompt: "Slide", sounds: [{ id: "bone-01", label: "Trombone" }] },
  { id: "french-horn", name: "French Horn", category: "brass", emoji: "📯", funFact: "French horns sound mellow.", quizSoundId: "horn-01", quizPrompt: "Bold", sounds: [{ id: "horn-01", label: "Horn" }] },
  { id: "tuba", name: "Tuba", category: "brass", emoji: "🎺", funFact: "Tubas play very low notes.", quizSoundId: "tuba-01", quizPrompt: "Oom", sounds: [{ id: "tuba-01", label: "Tuba" }] },
  { id: "drums", name: "Drums", category: "percussion", emoji: "🥁", funFact: "Drums keep the beat.", quizSoundId: "drums-01", quizPrompt: "Boom", sounds: [{ id: "drums-01", label: "Beat" }] },
  { id: "tambourine", name: "Tambourine", category: "percussion", emoji: "🪇", funFact: "Tambourines shake and jingle.", quizSoundId: "tamb-01", quizPrompt: "Shake", sounds: [{ id: "tamb-01", label: "Shake" }] },
  { id: "xylophone", name: "Xylophone", category: "percussion", emoji: "🎹", funFact: "Xylophones use wooden bars.", quizSoundId: "xylo-01", quizPrompt: "Ping", sounds: [{ id: "xylo-01", label: "Ping" }] },
  { id: "maracas", name: "Maracas", category: "percussion", emoji: "🪇", funFact: "Maracas rattle when shaken.", quizSoundId: "mara-01", quizPrompt: "Shake", sounds: [{ id: "mara-01", label: "Rattle" }] },
  { id: "triangle", name: "Triangle", category: "percussion", emoji: "🔺", funFact: "Triangles ring with one tap.", quizSoundId: "tri-01", quizPrompt: "Ding", sounds: [{ id: "tri-01", label: "Ding" }] },
  { id: "cymbals", name: "Cymbals", category: "percussion", emoji: "🥁", funFact: "Cymbals crash together.", quizSoundId: "cym-01", quizPrompt: "Crash", sounds: [{ id: "cym-01", label: "Crash" }] },
];

writeManifest("vehicle-world", "vehicle_world", VEHICLE_CATEGORIES, VEHICLE_ITEMS, "vehicles");
writeManifest("nature-sounds-world", "nature_world", NATURE_CATEGORIES, NATURE_ITEMS, "nature");
writeManifest("home-sounds-world", "home_sounds_world", HOME_CATEGORIES, HOME_ITEMS, "home");
writeManifest("instrument-world", "instrument_world", INSTRUMENT_CATEGORIES, INSTRUMENT_ITEMS, "instruments");

console.log("\nCatalog generation complete.");
