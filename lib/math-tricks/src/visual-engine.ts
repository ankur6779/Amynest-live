/**
 * Visual Math Engine — framework-agnostic core.
 *
 * Math tricks are expressed as a *config of actions* (never hardcoded UI):
 *
 *   {
 *     operation: "near_double",
 *     objectKind: "dot",
 *     result: 13,
 *     meta: { insight: "neighbor_number", strategy: "double_then_add_one" },
 *     steps: [
 *       { action: "show", count: 6 },
 *       { action: "duplicate", count: 6 },
 *       { action: "add", count: 1 },
 *       { action: "merge", result: 13 },
 *     ],
 *   }
 *
 * `deriveSnapshots()` interprets that config into an ordered list of
 * `SceneSnapshot`s — one per step — describing exactly which objects live in
 * which container, the running total, captions, narration, tokenized equation
 * and thinking-layer emphasis. The React renderer simply animates the diff
 * between consecutive snapshots, so the engine stays pure, testable and
 * reusable for any new concept (addition … and, later, fractions / algebra).
 */

// ─── Object vocabulary ──────────────────────────────────────────────────────

export type VisualObjectKind =
  | "dot"
  | "star"
  | "block"
  | "candy"
  | "apple"
  | "bubble";

/** The full generic action vocabulary every trick is built from. */
export type VisualMathAction =
  | "show"
  | "add"
  | "remove"
  | "duplicate"
  | "group"
  | "split"
  | "merge"
  | "distribute"
  | "highlight"
  | "celebrate";

export type ContainerRole =
  | "free"
  | "addend"
  | "result"
  | "row"
  | "basket"
  | "pile";

// ─── Cognition metadata (Phase 1 — Thinking Visualization) ───────────────────

/** The mental strategy a trick teaches — drives emotional praise + insights. */
export type MathStrategy =
  | "count_all"
  | "count_on"
  | "doubling"
  | "double_then_add_one"
  | "take_away"
  | "equal_groups"
  | "equal_sharing";

/** The conceptual relationship the thinking layer should make visible. */
export type InsightKind =
  | "neighbor_number"
  | "make_a_double"
  | "count_on"
  | "take_away"
  | "equal_groups"
  | "fair_share";

export interface SequenceMeta {
  /** The "why it works" relationship, surfaced by the InsightLayer. */
  insight?: InsightKind;
  /** The mental strategy this trick teaches. */
  strategy?: MathStrategy;
  /** Short plain-language reason shown in the thinking layer. */
  insightLine?: string;
  /** Quality-of-thinking praise spoken / shown on success (Phase 3). */
  praise?: string;
}

/** A semantic token of an equation, so the renderer can highlight by meaning. */
export interface EquationPart {
  text: string;
  role?: "a" | "b" | "extra" | "result" | "op" | "muted";
}

/** Thinking-layer emphasis attached to a step (Phase 1). */
export interface StepEmphasis {
  /** Container id to spotlight. */
  target?: string;
  /** Short annotation, e.g. "+1 more". */
  note?: string;
  /** Relationship being demonstrated. */
  relation?: "neighbor" | "double" | "group" | "share" | "take_away";
}

export interface VisualStep {
  action: VisualMathAction;
  count?: number;
  result?: number;
  kind?: VisualObjectKind;
  color?: string;
  into?: string;
  from?: string;
  groups?: number;
  label?: string;
  caption?: string;
  narration?: string;
  /** Slower, explanatory narration used by Replay-Thinking mode (Phase 6). */
  thinkingNarration?: string;
  equation?: string;
  /** Tokenized equation for semantic morphing (Phase 2). */
  equationParts?: EquationPart[];
  /** Thinking-layer emphasis (Phase 1). */
  emphasis?: StepEmphasis;
}

export interface VisualMathSequence {
  operation: string;
  objectKind: VisualObjectKind;
  result: number;
  equation?: string;
  meta?: SequenceMeta;
  steps: VisualStep[];
}

// ─── Derived scene state (what the renderer consumes) ─────────────────────────

export interface SceneObject {
  id: string;
  kind: VisualObjectKind;
  color: string;
  container: string;
  highlight: boolean;
}

export interface SceneContainer {
  id: string;
  role: ContainerRole;
  color: string;
  label?: string;
}

