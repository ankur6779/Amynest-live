# LICENSE STATUS

**Date:** 24 September 2026

## Facts

- Root `package.json` has `"license": "MIT"` since **initial Replit Agent commit** (8 Apr 2026).
- No `LICENSE` / `LICENSE.md` file has **ever** existed in git history (`git log --diff-filter=A -- LICENSE` empty).
- Workspace is `"private": true`.
- There is no CONTRIBUTING / AUTHORS file.
- Footer copy in i18n: “© 2026 AmyNest AI. All rights reserved.” — **conflicts** with MIT metadata.

## Why MIT is there

**Best evidenced explanation:** inherited **Replit/workspace scaffolding metadata**, not an executed public open-source release. No LICENSE file was published. No README historically granted MIT.

This is **not** a legal conclusion that the project is or is not MIT. It is the git history.

## Does package.json license the whole repo?

npm treats `"license"` as the **package’s** SPDX field. This root package is a private workspace named `workspace`. A buyer (or a downstream user) could still **argue** implied MIT. Counsel must decide.

## Safest non-destructive remediation (this pass)

1. **Do not add** an MIT LICENSE file (would strengthen a public grant).
2. **Do not delete** the `"license": "MIT"` field without counsel (history remains).
3. Document the conflict (this file + `handover/LICENSE_DECISION.md`).
4. Assignment / bill of sale remains **AWAITING EXTERNAL EXECUTION**.

**Status:** buyer ambiguity **remains**. Ownership hard cap **still 69**.
