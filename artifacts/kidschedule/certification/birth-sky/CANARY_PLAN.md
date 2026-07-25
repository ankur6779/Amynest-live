# Birth Sky CANARY_PLAN

**App Build:** birth_sky_rc3/1.0.0  
**Authority:** Pack 8 §6 / Roadmap Part 7

## Flags

| Flag | Default | Canary action |
| --- | --- | --- |
| `VITE_FF_BIRTH_SKY` | off | On for allowlist / % cohort only |
| `VITE_FF_BIRTH_SKY_HUB_TILE` | follows master | On with master |
| `VITE_FF_BIRTH_SKY_DEEP_LINKS` | follows master | On with master after smoke |

## Phases

1. **Internal allowlist** — eng/QA accounts; flag on; watch kill-switch drill.
2. **Canary 0.5–5%** — only after staging live E2E + public canary GO (Part 9 already SIGNED).
3. **Regional / platform raise** — iOS Capacitor, Android WebView, Web separately if needed.
4. **100%** — after physical a11y waiver closed or lab PASS; perf device lab or waiver.

## Entry criteria (public canary)

- [ ] GO_NO_GO publicCanary = GO
- [x] Part 9 Release Manager signed (Ankur Raman, 2026-07-25)
- [x] DEPLOYMENT_PREREQUISITES canary rows SET on Coolify target
- [ ] Staging live auth + API E2E signed
- [ ] Kill switch re-verified in staging

## Exit / abort

- Sev-1/Sev-2 → execute ROLLBACK_CHECKLIST.md within minutes
- Flag off; hub tile gone; deep links safe

## Recommendation (post Part 9 + migration)

- **Internal allowlist:** **GO** (see GO_NO_GO.md)
- **Public % canary:** **NO-GO** until W-STAGING-LIVE closed
- **Production GA:** **NO-GO**
