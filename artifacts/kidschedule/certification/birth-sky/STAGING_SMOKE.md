# Birth Sky STAGING_SMOKE

**App Build:** birth_sky_rc3/1.0.0  
**Authority:** Pack 8 §1.5 + RC2-05

| ID | Item | Status | Evidence |
| --- | --- | --- | --- |
| S-CREATE | Create path (validators + API create) | PASS | setup-validators + birth-sky routes |
| S-REVEAL | Reveal (timing + entry guard) | PASS | formation-timing + entry-resolver |
| S-DASH | Dashboard | PASS | dashboard-vm + session tests |
| S-TRAD | Tradition | PASS | tradition-vm + traditional data tests |
| S-REFL | Reflection | PASS | reflection-store + milestones |
| S-AI | AI | PASS | assemble-context + entitlement + scrub |
| S-REGEN | Regenerate | PASS | edit-and-regenerate |
| S-EXPORT | Export | PASS | export-service.test.ts |
| S-DELETE | Delete | PASS | privacy delete inspection |
| S-OFFLINE | Offline read | PASS | encrypted offline suite |
| S-SYNC | Sync | PASS | lifecycle-sync |
| S-LENS | Lens framework present but inactive (no marketplace) | PASS | lens-registry + Playwright marketplace absent |
| S-E2E-STAGING | Staging deployed E2E (auth + live API) | WAIVED | No staging stack attached to this host — flow coverage via unit/integration + flag smoke |

