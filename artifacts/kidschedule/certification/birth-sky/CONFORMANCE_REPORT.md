# Birth Sky Conformance Report

**App Build:** birth_sky_rc3/1.0.0  
**Generated:** 2026-07-31T17:10:00.599Z  
**Scope:** core_only  
**Verdict:** ENGINEERING CERT PASS — awaiting human Part 9 sign-off and staging drills before canary.

## Summary

| Total | PASS | FAIL | WAIVED | N/A | Unknown |
| --- | --- | --- | --- | --- | --- |
| 64 | 52 | 0 | 8 | 4 | 0 |

## Open blockers

- None

## Checklist results

| ID | Part | Status | Check | Evidence |
| --- | --- | --- | --- | --- |
| A1 | architecture | PASS | Module behind Foundation bootstrap; ephemeris not in main bundle | registerBirthSkyFoundation + EphemerisPort adapter; vitest feature-flags/entry-resolver; lazy Birth Sky route |
| A2 | architecture | PASS | Domain layer has no React/Firebase/Capacitor imports | certification/domain-purity.test.ts scans domain/ |
| A3 | architecture | PASS | birth_sky registered; extensions via Registry only | foundation/lens-registry + platform registry; lens-registry.test.ts |
| A4 | architecture | PASS | Formation/Reveal not deep-linkable | entry-resolver.test.ts ceremony guards |
| A5 | architecture | PASS | Server authoritative for profile/snapshot/quota | api-server birth-sky routes + AI entitlement tests |
| A6 | architecture | PASS | Snapshot fields snapshotVersion/engineVersion/computedAt present | SkySnapshot type + sky-snapshot-compat.test.ts (computedAt maps generatedAt) |
| A7 | architecture | PASS | Engine bump without regen keeps snapshot readable | hydrateSkySnapshot tolerates any engineVersion string; upgrade suite |
| A8 | architecture | PASS | Regen wins; stale refresh discarded | edit-and-regenerate + bindSnapshotVersion clears map selection; dashboard-session tests |
| A9 | architecture | PASS | No global onboarding capture of birth time/place | Birth details only under /birth-sky/setup/*; no App onboarding fields |
| A10 | architecture | PASS | Platform Spec used as index; packs not rewritten | IM-0…IM-7 implement against frozen packs; no pack markdown edits in repo |
| U1 | ux | PASS | Optional module; setup only after open | Welcome → setup flow in birth-sky-app; hub tile optional |
| U2 | ux | WAIVED | Hub tile Parent Support; Birth Sky naming | Requires hub screenshot sign-off on target build |
| U3 | ux | PASS | Welcome states what this is/isn’t | welcome-page copy; welcome_viewed analytics |
| U4 | ux | PASS | Formation timing contracts | FORMATION_MIN=3200 SOFT/HARD + formation-timing tests |
| U5 | ux | PASS | Reveal: essence; CTA 2.0s; no AI/paywall | REVEAL_CTA_ENABLE_MS=2000; reveal-page |
| U6 | ux | PASS | transition_completed readiness order | transition-readiness.test.ts |
| U7 | ux | PASS | Segment order Sky · Astronomy · Tradition · Reflect | segment-nav + dashboard-session tests |
| U8 | ux | PASS | Day Sky affirming banner; rising locked | day-sky-banner + astronomy/tradition VMs |
| U9 | ux | PASS | Reduced motion path | prefers-reduced-motion checks in dashboard/settings; formation reduced path |
| U10 | ux | PASS | Horizon Seal continuity | birth-sky-seal-host continuous seal slots |
| U11 | ux | PASS | Browse free; no browse paywall | Paywall only via useBirthSkyAi / Ask Amy path |
| U12 | ux | WAIVED | Accessibility Pack 8 bar | ACCESSIBILITY_REPORT.md + a11y static suite; VO/TalkBack device lab pending |
| U13 | ux | PASS | Parent-only; no child destiny UI | Module under parenting hub; parentOnly capability on birth_sky lens |
| AI1 | ai | PASS | Sky generation never gated by premium | createBirthSky API has no premium check |
| AI2 | ai | PASS | First successful delivery consumes free once | api-server AI entitlement + deliveries |
| AI3 | ai | PASS | No consume on fail/cancel/moderation | entitlement service + AI route fault paths |
| AI4 | ai | PASS | deliveryId exactly-once | AI entitlement / ack path tests |
| AI5 | ai | PASS | Second AI → existing Premium paywall (no new SKU) | openPaywall('premium_insight') existing flow |
| AI6 | ai | PASS | Pending intent survives backgrounding | pending-ai-intent-store.test.ts |
| AI7 | ai | PASS | Pending cleared on resume/TTL/exit/dismiss | pending-ai-intent-store clear causes + module exit |
| AI8 | ai | PASS | Paywall Not now keeps pending | use-birth-sky-ai paywall dismiss path |
| AI9 | ai | WAIVED | Purchase success resumes conversation | Code path present; full IAP E2E requires staging RevenueCat |
| AI10 | ai | PASS | Module entry refreshes entitlement | useSubscription + AI orchestrator isPremiumClient |
| AI11 | ai | PASS | Safety fallback; no consume; tradition labeled | ai-safety / ai-context tests |
| AI12 | ai | PASS | modelVersion / contextSchemaVersion / chunkSequence | contextSchema=birth_sky_context/1.0.0; chunk-buffer.test.ts |
| AI13 | ai | PASS | Analytics: no prompt/response text | analytics-scrub.test.ts forbidden keys |
| P1 | privacy | PASS | Birth time/place encrypted at rest; no plaintext localStorage bundle | RC1: client AES-GCM offline envelope + server AES-GCM field seal (birth-field-crypto); lazy idempotent plaintext→encrypted migration; privacy-security + offline-migration + birth-field-crypto suites |
| P2 | privacy | PASS | Consent recorded; Create blocked without accept | consent-page + review create gate |
| P3 | privacy | PASS | privacyPolicyVersion persisted; re-consent when behind | required=birth_sky_privacy/1.0.0; privacy-accept API + settings UI |
| P4 | privacy | PASS | Delete Birth Sky cascade purge | DELETE lifecycle route + client clearReflectionStore/clearOfflineBundle |
| P5 | privacy | PASS | Export auth; exportManifestVersion; no precise geo default | exportManifest=birth_sky_export/1.0.0; export-service.test.ts |
| P6 | privacy | PASS | Analytics scrub bans | analytics-scrub.test.ts |
| P7 | privacy | PASS | Parent-only; no ad targeting from birth data | No ad SDK hooks in birth-sky feature; parent module only |
| L1 | lens | PASS | Registry + capability gating | lens-platform.test.ts undeclared contribution blocked |
| L2 | lens | PASS | SDK peer validation fail-closed | sdk=birth_sky_lens_sdk/1.0.0; validateLensManifest |
| L3 | lens | PASS | No cross-lens private store reads | Platform exposes no cross-lens store API; isolation tests |
| L4 | lens | PASS | Extensions do not alter four-tab order | No extension UI shipped; segment-nav frozen; playwright im6 |
| L5 | lens | PASS | Lazy lens load; idle cost | activateLens lazy load test; no extension chunks in Birth Sky cold path |
| L6 | lens | PASS | Disable/retire via flag/state | setLensState/disableLens; master kill disables module |
| L7 | lens | NOT_APPLICABLE | Delete cascades lens partitions | No extension lens data partitions shipping (core-only) |
| O1 | operations | WAIVED | Metrics/dashboards live | Pack 11 ops dashboards not in IM-7 engineering scope |
| O2 | operations | WAIVED | Alerts armed | No Birth Sky–specific alert config in this repo cert package |
| O3 | operations | PASS | Kill switch verified | feature-flags.test.ts + playwright flag-off smoke im0–im6 |
| O4 | operations | NOT_APPLICABLE | Per-lens flag kill | No shipping extension lens |
| O5 | operations | WAIVED | Rollback plan rehearsed | ROLLBACK documented in RELEASE_CHECKLIST; staging drill pending |
| O6 | operations | NOT_APPLICABLE | Runtime health states | Pack 11 health probes not claimed for core-only IM-7 |
| O7 | operations | NOT_APPLICABLE | ORS per shipping lens | No extension lens; ORS N/A core-only (Pack Conformance L note) |
| O8 | operations | WAIVED | MTTD/MTTR measurement path | KPI targets documented in Pack 8 Addendum A; measurement path not wired in-repo |
| R1 | release | PASS | Compatibility Matrix published | COMPATIBILITY_MATRIX.md + version-registry.ts |
| R2 | release | PASS | Version Registry updated | getVersionRegistrySnapshot(); engine=skyfield-jpl/1.0.0 |
| R3 | release | PASS | ADRs cited | RELEASE_NOTES_DRAFT.md — ADRs: none (implementation within freezes) |
| R4 | release | WAIVED | Pack 8 gates / smoke 1.5 | Unit/Playwright smoke present; full Pack 8 §1.5 device matrix pending |
| R5 | release | PASS | Flag rollout plan documented | RELEASE_CHECKLIST.md canary→% plan (Pack 8 §6 / Roadmap Part 7) |
| R6 | release | PASS | Platform Spec conformance via checklist | This CONFORMANCE_REPORT completes checklist evaluation for core scope |

## Part 9 sign-off

Human signatures required before Ship (Architecture, Eng, QA, A11y, Security, Privacy, Platform, SRE, Release Manager).
