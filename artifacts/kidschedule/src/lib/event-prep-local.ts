/** Event Prep — browser-local persistence (photos, reminders, calendar flags). */

const PHOTO_PREFIX = "eventPrepPhoto:";
const PREVIEW_PREFIX = "eventPrepPreview:";
const REMINDER_PREFIX = "eventPrepReminders:";
const CALENDAR_PREFIX = "eventPrepCalendar:";

export function costumePhotoKey(eventId: string, childId: number, characterId?: string) {
  return `${PHOTO_PREFIX}${eventId}:${childId}${characterId ? `:${characterId}` : ""}`;
}

export function costumePreviewKey(eventId: string, childId: number, characterId?: string) {
  return `${PREVIEW_PREFIX}${eventId}:${childId}${characterId ? `:${characterId}` : ""}`;
}

export function loadCostumePhoto(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function saveCostumePhoto(key: string, dataUrl: string) {
  try {
    localStorage.setItem(key, dataUrl);
  } catch { /* quota */ }
}

export function removeCostumePhoto(key: string) {
  try {
    localStorage.removeItem(key);
  } catch { /* ignore */ }
}

export interface EventPrepReminderState {
  enabled: boolean;
  eventId: string;
  childId: number;
  scheduledAt: string;
}

export function loadReminderState(eventId: string, childId: number): EventPrepReminderState | null {
  try {
    const raw = localStorage.getItem(`${REMINDER_PREFIX}${eventId}:${childId}`);
    return raw ? JSON.parse(raw) as EventPrepReminderState : null;
  } catch {
    return null;
  }
}

export function saveReminderState(state: EventPrepReminderState) {
  try {
    localStorage.setItem(
      `${REMINDER_PREFIX}${state.eventId}:${state.childId}`,
      JSON.stringify(state),
    );
  } catch { /* ignore */ }
}

export function isCalendarSynced(eventId: string, childId: number): boolean {
  try {
    return localStorage.getItem(`${CALENDAR_PREFIX}${eventId}:${childId}`) === "1";
  } catch {
    return false;
  }
}

export function markCalendarSynced(eventId: string, childId: number) {
  try {
    localStorage.setItem(`${CALENDAR_PREFIX}${eventId}:${childId}`, "1");
  } catch { /* ignore */ }
}

const DISMISSED_REMINDER_PREFIX = "eventPrepDismissedReminder:";

export function dismissPrepReminder(eventId: string, childId: number, daysBefore: number) {
  try {
    localStorage.setItem(`${DISMISSED_REMINDER_PREFIX}${eventId}:${childId}:${daysBefore}`, "1");
  } catch { /* ignore */ }
}

export function isPrepReminderDismissed(eventId: string, childId: number, daysBefore: number): boolean {
  try {
    return localStorage.getItem(`${DISMISSED_REMINDER_PREFIX}${eventId}:${childId}:${daysBefore}`) === "1";
  } catch {
    return false;
  }
}
