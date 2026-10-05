# iOS HANDOVER

**Date:** 24 September 2026  
**No Apple credentials exposed or moved.**

| Item | Value / state | Evidence type |
|------|---------------|---------------|
| Bundle ID | `com.amynest.app` | **VERIFIED** Capacitor / Xcode `PRODUCT_BUNDLE_IDENTIFIER` |
| App Store ID | `6767664343` | **VERIFIED** `IOS_RELEASE.md` |
| Tree | `artifacts/amynest-capacitor/ios/` | **VERIFIED** |
| ASC / Apple Developer account | AMYWORLD sole proprietorship; Ankur Raman proprietor | **SELLER-STATED — NOT INDEPENDENTLY VERIFIED** |
| Listing seller string | “Amyworld” (14 Sep listing) | **VERIFIED** as historical listing text |
| Certificates / profiles | Founder Keychain + Downloads; pack `AMYNEST-IOS-ESCROW-2026-10-02-beeaa578` | **PARTIAL** — profiles **ESCROWED**; distribution PKCS12 passphrase **MISSING** |
| APNs key | `.p8` files found; live mapping UNKNOWN | **ESCROWED** (operational folder); not proven as the Firebase production key |
| CI signing | No Actions job archives/signs iOS | **VERIFIED** |
| TestFlight | Process not evidenced as buyer-ready | **UNKNOWN** current testers/builds |
| Production release | Xcode archive → ASC | **VERIFIED** as documented |

## Transfer operations

1. **Account / app transfer:** App Store Connect app transfer of `6767664343` to a buyer-enrolled Apple Developer account. Apple consent; often weeks. **Eligibility UNKNOWN**.
2. **Credential rotation:** Buyer creates new distribution certificates and profiles after transfer (Apple typically invalidates seller signing for that app).
3. **Service migration:** Re-upload APNs key to Firebase/ASC as required; update RevenueCat App Store app `appa31011b39a` credentials if Apple shared secret rotates.

## Acceptance test

Buyer can produce a signed release candidate **without** Ankur’s personal Apple ID.

**OPEN — OWNER ACTION REQUIRED**
