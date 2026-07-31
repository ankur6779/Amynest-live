import {
  categoryId,
  entityId,
  habitatId,
  nodeId,
  phonemeId,
  soundConceptId,
  wordId,
} from "./ontology.js";
import {
  cloneDocument,
  createEmptyDocument,
  upsertEdge,
  upsertNode,
} from "./graph.js";
import type { ConceptNode, KnowledgeGraphDocument } from "./types.js";

/** Bump when seed structure changes; clients re-merge catalog without wiping state. */
export const SEED_CATALOG_VERSION = 3;

const ANIMAL_CATEGORY_META: Record<
  string,
  { label: string; habitat: string; habitatLabel: string; wild?: boolean }
> = {
  farm: { label: "Farm Animal", habitat: "farm", habitatLabel: "Farm" },
  wild: { label: "Wild Animal", habitat: "wild", habitatLabel: "Wild", wild: true },
  sea: { label: "Sea Animal", habitat: "ocean", habitatLabel: "Ocean" },
  birds: { label: "Bird", habitat: "sky", habitatLabel: "Sky" },
  insects: { label: "Insect", habitat: "garden", habitatLabel: "Garden" },
  pets: { label: "Pet", habitat: "home", habitatLabel: "Home" },
  jungle: { label: "Jungle Animal", habitat: "jungle", habitatLabel: "Jungle", wild: true },
  arctic: { label: "Arctic Animal", habitat: "arctic", habitatLabel: "Arctic", wild: true },
};

const WORLD_CATEGORY: Record<string, { category: string; label: string }> = {
  animal_world: { category: "animal", label: "Animal" },
  vehicle_world: { category: "vehicle", label: "Vehicle" },
  nature_world: { category: "nature", label: "Nature" },
  home_sounds_world: { category: "home", label: "Home Sound" },
  instrument_world: { category: "instrument", label: "Instrument" },
};

/** Curated big-cat / jungle related clusters (slug ids). */
const RELATED_CLUSTERS: string[][] = [
  ["lion", "tiger", "leopard"],
  ["dog", "wolf", "fox"],
  ["cat", "lion", "tiger"],
  ["cow", "bull", "buffalo"],
  ["duck", "goose", "swan"],
];

/** Letter → speech practice words. */
const PHONEME_WORDS: Record<string, string[]> = {
  l: ["lion", "leaf", "lamp", "lemon"],
  r: ["rabbit", "rain", "red", "rooster"],
  s: ["snake", "sun", "star", "sheep"],
  m: ["monkey", "moon", "mouse", "milk"],
  b: ["bear", "ball", "bird", "bus"],
  t: ["tiger", "tree", "train", "turtle"],
  c: ["cat", "cow", "car", "cloud"],
  d: ["dog", "drum", "duck", "door"],
  p: ["pig", "plane", "piano", "panda"],
  f: ["fish", "frog", "fan", "fire"],
};

const SURFACE_LINKS: ConceptNode[] = [
  {
    id: nodeId("speech", "coach"),
    kind: "speech",
    label: "Speech Coach",
    glyph: "🎤",
    links: { speechRoute: "/speech-coach" },
    tags: ["surface"],
  },
  {
    id: nodeId("story", "animal-tales"),
    kind: "story",
    label: "Animal Stories",
    glyph: "📖",
    links: { storyId: "animal-tales" },
    tags: ["surface", "animals"],
  },
  {
    id: nodeId("reading", "phonics"),
    kind: "reading",
    label: "Reading & Phonics",
    glyph: "📚",
    links: { readingId: "phonics" },
    tags: ["surface"],
  },
  {
    id: nodeId("game", "hear-find"),
    kind: "game",
    label: "Hear & Find",
    glyph: "🎧",
    links: { gameId: "hear-find" },
    tags: ["surface", "discovery_worlds"],
  },
];

