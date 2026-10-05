# SOURCE TITLE EVIDENCE MATRIX

**Date:** 25 September 2026  
Legal title proven? **NO** unless documentary title exists. None does.

| Asset / Component | First-party? | Evidence | Legal title proven? | Assignment needed? | Counsel review |
|---|---|---|---|---|---|
| `artifacts/kidschedule` product source | YES (code origin) | Git tree | NO | TO BE CONFIRMED | YES |
| `artifacts/api-server` | YES | Git tree | NO | TO BE CONFIRMED | YES |
| `android/` wrapper | YES + THIRD-PARTY SDKs | Gradle + Kotlin | NO | TO BE CONFIRMED (first-party only) | YES |
| Capacitor iOS shell | YES + THIRD-PARTY | Xcode tree | NO | TO BE CONFIRMED | YES |
| `lib/` (non-generated) | YES | Git tree | NO | TO BE CONFIRMED | YES |
| OpenAPI generated clients | GENERATED | `**/generated/**` | NO | TO BE CONFIRMED | YES |
| `content-engine/` code | YES | Git tree | NO | TO BE CONFIRMED | YES |
| `scripts/` `infra/` | YES | Git tree | NO | TO BE CONFIRMED | YES |
| npm / Android / iOS SDKs | NO | lockfile / Gradle | NO (not seller-owned) | NO (license, not assign) | YES (obligations) |
| `public/` / `attached_assets/` media | UNKNOWN | Files exist | NO | UNKNOWN | YES |
| GCS objects | UNKNOWN | Bucket name only | NO | UNKNOWN | YES |
| Patent 202611059355 | N/A (not source) | `patent/` | N/A — personal holder | Separate INCLUDE assignment | Separate stream |
| Replit scaffold / MIT field | UNKNOWN residual | Commit `90c25805c` | NO | TO BE CONFIRMED | YES |
| Cursor/Replit agent commits | UNKNOWN | shortlog | NO | TO BE CONFIRMED | YES |

Allowed values used: YES / NO / UNKNOWN / TO BE CONFIRMED / N/A. No “likely” promoted to YES.
