import { User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ThreadTheme } from "../types";

const ONBOARDING_GRAD =
  "linear-gradient(135deg,hsl(var(--brand-indigo-500)),hsl(var(--brand-purple-500)))";

export function UserMessageBubble({
  text,
  theme = "app",
  className,
  pending = false,
  askAgain,
}: {
  text: string;
  theme?: ThreadTheme;
  className?: string;
  /** Live draft while typing — slightly muted styling. */
  pending?: boolean;
  askAgain?: { label: string; onAskAgain: () => void };
}) {
  if (theme === "onboarding") {
    return (
      <div
        className={cn("chat-user-bubble flex justify-end", className)}
        role="article"
        aria-label={pending ? `Draft: ${text}` : `You: ${text}`}
      >
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed text-primary-foreground",
            pending && "opacity-70",
          )}
          style={{ background: ONBOARDING_GRAD }}
        >
          {text}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn("chat-user-bubble flex flex-row-reverse gap-2.5", className)}
      role="article"
      aria-label={pending ? `Draft: ${text}` : `You: ${text}`}
    >
      {!pending ? (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary/20 text-secondary-foreground">
          <User className="h-3.5 w-3.5" />
        </div>
      ) : null}
      <div className="flex max-w-[85%] flex-col items-end gap-1">
        <div
          className={cn(
            "rounded-2xl rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-foreground shadow-sm",
            pending && "opacity-70 border border-dashed border-primary/50",
          )}
        >
          {text}
        </div>
        {askAgain && !pending ? (
          <button
            type="button"
            onClick={askAgain.onAskAgain}
            className="inline-flex items-center gap-1 px-1 text-[11px] text-muted-foreground transition-colors hover:text-primary"
          >
            {askAgain.label}
          </button>
        ) : null}
      </div>
    </div>
  );
}