export interface SceneSnapshot {
  step: number;
  objects: SceneObject[];
  containers: SceneContainer[];
  total: number | null;
  caption?: string;
  narration?: string;
  thinkingNarration?: string;
  equation?: string;
  equationParts?: EquationPart[];
  /** Emphasis annotation active on this step (Phase 1). */
  emphasisNote?: string;
  emphasisRelation?: StepEmphasis["relation"];
  celebrate: boolean;
}

// ─── Default palette (brand tokens, resolved in CSS) ──────────────────────────

const ROLE_COLORS: Record<ContainerRole, string> = {
  free: "hsl(var(--brand-amber-400))",
  addend: "hsl(var(--brand-amber-400))",
  result: "hsl(var(--brand-green-400))",
  row: "hsl(var(--brand-violet-400))",
  basket: "hsl(var(--brand-sky-400))",
  pile: "hsl(var(--brand-amber-400))",
};

const SECONDARY = "hsl(var(--brand-sky-400))";

// ─── Interpreter ──────────────────────────────────────────────────────────────

interface WorkState {
  objects: SceneObject[];
  containers: Map<string, SceneContainer>;
  total: number | null;
  counter: number;
}

function ensureContainer(
  state: WorkState,
  id: string,
  role: ContainerRole,
  color?: string,
  label?: string,
): SceneContainer {
  const existing = state.containers.get(id);
  if (existing) {
    if (label !== undefined) existing.label = label;
    return existing;
  }
  const container: SceneContainer = {
    id,
    role,
    color: color ?? ROLE_COLORS[role],
    label,
  };
  state.containers.set(id, container);
  return container;
}

function spawn(
  state: WorkState,
  containerId: string,
  count: number,
  kind: VisualObjectKind,
  color: string,
  highlight = false,
): void {
  for (let i = 0; i < count; i++) {
    state.objects.push({
      id: `o${state.counter++}`,
      kind,
      color,
      container: containerId,
      highlight,
    });
  }
}

function liveContainers(state: WorkState): SceneContainer[] {
  const used = new Set(state.objects.map((o) => o.container));
  return [...state.containers.values()].filter((c) => used.has(c.id));
}

function snapshot(
  state: WorkState,
  step: number,
  meta: {
    caption?: string;
    narration?: string;
    thinkingNarration?: string;
    equation?: string;
    equationParts?: EquationPart[];
    emphasisNote?: string;
    emphasisRelation?: StepEmphasis["relation"];
    celebrate?: boolean;
  },
): SceneSnapshot {
  return {
    step,
    objects: state.objects.map((o) => ({ ...o })),
    containers: liveContainers(state).map((c) => ({ ...c })),
    total: state.total,
    caption: meta.caption,
    narration: meta.narration,
    thinkingNarration: meta.thinkingNarration,
    equation: meta.equation,
    equationParts: meta.equationParts,
    emphasisNote: meta.emphasisNote,
    emphasisRelation: meta.emphasisRelation,
    celebrate: meta.celebrate ?? false,
  };
}

/**
 * Interpret a sequence config into one snapshot per step. The renderer animates
 * the transition between snapshots[i-1] and snapshots[i].
 */
