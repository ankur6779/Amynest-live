# IP OWNERSHIP MATRIX

**Date:** 24 September 2026  
**Evidence-only.** Not a legal opinion. Possession of a login or git remote is not title.

Evidence types used below: **VERIFIED** · **SELLER-STATED** · **INFERRED** · **UNKNOWN** · **CONTRADICTED**

Seller structure used in this matrix (do not collapse these identities):

| Role | Name | Evidence type |
|------|------|---------------|
| Person | Ankur Raman | **VERIFIED** as patent applicant/inventor; git operator `ankur6779` |
| Commercial seller (Path A) | AmyWorld — sole proprietorship of Ankur Raman | **OWNER-CONFIRMED / EVIDENCE PENDING** (25 Sep 2026). No CIN/GST in repo. |
| Product / brand | AmyNest / AmyNest AI | **VERIFIED** as product naming |
| Patent applicant / inventor | Ankur Raman **personally** | **VERIFIED** on IPO papers + **OWNER-CONFIRMED**. **No assignment to AmyWorld.** |

Owner-confirmed account/asset holders (25 Sep 2026) — **not** independently verified, **not** transfer-eligible, **not** transfer-complete:

| Holder | Assets |
|--------|--------|
| **AmyWorld** | Hetzner/server relationship; Google Play account; Apple App Store account; Cursor / development tooling |
| **Ankur Raman personally** | Patent 202611059355; `amynest.in`; Cloudflare account |
| **UNKNOWN / EVIDENCE PENDING** | Source-code legal title; GCS/media copyright; contractor contributions; any asset without documents |

Cursor billing and GitHub admin are **not** source-code copyright. Domain and Cloudflare are **not** AmyWorld-owned.

