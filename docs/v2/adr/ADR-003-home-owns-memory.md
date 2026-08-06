# ADR-003 — Memory Belongs to Home

**Status:** Accepted (binding decision)  
**Date:** 2026-08-05  
**Laws:** L04 · L08 · L14  
**Canon:** [`AMYNEST_CANON.md`](../AMYNEST_CANON.md) · [`ONE_MEMORY_LAW.md`](../ONE_MEMORY_LAW.md) · [`V3_HOME_CONTRACT.md`](../V3_HOME_CONTRACT.md) §IV

---

## Why Memory belongs to Home

If Coach, Mission, Ask Amy, Child, or Premium each own memory, Amy fragments. The parent re-introduces the child. Rooms start keeping private truth. Continuity dies. One Memory Law: there is only one Amy.

---

## Decision

**The Home owns memory.**

- No room owns memory  
- Engines only **read** what the Home already knows  
- Writes update **Home** memory — never engine-private authoritative silos  
- Ephemeral caches allowed; Home remains source of truth  

---

## Alternatives considered

| Alternative | Outcome |
|-------------|---------|
| A. Per-engine memory (Coach store, Chat store, Speech store as truth) | Rejected — second Amys |
| B. Per-room memory | Rejected — rooms own emotion, not memory (L04) |
| C. Provider/SDK memory as product truth | Rejected — adapters only (L14) |
| D. Home-owned memory; engines read (and write through Home) | **Chosen** |

---

## Chosen

**D — Home owns memory.** Engines consume Home knowledge.

---

## Reason

- L08 Memory Law — one Amy across Coach, Mission, Ask Amy, Child, Premium  
- L04 Ownership — Home owns continuity; memory is continuity’s substrate  
- Resident Law — deepening rooms must not invent a second mind  
- Death Test — a new engineer must not rebuild siloed Amys from silence  

---

## Consequences

| Positive | Negative / cost |
|----------|-----------------|
| Parent never re-teaches Amy when changing rooms | Requires Home memory substrate / sync discipline |
| Engines stay replaceable adapters | Migration off engine-local “source of truth” stores |
| Care feels continuous | Latency caches must not diverge into silent second truths |

---

## STOP

Decision record only. Not implementation.
