import { useCallback } from "react";
import { AmyCompanionBar } from "./AmyCompanionBar";
import { PlaygroundAmyAvatar } from "../amy/PlaygroundAmyAvatar";
import { isMpAmyAvatarEnabled } from "../lib/feature-flags";
import type { PlaygroundEngagementApi } from "../hooks/usePlaygroundEngagement";
import type { usePlaygroundAmy } from "../hooks/usePlaygroundAmy";

type AmyAudioApi = Pick<
  ReturnType<typeof usePlaygroundAmy>,
  "playCueOnTap" | "speaking"
>;

interface PlaygroundAmyShellProps {
  messageKey: string;
  messageVars?: Record<string, string | number>;
  muted: boolean;
  onToggleMute: () => void;
  speaking?: boolean;
  amyAudio?: AmyAudioApi;
  engagement?: PlaygroundEngagementApi;
  accentColor?: string;
}

export function PlaygroundAmyShell({
  messageKey,
  messageVars,
  muted,
  onToggleMute,
  speaking,
  amyAudio,
  engagement,
  accentColor,
}: PlaygroundAmyShellProps) {
  const playMessage = useCallback(() => {
    amyAudio?.playCueOnTap(messageKey, messageVars);
  }, [amyAudio, messageKey, messageVars]);

  const resolvedSpeaking = speaking ?? amyAudio?.speaking;

  if (isMpAmyAvatarEnabled() && engagement) {
    return (
      <PlaygroundAmyAvatar
        messageKey={messageKey}
        messageVars={messageVars}
        muted={muted}
        onToggleMute={onToggleMute}
        onPlayMessage={amyAudio ? playMessage : undefined}
        amy3dState={engagement.amy3dState}
        presence={engagement.presence}
        reactionKey={engagement.reactionKey}
        accentColor={accentColor}
      />
    );
  }

  return (
    <AmyCompanionBar
      messageKey={messageKey}
      messageVars={messageVars}
      muted={muted}
      onToggleMute={onToggleMute}
      onPlayMessage={amyAudio ? playMessage : undefined}
      speaking={resolvedSpeaking}
    />
  );
}
