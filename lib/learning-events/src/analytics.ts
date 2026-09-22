import type { AnalyticsCompatibleEvent, LearningEvent } from "./types.js";

/**
 * Map a learning event to a flat analytics-compatible shape.
 * Safe for client-logs, GA4-style properties, or taxonomy adapters.
 */
export function toAnalyticsCompatible(
  event: LearningEvent,
): AnalyticsCompatibleEvent {
  const { payload } = event;
  return {
    name: event.type,
    childId: payload.childId,
    timestamp: payload.timestamp,
    module: payload.module,
    entityId: payload.entityId,
    conceptId: payload.conceptId,
    confidence: payload.confidence,
    sessionId: payload.sessionId,
    properties: {
      schemaVersion: event.schemaVersion,
      seq: event.seq,
      priority: event.priority,
      difficulty: payload.difficulty,
      busOrigin: event.busOrigin === true,
      ...(payload.metadata ?? {}),
    },
  };
}

/** Modality types that map cleanly onto knowledge-graph observations. */
export const KG_MODALITY_EVENT_TYPES = [
  "learning.item_seen",
  "learning.item_heard",
  "learning.item_recognized",
  "learning.item_spoken",
] as const;

export type KgModalityEventType = (typeof KG_MODALITY_EVENT_TYPES)[number];

export function modalityFromEventType(
  type: LearningEvent["type"],
): "seen" | "heard" | "recognized" | "spoken" | "failed" | null {
  switch (type) {
    case "learning.item_seen":
      return "seen";
    case "learning.item_heard":
      return "heard";
    case "learning.item_recognized":
      return "recognized";
    case "learning.item_spoken":
      return "spoken";
    default:
      return null;
  }
}

/**
 * Pure projection toward knowledge-graph observations.
 * Does not import @workspace/knowledge-graph (keeps packages decoupled).
 */
export type LearningObservationLike = {
  nodeId: string;
  modality: "seen" | "heard" | "recognized" | "spoken" | "failed";
  source:
    | "discovery_worlds"
    | "speech_coach"
    | "stories"
    | "reading"
    | "games"
    | "analytics"
    | "system";
  at?: string;
  score?: number;
};

const MODULE_TO_KG_SOURCE: Record<
  string,
  LearningObservationLike["source"]
> = {
  discovery_worlds: "discovery_worlds",
  animal_world: "discovery_worlds",
  speech_coach: "speech_coach",
  stories: "stories",
  reading: "reading",
  games: "games",
  system: "system",
  attention: "analytics",
  parent_hub: "analytics",
  health_lab: "analytics",
  knowledge_graph: "system",
};

