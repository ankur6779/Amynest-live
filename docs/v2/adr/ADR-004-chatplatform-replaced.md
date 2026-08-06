# ADR-004 — ChatPlatform Replaced (as UX owner)

**Status:** Accepted (binding decision) · Implementation deferred to Founder-approved Platform V3  
**Date:** 2026-08-05  
**Laws:** L03 · L07 · L09 · L14 · L16  
**Depends on:** [ADR-001](./ADR-001-conversation-host.md)  
**Canon:** [`PLATFORM_V3_ARCHITECTURE.md`](../PLATFORM_V3_ARCHITECTURE.md) · [`FRAMEWORK_DEBT_REGISTER.md`](../FRAMEWORK_DEBT_REGISTER.md) F1–F7

---

## Why ChatPlatform was replaced

ChatPlatform was a temporary framework that **defined** conversation UX: keyboard/`adjustResize`/scroll, inline composer height, interactive trees, loading language. Nest CSS could not override those contracts. Leaving ChatPlatform as visual owner made Hearing a visitor inside the Home — permanent framework debt (F1 P0).

Permanence Law: frameworks are temporary. Home API Law: nothing outside may define UX. Replacement means **visual/layout ownership**, not necessarily deleting every Brain call path on day one.

---

## Decision

**Replace ChatPlatform as the conversation UX owner** with Nest Conversation Host ([ADR-001](./ADR-001-conversation-host.md)).

- ChatPlatform (and Assistant chrome) demoted to adapter or removed from Nest Hearing path  
- Brain may remain where sound  
- No Nest-skin forever strategy for ChatPlatform layout dogma  

---

## Alternatives considered

| Alternative | Outcome |
|-------------|---------|
| A. Eternal Nest CSS soft-bind of ChatPlatform | Rejected — COMPLETE; still ~91% framework-capped |
| B. Accept ChatPlatform UX as “good enough” | Rejected — fails Hearing Nest Presence / Care Test |
| C. Build a second chatbot product beside Nest | Rejected — bigger building; belongs outside |
| D. Replace ChatPlatform UX ownership with Nest Conversation Host | **Chosen** |

---

## Chosen

**D — Replace ChatPlatform’s role as UX owner.** Host is Nest; former platform is adapter or gone.

---

## Reason

- F1 blocks Hearing while typing — architecture required, not polish  
- L03 / L14 — frameworks and SDKs are replaceable adapters  
- L07 — wrap-forever is not a better resident  
- Pixel / Framework registers: remaining gap is Class A, not CSS  

---

## Consequences

| Positive | Negative / cost |
|----------|-----------------|
| Hearing UX sovereignty returns to Home | Hard migration; keyboard regression risk (named in F1) |
| Clears path past Nest CSS completion gate | Assistant mode/quota/topic chrome must be product-decided (P5/P6), not smuggled back |
| Aligns Platform V3.2 with Immutable Laws | Until shipped, Nest Hearing entry still wraps a visitor engine |

**Clarification:** “Replaced” means **replaced as authority over experience**. Residual Brain/transport code may persist as adapter under Home.

---

## STOP

Decision record only. Not implementation.
