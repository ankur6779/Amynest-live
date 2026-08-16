/**
 * Experience-layer conversation titles.
 * No model call — first meaningful user line, never "New Chat 1".
 */

export const NEW_CHAT_TITLE = "New chat";

const MAX_TITLE_CHARS = 48;

export function titleFromFirstUserMessage(raw: string): string {
  const text = raw.replace(/\s+/g, " ").trim();
  if (!text) return NEW_CHAT_TITLE;
  const sentence = (text.split(/[.?!]/)[0] ?? text).trim() || text;
  if (sentence.length <= MAX_TITLE_CHARS) return sentence;
  const cut = sentence.slice(0, MAX_TITLE_CHARS);
  const sp = cut.lastIndexOf(" ");
  const base = (sp > 18 ? cut.slice(0, sp) : cut).trim();
  return `${base}…`;
}

export function groupConversationsByDay<T extends { updatedAt: string }>(
  items: T[],
  now = Date.now(),
): { label: "Today" | "Yesterday" | "Older"; items: T[] }[] {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayMs = startOfToday.getTime();
  const yesterdayMs = todayMs - 86_400_000;

  const today: T[] = [];
  const yesterday: T[] = [];
  const older: T[] = [];

  for (const item of items) {
    const t = Date.parse(item.updatedAt);
    if (!Number.isFinite(t) || t >= todayMs) today.push(item);
    else if (t >= yesterdayMs) yesterday.push(item);
    else older.push(item);
  }

  const groups: { label: "Today" | "Yesterday" | "Older"; items: T[] }[] = [];
  if (today.length) groups.push({ label: "Today", items: today });
  if (yesterday.length) groups.push({ label: "Yesterday", items: yesterday });
  if (older.length) groups.push({ label: "Older", items: older });
  return groups;
}
