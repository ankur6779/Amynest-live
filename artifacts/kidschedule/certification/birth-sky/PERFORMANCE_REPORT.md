# Birth Sky Performance Report

**Authority:** Pack 8 Part 3  
**App Build:** birth_sky_rc3/1.0.0

| Metric | Budget (ms) | Measured (ms) | Status | Evidence |
| --- | --- | --- | --- | --- |
| Cold module open → Welcome interactive | 2500 | — | WAIVED | Mid-tier device lab; contractual path covered by entry-resolver |
| Cold open existing profile → Dashboard (cache hit) | 3000 | — | WAIVED | Mid-tier device lab pending physical timing |
| Warm segment switch | 300 | — | WAIVED | Mid-tier device lab pending |
| Formation ceremony min / hard fail | 3200 | 3200 | PASS | FORMATION_* constants == PERFORMANCE_BUDGETS |
| Reveal CTA enable | 2000 | 2000 | PASS | REVEAL_CTA_ENABLE_MS aligned |
| AI conversation open / streaming | — | — | WAIVED | Chunk batching implemented; p95 lab pending |
| Regeneration duration | — | — | WAIVED | regeneration_duration_bucket analytics; lab pending |
| Export duration | — | — | WAIVED | Client JSON download path; lab pending |
| Offline Dashboard cache hit (decrypt+load) | 1500 | — | WAIVED | RC2 vitest timed loadOfflineBundle after encrypt |
| Snapshot hydrate (legacy engineVersion) | 100 | — | WAIVED | RC2 vitest timed hydrateSkySnapshot |

## Notes

- Contractual Formation/Reveal timers: **PASS**.
- Offline decrypt/load + hydrate measured in RC2 vitest when available.
- Mid-tier cold/warm device timings remain **WAIVED** pending physical lab.
