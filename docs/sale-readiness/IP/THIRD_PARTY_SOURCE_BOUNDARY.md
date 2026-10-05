# THIRD-PARTY SOURCE BOUNDARY

**Date:** 25 September 2026  
Goal: first-party product code vs licensed components. **Not** a full transitive SBOM dump.

A buyer does **not** need ownership of third-party libraries to receive assignment of first-party code. The transaction should disclose dependencies and license obligations.

## FIRST-PARTY PRODUCT CODE (title still UNKNOWN)

`artifacts/kidschedule/src/` · `artifacts/api-server/src/` · `android/app/src/` · `artifacts/amynest-capacitor/ios/` (app sources) · `lib/*` except `**/generated/**` · `content-engine/` (code) · `scripts/` · `infra/`

## THIRD-PARTY / OPEN-SOURCE (licensed; not sold as owned IP)

| Component | Where | Notes |
|-----------|-------|--------|
| npm / pnpm packages (React, Vite, Express, Drizzle, Zod, Tailwind, etc.) | `node_modules/` / lockfile | `SECURITY/SBOM.md` |
| Replit Vite plugins (catalog) | `pnpm-workspace.yaml` catalog | Scaffold-era tooling |
| AndroidX / Material / WebKit | `android/app/build.gradle.kts` | AndroidX, AppCompat, WebKit |
| Firebase (Android) | same | BOM 33.7.0; messaging, analytics |
| Google Play services Auth | same | Sign-in |
| RevenueCat Android | same | `purchases` 9.29.1 |
| Facebook Login Android | same | |
| Play Review / Install Referrer | same | |
| Capacitor / CocoaPods / StoreKit | `artifacts/amynest-capacitor/` | iOS |
| Firebase / Google client SDKs (web) | kidschedule | Auth, analytics |
| RevenueCat (web/iOS as configured) | app + API | Vendor TOS |
| OpenAI / Gemini / other AI HTTP APIs | server | No model ownership |
| Gradle Wrapper / Android Gradle Plugin | `android/gradle/` | Tooling |

## GENERATED

`lib/api-client-react/src/generated/` · `lib/api-zod/src/generated/` — generated from first-party `lib/api-spec/`.

## UNKNOWN BOUNDARY

Per-file art/audio in `public/`, `attached_assets/`, GCS `amynest-audio-storage` objects, JPL/ephemeris data, golden-script media, KIE/YouTube pipeline outputs.
