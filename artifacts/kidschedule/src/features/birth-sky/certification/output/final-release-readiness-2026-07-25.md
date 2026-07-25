# Final Release Readiness Sprint — Runtime Evidence

- Date (UTC): 2026-07-25T19:36:17.722953+00:00
- Deploy commit: `28f19c6b8`
- Deploy run: https://github.com/ankur6779/Amynest-live/actions/runs/30171035813 (success)
- Post-deploy conversation: `4992b4f7-d72a-4eaf-b61d-86021a91adc0`
- Artifact: `live-ai-50-production-2026-07-25-v3-postdeploy.json`

## P0 — Hydration consistency

### Root cause
1. **Measurement**: prior 52% compared streamed text to *last* assistant without `messageId`, so a just-written complete reply could be compared to a previous moderated stub when GET lagged.
2. **Product bug**: stream `onDone`/`onModerated` did not update `localMessagesRef`, so a stale hydrate replace could drop the just-rendered assistant.

### Fix
- Hydrate retries until `expectMessageId` appears; keep streamed turns in `localMessagesRef`.
- Live metric: `stream body === persisted body` by `messageId` (+ retry).

### Before → After (runtime)
| Metric | Before | After (post-deploy) |
|---|---:|---:|
| Hydration match | 52% | **100%** |

## P1 — Moderation fallback
### Root cause
False-positive blocks on ordinary parenting English (`poor sleep`, `rich inner world`, ADHD-like phrasing) collapsed ~30% of replies into one stub.

### Fix
Narrow financial/medical patterns; deterministic varied truthful fallbacks by code+jobId seed.

### Before → After
| Metric | Before | After |
|---|---:|---:|
| Moderation rate | 30% | **0%** |
| Unique moderated fallbacks | 1 | n/a (0 moderated) |

## P1 — Practical guidance
### Root cause
Over-moderation + prompt under-emphasizing actionable “what to try” for parent how-to questions.

### Fix
Prompt craft for actionable questions; false-positive moderation removal; recentTurns continuity.

### Before → After
| Metric | Before | After |
|---|---:|---:|
| Practical guidance % | 16% | **92%** |

## P1 — Live validation (50 real streams)

| Metric | Previous run | Post-deploy run |
|---|---:|---:|
| streamOk | 50/50 | 50/50 |
| Hydration match | 52% | **100%** |
| Moderation rate | 30% | **0%** |
| Opening repetition (top) | stub ×15 | **none** |
| Ending repetition | stub ×15 | tradition label ×4 only |
| Practical % | 16% | **92%** |
| Grounding % | 70% | **100%** |
| avgMs | 5265 | 8001 |

## Final verdict

These sprint blockers are closed with post-deploy production evidence.

**NO-GO** for blanket GO (Public) remains if prior device / VoiceOver-TalkBack / perf / rollback / observability labs from the production validation sprint are still required — those were not re-run in this sprint.

For the blockers listed in this sprint (hydration ≥99%, moderation stub collapse, practical guidance, live 50): **PASS**.
