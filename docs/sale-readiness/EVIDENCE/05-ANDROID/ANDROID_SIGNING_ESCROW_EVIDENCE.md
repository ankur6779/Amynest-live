# ANDROID SIGNING ESCROW EVIDENCE (SB-H01)

**Date:** 2 October 2026  
**SB-H01:** CLOSED  
No signing secrets are recorded in this file.

| Field | Value |
|-------|--------|
| Status | **CLOSED** |
| Escrow identifier | `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e` |
| Ciphertext filename | `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e.enc` |
| Storage location | Owner-local encrypted directory **outside the Git repository** (matching `.key` alongside; path not recorded) |
| Encryption method | OpenSSL AES-256-CBC, PBKDF2, 200000 iterations, SHA-256, salted |
| SHA-256 of ciphertext | `53cc308f9c8b4c9f2b343eb5af6dbbb993e1c593d3f59fc2e2e68e9002c769f2` |
| Material count | **2** (`Amynest` PKCS12 upload/release keystore + `keystore.properties`) |
| Package / applicationId | `com.amynest.app` |
| Alias name | `amynest_key` |
| Creation timestamp (UTC) | 2026-10-02T16:45:41Z |
| Verification timestamp (UTC) | 2026-10-02T16:45:42Z |
| Decryption verification | **PASS** |
| Temporary plaintext copies | **WIPED** after verify (owner working copies under `android/` were left in place; they remain gitignored) |
| Git | Keystore and properties **not** tracked; ciphertext **not** in the repository |

## Verification gates

| Gate | Result |
|------|--------|
| Required Android signing material identified | **PASS** |
| Required material actually exists | **PASS** |
| Encrypted artifact exists outside Git | **PASS** |
| Encrypted artifact opens | **PASS** |
| Expected files present after decrypt | **PASS** (`Amynest`, `keystore.properties`, `MANIFEST.txt`) |
| File integrity (inner keystore SHA-256 + size) | **PASS** |
| PKCS12 opens; alias `amynest_key` | **PASS** |
| SHA-256 of ciphertext recorded | **PASS** |
| No signing secret committed to Git | **PASS** |
| No secret values printed in this evidence | **PASS** |

## Play App Signing distinction

This pack contains **local upload / Gradle release signing material only**.

It does **not** contain, and does **not** prove control of:

- the Google Play **App Signing** (app-signing) key
- Play Console **account ownership**
- Play **transfer eligibility**

Those are separate controls. Console enrollment remains **UNKNOWN** this pass.

No AAB was uploaded. Signing keys were not rotated. Package ID and Gradle signing configuration were not changed. Production was not modified.
