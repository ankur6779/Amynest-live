# EXTERNAL SERVICE HANDOVER

**Date:** 24 September 2026  
**No secret values.** Production dependency means “code/config expects this in production,” not a live invoice proof.

| Provider | Purpose | Production dependency | Current account owner | Evidence | Transfer mechanism | API key rotation required? | Webhook required? | Billing owner | Buyer acceptance test | Status |
|----------|---------|----------------------|----------------------|----------|--------------------|----------------------------|-------------------|---------------|----------------------|--------|
| OpenAI | LLM, TTS (`gpt-4o-mini-tts`), Realtime speech | **Yes** if AI/TTS features stay on | **UNKNOWN** | `OPENAI_API_KEY` in env example + GH secrets list; API health checks | New org key; update Coolify + GH + worker | **Yes** | No | **UNKNOWN** | TTS + one Ask Amy / routine-AI call on buyer key | **UNKNOWN — OWNER ACTION REQUIRED** |
| Google Gemini | LLM / Google APIs | **Configured** | **UNKNOWN** | `GOOGLE_API_KEY` example; `GEMINI_API_KEY` GH secret | New GCP key or project | **Yes** | No | **UNKNOWN** | Feature that calls Gemini succeeds | **UNKNOWN** |
| ElevenLabs | Optional TTS fallback | **Optional** | **UNKNOWN** | `ELEVENLABS_API_KEY` in health missing-list as optional | New key or drop fallback | If used | No | **UNKNOWN** | Confirm unused **or** stream works | **UNKNOWN** if live |
| KIE.ai | Video / content-engine generation | **UNKNOWN** if required for prod app | **UNKNOWN** | `KIE_API_KEY` GH secret | New key | **Yes** if used | No | **UNKNOWN** | Only if content factory is in-scope | **UNKNOWN** |
| YouTube API | Content upload / engine | **UNKNOWN** if required for prod app | **UNKNOWN** | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` GH secrets | New OAuth client | **Yes** if used | No | **UNKNOWN** | Only if upload pipeline is in-scope | **UNKNOWN** |
| Firebase / FCM | Auth, push | **Yes** | **UNKNOWN** (project `amynest-836ff`) | Client + admin secret names | GCP project move + rotate SA | **Yes** | No (FCM) | **UNKNOWN** | Sign-in + push on buyer project | **UNKNOWN — OWNER ACTION REQUIRED** |
| Google Cloud Storage | Audio / catalogs | **Yes** (`TTS_USE_GCS=true`) | **UNKNOWN** | Bucket `amynest-audio-storage`; SA email in rotation doc | Project IAM or copy | **Yes** | No | **UNKNOWN** | `healthz/audio` GCS probe | **UNKNOWN — OWNER ACTION REQUIRED** |
| Cloudflare | Pages, Worker, likely DNS/SSL | **Yes** | **UNKNOWN** | Token name; `infra/cloudflare/` | Account/zone transfer + new token | **Yes** | No | **UNKNOWN** | www 200 + `/api/healthz` via Worker | **UNKNOWN — OWNER ACTION REQUIRED** |
| Hetzner | AI worker host | **Yes** (dedicated worker required) | **UNKNOWN** | SSH secret names | Project transfer / new VPS | SSH key **rotate** | No | **UNKNOWN** | Worker processes a BullMQ job | **UNKNOWN — OWNER ACTION REQUIRED** |
| Coolify | API + intended DB/scheduler | **Yes** | **UNKNOWN** | Deploy docs | Admin invite or rebuild | Env **rotate** | Git hook **UNKNOWN** | **UNKNOWN** | `/api/healthz` 200 on origin | **UNKNOWN — OWNER ACTION REQUIRED** |
| Render | Historic host | **Should be unused** if July cert still true | **UNKNOWN** | `RENDER_API_KEY` still in GH secrets; services documented suspended 20 Jul | Confirm unused; revoke key | Revoke | No | **UNKNOWN** | Direct Render URL still 503 | **UNKNOWN** 24 Sep |
| RevenueCat | Entitlements | **Yes** | **UNKNOWN** | Project IDs | Invite + rotate keys | **Yes** | **Yes** `/api/subscription/webhook` | **UNKNOWN** | Test webhook 2xx | **UNKNOWN — OWNER ACTION REQUIRED** |
| Razorpay | India web checkout (code) | Seller: **not used** | **UNKNOWN** | Code + seller statement | KYC / ignore if proven unused | If account exists | Path exists | **UNKNOWN** | Statement **or** zero export | **SELLER-STATED unused** |
| Google Ads | UA | **Yes** (campaign live prior pass) | `ankur6779@gmail.com` | Prior Ads query | MCC / transfer — **do not edit campaign this pass** | N/A | Conversions via Firebase/GA4 | **UNKNOWN** card | Buyer is admin | **VERIFIED** founder login historically |
| Google Analytics 4 | Measurement | **INFERRED** | **UNKNOWN** | `VITE_GA4_MEASUREMENT_ID` in workflow | Property transfer or new ID | Rebuild | No | **UNKNOWN** | Hits in buyer GA4 | **UNKNOWN** |
| Sentry | Errors | **Optional** | **UNKNOWN** | Code; empty example DSN | New DSN or disable | If used | No | **UNKNOWN** | Test error appears **or** confirm unset | **UNKNOWN** |
| Slack incoming webhook | Admin digest | **Optional** | **UNKNOWN** | `ADMIN_ALERT_SLACK_WEBHOOK_URL` | New webhook | **Yes** if used | Incoming webhook | **UNKNOWN** | Digest posts **or** confirm empty | **UNKNOWN** |
| Telegram bots | Optional realtime alerts | **Optional** | **UNKNOWN** | Commented env names | New bot | If used | No | **UNKNOWN** | Confirm unused | **UNKNOWN** |
| Admin email | Health digest | Example Gmail | `ankur6779@gmail.com` example | `.env.production.example` | Change to buyer mailbox | SMTP/provider **UNKNOWN** | No | Founder Gmail | Digest to buyer inbox | **FOUNDER-DEPENDENT** |
| Open-Meteo | Routine weather detect | **Yes** (client, no key) | Public API | Routine generate code | None | No | No | N/A | Weather chip / detect still works | **VERIFIED** as code dependency |
| Apple / Google identity | Sign-in | **Yes** | Store + Firebase | Native plugins | Recreate OAuth clients | **Yes** | No | Store accounts | Sign-in on iOS/Android/web | **UNKNOWN — OWNER ACTION REQUIRED** |
| npm / pnpm registry | Build | Public packages | N/A | lockfile | None (licenses as-is) | No | No | N/A | `pnpm install` | **VERIFIED** |
| Expo / EAS | Legacy env names in prod example | **Not** the shipped iOS/Android path | — | `.env.production.example` Expo block | Ignore for Play/iOS handover | — | — | — | Do not treat as production store | **INFERRED** unused for shipped stores |

No SMS provider (Twilio etc.) was found in production env examples this pass. **UNKNOWN** if one exists only in Coolify.

## Live-use status (code/config ≠ live)

| Service | In repo? | Live production? |
|---------|----------|------------------|
| OpenAI | **FOUND** | **UNKNOWN** (required if AI/TTS on) |
| Gemini / GOOGLE_API_KEY | **FOUND** | **UNKNOWN** |
| ElevenLabs | **FOUND** (optional) | **UNKNOWN** |
| KIE | **FOUND** (secret name) | **UNKNOWN** |
| YouTube OAuth | **FOUND** (secret names) | **UNKNOWN** |
| Firebase / FCM / OAuth | **FOUND** | **UNKNOWN** as transferred; **INFERRED** in use |
| GCS | **FOUND** | **INFERRED** (`TTS_USE_GCS=true`) |
| Cloudflare | **FOUND** | **INFERRED** live edge |
| RevenueCat | **FOUND** | **INFERRED** (prior cash query) |
| Email digest / support@ | **FOUND** as addresses | Mailbox **UNKNOWN** |
| Slack / Telegram | **FOUND** as optional env | **UNKNOWN** |
| Sentry | **FOUND** as code + empty DSN example | **UNKNOWN** |
| Open-Meteo | **FOUND** | **INFERRED** client calls when generate used |
| Maps other than browser geolocation + Open-Meteo | **NOT FOUND** as a billed Maps key this pass | — |
| Twilio / SMS | **NOT FOUND** in env examples | **UNKNOWN** if only in Coolify |
| Razorpay | **FOUND** in code | **SELLER-STATED** not used |