export type SeedEntityInput = {
  /** Stable item id (e.g. lion, car). */
  id: string;
  label: string;
  worldId: string;
  /** Animal category or world subcategory. */
  category?: string;
  /** Primary sound label (Roar, Moo, Honk). */
  soundLabel?: string;
  glyph?: string;
  attributes?: string[];
};

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function firstLetter(label: string): string | null {
  const m = label.trim().toLowerCase().match(/[a-z]/);
  return m?.[0] ?? null;
}

function ensureBaseTaxonomy(doc: KnowledgeGraphDocument): void {
  upsertNode(doc, {
    id: categoryId("animal"),
    kind: "category",
    label: "Animal",
    glyph: "🐾",
  });
  upsertNode(doc, {
    id: categoryId("wild-animal"),
    kind: "category",
    label: "Wild Animal",
    glyph: "🦁",
  });
  upsertEdge(doc, categoryId("wild-animal"), "is_a", categoryId("animal"));

  for (const [key, meta] of Object.entries(ANIMAL_CATEGORY_META)) {
    upsertNode(doc, {
      id: categoryId(key),
      kind: "category",
      label: meta.label,
      tags: ["animal_category", key],
    });
    upsertEdge(doc, categoryId(key), "is_a", categoryId("animal"));
    if (meta.wild) {
      upsertEdge(doc, categoryId(key), "is_a", categoryId("wild-animal"));
    }
    upsertNode(doc, {
      id: habitatId(meta.habitat),
      kind: "habitat",
      label: meta.habitatLabel,
      tags: ["habitat"],
    });
  }

  for (const attr of ["big", "small", "loud", "quiet", "fast", "slow"]) {
    upsertNode(doc, {
      id: nodeId("attribute", attr),
      kind: "attribute",
      label: attr[0]!.toUpperCase() + attr.slice(1),
      tags: ["attribute"],
    });
  }

  for (const letter of Object.keys(PHONEME_WORDS)) {
    const pid = phonemeId(letter);
    upsertNode(doc, {
      id: pid,
      kind: "phoneme",
      label: `${letter.toUpperCase()} sound`,
      glyph: letter.toUpperCase(),
      tags: ["phoneme"],
      links: { speechRoute: `/speech-coach?sound=${letter}` },
    });
    for (const word of PHONEME_WORDS[letter] ?? []) {
      const wid = wordId(word);
      upsertNode(doc, {
        id: wid,
        kind: "word",
        label: word[0]!.toUpperCase() + word.slice(1),
        tags: ["practice_word", letter],
        links: { speechRoute: `/speech-coach?word=${word}` },
      });
      upsertEdge(doc, wid, "starts_with", pid);
      upsertEdge(doc, pid, "practices", wid);
    }
    upsertEdge(doc, pid, "links_to", nodeId("speech", "coach"), 0.9);
  }

  for (const surface of SURFACE_LINKS) {
    upsertNode(doc, surface);
  }

  for (const meta of Object.values(WORLD_CATEGORY)) {
    upsertNode(doc, {
      id: categoryId(meta.category),
      kind: "category",
      label: meta.label,
      tags: ["world_root"],
    });
  }
}

