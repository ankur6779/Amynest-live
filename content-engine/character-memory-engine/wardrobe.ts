/**
 * Locked wardrobe / identity strings from the Official Character Bible.
 */

import { getBrandIdentityKit } from "../brand/identity.js";
import type { BrandCharacterId } from "../brand/types.js";

export function wardrobeFor(character: BrandCharacterId): {
  clothing: string;
  hairstyle: string;
  accessories: string;
  bibleAsset: string;
  baseAsset: string;
} {
  const kit = getBrandIdentityKit();
  const def = kit.characters[character];
  if (character === "amy-ai") {
    return {
      clothing: "white soft-polymer rounded body",
      hairstyle: "none — mascot body",
      accessories: "deep purple AmyAI baseball cap with headphones, neon purple halo",
      bibleAsset: def.bibleAsset,
      baseAsset: def.baseAsset,
    };
  }
  if (character === "amy-girl") {
    return {
      clothing: "plain purple hoodie, dark purple leggings, purple sneakers with white soles",
      hairstyle: "dark brown side ponytail with bright yellow bow",
      accessories: "yellow bow",
      bibleAsset: def.bibleAsset,
      baseAsset: def.baseAsset,
    };
  }
  return {
    clothing: "plain purple hoodie #6A2CFF, dark purple joggers #461EA8, purple sneakers with white soles",
    hairstyle: "fluffy dark brown hair",
    accessories: "none",
    bibleAsset: def.bibleAsset,
    baseAsset: def.baseAsset,
  };
}
