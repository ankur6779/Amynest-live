# Trust Fracture Fix Report

**Status:** Launch PAUSED — P0 trust repairs only  
**Date:** 2026-08-04  
**Constraint:** No features · no polish · no experiences · no Brain

---

## Root causes

| # | Fracture | Root cause |
|---|----------|------------|
| 1 | Ask Amy guest → Sign-in wall | `/ask-amy` used `makeProtectedRoute` → hard `/sign-in`. Tab also sheet-gated before navigate. |
| 2 | For Child guest → Sign-in wall | `/for-child` used `makeProtectedRoute`. Soft teaser UI never mounted for guests. |
| 3 | MEET AMY remount on V2 | `RouteLoadingShell` / `SmartRouteFallback` always rendered `AmyNestSplashShell` during auth/chunk load — Suspense calm path alone was insufficient. |
| 4 | Landing “Something went wrong” | **`/landing` was not a registered route** → catch-all `RouteFailedPage` → AppFallbackUi. Founder walked `/landing`; real home is `/`. |
| 5 | Soft-save return gap | `/for-child` missing from `tryResolveV2PostAuthPath` allowlist; `/ask-amy`/`/for-child` missing from `CHILD_OPTIONAL_ROUTE_PREFIXES`. |

---

## Fix summary

### 1–2 Guest Ask Amy + For Child
- `isGuestV2AskAmyAccessAllowed` / `isGuestV2ForChildAccessAllowed` in `guest-access.ts`
- Routes switched to `makeGuestAwareRoute` (same pattern as Today / Premium)
- `CHILD_OPTIONAL_ROUTE_PREFIXES` includes `/ask-amy`, `/for-child`
- Soft-save allowlist includes `/for-child`
- Tab bar: no account hard-gates — both tabs navigate
- `GuestAccountCta`: trust-first navigate for `/ask-amy` & `/for-child`; `forceAccountSheet` for post-experience “save progress”
- Ask Amy: guests see full entry (headline, prompts, CTA); conversation start opens soft-save sheet (continuity), never Sign-in redirect

### 3 MEET AMY
- `RouteLoadingShell` → `V2CalmLoadingShell` when `isV2SurfacePath`
- `SmartRouteFallback` same guard (full + content modes on V2)

### 4 Landing
- `<Route path="/landing" component={HomeRedirect} />` — same reliability as `/`

---

## Regression

**19 files · 91 tests passed**

Covered: Guest access helpers · Ask Amy · For Child · guest sheet · nav · Today · calm loading · Premium · Coach · Front Door · conversion glue · Mission · craft tokens · soft-save returns

Manual live (DEV with dogfood flags): HTTP 200 for `/landing` and `/ask-amy`.

---

## Remaining risks (not in this P0 scope)

| Risk | Priority |
|------|----------|
| Ask Amy black-box chat still needs account after entry (soft sheet) — expected until assistant is guest-safe | P1 |
| For Child sections remain title-only shells (wonder preview, not full product) | P1 |
| Offline / reduced-motion / slow network not re-instrumented beyond existing craft tokens | P2 |
| Local API may be down without `DATABASE_URL` — signed-in/Premium purchase not verified this pass | P2 |
| MEET AMY still used on classic (non-V2) boot paths — intentional | P3 |

---

## STOP

No further feature work. Awaiting Founder re-walk.
