# Birth Sky Compatibility Matrix

**App Build:** birth_sky_rc3/1.0.0  
**Authority:** Pack 8 Addendum A  
**Scope:** Core Birth Sky (no shipping extension lenses)

## Axes

| Axis | Value | Notes |
| --- | --- | --- |
| App Build | birth_sky_rc3/1.0.0 | Certification train label |
| engineVersion (compute writes) | skyfield-jpl/1.0.0 | New writes use skyfield-jpl/1.0.0. Legacy amynest-astro-lite snapshots remain readable without auto-regen. |
| engineVersion (readable min) | amynest-astro-lite/1.0.0 | Older snapshots hydrate without auto-regen |
| traditionalContentVersion | tradition_pack/1.0.0 | Content bump does not require sky snapshot regeneration (Pack 5 Addendum A). |
| contextSchemaVersion (write) | birth_sky_context/1.0.0 | Supported: birth_sky_context/1.0.0 |
| exportManifestVersion (write) | birth_sky_export/1.0.0 | Supported: birth_sky_export/1.0.0; unknown → fail safe |
| privacyPolicyVersion (required) | birth_sky_privacy/1.0.0 | Behind version → re-consent |
| consentVersion | birth_sky_consent_v1 | Pack 2 consent |
| lens SDK version | birth_sky_lens_sdk/1.0.0 | Pack 10 peer |
| offlineBundleSchema | 2 | Client current-snapshot bundle |
| modelVersion | per_delivery_on_conversation_messages | Recorded per AI delivery — not module-global |
| primary lens | birth_sky@1.0.0 | Registry required |

## Backward compatibility rules

- Older `engineVersion` snapshots remain readable (Pack 4 Addendum A).
- Unsupported `exportManifestVersion` / `contextSchemaVersion` fail safe (no corrupt import; no free-insight consume).
- Regeneration creates a **new** snapshotVersion; history preserved.
- Conversations/reflections retained across regen (Pack 7).
- Lens SDK peer mismatch → lens unavailable; core Birth Sky unaffected.

## ADR linkage

Breaking matrix changes require `ADR-BS-NNN` (Pack 8 Addendum A). This release: **none**.
