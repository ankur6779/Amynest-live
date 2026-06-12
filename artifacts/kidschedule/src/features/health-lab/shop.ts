/** Amy Health Lab™ — coin shop catalog */

export type ShopCategory =
  | "avatar"
  | "pet"
  | "decoration"
  | "trail"
  | "particle"
  | "costume";

export interface ShopItem {
  id: string;
  name: string;
  emoji: string;
  category: ShopCategory;
  price: number;
  description: string;
}

export const SHOP_ITEMS: ShopItem[] = [
  { id: "hat-star-crown", name: "Star Crown", emoji: "👑", category: "avatar", price: 120, description: "Shine like a wellness hero" },
  { id: "face-lab-goggles", name: "Lab Goggles", emoji: "🥽", category: "avatar", price: 70, description: "See the science in every move" },
  { id: "face-cool-shades", name: "Cool Shades", emoji: "😎", category: "avatar", price: 55, description: "Stay cool under pressure" },
  { id: "hat-lab-coat", name: "Lab Coat", emoji: "🥼", category: "costume", price: 80, description: "Scientist style for Amy" },
  { id: "costume-ninja", name: "Mind Ninja Suit", emoji: "🥷", category: "costume", price: 180, description: "Stealth wellness gear" },
  { id: "costume-astronaut", name: "Space Suit", emoji: "👨‍🚀", category: "costume", price: 220, description: "Galaxy explorer outfit" },
  { id: "pet-rocket-buddy", name: "Rocket Buddy", emoji: "🚀", category: "pet", price: 150, description: "A tiny rocket companion" },
  { id: "pet-crystal-fox", name: "Crystal Fox", emoji: "🦊", category: "pet", price: 200, description: "Mystical lab fox friend" },
  { id: "deco-nebula-poster", name: "Nebula Poster", emoji: "🌌", category: "decoration", price: 60, description: "Decorate your lab wall" },
  { id: "deco-plant-pot", name: "Zen Plant", emoji: "🪴", category: "decoration", price: 45, description: "Calm energy for the lab" },
  { id: "trail-sparkle", name: "Sparkle Trail", emoji: "✨", category: "trail", price: 100, description: "Leave sparkles as you play" },
  { id: "trail-rainbow", name: "Rainbow Trail", emoji: "🌈", category: "trail", price: 130, description: "Colorful motion trail" },
  { id: "particle-stars", name: "Star Particles", emoji: "⭐", category: "particle", price: 90, description: "Extra floating stars" },
  { id: "particle-bubbles", name: "Bubble Particles", emoji: "🫧", category: "particle", price: 75, description: "Playful bubble effects" },
];

export function getShopItem(id: string): ShopItem | undefined {
  return SHOP_ITEMS.find((i) => i.id === id);
}

export function purchaseItem(
  owned: string[],
  coins: number,
  itemId: string,
): { ok: boolean; coins: number; owned: string[]; error?: string } {
  const item = getShopItem(itemId);
  if (!item) return { ok: false, coins, owned, error: "Item not found" };
  if (owned.includes(itemId)) return { ok: false, coins, owned, error: "Already owned" };
  if (coins < item.price) return { ok: false, coins, owned, error: "Not enough coins" };
  return { ok: true, coins: coins - item.price, owned: [...owned, itemId] };
}