export function deriveSnapshots(sequence: VisualMathSequence): SceneSnapshot[] {
  const state: WorkState = {
    objects: [],
    containers: new Map(),
    total: null,
    counter: 0,
  };
  const out: SceneSnapshot[] = [];
  let lastEquation: string | undefined;
  let lastParts: EquationPart[] | undefined;

  sequence.steps.forEach((step, index) => {
    const kind = step.kind ?? sequence.objectKind;
    for (const o of state.objects) o.highlight = false;

    switch (step.action) {
      case "show": {
        const id = step.into ?? "a";
        const c = ensureContainer(state, id, "addend", step.color, step.label);
        spawn(state, id, step.count ?? 0, kind, step.color ?? c.color);
        break;
      }
      case "add": {
        const id = step.into ?? "b";
        const c = ensureContainer(state, id, "addend", step.color ?? SECONDARY, step.label);
        spawn(state, id, step.count ?? 0, kind, step.color ?? c.color, !!step.emphasis);
        break;
      }
      case "duplicate": {
        const fromId = step.from ?? "a";
        const intoId = step.into ?? "b";
        const source = state.objects.filter((o) => o.container === fromId);
        const c = ensureContainer(state, intoId, "addend", step.color ?? SECONDARY, step.label);
        const n = step.count ?? source.length;
        for (let i = 0; i < n; i++) {
          const src = source[i % Math.max(source.length, 1)];
          state.objects.push({
            id: `o${state.counter++}`,
            kind: src?.kind ?? kind,
            color: step.color ?? c.color,
            container: intoId,
            highlight: true,
          });
        }
        break;
      }
      case "remove": {
        const fromId =
          step.from ?? [...state.containers.values()].slice(-1)[0]?.id ?? "a";
        let n = step.count ?? 0;
        for (let i = state.objects.length - 1; i >= 0 && n > 0; i--) {
          if (state.objects[i].container === fromId) {
            state.objects.splice(i, 1);
            n--;
          }
        }
        break;
      }
      case "merge": {
        const intoId = step.into ?? "result";
        ensureContainer(state, intoId, "result", step.color, step.label);
        for (const o of state.objects) {
          o.container = intoId;
          if (step.color) o.color = step.color;
        }
        break;
      }
      case "group": {
        const groups = Math.max(step.groups ?? 1, 1);
        const objs = state.objects;
        const perGroup = Math.ceil(objs.length / groups);
        objs.forEach((o, i) => {
          const g = Math.floor(i / perGroup);
          const id = `row-${g}`;
          ensureContainer(state, id, "row", step.color);
          o.container = id;
        });
        break;
      }
      case "split": {
        const fromId = step.from ?? "a";
        const groups = Math.max(step.groups ?? 2, 2);
        const objs = state.objects.filter((o) => o.container === fromId);
        const perGroup = Math.ceil(objs.length / groups);
        objs.forEach((o, i) => {
          const g = Math.floor(i / perGroup);
          const id = `split-${g}`;
          ensureContainer(state, id, "addend", step.color);
          o.container = id;
        });
        break;
      }
      case "distribute": {
        const fromId = step.from ?? "pile";
        const groups = Math.max(step.groups ?? 1, 1);
        const objs = state.objects.filter((o) => o.container === fromId);
        for (let g = 0; g < groups; g++) {
          ensureContainer(
            state,
            `basket-${g}`,
            "basket",
            step.color,
            step.label ? `${step.label} ${g + 1}` : undefined,
          );
        }
        objs.forEach((o, i) => {
          o.container = `basket-${i % groups}`;
          o.highlight = true;
        });
        break;
      }
      case "highlight": {
        const fromId = step.from ?? step.emphasis?.target;
        for (const o of state.objects) {
          if (!fromId || o.container === fromId) o.highlight = true;
        }
        break;
      }
      case "celebrate": {
        for (const o of state.objects) o.highlight = true;
        break;
      }
    }

    // Emphasis can spotlight a specific container regardless of action.
    if (step.emphasis?.target) {
      for (const o of state.objects) {
        if (o.container === step.emphasis.target) o.highlight = true;
      }
    }

    if (step.result !== undefined) state.total = step.result;
    else if (step.action === "show" || step.action === "add" || step.action === "duplicate") {
      state.total = state.objects.length;
    }

    if (step.equation !== undefined) lastEquation = step.equation;
    if (step.equationParts !== undefined) lastParts = step.equationParts;

    out.push(
      snapshot(state, index, {
        caption: step.caption,
        narration: step.narration,
        thinkingNarration: step.thinkingNarration ?? step.narration,
        equation: step.equation ?? lastEquation,
        equationParts: step.equationParts ?? lastParts,
        emphasisNote: step.emphasis?.note,
        emphasisRelation: step.emphasis?.relation,
        celebrate: step.action === "celebrate",
      }),
    );
  });

  return out;
}

// ─── Declarative spec → config builders ───────────────────────────────────────

export type VisualSequenceSpec =
  | { kind: "addition"; a: number; b: number; object?: VisualObjectKind }
  | { kind: "subtraction"; a: number; b: number; object?: VisualObjectKind }
  | { kind: "multiplication"; rows: number; per: number; object?: VisualObjectKind }
  | { kind: "division"; total: number; groups: number; object?: VisualObjectKind }
  | { kind: "double"; n: number; object?: VisualObjectKind }
  | { kind: "near_double"; small: number; object?: VisualObjectKind };

