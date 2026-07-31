import type { LearningEvent } from "@workspace/learning-events";
import type { NormalizedSignal } from "./types.js";

/**
 * Event → NormalizedSignal (cheap, allocation-light).
 */
export function normalizeLearningEvent(event: LearningEvent): NormalizedSignal {
  const type = event.type;
  const confidence =
    typeof event.payload.confidence === "number"
      ? event.payload.confidence
      : null;
  const failed = event.payload.metadata?.failed === true;
  const isFailure =
    failed ||
    (type === "speech.practice_completed" &&
      confidence != null &&
      confidence < 70);
  const isStory =
    type === "story.session_started" ||
    type === "story.chapter_started" ||
    type === "story.chapter_completed" ||
    type === "story.concept_discovered" ||
    type === "story.vocabulary_learned" ||
    type === "story.session_completed";
  const isReading =
    type === "reading.session_started" ||
    type === "reading.page_started" ||
    type === "reading.word_completed" ||
    type === "reading.page_completed" ||
    type === "reading.session_completed" ||
    type === "reading.phoneme_practiced" ||
    type === "reading.new_word";
  const isGame =
    type === "game.session_started" ||
    type === "game.level_started" ||
    type === "game.level_completed" ||
    type === "game.challenge_completed" ||
    type === "game.session_completed";

  const isSuccess =
    !isFailure &&
    (type === "learning.item_recognized" ||
      type === "learning.item_spoken" ||
      type === "learning.item_mastered" ||
      type === "speech.practice_completed" ||
      type === "story.chapter_completed" ||
      type === "story.vocabulary_learned" ||
      type === "story.concept_discovered" ||
      type === "story.session_completed" ||
      type === "reading.word_completed" ||
      type === "reading.page_completed" ||
      type === "reading.session_completed" ||
      type === "reading.phoneme_practiced" ||
      type === "reading.new_word" ||
      type === "game.level_completed" ||
      type === "game.challenge_completed" ||
      type === "game.session_completed" ||
      type === "daily_mission_completed");

  return {
    eventId: event.id,
    type,
    childId: String(event.payload.childId),
    timestamp: event.payload.timestamp,
    module: event.payload.module,
    entityId: event.payload.entityId ?? null,
    conceptId: event.payload.conceptId ?? null,
    confidence,
    difficulty: event.payload.difficulty ?? null,
    sessionId: event.payload.sessionId ?? null,
    metadata: event.payload.metadata ?? {},
    flags: {
      isSuccess,
      isFailure,
      isMastery: type === "learning.item_mastered",
      isAttention: type === "attention.state_changed",
      isSpeech:
        type === "speech.practice_started" ||
        type === "speech.practice_completed",
      isStory,
      isReading,
      isGame,
      isDailyMission: type === "daily_mission_completed",
      isKnowledge: type === "knowledge.updated",
    },
  };
}
