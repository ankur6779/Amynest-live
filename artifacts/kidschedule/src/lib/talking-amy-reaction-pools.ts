/**
 * Weighted reaction pools — 20+ unique lines per mode, anti-repeat via session hint.
 */

import type { TalkingAmyModeId } from "@/lib/talking-amy-modes";

export type WeightedReaction = { text: string; weight: number };

const SHARED_FUN: readonly WeightedReaction[] = [
  { text: "Haha!", weight: 2 },
  { text: "That was funny!", weight: 2 },
  { text: "Say it again!", weight: 2 },
  { text: "You're silly!", weight: 1.5 },
  { text: "Wow!", weight: 2 },
  { text: "I liked that!", weight: 1.5 },
  { text: "Let's do another!", weight: 1.5 },
  { text: "That made me giggle!", weight: 1.5 },
  { text: "So fun!", weight: 1 },
  { text: "Do it again!", weight: 1.5 },
  { text: "That was awesome!", weight: 1 },
  { text: "Hehe!", weight: 1.5 },
  { text: "Nice one!", weight: 1 },
  { text: "I heard you!", weight: 1 },
  { text: "Silly voice!", weight: 1 },
];

function pool(...items: WeightedReaction[]): WeightedReaction[] {
  return items;
}

export const TALKING_AMY_REACTION_POOLS: Record<TalkingAmyModeId, readonly WeightedReaction[]> = {
  chipmunk: pool(
    { text: "Squeak squeak!", weight: 2 },
    { text: "So speedy!", weight: 1 },
    { text: "Tiny voice!", weight: 1.5 },
    { text: "Chip chip!", weight: 1.5 },
    { text: "Nutty fun!", weight: 1 },
    { text: "Zoom zoom!", weight: 1 },
    ...SHARED_FUN,
    { text: "High squeaky giggle!", weight: 1 },
    { text: "That was chipmunk-y!", weight: 1 },
    { text: "Eek eek!", weight: 1 },
    { text: "Forest friend!", weight: 0.8 },
    { text: "Tiny but mighty!", weight: 0.8 },
    { text: "Squirrel power!", weight: 0.8 },
  ),
  baby: pool(
    { text: "Yay!", weight: 2 },
    { text: "Again!", weight: 2 },
    { text: "Cute cute!", weight: 1.5 },
    { text: "Baby giggle!", weight: 1.5 },
    { text: "Aww!", weight: 1.5 },
    { text: "So tiny!", weight: 1 },
    ...SHARED_FUN,
    { text: "Goo goo fun!", weight: 1 },
    { text: "Little voice!", weight: 1 },
    { text: "Snuggle sound!", weight: 0.8 },
    { text: "Bouncy baby!", weight: 0.8 },
    { text: "Peek-a-boo!", weight: 1 },
    { text: "Soft and sweet!", weight: 0.8 },
  ),
  robot: pool(
    { text: "Voice detected.", weight: 1.5 },
    { text: "Processing complete.", weight: 1.5 },
    { text: "Hello friend.", weight: 1.5 },
    { text: "Beep boop!", weight: 2 },
    { text: "Systems online!", weight: 1 },
    { text: "Robot high-five!", weight: 1 },
    ...SHARED_FUN,
    { text: "Scanning silly!", weight: 1 },
    { text: "Circuit giggle!", weight: 1 },
    { text: "Downloading fun!", weight: 0.8 },
    { text: "Battery full of laughs!", weight: 0.8 },
    { text: "Mechanical yay!", weight: 1 },
    { text: "Whirr whirr!", weight: 1 },
    { text: "Friendly bot!", weight: 0.8 },
  ),
  alien: pool(
    { text: "Greetings Earth friend.", weight: 1.5 },
    { text: "Zorp zorp!", weight: 2 },
    { text: "Take me to your playground.", weight: 1.5 },
    { text: "Cosmic giggle!", weight: 1 },
    { text: "Beam me more!", weight: 1 },
    ...SHARED_FUN,
    { text: "Space silly!", weight: 1 },
    { text: "Galaxy giggle!", weight: 1 },
    { text: "Wobble wobble!", weight: 1 },
    { text: "Far-out voice!", weight: 0.8 },
    { text: "Planet fun!", weight: 0.8 },
    { text: "Star sparkle!", weight: 1 },
    { text: "UFO approved!", weight: 0.8 },
    { text: "Orbiting joy!", weight: 0.8 },
  ),
  monster: pool(
    { text: "Rooooar!", weight: 2 },
    { text: "I am Monster Amy!", weight: 1.5 },
    { text: "That sounded huge!", weight: 1.5 },
    { text: "Big silly roar!", weight: 1.5 },
    { text: "Grrr fun!", weight: 1 },
    ...SHARED_FUN,
    { text: "Dino stomp!", weight: 1 },
    { text: "Earthquake giggle!", weight: 1 },
    { text: "Mega voice!", weight: 1 },
    { text: "Scary-silly!", weight: 0.8 },
    { text: "Roar again!", weight: 1 },
    { text: "Huge laugh!", weight: 0.8 },
    { text: "Monster mash!", weight: 0.8 },
    { text: "King of silly!", weight: 0.8 },
  ),
  ghost: pool(
    { text: "Boooo!", weight: 2.5 },
    { text: "I heard a spooky voice!", weight: 2 },
    { text: "That sounded mysterious!", weight: 2 },
    { text: "Floaty echo!", weight: 1.5 },
    { text: "Spooky silly!", weight: 1.5 },
    ...SHARED_FUN,
    { text: "Ghost giggle!", weight: 1 },
    { text: "Boo-tiful!", weight: 1 },
    { text: "Hauntingly funny!", weight: 1 },
    { text: "Misty voice!", weight: 0.8 },
    { text: "Phantom fun!", weight: 0.8 },
    { text: "Who goes there?", weight: 0.8 },
    { text: "Shivery yay!", weight: 0.8 },
    { text: "Friendly spook!", weight: 1 },
  ),
  space: pool(
    { text: "Mission received!", weight: 2.5 },
    { text: "Hello Earth explorer!", weight: 2 },
    { text: "Transmission complete!", weight: 2 },
    { text: "Houston, we have giggles!", weight: 1.5 },
    { text: "Radio fun!", weight: 1.5 },
    ...SHARED_FUN,
    { text: "Orbit approved!", weight: 1 },
    { text: "Static silly!", weight: 1 },
    { text: "Launch laughter!", weight: 1 },
    { text: "Astronaut yay!", weight: 0.8 },
    { text: "Signal strong!", weight: 0.8 },
    { text: "Rocket giggle!", weight: 1 },
    { text: "Star commander!", weight: 0.8 },
    { text: "Over and out!", weight: 0.8 },
  ),
  magic: pool(
    { text: "Magic activated!", weight: 2.5 },
    { text: "Abracadabra!", weight: 2 },
    { text: "Sparkles everywhere!", weight: 2 },
    { text: "Wand wave!", weight: 1.5 },
    { text: "Enchanted giggle!", weight: 1.5 },
    ...SHARED_FUN,
    { text: "Poof of fun!", weight: 1 },
    { text: "Rainbow spell!", weight: 1 },
    { text: "Fairy dust!", weight: 1 },
    { text: "Shimmer yay!", weight: 0.8 },
    { text: "Wizard wow!", weight: 0.8 },
    { text: "Spellbound silly!", weight: 0.8 },
    { text: "Glitter giggle!", weight: 1 },
    { text: "Mystical fun!", weight: 0.8 },
  ),
  frog: pool(
    { text: "Ribbit!", weight: 2.5 },
    { text: "Hop hop!", weight: 2 },
    { text: "That was froggy fun!", weight: 2 },
    { text: "Pond party!", weight: 1.5 },
    { text: "Lily pad leap!", weight: 1.5 },
    ...SHARED_FUN,
    { text: "Croak croak!", weight: 1 },
    { text: "Splash giggle!", weight: 1 },
    { text: "Green machine!", weight: 1 },
    { text: "Tadpole yay!", weight: 0.8 },
    { text: "Bouncy boing!", weight: 1 },
    { text: "Frog prince fun!", weight: 0.8 },
    { text: "Marshmallow voice!", weight: 0.8 },
    { text: "Hop again!", weight: 1 },
  ),
  rainbow: pool(
    { text: "Rainbow burst!", weight: 2.5 },
    { text: "Secret colors!", weight: 2 },
    { text: "Prism power!", weight: 2 },
    { text: "You found a secret!", weight: 2 },
    ...SHARED_FUN,
    { text: "Colorful giggle!", weight: 1.5 },
    { text: "Spectrum silly!", weight: 1 },
    { text: "Arc of fun!", weight: 1 },
    { text: "Hue haha!", weight: 1 },
    { text: "Paint the sky!", weight: 0.8 },
    { text: "Glitter arc!", weight: 0.8 },
    { text: "Roy G. Biv!", weight: 0.8 },
    { text: "Chromatic yay!", weight: 0.8 },
    { text: "Rainbow surprise!", weight: 1.5 },
    { text: "Shiny secret!", weight: 1 },
  ),
  lightning: pool(
    { text: "Zap!", weight: 2.5 },
    { text: "Thunder giggle!", weight: 2 },
    { text: "Electric silly!", weight: 2 },
    { text: "Secret spark!", weight: 2 },
    ...SHARED_FUN,
    { text: "Bolt of fun!", weight: 1.5 },
    { text: "Storm yay!", weight: 1 },
    { text: "Flash haha!", weight: 1 },
    { text: "Crackle pop!", weight: 1 },
    { text: "Voltage voice!", weight: 0.8 },
    { text: "Sky boom!", weight: 0.8 },
    { text: "Charged up!", weight: 0.8 },
    { text: "Lightning secret!", weight: 1.5 },
    { text: "Power surge!", weight: 1 },
  ),
  galaxy: pool(
    { text: "Galaxy unlocked!", weight: 2.5 },
    { text: "Cosmic secret!", weight: 2 },
    { text: "Nebula giggle!", weight: 2 },
    { text: "Star collector!", weight: 2 },
    ...SHARED_FUN,
    { text: "Milky way wow!", weight: 1.5 },
    { text: "Universe silly!", weight: 1 },
    { text: "Comet fun!", weight: 1 },
    { text: "Black hole haha!", weight: 0.8 },
    { text: "Supernova yay!", weight: 1 },
    { text: "Deep space dance!", weight: 0.8 },
    { text: "Constellation cool!", weight: 0.8 },
    { text: "Galaxy secret!", weight: 1.5 },
    { text: "Infinite giggles!", weight: 1 },
  ),
};

