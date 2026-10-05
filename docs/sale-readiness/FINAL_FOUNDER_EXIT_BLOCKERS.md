# FINAL FOUNDER EXIT BLOCKERS

**Date:** 24 September 2026  
Source: `TRANSFER/FOUNDER_EXIT_TEST.md` (**FAIL**). Not a re-audit.

If Ankur’s access disappears immediately after close, only public clone and Open-Meteo still work.

| Dependency | Why founder-dependent | Exact closure action | Acceptance test |
|------------|----------------------|----------------------|-----------------|
| Source (GitHub) | Sole admin `ankur6779` | Buyer org + GitHub transfer | Buyer push/workflow without Ankur |
| Deploy | Actions secrets + Coolify hook + CF token + Hetzner SSH; workflow hard-codes founder repo | Recreate secrets on buyer repo; disclose Coolify method | Buyer-triggered Pages + Worker + API update |
| Database | Host UNKNOWN; no dump; restore untested | Identify host; encrypted dump; scratch restore | Scratch R/W smoke |
| Storage (GCS) | SA on founder Coolify/GH | IAM or copy + new SA | Buyer `ls` + `healthz/audio` |
| DNS | Registrar/CF title UNKNOWN | Evidence then `.in` + zone transfer | Buyer TXT change resolves |
| Email / support | Mailbox UNKNOWN; alerts example founder Gmail | Disclose MX; buyer mailbox; change alert email | Founder Gmail not required |
| Stores | Play/ASC founder-gated; enrollment SELLER-STATED | Evidence then vendor transfers | Buyer opens consoles as owner |
| Signing | Android/iOS materials NOT ESCROWED | Offline escrow | Buyer-signed AAB + IPA |
| Subscriptions | RC org UNKNOWN; webhook on Coolify | Invite + rotate after | Buyer edits offering; webhook 2xx |
| Analytics | FA/GA4 owners UNKNOWN | Transfer properties or new IDs | Event in buyer console |
| Ads | Founder Gmail; campaign historically ENABLED | MCC / admin later; do not edit now | Buyer views `23986249354` without founder Gmail |
| AI APIs | Keys on founder stores | Buyer new keys + TOS; revoke old after | Prod call on buyer key |
| Monitoring | Sentry live UNKNOWN | Confirm off or new DSN | Test error **or** “Sentry off” |
| Backups | No 24 Sep certification | Dump + GCS inventory | Same as database test |
| Patent prosecution | Applicant Ankur; scope **INCLUDE**; assignment **NO** | Execute assignment + IPO recordal | Buyer holds App. 202611059355 rights |

Open-Meteo does not make the product operable.
