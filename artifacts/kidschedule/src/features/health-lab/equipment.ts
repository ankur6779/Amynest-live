import { getShopItem } from "./shop";
import type { EquipmentSlot } from "./types";

export const ITEM_SLOTS: Record<string, EquipmentSlot> = {
  "hat-star-crown": "head",
  "face-lab-goggles": "face",
  "face-cool-shades": "face",
  "hat-lab-coat": "body",
  "costume-ninja": "body",
  "costume-astronaut": "body",
  "pet-rocket-buddy": "pet",
  "pet-crystal-fox": "pet",
  "deco-nebula-poster": "background",
  "deco-plant-pot": "background",
  "trail-sparkle": "trail",
  "trail-rainbow": "trail",
  "particle-stars": "effects",
  "particle-bubbles": "effects",
};

export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  head: "Head",
  face: "Face",
  body: "Body",
  trail: "Trail",
  pet: "Pet",
  background: "Background",
  effects: "Effects",
};

export function slotForItem(itemId: string): EquipmentSlot | null {
  return ITEM_SLOTS[itemId] ?? null;
}

export function equipItem(
  equipped: Partial<Record<EquipmentSlot, string>>,
  owned: string[],
  itemId: string,
): { ok: boolean; equipped: Partial<Record<EquipmentSlot, string>>; error?: string } {
  if (!owned.includes(itemId)) return { ok: false, equipped, error: "Not owned" };
  const slot = slotForItem(itemId);
  if (!slot) return { ok: false, equipped, error: "No slot" };
  const item = getShopItem(itemId);
  if (!item) return { ok: false, equipped, error: "Unknown item" };
  return { ok: true, equipped: { ...equipped, [slot]: itemId } };
}

export function resolveEquippedVisuals(
  equipped: Partial<Record<EquipmentSlot, string>>,
): {
  head?: string;
  face?: string;
  body?: string;
  trail?: string;
  pet?: string;
  background?: string;
  effects?: string;
} {
  const out: Record<string, string> = {};
  for (const [slot, id] of Object.entries(equipped)) {
    const item = getShopItem(id);
    if (item) out[slot] = item.emoji;
  }
  return out;
}
