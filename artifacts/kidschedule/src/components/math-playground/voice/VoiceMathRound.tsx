import type { CountingPayload } from "@workspace/math-playground";
import type { VoiceScenario } from "@workspace/math-playground-voice";
import { PlaygroundAmyShell } from "../shell/PlaygroundAmyShell";
import { LivingPlaygroundObject } from "../objects/LivingPlaygroundObject";
import { VoiceListeningIndicator } from "./VoiceListeningIndicator";
import type { PlaygroundEngagementApi } from "../hooks/usePlaygroundEngagement";
import type { usePlaygroundAmy } from "../hooks/usePlaygroundAmy";
import type { useVoiceMathSession } from "./useVoiceMathSession";

interface VoiceMathRoundProps {
  scenario: VoiceScenario;
  amy: ReturnType<typeof usePlaygroundAmy>;
  engagement?: PlaygroundEngagementApi;
  accentColor: string;
  childId: number;
  voiceSession: ReturnType<typeof useVoiceMathSession>;
  countingObjects?: CountingPayload["objects"];
  objectKind?: CountingPayload["objectKind"];
}

export function VoiceMathRound({
  scenario,
  amy,
  engagement,
  accentColor,
  childId,
  voiceSession,
  countingObjects,
  objectKind,
}: VoiceMathRoundProps) {
  const { stt, phase } = voiceSession;

  return (
    <div>
      <PlaygroundAmyShell
        messageKey={scenario.promptKey}
        messageVars={scenario.promptVars}
        muted={amy.muted}
        onToggleMute={() => amy.setMuted(!amy.muted)}
        speaking={amy.speaking}
        engagement={engagement}
        accentColor={accentColor}
      />

      {countingObjects && countingObjects.length > 0 && (
        <div
          className="relative rounded-2xl overflow-hidden mb-3"
          style={{
            minHeight: 160,
            background: "linear-gradient(180deg, rgba(34,197,94,0.12) 0%, rgba(0,0,0,0.2) 100%)",
            border: "1px solid rgba(34,197,94,0.25)",
          }}
        >
          {countingObjects.map((obj) => (
            <div
              key={obj.id}
              className="absolute"
              style={{ left: `${obj.x}%`, top: `${obj.y}%`, transform: "translate(-50%, -50%)" }}
            >
              <LivingPlaygroundObject
                kind={obj.kind}
                interactive={false}
                childId={childId}
                motionTrigger="idle_wiggle"
              />
            </div>
          ))}
        </div>
      )}

      {objectKind && !countingObjects?.length && (
        <div className="flex justify-center gap-2 mb-3 flex-wrap">
          {Array.from({ length: Math.min(scenario.expectedAnswers[0] ?? 3, 8) }).map((_, i) => (
            <LivingPlaygroundObject
              key={i}
              kind={objectKind}
              size={32}
              interactive={false}
              childId={childId}
            />
          ))}
        </div>
      )}

      <VoiceListeningIndicator
        listening={stt.listening}
        transcribing={stt.transcribing || phase === "validating"}
        transcript={stt.transcript}
        interimTranscript={stt.interimTranscript}
        accentColor={accentColor}
      />

      {phase === "retry" && (
        <p className="text-center text-xs text-white/50">Let&apos;s try once more — speak your answer!</p>
      )}
    </div>
  );
}
