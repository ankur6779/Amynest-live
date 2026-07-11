# Revenue Intelligence OS

Founder-grade financial intelligence on production subscription data. Extends `/admin/growth/revenue` — no new dashboard nav.

## Architecture

```
subscriptions + billing_audit_events + analytics_events
        │
        ▼
growth-dashboard (subscriptions, kpis)  ← reused, not duplicated
        │
        ▼
revenue-intelligence/
  ├── financial-kpis.ts       Phase 1: MRR, ARR, ARPPU, refunds, recovery
  ├── subscription-funnel.ts  Phase 2: install → winback
  ├── cohort-economics.ts     Phase 3: plan, country, platform, trial
  ├── feature-attribution.ts  Phase 4: correlation before purchase
  ├── churn-intelligence.ts   Phase 5: renewal risk, payment failures
  ├── founder-finance-brief.ts Phase 6: daily finance brief
  ├── experiment-attribution.ts Phase 7: pricing experiment decisions
  └── safety.ts               Phase 8: measured | estimated | not_verified
```

## API

| Endpoint | Purpose |
|----------|---------|
| `GET /api/admin/growth/revenue-intelligence` | Full payload |
| `GET /api/admin/growth/finance-brief` | Founder finance brief only |
| `GET /api/admin/growth/gos/revenue` | Includes `revenueIntelligence` in section data |

## Evidence classes

- **measured** — direct production counts (purchase events, refunds, payment failures)
- **estimated** — catalog MRR, correlation attribution, churn heuristics
- **not_verified** — missing integration or sample &lt; threshold

MRR is **estimated** from `RAZORPAY_PLAN_PRICES_INR × ACTIVE subscribers` — not actual cash ledger.

## Rollback

Remove `RevenueIntelligenceSection` from revenue GOS panel. API routes are additive.