export function toKnowledgeObservations(
  event: LearningEvent,
): LearningObservationLike[] {
  // Fan-out / decision signals — never write back into KG.
  if (
    event.type === "knowledge.updated" ||
    event.type === "learning.decision" ||
    event.busOrigin
  ) {
    return [];
  }

  if (event.type === "speech.practice_completed") {
    const text = String(event.payload.metadata?.promptText ?? "");
    const score =
      typeof event.payload.confidence === "number"
        ? event.payload.confidence
        : undefined;
    const modality =
      score == null ? "spoken" : score >= 70 ? "spoken" : "failed";
    const word = text
      .trim()
      .toLowerCase()
      .replace(/[^a-z\s]/g, "")
      .split(/\s+/)[0];
    const out: LearningObservationLike[] = [];
    const source = MODULE_TO_KG_SOURCE[event.payload.module] ?? "system";
    const push = (nodeId: string) => {
      out.push({
        nodeId,
        modality,
        source,
        at: event.payload.timestamp,
        score,
      });
    };
    if (word) {
      // Speech practice owns word:/phoneme: nodes only.
      // Never write entity:${word} — that collides with Animal World / discovery
      // seeds (entity:cat, entity:dog, …) and corrupts mastery.
      push(`word:${word}`);
      const letter = word[0];
      if (letter) push(`phoneme:${letter}`);
    } else if (event.payload.conceptId) {
      push(event.payload.conceptId);
    }

    const hints = event.payload.metadata?.soundHints;
    if (Array.isArray(hints)) {
      for (const raw of hints) {
        const letter = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, "")[0];
        if (letter) push(`phoneme:${letter}`);
      }
    }
    return out;
  }

  if (
    event.type === "story.chapter_completed" ||
    event.type === "story.concept_discovered" ||
    event.type === "story.vocabulary_learned" ||
    event.type === "story.session_completed"
  ) {
    const source = MODULE_TO_KG_SOURCE[event.payload.module] ?? "stories";
    const out: LearningObservationLike[] = [];
    const score =
      typeof event.payload.confidence === "number"
        ? event.payload.confidence
        : undefined;
    const modality: LearningObservationLike["modality"] =
      event.type === "story.vocabulary_learned" ? "recognized" : "heard";

    const push = (nodeId: string, mod: LearningObservationLike["modality"] = modality) => {
      out.push({
        nodeId,
        modality: mod,
        source,
        at: event.payload.timestamp,
        score,
      });
    };

    if (event.payload.conceptId) push(event.payload.conceptId);
    if (event.payload.entityId) push(`story:${event.payload.entityId}`, "seen");

    const vocab = event.payload.metadata?.vocabulary;
    if (Array.isArray(vocab)) {
      for (const raw of vocab) {
        const word = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        if (word.length >= 2) push(`word:${word}`, "recognized");
      }
    }

    const concepts = event.payload.metadata?.concepts;
    if (Array.isArray(concepts)) {
      for (const raw of concepts) {
        const slug = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (slug) push(`entity:${slug}`, "seen");
      }
    }

    const category = event.payload.metadata?.category;
    if (typeof category === "string" && category.trim()) {
      const slug = category
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (slug) push(`category:${slug}`, "seen");
    }

    return out;
  }

  if (
    event.type === "reading.word_completed" ||
    event.type === "reading.page_completed" ||
    event.type === "reading.session_completed" ||
    event.type === "reading.phoneme_practiced" ||
    event.type === "reading.new_word"
  ) {
    const source = MODULE_TO_KG_SOURCE[event.payload.module] ?? "reading";
    const out: LearningObservationLike[] = [];
    const score =
      typeof event.payload.confidence === "number"
        ? event.payload.confidence
        : undefined;
    const failed = event.payload.metadata?.failed === true;
    const modality: LearningObservationLike["modality"] = failed
      ? "failed"
      : event.type === "reading.phoneme_practiced"
        ? "spoken"
        : event.type === "reading.new_word" ||
            event.type === "reading.word_completed"
          ? "recognized"
          : "heard";

    const push = (
      nodeId: string,
      mod: LearningObservationLike["modality"] = modality,
    ) => {
      out.push({
        nodeId,
        modality: mod,
        source,
        at: event.payload.timestamp,
        score,
      });
    };

    if (event.payload.conceptId) push(event.payload.conceptId);
    if (event.payload.entityId && !event.payload.conceptId) {
      push(`word:${event.payload.entityId}`, "recognized");
    }

    const grapheme = event.payload.metadata?.grapheme;
    if (typeof grapheme === "string" && grapheme.trim()) {
      const g = grapheme.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (g) {
        push(`phoneme:${g[0]}`, event.type === "reading.phoneme_practiced" ? "spoken" : "heard");
        push(`reading:${g}`, "seen");
      }
    }

    const phoneme = event.payload.metadata?.phoneme;
    if (typeof phoneme === "string" && phoneme.trim()) {
      const p = phoneme.trim().toLowerCase().replace(/[^a-z]/g, "");
      if (p) push(`phoneme:${p[0]}`, "spoken");
    }

    const word = event.payload.metadata?.word ?? event.payload.metadata?.focusWord;
    if (typeof word === "string" && word.trim()) {
      const w = word
        .trim()
        .toLowerCase()
        .replace(/[^a-z]/g, "");
      if (w.length >= 2) push(`word:${w}`, "recognized");
    }

    const words = event.payload.metadata?.words;
    if (Array.isArray(words)) {
      for (const raw of words) {
        const w = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        if (w.length >= 2) push(`word:${w}`, "recognized");
      }
    }

    const syllables = event.payload.metadata?.syllables;
    if (Array.isArray(syllables)) {
      for (const raw of syllables) {
        const slug = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (slug) push(`entity:syllable-${slug}`, "heard");
      }
    }

    const patterns = event.payload.metadata?.sentencePatterns;
    if (Array.isArray(patterns)) {
      for (const raw of patterns) {
        const slug = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (slug) push(`entity:pattern-${slug}`, "seen");
      }
    }

    const blends = event.payload.metadata?.blends;
    if (Array.isArray(blends)) {
      for (const raw of blends) {
        const blend = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z]/g, "");
        if (blend.length >= 2) push(`entity:blend-${blend}`, "heard");
      }
    }

    const sentences = event.payload.metadata?.sentences;
    if (Array.isArray(sentences)) {
      for (const raw of sentences) {
        const slug = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 48);
        if (slug) push(`entity:sentence-${slug}`, "seen");
      }
    }

    return out;
  }

  if (
    event.type === "game.level_completed" ||
    event.type === "game.challenge_completed" ||
    event.type === "game.session_completed"
  ) {
    const source = MODULE_TO_KG_SOURCE[event.payload.module] ?? "games";
    const out: LearningObservationLike[] = [];
    const score =
      typeof event.payload.confidence === "number"
        ? event.payload.confidence
        : undefined;
    const failed =
      event.payload.metadata?.failed === true ||
      (typeof score === "number" && score < 50);
    const modality: LearningObservationLike["modality"] = failed
      ? "failed"
      : "recognized";

    const push = (
      nodeId: string,
      mod: LearningObservationLike["modality"] = modality,
    ) => {
      out.push({
        nodeId,
        modality: mod,
        source,
        at: event.payload.timestamp,
        score,
      });
    };

    if (event.payload.conceptId) push(event.payload.conceptId);
    if (event.payload.entityId) {
      const eid = String(event.payload.entityId);
      push(eid.startsWith("game:") ? eid : `game:${eid}`, "seen");
    }

    const skills = event.payload.metadata?.skills;
    if (Array.isArray(skills)) {
      for (const raw of skills) {
        const slug = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (slug) push(`entity:skill-${slug}`, modality);
      }
    }

    const concepts = event.payload.metadata?.concepts;
    if (Array.isArray(concepts)) {
      for (const raw of concepts) {
        const slug = String(raw)
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");
        if (slug) push(`entity:${slug}`, "seen");
      }
    }

    const category = event.payload.metadata?.category;
    if (typeof category === "string" && category.trim()) {
      const slug = category
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      if (slug) push(`category:${slug}`, "seen");
    }

    return out;
  }

  let modality = modalityFromEventType(event.type);
  if (!modality) return [];
  if (event.payload.metadata?.failed === true) {
    modality = "failed";
  }

  const nodeId =
    event.payload.conceptId ??
    (event.payload.entityId ? `entity:${event.payload.entityId}` : null);
  if (!nodeId) return [];

  return [
    {
      nodeId,
      modality,
      source: MODULE_TO_KG_SOURCE[event.payload.module] ?? "system",
      at: event.payload.timestamp,
      score:
        typeof event.payload.confidence === "number"
          ? event.payload.confidence
          : undefined,
    },
  ];
}

