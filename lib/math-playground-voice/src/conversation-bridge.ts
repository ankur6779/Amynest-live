import type { VoiceRoundSummary, VoiceScenario, VoiceValidationResult } from "./types";

/** Future multi-turn conversational math — stub implementation for Phase 4a. */
export class VoiceMathConversationBridgeStub {
  private scenario: VoiceScenario | null = null;
  private attempts = 0;
  private startedAt = 0;

  async startRound(scenario: VoiceScenario): Promise<void> {
    this.scenario = scenario;
    this.attempts = 0;
    this.startedAt = Date.now();
  }

  onTranscript(_text: string): VoiceValidationResult | null {
    return null;
  }

  onAmySpeakComplete(): void {
    /* reserved for turn-taking */
  }

  recordAttempt(): void {
    this.attempts += 1;
  }

  endRound(success: boolean, hintsUsed: number, voiceConfidence: number): VoiceRoundSummary | null {
    if (!this.scenario) return null;
    return {
      scenario: this.scenario,
      attempts: this.attempts,
      hintsUsed,
      responseTimeMs: Date.now() - this.startedAt,
      voiceConfidence,
      success,
    };
  }
}
