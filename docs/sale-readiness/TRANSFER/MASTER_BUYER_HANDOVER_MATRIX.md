# MASTER BUYER HANDOVER MATRIX

**Date:** 24 September 2026  
**Operational readiness only. Not a legal opinion. Score not changed by this file.**

If a buyer signed tomorrow, **every row below must be handed over, transferred, configured, tested, and accepted** before the deal is operationally complete. Rows marked UNKNOWN still require owner evidence first.

Detail files: `GITHUB_HANDOVER.md`, `DATABASE_HANDOVER.md`, `ANDROID_HANDOVER.md`, `IOS_HANDOVER.md`, `CLOUD_HANDOVER.md`, `DOMAIN_EMAIL_HANDOVER.md`, `BILLING_HANDOVER.md`, `ANALYTICS_ADS_HANDOVER.md`, `CONTENT_MEDIA_HANDOVER.md`, `EXTERNAL_SERVICE_HANDOVER.md`.

Evidence types: **VERIFIED** · **SELLER-STATED** · **INFERRED** · **UNKNOWN**

---

## Source / GitHub

| Asset | Purpose | Current account/operator | Ownership status | Evidence | Type | Founder dep. | Transfer mechanism | Owner action | Buyer action | Creds? | Backup? | Restore test? | Verification test | Status | Acceptance | Risk if not transferred |
|-------|---------|--------------------------|------------------|----------|------|--------------|--------------------|--------------|--------------|--------|---------|---------------|-------------------|--------|------------|-------------------------|
| GitHub repo `ankur6779/Amynest-live` | Source of truth | `ankur6779` personal, public | Possession VERIFIED; **legal title UNKNOWN** | `gh repo view` | VERIFIED control / UNKNOWN title | **YES** | GitHub Settings → Transfer repository to buyer org | Start transfer; remain admin until accept | Create org; accept transfer | SSH/PAT after | git is backup | Clone already works | Buyer admin ≠ `ankur6779` | OPEN | Buyer is Owner | Founder can force-push / delete |
| GitHub account `ankur6779` | Identity that owns repo + secrets | Person | Personal | `gh` | VERIFIED | **YES** | Do **not** sell the Gmail/GitHub login; transfer **repo** | Transfer repo; remove self after | Own org | — | — | — | Repo not on personal user | OPEN | Repo on buyer org | Personal-account lock-in |
| GitHub Actions + `deploy-production.yml` | Pages, Worker, Hetzner deploy | Same repo; gate `ankur6779/Amynest-live` | Operational | Workflow file | VERIFIED | **YES** | Recreate workflow on transferred repo; edit repository-name `if` | Edit gate after transfer | Confirm Actions enabled | Secrets | — | Re-run workflow | Green deploy with buyer secrets | OPEN | Buyer dispatch succeeds | No web/worker deploys |
| CI secrets (names listed in GITHUB_HANDOVER) | Deploy + some jobs | Same repo | Founder store | `gh secret list` | VERIFIED names | **YES** | Recreate on destination; **rotate** values | Export offline to escrow (not git) | Paste into buyer repo | **YES** | Escrow list | N/A | Workflow authenticates | OPEN | Buyer-controlled secrets | Outage / leaked founder keys |
| Vite/GA4 secret names in workflow, absent from `gh secret list` | Web build | **UNKNOWN** store | UNKNOWN | Workflow vs secret list | UNKNOWN | **YES** | Find where they live (Coolify/Env) | Disclose location | Recreate | **YES** | — | — | Production SPA has Firebase | OPEN | Documented store | Broken auth after rebuild |
| Branch protection `main` | Change control | **None** | N/A | API 404 | VERIFIED absent | N/A | Enable on buyer org (optional) | Optional | Enable | — | — | — | Rules present if required | OPEN | Buyer policy | Accidental prod push |
| Deploy keys | Alternate git auth | **None** | N/A | API `[]` | VERIFIED absent | — | Create if Coolify needs one | — | Add key | If used | — | — | Coolify fetch works | OPEN | Documented git auth | Coolify cannot pull |
| Repo webhooks | Coolify/Git notify | **None returned** | UNKNOWN how Coolify watches | API `[]` | VERIFIED empty API | **YES** | Install GitHub App or webhook on buyer repo | Disclose Coolify git method | Reconnect | If webhook secret | — | — | Push triggers Coolify | OPEN | Documented hook | API does not update |
| GH Environments (Render-era names) | Historic deploy records | Same repo | Stale | Environments API | VERIFIED exist | LOW | Ignore or delete after confirm unused | Confirm unused | Clean up | — | — | — | No prod dependency | OPEN | Confirmed unused | Confusion only |

