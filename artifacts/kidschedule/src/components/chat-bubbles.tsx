import type { ChatBubbleTheme } from "@/components/chat-thread/types";
import { AmyMessageBubble, AmyTypingBubble } from "@/components/chat-thread/bubbles/amy-message-bubble";
import { UserMessageBubble } from "@/components/chat-thread/bubbles/user-message-bubble";

/** @deprecated Use AmyMessageBubble / UserMessageBubble from @/components/chat-thread */
export type { ChatBubbleTheme };

/** @deprecated Use AmyTypingBubble from @/components/chat-thread */
export function ChatTypingBubble({ theme = "app" }: { theme?: ChatBubbleTheme }) {
  return <AmyTypingBubble theme={theme} />;
}

/** @deprecated Use AmyMessageBubble from @/components/chat-thread */
export function ChatAmyBubble({
  text,
  theme = "app",
  className,
  promptId,
}: {
  text: string;
  theme?: ChatBubbleTheme;
  className?: string;
  promptId?: string | null;
}) {
  return (
    <AmyMessageBubble
      text={text}
      theme={theme}
      className={className}
      promptId={promptId}
    />
  );
}

/** @deprecated Use UserMessageBubble from @/components/chat-thread */
export function ChatUserBubble({
  text,
  theme = "app",
  className,
}: {
  text: string;
  theme?: ChatBubbleTheme;
  className?: string;
}) {
  return <UserMessageBubble text={text} theme={theme} className={className} />;
}
