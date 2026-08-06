/**
 * AmyNest V2 — Design Constitution tokens (P0.1).
 *
 * LOCKED source of truth for presentation craft.
 * Screens must consume these tokens — never invent magic values.
 *
 * Authority: docs/v2/DESIGN_CONSTITUTION.md
 * No architecture · no features · presentation tokens only.
 */

/** Constitution easing — soft settle (one curve). */
export const V2_EASE = [0.22, 1, 0.36, 1] as const;

/** Spacing ladder (px) — 8 → 64 only. */
export const V2_SPACE_PX = {
  1: 8,
  2: 16,
  3: 24,
  4: 32,
  5: 40,
  6: 48,
  7: 56,
  8: 64,
} as const;

/**
 * Spacing ladder as Tailwind classes.
 * Prefer these over gap-3 / px-4 / space-y-5 magic.
 */
export const V2_SPACE = {
  /** 8 — tight internal */
  1: "gap-2",
  stack1: "space-y-2",
  p1: "p-2",
  px1: "px-2",
  py1: "py-2",
  pt1: "pt-2",
  pb1: "pb-2",
  mt1: "mt-2",
  mb1: "mb-2",
  /** 16 — related */
  2: "gap-4",
  stack2: "space-y-4",
  p2: "p-4",
  px2: "px-4",
  py2: "py-4",
  pt2: "pt-4",
  pb2: "pb-4",
  mt2: "mt-4",
  mb2: "mb-4",
  /** 24 — edge · plate pad */
  3: "gap-6",
  stack3: "space-y-6",
  p3: "p-6",
  px3: "px-6",
  py3: "py-6",
  pt3: "pt-6",
  pb3: "pb-6",
  mt3: "mt-6",
  mb3: "mb-6",
  /** 32 — hero→action · top pad */
  4: "gap-8",
  stack4: "space-y-8",
  p4: "p-8",
  px4: "px-8",
  py4: "py-8",
  pt4: "pt-8",
  pb4: "pb-8",
  mt4: "mt-8",
  mb4: "mb-8",
  pl4: "pl-8",
  /** 40 — chapter min */
  5: "gap-10",
  stack5: "space-y-10",
  py5: "py-10",
  pt5: "pt-10",
  pb5: "pb-10",
  mt5: "mt-10",
  mb5: "mb-10",
  /** 48 — chapter preferred */
  6: "gap-12",
  stack6: "space-y-12",
  /** 56 — major breath · nav content */
  7: "gap-14",
  h7: "h-14",
  /** 64 — ritual · clearance unit */
  8: "gap-16",
  py8: "py-16",
  h8: "h-16",
  /** Shell / rhythm roles */
  edgeX: "px-6",
  shellY: "py-8",
  chapter: "gap-12",
  chapterMin: "gap-10",
  heroStack: "space-y-4",
  /** Section / list / CTA pair — related (16) */
  sectionStack: "space-y-4",
  listGap: "gap-4",
  ctaStack: "gap-4",
  /** Body → primary action pause (32) */
  actionPause: "mt-8",
  /** Soft Plate / Sheet pad (24) */
  platePad: "p-6",
  sheetPad: "p-6",
  /** Focus / chip instrument pad */
  chipPad: "px-4 py-2",
  /** Row pad inside lists */
  rowPad: "px-4 py-4",
} as const;

/**
 * Type roles — Constitution §1.
 * Values bind to nest-presence-system.css (--v2-type-*).
 * Locked optical sizes: Hero 36 · Body 17 · Caption 13 · CTA 16.
 */
