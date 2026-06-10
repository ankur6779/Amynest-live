import type { VoicePrompt, VoiceScenario } from "./types";

export function buildVoicePrompt(scenario: VoiceScenario): VoicePrompt {
  return {
    key: scenario.promptKey,
    vars: scenario.promptVars,
  };
}

export function buildSuccessPrompt(scenario: VoiceScenario): VoicePrompt {
  return {
    key: scenario.celebrateKey ?? scenario.successKey,
    vars: scenario.promptVars,
  };
}

export function buildStrugglePrompt(scenario: VoiceScenario): VoicePrompt {
  return {
    key: scenario.struggleKey,
    vars: scenario.promptVars,
  };
}

/** i18n namespace prefix used by kidschedule usePlaygroundAmy. */
export const VOICE_I18N_PREFIX = "components.math_playground";

export function resolveVoiceCueKey(prompt: VoicePrompt): string {
  return prompt.key;
}
