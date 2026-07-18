# AmyNest Gaming Hub — Phase 9 GA Certification

**Date:** 2026-07-18  
**Mode:** Attempt-to-break / reliability gate (no features, no redesign, no gamification)  
**Evidence class:** Code audit + unit/reliability tests + desk device/network simulation  
**Physical device lab:** Not executed in this session (blocks full GA stamp)

---

## Final decision

# ⚠ SOFT LAUNCH ONLY

**Not** ✅ READY FOR GENERAL AVAILABILITY to 10,000+ families without a short real-device + a11y smoke.

**Allowed now**
- Invite / staged rollout (hundreds → low thousands)
- Internal dogfood + closed beta
- Gradual Play/App Store % rollout **after** soft-launch checklist below

**Blocked for full GA until**
1. Real-device smoke passes (Android Go 3GB + mid-range + iPhone SE + one tablet)
2. TalkBack + VoiceOver smoke on Card Flip + one timed game
3. Offline → reconnect wallet flush verified on a signed-in account once

---

## Remaining launch blockers

### P0 (code) — cleared in this phase
| Was | Status |
|-----|--------|
| Non-idempotent play sync double-award | **Fixed** — `idempotencyKey` on play API + queue |
| Finish double-submit | **Fixed** — `finishingRef` guard |
| Offline finish awaiting failed network | **Fixed** — `navigator.onLine === false` fast path |
| Corrupted mastery/queue JSON crash | **Fixed** — sanitize + recover |

### Residual (soft-launch conditions — not code P0)
| Risk | Severity | Mitigation |
|------|----------|------------|
| No physical device lab evidence | **P1 ops** | Soft launch + checklist |
| TalkBack/VoiceOver not run on hardware | **P1 ops** | 30-min a11y smoke |
| Mid-session kill loses in-progress rounds | **P2** | Acceptable for 2–4 min games; mastery on complete only |
| Multi-tab simultaneous finish race | **P2** | Rare; per-tab lock only |
| Server daily-limit vs local offline plays | **P2** | Flush may hit limit; mastery still kept |

**Zero open code P0. Zero open critical code P1 from Phase 8 remediation.**

---

## Device compatibility matrix (desk simulation)

| Target | Expectation | Confidence |
|--------|-------------|------------|
| Android Go 2GB | Low-power path (≤2GB); timers pause when hidden; blur cut | Medium |
| Android Go 3GB | OK if not Save-Data; watch memory on Target Tap | Medium |
| Android mid-range | OK (≤4 cores no longer force low-power) | High |
| Android flagship | OK | High |
| iPhone SE | Touch targets OK; landscape scroll CSS added | Medium |
| iPhone 13/14/15 | OK | High |
| Latest iPhone | OK | High |
| iPad / Android tablet | Usable; not tablet-native layout | Medium |
| Phone landscape | Board max-width + shell scroll | Medium |
| Tablet landscape | Pad CSS ≥768 | Medium |
| Safe areas / DPI | Token-based clamps; not fully verified on notches | Medium |

---

## Network compatibility matrix

| Condition | Behaviour | Status |
|-----------|-----------|--------|
| Offline launch | Hub loads from SPA/cache; games local | OK (PWA cache depends on host SW) |
| Offline gameplay | Local; no API required | OK |
| Offline completion | Mastery + local play + sync queue | **OK** (tested) |
| Offline mastery | localStorage | **OK** (tested) |
| Offline queue | Deduped by idempotency key | **OK** (tested) |
| Reconnect sync | `online` + hub mount flush | **OK** (code) |
| Slow 2G / high latency | Finish no longer fail-closed; may show sync banner | OK |
| Packet loss / flaky | Idempotent retry safe | **OK** (server+client) |
| WiFi ↔ mobile | Relies on `online` event | OK |
| Airplane mode | Offline fast path | **OK** (tested) |

---

## Offline verification

| Check | Result |
|-------|--------|
| Mastery written before network | Pass |
| Result screen always shown | Pass |
| Queue written when offline | Pass |
| Corrupted queue JSON | Pass (recovers empty + re-enqueue) |
| Flush sends idempotencyKey | Pass |
| Server duplicate key returns prior award | Pass (service logic) |

