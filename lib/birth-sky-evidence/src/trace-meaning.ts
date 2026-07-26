/**
 * Reconstruct meaning rule traces via public evaluateRules (no engine edits).
 */

import {
  MEANING_ENGINE_VERSION,
  evaluateRules,
  type MeaningAstronomyInput,
  type MeaningSnapshot,
} from "@workspace/birth-sky-meaning";
import { ruleRef } from "./rule-ids.js";
import type { EvidenceNode } from "./types.js";

export function traceMeaning(input: {
  astronomy?: MeaningAstronomyInput | null;
  meaning?: MeaningSnapshot | null;
}): EvidenceNode[] {
  if (!input.meaning) return [];

  const hits = input.astronomy ? evaluateRules(input.astronomy) : [];
  const byConcept = new Map<
    string,
    {
      label: string;
      rules: Map<string, string>;
      facts: Set<string>;
      confidence: number;
    }
  >();

  for (const h of hits) {
    const cur = byConcept.get(h.conceptId) ?? {
      label: h.label,
      rules: new Map<string, string>(),
      facts: new Set<string>(),
      confidence: 0,
    };
    const ref = ruleRef("M", h.ruleId);
    cur.rules.set(ref.id, ref.key);
    cur.facts.add(h.evidence);
    cur.confidence = Math.max(cur.confidence, h.confidence);
    cur.label = h.label;
    byConcept.set(h.conceptId, cur);
  }

  // Ensure every profile label in the snapshot has a trace (fallback if no astronomy).
  const profileLabels = collectMeaningLabels(input.meaning);
  for (const label of profileLabels) {
    const id = slug(label);
    if (byConcept.has(id)) continue;
    // Try match by label against hits
    let matched = false;
    for (const [cid, cur] of byConcept) {
      if (cur.label.toLowerCase() === label.toLowerCase()) {
        matched = true;
        void cid;
        break;
      }
    }
    if (matched) continue;
    const key = `snapshot_label_${id}`;
    const ref = ruleRef("M", key);
    byConcept.set(id, {
      label,
      rules: new Map([[ref.id, ref.key]]),
      facts: new Set(["from_meaning_snapshot"]),
      confidence: 0.7,
    });
  }

  const nodes: EvidenceNode[] = [];
  for (const [id, cur] of [...byConcept.entries()].sort((a, b) =>
    a[0].localeCompare(b[0]),
  )) {
    const rules = [...cur.rules.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([rid, key]) => ({ id: rid, key }));
    nodes.push({
      id: `meaning:${id}`,
      label: cur.label,
      engine: "meaning",
      engineVersion: input.meaning.meaningEngineVersion || MEANING_ENGINE_VERSION,
      rules,
      supportingFacts: [...cur.facts].sort(),
      confidence: Math.round(cur.confidence * 100) / 100,
      dependencies: cur.facts.has("from_meaning_snapshot")
        ? ["meaning_snapshot"]
        : [...cur.facts].map((f) => `astronomy:${f}`).sort(),
    });
  }
  return nodes;
}

function collectMeaningLabels(meaning: MeaningSnapshot): string[] {
  const p = meaning.profile;
  return [
    ...p.strengths,
    ...p.learningStyle,
    ...p.communicationStyle,
    ...p.creativeStrength,
    ...p.attentionPattern,
    ...p.emotionalProfile,
    ...p.socialProfile,
    ...p.comfortNeeds,
    ...p.motivationStyle,
    ...p.curiosityPattern,
  ];
}

function slug(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);
}
