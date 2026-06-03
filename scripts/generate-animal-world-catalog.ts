/**
 * Generates lib/animal-world/src/animals.json (100+ animals, full metadata).
 * Run: node --import tsx/esm scripts/generate-animal-world-catalog.ts
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Animal, AnimalCategory, AnimalSound } from "@workspace/animal-world";

type Seed = {
  id: string;
  name: string;
  category: AnimalCategory;
  emoji: string;
  funFact: string;
  quizPrompt: string;
  primarySoundId: string;
  sounds: Array<{ id: string; label: string }>;
};

function waveform(seed: number): number[] {
  return [0.3, 0.5 + (seed % 3) * 0.1, 0.8, 0.5 + (seed % 2) * 0.15, 0.35];
}

function buildAnimal(seed: Seed): Animal {
  const base = `animal-world/${seed.category}/${seed.id}`;
  const sounds: AnimalSound[] = seed.sounds.map((s, i) => ({
    id: s.id,
    label: s.label,
    gcsPath: `${base}/${s.id}.mp3`,
    durationSec: 1.1 + (seed.id.length % 4) * 0.2 + i * 0.1,
    waveform: waveform(seed.id.charCodeAt(0) + i),
  }));

  return {
    id: seed.id,
    name: seed.name,
    category: seed.category,
    emoji: seed.emoji,
    imageGcsPath: `${base}/hero.webp`,
    heroRealGcsPath: `${base}/hero.webp`,
    heroCartoonGcsPath: `${base}/card.webp`,
    funFact: seed.funFact,
    quizSoundId: seed.primarySoundId,
    quizPrompt: seed.quizPrompt,
    narration: {
      intro: `This is ${seed.name.toLowerCase() === seed.name ? `a ${seed.name.toLowerCase()}` : seed.name.toLowerCase()}.`,
      introGcsPath: `${base}/narration-intro.mp3`,
      soundCue: `Listen to the ${seed.name.toLowerCase()}.`,
      soundCueGcsPath: `${base}/narration-sound.mp3`,
    },
    sounds,
  };
}

function s(
  id: string,
  name: string,
  category: AnimalCategory,
  emoji: string,
  funFact: string,
  quizPrompt: string,
  primary: string,
  ...extra: Array<{ id: string; label: string }>
): Seed {
  const primarySound = { id: primary, label: quizPrompt };
  const sounds = [primarySound, ...extra];
  if (sounds.length < 2) sounds.push({ id: `${primary}-02`, label: `${quizPrompt} 2` });
  return {
    id,
    name,
    category,
    emoji,
    funFact,
    quizPrompt,
    primarySoundId: primary,
    sounds,
  };
}

const SEEDS: Seed[] = [
  // Farm (13)
  s("cow", "Cow", "farm", "🐮", "Cows can sleep standing up, but they dream lying down.", "Moo", "moo-01", { id: "moo-02", label: "Moo 2" }, { id: "moo-happy", label: "Happy Moo" }),
  s("horse", "Horse", "farm", "🐴", "Horses can run shortly after birth.", "Neigh", "neigh-01", { id: "neigh-02", label: "Neigh 2" }),
  s("sheep", "Sheep", "farm", "🐑", "Sheep have excellent memories and recognize faces.", "Baa", "baa-01", { id: "baa-02", label: "Baa 2" }),
  s("pig", "Pig", "farm", "🐷", "Pigs love to roll in cool mud to stay comfortable.", "Oink", "oink-01", { id: "oink-02", label: "Oink 2" }),
  s("chicken", "Chicken", "farm", "🐔", "Chickens cluck to talk with their flock.", "Cluck", "cluck-01", { id: "cluck-02", label: "Cluck 2" }),
  s("rooster", "Rooster", "farm", "🐓", "Roosters crow to greet the morning.", "Crow", "crow-01", { id: "crow-02", label: "Crow 2" }),
  s("duck", "Duck", "farm", "🦆", "Ducks have waterproof feathers.", "Quack", "quack-01", { id: "quack-02", label: "Quack 2" }),
  s("goat", "Goat", "farm", "🐐", "Goats are curious climbers.", "Bleat", "bleat-01", { id: "bleat-02", label: "Bleat 2" }),
  s("turkey", "Turkey", "farm", "🦃", "Turkeys can change the color of their heads.", "Gobble", "gobble-01", { id: "gobble-02", label: "Gobble 2" }),
  s("donkey", "Donkey", "farm", "🫏", "Donkeys have long ears to hear far away.", "Bray", "bray-01", { id: "bray-02", label: "Bray 2" }),
  s("rabbit", "Rabbit", "farm", "🐰", "Rabbits hop quickly with strong back legs.", "Hop", "thump-01", { id: "squeak-01", label: "Squeak" }),
  s("goose", "Goose", "farm", "🪿", "Geese honk loudly when they fly.", "Honk", "honk-01", { id: "honk-02", label: "Honk 2" }),
  s("llama", "Llama", "farm", "🦙", "Llamas live high in the mountains.", "Hum", "hum-01", { id: "hum-02", label: "Hum 2" }),

  // Wild (13)
  s("lion", "Lion", "wild", "🦁", "A lion's roar can be heard from far away.", "Roar", "roar-01", { id: "roar-02", label: "Roar 2" }, { id: "roar-baby", label: "Cub Roar" }),
  s("elephant", "Elephant", "wild", "🐘", "Elephants use their trunks like a hand.", "Trumpet", "trumpet-01", { id: "trumpet-02", label: "Trumpet 2" }),
  s("bear", "Bear", "wild", "🐻", "Bears can smell food from miles away.", "Growl", "growl-01", { id: "growl-02", label: "Growl 2" }),
  s("wolf", "Wolf", "wild", "🐺", "Wolves howl to stay in touch with their pack.", "Howl", "howl-01", { id: "howl-02", label: "Howl 2" }),
  s("fox", "Fox", "wild", "🦊", "Foxes have bushy tails for balance.", "Yip", "yip-01", { id: "yip-02", label: "Yip 2" }),
  s("zebra", "Zebra", "wild", "🦓", "Every zebra has unique stripes.", "Bray", "zebra-01", { id: "zebra-02", label: "Neigh 2" }),
  s("giraffe", "Giraffe", "wild", "🦒", "Giraffes have very long necks to reach leaves.", "Hum", "giraffe-01", { id: "giraffe-02", label: "Hum 2" }),
  s("hippo", "Hippo", "wild", "🦛", "Hippos spend lots of time in rivers.", "Grunt", "grunt-01", { id: "grunt-02", label: "Grunt 2" }),
  s("rhino", "Rhino", "wild", "🦏", "Rhinos have thick skin and strong horns.", "Snort", "snort-01", { id: "snort-02", label: "Snort 2" }),
  s("leopard", "Leopard", "wild", "🐆", "Leopards are excellent climbers.", "Growl", "leopard-01", { id: "leopard-02", label: "Growl 2" }),
  s("cheetah", "Cheetah", "wild", "🐆", "Cheetahs are the fastest land animals.", "Chirp", "chirp-01", { id: "chirp-02", label: "Chirp 2" }),
  s("kangaroo", "Kangaroo", "wild", "🦘", "Kangaroos carry babies in a pouch.", "Thump", "thump-01", { id: "thump-02", label: "Thump 2" }),
  s("panda", "Panda", "wild", "🐼", "Pandas love to eat bamboo.", "Bleat", "panda-01", { id: "panda-02", label: "Bleat 2" }),

  // Sea (13)
  s("dolphin", "Dolphin", "sea", "🐬", "Dolphins sleep with one eye open.", "Click", "click-01", { id: "squeak-01", label: "Squeak" }),
  s("whale", "Whale", "sea", "🐋", "Whales are the largest animals on Earth.", "Song", "song-01", { id: "song-02", label: "Song 2" }),
  s("shark", "Shark", "sea", "🦈", "Sharks have been around for millions of years.", "Splash", "splash-01", { id: "splash-02", label: "Splash 2" }),
  s("seal", "Seal", "sea", "🦭", "Seals clap their flippers on ice.", "Bark", "seal-01", { id: "seal-02", label: "Bark 2" }),
  s("octopus", "Octopus", "sea", "🐙", "Octopuses have eight flexible arms.", "Squirt", "squirt-01", { id: "squirt-02", label: "Squirt 2" }),
  s("crab", "Crab", "sea", "🦀", "Crabs walk sideways on the beach.", "Click", "crab-01", { id: "crab-02", label: "Click 2" }),
  s("seahorse", "Seahorse", "sea", "🪼", "Seahorses swim upright in the water.", "Bubble", "bubble-01", { id: "bubble-02", label: "Bubble 2" }),
  s("starfish", "Starfish", "sea", "⭐", "Starfish can regrow lost arms.", "Wave", "wave-01", { id: "wave-02", label: "Wave 2" }),
  s("jellyfish", "Jellyfish", "sea", "🪼", "Jellyfish drift with ocean currents.", "Pulse", "pulse-01", { id: "pulse-02", label: "Pulse 2" }),
  s("sea-turtle", "Sea Turtle", "sea", "🐢", "Sea turtles travel very long distances.", "Splash", "turtle-01", { id: "turtle-02", label: "Splash 2" }),
  s("clownfish", "Clownfish", "sea", "🐠", "Clownfish live safely among sea anemones.", "Bubble", "clown-01", { id: "clown-02", label: "Bubble 2" }),
  s("walrus", "Walrus", "sea", "🦭", "Walruses use tusks to pull onto ice.", "Bellow", "walrus-01", { id: "walrus-02", label: "Bellow 2" }),
  s("orca", "Orca", "sea", "🐋", "Orcas are also called killer whales.", "Call", "orca-01", { id: "orca-02", label: "Call 2" }),

  // Birds (13)
  s("owl", "Owl", "birds", "🦉", "Owls can turn their heads very far.", "Hoot", "hoot-01", { id: "hoot-02", label: "Hoot 2" }),
  s("parrot", "Parrot", "birds", "🦜", "Parrots can mimic many sounds.", "Squawk", "squawk-01", { id: "squawk-02", label: "Squawk 2" }),
  s("eagle", "Eagle", "birds", "🦅", "Eagles have incredibly sharp eyesight.", "Screech", "screech-01", { id: "screech-02", label: "Screech 2" }),
  s("crow", "Crow", "birds", "🐦‍⬛", "Crows are very clever birds.", "Caw", "caw-01", { id: "caw-02", label: "Caw 2" }),
  s("peacock", "Peacock", "birds", "🦚", "Peacocks fan out colorful tail feathers.", "Call", "peacock-01", { id: "peacock-02", label: "Call 2" }),
  s("flamingo", "Flamingo", "birds", "🦩", "Flamingos stand on one leg to rest.", "Honk", "flamingo-01", { id: "flamingo-02", label: "Honk 2" }),
  s("robin", "Robin", "birds", "🐦", "Robins sing cheerful spring songs.", "Chirp", "robin-01", { id: "robin-02", label: "Chirp 2" }),
  s("swan", "Swan", "birds", "🦢", "Swans glide gracefully on lakes.", "Trumpet", "swan-01", { id: "swan-02", label: "Trumpet 2" }),
  s("woodpecker", "Woodpecker", "birds", "🪶", "Woodpeckers tap trees to find insects.", "Tap", "tap-01", { id: "tap-02", label: "Tap 2" }),
  s("pelican", "Pelican", "birds", "🐦", "Pelicans scoop fish in their big beak pouch.", "Splash", "pelican-01", { id: "pelican-02", label: "Splash 2" }),
  s("hawk", "Hawk", "birds", "🦅", "Hawks soar high while hunting.", "Cry", "hawk-01", { id: "hawk-02", label: "Cry 2" }),
  s("canary", "Canary", "birds", "🐤", "Canaries sing bright cheerful notes.", "Trill", "canary-01", { id: "canary-02", label: "Trill 2" }),
  s("pigeon", "Pigeon", "birds", "🕊️", "Pigeons coo softly in cities.", "Coo", "coo-01", { id: "coo-02", label: "Coo 2" }),

  // Insects (13)
  s("bee", "Bee", "insects", "🐝", "Bees help flowers make seeds.", "Buzz", "buzz-01", { id: "buzz-02", label: "Buzz 2" }),
  s("butterfly", "Butterfly", "insects", "🦋", "Butterflies taste with their feet.", "Flutter", "flutter-01", { id: "flutter-02", label: "Flutter 2" }),
  s("cricket", "Cricket", "insects", "🦗", "Crickets chirp on warm nights.", "Chirp", "cricket-01", { id: "cricket-02", label: "Chirp 2" }),
  s("ant", "Ant", "insects", "🐜", "Ants work together in colonies.", "Rustle", "ant-01", { id: "ant-02", label: "Rustle 2" }),
  s("mosquito", "Mosquito", "insects", "🦟", "Mosquitoes buzz near still water.", "Buzz", "mosquito-01", { id: "mosquito-02", label: "Buzz 2" }),
  s("dragonfly", "Dragonfly", "insects", "🪰", "Dragonflies have four shimmering wings.", "Whirr", "dragon-01", { id: "dragon-02", label: "Whirr 2" }),
  s("grasshopper", "Grasshopper", "insects", "🦗", "Grasshoppers jump with strong legs.", "Chirp", "hopper-01", { id: "hopper-02", label: "Chirp 2" }),
  s("ladybug", "Ladybug", "insects", "🐞", "Ladybugs have spotted red shells.", "Tick", "lady-01", { id: "lady-02", label: "Tick 2" }),
  s("cicada", "Cicada", "insects", "🪲", "Cicadas sing loudly in summer.", "Buzz", "cicada-01", { id: "cicada-02", label: "Buzz 2" }),
  s("moth", "Moth", "insects", "🦋", "Moths are drawn to gentle lights.", "Flutter", "moth-01", { id: "moth-02", label: "Flutter 2" }),
  s("beetle", "Beetle", "insects", "🪲", "Beetles have hard shiny wing covers.", "Click", "beetle-01", { id: "beetle-02", label: "Click 2" }),
  s("firefly", "Firefly", "insects", "✨", "Fireflies glow to find each other.", "Hum", "firefly-01", { id: "firefly-02", label: "Hum 2" }),
  s("wasp", "Wasp", "insects", "🐝", "Wasps build papery nests.", "Buzz", "wasp-01", { id: "wasp-02", label: "Buzz 2" }),

  // Pets (13)
  s("dog", "Dog", "pets", "🐕", "Dogs wag their tails when happy.", "Bark", "bark-01", { id: "bark-02", label: "Bark 2" }, { id: "bark-happy", label: "Happy Bark" }),
  s("cat", "Cat", "pets", "🐈", "Cats purr when they feel calm.", "Meow", "meow-01", { id: "meow-02", label: "Meow 2" }, { id: "purr-01", label: "Purr" }),
  s("hamster", "Hamster", "pets", "🐹", "Hamsters store food in cheek pouches.", "Squeak", "hamster-01", { id: "hamster-02", label: "Squeak 2" }),
  s("guinea-pig", "Guinea Pig", "pets", "🐹", "Guinea pigs whistle when excited.", "Wheek", "wheek-01", { id: "wheek-02", label: "Wheek 2" }),
  s("parakeet", "Parakeet", "pets", "🦜", "Parakeets chirp cheerful songs.", "Chirp", "keet-01", { id: "keet-02", label: "Chirp 2" }),
  s("goldfish", "Goldfish", "pets", "🐠", "Goldfish remember simple tricks.", "Splash", "fish-01", { id: "fish-02", label: "Splash 2" }),
  s("ferret", "Ferret", "pets", "🦡", "Ferrets love to explore tunnels.", "Dook", "dook-01", { id: "dook-02", label: "Dook 2" }),
  s("gecko", "Gecko", "pets", "🦎", "Geckos can stick to smooth walls.", "Chirp", "gecko-01", { id: "gecko-02", label: "Chirp 2" }),
  s("puppy", "Puppy", "pets", "🐶", "Puppies learn by playing every day.", "Yip", "puppy-01", { id: "puppy-02", label: "Yip 2" }),
  s("kitten", "Kitten", "pets", "🐱", "Kittens practice pouncing on toys.", "Mew", "kitten-01", { id: "kitten-02", label: "Mew 2" }),
  s("bunny", "Bunny", "pets", "🐰", "Bunnies twitch their noses to smell.", "Thump", "bunny-01", { id: "bunny-02", label: "Thump 2" }),
  s("turtle-pet", "Pet Turtle", "pets", "🐢", "Turtles carry their home on their back.", "Hiss", "turtle-pet-01", { id: "turtle-pet-02", label: "Hiss 2" }),
  s("parrotlet", "Parrotlet", "pets", "🦜", "Parrotlets are tiny colorful parrots.", "Peep", "plet-01", { id: "plet-02", label: "Peep 2" }),

  // Jungle (13)
  s("monkey", "Monkey", "jungle", "🐒", "Monkeys use tails and hands to climb.", "Chatter", "chatter-01", { id: "chatter-02", label: "Chatter 2" }),
  s("tiger", "Tiger", "jungle", "🐯", "Tigers have bold orange stripes.", "Growl", "growl-01", { id: "growl-02", label: "Growl 2" }),
  s("gorilla", "Gorilla", "jungle", "🦍", "Gorillas are gentle plant eaters.", "Grunt", "gorilla-01", { id: "gorilla-02", label: "Grunt 2" }),
  s("chameleon", "Chameleon", "jungle", "🦎", "Chameleons can change color.", "Hiss", "chameleon-01", { id: "chameleon-02", label: "Hiss 2" }),
  s("sloth", "Sloth", "jungle", "🦥", "Sloths move slowly to save energy.", "Squeak", "sloth-01", { id: "sloth-02", label: "Squeak 2" }),
  s("frog", "Frog", "jungle", "🐸", "Frogs begin life as tadpoles.", "Ribbit", "ribbit-01", { id: "ribbit-02", label: "Ribbit 2" }),
  s("snake", "Snake", "jungle", "🐍", "Snakes smell with their tongue.", "Hiss", "hiss-01", { id: "hiss-02", label: "Hiss 2" }),
  s("jaguar", "Jaguar", "jungle", "🐆", "Jaguars are strong jungle hunters.", "Roar", "jaguar-01", { id: "jaguar-02", label: "Roar 2" }),
  s("capybara", "Capybara", "jungle", "🐹", "Capybaras are the largest rodents.", "Whistle", "capy-01", { id: "capy-02", label: "Whistle 2" }),
  s("iguana", "Iguana", "jungle", "🦎", "Iguanas bask in warm sunlight.", "Hiss", "iguana-01", { id: "iguana-02", label: "Hiss 2" }),
  s("tapir", "Tapir", "jungle", "🐗", "Tapirs use their snout like a snorkel.", "Snort", "tapir-01", { id: "tapir-02", label: "Snort 2" }),
  s("lemur", "Lemur", "jungle", "🐒", "Lemurs leap between forest trees.", "Call", "lemur-01", { id: "lemur-02", label: "Call 2" }),
  s("ocelot", "Ocelot", "jungle", "🐆", "Ocelots have beautiful spotted coats.", "Growl", "ocelot-01", { id: "ocelot-02", label: "Growl 2" }),

  // Arctic (13)
  s("penguin", "Penguin", "arctic", "🐧", "Penguins waddle but swim fast.", "Honk", "honk-01", { id: "honk-02", label: "Honk 2" }),
  s("polar-bear", "Polar Bear", "arctic", "🐻‍❄️", "Polar bears have thick warm fur.", "Growl", "growl-01", { id: "growl-02", label: "Growl 2" }),
  s("arctic-fox", "Arctic Fox", "arctic", "🦊", "Arctic foxes grow white winter fur.", "Yip", "afox-01", { id: "afox-02", label: "Yip 2" }),
  s("moose", "Moose", "arctic", "🫎", "Moose have wide antlers.", "Bellow", "moose-01", { id: "moose-02", label: "Bellow 2" }),
  s("reindeer", "Reindeer", "arctic", "🦌", "Reindeer pull sleighs in stories.", "Snort", "reindeer-01", { id: "reindeer-02", label: "Snort 2" }),
  s("snowy-owl", "Snowy Owl", "arctic", "🦉", "Snowy owls hunt in cold places.", "Hoot", "snowy-01", { id: "snowy-02", label: "Hoot 2" }),
  s("husky", "Husky", "arctic", "🐕‍🦺", "Huskies love to run in the snow.", "Howl", "husky-01", { id: "husky-02", label: "Howl 2" }),
  s("narwhal", "Narwhal", "arctic", "🦄", "Narwhals have a long spiral tusk.", "Click", "narwhal-01", { id: "narwhal-02", label: "Click 2" }),
  s("puffin", "Puffin", "arctic", "🐧", "Puffins dive for fish in cold seas.", "Squawk", "puffin-01", { id: "puffin-02", label: "Squawk 2" }),
  s("ermine", "Ermine", "arctic", "🐾", "Ermines have silky white winter coats.", "Squeak", "ermine-01", { id: "ermine-02", label: "Squeak 2" }),
  s("beluga", "Beluga", "arctic", "🐳", "Belugas are white whales.", "Chirp", "beluga-01", { id: "beluga-02", label: "Chirp 2" }),
  s("muskox", "Muskox", "arctic", "🐂", "Muskoxen huddle to block wind.", "Grunt", "muskox-01", { id: "muskox-02", label: "Grunt 2" }),
  s("seal-arctic", "Arctic Seal", "arctic", "🦭", "Seals slide on ice into the water.", "Bark", "aseal-01", { id: "aseal-02", label: "Bark 2" }),
];

const animals = SEEDS.map(buildAnimal);
const catalog = { version: 1, animals };

const out = join(import.meta.dirname, "..", "lib/animal-world/src/animals.json");
writeFileSync(out, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Wrote ${out} (${animals.length} animals)`);

if (animals.length < 100) {
  console.error(`Expected at least 100 animals, got ${animals.length}`);
  process.exit(1);
}
