# LICENSE RISK REGISTER

**SBOM source:** `SBOM-pnpm-licenses.txt` (`pnpm licenses list`, 24 Sep 2026).  
**Advisories:** `pnpm audit` **not run**.  
No dependency upgrades this round.

| Package | License as listed | Risk | Notes |
|---------|-------------------|------|-------|
| Most npm tree | MIT / Apache-2.0 / BSD / 0BSD | Low | Typical |
| `jszip` | **MIT OR GPL-3.0-or-later** | Dual — **not automatically GPL** | SPDX choice; shipping MIT path is usual. Counsel confirm. |
| `node-forge` | **BSD-3-Clause OR GPL-2.0** | Dual | Same — do not classify as GPL-only |
| `@img/sharp-libvips-*` | **LGPL-3.0-or-later** | LGPL (native) | Dynamic linking / attribution; not repo-copyleft by itself |
| Root AmyNest code | package.json MIT; no LICENSE; © All rights reserved | **Title conflict** | Scaffold MIT vs exclusive-sale story |

**Do not tell a buyer the tree is GPL-infected.**  
**Do not tell a buyer first-party code is a clean proprietary grant.**