| Asset | Existence | Current holder / account | Evidence | Evidence type | Transfer required? | Transfer mechanism | Status | Risk |
|-------|-----------|--------------------------|----------|---------------|--------------------|--------------------|--------|------|
| AmyNest source (monorepo) | Yes | GitHub `ankur6779/Amynest-live` (public personal repo) | `git remote -v`; `gh repo view` owner `ankur6779`, `isInOrganization=false`, `isPrivate=false`, `licenseInfo=null` | Possession **VERIFIED**; legal title **UNKNOWN** | Yes | Assignment / bill of sale + repo transfer | **UNKNOWN title** | Hard-cap 69. MIT field + no LICENSE + public repo |
| Frontend (`artifacts/kidschedule`) | Yes | Same remote | Tree + git shortlog | Possession **VERIFIED**; title **UNKNOWN** | Yes | With source assignment | **UNKNOWN title** | Same |
| Backend (`artifacts/api-server`) | Yes | Same remote | Tree + deploy docs | Possession **VERIFIED**; title **UNKNOWN** | Yes | With source assignment | **UNKNOWN title** | Coolify-gated |
| Android wrapper (`android/`) | Yes | Same remote; Play package `com.amynest.app` | `android/app/build.gradle.kts` `applicationId` | Code **VERIFIED**; Play legal seller **SELLER-STATED** | Yes | Code assignment + Play transfer + keystore | **PARTIAL** | Keystore not escrowed |
| iOS Capacitor shell | Yes | Same remote; bundle `com.amynest.app` | `capacitor.config.json`; `project.pbxproj` | Code **VERIFIED**; ASC seller **SELLER-STATED** | Yes | Code assignment + Apple transfer + certs | **PARTIAL** | Certs not escrowed |
| Database schema | Yes | In repo `lib/db/` | Schema inventory `docs/production-stabilization/phase-0/database-inventory.md` | Schema **VERIFIED** | Yes | Ships with source | **VERIFIED schema** | Buyer must not `db:push` prod without backup |
| Database contents | Yes (prod) | Coolify-attached Postgres **INFERRED** from July 2026 certs | `render-retirement-final-certification.md` (20 Jul 2026); healthz `x-amynest-backend: coolify`. Host/IAM **not** re-verified 24 Sep | Production host **INFERRED**; legal right to sell personal/child data **UNKNOWN** | Yes if lawful | Encrypted dump + new instance | **UNKNOWN current dump**; privacy constraint | Child data may be non-transferable |
| Prompts / AI instructions | Yes | In repo (`lib/`, `content-engine/`, API prompts) | Source files | Possession **VERIFIED**; title **UNKNOWN** | Yes | Assignment (to the extent original) | **UNKNOWN title** | AI-assisted authorship |
| Content library (scripts / seeds) | Yes (code + some media) | Repo + GCS | `content-engine/`; GCS not in git | Code **VERIFIED**; media provenance **UNKNOWN** | Yes | Assignment + GCS project | **PARTIAL** | Third-party / generated media |
| Illustrations | Mixed | Repo `public/` + GCS | Feature matrix: mixed | Existence **VERIFIED** in part; ownership **UNKNOWN** per file | Yes if owned | Provenance pack | **UNKNOWN** per asset | Stock / generated risk |
| Audio | Mixed | GCS + repo static (e.g. health-lab mp3) | `TTS_USE_GCS`; handover `STORAGE.md` | Some files **VERIFIED**; bucket title **UNKNOWN** | Yes | GCP transfer | **UNKNOWN** bucket IAM | Founder SA keys |
| Videos | Mixed / GCS | UNVERIFIED bucket | Feature matrix | Existence **INFERRED** from product; objects **UNKNOWN** | If they exist | GCS | **UNKNOWN** | |
| Worksheets | Yes (generator + templates) | Repo `lib/worksheet-studio` | Production feature matrix | Code **VERIFIED**; template license **UNKNOWN** | Yes | Assignment + license review | **UNKNOWN** template title | |
| Coloring books | Yes (feature) | Code `coloring-books.tsx`, `routes/coloring.ts`, `coloring_downloads` | Code routes | Feature **VERIFIED**; artwork title **UNKNOWN** | Yes if original | Assignment | **UNKNOWN** art title | |
| Curiosity books | Referenced as hub module | Code / GCS | Feature matrix | Existence as product surface **VERIFIED** in code; asset title **UNKNOWN** | If original assets exist | Assignment + GCS | **UNKNOWN** | |
| Game assets | Yes (code) | Repo math-playground / games | Feature matrix | Code **VERIFIED**; art/audio **UNKNOWN** | Yes | Assignment | **UNKNOWN** media | |
| Health-lab assets | Mixed | Repo static + API | `health-lab-audio` in repo; prod 200 historically | Some files **VERIFIED**; remainder **UNKNOWN** | Yes | With web + GCS | **PARTIAL** | |
| Astronomy / Birth Sky assets | Yes (feature) | Repo + encrypted fields | Feature flags; `BIRTH_SKY_FIELD_ENCRYPTION_KEY` | Code **VERIFIED**; key escrow **UNKNOWN** | Yes | Assignment + key handover | **UNKNOWN** key | Fatal if key lost |
| Brand / name AmyNest | In use | Used on domain, stores, i18n | Product copy | Use **VERIFIED**; TM registration **UNKNOWN** (none in repo) | Yes (goodwill) | Assignment of name-as-used; no TM claimed | **UNKNOWN TM** | No filing |
| AmyWorld business / trade name | In use | Product copy + seller statement of sole prop | `legal-entity.ts`; this-pass seller statement | Use **VERIFIED**; sole-prop registration **SELLER-STATED**; CIN **UNKNOWN** | Disclose / retitle | SPA election Path A or B | **SELLER-STATED sole prop** | Not proven owner of code/patent |
| Domain `amynest.in` / `www.amynest.in` | Yes | **Ankur Raman personally** (owner-confirmed); registrar unproven | Owner confirmation 25 Sep; live origin in `config.ts` | Use **VERIFIED**; holder **OWNER-CONFIRMED / EVIDENCE PENDING** | Yes (personal asset on schedule) | Registrar transfer — **no auth-code in git** | **OWNER-CONFIRMED**; eligibility **UNKNOWN** | Not AmyWorld-owned |
| Pages hostname `amynest-web.pages.dev` | Yes | Cloudflare Pages `amynest-web`; **CF account = Ankur Raman personally** | Owner confirmation 25 Sep; deploy workflow | Hosting **VERIFIED**; account **OWNER-CONFIRMED / EVIDENCE PENDING** | Yes (personal asset on schedule) | CF account / project | **OWNER-CONFIRMED**; eligibility **UNKNOWN** | Not AmyWorld-owned |
| GitHub repository | Yes | `ankur6779` personal account, public | `gh`: owner `ankur6779`; only listed collaborator `ankur6779` admin; not a fork; 0 forks | Control **VERIFIED** as that account | Yes | Transfer repo or invite org | **FOUNDER-DEPENDENT** | Actions secrets on this account |
| Google Play Console | Yes | **AmyWorld** (owner-confirmed) | Owner confirmation 25 Sep; package `com.amynest.app` | Account **OWNER-CONFIRMED / EVIDENCE PENDING**; package ID **VERIFIED** | Yes | Play app transfer | **OWNER-CONFIRMED**; eligibility **UNKNOWN**; transfer **not started** | Weeks; keystore |
| Apple App Store Connect | Yes | **AmyWorld** (owner-confirmed) | Owner confirmation 25 Sep; listing “Amyworld” (14 Sep); App ID `6767664343` | Account **OWNER-CONFIRMED / EVIDENCE PENDING**; App ID **VERIFIED** | Yes | Apple app transfer | **OWNER-CONFIRMED**; eligibility **UNKNOWN**; transfer **not started** | Weeks; new certs |
| Firebase | Yes | Project id seen in audit JSON `amynest-836ff` | `scripts/audit/render-to-coolify/dashboard-latest.json`; client config via CI secrets | Project id **VERIFIED** in historical audit JSON; GCP billing owner **UNKNOWN** | Yes | GCP project IAM / move | **UNKNOWN** org title | Auth users / FCM |
| Google Cloud / GCS | Yes (prod TTS/media) | UNVERIFIED GCP project | Env `TTS_USE_GCS`; storage handover | Usage **VERIFIED** in config; account title **UNKNOWN** | Yes | Project transfer | **UNKNOWN** | Objects + SA keys |
| PostgreSQL (prod) | Yes | Coolify plane **INFERRED** | July 2026 replica + retirement certs; not re-counted 24 Sep | Engine **VERIFIED**; current host/owner **UNKNOWN** | Yes | Dump + new instance | **INFERRED Coolify**; backup **FAIL** | See DB note below |
| Render | Historical | Render services documented suspended | `render-retirement-final-certification.md` 20 Jul 2026 | July state **VERIFIED** in that cert; 24 Sep live **UNKNOWN** | Confirm unused | Delete or ignore if still dead | **UNKNOWN if still exists** | Do not treat as live without re-probe |
| Coolify | Yes | UNVERIFIED Coolify account | Deploy workflow comments; sslip.io origin in CI | Usage **VERIFIED**; account title **UNKNOWN** | Yes | Access or rebuild | **UNKNOWN** account | Git webhook |
| Hetzner | Yes (AI worker) | **AmyWorld** (owner-confirmed) | Owner confirmation 25 Sep; Actions secret **names** | Usage **VERIFIED**; title **OWNER-CONFIRMED / EVIDENCE PENDING** | Yes | Server access or rebuild | **OWNER-CONFIRMED**; live IP / billing docs **PENDING** | Do not expose credentials |
| Cursor / development tooling | Yes | **AmyWorld** (owner-confirmed) | Owner confirmation 25 Sep | Tooling relationship **OWNER-CONFIRMED / EVIDENCE PENDING** | N/A to copyright | Disclose; buyer uses own Cursor | **Not source-code title** | Do not infer copyright |
| RevenueCat | Yes | Project `proj9c1919f0` | Billing handover; MCP queried prior pass | Project **VERIFIED**; org legal owner **UNKNOWN** | Yes | Invite / transfer + new keys | **UNKNOWN** org | Webhook URL |
| Razorpay | Code present | Seller: not currently used for AmyNest transactions | Finance evidence update 24 Sep | Usage **SELLER-STATED** unused; merchant title **UNKNOWN** | Only if account exists | Export / KYC | **SELLER-STATED unused** | Not a ₹0 export |
| Google Ads | Yes | Login `ankur6779@gmail.com`; customer `6395859996` | Ads disclosure docs | Login **VERIFIED** prior pass | Yes | MCC / transfer | **VERIFIED** personal login | ENABLED campaign |
| Analytics (GA4 / Firebase / Postgres) | Yes | UNVERIFIED properties | `VITE_GA4_MEASUREMENT_ID` secret name; Postgres events | Stack **VERIFIED**; property owners **UNKNOWN** | Yes | GCP + DB | **UNKNOWN** | |
| Email `support@amynest.in` | Referenced | UNVERIFIED mailbox | `support.tsx`; privacy | Address **VERIFIED** in product; mailbox owner **UNKNOWN** | Yes | MX + mailbox | **UNKNOWN** | |
| Admin alert email | Referenced | Example `ankur6779@gmail.com` | `ENVIRONMENT_VARIABLES.md` | Example **VERIFIED**; live value **UNKNOWN** | Yes | Change env | **INFERRED** founder mailbox | |
| Sentry | Optional | UNVERIFIED | Env names | Existence **UNKNOWN** if live | If used | Invite | **UNKNOWN** | |
| OpenAI / Gemini / ElevenLabs | Configured | UNVERIFIED vendor orgs | `AI_PROVIDERS.md`; env names | Dependency **VERIFIED**; account owners **UNKNOWN** | Yes | New buyer keys | **UNKNOWN** | TOS / child policy |
| GitHub Actions secrets | Yes | Bound to `ankur6779/Amynest-live` | `.github/workflows/deploy-production.yml` | Secret **names** **VERIFIED**; values not inspected | Yes | Recreate on buyer repo | **FOUNDER-DEPENDENT** | CF token, Firebase, Hetzner SSH |
| Indian Patent Application 202611059355 | Yes | Ankur Raman | `patent/` identity sheet | Applicant **VERIFIED** | Only if in deal | IPO assignment / recordal | **NOT assigned** | Not granted; not published |
| Signed IP assignment / bill of sale | Draft only | — | `IP_ASSIGNMENT_DRAFT.md`; `ASSET_BILL_OF_SALE_DRAFT.md` | Draft **VERIFIED**; execution **UNKNOWN** (none) | Yes | Counsel + wet ink | **DRAFT / NOT EXECUTED** | |
| Contractor / agency assignments | None found | — | Git authors; no agreements | Absence of docs **VERIFIED**; unknown unknown remains | If any existed | Collect | **UNKNOWN** if any existed | |
| Trademark filings | None in repo | — | Search of `docs/` / `patent/` | **UNKNOWN** (none found) | If any exist | Assignment | **UNKNOWN** | |

