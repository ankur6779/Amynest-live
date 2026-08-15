# AmyNest 66K × Main SEO Integration Review

**Status:** INTEGRATION ONLY · NO PRODUCT REDESIGN · NO MERGE TO MAIN · NO PUSH MAIN  
**Date:** 2026-08-15  
**Branch:** `cursor/product-execution-model-v2`  
**Integration HEAD:** `26be9e0a`  
**Safety tag:** `pre-seo-integration-fca28c3d` (= `fca28c3d`)

This is **not** a Final Apple Audit. This is **not** a merge to `main`.

---

## 1. Starting branch / HEAD

| Item | Value |
|---|---|
| Branch | `cursor/product-execution-model-v2` |
| Starting HEAD | `fca28c3d` (audit doc after audited `fa91857e`) |
| Working tree before | **Clean** |
| `origin/main` | `52e7b43d` |
| Merge-base then | `db2094e8` |
| Safety reference | tag `pre-seo-integration-fca28c3d` |

## 2. Main commit integrated

`52e7b43d` — *Reposition AmyNest SEO and marketing as global-first*

Strategy:

1. Cherry-pick `52e7b43d` → `789279a2` (conflicts resolved).  
2. Merge `origin/main` → `26be9e0a` so **main is an ancestor** (later main merge will not replay the SEO commit).

`git merge-base HEAD origin/main` = `52e7b43d`.  
`origin/main` unique commits: **none**.

## 3. SEO changes retained

Worldwide / multi-cuisine public copy. **46 files** from the SEO commit (marketing, ASO, schema, store metadata, content-engine copy, `llms.txt`, ads manifests, etc.).

Runtime product UI of the living house: **not redesigned**.

`ptm-prep.ts` prompt line: “Practical for families worldwide” (copy only; route/IDs unchanged).

## 4. Conflict resolution

### `landing.tsx`

SEO commit targeted the **pre–Experience-V3** landing (testimonials, India keywords). Current 66k file is already a short marketing `/welcome` page.

**Kept:** entire 66k landing UI, CTAs (`/sign-up`, `/sign-in`), title “Know what your child needs most today”.  
**Took from SEO:** added keyword token `global parenting app`.  
**Rejected:** restoring old HERO_BADGES / testimonials / “Where Smart Parenting Begins”.  
**Routing:** `/welcome` still `LandingPage`; **not** the production door.

### `index.html`

**Kept (66k product promise):** `<title>`, primary description, Open Graph title/description, Twitter title/description — “Know what your child needs most today”.  
**Took (SEO):** `hreflang="en"` / `hi` (not `en-IN`); removed `geo.region` India; keywords drop “India”; `og:locale` `en_US`; JSON-LD worldwide / USD / multi-cuisine / multiple languages.  
**Preserved:** bootstrap, Meta Pixel, PWA, splash, script/style injection, Vite entry. No new runtime architecture.

### `en.json`

Auto-merged cleanly. Three SEO string updates only:

| Key | Final choice |
|---|---|
| `landing.tech_patent_desc` | “Provisional patent filed…” (**SEO**; drop “Indian”) |
| `nutrition_tags` “Indian meals” | “Multi-cuisine meals” (**SEO**) |
| `patent_pending.settings_note` | “Provisional Patent Filed” (**SEO**; drop “Indian”) |

Premium Continuity “Continue with AmyNest” strings **unchanged**. No Routine “Build today's plan” / “Begin today” keys overwritten (those live mainly as code `defaultValue`s).

## 5. `/begin` protection

| Check | Result |
|---|---|
| `AppCore` `/begin` → `FirstExperiencePage` | **Unchanged** |
| Unsigned / auth timeout → `/begin` | **Unchanged** |
| `/welcome` → `LandingPage` | **Still alternate only** |
| Visual `/begin` | “Begin with today” / sanctuary photography |
| Visual `/welcome` | Distinct marketing page; does not replace `/begin` |

## 6. Living Universe

FA-02 **not modified**. `vite.config.ts` still asserts production mixed reject. 16 surface flags unchanged.

Tests this run: `amynest-living-universe.test.ts` **PASS**.

## 7. 66K experience integrity

`git diff pre-seo-integration-fca28c3d..HEAD` on:

- `pages/routines/**`
- `lib/amynest-living-universe.ts`
- `pages/parenting-hub.tsx`
- `AppCore.tsx`
- `pages/first-experience.tsx`

→ **empty**. Rooms, P0-6/P0-7, module interiors, Routine dashboard/R2/R3 **untouched**.

## 8. Routine freeze

No Routine files in the integration diff. Living dashboard still `isRoutineLivingV1Enabled()` → `RoutineLivingDashboard`. Visual fixture still “Build today's plan”. Documented debt **not** fixed.

## 9. Production safety

No DB/schema, RevenueCat, Firebase, auth, or engine files in the SEO set except `ptm-prep.ts` **prompt wording**. Deep-link IDs unchanged.

## 10. Tests

| Gate | Result |
|---|---|
| `typecheck:libs` + kidschedule `typecheck` | **PASS** (pre-commit on cherry-pick + merge + this review) |
| Living / Hub / P0-7 / Routine R2–R3 / FA-02 / Speech living | **30 files / 194 tests PASS** |

## 11. Production build

`pnpm --filter @workspace/kidschedule run build` → **PASS** `✓ built in 22.53s`

## 12. Git diff review

Intended: SEO/marketing + conflict resolutions + merge commit.  
No 66k living files reverted. No debug artifacts. No generated Orval drift (pre-commit codegen current).

## 13. Remaining P1 / a11y debt (unchanged)

- P0-9 real-device accessibility **not certified**
- `/welcome` still a second visual OS (now with global keywords)
- Speech mid-play, leave-path residuals, `/begin` contrast
- Routine supporting interiors / R2 header

## 14. Final integration verdict

The 66k living experience is integrated with main’s SEO/marketing change **without changing the approved product experience**. `/begin` remains the production door. `origin/main` is an ancestor.

**Wait for Founder approval before merging/pushing `main`.**

---

### Exact answers

> Is the completed ~66K AmyNest living experience now integrated with main's SEO/marketing change without changing the approved product experience?

**YES**

> Is the branch now clean and verified for the final main merge?

**CONDITIONAL** — git-clean vs `origin/main` (no remaining unique main commits); verification PASS; Founder still must approve; do **not** push `main` in this task; P1/a11y debt remains accepted.