export const MAX_SCENE_OBJECTS = 30;

export function specObjectCount(spec: VisualSequenceSpec): number {
  switch (spec.kind) {
    case "addition":
    case "subtraction":
      return spec.a + spec.b;
    case "multiplication":
      return spec.rows * spec.per;
    case "division":
      return spec.total;
    case "double":
      return spec.n * 2;
    case "near_double":
      return spec.small * 2 + 1;
  }
}

export function specIsRenderable(spec: VisualSequenceSpec): boolean {
  return specObjectCount(spec) <= MAX_SCENE_OBJECTS;
}

const AMBER = "hsl(var(--brand-amber-400))";
const CYAN = "hsl(var(--brand-sky-400))";
const GREEN = "hsl(var(--brand-green-400))";

const OP = (text: string): EquationPart => ({ text, role: "op" });

/** "4 + 4 + 4" tokenized as repeated-addition parts. */
function repeatedAdditionParts(value: number, times: number): EquationPart[] {
  const parts: EquationPart[] = [];
  for (let i = 0; i < times; i++) {
    if (i > 0) parts.push(OP("+"));
    parts.push({ text: String(value), role: i % 2 === 0 ? "a" : "b" });
  }
  return parts;
}

function skipCountList(value: number, times: number): string {
  return Array.from({ length: times }, (_, i) => value * (i + 1)).join(", ");
}

