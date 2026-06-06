export interface ChatMessage {
  id: string;
  role: "amy" | "user";
  text: string;
}

export type OnboardingStep =
  | "intro"
  | "country-confirm"
  | "child-name"
  | "child-dob"
  | "child-birthday"
  | "infant-feeding"
  | "infant-sleep"
  | "child-education-stage"
  | "child-class-grade"
  | "child-schedule-known"
  | "child-school-start"
  | "child-school-end"
  | "child-school-days"
  | "child-wake"
  | "child-sleep"
  | "parent-name"
  | "parent-role"
  | "parent-work"
  | "parent-region"
  | "parent-diet"
  | "parent-goals"
  | "parent-allergies"
  | "saving"
  | "done"
  | "notifications";

export function createChatMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function chatMessage(
  role: ChatMessage["role"],
  text: string,
  id = createChatMessageId(),
): ChatMessage {
  return { id, role, text };
}