## Database mismatch (do not silently close)

This pass **did not** locate a repository artifact stating “Render ≈ 436,860 rows vs Coolify ≈ 50 rows.”

What **is** in the repository:

| Date | Finding | Source |
|------|---------|--------|
| 2026-07-03 | Smaller inventory (e.g. `analytics_events` ≈ 5,909) | `docs/production-stabilization/phase-0/database-inventory.md` |
| Restore incident | Coolify `phonics_content` held **50** rows vs Render **131** after bulk restore | `audit/render-to-coolify/database-replica-certification.md` |
| 2026-07-12 | Replica verify **522,568 = 522,568** (PASS at that moment) | `audit/render-to-coolify/verify-latest.md` |
| Later July | Coolify reported **588,151** total rows | `audit/render-to-coolify/data-plane-audit-latest.md` |
| 2026-07-20 | Render API/static **suspended**; live header `x-amynest-backend: coolify` | `render-retirement-final-certification.md` |
| 2026-09-24 | Production `DATABASE_URL` host, automated backups, and restore drill | **NOT re-verified**. Backup/restore certification **FAIL** |

**Status:** historical cutover is **documented**, not re-certified this pass. Migration is **not** declared complete for buyer diligence.

## What store-account seller-statement does *not* prove

AmyWorld-on-Play/ASC (**OWNER-CONFIRMED / EVIDENCE PENDING**) ≠ copyright in git ≠ domain (Ankur personally) ≠ Cloudflare (Ankur personally) ≠ GCP org ≠ patent (Ankur personally, verified applicant).