## Application stores — Android

| Asset | Purpose | Operator | Ownership | Evidence | Type | Founder | Transfer mechanism | Owner action | Buyer action | Creds? | Backup? | Restore? | Verification | Status | Acceptance | Risk |
|-------|---------|----------|-----------|----------|------|---------|--------------------|--------------|--------------|--------|---------|----------|--------------|--------|------------|------|
| Play Console | Distribute Android | AMYWORLD sole prop | Account **SELLER-STATED** | This-pass statement | SELLER-STATED | **YES** | Play Console **app transfer** of `com.amynest.app` to buyer developer account | Start transfer; tax/forms | Enroll Play; accept | Play login | Listing export | N/A | Buyer is Play owner | OPEN | Transfer complete email | Cannot ship Android |
| Package `com.amynest.app` | App identity | Same | ID VERIFIED | Gradle | VERIFIED | — | Stays with transfer | — | Keep ID | — | — | — | Same package live | OPEN | Package unchanged | Users lose updates |
| Play App Signing | Google holds app-signing key | Google + Play account | Console **UNKNOWN** | README | INFERRED | **YES** | Confirm enrollment in Play; transfer keeps Google-held key | Screenshot enrollment | Confirm SHA-1 | Play | — | Play reset policy | Buyer sees App Signing page | OPEN | Enrollment visible | Cannot update if upload key lost |
| Upload keystore | Signs AAB for Play | Founder disk | NOT ESCROWED | README; not in git | VERIFIED absent | **YES** | **Offline escrow** of keystore+passwords (not git) | Dual-control handoff | Store offline | **YES** | Encrypted copy | Unlock test | Buyer `bundleRelease` signs | OPEN | Buyer-signed AAB | **Fatal** Play updates |
| Testing tracks | Internal/closed/open | Play | UNKNOWN live | Internal-testing docs | UNKNOWN | **YES** | Travel with app transfer | Export testers | Re-invite | Play | — | — | Buyer sees tracks | OPEN | Tracks listed | Lost testers |
| Play API service account | Automated upload | UNKNOWN if exists | UNKNOWN | — | UNKNOWN | ? | Re-create under buyer Play | Disclose if used | Create | If used | — | — | API upload works or N/A | OPEN | Documented | CI upload fails |

## Application stores — Apple

| Asset | Purpose | Operator | Ownership | Evidence | Type | Founder | Transfer mechanism | Owner action | Buyer action | Creds? | Backup? | Restore? | Verification | Status | Acceptance | Risk |
|-------|---------|----------|-----------|----------|------|---------|--------------------|--------------|--------------|--------|---------|----------|--------------|--------|------------|------|
| App Store Connect | Distribute iOS | AMYWORLD sole prop | **SELLER-STATED** | Statement + “Amyworld” listing | SELLER-STATED | **YES** | ASC **app transfer** of `6767664343` | Start transfer | Enroll Apple Developer; accept | Apple ID | Listing export | N/A | Buyer is ASC owner | OPEN | Transfer accepted | Cannot ship iOS |
| Bundle `com.amynest.app` | App identity | Same | VERIFIED | Xcode | VERIFIED | — | Stays | — | Keep | — | — | — | Bundle live | OPEN | Unchanged | Update break |
| Certs / profiles | Sign IPA | Founder Keychain | NOT ESCROWED | IOS_RELEASE | VERIFIED process | **YES** | After transfer, **new** certs (rotation) | Escrow current until cut | Create new | **YES** | — | New profile | Buyer-signed IPA | OPEN | Signed without Ankur | No TestFlight/App Store |
| APNs | Push | Apple + Firebase | UNKNOWN key file | Plugins exist | UNKNOWN | **YES** | New `.p8` after transfer if needed | Disclose current key location | Upload to Firebase | **YES** | — | — | Push on device | OPEN | Push works | Silent push death |
| TestFlight | Beta | ASC | UNKNOWN | — | UNKNOWN | **YES** | Moves with app | Export groups | Re-invite | Apple | — | — | Buyer sees builds | OPEN | Groups present | Lost beta |

