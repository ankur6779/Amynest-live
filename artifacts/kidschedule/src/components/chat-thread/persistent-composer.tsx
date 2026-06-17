import type { RefObject } from "react";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAutoGrowTextarea } from "@/hooks/use-auto-grow-textarea";
import { Loader2, Send } from "lucide-react";

const COMPOSER_MAX_HEIGHT_PX = 120;
const COMPOSER_MIN_HEIGHT_PX = 40;
const ONBOARDING_MIN_HEIGHT_PX = 52;

export function PersistentComposer({
  draft,
  onDraftChange,
  onSend,
  placeholder = "Message Amy…",
  disabled = false,
  sendDisabled = false,
  hidden = false,
  textareaRef,
  onKeyDown,
  footerExtra,
  testId = "chat-thread-composer",
  variant = "default",
}: {
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  sendDisabled?: boolean;
  hidden?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  footerExtra?: React.ReactNode;
  testId?: string;
  variant?: "default" | "onboarding";
}) {
  const internalRef = useRef<HTMLTextAreaElement>(null);
  const resolvedRef = textareaRef ?? internalRef;
  const minHeightPx = variant === "onboarding" ? ONBOARDING_MIN_HEIGHT_PX : COMPOSER_MIN_HEIGHT_PX;

  useAutoGrowTextarea(resolvedRef, draft, {
    maxHeightPx: COMPOSER_MAX_HEIGHT_PX,
    minHeightPx,
  });

  if (hidden) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 opacity-0 pointer-events-none" aria-hidden="true">
        <div className="h-[52px]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4" data-testid={testId}>
      {footerExtra}
      <div
        className="flex items-end gap-3 rounded-2xl border border-border bg-card p-3 text-card-foreground shadow-sm transition-colors focus-within:border-primary"
        data-chat-answer="true"
      >
        <Textarea
          ref={resolvedRef}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          rows={1}
          className={
            variant === "onboarding"
              ? "max-h-[120px] min-h-[52px] flex-1 resize-none overflow-y-auto border-none bg-transparent p-0 text-lg font-medium text-card-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground disabled:opacity-60"
              : "max-h-[120px] min-h-[40px] flex-1 resize-none overflow-y-auto border-none bg-transparent p-0 text-sm text-card-foreground shadow-none focus-visible:ring-0 placeholder:text-muted-foreground disabled:opacity-60"
          }
          style={{ height: minHeightPx }}
          data-testid="chat-thread-input"
        />
        <Button
          onClick={onSend}
          disabled={sendDisabled || !draft.trim() || disabled}
          size="icon"
          className="h-9 w-9 shrink-0 rounded-xl"
          data-testid="chat-thread-send"
        >
          {disabled && sendDisabled ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