export const DAILY_FEATURED_BONUS_REACTIONS: readonly WeightedReaction[] = [
  { text: "Today's star voice!", weight: 2 },
  { text: "Featured Amy yay!", weight: 2 },
  { text: "Special sparkle!", weight: 1.5 },
  { text: "Daily magic!", weight: 1.5 },
  { text: "Bonus giggle!", weight: 1 },
  { text: "Star of the day!", weight: 1 },
  { text: "Extra shiny!", weight: 1 },
  { text: "Today's treasure!", weight: 1 },
];

let lastReactionHint: string | null = null;

export function resetTalkingAmyReactionHint(): void {
  lastReactionHint = null;
}

function pickWeighted(pool: readonly WeightedReaction[], avoid?: string | null): string {
  if (!pool.length) return "Yay!";
  const filtered = avoid
    ? pool.filter((r) => r.text !== avoid)
    : pool;
  const candidates = filtered.length > 0 ? filtered : pool;
  const total = candidates.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * total;
  for (const item of candidates) {
    roll -= item.weight;
    if (roll <= 0) return item.text;
  }
  return candidates[candidates.length - 1]?.text ?? "Yay!";
}

export function pickWeightedTalkingAmyReaction(
  modeId: TalkingAmyModeId,
  opts?: { avoidRepeat?: boolean; extraPool?: readonly WeightedReaction[] },
): string {
  const base = TALKING_AMY_REACTION_POOLS[modeId] ?? SHARED_FUN;
  const merged = opts?.extraPool?.length ? [...base, ...opts.extraPool] : base;
  const avoid = opts?.avoidRepeat !== false ? lastReactionHint : null;
  const picked = pickWeighted(merged, avoid);
  lastReactionHint = picked;
  return picked;
}

export function reactionPoolSize(modeId: TalkingAmyModeId): number {
  return TALKING_AMY_REACTION_POOLS[modeId]?.length ?? 0;
}
