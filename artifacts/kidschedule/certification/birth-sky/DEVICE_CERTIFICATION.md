# Birth Sky DEVICE_CERTIFICATION

**App Build:** birth_sky_rc3/1.0.0  
**Authority:** Pack 8 §1.5 + RC2-01  
**Generated:** 2026-07-25T19:45:06.357Z

## Validation environments

| ID | Label | Kind | Notes |
| --- | --- | --- | --- |
| web-chromium | Web (Chromium Desktop) | automated | Playwright Desktop Chrome + Vite |
| android-webview-proxy | Android WebView form-factor (Chromium Pixel 5) | automated_proxy | Viewport/UA-class proxy; production shell is android/ WebView |
| ios-iphone-proxy | iOS Capacitor / iPhone form-factor (Chromium iPhone 13 viewport) | automated_proxy | Chromium + iPhone 13 viewport proxy; production shell is Capacitor iOS |
| ios-ipad-proxy | iPad form-factor (Chromium iPad Pro viewport) | automated_proxy | Chromium + iPad Pro viewport proxy for tablet layout |
| android-release-build | Android release build (assemble) | build | Gradle assembleRelease when SDK available |
| vitest-regression | Birth Sky Vitest regression (IM-0–IM-7 + RC1) | automated | Unit/integration suite |

## Device / flow matrix

| ID | Item | Status | Evidence |
| --- | --- | --- | --- |
| D-WEB | Web — Pack 8 §1.5 smoke (startup/kill/routes) | PASS | playwright birth-sky-rc2 web project |
| D-AND-WV | Android WebView — form-factor smoke (Pixel 5 proxy) | PASS | playwright Pixel 5 project + AmyNestAndroid UA contract |
| D-AND-REL | Android release build | WAIVED | assembleRelease unavailable on cert host (no JRE); shell contract PASS |
| D-AND-SHELL | Android WebView shell contract (UA AmyNestAndroid/1.0) | PASS | android/ MainActivity UA append verified in source |
| D-IOS-CAP | iOS Capacitor shell present | PASS | artifacts/amynest-capacitor/ios tree present |
| D-IPHONE | iPhone — form-factor smoke (iPhone 13 proxy) | PASS | playwright iPhone 13 project |
| D-IPAD | iPad — form-factor smoke (iPad Pro proxy) | PASS | playwright iPad Pro project |
| D-FLOW-STARTUP | Startup / flag-gated entry | PASS | kill switch + entry-resolver unavailable when flag off |
| D-FLOW-REVEAL | Reveal path (ceremony not deep-linkable) | PASS | entry-resolver.test.ts ceremony guards |
| D-FLOW-DASH | Dashboard segments resolvable | PASS | entry-resolver + dashboard-session tests |
| D-FLOW-AI | AI conversation surfaces gated | PASS | birth-sky-im4 playwright + AI entitlement unit paths |
| D-FLOW-REGEN | Regeneration orchestrator | PASS | edit-and-regenerate + lifecycle API |
| D-FLOW-EXPORT | Export | PASS | export-service.test.ts + settings export gate |
| D-FLOW-DELETE | Delete + local purge | PASS | privacy-security delete inspection + lifecycle DELETE |
| D-FLOW-OFFLINE | Offline read (encrypted cache) | PASS | offline-cache-store + offline-migration suites |
| D-FLOW-SYNC | Synchronization cycle | PASS | lifecycle-sync.ts + syncTransactionId analytics |
| D-PHYS-VO | Physical VoiceOver lab (iPhone/iPad signed build) | WAIVED | No signed device attached to this CI host — formal risk acceptance; form-factor proxies PASS |
| D-PHYS-TB | Physical TalkBack lab (Android release APK) | WAIVED | No Android device attached to this CI host — formal risk acceptance; Pixel proxy PASS |

## Notes

- Form-factor Playwright projects certify layout/kill-switch/route gating; they are not a substitute for store-signed VO/TalkBack labs.
- Physical VO/TalkBack cells are **WAIVED** with written risk acceptance for this engineering host.
