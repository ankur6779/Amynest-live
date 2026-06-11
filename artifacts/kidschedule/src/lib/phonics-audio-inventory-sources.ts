/**
 * Collects every speakable phonics string from V1/V2/V3 kidschedule content.
 * Registered with @workspace/phonics-sounds for audio audit + generation.
 */
import {
  makeInventoryItem,
  type PhonicsInventoryItem,
} from "@workspace/phonics-sounds";
import { DECODABLE_STORIES } from "@/lib/phonics-v2/content/decodable-stories";
import { WORD_FAMILIES } from "@/lib/phonics-v2/content/word-families";
import { getDecodableStoryCatalog } from "@/lib/phonics-v3/content/story-catalog";
import {
  getDigraphAudioClips,
  getDigraphLessons,
  getDigraphMissions,
  getDigraphAssessments,
  CERTIFIED_DIGRAPH_IDS,
} from "@/lib/phonics-v3/content/digraph-catalog";
import { getBlendStories, getBlendWordBank } from "@/lib/phonics-v3/content/blend-catalog";
import { getCvccStories, getCvccWordBank } from "@/lib/phonics-v3/content/cvcc-catalog";
import { PHONICS_JOURNEY_STAGES } from "@/lib/phonics-journey-roadmap";

const SOURCE = "phonics-audio-inventory-sources.ts";

/** Static mission / adaptive / parent-insight prompt fragments (words come from word bank). */
const MISSION_PROMPT_TEXTS = [
  "Complete overdue retention review",
  "Strengthen at-risk word",
  "Blend practice",
  "Digraph practice pathway",
  "Read one decodable story today",
  "Voice round — say words aloud",
  "Daily mission — keep the streak going!",
  "Overdue retention review",
  "Digraph review",
  "Blend review",
  "Practice",
  "Review",
  "New word",
  "Mini story",
  "Listen",
  "Say",
  "Story",
  "CVCC practice",
  "Retention review",
  "Karaoke blend",
  "Voice assessment",
] as const;

const RETENTION_PROMPT_TEXTS = [
  "Time for a review!",
  "Let's check what you remember.",
  "Review this word.",
  "Retention check",
] as const;

const PARENT_RECOMMENDATION_TEXTS = [
  "Focus on word families next.",
  "Growing reader",
  "Building foundations",
  "review daily mission",
] as const;

function pushUnique(items: PhonicsInventoryItem[], seen: Set<string>, item: PhonicsInventoryItem): void {
  if (seen.has(item.catalogKey)) return;
  seen.add(item.catalogKey);
  items.push(item);
}