function seedEntity(doc: KnowledgeGraphDocument, input: SeedEntityInput): void {
  const eid = entityId(input.id);
  const worldMeta = WORLD_CATEGORY[input.worldId] ?? {
    category: "discovery",
    label: "Discovery",
  };

  upsertNode(doc, {
    id: eid,
    kind: "entity",
    label: input.label,
    glyph: input.glyph,
    tags: ["entity", input.worldId, input.category].filter(Boolean) as string[],
    links: {
      discoveryWorldId: input.worldId,
      discoveryItemId: input.id,
    },
  });

  upsertEdge(doc, eid, "is_a", categoryId(worldMeta.category));

  if (input.worldId === "animal_world" && input.category) {
    const catMeta = ANIMAL_CATEGORY_META[input.category];
    if (catMeta) {
      upsertEdge(doc, eid, "is_a", categoryId(input.category));
      if (catMeta.wild) {
        upsertEdge(doc, eid, "is_a", categoryId("wild-animal"));
      }
      upsertEdge(doc, eid, "lives_in", habitatId(catMeta.habitat));
    }
  } else if (input.category) {
    const catSlug = slugify(input.category);
    upsertNode(doc, {
      id: categoryId(catSlug),
      kind: "category",
      label: input.category,
      tags: [input.worldId],
    });
    upsertEdge(doc, eid, "is_a", categoryId(catSlug));
    upsertEdge(doc, categoryId(catSlug), "is_a", categoryId(worldMeta.category));
  }

  if (input.soundLabel) {
    const sid = soundConceptId(slugify(input.soundLabel));
    upsertNode(doc, {
      id: sid,
      kind: "sound",
      label: input.soundLabel,
      tags: ["sound", input.worldId],
    });
    upsertEdge(doc, eid, "makes_sound", sid);
  }

  const letter = firstLetter(input.label);
  if (letter) {
    const pid = phonemeId(letter);
    if (!doc.nodes[pid]) {
      upsertNode(doc, {
        id: pid,
        kind: "phoneme",
        label: `${letter.toUpperCase()} sound`,
        glyph: letter.toUpperCase(),
        tags: ["phoneme"],
        links: { speechRoute: `/speech-coach?sound=${letter}` },
      });
      upsertEdge(doc, pid, "links_to", nodeId("speech", "coach"), 0.8);
    }
    upsertEdge(doc, eid, "starts_with", pid);
    // Bridge practice words that match entity id
    const wid = wordId(input.id);
    if (doc.nodes[wid]) {
      upsertEdge(doc, eid, "related", wid, 0.7);
    }
  }

  for (const attr of input.attributes ?? []) {
    const aid = nodeId("attribute", slugify(attr));
    if (doc.nodes[aid]) {
      upsertEdge(doc, eid, "has_attribute", aid);
    }
  }

  // Surface links for animals
  if (input.worldId === "animal_world") {
    upsertEdge(doc, eid, "links_to", nodeId("story", "animal-tales"), 0.6);
    upsertEdge(doc, eid, "links_to", nodeId("game", "hear-find"), 0.7);
    upsertEdge(doc, eid, "links_to", nodeId("reading", "phonics"), 0.4);
  }
}

function wireRelatedClusters(doc: KnowledgeGraphDocument): void {
  for (const cluster of RELATED_CLUSTERS) {
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const a = entityId(cluster[i]!);
        const b = entityId(cluster[j]!);
        if (!doc.nodes[a] || !doc.nodes[b]) continue;
        upsertEdge(doc, a, "related", b, 0.95);
        upsertEdge(doc, b, "related", a, 0.95);
      }
    }
  }

  // Same-category animals lightly related
  const byCategory = new Map<string, string[]>();
  for (const node of Object.values(doc.nodes)) {
    if (node.kind !== "entity") continue;
    const cat = node.tags?.find((t) => ANIMAL_CATEGORY_META[t]);
    if (!cat) continue;
    const list = byCategory.get(cat) ?? [];
    list.push(node.id);
    byCategory.set(cat, list);
  }
  for (const ids of byCategory.values()) {
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i]!;
      const b = ids[(i + 1) % ids.length]!;
      if (a === b) continue;
      upsertEdge(doc, a, "related", b, 0.55);
    }
  }
}

export function buildSeedDocument(
  childId: string,
  entities: SeedEntityInput[],
): KnowledgeGraphDocument {
  const doc = createEmptyDocument(childId);
  ensureBaseTaxonomy(doc);
  for (const entity of entities) {
    seedEntity(doc, entity);
  }
  wireRelatedClusters(doc);
  doc.catalogVersion = SEED_CATALOG_VERSION;
  doc.updatedAt = new Date().toISOString();
  return doc;
}

/**
 * Merge seed catalog into an existing child document without wiping learning state.
 */
