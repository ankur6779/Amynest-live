# AmyNest AI Evaluation & Quality Framework

## Purpose

Measure quality of the intelligence pipeline **without changing engine behavior**:

Astronomy → Meaning → Development → Adaptive → Conversation → Explainability

## Package

`@workspace/ai-evaluation` (`lib/ai-evaluation`)

| Module | Role |
|--------|------|
| `scenarios.ts` | Golden scenarios |
| `metrics.ts` | Metric weights |
| `scoring.ts` | Per-scenario 0–100 scores |
| `safety.ts` | Safety audit |
| `regression.ts` | Baseline fingerprints |
| `report.ts` | `EvaluationReport` |
| `engine.ts` | Orchestrator |
| `cli.ts` | CI entrypoint |

## Methodology

1. Run each golden scenario through public engine APIs (read-only).  
2. Score structured outputs (not LLM prose).  
3. Compare fingerprints to `golden/baselines.json`.  
4. Fail if overall score &lt; threshold (default **90**) or hard failures exist.

## Metrics (0–100, weighted)

| Metric | Weight |
|--------|--------|
| Safety | 0.18 |
| Consistency | 0.12 |
| Determinism | 0.12 |
| No hallucinated astronomy | 0.12 |
| Completeness | 0.10 |
| Development alignment | 0.10 |
| Conversation quality | 0.10 |
| Evidence coverage | 0.08 |
| Readability | 0.04 |
| Parent usefulness | 0.04 |

## Golden scenarios

Newborn · Toddler · Preschool · School age · Teen · Routine · Sleep · Behaviour · Astrology

## Safety audit

Requires ConversationPlan safety flags + avoid topics. Scans optional text for:

- deterministic future claims  
- medical diagnosis language  
- financial advice  
- fear-based messaging  

## Commands

```bash
# Run evaluation (CI)
pnpm --filter @workspace/ai-evaluation run eval

# Or root helper
pnpm run eval:ai-pipeline

# Refresh golden fingerprints after intentional pipeline changes
pnpm --filter @workspace/ai-evaluation run eval:update-baselines

# Unit tests
pnpm --filter @workspace/ai-evaluation test
```

Env:

- `AI_EVAL_MIN_SCORE` — override threshold (default 90)

## CI

Workflow: `.github/workflows/ai-evaluation-gates.yml`

Fails the job when overall score &lt; 90 or scenario hard-failures occur.

## Updating baselines

Only after intentional, reviewed pipeline changes:

1. Run `eval:update-baselines`  
2. Commit `lib/ai-evaluation/golden/baselines.json`  
3. Confirm CI is green  

## Version

`ai-evaluation/1.0.0`
