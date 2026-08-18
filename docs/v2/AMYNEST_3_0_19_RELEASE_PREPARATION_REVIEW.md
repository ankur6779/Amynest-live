# AmyNest 3.0.19 Release Preparation Review

Release preparation only. No App Store / Play Store submission. No ads enablement.

Date: 2026-08-18

---

## 1. Previous main SHA

`a1d874a1d6b3288fd51a25806dcd0d526065ad1e`

## 2. Instrumentation branch SHA

`c8fc4947664c81ccf69aa9128df6ddf2c671e836`  
Branch: `cursor/analytics-subscription-instrumentation` (PR #122)

## 3. Merge SHA

`c8fc4947664c81ccf69aa9128df6ddf2c671e836`  
Strategy: **`git merge --ff-only`** (branch was 1 ahead / 0 behind of `origin/main`)

## 4. Safety tag

`pre-instrumentation-release-main-a1d874a1`  
Points at pre-merge main `a1d874a1…`

---

## 5. Apple version / build

| Field | Value | Source of truth |
|-------|-------|-----------------|
| Marketing version | **3.0.19** | `artifacts/amynest-capacitor/ios/App/App.xcodeproj/project.pbxproj` → `MARKETING_VERSION` |
| Build | **29** | same → `CURRENT_PROJECT_VERSION` |
| Info.plist | Uses `$(MARKETING_VERSION)` / `$(CURRENT_PROJECT_VERSION)` | unchanged |

Previous: 3.0.18 (28)

## 6. Android versionName / versionCode

| Field | Previous | New | Source of truth |
|-------|----------|-----|-----------------|
| versionName | 1.4.56 | **1.4.57** | `android/app/build.gradle.kts` |
| versionCode | 99 | **100** | same |

Convention preserved: Android uses `1.4.x` naming (not iOS `3.0.x`). `versionCode` strictly increased.

Billing bridge version remains `2.6.0` (instrumentation); not the Play Store versionName.

---

## 7. Files changed by version bump (+ release prep)

- `artifacts/amynest-capacitor/ios/App/App.xcodeproj/project.pbxproj`
- `android/app/build.gradle.kts`
- `artifacts/kidschedule/src/lib/pricing-living-source.test.ts` (assert finalize lives in billing hook after instrumentation)
- `docs/v2/AMYNEST_3_0_19_RELEASE_PREPARATION_REVIEW.md` (this file)

---

## 8. TypeScript result

| Check | Result |
|-------|--------|
| `pnpm run typecheck:libs` | **PASS** |
| kidschedule `tsc --noEmit` (via prior commit hook / release prep) | **PASS** |

## 9. Tests result

| Suite | Result |
|-------|--------|
| Analytics / purchase coordinator / install attribution / Firebase attribution | **PASS** (16) |
| FA-02 living universe | **PASS** |
| Production door `/begin` (P1) | **PASS** |
| Pricing living source | **PASS** (updated contract) |
| Navigation (living IA, orchestrator, safe-nav) | **PASS** (21) |
| Routine living-adapt + Ask Amy | **PASS** (25) |
| Hard-day / P0-7 monetization soft-continue | **PASS** |
| Trial paywall variant | **PASS** |
| Crash intelligence infant scanner | **FAIL (pre-existing on main)** — not introduced by instrumentation |

## 10. Web build result

`pnpm --filter @workspace/kidschedule run build` → **PASS**

## 11. API build result

`pnpm --filter @workspace/api-server run build` → **PASS**

## 12. Android build result

**NOT VERIFIED — ENVIRONMENT LIMITATION**

- `ANDROID_HOME` unset
- No `local.properties` / SDK
- No `keystore.properties` / signing keystore in this VM

Signing config in Gradle remains unchanged (reads `keystore.properties` when present).

## 13. iOS build result

**NOT VERIFIED — ENVIRONMENT LIMITATION**

- No Xcode / `xcodebuild` in this environment
- Version fields updated in pbxproj; archive not produced here

## 14. Upload readiness

### Apple

| Item | Status |
|------|--------|
| Version 3.0.19 | CODE-SET |
| Build 29 | CODE-SET |
| Archive / IPA | **NOT READY** (no Xcode) |
| Signing / provisioning | **NOT VERIFIED** (unchanged; not exercised) |
| Upload readiness | **NO** — requires Mac/Xcode archive + signing |

### Android

| Item | Status |
|------|--------|
| versionName 1.4.57 | CODE-SET |
| versionCode 100 | CODE-SET |
| AAB | **NOT READY** (no Android SDK / keystore) |
| Signing | Config present; keystore **absent** in this env |
| RevenueCat / Play Billing config | Unchanged |
| Play upload readiness | **NO** — requires SDK + release keystore + `bundleRelease` |

---

## 15. Environment limitations

1. No Android SDK (`ANDROID_HOME`)
2. No release keystore / `keystore.properties`
3. No Xcode
4. Cannot produce AAB/IPA or claim store-upload-ready artifacts
5. Pre-existing crash-intelligence unit test failure on main (`validates infant effect line via source scanner`)

---

## 16. Pricing untouched

**CONFIRMED.** `PLAN_PRICES` / `RAZORPAY_PLAN_PRICES_INR` unchanged vs pre-merge main. Pricing page changes are analytics call-site only.

## 17. RevenueCat products untouched

**CONFIRMED.** No RC product/offering/entitlement/package/price config diffs.

## 18. Entitlements untouched

**CONFIRMED.** No entitlement rule / premium-gate product semantics changes. Instrumentation only.

## 19. Product / UI untouched

**CONFIRMED.** No CSS redesign, navigation, living universe, Routine product, Amy AI UX, Phase 3/4 product behaviour changes. Touch points in `assistant.tsx` / `children/form.tsx` / paywall call sites are analytics-only.

Release content includes:

- Current approved living AmyNest product
- Phase 3 / Phase 4 (pre-existing on main)
- Cross-platform subscription instrumentation (merged)

`/begin` remains production door (tests pass). FA-02 living universe lock intact (tests pass). Mixed production remains rejected.

---

## 20. Gate 0 status

**BLOCKED.**

Instrumentation is now on `main` and version-bumped for next store builds, but:

- No sandbox/test purchase proved Play/StoreKit → Firebase → RevenueCat → AmyNest → entitlement → Google Ads
- **₹4,000 paid acquisition remains NOT approved**
- Do not start or increase Google Ads spend based on this release prep

Verification levels:

| Claim | Status |
|-------|--------|
| CODE-WIRED | Yes |
| TEST-VERIFIED (unit/build) | Partial / Yes for targeted suites |
| PRODUCTION-VERIFIED purchase chain | **No** |

---

## PR #122 scope verification (pre-merge)

- Ahead/behind: **1 / 0**
- Mergeable: yes; ff-only succeeded
- Files: analytics, billing bridges, webhook lifecycle, attribution, tests, docs only
- CI note: draft PR had UNSTABLE status due to pre-existing crash-intelligence failure (reproduced on main without instrumentation)

---

## Explicit non-actions

- Did **not** submit to App Store
- Did **not** submit to Play Store
- Did **not** start ads
- Did **not** increase ad budget
- Did **not** merge unrelated branches
- Did **not** force-push or rewrite history
