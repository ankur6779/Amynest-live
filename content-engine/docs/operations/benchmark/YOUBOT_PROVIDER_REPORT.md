# YOUBOT_PROVIDER_REPORT

**Date:** 2026-07-30  
**Mode:** Isolated benchmark only — production providers/defaults **not** modified  
**Harness:** `content-engine/operations/benchmark/provider-cost-benchmark.mjs`  
**Artifacts:** `.amynest-assets/provider-benchmark/youbot/` (blocked — no generations)

---

## Account / balance (real API)

| Checkpoint | Credits |
|------------|--------:|
| Balance at run | **50** (`GET https://you.bot/api/v1/credits`) |
| After run | N/A — no generation attempted |
| **Consumed (metered)** | **0** |

you.bot docs: **1 credit = $0.01 USD**; create responses return `creditsCharged` when a task is accepted.

---

## Phase 2 execution result

| Item | Result |
|------|--------|
| Planned AmyNest Short | 5 shots / 21s Veo Fast i2v |
| Minimum credits for 1× Veo Fast (list band) | **~58–63** per call |
| Account balance | **50** |
| **Blocked reason** | `Insufficient credits for even 1 Veo Fast shot (balance=50, need~58)` |
| Shots generated | **0** |
| Retries | **0** |
| Failures | **0** (preflight block — no API generate call) |
| Master mux | **Not run** |
| Actual billed amount | **$0.00** this run |

No marketing price used as “billed.” No generation invoice exists because no task was created.

---

## What would be required to complete the you.bot Short

| Need | Approx |
|------|--------|
| Top-up for 1 test shot | ≥ **~60 credits** (~**$0.60**) |
| Top-up for full 5-shot Short | ≥ **~300–320 credits** (~**$3.00–$3.20**) if each Fast call ~58–63 credits |
| Identity assets | Same AmyNest keyframes (already prepared) |
| API path | `POST /api/v1/files/upload` → `POST /api/v1/generate` (`modelId: veo-3-1-fast`) → poll `GET /api/v1/task/{id}` |

Harness already implements this path; re-run after top-up:

```bash
cd content-engine
PROVIDER=youbot node ./operations/benchmark/provider-cost-benchmark.mjs
```

---

## Quality review

**Not available** — no video generated.

Cannot score character consistency, motion, camera, artifacts, voice, music, subtitles, or prompt adherence for you.bot until credits are funded.

---

## Integration notes (for later)

| Topic | Assessment |
|-------|------------|
| API shape | Clean unified generate + poll; returns **`creditsCharged`** (good for real billing logs) |
| Auth | Bearer `YOUBOT_API_KEY` (already in `.env.development`) |
| Production adapter | **Not present** — would be new isolated provider later if selected |
| Stability | Unknown for AmyNest (no successful call yet) |

---

## Status

**BLOCKED — insufficient credits.**  
Key is saved; harness is ready; no quality or metered cost data until top-up.
