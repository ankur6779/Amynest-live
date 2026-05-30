import type { ReactNode } from "react";
import type { ChatPlatformSurface } from "@/components/chat-platform";

export type ThreadTheme = "app" | "onboarding";

export interface SelectOption {
  id: string;
  label: string;
  value: string;
  emoji?: string;
}

export type InteractionSpec =
  | { type: "single-select"; options: SelectOption[]; layout?: "grid" | "row" | "stack" }
  | {
      type: "multi-select";
      options: SelectOption[];
      min?: number;
      max?: number;
      confirmLabel?: string;
      skipLabel?: string;
    }
  | { type: "date"; max?: string; confirmLabel?: string }
  | {
      type: "time-quick";
      options: string[];
      allowCustom?: boolean;
      defaultValue?: string;
      confirmLabel?: string;
    }
  | {
      type: "mcq";
      question: string;
      options: string[];
      correctIndex?: number | null;
      content?: string;
      examples?: string[];
    }
  | {
      type: "actions";
      buttons: Array<{ id: string; label: string; variant?: "default" | "outline"; icon?: ReactNode }>;
    }
  | {
      type: "country-detect";
      isLocating?: boolean;
      needsPermission?: boolean;
      detected?: { code: string; name: string; flag: string; sourceLabel?: string };
      onAllowLocation?: () => void;
      onPickManually?: () => void;
      onConfirmDetected?: () => void;
      onChangeCountry?: () => void;
      locationRequesting?: boolean;
    }
  | { type: "topic-grid"; topics: Array<{ id: string; label: string }> }
  | { type: "start-session"; title: string; body: string; buttonLabel: string };

export type InteractionState =
  | { status: "pending" }
  | { status: "resolved"; selectedIds?: string[]; pickedIndex?: number; value?: string };

export type ThreadMessage =
  | { kind: "amy"; id: string; text: string; disclaimer?: string; badge?: string }
  | { kind: "user"; id: string; text: string; askAgain?: { label: string; onAskAgain: () => void } }
  | {
      kind: "interactive";
      id: string;
      amyText?: string;
      interaction: InteractionSpec;
      state: InteractionState;
      theme?: ThreadTheme;
    }
  | { kind: "system"; id: string; content: ReactNode }
  | { kind: "typing"; id?: string }
  | {
      kind: "amy-rich";
      id: string;
      text: string;
      badge?: string;
      onListen?: () => void;
      onPrimeListen?: () => void;
      highlight?: boolean;
    };

export interface InteractionEvent {
  messageId: string;
  type: InteractionSpec["type"];
  optionId?: string;
  optionValue?: string;
  optionLabel?: string;
  selectedIds?: string[];
  pickedIndex?: number;
  dateValue?: string;
  timeValue?: string;
  actionId?: string;
}

export interface ChatThreadProps {
  surface: ChatPlatformSurface;
  theme?: ThreadTheme;
  messages: ThreadMessage[];
  draft: string;
  onDraftChange: (value: string) => void;
  onSend: () => void;
  onInteraction?: (event: InteractionEvent) => void;
  header?: ReactNode;
  composerPlaceholder?: string;
  composerDisabled?: boolean;
  composerHidden?: boolean;
  sendDisabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  messagesClassName?: string;
  footerClassName?: string;
  footerExtra?: ReactNode;
  scrollDeps?: unknown[];
  onMessagesScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  scrollToLatestLabel?: string;
  showScrollLatest?: boolean;
  onScrollLatest?: () => void;
  textareaRef?: React.RefObject<HTMLTextAreaElement | null>;
  layout?: "fullscreen" | "embedded";
  testId?: string;
}

export function createThreadMessageId(prefix = "msg"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
