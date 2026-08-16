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
  | { type: "single-select"; options: SelectOption[]; layout?: "grid" | "row" | "stack" | "card" }
  | {
      type: "multi-select";
      options: SelectOption[];
      min?: number;
      max?: number;
      confirmLabel?: string;
      skipLabel?: string;
      allowOtherInput?: boolean;
      otherOptionId?: string;
      otherPlaceholder?: string;
    }
  | {
      type: "name-input";
      suggestions?: string[];
      placeholder?: string;
      confirmLabel?: string;
      initialValue?: string;
    }
  | { type: "name-suggestions"; suggestions: string[] }
  | {
      type: "birthday-collect";
      selectLabel: string;
      skipLabel: string;
      confirmLabel: string;
      maxDate?: string;
      initialIso?: string;
    }
  | {
      type: "name-confirm";
      suggestedName: string;
      confirmLabel?: string;
      editLabel?: string;
    }
  | {
      type: "age-select";
      options: Array<{ id: string; label: string; years: number; months: number }>;
      exactDobLabel?: string;
      maxDate?: string;
      confirmDobLabel?: string;
    }
  | {
      type: "time-range";
      ranges: Array<{ id: string; label: string; displayTime: string }>;
      exactLabel?: string;
      exactOptions?: string[];
    }
  | {
      type: "school-schedule";
      presets: Array<{ id: string; label: string; start: string; end: string; days: number[] }>;
      customLabel?: string;
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
  | { kind: "amy"; id: string; text: string; disclaimer?: string; badge?: string; markdown?: boolean }
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
  | { kind: "typing"; id?: string; statusLabel?: string }
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
  nameValue?: string;
  ageYears?: number;
  ageMonths?: number;
  customText?: string;
  schoolStart?: string;
  schoolEnd?: string;
  schoolDays?: number[];
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
  composerVariant?: "default" | "onboarding";
  layout?: "fullscreen" | "embedded";
  testId?: string;
  showDraft?: boolean;
  typingStatusLabel?: string;
  jumpToLatestClassName?: string;
  enterToSend?: boolean;
}

export function createThreadMessageId(prefix = "msg"): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