export function collectKidschedulePhonicsAudioInventory(): PhonicsInventoryItem[] {
  const items: PhonicsInventoryItem[] = [];
  const seen = new Set<string>();

  for (const story of DECODABLE_STORIES) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: story.title,
        category: "story_title",
        sourceFile: "decodable-stories.ts",
        id: `v2_title_${story.id}`,
      }),
    );
    for (const line of story.lines) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: line.text,
          category: "story_sentence",
          sourceFile: `decodable-stories.ts:${story.id}`,
        }),
      );
    }
    if (story.comprehensionQuestion) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: story.comprehensionQuestion,
          category: "comprehension",
          sourceFile: `decodable-stories.ts:${story.id}`,
        }),
      );
    }
  }

  for (const story of getDecodableStoryCatalog()) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: story.title,
        category: "story_title",
        sourceFile: "story-catalog.ts",
        id: `title_${story.id}`,
      }),
    );
    for (const line of story.lines) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: line.text,
          category: "story_sentence",
          sourceFile: `story-catalog.ts:${story.id}`,
        }),
      );
    }
    if (story.comprehensionQuestion) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: story.comprehensionQuestion,
          category: "comprehension",
          sourceFile: `story-catalog.ts:${story.id}`,
        }),
      );
    }
  }

  for (const family of WORD_FAMILIES) {
    for (const w of family.words) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: w.word,
          category: "cvc",
          sourceFile: "word-families.ts",
        }),
      );
    }
  }

  for (const word of getCvccWordBank()) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: word,
        category: "cvcc",
        sourceFile: "cvcc-catalog.ts",
      }),
    );
  }

  for (const entry of getBlendWordBank()) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: entry.word,
        category: "ccvc",
        sourceFile: "blend-catalog.ts",
      }),
    );
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: entry.blend,
        category: "blend",
        type: "blend",
        sourceFile: "blend-catalog.ts",
        id: entry.blend,
        isolatedPhoneme: true,
      }),
    );
  }

  for (const story of [...getBlendStories(), ...getCvccStories()]) {
    for (const line of story.lines) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: line.text,
          category: "story_sentence",
          sourceFile: `blend-cvcc-catalog.ts:${story.id}`,
        }),
      );
    }
  }

  for (const id of CERTIFIED_DIGRAPH_IDS) {
    for (const clip of getDigraphAudioClips(id)) {
      const category = clip.type === "phoneme" ? "digraph" : "word";
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: clip.text,
          category,
          type: clip.type === "phoneme" ? "digraph" : "cvc",
          sourceFile: "digraph-catalog.ts",
          id: clip.type === "phoneme" ? clip.audioKey : clip.text,
          isolatedPhoneme: clip.type === "phoneme",
        }),
      );
    }
  }

  for (const lesson of getDigraphLessons()) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: lesson.intro,
        category: "mission_prompt",
        sourceFile: `digraph-catalog.ts:lesson-${lesson.digraphId}`,
      }),
    );
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: lesson.title,
        category: "mission_prompt",
        sourceFile: `digraph-catalog.ts:lesson-${lesson.digraphId}`,
      }),
    );
    for (const step of lesson.steps) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: step.label,
          category: "mission_prompt",
          sourceFile: `digraph-catalog.ts:lesson-${lesson.digraphId}`,
        }),
      );
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: step.word,
          category: "word",
          sourceFile: `digraph-catalog.ts:lesson-${lesson.digraphId}`,
        }),
      );
    }
  }

  for (const mission of getDigraphMissions()) {
    for (const task of mission.tasks) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: task.label,
          category: "mission_prompt",
          sourceFile: `digraph-catalog.ts:mission-${mission.digraphId}`,
        }),
      );
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: task.word,
          category: "word",
          sourceFile: `digraph-catalog.ts:mission-${mission.digraphId}`,
        }),
      );
    }
  }

  for (const assessment of getDigraphAssessments()) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: assessment.title,
        category: "assessment_prompt",
        sourceFile: `digraph-catalog.ts:assess-${assessment.digraphId}`,
      }),
    );
    for (const word of assessment.words) {
      pushUnique(
        items,
        seen,
        makeInventoryItem({
          text: word,
          category: "word",
          sourceFile: `digraph-catalog.ts:assess-${assessment.digraphId}`,
        }),
      );
    }
  }

  for (const stage of PHONICS_JOURNEY_STAGES) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: stage.milestoneName,
        category: "mission_prompt",
        sourceFile: "phonics-journey-roadmap.ts",
        id: `journey_${stage.id}`,
      }),
    );
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: stage.outcomeLabel,
        category: "mission_prompt",
        sourceFile: "phonics-journey-roadmap.ts",
        id: `journey_outcome_${stage.id}`,
      }),
    );
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text: stage.nextMilestone,
        category: "mission_prompt",
        sourceFile: "phonics-journey-roadmap.ts",
        id: `journey_next_${stage.id}`,
      }),
    );
  }

  for (const text of MISSION_PROMPT_TEXTS) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text,
        category: "mission_prompt",
        sourceFile: "phonics-audio-inventory-sources.ts",
        id: `mission_${text.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 48)}`,
      }),
    );
  }

  for (const text of RETENTION_PROMPT_TEXTS) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text,
        category: "retention",
        sourceFile: "phonics-audio-inventory-sources.ts",
      }),
    );
  }

  for (const text of PARENT_RECOMMENDATION_TEXTS) {
    pushUnique(
      items,
      seen,
      makeInventoryItem({
        text,
        category: "recommendation",
        sourceFile: "phonics-audio-inventory-sources.ts",
      }),
    );
  }

  return items;
}