export function mergeSeedIntoDocument(
  existing: KnowledgeGraphDocument,
  entities: SeedEntityInput[],
): KnowledgeGraphDocument {
  const doc = cloneDocument(existing);
  ensureBaseTaxonomy(doc);
  for (const entity of entities) {
    seedEntity(doc, entity);
  }
  wireRelatedClusters(doc);
  doc.catalogVersion = SEED_CATALOG_VERSION;
  doc.updatedAt = new Date().toISOString();
  return doc;
}

export function animalToSeedEntity(animal: {
  id: string;
  name: string;
  category: string;
  emoji?: string;
  quizPrompt?: string;
}): SeedEntityInput {
  const attributes: string[] = [];
  if (["lion", "tiger", "elephant", "bear", "whale"].includes(animal.id)) {
    attributes.push("big");
  }
  if (["mouse", "ant", "bee", "sparrow"].includes(animal.id)) {
    attributes.push("small");
  }
  return {
    id: animal.id,
    label: animal.name,
    worldId: "animal_world",
    category: animal.category,
    soundLabel: animal.quizPrompt,
    glyph: animal.emoji,
    attributes,
  };
}

export type StoryConceptSeedInput = {
  storyId: string;
  title: string;
  category?: string;
  vocabulary?: string[];
  concepts?: string[];
};

/**
 * Structural upsert for Story World concepts — words, categories, story links.
 * Does not compute mastery; only ensures nodes/edges exist for observations.
 */
