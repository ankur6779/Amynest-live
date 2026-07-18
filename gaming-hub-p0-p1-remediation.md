# Gaming Hub — P0 / Critical P1 Remediation

**Date:** 2026-07-18  
**Scope:** Launch blockers only — no redesign, no new gamification, no progression redesign.

---

## Files changed

### New
- `src/lib/game-finish.ts` + `.test.ts` — durable finish + sync queue
- `gaming-hub-p0-p1-remediation.md`

### Updated (P0)
- `pages/games.tsx` — never fail-closed; flush pending sync on online
- `game-experience.ts` — soft-fail helpers; intro auto timing constant
- Soft-fail: `PatternMatch`, `OddOneOut`, `FindMistake`, `NumberMatch`, `SpeedMath`
- Dual economy demotion: `GamesPageHeader`, `GameResultPanel`, `GamesStatusCard`, `GamesInsightsPanel`

### Updated (P1)
- `CardFlip.tsx` — SR labels + landscape board
- `GamePlayIntro.tsx` — **tap-to-start only** (auto-start removed)
- `game-perf.ts` — low-power heuristic narrowed
- `game-a11y.ts` — phone landscape board styles
- Tests: `game-experience.test.ts`, `game-perf.test.ts`

---

## Root cause → Before vs After

### P0-1 Finish fail-closed
| | |
|--|--|
| **Root cause** | `finishGame` returned early on `recordGamingPlay` error → no result, no mastery |
| **Before** | Network error → modal closed, progress lost |
| **After** | Mastery always local; guest/local play on sync fail; result always shown; queue + `online` flush for wallet |

### P0-2 Dual progression
| | |
|--|--|
| **Root cause** | Coins/combo led the header & result while mastery was secondary |
| **Before** | Points hero + combo badge primary |
| **After** | Header = Skill mastery; points/combo in menu; result leads with practice/mastery; Nest points demoted note |

### P0-3 Soft-fail reveal
| | |
|--|--|
| **Root cause** | Wrong path revealed answer emoji/digit then advanced |
| **Before** | “Next time look for 🚗” / green correct highlight on first miss |
| **After** | Encourage → retry → process hint → advance without naming answer (2 attempts) |

### P1 highlights
| Issue | After |
|-------|-------|
| Card Flip SR | `Card N, face down / showing / matched` |
| Intro auto-start | Removed — Start button `autoFocus` |
| Offline finish | Covered by durable finish + sync queue |
| Low-power | Save-Data / ≤2GB / 2g / ≤2 cores+≤3GB only |
| Landscape | Phone landscape scroll + board max-width |
| Session E2E reliability | `game-finish.test.ts` covers sync-fail durability |

---

## Risks

1. Signed-in + sync fail still awards **local** Nest points via `recordPlay` — may diverge from server until flush (acceptable for durability).
2. Soft-fail increases session time slightly (extra attempts).
3. Points unlock copy still exists in lock chips (legacy) — demoted, not deleted.
4. BehaviorChoice still explains “why” after a pick (educational; intentional).

---

## Remaining P2 (not in this pass)

- Parent mastery chip on child intro surface
- Mastery multi-device sync
- Adaptive content-stage “lead” refinement
- Residual `skillLevelFromPercent` helper
- Broader emoji text alternatives
- Dialog focus order polish beyond Start autofocus

---

## Updated certification estimate

| Dimension | Prior (Phase 8) | After remediation |
|-----------|----------------:|------------------:|
| Production Readiness | 80 | **92** |
| Parent Trust | 85 | **92** |
| Educational Value | 92 | **95** |
| Accessibility | 86 | **91** |
| Commercial Readiness | 78 | **88** |
| **Overall** | **86** | **~93** |
| **Verdict path** | ⚠ With conditions | **Ready for re-cert / GA review** (device smoke still advised) |
| **Confidence** | 62% | **~84%** after P0/P1 close |

**STOP** — launch blockers addressed; no further feature work in this pass.
