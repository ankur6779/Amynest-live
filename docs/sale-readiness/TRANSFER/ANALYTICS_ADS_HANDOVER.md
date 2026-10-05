# ANALYTICS / ADS OPERATIONAL HANDOVER

**Date:** 24 September 2026  
Do **not** change Google Ads campaign `23986249354`.

| System | Purpose | Operator | Evidence type | Transfer | Buyer verification |
|--------|---------|----------|---------------|----------|-------------------|
| First-party Postgres events | Intended SSOT / Growth OS | Same as prod DB — **UNKNOWN** host | Stack **VERIFIED** in code; live counts **not** queried this pass | Moves with database dump | Buyer reads `/admin/growth` only after admin allowlist is **their** emails |
| Firebase Analytics | Client events | GCP `amynest-836ff` **INFERRED** | Secret names `VITE_FIREBASE_*`; Analytics code | With Firebase/GCP project | Buyer sees events in **their** Firebase project |
| GA4 | Web measurement | `VITE_GA4_MEASUREMENT_ID` referenced in deploy workflow; **not** in `gh secret list` output | Integration **INFERRED**; property ID **UNKNOWN** | Transfer GA4 property or new ID + rebuild | Buyer property shows `page_view` from www |
| Google Ads | UA | Login `ankur6779@gmail.com`; customer `6395859996`; campaign `23986249354` ENABLED (prior pass) | Account **VERIFIED** prior; still founder Gmail | MCC / account transfer — **do not pause in this pass** | Buyer is admin; can see campaign without founder Gmail |
| Ads conversions | Installs + first opens (not cash) | Same Ads account | Prior GAQL **VERIFIED** | Transfer with Ads; remap conversion actions if GA4/Firebase moves | Buyer confirms conversions still fire; **not** sales |
| RevenueCat charts | Subscribers / proceeds | RC project | Operational only | With RC invite | Buyer opens RC Overview |
| Play / ASC analytics | Installs / crashes | Store accounts **SELLER-STATED** | — | With store transfers | Buyer opens consoles |

## Acceptance

Buyer administers Ads + Firebase/GA4 + RC charts with founder logins revoked. Campaign change is **out of scope** for this pass.

**OPEN — OWNER ACTION REQUIRED**