export function buildVisualSequence(spec: VisualSequenceSpec): VisualMathSequence {
  switch (spec.kind) {
    case "addition": {
      const { a, b } = spec;
      const object = spec.object ?? "dot";
      return {
        operation: "addition",
        objectKind: object,
        result: a + b,
        equation: `${a} + ${b} = ${a + b}`,
        meta: {
          insight: "count_on",
          strategy: "count_all",
          insightLine: "Put both groups together to find how many in all.",
          praise: "You added them up!",
        },
        steps: [
          {
            action: "show",
            count: a,
            into: "a",
            color: AMBER,
            caption: `Here are ${a}.`,
            narration: `First we have ${a}.`,
            thinkingNarration: `Start with a group of ${a}.`,
            equationParts: [{ text: String(a), role: "a" }],
          },
          {
            action: "add",
            count: b,
            into: "b",
            color: CYAN,
            caption: `${b} more slide in.`,
            narration: `Now ${b} more come along.`,
            thinkingNarration: `Bring in ${b} more.`,
            equationParts: [
              { text: String(a), role: "a" },
              OP("+"),
              { text: String(b), role: "b" },
            ],
          },
          {
            action: "merge",
            into: "result",
            color: GREEN,
            result: a + b,
            caption: "Put them together…",
            narration: "Push them together and count.",
            thinkingNarration: "Count them all as one group.",
            equationParts: [
              { text: String(a), role: "a" },
              OP("+"),
              { text: String(b), role: "b" },
            ],
          },
          {
            action: "celebrate",
            result: a + b,
            equation: `${a} + ${b} = ${a + b}`,
            caption: `${a} and ${b} make ${a + b}!`,
            narration: `${a} plus ${b} equals ${a + b}!`,
            equationParts: [{ text: String(a + b), role: "result" }],
          },
        ],
      };
    }

    case "subtraction": {
      const { a, b } = spec;
      const object = spec.object ?? "apple";
      return {
        operation: "subtraction",
        objectKind: object,
        result: a - b,
        equation: `${a} − ${b} = ${a - b}`,
        meta: {
          insight: "take_away",
          strategy: "take_away",
          insightLine: `${b} go away — the rest stay.`,
          praise: "You took them away!",
        },
        steps: [
          {
            action: "show",
            count: a,
            into: "a",
            color: AMBER,
            result: a,
            caption: `We start with ${a}.`,
            narration: `We start with ${a}.`,
            thinkingNarration: `Here are ${a} to begin.`,
            equationParts: [{ text: String(a), role: "a" }],
          },
          {
            action: "remove",
            count: b,
            from: "a",
            result: a - b,
            caption: `${b} float away…`,
            narration: `Take ${b} away — watch them fly off.`,
            thinkingNarration: `Take ${b} away, one at a time.`,
            emphasis: { relation: "take_away", note: `−${b}` },
            equationParts: [
              { text: String(a), role: "a" },
              OP("−"),
              { text: String(b), role: "muted" },
            ],
          },
          {
            action: "celebrate",
            result: a - b,
            equation: `${a} − ${b} = ${a - b}`,
            caption: `${a - b} are left!`,
            narration: `${a} take away ${b} leaves ${a - b}!`,
            equationParts: [{ text: String(a - b), role: "result" }],
          },
        ],
      };
    }

    case "multiplication": {
      const { rows, per } = spec;
      const object = spec.object ?? "star";
      const total = rows * per;
      const steps: VisualStep[] = [];
      for (let r = 0; r < rows; r++) {
        steps.push({
          action: r === 0 ? "show" : "add",
          count: per,
          into: `row-${r}`,
          color: r % 2 === 0 ? AMBER : CYAN,
          caption: `Group ${r + 1}: ${per} in a row.`,
          narration: `Group ${r + 1} of ${rows}: ${per}.`,
          thinkingNarration: `That makes ${(r + 1) * per} so far.`,
          equationParts: repeatedAdditionParts(per, r + 1),
        });
      }
      steps.push({
        action: "highlight",
        result: total,
        caption: `${rows} groups of ${per} — count by ${per}s.`,
        narration: `Skip count: ${skipCountList(per, rows)}.`,
        thinkingNarration: `${rows} groups of ${per} is the same as ${Array.from({ length: rows }, () => per).join(" plus ")}.`,
        equationParts: [
          ...repeatedAdditionParts(per, rows),
          OP("="),
          { text: String(total), role: "result" },
        ],
      });
      steps.push({
        action: "celebrate",
        result: total,
        equation: `${rows} × ${per} = ${total}`,
        caption: `${rows} × ${per} = ${total}!`,
        narration: `${rows} groups of ${per} makes ${total}!`,
        equationParts: [{ text: String(total), role: "result" }],
      });
      return {
        operation: "multiplication",
        objectKind: object,
        result: total,
        equation: `${rows} × ${per} = ${total}`,
        meta: {
          insight: "equal_groups",
          strategy: "equal_groups",
          insightLine: `${rows} equal groups of ${per} — that's repeated addition.`,
          praise: "That was smart grouping!",
        },
        steps,
      };
    }

    case "division": {
      const { total, groups } = spec;
      const object = spec.object ?? "candy";
      const each = Math.floor(total / groups);
      return {
        operation: "division",
        objectKind: object,
        result: each,
        equation: `${total} ÷ ${groups} = ${each}`,
        meta: {
          insight: "fair_share",
          strategy: "equal_sharing",
          insightLine: "Share fairly — the same amount in each basket.",
          praise: "You shared equally!",
        },
        steps: [
          {
            action: "show",
            count: total,
            into: "pile",
            color: AMBER,
            result: total,
            caption: `${total} to share.`,
            narration: `We have ${total} to share.`,
            thinkingNarration: `Here are ${total} to share out.`,
            equationParts: [{ text: String(total), role: "a" }],
          },
          {
            action: "distribute",
            from: "pile",
            groups,
            color: CYAN,
            label: "Basket",
            result: each,
            caption: `Share into ${groups} baskets…`,
            narration: `Share them fairly into ${groups} baskets.`,
            thinkingNarration: `Give one to each basket, again and again, until none are left.`,
            emphasis: { relation: "share" },
            equationParts: [
              { text: String(total), role: "a" },
              OP("÷"),
              { text: String(groups), role: "b" },
            ],
          },
          {
            action: "celebrate",
            result: each,
            equation: `${total} ÷ ${groups} = ${each}`,
            caption: `${each} in each basket!`,
            narration: `Each basket gets ${each}!`,
            equationParts: [{ text: String(each), role: "result" }],
          },
        ],
      };
    }

    case "double": {
      const { n } = spec;
      const object = spec.object ?? "dot";
      return {
        operation: "double",
        objectKind: object,
        result: n * 2,
        equation: `${n} + ${n} = ${n * 2}`,
        meta: {
          insight: "make_a_double",
          strategy: "doubling",
          insightLine: `Two equal groups of ${n}.`,
          praise: "You doubled it!",
        },
        steps: [
          {
            action: "show",
            count: n,
            into: "a",
            color: AMBER,
            caption: `Here are ${n}.`,
            narration: `Start with ${n}.`,
            thinkingNarration: `Start with one group of ${n}.`,
            equationParts: [{ text: String(n), role: "a" }],
          },
          {
            action: "duplicate",
            count: n,
            from: "a",
            into: "b",
            color: CYAN,
            caption: `Make another ${n}!`,
            narration: `Make a matching ${n}.`,
            thinkingNarration: `Make a second group exactly the same — ${n} again.`,
            emphasis: { relation: "double", target: "b", note: `another ${n}` },
            equationParts: [
              { text: String(n), role: "a" },
              OP("+"),
              { text: String(n), role: "b" },
            ],
          },
          {
            action: "merge",
            into: "result",
            color: GREEN,
            result: n * 2,
            caption: "Put both sets together…",
            narration: "Push both sets together.",
            thinkingNarration: `Two ${n}s join into one group.`,
            equationParts: [
              { text: String(n), role: "a" },
              OP("+"),
              { text: String(n), role: "b" },
            ],
          },
          {
            action: "celebrate",
            result: n * 2,
            equation: `${n} + ${n} = ${n * 2}`,
            caption: `Double ${n} is ${n * 2}!`,
            narration: `Double ${n} is ${n * 2}!`,
            equationParts: [{ text: String(n * 2), role: "result" }],
          },
        ],
      };
    }

    case "near_double": {
      const { small } = spec;
      const big = small + 1;
      const object = spec.object ?? "dot";
      return {
        operation: "near_double",
        objectKind: object,
        result: small + big,
        equation: `${small} + ${big} = ${small + big}`,
        meta: {
          insight: "neighbor_number",
          strategy: "double_then_add_one",
          insightLine: `${big} is just 1 more than ${small}.`,
          praise: "You found the shortcut!",
        },
        steps: [
          {
            action: "show",
            count: small,
            into: "a",
            color: AMBER,
            caption: `${small} appear.`,
            narration: `First, ${small}.`,
            thinkingNarration: `We want ${small} plus ${big}.`,
            equationParts: [
              { text: String(small), role: "a" },
              OP("+"),
              { text: String(big), role: "b" },
            ],
          },
          {
            action: "duplicate",
            count: small,
            from: "a",
            into: "b",
            color: CYAN,
            caption: `Double it — make another ${small}.`,
            narration: `Double ${small} is ${small * 2}.`,
            thinkingNarration: `${big} is just one more than ${small}, so make two ${small}s.`,
            emphasis: { relation: "double", target: "b", note: `double ${small}` },
            equationParts: [
              { text: String(small), role: "a" },
              OP("+"),
              { text: String(small), role: "b" },
              OP("+"),
              { text: "1", role: "extra" },
            ],
          },
          {
            action: "add",
            count: 1,
            into: "b",
            color: GREEN,
            caption: "One extra jumps in.",
            narration: "Then add just one more.",
            thinkingNarration: "Add the one extra — that's the neighbour number.",
            emphasis: { relation: "neighbor", target: "b", note: "+1 more" },
            equationParts: [
              { text: String(small), role: "a" },
              OP("+"),
              { text: String(small), role: "b" },
              OP("+"),
              { text: "1", role: "extra" },
            ],
          },
          {
            action: "merge",
            into: "result",
            color: GREEN,
            result: small + big,
            caption: "Combine them all…",
            narration: "Put them together.",
            thinkingNarration: `${small * 2} and 1 more.`,
            equationParts: [
              { text: String(small * 2), role: "result" },
              OP("+"),
              { text: "1", role: "extra" },
            ],
          },
          {
            action: "celebrate",
            result: small + big,
            equation: `${small} + ${big} = ${small + big}`,
            caption: `Now we have ${small + big}!`,
            narration: `Double ${small} makes ${small * 2}, then add one — now we have ${small + big}!`,
            thinkingNarration: `So ${small} plus ${big} is ${small + big}.`,
            equationParts: [{ text: String(small + big), role: "result" }],
          },
        ],
      };
    }
  }
}
