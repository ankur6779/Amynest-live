# Birth Sky WAIVER_REGISTER

**App Build:** birth_sky_rc3/1.0.0  
**Authority:** Pack 8 §1.1–1.2 (pass or explicit written waiver)

| ID | Item | Status | Risk | Owner | Expires |
| --- | --- | --- | --- | --- | --- |
| W-A11Y-PHYS | Physical VoiceOver / TalkBack / Switch / Dynamic Type labs | WAIVED | Critical path SR may fail on real devices | Accessibility / Release Manager | Before 100% rollout |
| W-OPS-DASH | Pack 11 ops dashboards / O1–O2 alerts | WAIVED | MTTD/MTTR degraded for Birth Sky-specific incidents | SRE / Release Manager | Before GA or accept permanent core-only waiver |
| W-STAGING-LIVE | Staging live auth + API E2E on cert host | WAIVED | Integration gaps only caught in unit/integration | QA / SRE | Before public canary |
| W-AND-SIGNED | Android signed assembleRelease on cert host | WAIVED | Play Store binary not validated this train | Platform | Before Play Store canary |
| W-PERF-DEVICE | Mid-tier cold/warm device p95 timings | WAIVED | May exceed Pack 8 budgets on low-end devices | Perf / Release Manager | Before 100% rollout |

## Part 9 sign-off status

| Role | Status | Signature | Date |
| --- | --- | --- | --- |
| Architecture | PENDING | — | — |
| Engineering | PENDING | — | — |
| QA | PENDING | — | — |
| Accessibility | PENDING | — | — |
| Security | PENDING | — | — |
| Privacy | PENDING | — | — |
| Platform | PENDING | — | — |
| SRE | PENDING | — | — |
| Release Manager | PENDING | — | — |


**Release Manager final signature:** PENDING  
**Release decision box:** HOLD (see GO_NO_GO.md)
