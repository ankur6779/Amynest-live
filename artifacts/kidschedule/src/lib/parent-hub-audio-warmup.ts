/**
 * Parent Hub audio warmup — prefetch visible content on page open (no tap wait).
 */

import type { AuthFetchFn } from "@/lib/poll-result";
import type { AgeGroup } from "@/lib/age-groups";
import { prefetchParentHubItem } from "@/lib/amy-voice-pipeline-optimizer";
import {
  createParentHubAudioIdentity,
  PARENT_HUB_SECTIONS,
} from "@/lib/parent-hub-audio-identity";
import {
  ALL_DAILY_STORIES,
  ALL_HUB_FACTS,
  ALL_HUB_PUZZLES,
  buildDailyStorySpeakText,
  buildFactSpeakText,
  buildPuzzleAnswerSpeakText,
  buildPuzzleQuestionSpeakText,
  HUB_ORIGAMI,
} from "@workspace/parent-hub-speak";
import { ARTICLES, articleToSpeechSections } from "@workspace/parenting-articles";
import { preloadStaticPhrases } from "@/lib/static-audio";
import { prepareAmyParentHubSpeech } from "@/lib/amy-speech-mode";

const MAX_FACTS = 10;
const MAX_STORIES = 5;
const MAX_PUZZLES = 3;
const MAX_ACTIVITY_STEPS = 8;

let lastWarmKey = "";

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    const j = Math.abs(s) % (i + 1);
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

function todaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10_000 + (d.getMonth() + 1) * 100 + d.getDate();
}

function pickVisibleFacts(ageGroup: AgeGroup, count: number) {
  const pool = ALL_HUB_FACTS.filter((f) => f.ageGroups.includes(ageGroup));
  return seededShuffle(pool, todaySeed()).slice(0, count);
}

function pickVisibleStories(ageMonths: number, count: number) {
  const eligible = ALL_DAILY_STORIES.filter(
    (s) => ageMonths >= s.ageMin && ageMonths <= s.ageMax,
  );
  return seededShuffle(eligible, todaySeed() + 3).slice(0, count);
}

function pickVisiblePuzzles(_ageGroup: AgeGroup, count: number) {
  return seededShuffle([...ALL_HUB_PUZZLES], todaySeed() + 7).slice(0, count);
}

function pickVisibleActivitySteps(ageMonths: number, count: number) {
  const item = HUB_ORIGAMI.find((o) => ageMonths < 72) ?? HUB_ORIGAMI[0];
  if (!item) return [];
  return item.steps
    .map((step, idx) => ({ instruction: step.instruction?.trim(), id: `${item.id}:${idx}` }))
    .filter((s) => s.instruction)
    .slice(0, count);
}

/**
 * Prefetch static + IndexedDB for today's visible Parent Hub read-aloud lines.
 */
export function warmParentHubVisibleContent(
  authFetch: AuthFetchFn,
  params: {
    ageGroup: AgeGroup;
    ageMonths: number;
    childName?: string;
  },
): void {
  const warmKey = `${params.ageGroup}:${params.ageMonths}:${todaySeed()}`;
  if (warmKey === lastWarmKey) return;
  lastWarmKey = warmKey;

  const staticTexts: string[] = [];

  for (const fact of pickVisibleFacts(params.ageGroup, MAX_FACTS)) {
    const text = buildFactSpeakText(fact);
    staticTexts.push(text);
    prefetchParentHubItem(
      createParentHubAudioIdentity({
        sectionId: PARENT_HUB_SECTIONS.FACTS,
        itemId: fact.id,
        text,
      }),
      authFetch,
    );
  }

  for (const story of pickVisibleStories(params.ageMonths, MAX_STORIES)) {
    const text = buildDailyStorySpeakText(story);
    staticTexts.push(text);
    prefetchParentHubItem(
      createParentHubAudioIdentity({
        sectionId: PARENT_HUB_SECTIONS.DAILY_STORIES,
        itemId: story.id,
        text,
      }),
      authFetch,
    );
  }

  for (const puzzle of pickVisiblePuzzles(params.ageGroup, MAX_PUZZLES)) {
    const question = buildPuzzleQuestionSpeakText(puzzle);
    staticTexts.push(question);
    prefetchParentHubItem(
      createParentHubAudioIdentity({
        sectionId: PARENT_HUB_SECTIONS.PUZZLE,
        itemId: `${puzzle.id}:question`,
        text: question,
      }),
      authFetch,
    );
    const answer = buildPuzzleAnswerSpeakText(puzzle.correctAnswer);
    staticTexts.push(answer);
    prefetchParentHubItem(
      createParentHubAudioIdentity({
        sectionId: PARENT_HUB_SECTIONS.PUZZLE,
        itemId: `${puzzle.id}:answer`,
        text: answer,
      }),
      authFetch,
    );
  }

  staticTexts.push("Correct! Well done!");
  prefetchParentHubItem(
    createParentHubAudioIdentity({
      sectionId: PARENT_HUB_SECTIONS.PUZZLE,
      itemId: "correct-feedback",
      text: "Correct! Well done!",
    }),
    authFetch,
  );

  const featuredArticle = ARTICLES[0];
  if (featuredArticle) {
    const sections = articleToSpeechSections(featuredArticle);
    for (let i = 0; i < Math.min(sections.length, 4); i++) {
      const text = sections[i]?.trim();
      if (!text) continue;
      staticTexts.push(text);
      prefetchParentHubItem(
        createParentHubAudioIdentity({
          sectionId: PARENT_HUB_SECTIONS.ARTICLES,
          itemId: `${featuredArticle.id}:${i}`,
          text,
        }),
        authFetch,
      );
    }
  }

  for (const step of pickVisibleActivitySteps(params.ageMonths, MAX_ACTIVITY_STEPS)) {
    if (!step.instruction) continue;
    staticTexts.push(step.instruction);
    prefetchParentHubItem(
      createParentHubAudioIdentity({
        sectionId: PARENT_HUB_SECTIONS.KIDS_ACTIVITY,
        itemId: step.id,
        text: step.instruction,
      }),
      authFetch,
    );
  }

  if (staticTexts.length > 0) {
    const policy = prepareAmyParentHubSpeech(staticTexts[0]!);
    preloadStaticPhrases(staticTexts, policy.pipelineMode, 2);
  }
}
