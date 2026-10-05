# iOS RELEASE HANDOVER

**Date:** 24 September 2026  
**Do not submit to App Store this pass.**

| Topic | Classification | Detail |
|-------|----------------|--------|
| Bundle ID | **DOCUMENTED** | `com.amynest.app` |
| App Store ID | **DOCUMENTED** | `6767664343` |
| Tree | **DOCUMENTED** | `artifacts/amynest-capacitor/ios/` |
| Web bundle | **DOCUMENTED** | kidschedule → `www/` then `npx cap sync ios` |
| Xcode | **DOCUMENTED** | `ios/App/App.xcworkspace` after `pod install` |
| Certificates / profiles | **OWNER-ONLY** | **NOT ESCROWED** |
| APNs | **UNKNOWN** key file; push **DOCUMENTED** in plugins | |
| CI signing | **DOCUMENTED absent** | |
| TestFlight | **UNKNOWN** current | |
| ASC account | **SELLER-STATED** AMYWORLD | Transfer not started |
| Production release | **DOCUMENTED** | Xcode archive → ASC |

## Acceptance

Buyer creates a signed IPA/RC without Ankur’s Apple credentials.

**BLOCKED**