export const V2_TYPE = {
  hero: "text-[length:var(--v2-type-hero)] font-normal leading-[var(--v2-type-hero-leading)] tracking-[var(--v2-type-hero-tracking)] text-foreground",
  /** Same optical hero — constrained measure only (never a second size). */
  heroCompact:
    "text-[length:var(--v2-type-hero)] font-normal leading-[var(--v2-type-hero-leading)] tracking-[var(--v2-type-hero-tracking)] text-foreground",
  body: "text-[length:var(--v2-type-body)] font-normal leading-[var(--v2-type-body-leading)] tracking-normal text-foreground",
  bodyMuted:
    "text-[length:var(--v2-type-body)] font-normal leading-[var(--v2-type-body-leading)] tracking-normal text-muted-foreground",
  caption:
    "text-[length:var(--v2-type-caption)] font-normal leading-[var(--v2-type-caption-leading)] tracking-[var(--v2-type-caption-tracking)] text-muted-foreground",
  captionInk:
    "text-[length:var(--v2-type-caption)] font-normal leading-[var(--v2-type-caption-leading)] tracking-[var(--v2-type-caption-tracking)] text-foreground",
  cta: "text-[length:var(--v2-type-cta)] font-medium leading-[var(--v2-type-cta-leading)] tracking-normal",
  /** Quiet wordmark — never competes with hero. */
  brandMark:
    "text-[length:var(--v2-type-caption)] font-normal leading-[var(--v2-type-caption-leading)] tracking-[var(--v2-type-caption-tracking)] text-muted-foreground",
} as const;

/** Radius locks — Constitution §2 / §7 → --v2-radius-*. */
export const V2_RADIUS = {
  button: "rounded-[var(--v2-radius-button)]",
  plate: "rounded-[var(--v2-radius-plate)]",
  field: "rounded-[var(--v2-radius-field)]",
  pill: "rounded-[var(--v2-radius-pill)]",
} as const;

/** Blur — Sheet Glass family 20–24 → --v2-blur-*. */
export const V2_BLUR = {
  sheet: "backdrop-blur-[length:var(--v2-blur-sheet)]",
  nav: "backdrop-blur-[length:var(--v2-blur-nav)]",
} as const;

/**
 * Surface fill — Constitution §3 (P0.4 manufactured opacities).
 * Soft Plate 6–10% · Sheet Glass 8–12% · selected = denser Soft Plate (never kit border).
 */
export const V2_SURFACE_FILL = {
  /** Soft Plate — 8% light over Atmosphere */
  softPlate: "bg-[var(--v2-fill-soft-plate)]",
  /** Selected Soft Plate — denser settle, not Bloom rim */
  softPlateSelected: "bg-[var(--v2-fill-soft-plate-selected)]",
  /** Sheet Glass tint — ~10% with blur */
  sheetGlass: "bg-[var(--v2-fill-sheet)]",
  /** Elevated Plate fill = Soft Plate + lift */
  elevated: "bg-[var(--v2-fill-soft-plate)]",
} as const;

/** Elevation — shadow communicates lift only, never decoration. */
export const V2_ELEVATION = {
  none: "shadow-none",
  /** Reserved — Soft Plate must stay flat (do not apply to Soft Plate) */
  plate: "shadow-none",
  /** One elevated step — y:8 · blur:24 · α ≤ 12% */
  elevated: "shadow-[var(--v2-elevation-elevated)]",
  /** Bloom CTA energy — action only */
  bloom: "shadow-[var(--v2-elevation-bloom)]",
} as const;

/** Edge — luminous rim ≤8% or none. Hard kit borders forbidden. */
export const V2_BORDER = {
  none: "border-0",
  /** Luminous rim ≤8% */
  rim: "border border-[var(--v2-rim)]",
  /** @deprecated P0.4 — kit hairline removed; aliases to rim */
  hairline: "border border-[var(--v2-rim)]",
} as const;

/**
 * Atmosphere — default field. Most content floats here with no plate.
 * Scrim dims atmosphere under Sheet Glass (no second glass blur).
 */
export const V2_ATMOSPHERE = "bg-background";
export const V2_ATMOSPHERE_SCRIM = "bg-[var(--v2-scrim)]";

/**
 * Glow / emit class names — lived by lighting.css (P0.5).
 * Bloom = light escaping · Orb = soft ambient · never neon ring.
 */
