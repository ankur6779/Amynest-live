import { V2_GUEST_SESSION_VERSION, type V2GuestSession } from "@/v2/guest/types";
import type { AmyMemoryDocument } from "./types";

/** Project Amy Memory → legacy V2GuestSession shape (bridge only). */
export function projectGuestSession(memory: AmyMemoryDocument): V2GuestSession {
  return {
    version: V2_GUEST_SESSION_VERSION,
    guestId: memory.identity.guestId ?? "anonymous",
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    ageBand: memory.child.ageBand,
    name: memory.child.displayName,
    worry: memory.challenge.worryId,
    state: memory.frontDoor.state,
  };
}