---

## Reliability findings

### Hardened this phase
1. **Idempotent `/gaming-rewards/play`** — ledger `idempotencyKey` short-circuit  
2. **Offline fast-path** — no doomed fetch when `navigator.onLine === false`  
3. **Finish mutex** — blocks double `onFinish`  
4. **Mastery sanitize** — corrupt records ignored; quota prune retry  
5. **Queue dedupe** — same finish key not enqueued twice  

### Still true under stress
- Background / lock screen: timers pause via `usePageVisible` (Target Tap, Sequence, Speed Math)  
- Force-close mid-game: incomplete session not mastered (by design)  
- Browser refresh mid-result: mastery already persisted  
- Orientation: phone landscape CSS; rapid flips may remount layout (non-fatal)

---

## Test coverage summary

| Layer | Coverage | Gap |
|-------|----------|-----|
| Unit — mastery / learning / experience / perf / a11y | Strong | — |
| Unit — durable finish + offline queue | **Strong (new)** | — |
| Unit — GA reliability / corruption | **Strong (new)** | — |
| Component — GameShell / Result / Dialog | Weak | Optional |
| E2E — journeys / TalkBack | **Missing** | Soft-launch gate |
| Device lab | **Missing** | Soft-launch gate |

**Critical tests added**
- `game-finish.test.ts` (offline, dedupe, flush, corruption)
- `game-ga-reliability.test.ts` (mastery corruption, long session, offline signed-in)

**Not recommending** cosmetic or feature tests — only ops smoke before GA.

---

## Risk assessment

| Domain | Risk | Level |
|--------|------|-------|
| Session durability (completed) | Low | After idempotent finish |
| Offline mastery | Low | |
| Wallet sync honesty | Low–Med | Until one live reconnect QA |
| Performance (low-end) | Med | Needs Android Go spot-check |
| Accessibility | Med | Code OK; device AT unproven |
| Multi-child / storage wipe | Med | Local-only mastery |
| Abuse (client scores) | Med | Pre-existing; unlock economy |

**Overall soft-launch risk:** Acceptable  
**Overall 10k GA risk without device smoke:** Too high

---

## Recommended final fixes (ops checklist — not product work)

1. **30–45 min device smoke** — Android Go 3GB, Pixel/mid, iPhone SE, one tablet landscape  
2. **TalkBack + VoiceOver** — Card Flip + Pattern Match + Speed Math Easy  
3. **Signed-in airplane → land → flush** — confirm Nest points sync once  
4. **Staged rollout** — 5% → 25% → 100% with crash/ANR watch  
5. Optional later (P2): cross-tab finish lock; mid-round checkpoint

---

## Soft-launch vs GA criteria

| Success criterion | Soft launch | Full GA |
|-------------------|-------------|---------|
| Zero code P0 | ✅ | ✅ |
| Zero critical code P1 | ✅ | ✅ |
| Stable offline (tested in CI) | ✅ | ✅ |
| Stable mastery persistence | ✅ | ✅ |
| Stable recovery after interruptions | ✅ code | Needs device confirm |
| Stable accessibility | ✅ code | Needs AT confirm |
| Stable performance | ✅ desk | Needs Go device |
| Real-world 10k confidence | — | After checklist |

---

## Files changed (Phase 9 reliability only)

- `artifacts/kidschedule/src/lib/game-finish.ts` (+ tests)
- `artifacts/kidschedule/src/lib/game-ga-reliability.test.ts` (new)
- `artifacts/kidschedule/src/lib/game-mastery.ts` (corrupt/quota harden)
- `artifacts/kidschedule/src/lib/gaming-wallet-api.ts` (idempotencyKey)
- `artifacts/kidschedule/src/pages/games.tsx` (finish mutex)
- `artifacts/api-server/src/routes/gaming-rewards.ts`
- `artifacts/api-server/src/services/gamingRewardsService.ts`
- `gaming-hub-phase9-ga-certification.md`

---

## Confidence

**78%** soft-launch ready for staged families  
**55%** full GA tomorrow without device/AT smoke  

After checklist: → **~90%** full GA.

---

**STOP.** Phase 9 complete. No further product work in this gate.
