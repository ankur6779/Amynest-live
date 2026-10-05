# DRAWING SHEET 02 — FIGURE 2

**STATUS:** FINAL TECHNICAL DRAWING DRAFT — FORMAL SHEET VERIFICATION REQUIRED  
**Application:** 202611059355  
**PDF:** `AMYNEST_FIGURE_2_FINAL.pdf`  
**SVG:** `AMYNEST_FIGURE_2_FINAL.svg`

Do not invent elements beyond the complete specification / provisional Figure 2 subject-matter.

---

## FIGURE NUMBER

FIG. 2

## FIGURE TITLE

Environmental synchronisation protocol.

## PURPOSE

Flow diagram from a generation trigger through shared detection, classification, late-result reconciliation, and payload injection (complete-specification brief description of Figure 2; §§6.4–6.5).

## ELEMENT LEGEND / REFERENCE NUMBERS

| Ref. | Element (as disclosed) |
|------|------------------------|
| 211 | Synchronously readable data structure (preference test / re-read) |
| 212 | Deferred component-state data structure (preference state; injection is independent of its commit) |
| 220 | Registry of pending asynchronous operations (share in-flight detection) |
| — | Steps 1–8 as numbered on the draft sheet correspond to the protocol of §6.4 (trigger; already-authoritative test; registry share; geo + meteorological query; outdoor-suitability mapping; re-read and discard; inject independently of deferred UI commit; dispatch to generation / Figure 3) |

Dependent protocol limbs disclosed in §6.4 (pending-action closure; silent fail) are **not** drawn as additional boxes. They remain description/claim dependents (Claims 2, 3). No new boxes invented.

Meteorological parameters on the sheet: weather-condition code, temperature, precipitation, wind — as in Claim 1(d) / §6.4.

## DRAWING CONTENT DESCRIPTION

Top-to-bottom flow: generation trigger → already-authoritative test (211 / 212) → registry (220) share-or-start → geolocation and meteorological query → outdoor-suitability classification → re-read 211 and discard if user became authoritative → inject designated class independently of deferred UI commit → dispatch payload to generation (Fig. 3).

No AQI box. No UAE clock. No latency box. No hardware sensor box.

## DESCRIPTION SUPPORT

§§5, 6.4, 6.5. Filed provisional Figure 2 corresponding subject-matter.

## CLAIM REFERENCES

Claims 1, 2, 3, 7, 8, 9 (and 17 as dual-structure method). Independent Claim 1 does **not** require pending-action, permission-gated I/O, or latency.

## PRIORITY STATUS

Category A protocol. Later §6.16 environmental features are not drawn.

## FORMAL DRAWING NOTES

- Banner: FINAL TECHNICAL DRAWING DRAFT — FORMAL SHEET VERIFICATION REQUIRED.
- Schedule II: **[TO BE VERIFIED BEFORE FILING]**.
