# iOS SIGNING ESCROW EVIDENCE (SB-I01)

**Date:** 2 October 2026  
**SB-I01:** **OPEN** (pack exists; distribution PKCS12 passphrase / keychain export incomplete)  
No signing secrets are recorded in this file.

| Field | Value |
|-------|--------|
| Escrow identifier | `AMYNEST-IOS-ESCROW-2026-10-02-beeaa578` |
| Ciphertext filename | `AMYNEST-IOS-ESCROW-2026-10-02-beeaa578.enc` |
| Storage | Owner-local encrypted directory **outside Git** (matching `.key` alongside; path not recorded) |
| Encryption | OpenSSL AES-256-CBC, PBKDF2, 200000 iterations, SHA-256, salted |
| SHA-256 of ciphertext | `6723bbd46074a363432fdea88ca5a71c11b085169a732e1c211afa3c16aa4b39` |
| Signing material count | **5** |
| Extra `.p8` files in pack | **4** (APNs/ASC-class; not IPA signing) |
| Creation timestamp (UTC) | 2026-10-02T17:05:35Z |
| Verification timestamp (UTC) | 2026-10-02T17:05:36Z |
| Archive decrypt | **PASS** |
| Profile decode (team `FH3WT32854`, bundle `com.amynest.app`) | **PASS** |
| PKCS12 inner open | **NOT PERFORMED** |
| Temporary plaintext | **WIPED** after verify (Downloads / keychain originals left in place) |
| Git | No `.p12` / `.p8` / `.mobileprovision` committed this pass |

## Gates

| Gate | Result |
|------|--------|
| Required iOS release-signing materials identified | **PASS** |
| Materials exist on owner machine | **PASS** (keychain + Downloads + Xcode profiles) |
| Encrypted artifact outside Git | **PASS** |
| SHA-256 recorded | **PASS** |
| Archive decrypt | **PASS** |
| Profiles structurally valid | **PASS** |
| Distribution private key portable + verified in pack | **FAIL** (passphrase unknown; `security export` blocked on GUI) |
| No secrets in Git | **PASS** |

SB-I01 remains **OPEN** until the distribution identity can be opened from escrow without printing secrets.

No IPA uploaded. No Apple account, cert, profile, bundle ID, or transfer change.
