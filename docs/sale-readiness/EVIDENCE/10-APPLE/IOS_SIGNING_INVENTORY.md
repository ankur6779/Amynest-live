# iOS SIGNING INVENTORY (SB-I01)

**Date:** 2 October 2026  
**SB-I01:** **OPEN**  
No private keys, `.p12` passwords, `.p8` contents, or API secrets are recorded here.

Shipped iOS tree: **`artifacts/amynest-capacitor/ios/`** (Capacitor). Manual signing in Xcode.

An encrypted pack **exists** outside Git (`AMYNEST-IOS-ESCROW-2026-10-02-beeaa578`). SB-I01 stays **OPEN** because the distribution PKCS12 passphrase is **not** in the pack and keychain identity export was **not** completed (macOS requires owner GUI Allow). Profiles and `.p8` files in the pack **did** decrypt and structurally verify.

## Signing model (verified)

| Fact | Value | Evidence type |
|------|-------|---------------|
| Bundle ID | `com.amynest.app` | **VERIFIED** `project.pbxproj`, `capacitor.config.json`, profiles |
| App Store ID | `6767664343` | **VERIFIED** `docs/sale-readiness/handover/IOS_RELEASE.md` |
| Team ID | `FH3WT32854` | **VERIFIED** pbxproj, ExportOptions, profile `TeamIdentifier` |
| Team display (profiles) | Ankur Raman | **VERIFIED** profile metadata |
| Signing style | Manual | **VERIFIED** `CODE_SIGN_STYLE = Manual` |
| Release identity setting | `iPhone Distribution` | **VERIFIED** pbxproj |
| Keychain distribution identity | `Apple Distribution: Ankur Raman (FH3WT32854)` — **2 valid**, **1 revoked** | **VERIFIED** `security find-identity` |
| Revoked SHA-1 | `C451D65FA1A4D19EF1E3BB8B216414FD8BE96492` | **VERIFIED** (do not use) |
| Valid SHA-1 (May 13 2026–2027) | `8BF3D77C04487E0E9D0E37568D516C68DB19553A` | **VERIFIED** public cert |
| Valid SHA-1 (May 21 2026–2027) | `57BDDC659830BD4DC983FA883A40CC9750846EF8` | **VERIFIED** public cert |
| Release profile specifier | `AmyNest_Final_AppleSignIn` | **VERIFIED** Release config + `ExportOptions-AppStore.plist` |
| Debug profile specifier | `AmyNest_Final_Profile` | **VERIFIED** Debug config |
| `aps-environment` | `production` | **VERIFIED** `App.entitlements` + App Store profiles |
| CI IPA job | None in `.github/` | **VERIFIED absent** |
| Local `.p12` | `Downloads/Apple distribution.p12` (3267 bytes), password-protected | **VERIFIED** file exists; inner open **NOT DONE** (passphrase unknown this pass) |
| APNs / ASC `.p8` on disk | Three `AuthKey_*.p8` + one `SubscriptionKey_*.p8` in Downloads | **VERIFIED** existence + `openssl pkey -noout`; **which key is live APNs vs ASC API = UNKNOWN** |

## Distinction (do not collapse)

| ID | Control | This pass |
|----|---------|-----------|
| **A** | Apple Developer account ownership | Team ID **VERIFIED** in repo + profiles. Account Holder / legal entity **not** console-screenshoted (SB-I03) |
| **B** | App Store Connect app ownership | App ID **VERIFIED** in docs/listing. Console ownership **not** re-verified this pass (SB-I02) |
| **C** | Apple distribution certificate | **EXISTS** in login keychain (valid identities). PKCS12 copy on disk **password-locked**. Export to escrow **incomplete** |
| **D** | Provisioning profile | **EXISTS** and **ESCROWED**; decode **PASS** (`com.amynest.app` / `FH3WT32854`) |
| **E** | APNs credentials | `.p8` files **found** and included in pack under `apple-keys/` — **not** IPA signing; live mapping **UNKNOWN** |
| **F** | App Store Connect API credentials | `SubscriptionKey_*.p8` / `AuthKey_*.p8` **may** be ASC API keys; issuer ID **UNKNOWN** |
| **G** | iOS transfer eligibility | **NOT THIS BLOCKER** (SB-I02) |
| **H** | Completed app transfer | **NO** |

C existing in the owner keychain does **not** prove a buyer can sign on a new Mac without the PKCS12 passphrase or a successful identity export.

## Inventory (no values)