## Infrastructure

| Asset | Purpose | Operator | Ownership | Evidence | Type | Founder | Transfer mechanism | Owner action | Buyer action | Creds? | Backup? | Restore? | Verification | Status | Acceptance | Risk |
|-------|---------|----------|-----------|----------|------|---------|--------------------|--------------|--------------|--------|---------|----------|--------------|--------|------------|------|
| Coolify | API + intended DB/cron | UNKNOWN | UNKNOWN | Deploy docs; sslip.io | VERIFIED use / UNKNOWN title | **YES** | Invite admin **or** rebuild from compose+env | Dump env (offline) | New Coolify or IAM | **YES** | Image history UNKNOWN | Scratch API | Origin `/api/healthz` 200 | OPEN | Buyer deploys API | Site API down |
| Hetzner | AI worker | UNKNOWN | UNKNOWN | GH SSH secrets; IPs 167.233.39.146 and 188.245.208.126 both documented | UNKNOWN which live | **YES** | Hetzner project transfer or new VPS + SSH | Disclose live IP | Accept project / rebuild | SSH **YES** | Snapshot UNKNOWN | Job smoke | Worker completes job | OPEN | Worker on buyer SSH | AI queue dies |
| Render | Historic | Documented suspended 20 Jul | UNKNOWN if gone | Retirement cert; `RENDER_API_KEY` still in GH | INFERRED unused | LOW if dead | Confirm unused; revoke key | Probe + delete key | Ignore if 503 | Revoke | — | — | Render URL 503 | OPEN | Confirmed unused | Accidental resume / leaked key |
| Cloudflare | Pages+Worker+likely DNS | UNKNOWN | UNKNOWN | Token; infra/ | VERIFIED use | **YES** | CF account/zone transfer or Super Admin | Invite; later remove self | Accept; new token | Token **YES** | Zone export | — | www 200 + API via Worker | OPEN | Buyer CF admin | Domain/API edge down |
| Firebase/GCP `amynest-836ff` | Auth, FCM, FA | UNKNOWN Owner | UNKNOWN | Rotation doc | VERIFIED project id | **YES** | GCP **project move** to buyer billing | IAM + billing | Accept project | SA JSON **YES** | — | — | Sign-in on buyer project | OPEN | Buyer GCP Owner | Auth/push die |
| GCS `amynest-audio-storage` | Audio/media | Same GCP | UNKNOWN IAM | Code bucket name | VERIFIED name | **YES** | Moves with project **or** `gcloud storage cp` | Inventory | IAM | SA **YES** | Object listing | Restore sample | `healthz/audio` | OPEN | Buyer can list bucket | Silent audio outage |
| PostgreSQL | State | UNKNOWN host | UNKNOWN | See DATABASE_HANDOVER | UNKNOWN host | **YES** | Encrypted `pg_dump` → buyer instance; new `DATABASE_URL` | Produce dump | Restore scratch | **YES** | **YES** | **YES required** | Scratch R/W smoke | OPEN | Acceptance quote in DATABASE_HANDOVER | Data loss / illegal transfer of child data |
| Redis | BullMQ | UNKNOWN host | UNKNOWN | Required in prod example | VERIFIED need | **YES** | New Redis; cut `REDIS_URL` | Disclose host | Provision | **YES** | Optional | Queue smoke | Job consumed | OPEN | Worker+API share URL | Jobs stuck |
| Scheduler / cron | Digests, pushes | Coolify intended | UNKNOWN live | `SCHEDULER_ACTIVE_PLANE=coolify` | INFERRED | **YES** | Same as Coolify | List cron | Enable | — | — | — | Digest fires | OPEN | Buyer sees cron | Missed notifications |
| Sentry | Errors | UNKNOWN if live | UNKNOWN | Code + empty DSN example | UNKNOWN live | ? | New DSN or disable | Disclose if set | Create project | If used | — | — | Event received or confirmed off | OPEN | Documented | Blind prod |
| Logging | Host logs | UNKNOWN | UNKNOWN | LOG_LEVEL | INFERRED | **YES** | Host dashboard access | Export runbook | Access | Host | Retention UNKNOWN | — | Buyer can tail logs | OPEN | Access | No incident debug |

