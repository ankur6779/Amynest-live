import { AmyCompanionBar } from "./AmyCompanionBar";
import { PlaygroundAmyAvatar } from "../amy/PlaygroundAmyAvatar";
import { isMpAmyAvatarEnabled } from "../lib/feature-flags";
import type { PlaygroundEngagementApi } from "../hooks/usePlaygroundEngagement";

interface PlaygroundAmyShellProps {
  messageKey: string;
  messageVars?: Record<string, string | number>;
  muted: boolean;
  onToggleMute: () => void;
  speaking?: boolean;
  engagement?: PlaygroundEngagementApi;
  accentColor?: string;
}

export function PlaygroundAmyShell({
  messageKey,
  messageVars,
  muted,
  onToggleMute,
  speaking,
  engagement,
  accentColor,
}: PlaygroundAmyShellProps) {
  if (isMpAmyAvatarEnabled() && engagement) {
    return (
      <PlaygroundAmyAvatar
        messageKey={messageKey}
        messageVars={messageVars}
        muted={muted}
        onToggleMute={onToggleMute}
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
      speaking={speaking}
    />
  );
}
