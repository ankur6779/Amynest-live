import type { RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";

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
}) {
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
      <div className="flex items-end gap-3 rounded-2xl border border-border bg-card p-3 shadow-sm transition-colors focus-within:border-primary">
        <Textarea
          ref={textareaRef}
          placeholder={placeholder}
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
          className="max-h-[120px] min-h-[40px] flex-1 resize-none border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 placeholder:text-muted-foreground disabled:opacity-60"
          rows={1}
          data-testid="chat-thread-input"
        />
        <Button
          onClick={onSend}
          disabled={sendDisabled || !draft.trim() || disabled}
          size="icon"
          className="shrink-0 rounded-xl"
          aria-label="Send message"
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
