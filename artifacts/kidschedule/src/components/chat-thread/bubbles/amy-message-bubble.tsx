import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { AmyIcon } from "@/components/amy-icon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CHAT_PROMPT_ATTR } from "@/lib/chat-platform";
import { cn } from "@/lib/utils";
import { Volume2 } from "lucide-react";
import type { ThreadTheme } from "../types";

const ONBOARDING_GLASS_BG = "rgba(255,255,255,0.10)";
const ONBOARDING_GLASS_BORDER = "1px solid rgba(168,85,247,0.30)";

function AmyAvatar({ theme, size = 32 }: { theme: ThreadTheme; size?: number }) {
  if (theme === "onboarding") return <AmyMascotLogo size={size} />;
  return <AmyIcon size={size} ring />;
}

export function AmyMessageBubble({
  text,
  theme = "app",
  className,
  promptId,
  disclaimer,
  badge,
  onListen,
  onPrimeListen,
  highlight,
}: {
  text: string;
  theme?: ThreadTheme;
  className?: string;
  promptId?: string | null;
  disclaimer?: string;
  badge?: string;
  onListen?: () => void;
  onPrimeListen?: () => void;
  highlight?: boolean;
}) {
  const promptProps =
    promptId != null && promptId !== "" ? { [CHAT_PROMPT_ATTR]: promptId } : undefined;

  if (theme === "onboarding") {
    return (
      <div
        className={cn("chat-amy-bubble flex items-end gap-2", className)}
        role="article"
        aria-label={`Amy: ${text}`}
        {...promptProps}
      >
        <AmyAvatar theme={theme} />
        <div className="max-w-[85%] space-y-1">
          <div
            className={cn(
              "rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed",
              highlight && "ring-2 ring-primary/30",
            )}
            style={{
              background: ONBOARDING_GLASS_BG,
              backdropFilter: "blur(12px)",
              border: ONBOARDING_GLASS_BORDER,
              color: "#fff",
            }}
          >
            {badge ? (
              <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wide">
                {badge}
              </Badge>
            ) : null}
            <p className="whitespace-pre-wrap">{text}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("chat-amy-bubble flex gap-2.5", className)}
      role="article"
      aria-label={`Amy: ${text}`}
      {...promptProps}
    >
      <div className="shrink-0" aria-hidden="true">
        <AmyAvatar theme={theme} />
      </div>
      <div className="flex max-w-[85%] flex-col items-start gap-1">
        <div
          className={cn(
            "rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm leading-relaxed shadow-sm",
            highlight && "ring-2 ring-primary/20",
          )}
        >
          {badge ? (
            <Badge variant="secondary" className="mb-2 text-[10px] uppercase tracking-wide">
              {badge}
            </Badge>
          ) : null}
          <p className="whitespace-pre-wrap text-foreground">{text}</p>
          {onListen ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-2 rounded-full text-xs"
              onPointerDown={() => onPrimeListen?.()}
              onClick={onListen}
            >
              <Volume2 className="mr-1.5 h-3.5 w-3.5" />
              Listen
            </Button>
          ) : null}
        </div>
        {disclaimer ? (
          <Badge variant="outline" className="h-auto border-none px-0 text-[10px] text-muted-foreground">
            {disclaimer}
          </Badge>
        ) : null}
      </div>
    </div>
  );
}

export function AmyTypingBubble({
  theme = "app",
  statusLabel,
}: {
  theme?: ThreadTheme;
  /** Progressive status copy — replaces bare dots-only infinite loading. */
  statusLabel?: string;
}) {
  const dotClass =
    theme === "onboarding"
      ? "inline-block h-1.5 w-1.5 rounded-full"
      : "inline-block h-2 w-2 rounded-full bg-primary/70";

  const dots = [0, 1, 2].map((i) => (
    <span
      key={i}
      className={dotClass}
      style={
        theme === "onboarding"
          ? {
              background: "hsl(var(--brand-indigo-500))",
              animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
            }
          : { animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }
      }
    />
  ));

  const bubble =
    theme === "onboarding" ? (
      <div
        className="chat-typing-bubble flex max-w-[85%] flex-col gap-1.5 rounded-2xl rounded-bl-sm px-4 py-3"
        style={{
          background: ONBOARDING_GLASS_BG,
          backdropFilter: "blur(12px)",
          border: ONBOARDING_GLASS_BORDER,
        }}
      >
        {statusLabel ? (
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
            {statusLabel}
          </p>
        ) : null}
        <div className="flex items-center gap-1">{dots}</div>
      </div>
    ) : (
      <div className="chat-typing-bubble flex max-w-[85%] flex-col gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm">
        {statusLabel ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{statusLabel}</p>
        ) : null}
        <div className="flex items-center gap-1.5">{dots}</div>
      </div>
    );

  return (
    <div
      className="flex items-end gap-2"
      role="status"
      aria-live="polite"
      aria-label={statusLabel || "Amy is typing"}
    >
      <AmyAvatar theme={theme} />
      {bubble}
    </div>
  );
}