export const V2_GLOW = {
  none: "",
  bloom: "v2-bloom-light",
  orb: "v2-orb-emit",
} as const;

/** Motion durations (ms) — Constitution §8. */
export const V2_DURATION_MS = {
  micro: 120,
  ui: 220,
  page: 320,
  ritual: 480,
  celebrationMax: 1000,
} as const;

/** Fade enter rise (px). */
export const V2_FADE_RISE_PX = 8;

/** Press scale — Constitution §2. */
export const V2_PRESS_SCALE = 0.97;

/** Button anatomy — Constitution §2 · 52 × 26. Overrides kit size heights. */
export const V2_BUTTON = {
  height:
    "h-[length:var(--v2-button-height)] min-h-[length:var(--v2-button-height)]",
  padX: "px-6",
  radius: V2_RADIUS.button,
  width: "w-full",
  type: V2_TYPE.cta,
} as const;

/**
 * Layout / measure roles — shell geometry only (not spacing invent).
 * Screens must not invent min-h / z / measure magic.
 */
export const V2_LAYOUT = {
  /** Full ritual viewport */
  viewport: "min-h-[100dvh]",
  /** Primary stage breath */
  stage: "min-h-[50vh]",
  /** Support stage breath */
  supportStage: "min-h-[40vh]",
  /** Bottom sheet / dialog stacking */
  sheetZ: "z-[80]",
} as const;

/** Optical measure — line length / sheet width. */
export const V2_MEASURE = {
  hero: "max-w-[18ch]",
  /** Body / support column */
  support: "max-w-[length:var(--v2-measure-support)]",
  /** Sheet Glass dialog width */
  sheet: "max-w-[length:var(--v2-sheet-max)]",
  /** Shell column (alias --v2-shell-max) */
  shell: "max-w-[length:var(--v2-shell-max)]",
} as const;

/**
 * Navigation — Constitution §4 whisper instrument.
 * Sheet Glass · soft-fill active · no underline · no shelf · no Bloom on chrome.
 */
export const V2_NAV = {
  height: "h-14",
  heightPx: V2_SPACE_PX[7],
  icon: "h-[length:var(--v2-icon-nav)] w-[length:var(--v2-icon-nav)] shrink-0",
  iconLabelGap: "gap-2",
  blur: V2_BLUR.nav,
  padX: "px-2",
  /** Safe area under content height 56 */
  safeBottom: "pb-[env(safe-area-inset-bottom,0px)]",
  /** Sheet Glass bar — no border shelf, no upward shadow */
  bar: [
    "w-full",
    V2_SURFACE_FILL.sheetGlass,
    V2_BLUR.nav,
    "border-0",
    "shadow-none",
  ].join(" "),
  /** Soft fill active — light, not primary color bar */
  tabActive: [
    "rounded-[var(--v2-radius-nav-active)]",
    "bg-foreground/[0.06]",
    "text-foreground",
    "font-medium",
  ].join(" "),
  /** Quiet inactive — mist, no outline noise */
  tabInactive: "text-muted-foreground font-normal",
  /** Caption label on tabs */
  label: V2_TYPE.caption,
  /** Progress track — hairline light, not Bloom */
  progressTrack: "h-1 w-full overflow-hidden rounded-full bg-foreground/[0.06]",
  progressFill: "h-full rounded-full bg-foreground/25",
} as const;

/** Orb presence — size + emit (ambient influence, not halo). */
export const V2_ORB = {
  md: "h-[length:var(--v2-orb-md)] w-[length:var(--v2-orb-md)]",
  lg: "h-[length:var(--v2-orb-lg)] w-[length:var(--v2-orb-lg)]",
  /** Threshold / ritual presence — one optical size */
  presence:
    "h-[length:var(--v2-orb-presence)] w-[length:var(--v2-orb-presence)]",
  /** Soft ambient emit — alias V2_ORB_EMIT */
  ring: V2_GLOW.orb,
  emit: V2_GLOW.orb,
} as const;

