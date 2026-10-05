# SOURCE TITLE EVIDENCE CHAIN

**Date:** 24 September 2026  
**Not a legal opinion. Git authorship ≠ title.**

| Asset | Origin | Author (git) | Current holder | License | Evidence | Transfer required? | Confidence |
|-------|--------|--------------|----------------|---------|----------|--------------------|------------|
| Root workspace / first commit | Replit Agent scaffold 8 Apr 2026 | agent@replit.com | GitHub `ankur6779/Amynest-live` | `"license": "MIT"` in package.json; **no LICENSE file ever** | `90c25805c` | Yes — assignment | HIGH that MIT is **scaffold metadata**; LOW that it was an intentional public grant |
| Application source (kidschedule, api-server, android, Capacitor iOS, lib/) | Written in this repo Apr–Sep 2026 | ankur6779 / Ankur / Cursor Agent / APPLE-local | Same remote | Unclear vs MIT field + “All rights reserved” footer | shortlog | Yes | HIGH possession; **UNKNOWN title** |
| Cursor Agent commits (627) | AI-assisted | cursoragent@cursor.com | Same | Same | git shortlog | Assignment should cover AI-assisted work | HIGH volume; UNKNOWN legal authorship |
| Generated OpenAPI clients | Codegen from `lib/api-spec/` | bots / scripts | Repo | Generated | paths | Transfer with spec | HIGH generated |
| npm dependencies | registry | third parties | node_modules / lockfile | SPDX per SBOM | `SECURITY/SBOM-pnpm-licenses.txt` | No (use as licensed) | HIGH licensed |
| Capacitor / Play / Firebase SDKs | vendors | vendors | vendor TOS | vendor | package trees | New buyer accounts | HIGH third-party |
| Archived Expo | historical | same authors | `archive/` | mixed | tree | Optional | HIGH exists |
| GCS audio / video / PDFs | production buckets | UNKNOWN | UNVERIFIED GCP project | UNKNOWN | not in git | Yes if owned | **UNKNOWN** |
| Fonts / icons / stock | mixed | mixed | repo/public | UNKNOWN per file | no provenance pack | Review | LOW |
| Prompts / workflows | repo | same | repo | UNKNOWN title | source files | Yes | MEDIUM |
| Brand / Amy mascot | product | UNKNOWN | used in app | UNKNOWN TM | no TM filing | Yes if owned | LOW |
| Domain amynest.in | registrar UNVERIFIED | — | UNVERIFIED | — | live DNS | Registrar transfer | UNVERIFIED title |
| Patent App. 202611059355 | IPO | Ankur Raman | Ankur Raman | N/A (application) | `patent/` | Separate IPO assignment if in deal | HIGH applicant name |

**A.** MIT metadata was inherited from Replit scaffold — **evidenced**.  
**B.** No LICENSE file, no public grant text — **not evidenced** as an intentional MIT release.  
**C.** LICENSE never existed in git history.  
**D.** Third-party = dependencies + SDKs (SBOM).  
**E.** Purchased/generated media — **UNKNOWN**.  
**F.** No contractor agreements in repo. Contributors are founder aliases + agents.

**Hard cap remains: source title UNKNOWN → max 69.**
