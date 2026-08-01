import {
  FrontDoorState,
  isFrontDoorState,
  resumeFrontDoorState,
  type FrontDoorStateId,
} from "../front-door/state-machine";
import type { V2GuestSession } from "./types";
import {
  V2_GUEST_SESSION_VERSION,
  V2_GUEST_STORAGE_KEY,
} from "./types";

/** Pre-review key — read once and migrate forward. */
const LEGACY_STORAGE_KEY = "amynest.v2.guest.session.v1";

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined";
  } catch {
    return false;
  }
}

type LegacyGuestBlob = {
  version?: number;
  guestId?: string;
  createdAt?: string;
  updatedAt?: string;
  ageBand?: string | null;
  name?: string | null;
  worry?: string | null;
  childName?: string | null;
  worryId?: string | null;
  state?: string | null;
  frontDoorStep?: string | null;
  foundationComplete?: boolean;
};

function migrateLegacy(raw: LegacyGuestBlob): V2GuestSession | null {
  if (!raw || typeof raw.guestId !== "string") return null;

  const name =
    typeof raw.name === "string"
      ? raw.name
      : typeof raw.childName === "string"
        ? raw.childName
        : null;
  const worry = (
    typeof raw.worry === "string"
      ? raw.worry
      : typeof raw.worryId === "string"
        ? raw.worryId
        : null
  ) as V2GuestSession["worry"];

  const ageBand = (raw.ageBand ?? null) as V2GuestSession["ageBand"];

  let state: FrontDoorStateId;
  if (isFrontDoorState(raw.state)) {
    state = raw.state;
  } else if (raw.foundationComplete || worry) {
    state = FrontDoorState.COMPLETE;
  } else {
    state = resumeFrontDoorState({ ageBand, worry, state: null });
  }

  return {
    version: V2_GUEST_SESSION_VERSION,
    guestId: raw.guestId,
    createdAt:
      typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString(),
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    ageBand,
    name,
    worry,
    state,
  };
}

function isCurrentShape(value: unknown): value is V2GuestSession {
  if (!value || typeof value !== "object") return false;
  const raw = value as LegacyGuestBlob;
  return (
    raw.version === V2_GUEST_SESSION_VERSION &&
    typeof raw.guestId === "string" &&
    isFrontDoorState(raw.state) &&
    typeof raw.createdAt === "string" &&
    typeof raw.updatedAt === "string"
  );
}

export function readGuestSessionRaw(): V2GuestSession | null {
  if (!canUseStorage()) return null;
  try {
    const current = localStorage.getItem(V2_GUEST_STORAGE_KEY);
    if (current) {
      const parsed: unknown = JSON.parse(current);
      if (isCurrentShape(parsed)) return parsed;
      const migrated = migrateLegacy(parsed as LegacyGuestBlob);
      if (migrated) {
        writeGuestSessionRaw(migrated);
        return migrated;
      }
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = migrateLegacy(JSON.parse(legacy) as LegacyGuestBlob);
      if (migrated) {
        writeGuestSessionRaw(migrated);
        try {
          localStorage.removeItem(LEGACY_STORAGE_KEY);
        } catch {
          /* ignore */
        }
        return migrated;
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function writeGuestSessionRaw(session: V2GuestSession): void {
  if (!canUseStorage()) return;
  try {
    const payload: V2GuestSession = {
      ...session,
      version: V2_GUEST_SESSION_VERSION,
    };
    localStorage.setItem(V2_GUEST_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Quota / private mode — guest still works in-memory for the session.
  }
}

export function clearGuestSessionRaw(): void {
  if (!canUseStorage()) return;
  try {
    localStorage.removeItem(V2_GUEST_STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