## Domain / email

| Asset | Purpose | Operator | Ownership | Evidence | Type | Founder | Transfer mechanism | Owner action | Buyer action | Creds? | Backup? | Restore? | Verification | Status | Acceptance | Risk |
|-------|---------|----------|-----------|----------|------|---------|--------------------|--------------|--------------|--------|---------|----------|--------------|--------|------------|------|
| `amynest.in` | Apex | UNKNOWN registrar | UNKNOWN | Used in config | VERIFIED use | **YES** | `.in` registrar **auth-code transfer** | Unlock + EPP | Buyer registrar | Registrar | WHOIS after | — | Buyer WHOIS | OPEN | Buyer registrant | Total brand/DNS loss |
| `www.amynest.in` | Canonical | Same | UNKNOWN | config.ts | VERIFIED | **YES** | Same zone | — | — | — | Zone file | — | HTTPS 200 | OPEN | www resolves | Outage |
| DNS / SSL | Route + cert | INFERRED Cloudflare | UNKNOWN | Pages custom domain docs | INFERRED | **YES** | CF zone transfer/invite | Export zone | Accept | CF | Zone export | — | Cert valid | OPEN | Buyer DNS admin | HTTPS fail |
| SPF/DKIM/DMARC/MX | Mail auth | UNKNOWN | UNKNOWN | No zone in repo | UNKNOWN | **YES** | Copy records at transfer | Export records | Recreate | — | Zone | — | Mail-tester | OPEN | Records present | Spoof / bounce |
| `support@amynest.in` | Support | UNKNOWN mailbox | UNKNOWN | Product copy | VERIFIED address | **YES** | Mailbox provider transfer or new MX | Disclose provider | New mailbox | **YES** | Export mail if lawful | — | Buyer receives support@ | OPEN | Buyer inbox | Users email founder |
| `ADMIN_ALERT_EMAIL` | Ops | Example Gmail | Founder | env example | VERIFIED example | **YES** | Change env to buyer | Change Coolify | Provide inbox | — | — | — | Digest to buyer | OPEN | Not Gmail founder | Alerts lost |

## Payments / analytics / ads

| Asset | Purpose | Operator | Ownership | Evidence | Type | Founder | Transfer mechanism | Owner action | Buyer action | Creds? | Backup? | Restore? | Verification | Status | Acceptance | Risk |
|-------|---------|----------|-----------|----------|------|---------|--------------------|--------------|--------------|--------|---------|----------|--------------|--------|------------|------|
| RevenueCat `proj9c1919f0` | Entitlements | UNKNOWN org | UNKNOWN | Billing docs | VERIFIED id | **YES** | RC **invite Admin** then project transfer if offered | Invite | Accept; new keys | **YES** | Config export | — | Buyer changes offering | OPEN | Buyer RC admin | Paid users unlock fail |
| Play / ASC billing | Store charges | Store accounts | SELLER-STATED | STORE_ACCOUNT | SELLER-STATED | **YES** | Completes **only with** store app transfers | Start store transfers | Enroll | Store | — | — | Buyer sees proceeds | OPEN | Store owner | Revenue stranded |
| RC / Razorpay webhooks | Server notify | Coolify URL | — | Code paths | VERIFIED paths | **YES** | Repoint dashboard + rotate secrets | Update after API cut | Confirm 2xx | Secrets **YES** | — | Test event | 2xx + row | OPEN | Test event logged | Entitlement desync |
| Razorpay merchant | Web INR | SELLER-STATED unused | UNKNOWN | Finance statement | SELLER-STATED | If exists | KYC transfer or retire keys | Export if any | Ignore if proven unused | If any | — | — | Statement or zero export | OPEN | Documented | Surprise merchant |
| Firebase Analytics / GA4 | Product analytics | UNKNOWN properties | UNKNOWN | Workflow secret names | INFERRED | **YES** | GCP/GA4 property transfer | Disclose property IDs | Accept | — | — | — | Hits in buyer UI | OPEN | Buyer property | Blind funnel |
| Google Ads `6395859996` / campaign `23986249354` | UA | `ankur6779@gmail.com` | VERIFIED login historically | Prior Ads | VERIFIED | **YES** | Ads **account transfer / MCC** — **do not edit campaign this pass** | Start transfer | Accept MCC | Google | — | — | Buyer admin | OPEN | Buyer is admin | Spend continues on founder card |