| Material type | Purpose | Existence | Storage category | Escrow required | Buyer handover | Evidence status |
|---------------|---------|-----------|------------------|-----------------|----------------|-----------------|
| Apple Distribution identity (private key + cert) | Sign App Store IPA for team `FH3WT32854` | **EXISTS** in login keychain (2 valid) | Owner keychain | **YES** | Importable PKCS12 **or** new certs after ASC transfer | **PARTIAL** — keychain present; portable PKCS12 passphrase **MISSING** from pack |
| `Apple distribution.p12` | Portable copy of distribution identity | **EXISTS** (Downloads) | Owner Downloads | **YES** | Same file + passphrase | **ESCROWED as opaque file**; inner PKCS12 **not opened** |
| Profile `AmyNest_Final_AppleSignIn` | Release / `xcodebuild` export (Sign in with Apple, production APS) | **EXISTS** (Downloads + Xcode profiles) | Owner disk | **YES** | Install profile on build Mac | **ESCROWED** / decode **PASS** (expires 2027-05-21) |
| Profile `AmyNest_Final_Profile` | Debug specifier in pbxproj | **EXISTS** | Owner disk | **YES** | Same | **ESCROWED** / decode **PASS** (expires 2027-05-13) |
| Profile `AmyNest_Distribution_Profile` | App Store distribution | **EXISTS** | Owner disk | **YES** | Same | **ESCROWED** / decode **PASS** (expires 2027-05-12) |
| Xcode-managed Team Store profile `com.amynest.app` | Automatic-style App Store profile (4 certs, Sign in with Apple) | **EXISTS** | `~/Library/Developer/Xcode/UserData/Provisioning Profiles` | **YES** (recovery) | Same | **ESCROWED** / decode **PASS** |
| Legacy Expo App Store profiles | Historical RN/EAS | **EXISTS** (3) | Xcode profiles | **NO** for Capacitor IPA | Optional | **NOT IN PACK** (legacy) |
| Apple Development identities | Local debug | **EXISTS** (2) | Keychain | **NO** for App Store IPA | N/A | **NOT REQUIRED** |
| Developer ID Application | Mac notarization | **EXISTS** (1) | Keychain | **NO** for iOS IPA | N/A | **OUT OF SCOPE** |
| Revoked Apple Distribution identity | Do not use | **EXISTS** (revoked) | Keychain | **NO** | N/A | **DOCUMENTED revoked** |
| Xcode / Capacitor signing config | Tells Xcode team, specifiers, entitlements | **EXISTS** in Git | Repo | **NO** (not a secret) | Clone repo | **DOCUMENTED** |
| APNs `.p8` (`AuthKey_*`) | Push (Firebase/APNs) — **not** IPA signing | **EXISTS** (3 files) | Downloads | **YES if used** (separate from IPA) | Upload to buyer Firebase/ASC | **ESCROWED** under `apple-keys/`; live key **UNKNOWN** |
| `SubscriptionKey_*.p8` | Likely ASC/IAP API key — **not** IPA signing | **EXISTS** (1) | Downloads | **YES if used** | ASC API on buyer account | **ESCROWED** under `apple-keys/`; role **UNKNOWN** |
| ASC Issuer ID / Key ID mapping | Use API keys | Key IDs visible in filenames only | Filenames | Metadata only | Confirm in ASC | **PARTIAL** (IDs from filenames; issuer **UNKNOWN**) |
| Apple Developer / ASC login | Account A/B | Founder-operated | Owner Apple ID | Account ≠ signing file | App transfer (SB-I02) | **NOT this pack** |

## Escrow record (metadata only)

| Field | Value |
|-------|--------|
| Escrow identifier | `AMYNEST-IOS-ESCROW-2026-10-02-beeaa578` |
| SHA-256 of ciphertext | `6723bbd46074a363432fdea88ca5a71c11b085169a732e1c211afa3c16aa4b39` |
| Signing material count | **5** (1 PKCS12 + 4 unique `.mobileprovision`) |
| Additional apple-key files in same pack | **4** (`.p8`) — **not** counted as IPA signing |
| Verification timestamp (UTC) | 2026-10-02T17:05:36Z |
| Archive decrypt | **PASS** |
| Profile structural verify | **PASS** |
| PKCS12 inner open | **NOT PERFORMED** (passphrase not in pack) |
| Keychain export | **NOT PERFORMED** |
| Storage | Owner-local directory **outside Git** |

Companion: `IOS_SIGNING_ESCROW_EVIDENCE.md`.

## Exact missing requirement (keeps SB-I01 OPEN)

**Distribution private key is not buyer-portable in this pack.**

Owner-actionable next step (do **not** revoke/recreate certs unless intended):

1. Approve macOS Keychain **Allow** to export `Apple Distribution: Ankur Raman (FH3WT32854)` (valid identities only), **or**
2. Place the PKCS12 passphrase **inside a new encrypted pack** (never Git).

Then re-run decrypt verification that `openssl pkcs12` opens **without printing secrets**.

After an App Store **app transfer**, Apple typically requires **new** certs/profiles on the buyer team — this escrow is for **pre-transfer** continued shipping under team `FH3WT32854`.

No IPA uploaded. No certificates created or revoked. Bundle ID and ASC ownership unchanged.
