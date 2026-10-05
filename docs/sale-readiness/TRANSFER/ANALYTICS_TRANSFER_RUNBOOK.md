# ANALYTICS TRANSFER RUNBOOK

**Date:** 24 September 2026  
**Do not change Google Ads campaign `23986249354`.**

| System | Found? | Transfer | Attribution note |
|--------|--------|----------|------------------|
| First-party Postgres events | **FOUND** (code + admin/growth) | With DB dump | SSOT intended; not queried this pass |
| Firebase Analytics | **FOUND** (client SDK / Firebase project) | With GCP `amynest-836ff` | Native vs WebView gaps historically |
| GA4 | **FOUND as name** `VITE_GA4_MEASUREMENT_ID` in deploy workflow | Property transfer or new ID + rebuild | Property ID **UNKNOWN**; secret not on `gh secret list` |
| Google Ads | **FOUND** customer `6395859996`; campaign `23986249354` | MCC / account transfer — **no campaign edit** | Conversions = installs + first opens, **not** cash |
| Conversion actions | **FOUND** historically via GAQL | Remap if GA4/Firebase moves | Do not treat as sales |
| RevenueCat analytics | **FOUND** (project charts) | With RC invite | Operational, not finance re-audit |
| Play/ASC analytics | **FOUND** as consoles | With store transfers | |

Buyer verification: admin on Ads + Firebase/GA4 + RC without `ankur6779@gmail.com`.

**OPEN — OWNER ACTION REQUIRED**