/**
 * Map mastery delta observations into learning event inputs (Discovery Worlds).
 */
export function masteryDeltaToLearningInputs(args: {
  childId: string | number;
  module: "discovery_worlds" | "animal_world";
  entityId: string;
  heardDelta: number;
  recognizedDelta: number;
  failedDelta: number;
  sessionId?: string;
  worldId?: string;
}): import("./types.js").LearningEventInput[] {
  const inputs: import("./types.js").LearningEventInput[] = [];
  const base = {
    childId: String(args.childId),
    module: args.module,
    entityId: args.entityId,
    conceptId: `entity:${args.entityId}`,
    sessionId: args.sessionId,
    metadata: { worldId: args.worldId },
  };

  for (let i = 0; i < args.heardDelta; i++) {
    if (i === 0) {
      inputs.push({
        type: "learning.item_seen",
        payload: { ...base },
      });
    }
    inputs.push({
      type: "learning.item_heard",
      payload: { ...base },
    });
  }
  for (let i = 0; i < args.recognizedDelta; i++) {
    inputs.push({
      type: "learning.item_recognized",
      priority: 7,
      payload: { ...base, confidence: 90 },
    });
  }
  for (let i = 0; i < args.failedDelta; i++) {
    // Represent failure as recognized attempt with low confidence metadata;
    // KG mapper treats speech fails specially; for discovery we emit recognized
    // with confidence so sinks can decide. Prefer explicit metadata.failed.
    inputs.push({
      type: "learning.item_recognized",
      priority: 6,
      payload: {
        ...base,
        confidence: 30,
        metadata: { ...base.metadata, failed: true },
      },
    });
  }
  return inputs;
}
