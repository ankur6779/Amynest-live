# PRODUCTION FEATURE MATRIX

**Date:** 24 September 2026  
**Evidence standard:** Code route exists ≠ production-verified this pass.  
Live E2E of every module was **not** executed in this audit.

| Feature | Route (code) | User / age | Production status | Evidence | Criticality | Buyer risk |
|---------|--------------|------------|-------------------|----------|-------------|------------|
| Web app | www.amynest.in | Parent | SHIPPED historically | Deploy docs + domain in config | P0 | Live health **UNVERIFIED today** |
| Android Play | `android/` WebView | Parent | SHIPPED | Play URL + RC Play app | P0 | Console metrics UNVERIFIED |
| iOS App Store | Capacitor | Parent | SHIPPED | App ID 6767664343 | P0 | Ratings “not enough” (14 Sep) |
| Onboarding | `/onboarding`, `/begin` | Parent | IN CODE | AppCore routes | P0 | Conversion historically poor |
| Routines | `/routines`, `/routines/generate` | Age-banded | IN CODE + patent subject-matter | Code + App. 202611059355 | P0 | Core product; first-session drop historically high |
| Environmental sync | routine generate | Parent | IN CODE | Spec + kidschedule | P0 | Buyer must not call this “patented” |
| Ask Amy / assistant | `/assistant` | Parent | IN CODE | AppCore | P1 | LLM COGS |
| Talking Amy / speech | speech-coach routes | Child/parent | IN CODE | Prior certs | P1 | Quality / cost |
| For Child | child routes | Child profile | IN CODE | AppCore | P1 | Age gates UNVERIFIED live |
| Health Lab | premium routes | Child | IN CODE + premium gate | PREMIUM_ROUTE_METADATA | P1 | Entitlement bugs = refunds |
| Gaming Hub | games routes | Child | IN CODE | tests exist | P2 | Scope bloat |
| Printables / worksheets | worksheet studio | Parent | IN CODE | | P2 | License of templates UNVERIFIED |
| Coloring / curiosity / stories / crafts / videos | hub modules | Age-aware | IN CODE / GCS | GCS audits exist historically | P1 | Bucket transfer + signed URL policy |
| Audio lessons | GCS + TTS | Child | IN CODE | env TTS_USE_GCS | P1 | COGS + cache |
| Astronomy / Birth Sky | birth-sky flags | Parent | IN CODE; kill switch | `.env.production.example` | P2 | Complexity / encryption key |
| Infant | infant care routes | 0–11m | IN CODE | | P1 | Medical-advice risk |
| Premium / paywall | RC + Razorpay | Parent | IN CODE; 3 live paid | RC 24 Sep | P0 | Web vs store price drift historically |
| Account / delete | `/delete-account` | Parent | IN CODE | Route exists | P0 | Deletion completeness UNVERIFIED |
| Logout / devices | `/manage-devices` | Parent | IN CODE | Device-limit docs | P1 | |
| Deep links | applinks / assetlinks | Mobile | IN CODE | android README | P1 | |
| Admin Growth OS | `/admin/growth/*` | Admin | IN CODE | Prior memo | P0 | **Must not leak to buyers’ users** |

**This matrix is not a production certification.**
