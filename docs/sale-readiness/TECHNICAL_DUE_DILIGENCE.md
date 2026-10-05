# TECHNICAL DUE DILIGENCE

**Date:** 24 September 2026  
**Node on auditor machine:** v26.0.0 (engines want `>=22.12.0 <23.0.0` — warning only).

| # | Area | Result | Evidence |
|---|------|--------|----------|
| 1 | Architecture | **PARTIAL** | Documented Coolify + CF + dual mobile; Render docs stale |
| 2 | Code quality | **PARTIAL** | Large real codebase; unused surface |
| 3 | Type safety | **PARTIAL** | `pnpm run typecheck:libs` **PASS** (24 Sep 2026). Full `pnpm run typecheck` historically fails (`AGENTS.md`) — **NOT RE-RUN** |
| 4 | Testing | **NOT VERIFIED** this pass | ~999 test files historically; vitest resolution failures known |
| 5 | E2E | **NOT VERIFIED** | Playwright not re-run |
| 6 | Production stability | **NOT VERIFIED** | No live health probe this pass |
| 7 | Deploy reproducibility | **PARTIAL** | Scripts exist; credentials missing |
| 8 | Database integrity | **NOT VERIFIED** | Schema in repo; prod not inspected |
| 9 | Migration safety | **PARTIAL** | Migrations exist; no restore drill |
| 10 | Observability | **PARTIAL** | Sentry optional; founder email alerts |
| 11 | Error handling | **PARTIAL** | Code present; not recertified |
| 12 | Security | **PARTIAL** | See security audit; no pen test |
| 13 | Secrets management | **PARTIAL** | Examples only in git; history not scanned |
| 14 | Dependency health | **NOT VERIFIED** | No `pnpm audit` this pass |
| 15 | Build reproducibility | **NOT VERIFIED** | Production build not re-run |
| 16 | CI/CD | **PARTIAL** | GitHub Actions present historically |
| 17 | Rollback | **PARTIAL** | Flags exist; drill UNVERIFIED |
| 18 | Documentation | **PARTIAL** | Handover added this pass |
| 19 | Scalability | **PARTIAL** | Worker/pool settings exist; unused at 3 paid |
| 20 | Maintainability | **PARTIAL** | High surface area; founder knowledge |

**PASS** = independently confirmed this pass.  
Do not treat the product as “technically certified for sale.”
