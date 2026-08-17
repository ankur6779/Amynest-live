/**
 * Amy AI conversation sessions — experience-layer only.
 * Server still stores a flat per-user message list (`/api/ai/messages`).
 * Sessions, titles, and history grouping live here so we do not change DB/API.
 */

import { NEW_CHAT_TITLE, titleFromFirstUserMessage } from "./conversation-title";

export type AmyAiRole = "user" | "assistant" | "system";

export type AmyAiChatMessage = {
  id: string;
  role: AmyAiRole;
  content: string;
  createdAt: string;
};

export type AmyAiConversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AmyAiChatMessage[];
};

export type AmyAiSessionStore = {
  conversations: AmyAiConversation[];
};

const STORAGE_PREFIX = "amynest:amy-ai:sessions:v1:";

function nowIso(): string {
  return new Date().toISOString();
}

export function createMessageId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createConversationId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `c-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function emptyConversation(id = createConversationId()): AmyAiConversation {
  const ts = nowIso();
  return {
    id,
    title: NEW_CHAT_TITLE,
    createdAt: ts,
    updatedAt: ts,
    messages: [],
  };
}

export function storageKeyForUser(userId: string | null | undefined): string {
  return `${STORAGE_PREFIX}${userId && userId.length > 0 ? userId : "local"}`;
}

/**
 * Bind workspace state to one user. Active chat always starts blank so a prior
 * user's in-memory conversation cannot display or persist under another account.
 */
export function prepareAmyAiSessionForUser(userId: string | null | undefined): {
  store: AmyAiSessionStore;
  current: AmyAiConversation;
} {
  return {
    store: loadSessionStore(userId),
    current: emptyConversation(),
  };
}

export function loadSessionStore(userId: string | null | undefined): AmyAiSessionStore {
  if (typeof window === "undefined") return { conversations: [] };
  try {
    const raw = window.localStorage.getItem(storageKeyForUser(userId));
    if (!raw) return { conversations: [] };
    const parsed = JSON.parse(raw) as AmyAiSessionStore;
    if (!parsed || !Array.isArray(parsed.conversations)) return { conversations: [] };
    return {
      conversations: parsed.conversations.filter(
        (c) => c && typeof c.id === "string" && Array.isArray(c.messages),
      ),
    };
  } catch {
    return { conversations: [] };
  }
}

export function saveSessionStore(
  userId: string | null | undefined,
  store: AmyAiSessionStore,
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKeyForUser(userId), JSON.stringify(store));
  } catch {
    /* quota / private mode */
  }
}

export function listHistoryConversations(store: AmyAiSessionStore): AmyAiConversation[] {
  return [...store.conversations]
    .filter((c) => c.messages.some((m) => m.role === "user" || m.role === "assistant"))
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
}

export function upsertConversation(
  store: AmyAiSessionStore,
  conversation: AmyAiConversation,
): AmyAiSessionStore {
  const rest = store.conversations.filter((c) => c.id !== conversation.id);
  const hasContent = conversation.messages.some(
    (m) => m.role === "user" || m.role === "assistant",
  );
  return {
    conversations: hasContent ? [conversation, ...rest] : rest,
  };
}

export function deleteConversation(
  store: AmyAiSessionStore,
  conversationId: string,
): AmyAiSessionStore {
  return {
    conversations: store.conversations.filter((c) => c.id !== conversationId),
  };
}

export function renameConversation(
  store: AmyAiSessionStore,
  conversationId: string,
  title: string,
): AmyAiSessionStore {
  const next = title.replace(/\s+/g, " ").trim() || NEW_CHAT_TITLE;
  return {
    conversations: store.conversations.map((c) =>
      c.id === conversationId ? { ...c, title: next, updatedAt: nowIso() } : c,
    ),
  };
}

export function appendMessage(
  conversation: AmyAiConversation,
  message: Omit<AmyAiChatMessage, "id" | "createdAt"> &
    Partial<Pick<AmyAiChatMessage, "id" | "createdAt">>,
): AmyAiConversation {
  const next: AmyAiChatMessage = {
    id: message.id ?? createMessageId(),
    role: message.role,
    content: message.content,
    createdAt: message.createdAt ?? nowIso(),
  };
  const messages = [...conversation.messages, next];
  const firstUser = messages.find((m) => m.role === "user");
  const title =
    conversation.title === NEW_CHAT_TITLE && firstUser
      ? titleFromFirstUserMessage(firstUser.content)
      : conversation.title;
  return {
    ...conversation,
    title,
    messages,
    updatedAt: next.createdAt,
  };
}

export function searchConversations(
  conversations: AmyAiConversation[],
  query: string,
): AmyAiConversation[] {
  const q = query.trim().toLowerCase();
  if (!q) return conversations;
  return conversations.filter((c) => {
    if (c.title.toLowerCase().includes(q)) return true;
    return c.messages.some((m) => m.content.toLowerCase().includes(q));
  });
}

/** Seed one archived session from the flat server list — never auto-open it. */
export function seedFromServerHistory(
  store: AmyAiSessionStore,
  serverMessages: Array<{ role: string; content: string; createdAt?: string }>,
): AmyAiSessionStore {
  if (store.conversations.length > 0) return store;
  const messages: AmyAiChatMessage[] = serverMessages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .map((m) => ({
      id: createMessageId(),
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.createdAt ?? nowIso(),
    }));
  if (messages.length === 0) return store;
  const firstUser = messages.find((m) => m.role === "user");
  const createdAt = messages[0]?.createdAt ?? nowIso();
  const updatedAt = messages[messages.length - 1]?.createdAt ?? createdAt;
  const archived: AmyAiConversation = {
    id: createConversationId(),
    title: firstUser ? titleFromFirstUserMessage(firstUser.content) : "Previous conversation",
    createdAt,
    updatedAt,
    messages,
  };
  return { conversations: [archived] };
}
