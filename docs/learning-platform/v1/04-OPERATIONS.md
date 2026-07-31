# Operations — Testing, Performance, Reliability, Security, Privacy, Release — v1.0

## Testing strategy

### Package unit tests

| Package | How |
|---------|-----|
| `@workspace/learning-events` | `pnpm --filter @workspace/learning-events test` |
| `@workspace/learning-runtime` | `pnpm --filter @workspace/learning-runtime test` |
| `@workspace/knowledge-graph` | `pnpm --filter @workspace/knowledge-graph test` |
| `@workspace/learning-telemetry` | `pnpm --filter @workspace/learning-telemetry test` |
| `@workspace/learning-reliability` | `pnpm --filter @workspace/learning-reliability test` (+ `chaos` CLI) |
| `@workspace/learning-progress-engine` | Run `src/*.test.ts` via workspace Node test runner (no package script yet — debt) |

### Consumer adapter tests (Vitest / kidschedule)

```bash
pnpm --filter @workspace/kidschedule exec vitest run \
  src/lib/speech-coach-learning-adapter.test.ts \
  src/lib/story-world-learning-adapter.test.ts \
  src/lib/reading-world-learning-adapter.test.ts \
  src/lib/games-world-learning-adapter.test.ts
```

### Reliability chaos

```bash
pnpm --filter @workspace/learning-reliability chaos
```

DEV host: `?learningChaos=1` via `learning-reliability-host`.

### What to test when changing rules

1. Rule fires on intended event type
2. Struggle paths set `difficulty: "easier"` / hints
3. `learning.decision` does not loop
4. Feature flag off → skip
5. Latency sample stays under budget

---

## Performance budget

| Path | Budget | Notes |
|------|--------|-------|
| Runtime `processEvent` typical | **&lt; 5 ms** | Asserted in runtime tests |
| Event bus publish + sinks | Non-blocking for UI | Sink errors swallowed |
| KG `recordObservations` | O(observations) local | Skip unknown nodes |
| Telemetry collect | Silent, no UI jank | Batched / observer pattern |
| Inspector (DEV) | Best-effort | Must not ship blocking prod UI |

Presentation animation budgets remain under LPE / experience-system rules — not Runtime.

---

## Reliability budget

| Metric | Target |
|--------|--------|
| Chaos suite score | **≥ 90 / 100** |
| Data loss on offline flush | **none** for queued events (monotonic seq) |
| KG repair | Auto-repair on corrupt docs; telemetry `repair` events |
| Bus handler failure | Isolated — other subscribers continue |

Heal paths live in `learning-reliability` (`verify` / `heal`).

---

## Security model

- Learning Events / Runtime / KG client packages hold **no secrets**.
- Durable progression mutations are **server-authoritative** via LPE API + anti-spam (`evaluateActivityIngest`).
- Client adapters must not trust client-only XP.
- DEV inspector / chaos hosts must not expose PII beyond local child ids already in app storage.
- Feature flags are host-controlled, not user-editable remote code execution.

---

## Privacy model

- KG and offline queues are **device-local** (localStorage) unless separately synced (not in v1).
- Telemetry types are operational counters (bus/runtime/KG health) — avoid free-text PII in metadata.
- Parent insights show aggregates / labels from KG + Runtime reasons — keep copy warm via LPE emotional-copy rules.
- Attention scores are engagement heuristics, not medical data; do not market as clinical.

---

## Release engineering guide

### Before release

1. Run package tests listed above
2. Run reliability chaos (or CI equivalent)
3. Smoke Speech / Story / Reading / Games sessions on iOS Capacitor + Android WebView
4. Confirm `GrowthBootstrap` install order unchanged
5. Confirm no new core engine packages in the diff

### Allowed release changes under freeze

- Rule pack additive rules / flag defaults
- Consumer bugfixes and presentation
- Content catalog updates
- Telemetry threshold tuning
- Prompt / copy (guardrailed)

### Block release if

- New parallel mastery / difficulty / recommendation engine introduced
- Event schema breaking change without version bump + ADR
- Chaos score regresses below budget without waiver

### Deploy surfaces

| Surface | Bundle |
|---------|--------|
| Web | kidschedule Vite |
| iOS | Capacitor `www` from kidschedule |
| Android Play | WebView → production web |

API: deploy `api-server` when LPE endpoints change (separate from Runtime client freeze).
