import {
  validateLearningZonePayload,
  LEARNING_ZONE_ENGLISH_AI_RULE,
} from "@workspace/learning-zone-english";

export { validateLearningZonePayload, LEARNING_ZONE_ENGLISH_AI_RULE };

export function appendLearningZoneEnglishRule(systemPrompt: string): string {
  if (systemPrompt.includes(LEARNING_ZONE_ENGLISH_AI_RULE)) return systemPrompt;
  return `${systemPrompt} ${LEARNING_ZONE_ENGLISH_AI_RULE}`;
}

export function assertLearningZoneEnglishItems(items: unknown): boolean {
  return validateLearningZonePayload(items).valid;
}
