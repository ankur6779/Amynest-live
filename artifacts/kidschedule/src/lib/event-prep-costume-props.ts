/** Costume prop stickers for Magic Mirror — derived from character + materials. */

export type CostumePropKind = "main" | "hat" | "cape" | "accessory" | "hand";

export interface CostumeProp {
  id: string;
  emoji: string;
  label: string;
  kind: CostumePropKind;
  /** Normalized center position 0–1 within mirror frame. */
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

const MATERIAL_PROP_RULES: Array<{ re: RegExp; emoji: string; label: string; kind: CostumePropKind }> = [
  { re: /\b(turban|pagri|cap|hat|helmet|crown)\b/i, emoji: "👑", label: "Crown", kind: "hat" },
  { re: /\b(cape|cloak|shawl|dupatta|saree)\b/i, emoji: "🦸", label: "Cape", kind: "cape" },
  { re: /\b(glass|spectacle|goggle)\b/i, emoji: "🕶️", label: "Glasses", kind: "accessory" },
  { re: /\b(mustache|beard|moustache)\b/i, emoji: "🧔", label: "Beard", kind: "accessory" },
  { re: /\b(flag|tricolour|tricolor)\b/i, emoji: "🇮🇳", label: "Flag", kind: "hand" },
  { re: /\b(sword|stick|staff|wand|danda)\b/i, emoji: "🪄", label: "Prop", kind: "hand" },
  { re: /\b(mask|face paint)\b/i, emoji: "🎭", label: "Mask", kind: "accessory" },
  { re: /\b(wig|hair)\b/i, emoji: "💇", label: "Hair", kind: "hat" },
  { re: /\b(badge|medal|ribbon)\b/i, emoji: "🎖️", label: "Badge", kind: "accessory" },
  { re: /\b(mic|microphone)\b/i, emoji: "🎤", label: "Mic", kind: "hand" },
];

const DEFAULT_SLOTS: Array<Pick<CostumeProp, "kind" | "x" | "y" | "scale" | "rotation">> = [
  { kind: "main", x: 0.5, y: 0.2, scale: 1.15, rotation: 0 },
  { kind: "hat", x: 0.5, y: 0.1, scale: 0.85, rotation: -4 },
  { kind: "cape", x: 0.5, y: 0.55, scale: 1, rotation: 0 },
  { kind: "accessory", x: 0.28, y: 0.38, scale: 0.7, rotation: -8 },
  { kind: "hand", x: 0.78, y: 0.62, scale: 0.75, rotation: 12 },
];

const BONUS_PROPS = ["✨", "⭐", "🎉", "💫", "🌟"] as const;

function matchMaterialProp(material: string) {
  for (const rule of MATERIAL_PROP_RULES) {
    if (rule.re.test(material)) return rule;
  }
  return null;
}

/** Build draggable props from costume emoji + DIY materials list. */
export function buildCostumeProps(
  mainEmoji: string,
  costumeLabel: string,
  materials: string[] = [],
): CostumeProp[] {
  const props: CostumeProp[] = [];
  let slotIdx = 0;

  props.push({
    id: "main",
    emoji: mainEmoji,
    label: costumeLabel,
    kind: "main",
    ...DEFAULT_SLOTS[0],
  });
  slotIdx = 1;

  const seen = new Set<string>([mainEmoji]);
  for (const mat of materials) {
    const match = matchMaterialProp(mat);
    if (!match || seen.has(match.emoji)) continue;
    seen.add(match.emoji);
    const slot = DEFAULT_SLOTS[slotIdx] ?? DEFAULT_SLOTS[DEFAULT_SLOTS.length - 1];
    props.push({
      id: `mat-${slotIdx}`,
      emoji: match.emoji,
      label: match.label,
      kind: match.kind,
      x: slot.x + (slotIdx % 2) * 0.04,
      y: slot.y,
      scale: slot.scale,
      rotation: slot.rotation,
    });
    slotIdx += 1;
    if (slotIdx >= 5) break;
  }

  if (props.length < 3) {
    const bonus = BONUS_PROPS[props.length % BONUS_PROPS.length];
    if (!seen.has(bonus)) {
      props.push({
        id: "sparkle",
        emoji: bonus,
        label: "Sparkle",
        kind: "accessory",
        x: 0.72,
        y: 0.28,
        scale: 0.65,
        rotation: 15,
      });
    }
  }

  return props;
}

export function clampPropPosition(x: number, y: number): { x: number; y: number } {
  return {
    x: Math.min(0.92, Math.max(0.08, x)),
    y: Math.min(0.9, Math.max(0.06, y)),
  };
}

export function cloneProps(props: CostumeProp[]): CostumeProp[] {
  return props.map((p) => ({ ...p }));
}