export function ensureStoryLearningStructure(
  doc: KnowledgeGraphDocument,
  input: StoryConceptSeedInput,
): KnowledgeGraphDocument {
  const next = cloneDocument(doc);
  const storySlug = slugify(input.storyId) || "story";
  const sid = nodeId("story", storySlug);

  upsertNode(next, {
    id: sid,
    kind: "story",
    label: input.title,
    tags: ["story_world", input.category ?? "story"].filter(Boolean) as string[],
    links: { storyId: input.storyId },
  });

  if (input.category?.trim()) {
    const catSlug = slugify(input.category);
    const cid = categoryId(catSlug);
    upsertNode(next, {
      id: cid,
      kind: "category",
      label: input.category.trim(),
      tags: ["story_category"],
    });
    upsertEdge(next, sid, "part_of", cid, 0.9);
  }

  for (const raw of input.vocabulary ?? []) {
    const word = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    if (word.length < 2) continue;
    const wid = wordId(word);
    upsertNode(next, {
      id: wid,
      kind: "word",
      label: word[0]!.toUpperCase() + word.slice(1),
      tags: ["story_vocabulary"],
      links: { speechRoute: `/speech-coach?word=${word}` },
    });
    upsertEdge(next, sid, "related", wid, 0.8);
    upsertEdge(next, wid, "links_to", sid, 0.6);
    const letter = firstLetter(word);
    if (letter) {
      const pid = phonemeId(letter);
      if (!next.nodes[pid]) {
        upsertNode(next, {
          id: pid,
          kind: "phoneme",
          label: `${letter.toUpperCase()} sound`,
          glyph: letter.toUpperCase(),
          tags: ["phoneme"],
          links: { speechRoute: `/speech-coach?sound=${letter}` },
        });
      }
      upsertEdge(next, wid, "starts_with", pid);
    }
  }

  for (const raw of input.concepts ?? []) {
    const slug = slugify(raw);
    if (!slug) continue;
    const eid = entityId(slug);
    upsertNode(next, {
      id: eid,
      kind: "entity",
      label: raw.trim(),
      tags: ["story_concept"],
    });
    upsertEdge(next, sid, "related", eid, 0.75);
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export type ReadingConceptSeedInput = {
  grapheme?: string;
  focusWord?: string;
  words?: string[];
  phonemes?: string[];
  syllables?: string[];
  /** Letter blends (e.g. bl, st, qu). */
  blends?: string[];
  /** Full sentence strings for sentence-pattern nodes. */
  sentences?: string[];
  /** Sentence / pattern labels (e.g. CVC, digraph). */
  sentencePatterns?: string[];
  concepts?: string[];
};

/**
 * Structural upsert for Reading World — letters, words, phonemes, syllables, patterns.
 * Does not compute mastery; only ensures nodes/edges exist for observations.
 */
export function ensureReadingLearningStructure(
  doc: KnowledgeGraphDocument,
  input: ReadingConceptSeedInput,
): KnowledgeGraphDocument {
  const next = cloneDocument(doc);
  const grapheme = (input.grapheme ?? "").trim().toLowerCase().replace(/[^a-z]/g, "");

  if (grapheme) {
    const rid = nodeId("reading", grapheme);
    upsertNode(next, {
      id: rid,
      kind: "reading",
      label: grapheme.toUpperCase(),
      glyph: grapheme.toUpperCase(),
      tags: ["reading_world", "grapheme"],
      links: { readingId: grapheme, speechRoute: `/phonics?sound=${grapheme}` },
    });
    const pid = phonemeId(grapheme[0]!);
    if (!next.nodes[pid]) {
      upsertNode(next, {
        id: pid,
        kind: "phoneme",
        label: `${grapheme[0]!.toUpperCase()} sound`,
        glyph: grapheme[0]!.toUpperCase(),
        tags: ["phoneme"],
        links: { speechRoute: `/speech-coach?sound=${grapheme[0]}` },
      });
    }
    upsertEdge(next, rid, "practices", pid, 0.9);
    upsertEdge(next, rid, "links_to", "reading:phonics", 0.5);
  }

  if (!next.nodes["reading:phonics"]) {
    upsertNode(next, {
      id: "reading:phonics",
      kind: "reading",
      label: "Reading World",
      tags: ["reading_world", "surface"],
      links: { readingId: "phonics", speechRoute: "/phonics" },
    });
  }

  const allWords = [
    ...(input.focusWord ? [input.focusWord] : []),
    ...(input.words ?? []),
  ];
  for (const raw of allWords) {
    const word = raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z]/g, "");
    if (word.length < 2) continue;
    const wid = wordId(word);
    upsertNode(next, {
      id: wid,
      kind: "word",
      label: word[0]!.toUpperCase() + word.slice(1),
      tags: ["reading_vocabulary"],
      links: {
        speechRoute: `/speech-coach?word=${word}`,
        readingId: word,
      },
    });
    if (grapheme) {
      upsertEdge(next, nodeId("reading", grapheme), "related", wid, 0.85);
      upsertEdge(next, wid, "links_to", nodeId("reading", grapheme), 0.6);
    }
    upsertEdge(next, wid, "links_to", "reading:phonics", 0.4);
    const letter = firstLetter(word);
    if (letter) {
      const pid = phonemeId(letter);
      if (!next.nodes[pid]) {
        upsertNode(next, {
          id: pid,
          kind: "phoneme",
          label: `${letter.toUpperCase()} sound`,
          glyph: letter.toUpperCase(),
          tags: ["phoneme"],
          links: { speechRoute: `/speech-coach?sound=${letter}` },
        });
      }
      upsertEdge(next, wid, "starts_with", pid);
    }
  }

  for (const raw of input.phonemes ?? []) {
    const p = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (!p) continue;
    const pid = phonemeId(p[0]!);
    if (!next.nodes[pid]) {
      upsertNode(next, {
        id: pid,
        kind: "phoneme",
        label: `${p[0]!.toUpperCase()} sound`,
        glyph: p[0]!.toUpperCase(),
        tags: ["phoneme", "reading_world"],
        links: { speechRoute: `/speech-coach?sound=${p[0]}` },
      });
    }
  }

  for (const raw of input.syllables ?? []) {
    const slug = slugify(raw);
    if (!slug) continue;
    const eid = entityId(`syllable-${slug}`);
    upsertNode(next, {
      id: eid,
      kind: "entity",
      label: raw.trim(),
      tags: ["syllable", "reading_world"],
    });
    if (grapheme) {
      upsertEdge(next, nodeId("reading", grapheme), "part_of", eid, 0.7);
    }
  }

  for (const raw of input.blends ?? []) {
    const blend = raw.trim().toLowerCase().replace(/[^a-z]/g, "");
    if (blend.length < 2) continue;
    const eid = entityId(`blend-${blend}`);
    upsertNode(next, {
      id: eid,
      kind: "entity",
      label: blend,
      tags: ["blend", "reading_world"],
      links: { readingId: blend, speechRoute: `/phonics?blend=${blend}` },
    });
    upsertEdge(next, "reading:phonics", "related", eid, 0.8);
    if (grapheme) {
      upsertEdge(next, nodeId("reading", grapheme), "related", eid, 0.7);
    }
  }

  for (const raw of input.sentences ?? []) {
    const text = raw.trim();
    if (!text) continue;
    const slug = slugify(text).slice(0, 48);
    if (!slug) continue;
    const eid = entityId(`sentence-${slug}`);
    upsertNode(next, {
      id: eid,
      kind: "entity",
      label: text.length > 64 ? `${text.slice(0, 61)}…` : text,
      tags: ["sentence", "reading_world"],
    });
    upsertEdge(next, "reading:phonics", "related", eid, 0.7);
  }

  for (const raw of [...(input.sentencePatterns ?? []), ...(input.concepts ?? [])]) {
    const slug = slugify(raw);
    if (!slug) continue;
    const eid = entityId(
      input.sentencePatterns?.includes(raw) ? `pattern-${slug}` : slug,
    );
    upsertNode(next, {
      id: eid,
      kind: "entity",
      label: raw.trim(),
      tags: ["reading_concept", "reading_world"],
    });
    upsertEdge(next, "reading:phonics", "related", eid, 0.65);
  }

  next.updatedAt = new Date().toISOString();
  return next;
}

