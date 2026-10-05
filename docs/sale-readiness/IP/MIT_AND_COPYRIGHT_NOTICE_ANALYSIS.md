# MIT AND COPYRIGHT NOTICE ANALYSIS

**Date:** 25 September 2026  
**Counsel-review oriented. Not a legal opinion.**  
**Do not** change `package.json`, add a LICENSE file, or edit footers.

## Verified facts (25 Sep)

| Fact | Result |
|------|--------|
| Root `package.json` `"license": "MIT"` | **Present** (`"name": "workspace"`, `"private": true`, no `author`) |
| `LICENSE` or `LICENSE.md` at repo root | **Absent** (`ls` 25 Sep: no such file) |
| `git log --diff-filter=A -- LICENSE LICENSE.md` | **Empty** (no add in history — `LICENSE_STATUS.md`) |
| Complete MIT license text in-repo | **Not present** as a LICENSE file |
| Footer “© 2026 AmyNest AI. All rights reserved.” | **Observed** — see below |
| Dependency licenses | **Separate** — `SECURITY/SBOM.md` / `SBOM-pnpm-licenses.txt` |

## What the MIT **field** actually is

An SPDX/npm metadata string on a **private** workspace package. It is how package managers label the root package. It is **not**, by itself:

- proof that Ankur Raman or AmyWorld owns the copyright;
- a complete MIT grant (the MIT license is a specific text; that text is **not** in the tree);
- a determination that the whole monorepo is open source;
- a determination that the product is proprietary.

A third party could still **argue** an implied public MIT grant from the field + public GitHub repo. Counsel must assess. This file does **not** resolve that argument.

## What the © footer is

A **product UI / marketing string**. It is **COPYRIGHT NOTICE OBSERVED**, not conclusive title.

| Location | String | Kind |
|----------|--------|------|
| `artifacts/kidschedule/src/i18n/en.json` (~1255) | `"copyright": "© 2026 AmyNest AI. All rights reserved."` | i18n / product UI |
| same file (~5924) | `"2026_amynest_ai_all_rights_reserved": "© 2026 AmyNest AI. All rights reserved."` | i18n |
| `artifacts/kidschedule/src/components/marketing/cinematic-landing/cinematic-landing-page.tsx` (~81) | `© {year} AmyNest AI. All rights reserved.` | Marketing page |

“AmyNest AI” is a **product** name. It is **not** a proven legal owner. It conflicts in **appearance** with the MIT field. Counsel decides legal effect.

## Third-party licenses

npm/Android/iOS SDKs have **their own** licenses. SBOM is a `pnpm licenses list`, not CycloneDX. Dual-license examples in SBOM: `jszip`, `node-forge`, `@img/sharp-libvips-*`. Buyer does not buy those copyrights; buyer takes license obligations.

**Do not add LICENSE or delete MIT without counsel.**
