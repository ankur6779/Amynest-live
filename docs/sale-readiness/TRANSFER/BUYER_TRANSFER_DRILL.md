# BUYER TRANSFER DRILL (documentation only)

**Date:** 24 September 2026  
**Question:** If Ankur Raman stopped participating tomorrow, could a buyer operate AmyNest?

**No accounts were transferred. No credentials were rotated. No destructive tests.**

Overall: **FAIL** — the buyer could clone public source and read docs, and could not deploy, release stores, recover data, or sign builds.

Classification key:

- **TRANSFERABLE NOW** — buyer can do this from public repo + this data room without founder login  
- **TRANSFERABLE AFTER OWNER ACTION** — vendor/process exists; founder must start it  
- **FOUNDER-DEPENDENT** — today requires Ankur’s personal/account access  
- **UNKNOWN** — evidence insufficient

| # | Dependency | Classification | Evidence | Notes |
|---|------------|----------------|----------|-------|
| 1 | GitHub | **FOUNDER-DEPENDENT** | `gh`: owner `ankur6779`; only listed collaborator `ankur6779`; public personal repo | Clone **TRANSFERABLE NOW**. Admin, secrets, Settings **FOUNDER-DEPENDENT** until transfer/invite |
| 2 | CI/CD | **FOUNDER-DEPENDENT** | `.github/workflows/deploy-production.yml` gated on `github.repository == 'ankur6779/Amynest-live'`; secrets on that account | Workflows travel with repo; secret **values** do not |
| 3 | Production server (Coolify API) | **FOUNDER-DEPENDENT** | Handover `DEPLOYMENT.md`; origin in CI smoke | Account title UNKNOWN |
| 4 | Database | **FOUNDER-DEPENDENT** | Coolify plane INFERRED (July 2026); backup cert **FAIL** | Dump/restore not evidenced 24 Sep |
| 5 | Object storage (GCS) | **FOUNDER-DEPENDENT** | `STORAGE.md`; `TTS_USE_GCS` | IAM UNKNOWN |
| 6 | Firebase | **FOUNDER-DEPENDENT** | CI secret names; project id `amynest-836ff` in historical audit JSON | Auth + FCM |
| 7 | Google Play | **FOUNDER-DEPENDENT** | Package `com.amynest.app` VERIFIED; AMYWORLD account **SELLER-STATED** | Play transfer needs Google + founder start. Not “transferable because seller says so.” |
| 8 | Apple | **FOUNDER-DEPENDENT** | App ID `6767664343`; seller string “Amyworld”; AMYWORLD **SELLER-STATED** | Apple transfer is multi-week; enrollment required |
| 9 | RevenueCat | **FOUNDER-DEPENDENT** | `proj9c1919f0` | Invite possible **AFTER OWNER ACTION** |
| 10 | Domain / DNS | **FOUNDER-DEPENDENT** | Use of `amynest.in` VERIFIED; registrar UNKNOWN | Auth-code transfer only after owner unlocks |
| 11 | Email | **FOUNDER-DEPENDENT** | `support@amynest.in` in product; mailbox UNKNOWN | MX follows domain |
| 12 | Analytics | **FOUNDER-DEPENDENT** | GA4 secret name; Postgres events; Ads `ankur6779@gmail.com` | Properties UNKNOWN |
| 13 | Monitoring | **UNKNOWN** | Sentry optional / unverified | |
| 14 | Payment systems | **FOUNDER-DEPENDENT** | RC + stores; Razorpay **SELLER-STATED** unused | Store proceeds stay on store accounts until transfer |
| 15 | AI / API providers | **FOUNDER-DEPENDENT** | Env names; `AI_PROVIDERS.md` | Buyer can create **new** keys AFTER OWNER ACTION (old keys stay founder) |
| 16 | Scheduled jobs | **FOUNDER-DEPENDENT** | `SCHEDULER_ACTIVE_PLANE=coolify`; GH cron workflows | Coolify + Actions |
| 17 | Cron / background workers | **FOUNDER-DEPENDENT** | Hetzner worker + Redis + `WORKER_ENABLED` | SSH secret on Actions |
| 18 | Certificates / signing | **FOUNDER-DEPENDENT** | Keystore/certs **not in git** (correct) and **not escrowed** | Loss of Android upload key can block Play updates |
| 19 | Backups | **FOUNDER-DEPENDENT** | `BACKUP_RESTORE_CERTIFICATION.md` **FAIL** | Git clone is the only evidenced recovery |
| 20 | Recovery | **FOUNDER-DEPENDENT** | Same | Source recoverable; operations not |

**Answer:** No. A buyer without Ankur could read and build from the public clone in principle (local build **not re-run** this pass) and could not operate production, stores, billing, DNS, or signing.

Related older 16-row drill: `BUYER_HANDOVER_DRILL.md` (same FAIL).
