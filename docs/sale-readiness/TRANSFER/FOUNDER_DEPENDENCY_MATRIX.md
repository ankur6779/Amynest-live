# FOUNDER DEPENDENCY MATRIX

**Date:** 24 September 2026  
**Test:** Ankur Raman is unavailable tomorrow. Can a competent buyer operate?

Only documented dependencies. No speculation about undocumented side accounts.

| Function | Documented dependency | Evidence | Founder-required today? |
|----------|----------------------|----------|-------------------------|
| GitHub admin / repo settings | Personal account `ankur6779` is owner and only listed collaborator | `gh repo view`; collaborators API | **YES** |
| GitHub Actions deploy | Workflows require that repo + account secrets | `deploy-production.yml` | **YES** |
| Cloudflare Pages + Worker | `CLOUDFLARE_API_TOKEN` on founder GH | Same workflow | **YES** |
| Coolify API / Git webhook | Seller Coolify project; credentials not in repo | `DEPLOYMENT.md` | **YES** |
| Hetzner AI worker | `HETZNER_SSH_PRIVATE_KEY`, `HETZNER_HOST` | Same workflow | **YES** |
| Production Postgres / Redis | Host behind Coolify; no buyer dump | `DATABASE.md`; backup cert FAIL | **YES** |
| GCS / GCP service accounts | Secret store only | `STORAGE.md`; `ENVIRONMENT_VARIABLES.md` | **YES** |
| Firebase Auth / FCM / GA4 | CI secret names; project historically `amynest-836ff` | Workflow + audit JSON | **YES** |
| Domain `amynest.in` | Registrant UNKNOWN; used in production | `config.ts`; no WHOIS | **YES** (whoever holds registrar — undocumented, treated founder-gated) |
| Support / legal mailbox | `support@amynest.in` | `support.tsx` | **YES** if that inbox is founder-controlled (mailbox **UNKNOWN**, address documented) |
| Admin alerts | Example `ankur6779@gmail.com` | `ENVIRONMENT_VARIABLES.md` | **YES** (example is founder Gmail) |
| Google Play administration | AMYWORLD sole prop / Ankur proprietor | **SELLER-STATED**; package VERIFIED | **YES** |
| App Store Connect administration | Same seller statement; listing “Amyworld” | **SELLER-STATED** + 14 Sep listing string | **YES** |
| Android signing | Release keystore not in git, not escrowed | `android/README.md`; backup cert FAIL | **YES** |
| iOS signing / profiles / APNs | Founder Apple artifacts | `IOS_RELEASE.md` | **YES** |
| RevenueCat | Project `proj9c1919f0`; org title UNKNOWN | `BILLING.md` | **YES** |
| Google Ads | Login `ankur6779@gmail.com` | Ads disclosure | **YES** |
| OpenAI / Gemini / ElevenLabs | Keys in secret store | `AI_PROVIDERS.md` | **YES** |
| Patent prosecution | Applicant Ankur Raman | `patent/` identity sheet | **YES** |
| Seller identity / AmyWorld | No inbound assignment; Path A/B unelected | `ROUND4_SELLER_STRUCTURE_OPTIONS.md` | **YES** |
| Customer support operations | Same support address; no helpdesk vendor evidenced | Product copy | **YES** (documented channel only) |
| Financial accounts / store proceeds | Play/ASC seller-stated AMYWORLD; RC UNKNOWN org; Razorpay unused by statement | Finance + this pass | **YES** |
| Secrets rotation | Runbook names only; no owner map | `docs/gcp-credential-rotation.md`; handover | **YES** |
| Deploy authorization | Buyer cannot deploy from repo alone | `DEPLOYMENT.md` | **YES** |

**Verdict:** Founder dependency **HIGH**.  
Source clone is the only **TRANSFERABLE NOW** operational artifact. Everything that keeps `www.amynest.in` and the stores alive is founder-gated.

Older shorter table: `docs/sale-readiness/FOUNDER_DEPENDENCY_MATRIX.md`.
