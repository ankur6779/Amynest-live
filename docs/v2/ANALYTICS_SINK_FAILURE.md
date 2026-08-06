# AmyNest V2 — Analytics Sink Failure Strategy

**Status:** Binding (Sprint 3C-5 hardening)  
**Applies to:** All Analytics Core sinks (FirebaseSink today; future Ads / Debug / Internal)

---

## Law

> **Sink failures never block product UX.**  
> `trackV2AnalyticsEvent` / product emitters return independently of sink outcomes.  
> Events **may be dropped** after the bus has claimed the once-key.

---

## Guarantees

| Guarantee | Behavior |
|-----------|----------|
| UX non-blocking | Bus does **not** await sink success. Product flows (mission complete, Front Door, navigation) never wait on Firebase / network. |
| Exception isolation | Sink `write` throws or rejects → swallowed at the bus. No rethrow to callers. |
| Exactly-once bus claim | Once-key is claimed **before** sink fan-out. A failed sink does **not** reopen the key. |
| Drop allowed | Writer unavailable, offline, allowlist miss at sink, or throw → event may be **dropped**. No custom offline retry queue in 3C-5 (explicit no-op). |
| No product Firebase calls | Only the bus may invoke sinks. Product code must not catch/retry Firebase. |

---

## Outcomes (debug health)

Developer-only counters (`getV2SinkHealth`, debug mode only — **no production UI**):

| Counter | Meaning |
|---------|---------|
| **Accepted** | Sink forwarded successfully (e.g. Firebase `logEvent` ok) |
| **Dropped** | Writer failed / threw after claim — event lost for that sink |
| **Rejected** | Sink refused (unknown, not allowlisted, layer excluded) |
| **Duplicate** | Sink-level once-key already forwarded |

---

## Ordering (product emitters)

North Star emit order on the happy path remains:

1. `v2_mission_started`  
2. `v2_mission_completed`  
3. `v2_wow_completed` (when eligible; after completed, same call stack)

Sink async delivery must not reorder these bus-side tracks.

---

## Non-goals

- No production status UI  
- No Google Ads / RevenueCat changes in this policy  
- No guaranteed delivery / durable offline replay (future sprint if required)
