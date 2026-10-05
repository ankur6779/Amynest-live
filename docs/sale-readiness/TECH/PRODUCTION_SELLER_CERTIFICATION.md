# PRODUCTION SELLER CERTIFICATION

**Date:** 24 September 2026  
**Read-only.** Code fixes from Rounds 2–3 **not deployed**.

| Surface | Result | Evidence |
|---------|--------|----------|
| Homepage | **PASS** | https://www.amynest.in/ 200; title AmyNest AI; AmyWorld lines |
| API health | **PASS** | `GET /api/healthz` → `{"status":"ok"}` |
| Onboarding | **NOT TESTED** | splash/session |
| Authentication | **PARTIAL** | demo session existed historically; anonymous homepage works |
| Child profile | **PARTIAL** | Round 2 dashboard: 5 children on demo |
| Today | **PASS** (demo, Round 2) | `/dashboard` plan + AQI |
| Ask Amy | **NOT TESTED** | splash on navigate |
| For Child | **NOT TESTED** | |
| Routine generation | **NOT TESTED** | |
| Environmental state | **PARTIAL** | AQI copy on Today |
| Paywall / checkout | **NOT TESTED** | no purchase attempted |
| Audio / GCS / printable / coloring / curiosity / video / story / craft | **NOT TESTED** | |
| Health Lab / Gaming Hub | **NOT TESTED** | |
| Infant | **PARTIAL** | John 2 months profile visible; module not opened |
| Age-aware discovery | **PARTIAL** | age chips on dashboard |
| Desktop | **PARTIAL** | dashboard usable |
| Mobile | **NOT TESTED** | |
| Premium gating | **NOT TESTED** | |
| Live claim copy | **FAIL vs repo** | still “patent-pending”; privacy “owned and operated by AmyWorld” |
| Debug `/debug/learning` | **PARTIAL** | SPA 200; client redirect observed Round 2 |
| Admin APIs anonymous | **PASS (denied)** | 401 |

**Not a full seller certification.**
