# AmyNest V2 — Development Workflow Lock

**Status:** Binding before Sprint 1  
**Production:** LIVE — stability is highest priority  
**Mode:** Renovation (not rewrite)

---

## Confirmation

All AmyNest V2 engineering follows this workflow.  
Sprint implementation proceeds only on the dedicated V2 branch, behind flags defaulting OFF, with the treasury preserved.

---

## Branch

| Rule | Value |
|------|--------|
| Active V2 branch | `feature/amynest-v2-redesign` |
| Forbidden for V2 work | `main`, `master`, `production` |
| Merge to main | Only after Sprint 0–4 + Internal QA + Dogfood + Alpha + Founder approval |

---

## Sprint cadence

```
Sprint 0 → Review
Sprint 1 → Review
Sprint 2 → Review
Sprint 3 → Review
Sprint 4 → QA → Alpha → Founder approval → Merge
```

Never jump ahead. Never mix Sprint tickets across sprints.

---

## Production safety

Until intentionally enabled for a cohort:

- Existing production routes stay mounted and functional  
- Premium users, subscriptions, analytics, onboarding, AppCore behavior unchanged when all V2 flags are OFF  
- New experiences ship only behind feature flags (`VITE_V2_FF_*`, defaults false; cohort `0`)  

---

## Preservation (Rule Zero)

Default: **PRESERVE**.  
See `docs/v2/PRESERVATION_REPORT.md` and `docs/v2/MIGRATION.md`.  
Deletion requires the six-question written gate. Hidden / archived / migrate beat delete.

---

## Constitutions frozen

Do not redesign Product, UX, Navigation, Visuals, Engineering, AI, Migration, or MVP Scope.  
Implement only what Phases 1–12 locked.

---

## Commit policy

| Allowed | Forbidden |
|---------|-----------|
| Commits on `feature/amynest-v2-redesign` | Merging V2 into `main` before gates |
| Docs + Sprint slices on V2 branch | Production releases of V2 |
| Flag-off-by-default code | Shipping with V2 flags on in prod config |

---

## Before every implementation

1. Constitution compliance  
2. Production unaffected with flags OFF  
3. Feature flags default OFF  
4. No AppCore regression (unless that Sprint’s ticket explicitly gates it)  
5. No hidden route breaks  

If uncertain → **STOP** and ask.

---

## Related docs

- `docs/v2/PRESERVATION_REPORT.md`  
- `docs/v2/MIGRATION.md`  
- Phase 11 Implementation Blueprint / Phase 12 Execution Pack (planning thread)
