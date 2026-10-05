# SECURITY RECERT 24 SEP 2026

**Not a penetration test. Not PASS.**

| Check | Result | Evidence |
|-------|--------|----------|
| Debug routes in production | **PARTIAL / good** | `/debug/learning` redirected to `/dashboard` (`import.meta.env.PROD` gates in AppCore) |
| Admin routes | **PARTIAL / fail for demo** | `/admin/growth` rendered Growth OS for `demo@amynest.in`. API uses `ADMIN_USER_IDS` / `ADMIN_GROWTH_EMAILS`. Demo is cited in UI copy as an example allowlist. |
| Test credentials | **PARTIAL** | Live demo session existed in auditor browser — treat demo as a privileged QA identity |
| Secrets in git | **NOT RE-SCANNED** full history | Env examples only in current tree |
| Premium bypass | **NOT TESTED** | |
| GCS / signed URLs / CORS / DB | **NOT TESTED** | |
| Privacy/terms identity | Softened in **repo** only | Not live |

**Do not claim PASS.**
