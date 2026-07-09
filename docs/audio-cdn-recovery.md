# AmyNest AI — Cloudflare Static Audio Production Recovery

**Date:** 2026-07-09  
**Role:** Release Engineering Lead  
**Scope:** CDN poison only (no playback redesign)

---

## Verdict

# NO-GO

CDN still serves 256-byte placeholders on **26/27** P0 curriculum URLs.  
Origin is healthy. Worker guards are deployed. **Cloudflare URL purge is still required** (blocked: wrangler OAuth lacks Cache Purge; Dashboard not logged in).

---

## 1. Root cause confirmation

| Layer | Status | Evidence |
|-------|--------|----------|
| GCS | OK | Auth download: `fox` 5760B, `hello` 19200B |
| Origin (Render) | OK | Cache-bust `?cb=` → real MP3, `X-AmyNest-Static-Source: asset` |
| Worker Cache API | Mitigated | Deployed: reject/delete poison; do not `put` placeholders |
| Cloudflare CDN | **POISONED** | Canonical URL: `cf-cache-status: HIT`, `age` ~8492s, 256B, `immutable` |
| Client / pack | OK | Not in scope of this failure |

**Mechanism:** First request after upload returned a 256B placeholder with **1-year immutable** headers. Cloudflare CDN cached that response under the real hash URL. Subsequent requests never reach origin/Worker (`cf-cache-status: HIT` + `x-amynest-edge-cache: MISS`).

**Proof origin is fine:**  
`GET …/1e1845f1….mp3?cb=…` → 5760B asset MISS  
`GET …/1e1845f1….mp3` → 256B placeholder HIT

---

## 2. Files modified

| File | Change |
|------|--------|
| `infra/cloudflare/amynest-api-proxy/src/worker.js` | Do not store placeholders / `no-store` in Cache API; delete poison on read; force `no-store` CDN headers on placeholder responses |
| `infra/cloudflare/amynest-api-proxy/src/worker.test.mjs` | Guards for placeholder / no-store |
| `artifacts/api-server/src/services/staticAudioServe.ts` | Placeholders → `no-store` + distinct ETag (prior sprint; **not yet on Render**) |
| Library routes (`phonics-library`, `spelling-library`, `animal-world`, `worlds`, `phonics`) | Pass `staticSource: "placeholder"` |
| `scripts/purge-static-audio-cloudflare.mjs` | CF purge helper |
| `scripts/validate-static-audio-cdn.mjs` | Post-purge gate |
| `scripts/data/p0-cloudflare-purge-urls.txt` | 27 URLs |
| `scripts/package.json` | `purge-static-audio-cdn` / `validate-static-audio-cdn` scripts |

---

## 3. Deployment changes

| Target | Status |
|--------|--------|
| Cloudflare Worker `amynest-api-proxy` | **DEPLOYED** `0ea9877c-bb25-4db4-b72e-2a57fbc5f10d` |
| Render API (`Amynest-backend-dykj`) placeholder `no-store` | **NOT DEPLOYED** — local only; needed to prevent re-poison after purge |
| Cloudflare CDN purge of 27 URLs | **NOT DONE** — API 401 with wrangler OAuth; Dashboard requires interactive login |

### Required ops (do now)

1. **Create a Cloudflare API token** with permission `Zone → Cache Purge` for zone `amynest.in`  
   (or use Dashboard → Caching → Configuration → Purge Cache → Custom Purge)

2. Purge all URLs in `scripts/data/p0-cloudflare-purge-urls.txt`:

```bash
export CLOUDFLARE_ZONE_ID=22df688650348e0d0cff1ff1a358020d
export CLOUDFLARE_API_TOKEN=<token-with-cache-purge>
pnpm --filter @workspace/scripts run purge-static-audio-cdn
```

Dashboard: https://dash.cloudflare.com/362bb082e16cf42fbcd036e164f0fbc4/amynest.in/caching/configuration  
Paste the 27 URLs from the purge list (Custom URLs).

3. Validate:

```bash
pnpm --filter @workspace/scripts run validate-static-audio-cdn
```

Expect: **27/27 PASS**, `canonical_vs_bust: MATCH`, `src=asset`, bytes > 2000.

4. **Deploy API** with `staticAudioServe` placeholder `no-store` fix to Render so a future miss cannot re-cache poison.

---

## 4. CDN validation (live, post-Worker deploy, pre-purge)

| Metric | Result |
|--------|--------|
| P0 URLs probed | 27 |
| PASS (real MP3) | **1** (`4d983e75…` — likely cold miss after Worker) |
| FAIL (256B placeholder HIT) | **26** |
| `try again` (control) | PASS (asset) |
| Origin cache-bust | PASS |

---

## 5. Device QA summary

**Not executed** — blocked until CDN returns real MP3s on canonical URLs.

Checklist remains: `docs/audio-device-qa-checklist.md`

---

## 6. Remaining risks / blockers

1. **Purge 27 Cloudflare CDN URLs** (hard blocker — CDN HIT bypasses Worker).  
2. **Deploy API** placeholder `no-store` to Render (prevents re-poison).  
3. Re-run `validate-static-audio-cdn` → 27/27 PASS.  
4. Device QA matrix + `latencySummary()` + educational TTS = 0%.  

Until (1)–(3) are green, public release remains **NO-GO**.

---

## 7. Final decision

# NO-GO

Worker mitigations are live and correct for *future* misses.  
**Existing immutable CDN poison is not cleared without an explicit purge.**
