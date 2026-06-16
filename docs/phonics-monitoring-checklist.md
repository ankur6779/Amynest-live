# Phonics Curriculum — Production Monitoring Checklist

**When to use:** From staging deploy through 7 days post-production.  
**Owner:** On-call engineer + product/QA liaison.

---

## Pre-Deploy Baseline (capture before staging)

Record these metrics from the **current production** environment for comparison:

| Metric | Baseline value | Date |
|--------|----------------|------|
| Daily phonics test starts / day | | |
| Daily test completion rate | | |
| Mission panel views / day | | |
| Story reader opens / day | | |
| Phonics route 5xx rate | | |
| 409 rate on test start | | |

---

## Metrics to Track

### 1. Daily Test Completion Rate

**Definition:** `(completed daily tests) / (started daily tests)` per age/level cohort.

| Signal | Healthy | Investigate |
|--------|---------|-------------|
| L2+ completion | Stable ±10% vs baseline | Drop > 20% |
| L1 completion | May be **lower** (409 empty pool) | Spike in abandoned starts |

**Where to look:**
- API logs: `phonics tests start`, `session_already_submitted`
- `phonics_test_results` table — daily `test_type = 'daily'`
- Client analytics event (if instrumented): phonics test start / complete

**Query hint:**
```sql
SELECT date_trunc('day', created_at) AS day,
       count(*) FILTER (WHERE completed) AS completed,
       count(*) AS started
FROM phonics_test_results
WHERE test_type = 'daily'
  AND created_at > now() - interval '7 days'
GROUP BY 1 ORDER BY 1;
```

---

### 2. Mission Completion Rate

**Definition:** `(missions with ≥1 task completed) / (mission panel loads)` or V3 mission completion sync rate.

| Signal | Healthy | Investigate |
|--------|---------|-------------|
| Completion rate L2+ | Stable vs baseline | Drop > 25% |
| Zero-task missions | Some at L1 expected | Majority of L2+ users |

**Where to look:**
- `phonics_v3_missions` table (if synced)
- Client: `DailyMissionPanel` completion callbacks
- Logs: `[phonics-v2]`, `[phonics-v3]` mission build

---

### 3. Story Unlock Rate

**Definition:** `% of active phonics users with ≥1 unlocked story in session`.

| Signal | Healthy | Investigate |
|--------|---------|-------------|
| L1 unlock rate | **Near 0%** | Any auth stories unlocking |
| L2 unlock (mastery ≥ 10) | Gradual increase | 100% at L2 day 1 |
| L4 digraph stories | Unlocks after pathway + mastery | Mass unlock below L4 |

**Where to look:**
- Client: `getUnlockedStoriesV3()` result count (debug logging in staging)
- Support tickets: "no stories" vs "too many stories"

---

### 4. Level Progression Rate

**Definition:** `% of children with `current_level` increase per week`.

| Signal | Healthy | Investigate |
|--------|---------|-------------|
| L1 → L2 progression | Similar to pre-deploy cohort | Stuck at L1 > 4 weeks (mass) |
| L6 → L7 (stored 6 → displayed 7) | Mapped correctly | UI shows wrong stage name |

**Where to look:**
- `phonics_curriculum_progress` — `current_level`, `mastery_score`, `updated_at`
- API: curriculum progress read/write routes

**Query hint:**
```sql
SELECT current_level, count(*) AS children
FROM phonics_curriculum_progress
GROUP BY 1 ORDER BY 1;
```

---

### 5. Empty Assessment (409) Frequency

**Definition:** Rate of `409 not_enough_content` on test start vs total starts.

| Signal | Healthy | Investigate |
|--------|---------|-------------|
| 409 at L1 | **Expected**, moderate rate | — |
| 409 at L2+ with CVC tiles visible | Rare | **> 5%** of L2+ starts |
| 409 with no client empty state | UX gap | Support complaints |

**Where to look:**
- API logs: `"not_enough_content — generator returned 0 questions"`
- Response body: `{ "error": "not_enough_content" }`
- Route: `POST /api/phonics/test/start`

**Alert threshold (suggested):**
- L2+ 409 rate > **2%** of test starts → page on-call
- Any 5xx on same route → page immediately

---

### 6. Error Logs from Level Gating

Watch for new error patterns in:

| Log pattern | Source |
|-------------|--------|
| `[phonics-v2] progress hydrate failed` | V3 sync / PhonicsV2 |
| `phonics tests start: not_enough_content` | API test generation |
| `Missing assessment path` | Should **not** appear in prod (CI only) |
| `isContentUnlocked` / filter errors | Client curriculum filter |
| Unhandled rejection in `buildAdaptiveDailyMission` | adaptive-selector |

**Structured fields to add/filter (if available):**
- `childId`, `curriculumLevel`, `masteryScore`, `testType`, `questionCount`

---

## Dashboard Checklist (Daily — First 7 Days)

| Day | Daily test rate | 409 rate L1 | 409 rate L2+ | Mission completion | Story unlock anomalies | Level分布 | Notes |
|-----|-----------------|-------------|--------------|-------------------|------------------------|-----------|-------|
| D0 (deploy) | | | | | | | |
| D1 | | | | | | | |
| D2 | | | | | | | |
| D3 | | | | | | | |
| D7 | | | | | | | |

---

## Automated CI (Pre-Deploy Gate)

Ensure green before each promote:

```bash
pnpm run audit:phonics
pnpm run check:phonics-release-gate   # audio/manifest smoke
```

---

## Escalation Playbook

| Severity | Condition | Action |
|----------|-----------|--------|
| **P0** | Phonics test start 5xx > 1% | Rollback API; see [rollback plan](./phonics-rollback-plan.md) |
| **P1** | L2+ 409 > 5% sustained 24h | Investigate curriculumLevel wiring; hotfix filter |
| **P2** | Mission empty for > 50% L2 users | Check adaptive-selector + mastery sync |
| **P3** | Support volume on locked Word Families | FAQ update; expected behavior |

---

## Staging vs Production

Complete the same checklist on **staging** before production promote. Staging sign-off gate:

- [ ] [phonics-production-checklist.md](./phonics-production-checklist.md) all four levels checked
- [ ] `audit:phonics` PASS on deployed branch
- [ ] 409 at L1 confirmed with friendly client handling
- [ ] L2 daily test returns CVC questions

---

## Related Documents

- [QA Signoff](./phonics-qa-signoff.md)
- [Migration Notes](./phonics-migration-notes.md)
- [Rollback Plan](./phonics-rollback-plan.md)
- [Production Checklist (manual QA)](./phonics-production-checklist.md)
