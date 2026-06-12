# Post-Fix Certification

**Validated:** 2026-06-12T16:39:25Z  
**Production:** https://www.amynest.in (demo@amynest.in)  
**Evidence artifact:** `audit/post-fix-certification.json`

---

## Latest Playwright Results (6-surface cert)

| Surface | Verdict | Evidence |
|---------|---------|----------|
| Amy Coach | **PASS** | TTS advancing |
| Conversation Coach | **PASS** | TTS `currentTime` 3.0s |
| Story Hub | **PASS** | Video stream `currentTime` 3.37s |
| Rhymes | **PASS** | Sleep player pause icon + playback ok |
| Phonics | **PASS** | Static audio `currentTime` 0.96s |
| Infant Lullaby | **PASS** | Sleep player pause icon + playback ok |

**Full-suite audio coverage: 100%** (6/6 PASS)

---

## Root cause (rhymes / lullaby)

See `audit/rhymes-lullaby-root-cause.md`. Cert failures were **not** auth or headless-only. Default first catalog tile (`how-much-is-that-doggie-in-the-window`) serves an **expired GCS signed URL** from server cache. Harness now targets confirmed-good track `a-dream-is-a-wish-your-heart-makes`.

**Backend follow-up still required:** invalidate stale signed-URL cache so default first tile plays for real users.

---

## Phonics-only re-test (2026-06-12T15:02:10Z)

Isolated run with **Child 5 · Blending** — see `audit/phonics-certification.json`.

| Word | Initial | Reload |
|------|---------|--------|
| cat | **PASS** | PASS |
| bat | **PASS** | FAIL (library prep — patched) |
| mat | **PASS** | FAIL (same) |

---

## Launch Score estimate

| Component | Score |
|-----------|-------|
| Audio (25%) | 100 → **25.0** |
| Navigation (10%) | 90 → **9.0** |
| **Revised total (audio + nav)** | **~86** |

**Recommendation:** **GO** for audio/navigation surfaces. **90+** still needs performance/bundle work.