## AI / content / legal

| Asset | Purpose | Operator | Ownership | Evidence | Type | Founder | Transfer mechanism | Owner action | Buyer action | Creds? | Backup? | Restore? | Verification | Status | Acceptance | Risk |
|-------|---------|----------|-----------|----------|------|---------|--------------------|--------------|--------------|--------|---------|----------|--------------|--------|------------|------|
| OpenAI / Gemini / ElevenLabs / KIE / YouTube | AI + content factory | UNKNOWN | UNKNOWN | Secret names | VERIFIED names | **YES** | **New keys** (rotation); TOS | Revoke old after | New orgs | **YES** | — | — | One prod AI call | OPEN | Buyer key only | Feature + surprise bills |
| Open-Meteo | Weather | Public | N/A | generate.tsx | VERIFIED | No | None | — | — | No | — | — | Detect works | READY* | Weather still works | Low (*no account) |
| Prompts / content-engine / worksheets / coloring / curiosity / stories / games / health-lab / astronomy | Product content | Repo + GCS | Title UNKNOWN | CONTENT_MEDIA | Mixed | **YES** | Assignment + GCS IAM | Provenance pack | Accept as-is unknowns | GCS | GCS inventory | Sample objects | Surfaces load | OPEN | Media 200 on buyer SA | Empty modules |
| Birth Sky field key | Decrypt natal fields | Coolify env | NOT ESCROWED | env name | VERIFIED name | **YES** | Offline escrow | Dual-control | Load on scratch | **YES** | — | Decrypt one row | Read works | OPEN | Scratch decrypt | Permanent PII loss |
| AmyNest brand / AmyWorld name | Trading | SELLER-STATED sole prop | TM UNKNOWN | legal-entity | SELLER-STATED / UNKNOWN TM | **YES** | SPA schedule + Path A/B | Elect path | Counsel | — | — | — | Legal pages match seller | OPEN | Election signed | Wrong seller |
| Privacy / terms / `support@` | Legal UX | Repo; live may be stale | Copy in git | Pages | VERIFIED files | Deploy **YES** | Rewrite to buyer after close | Authorize deploy | Publish | — | — | — | Live pages = buyer | OPEN | Live match | Misrepresentation |
| Patent 202611059355 | Application only | Ankur Raman | Ankur Raman | patent/ | VERIFIED | **YES** | **INCLUDED or EXCLUDED** then IPO assignment if included | Check a box | Counsel | — | Papers in repo | — | Election signed | OPEN | Box checked | Hidden prosecution cost / false “IP included” |
| Third-party OSS | Runtime | SPDX | Licensed use | SBOM | VERIFIED inventory | No | None (comply) | LICENSE decision on MIT field | Counsel | — | — | — | SBOM accepted | OPEN | Counsel memo | Copyleft/MIT surprise |
| Source copyright | Exclusive sale story | UNKNOWN | UNKNOWN | No LICENSE; MIT field; © footer | CONTRADICTED metadata | **YES** | Executed assignment / bill of sale | Sign | Sign | — | — | — | Wet-ink deed | OPEN | Executed deed | **Hard cap 69** — cannot sell clean title |

\*Open-Meteo is the only production-critical row that does not require a founder account.

**Master asset count (matrix rows): 52**
