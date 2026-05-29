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
  | "infant-feeding"
  | "infant-sleep"
  | "child-school"
  | "child-class"
  | "child-school-start"
  | "child-school-end"
  | "child-school-days"
  | "child-wake"
  | "child-sleep"
  | "add-more"
  | "parent-name"
  | "parent-role"
  | "parent-work"
  | "parent-region"
  | "parent-diet"
  | "parent-goals"
  | "parent-mobile"
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
