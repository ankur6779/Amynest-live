# Amy Astro Intelligence — Production Handbook (RC10)

## Frozen pipeline

```
Astronomy → Meaning → Development → Adaptive → Conversation
  → Evidence → Evaluation (CI) → AI Context → LLM
```

**Do not add engines or redesign this graph.** Production concerns live in
`@workspace/birth-sky-runtime`.

## Deployment

1. Deploy api-server + web as usual.  
2. Ensure ephemeris daemon is healthy (`/api/health`).  
3. Set feature flags (below) for staged rollout.  
4. Confirm `/api/admin/birth-sky/ops` (admin UID required).  
5. Run `pnpm run eval:ai-pipeline` (score ≥ 90).  
6. Optional: `pnpm --filter @workspace/birth-sky-runtime run profile`.

## Feature flags

| Env | Default | Effect |
|-----|---------|--------|
| `BIRTH_SKY_FF_INTELLIGENCE` | on | Master for all layers |
| `BIRTH_SKY_FF_MEANING` | on | MeaningSnapshot |
| `BIRTH_SKY_FF_DEVELOPMENT` | on | DevelopmentSnapshot |
| `BIRTH_SKY_FF_ADAPTIVE` | on | AdaptiveSnapshot |
| `BIRTH_SKY_FF_CONVERSATION` | on | ConversationPlan |
| `BIRTH_SKY_FF_EVIDENCE` | on | EvidenceSnapshot |
| `BIRTH_SKY_FF_EVALUATION` | on | CI evaluation (offline) |
| `BIRTH_SKY_EXPERIMENTS` | on | A/B presentation arms |
| `DEBUG_EXPLAINABILITY` | off | Send evidence compact facts to LLM |

Safe rollout: disable outer layers first (`EVIDENCE` → `ADAPTIVE` → …).

## Monitoring

- **Pipeline observability**: request id, stage timings, failover, snapshot versions, cache hit/miss, eval/safety scores, token cost (no PII).  
- **Admin dashboard**: `GET /api/admin/birth-sky/ops`  
- **Router telemetry**: existing `birthSkyAiRouter` on health + cost fields  
- **Product analytics** (anonymous): conversation start/complete/dropoff, subscription entry/purchase, satisfaction  

## Metrics

Average response time · evaluation score · safety score · failure rate ·
fallback rate · cache hit ratio · conversation completion · cost/day/month.

## LLM cost tracking

Per request: prompt tokens, completion tokens, estimated USD.  
Rollups: average cost/conversation, daily, monthly (`birth-sky-runtime` store).

## A/B testing

Presentation-only arms (`control`, `brief_actions_first`, `rich_sky_first`):

- conversation depth bias  
- example richness  
- response length  
- explanation order  

Deterministic engines are **not** mutated.

## Failover

If a stage throws or is disabled: skip it, continue with remaining layers,
mark request `degraded`, never crash the conversation.

## Performance

SLO: **deterministic pipeline p95 &lt; 500ms**.  
Profile: `pnpm --filter @workspace/birth-sky-runtime run profile`.

## Rollback

1. Set `BIRTH_SKY_FF_INTELLIGENCE=0` (legacy sky anchors + raw facts path).  
2. Or disable individual layers.  
3. Redeploy previous api-server/web if needed.  
4. Engines are pure packages — rollback is flag/deploy only.

## Incident response

1. Check `/api/health` + `/api/admin/birth-sky/ops` errors.  
2. Inspect failover rate / stage error codes.  
3. Disable failing layer via flag.  
4. If LLM issues: rely on existing safety moderation + model router.  
5. Post-incident: re-run `eval:ai-pipeline`.

## Performance tuning

- Keep evidence off LLM path unless debugging.  
- Prefer cache of meaning/development snapshots on sky snapshot rows.  
- Profile locally after catalog changes.  
- Watch p95 pipeline ms vs SLO.

## Production checklist

- [x] Feature flags + runtime package shipped (`@workspace/birth-sky-runtime`)  
- [x] Admin ops dashboard: `GET /api/admin/birth-sky/ops`  
- [x] Pipeline profile SLO pass (p95 ≪ 500ms; see `lib/birth-sky-runtime/reports/`)  
- [x] Observability + LLM cost fields on AI stream path  
- [x] Failover / flag skip (engines never crash conversation)  
- [x] A/B presentation arms (no engine math changes)  
- [ ] Env-specific: health green (API + ephemeris) before cutover  
- [ ] Env-specific: `ADMIN_USER_IDS` set; eval gate ≥ 90 in CI  
- [ ] Env-specific: rollback flag smoke (`BIRTH_SKY_FF_INTELLIGENCE=0`)  

## RC10 verdict

**GO** — pipeline frozen; production readiness layer complete. Do not add engines.
