# ADR-001 — Nest Conversation Host

**Status:** Accepted (binding decision) · Implementation deferred to Founder-approved Platform V3  
**Date:** 2026-08-05  
**Laws:** L01 · L07 · L09 · L14 · L15 · L16 · Hearing Room  
**Canon:** [`AMYNEST_CANON.md`](../AMYNEST_CANON.md) · [`PLATFORM_V3_ARCHITECTURE.md`](../PLATFORM_V3_ARCHITECTURE.md) Pillar 1

---

## Why Conversation Host was built

Hearing Nest ends at the door. Conversation still lived under ChatPlatform / Assistant layout contracts (keyboard, scroll, composer geometry, spinner language, topic chrome). Nest CSS maximized soft-bind; Nest Presence on Nest-owned shells could not close the gap. Further premium required a **Home-owned conversation substrate**, not more CSS.

---

## Decision

Build a **Nest Conversation Host** as the visual and layout owner of Hearing conversation.

- Hearing Room mounts the Host  
- Brain / send-receive / streaming may remain  
- ChatPlatform no longer defines UX, keyboard dock, or thread presence  

---

## Alternatives considered

| Alternative | Outcome |
|-------------|---------|
| A. Keep wrapping ChatPlatform with Nest CSS | Rejected — soft-bind maximized; F1/F2 remain framework-capped |
| B. Redesign Hearing Room / Nest CSS Phase 4 | Rejected — Design manufacturing COMPLETE; rooms frozen |
| C. Ship Hearing as visitor ChatPlatform app | Rejected — violates Resident / Unity / Adapter laws |
| D. Nest Conversation Host (Home primary, engine adapts) | **Chosen** |

---

## Chosen

**D — Nest Conversation Host** as Hearing runtime layout owner (composer, keyboard/viewport, thread presence, Nest prepare).

---

## Reason

- Immutable Laws: Home is primary API; adapters do not define UX  
- Framework Debt F1/F2 are P0 blockers for Hearing Nest Presence while typing  
- Law of living inside Nest: speak and type without leaving Nest air  
- Better resident of Hearing — not a bigger chatbot building  

---

## Consequences

| Positive | Negative / cost |
|----------|-----------------|
| Hearing can reach Nest Presence including keyboard + scroll | Keyboard/`adjustResize` regressions must be owned by Home |
| Spinner / topic / mode chrome can leave the care surface | Migration from AssistantBlackBox mount path |
| Brain reuse possible without ChatPlatform visual dogma | Dual-path until classic Assistant fully demoted |

---

## STOP

Decision record only. Not implementation.
