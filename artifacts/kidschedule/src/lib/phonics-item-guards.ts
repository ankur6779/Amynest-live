import type { DisplayPhonicsItem } from "@/hooks/use-phonics-data";

/** Drop malformed API/fallback rows before phonics UI reads `.symbol`. */
export function isValidDisplayPhonicsItem(
  item: DisplayPhonicsItem | null | undefined,
): item is DisplayPhonicsItem {
  return (
    !!item &&
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.symbol === "string" &&
    item.symbol.trim().length > 0 &&
    typeof item.type === "string" &&
    item.type.length > 0
  );
}

export function sanitizeDisplayPhonicsItems(
  items: Array<DisplayPhonicsItem | null | undefined> | null | undefined,
): DisplayPhonicsItem[] {
  return (items ?? []).filter(isValidDisplayPhonicsItem);
}
