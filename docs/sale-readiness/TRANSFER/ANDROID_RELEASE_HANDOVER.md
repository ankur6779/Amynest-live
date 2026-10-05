# ANDROID RELEASE HANDOVER

**Date:** 24 September 2026  
**Do not submit to Play this pass.**

| Topic | Classification | Detail |
|-------|----------------|--------|
| Package / applicationId | **DOCUMENTED** | `com.amynest.app` — `android/app/build.gradle.kts` |
| Shipped tree | **DOCUMENTED** | `android/` WebView; not Capacitor Android |
| Gradle | **DOCUMENTED** | Kotlin DSL; compileSdk 36; minSdk 24 |
| Node | **N/A for AAB** | Web is separate; wrapper loads `https://www.amynest.in` |
| Build unsigned | **DOCUMENTED** | `cd android && ./gradlew assembleRelease` (`android/README.md`) |
| Build signed AAB | **DOCUMENTED** command / **OWNER-ONLY** key | `./gradlew bundleRelease` |
| Signing config | **DOCUMENTED** | Reads `keystore.properties` + store file when present |
| Keystore path examples | **DOCUMENTED** | `amynest-release.jks` / `keystore/Amynest` — **not in git** |
| Upload key / passwords | **ESCROWED** 2 Oct 2026 | `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` — values not in Git |
| Play App Signing | **UNKNOWN** console; **DOCUMENTED** that Play re-signs | `android/README.md` |
| CI signing | **DOCUMENTED absent** | No Actions AAB job |
| Release track | **UNKNOWN** live (internal/closed/open) | Internal-testing docs exist |
| Artifact location | **DOCUMENTED** | Typical Gradle `app/build/outputs/bundle/release/` |
| Play account | **OWNER-ONLY** / **SELLER-STATED** AMYWORLD | Transfer not started |
| Buyer verification | Package name in AAB = `com.amynest.app` (`aapt dump`) | |

## Acceptance (not performed)

Buyer independently produces a **signed** AAB and verifies package identity — **without** Ankur’s Play login for signing (upload still needs Play after transfer).

**BLOCKED** until keystore escrow + Play transfer.
