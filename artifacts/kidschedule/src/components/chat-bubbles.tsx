import { AmyMascotLogo } from "@/components/amy-mascot-logo";
import { AmyIcon } from "@/components/amy-icon";
import { cn } from "@/lib/utils";

const ONBOARDING_GRAD =
  "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))";
const ONBOARDING_GLASS_BG = "rgba(255,255,255,0.10)";
const ONBOARDING_GLASS_BORDER = "1px solid rgba(168,85,247,0.30)";

export type ChatBubbleTheme = "onboarding" | "app";

function AmyAvatarMark({ theme, size = 32 }: { theme: ChatBubbleTheme; size?: number }) {
  if (theme === "onboarding") {
    return <AmyMascotLogo size={size} />;
  }
  return <AmyIcon size={size} ring />;
}

export function ChatTypingBubble({ theme = "app" }: { theme?: ChatBubbleTheme }) {
  if (theme === "onboarding") {
    return (
      <div className="flex items-end gap-2" role="status" aria-live="polite" aria-label="Amy is typing">
        <AmyAvatarMark theme={theme} size={32} />
        <div
          className="chat-typing-bubble flex items-center gap-1 rounded-2xl rounded-bl-sm px-4 py-3"
          style={{
            background: ONBOARDING_GLASS_BG,
            backdropFilter: "blur(12px)",
            border: ONBOARDING_GLASS_BORDER,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="inline-block h-2 w-2 rounded-full"
              style={{
                background: "hsl(var(--brand-indigo-500))",
                animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5" role="status" aria-live="polite" aria-label="Amy is typing">
      <div className="shrink-0" aria-hidden="true">
        <AmyAvatarMark theme={theme} size={32} />
      </div>
      <div className="chat-typing-bubble flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 shadow-sm">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-2 w-2 rounded-full bg-primary/70"
            style={{ animation: `typing-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

export function ChatAmyBubble({
  text,
  theme = "app",
  className,
}: {
  text: string;
  theme?: ChatBubbleTheme;
  className?: string;
}) {
  if (theme === "onboarding") {
    return (
      <div
        className={cn("chat-amy-bubble flex items-end gap-2", className)}
        role="article"
        aria-label={`Amy: ${text}`}
      >
        <AmyAvatarMark theme={theme} size={32} />
        <div
          className="max-w-[85%] rounded-2xl rounded-bl-sm px-4 py-3 text-sm leading-relaxed"
          style={{
            background: ONBOARDING_GLASS_BG,
            backdropFilter: "blur(12px)",
            border: ONBOARDING_GLASS_BORDER,
            color: "#fff",
          }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("chat-amy-bubble flex gap-2.5", className)} role="article" aria-label={`Amy: ${text}`}>
      <div className="shrink-0" aria-hidden="true">
        <AmyAvatarMark theme={theme} size={32} />
      </div>
      <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-border bg-card px-4 py-3 text-sm leading-relaxed shadow-sm">
        {text}
      </div>
    </div>
  );
}

export function ChatUserBubble({
  text,
  theme = "app",
  className,
}: {
  text: string;
  theme?: ChatBubbleTheme;
  className?: string;
}) {
  if (theme === "onboarding") {
    return (
      <div
        className={cn("chat-user-bubble flex justify-end", className)}
        role="article"
        aria-label={`You: ${text}`}
      >
        <div
          className="max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed text-primary-foreground"
          style={{ background: ONBOARDING_GRAD }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("chat-user-bubble flex justify-end", className)} role="article" aria-label={`You: ${text}`}>
      <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm">
        {text}
      </div>
    </div>
  );
}
