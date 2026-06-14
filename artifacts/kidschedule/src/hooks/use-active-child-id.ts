import { useEffect, useState } from "react";
import {
  ACTIVE_CHILD_CHANGE_EVENT,
  ACTIVE_CHILD_STORAGE_KEY,
  readStoredActiveChildId,
} from "@/lib/coach-age-nav";

/** Subscribe to hub active-child changes (localStorage + same-tab custom event). */
export function subscribeActiveChildId(listener: (childId: number | null) => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === ACTIVE_CHILD_STORAGE_KEY) {
      listener(readStoredActiveChildId());
    }
  };

  const onCustom = (e: Event) => {
    const detail = (e as CustomEvent<{ childId?: number }>).detail;
    if (detail?.childId != null && Number.isFinite(detail.childId)) {
      listener(detail.childId);
      return;
    }
    listener(readStoredActiveChildId());
  };

  window.addEventListener("storage", onStorage);
  window.addEventListener(ACTIVE_CHILD_CHANGE_EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(ACTIVE_CHILD_CHANGE_EVENT, onCustom);
  };
}

export function writeStoredActiveChildId(childId: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(ACTIVE_CHILD_STORAGE_KEY, String(childId));
  window.dispatchEvent(
    new CustomEvent(ACTIVE_CHILD_CHANGE_EVENT, { detail: { childId } }),
  );
}

/** Reactive hub active child — updates when parent switches children. */
export function useActiveChildId(): number | null {
  const [childId, setChildId] = useState<number | null>(() => readStoredActiveChildId());

  useEffect(() => subscribeActiveChildId(setChildId), []);

  return childId;
}
