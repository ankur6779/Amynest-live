# Growth Experiment Rollout Playbook

**Owner:** Release Manager / Growth Experiment Lead  
**Last updated:** 2026-07-07  
**Rule:** Value Bridge and Dashboard Priority are **separate experiments**. Never enable both during measurement windows.

---

## Phase 0 — Verify (COMPLETE)

| Check | Result |
|-------|--------|
| `VITE_FF_VALUE_BRIDGE_INVITES` exists | ✅ `subscription-feature-flags.ts` |
| `VITE_FF_DASHBOARD_PRIORITY_ORDER` exists | ✅ `dashboard-feature-flags.ts` |
| Both default `false` | ✅ |
| No shared flag module | ✅ Separate files |
| No cross-imports | ✅ `value-bridge.ts` does not import dashboard flags; `dashboard-priority.ts` does not import value-bridge flags |
| Unit tests | ✅ 11/11 (`value-bridge`, `value-bridge-analytics`, `dashboard-priority`) |

**Verify locally:**
```bash
node scripts/growth-experiments/verify-experiment-flags.mjs
```

---

## Production deploy state (2026-07-07)

| Artifact | Commit | Live | Flag default |
|----------|--------|------|--------------|
| Value Bridge (base) | `4d93033e1` | ✅ `Amynest-live-1-dykj` @ `2e78b4441` | OFF |
| Value Bridge analytics hardening | **Uncommitted** | ❌ Not live | — |
| Dashboard Priority | **Uncommitted** | ❌ Not live | OFF |

**Before Phase 1:** Commit + deploy analytics hardening (`value_bridge_not_shown`, IntersectionObserver `shown`) so suppression and visibility metrics are trustworthy.

**Before Phase 2:** Commit + deploy `dashboard-feature-flags.ts`, `dashboard-priority.ts`, `dashboard.tsx` changes.

---

## Phase 1 — Value Bridge ONLY

### Enable (Render static site `Amynest-live-1-dykj`)

Set **only** this build-time env var:

```
VITE_FF_VALUE_BRIDGE_INVITES=true
```

Confirm **absent or false**:

```
VITE_FF_DASHBOARD_PRIORITY_ORDER=false
```

Trigger manual deploy (`autoDeploy: no` on Render).

### Internal QA checklist

- [ ] Complete one routine item → inline banner appears (`routine_completion`)
- [ ] Tap Done on weekly summary → banner appears (`weekly_summary`)
- [ ] `value_bridge_eligible` fires on moment trigger (trial user)
- [ ] `value_bridge_shown` fires once per impression (≥25% visible)
- [ ] CTA → `value_bridge_clicked` + `checkout_started` source=`routine_completion` or `weekly_summary`
- [ ] Dismiss → `value_bridge_dismissed`
- [ ] Suppressed path → `value_bridge_suppressed` with `reason` (not `value_bridge_not_shown`)
- [ ] Paid user → `value_bridge_not_shown` reason=`paid_user` (no eligible)
- [ ] Trial banner still shows globally (unchanged)
- [ ] Dashboard layout unchanged (priority flag OFF)

### Daily health targets (Value Bridge)

| Metric | Target |
|--------|--------|
| `shown_rate` | **> 90%** (`shown_users / eligible_users`) |
| `feature_flag_off` | **0** (flag ON in prod) |
| `missing_value_moment` | **0** |
| `already_seen_today` | Reasonable (≤50% of eligible) |

Daily report includes `eligible_users`, `shown_users`, `suppressed_users`, and suppression reason breakdown.

### Collect 72 hours

Daily report:
```bash
DATABASE_URL=postgresql://... \
EXPERIMENT_VALUE_BRIDGE_ENABLED=true \
EXPERIMENT_DASHBOARD_PRIORITY_ENABLED=false \
node scripts/growth-experiments/generate-daily-experiment-report.mjs --phase value_bridge
```

Output: `docs/product-growth/experiments/daily/YYYY-MM-DD.md`

### Success gate (proceed to Phase 2 planning only)

| KPI | Gate |
|-----|------|
| Routine completion rate | Does **not decrease** vs 7d pre-baseline |
| Crash rate (`error_captured` users) | Unchanged (±25%) |
| Pricing exposure | Increases (`/pricing` views or `checkout_started`) |
| `checkout_started` | Increases vs pre-period |
| Analytics | No missing `value_bridge_*` events |

**Recommendation:** SCALE / WATCH / ROLLBACK per daily report.

### Rollback (Phase 1 only)

```
VITE_FF_VALUE_BRIDGE_INVITES=false
```
Redeploy static site. Do **not** touch Dashboard Priority flag.

---

## Phase 2 — Dashboard Priority ONLY

**Do not start until Phase 1 passes 72h gate.**

### Prerequisites

1. Phase 1 decision = SCALE or stable WATCH with positive checkout signal
2. Dashboard Priority code committed and deployed
3. Value Bridge flag **unchanged** (stay ON if Phase 1 scaled, or OFF if rolled back — document state)

### Enable

```
VITE_FF_DASHBOARD_PRIORITY_ORDER=true
VITE_FF_VALUE_BRIDGE_INVITES=<unchanged from Phase 1 end state>
```

### Measure (72 hours)

```bash
DATABASE_URL=postgresql://... \
node scripts/growth-experiments/generate-daily-experiment-report.mjs --phase dashboard_priority
```

| KPI | Gate |
|-----|------|
| Dashboard → Routine CTR | Improves vs Phase 1 end baseline |
| D1 / D7 | No regression |
| Crash rate | No regression |
| Resume click rate | ≥ baseline |

### Rollback (Phase 2 only)

```
VITE_FF_DASHBOARD_PRIORITY_ORDER=false
```
Redeploy. Leave Value Bridge flag as-is.

---

## Rollback rules

1. If **one** experiment regresses → disable **only** that experiment's flag
2. Disable both only if **both** experiments were enabled (violation of experiment rule) or both show regression
3. Always redeploy static site after flag change (Vite bakes env at build time)

---

## Daily report schedule

| Day | Phase | Action |
|-----|-------|--------|
| Day 0 | Baseline | Both flags OFF — snapshot metrics |
| Day 1–3 | Phase 1 | Value Bridge ON, daily report |
| Day 4 | Gate review | Phase 1 success gate |
| Day 5–7 | Phase 2 (if passed) | Dashboard Priority ON, daily report |

---

## Render references

- Static site: `srv-d85k80jtqb8s7382m7i0` (`Amynest-live-1-dykj`)
- Production URL: https://www.amynest.in
- Postgres: `dpg-d85k80jtqb8s7382m7lg-a`
