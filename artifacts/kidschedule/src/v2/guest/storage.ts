/**
 * Guest session persistence — adapter over Amy Memory (single SoT).
 * Must not write localStorage directly (P0 write ownership).
 */

import {
  clearAmyMemory,
  projectGuestSession,
  readAmyMemory,
  updateAmyMemory,
} from "@/v2/amy-memory";
import type { V2GuestSession } from "./types";

export function readGuestSessionRaw(): V2GuestSession | null {
  const memory = readAmyMemory();
  if (!memory?.identity.guestId) return null;
  return projectGuestSession(memory);
}

export function writeGuestSessionRaw(session: V2GuestSession): void {
  const existing = readAmyMemory();
  updateAmyMemory(
    {
      identity: {
        mode: existing?.identity.mode === "signed_in" ? "signed_in" : "guest",
        guestId: session.guestId,
        userId: existing?.identity.userId ?? null,
      },
      child: {
        displayName: session.name,
        ageBand: session.ageBand,
        childId: existing?.child.childId ?? null,
        ageMonths: existing?.child.ageMonths ?? null,
      },
      challenge: {
        worryId: session.worry,
        label: existing?.challenge.label ?? null,
        coachGoalId: existing?.challenge.coachGoalId ?? null,
      },
      frontDoor: {
        state: session.state,
      },
    },
    {
      source: "guest_bridge",
      sectionSources: {
        child: "guest_bridge",
        challenge: "guest_bridge",
      },
    },
  );
}

export function clearGuestSessionRaw(): void {
  clearAmyMemory();
}