export type GameConceptSeedInput = {
  gameId: string;
  title?: string;
  category?: string;
  skills?: string[];
  concepts?: string[];
};

/**
 * Structural upsert for educational games — game nodes, categories, skill tags.
 * Does not compute mastery; only ensures nodes/edges exist for observations.
 */
export function ensureGameLearningStructure(
  doc: KnowledgeGraphDocument,
  input: GameConceptSeedInput,
): KnowledgeGraphDocument {
  const next = cloneDocument(doc);
  const gameSlug = slugify(input.gameId) || "game";
  const gid = nodeId("game", gameSlug);

  if (!next.nodes["game:hub"]) {
    upsertNode(next, {
      id: "game:hub",
      kind: "game",
      label: "Games Hub",
      tags: ["games_world", "surface"],
      links: { gameId: "hub" },
    });
  }

  upsertNode(next, {
    id: gid,
    kind: "game",
    label: input.title?.trim() || input.gameId,
    tags: ["games_world", input.category ?? "game"].filter(Boolean) as string[],
    links: { gameId: input.gameId },
  });
  upsertEdge(next, gid, "links_to", "game:hub", 0.5);

  if (input.category?.trim()) {
    const catSlug = slugify(input.category);
    const cid = categoryId(catSlug);
    upsertNode(next, {
      id: cid,
      kind: "category",
      label: input.category.trim(),
      tags: ["game_category"],
    });
    upsertEdge(next, gid, "part_of", cid, 0.9);
  }

  for (const raw of input.skills ?? []) {
    const slug = slugify(raw);
    if (!slug) continue;
    const sid = entityId(`skill-${slug}`);
    upsertNode(next, {
      id: sid,
      kind: "entity",
      label: raw.trim(),
      tags: ["game_skill", "games_world"],
    });
    upsertEdge(next, gid, "practices", sid, 0.85);
  }

  for (const raw of input.concepts ?? []) {
    const slug = slugify(raw);
    if (!slug) continue;
    const eid = entityId(slug);
    upsertNode(next, {
      id: eid,
      kind: "entity",
      label: raw.trim(),
      tags: ["game_concept", "games_world"],
    });
    upsertEdge(next, gid, "related", eid, 0.75);
  }

  next.updatedAt = new Date().toISOString();
  return next;
}
