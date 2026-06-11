import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { isMpVoiceModeEnabled } from "../lib/feature-flags";
import { trackPlaygroundEvent } from "../lib/playground-analytics";
import type { PlayModeApi } from "./usePlayMode";

interface PlayModeSelectorProps {
  playMode: PlayModeApi;
  childId: number;
}

export function PlayModeSelector({ playMode, childId }: PlayModeSelectorProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [pending, setPending] = useState(false);
  const voiceEnabled = isMpVoiceModeEnabled();

  const selectTouch = useCallback(() => {
    playMode.setTouchMode();
    trackPlaygroundEvent("playground_mode_selected", childId, { playMode: "touch" });
  }, [playMode, childId]);

  const selectVoice = useCallback(async () => {
    setPending(true);
    const result = await playMode.trySetVoiceMode();
    setPending(false);
    if (result === "granted") {
      trackPlaygroundEvent("playground_mode_selected", childId, { playMode: "voice" });
      return;
    }
    trackPlaygroundEvent("voice_fallback_touch", childId, {
      reason: result === "denied" ? "denied" : "disabled",
    });
    toast({
      title: t("components.math_playground.amy_mic_denied"),
      variant: "destructive",
    });
  }, [playMode, childId, toast, t]);

  if (!voiceEnabled) return null;

  return (
    <div
      className="flex gap-2 mb-3 p-1 rounded-xl"
      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      <ModeButton
        testId="mp-mode-touch"
        active={playMode.mode === "touch"}
        onClick={selectTouch}
        label={t("components.math_playground.mode_touch")}
        emoji="🖐"
        disabled={pending}
      />
      <ModeButton
        testId="mp-mode-voice"
        active={playMode.mode === "voice"}
        onClick={() => void selectVoice()}
        label={t("components.math_playground.mode_voice")}
        emoji="🎤"
        disabled={pending}
      />
    </div>
  );
}

function ModeButton({
  testId,
  active,
  onClick,
  label,
  emoji,
  disabled,
}: {
  testId?: string;
  active: boolean;
  onClick: () => void;
  label: string;
  emoji: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      disabled={disabled}
      className="flex-1 rounded-lg py-2 px-2 text-center transition-all active:scale-95 disabled:opacity-50"
      style={{
        background: active ? "rgba(245,158,11,0.25)" : "transparent",
        border: active ? "1px solid rgba(245,158,11,0.45)" : "1px solid transparent",
      }}
    >
      <span className="text-lg leading-none">{emoji}</span>
      <p className="text-[10px] font-bold text-white/85 mt-0.5">{label}</p>
    </button>
  );
}