/** Lighting preset ids — Constitution §5 (lived P0.5). */
export const V2_LIGHT = {
  morning: "morning",
  evening: "evening",
  night: "night",
} as const;

export type V2LightPreset = (typeof V2_LIGHT)[keyof typeof V2_LIGHT];

/**
 * Soft Plate — Constitution §3.
 * Flat settle · luminous rim · no blur (blur is Sheet Glass only).
 */
export const V2_SOFT_PLATE = [
  V2_RADIUS.plate,
  V2_SURFACE_FILL.softPlate,
  V2_BORDER.rim,
  V2_ELEVATION.none,
].join(" ");

/**
 * Sheet Glass — Constitution §3 / §4.
 * Blur 24 · tint · luminous rim · one rise shadow.
 */
export const V2_SHEET_GLASS = [
  V2_RADIUS.plate,
  V2_SURFACE_FILL.sheetGlass,
  V2_BORDER.rim,
  V2_ELEVATION.elevated,
  V2_BLUR.sheet,
].join(" ");

/**
 * Elevated Plate — Soft Plate + one lift. No glass blur.
 */
export const V2_ELEVATED_PLATE = [
  V2_RADIUS.plate,
  V2_SURFACE_FILL.elevated,
  V2_BORDER.rim,
  V2_ELEVATION.elevated,
].join(" ");

/** Soft Plate field — input radius 20. */
export const V2_FIELD = [
  V2_RADIUS.field,
  V2_SURFACE_FILL.softPlate,
  V2_BORDER.rim,
  V2_ELEVATION.none,
].join(" ");

/** Soft Plate chip / pill — no border kit. */
export const V2_CHIP = [
  V2_RADIUS.pill,
  V2_SURFACE_FILL.softPlate,
  V2_BORDER.none,
  V2_ELEVATION.none,
].join(" ");

/** Primary Bloom CTA silhouette — 52 × 26. */
export const V2_BLOOM_CTA = [
  V2_BUTTON.height,
  V2_BUTTON.width,
  V2_BUTTON.padX,
  V2_BUTTON.radius,
  V2_BUTTON.type,
].join(" ");

/** Secondary Soft Plate CTA — same anatomy, peer material (not Bloom). */
export const V2_SECONDARY_CTA = [
  V2_BUTTON.height,
  V2_BUTTON.width,
  V2_BUTTON.padX,
  V2_BUTTON.radius,
  V2_BUTTON.type,
  V2_SOFT_PLATE,
].join(" ");

/** Ghost / tertiary CTA — Atmosphere breath, same height family. */
export const V2_GHOST_CTA = [
  V2_BUTTON.height,
  V2_BUTTON.width,
  V2_BUTTON.padX,
  V2_BUTTON.radius,
  V2_BUTTON.type,
].join(" ");

/**
 * Scroll clearance — nav content 56 + space.1 breathing, floored at space.8 (64)
 * plus safe-area. Replaces magic pb-28.
 */
export const V2_SCROLL_CLEARANCE =
  "pb-[calc(var(--v2-space-8)+env(safe-area-inset-bottom,0px))]";

/** Standard tabbed shell — one column rhythm for all V2 pages. */
export const V2_SHELL = [
  "mx-auto flex w-full max-w-[var(--v2-shell-max)] flex-col",
  V2_SPACE.edgeX,
  V2_SPACE.shellY,
  V2_SPACE.chapter,
].join(" ");

/** Ritual shell (Front Door) — edge + safe top; chapter air inside steps. */
export const V2_SHELL_RITUAL = [
  "mx-auto flex w-full max-w-[var(--v2-shell-max)] flex-1 flex-col",
  V2_SPACE.edgeX,
  V2_SPACE.pb5,
  "pt-[max(1.5rem,env(safe-area-inset-top))]",
].join(" ");
