# CLAIM DEPENDENCY MAP

**Set:** frozen 22 claims. Independents: 1, 7, 10, 18, 20.

| Claim | Depends on | Limitation added | Circular / broken? |
|-------|------------|------------------|--------------------|
| 1 | — (independent) | Dual-structure preference; shared registry; geo; meteo; map to outdoor-suitability; late discard; inject independently of deferred UI commit | No |
| 2 | 1 | Non-blocking geo; silent fail → null; proceed with existing/default | No |
| 3 | 1 | Pending-action closure across confirmation dialogue | No |
| 4 | 1 | Suitable / limited / unsuitable mapping axes | No |
| 5 | 1 | Atomic helper for (sync + deferred) | No |
| 6 | 1 | Web-browser + native mobile; identical classification module | No |
| 7 | — (independent) | Method form of the Claim 1 protocol, steps (a)–(h) | No |
| 8 | 7 | Concurrent invocations share one detection | No |
| 9 | 7 | Inject without waiting for deferred commit | No |
| 10 | — (independent) | Age-band engine; date-seeded shuffle; hybrid rule path or GAI; correction on GAI output (wake-time + school-block) | No |
| 11 | 10 | Allergy, cuisine registry, cross-slot dish dedup | No |
| 12 | 10 | Energy-profile re-order when minimum sample count exists | No |
| 13 | 10 | Caregiver identity → instruction-note rewrite | No |
| 14 | 10 | Environmental substitution (unsuitable / limited / suitable) | No |
| 15 | 10 | Anti-repetition in prompt and post-process | No |
| 16 | 10 | Rule path: mandatory meal anchors + age-band template pools | No |
| 17 | 7 | Cooperative dual-structure: sync authoritative in async closure; deferred drives re-render | No |
| 18 | — (independent) | LM artefact in; temporal; school-block; allergy; cuisine; dedup; corrected artefact out | No |
| 19 | 18 | Environmental substitution after Claim 18 | No |
| 20 | — (independent) | Meal-slot anchoring; inventory + cuisine/diet/allergy; sanitise; constrained prompt; cross-slot dedup | No |
| 21 | 20 | Named regional cuisine set + region description in prompt | No |
| 22 | 20 | Jain **prompt** exclusions (meat/fish/eggs; roots; onion/garlic) | No |

## Checks

- No claim depends on a higher number except Claim 17 (depends on 7). Allowed; not circular.
- No claim depends on a missing number.
- No claim depends on itself.
- No independent Claim 24.
- Current Claim 12 is energy-profile re-order (not the dropped old Claim 12).
- Current Claim 18 is the LM-correction independent (not the dropped old Claim 18).
- Claim 1 does not recite pending-action, permission-gated I/O, or latency.
- Claim 22 is prompt constraint, not a deterministic Jain sanitizer.
