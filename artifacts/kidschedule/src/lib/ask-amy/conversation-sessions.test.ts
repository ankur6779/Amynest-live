import { afterEach, describe, expect, it } from "vitest";
import {
  appendMessage,
  deleteConversation,
  emptyConversation,
  listHistoryConversations,
  loadSessionStore,
  prepareAmyAiSessionForUser,
  renameConversation,
  saveSessionStore,
  searchConversations,
  seedFromServerHistory,
  storageKeyForUser,
  upsertConversation,
} from "./conversation-sessions";
import { NEW_CHAT_TITLE } from "./conversation-title";

const USER = "test-user";

afterEach(() => {
  localStorage.removeItem(storageKeyForUser(USER));
});

describe("conversation-sessions", () => {
  it("does not persist an empty new chat", () => {
    const store = upsertConversation({ conversations: [] }, emptyConversation());
    expect(store.conversations).toHaveLength(0);
    expect(listHistoryConversations(store)).toHaveLength(0);
  });

  it("appears in history after the first user message with a meaningful title", () => {
    const started = appendMessage(emptyConversation(), {
      role: "user",
      content: "Bedtime routine for John",
    });
    const store = upsertConversation({ conversations: [] }, started);
    expect(listHistoryConversations(store)).toHaveLength(1);
    expect(started.title).toBe("Bedtime routine for John");
    expect(started.title).not.toBe("New Chat 1");
  });

  it("keeps previous conversations when starting a new chat", () => {
    const first = appendMessage(emptyConversation(), {
      role: "user",
      content: "Healthy snacks",
    });
    let store = upsertConversation({ conversations: [] }, first);
    const second = appendMessage(emptyConversation(), {
      role: "user",
      content: "Screen time",
    });
    store = upsertConversation(store, second);
    expect(listHistoryConversations(store).map((c) => c.title)).toEqual([
      "Screen time",
      "Healthy snacks",
    ]);
  });

  it("seeds the flat server list as one archived session without requiring it to be current", () => {
    const seeded = seedFromServerHistory({ conversations: [] }, [
      { role: "user", content: "Bedtime routine", createdAt: "2026-08-15T10:00:00.000Z" },
      { role: "assistant", content: "Start with a wind down.", createdAt: "2026-08-15T10:00:01.000Z" },
    ]);
    expect(seeded.conversations).toHaveLength(1);
    expect(seeded.conversations[0]?.title).toBe("Bedtime routine");
    const again = seedFromServerHistory(seeded, [{ role: "user", content: "ignored" }]);
    expect(again.conversations).toHaveLength(1);
  });

  it("searches title and message text", () => {
    const conv = appendMessage(emptyConversation(), {
      role: "user",
      content: "Potty training tips",
    });
    const list = [conv];
    expect(searchConversations(list, "potty")).toHaveLength(1);
    expect(searchConversations(list, "sleep")).toHaveLength(0);
  });

  it("renames and deletes locally", () => {
    const conv = appendMessage(emptyConversation(), { role: "user", content: "Snacks" });
    let store = upsertConversation({ conversations: [] }, conv);
    store = renameConversation(store, conv.id, "Kitchen calm");
    expect(store.conversations[0]?.title).toBe("Kitchen calm");
    store = deleteConversation(store, conv.id);
    expect(store.conversations).toHaveLength(0);
  });

  it("round-trips localStorage", () => {
    const conv = appendMessage(emptyConversation(), { role: "user", content: "Hello" });
    saveSessionStore(USER, { conversations: [conv] });
    expect(loadSessionStore(USER).conversations[0]?.title).toBe("Hello");
    expect(emptyConversation().title).toBe(NEW_CHAT_TITLE);
  });

  it("prepareAmyAiSessionForUser returns empty current even when history exists", () => {
    const conv = appendMessage(emptyConversation(), { role: "user", content: "Private thread" });
    saveSessionStore(USER, { conversations: [conv] });
    const prepared = prepareAmyAiSessionForUser(USER);
    expect(prepared.store.conversations).toHaveLength(1);
    expect(prepared.current.messages).toHaveLength(0);
    expect(prepared.current.title).toBe(NEW_CHAT_TITLE);
  });

  it("prepareAmyAiSessionForUser isolates users", () => {
    saveSessionStore("user-a", {
      conversations: [appendMessage(emptyConversation(), { role: "user", content: "A secret" })],
    });
    const b = prepareAmyAiSessionForUser("user-b");
    expect(b.store.conversations).toHaveLength(0);
    expect(b.current.messages).toHaveLength(0);
  });
});
