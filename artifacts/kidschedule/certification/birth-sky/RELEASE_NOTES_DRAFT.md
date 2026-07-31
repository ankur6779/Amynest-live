# Birth Sky RELEASE_NOTES_DRAFT

**App Build:** birth_sky_rc3/1.0.0  
**ADRs:** none (implementation within Phases 1–3 / Packs 1–12 freezes)

## What’s included (engineering)

- Birth Sky core journey: Welcome → Setup → Formation → Reveal → Dashboard (Sky · Astronomy · Tradition · Reflect)
- AI Ask Amy with Pack 2 entitlement (one free insight; existing Premium paywall)
- Lifecycle: Settings, edit/regen, export, delete, offline read, sync
- Lens Platform (Registry/SDK/runtime) — framework only; no marketplace

## Compatibility

- Engine compute: `skyfield-jpl/1.0.0`
- Context schema: `birth_sky_context/1.0.0`
- Export manifest: `birth_sky_export/1.0.0`
- Privacy policy: `birth_sky_privacy/1.0.0`
- Lens SDK: `birth_sky_lens_sdk/1.0.0`

See COMPATIBILITY_MATRIX.md.

## Remaining before production ship

- Part 9 human sign-offs (WAIVED in engineering checklist until owners sign)
- Device a11y/perf labs + Pack 8 §1.5 smoke (WAIVED pending lab)
- Ops dashboards/alerts (Pack 11) — Release Manager waiver for core-only
- Set BIRTH_SKY_FIELD_ENCRYPTION_KEY in production before canary

## Non-goals / not in this release

- Marketplace / remote plugins
- New AI SKUs
- Deployment (IM-7 verifies readiness only)
