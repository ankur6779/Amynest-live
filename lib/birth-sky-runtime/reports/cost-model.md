# LLM cost tracking model (RC10)

## Per-request fields (no PII)

| Field | Source |
|-------|--------|
| `promptTokens` | LLM usage (`inputTokens`) |
| `completionTokens` | LLM usage (`outputTokens`) |
| `estimatedCostUsd` | `estimateBirthSkyCostUsd({ tier, inputTokens, outputTokens })` |
| `llmLatencyMs` | stream duration |

## Rollups (`computeCostRollup`)

- Average cost per conversation (window)
- Daily cost (`dayKey` UTC)
- Monthly cost (`monthKey` UTC)
- Token totals in window

## Dashboard

Exposed on `GET /api/admin/birth-sky/ops` → `cost` + `routerTelemetry`.

## Note

In-memory ring buffer (5k events) — process-local. Persist via log sink / metrics exporter in ops if multi-instance aggregation is required.
