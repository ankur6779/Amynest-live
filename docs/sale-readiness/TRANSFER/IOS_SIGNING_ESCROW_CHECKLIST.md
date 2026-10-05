# iOS SIGNING ESCROW CHECKLIST

**Date:** 2 October 2026  
**Status: OPEN — pack exists; distribution PKCS12 not inner-verified**  
Do **not** expose private keys, `.p12`, or `.p8` bytes.

Companion: `IOS_HANDOVER.md`.  
Evidence: `../EVIDENCE/10-APPLE/IOS_SIGNING_INVENTORY.md`.

| Item | Known | Owner records offline | Status |
|------|-------|----------------------|--------|
| Team ID | `FH3WT32854` | Screenshot from Apple Developer still useful for I03 | **VERIFIED** in Xcode + profiles |
| Bundle ID | `com.amynest.app` | Confirm ASC matches | **DOCUMENTED** |
| App Store ID | `6767664343` | Confirm same app | **DOCUMENTED** |
| Distribution certificate | Keychain: `Apple Distribution: Ankur Raman (FH3WT32854)` (2 valid, 1 revoked) | Encrypted PKCS12 that **opens** | **PARTIAL** |
| Provisioning profiles | `AmyNest_Final_AppleSignIn` (Release), `AmyNest_Final_Profile`, others | Encrypted copies | **ESCROWED** |
| APNs / ASC `.p8` | Four files in Downloads (Key IDs in filenames) | Inside pack `apple-keys/` | **ESCROWED**; live mapping **UNKNOWN** — does **not** block I01 by itself |
| CI signing | No Actions IPA job | N/A | **DOCUMENTED absent** |
| App Store Connect role | Account Holder **UNKNOWN** | Screenshot Account Holder + roles | **SELLER-STATED** AMYWORLD (SB-I03) |
| PKCS12 passphrase / keychain export | Passphrase not in pack; `security export` needs GUI Allow | Add passphrase or export valid identities | **MISSING** — keeps SB-I01 **OPEN** |
| Buyer verification | — | After close: signed IPA / TestFlight without founder login | **NOT DONE** |

Do **not** submit a build. Do **not** start Apple app transfer. Do **not** revoke certificates this pass.
