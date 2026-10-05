# SECRET ESCROW EVIDENCE

**Date:** 25 September 2026  
**SB-E01:** CLOSED  
No secret values are recorded in this file.

| Field | Value |
|-------|--------|
| Status | **CLOSED** |
| Escrow identifier | `AMYNEST-ESCROW-2026-09-25-0cc370f2` |
| Ciphertext filename | `AMYNEST-ESCROW-2026-09-25-0cc370f2.enc` |
| Storage location | Owner-local encrypted directory **outside the Git repository** (same directory holds the matching `.key` file; path not recorded here) |
| Encryption method | OpenSSL AES-256-CBC, PBKDF2, 200000 iterations, SHA-256, salted (`age` and GPG were not installed) |
| SHA-256 of ciphertext | `d8398d2f34fcb1e95f9eb7b0ed458ea1a30c20c6c902cc38676105d42057569b` |
| Record count | **37** |
| Creation timestamp (UTC) | 2026-09-25T16:09:46Z |
| Verification timestamp (UTC) | 2026-09-25T16:09:47Z |
| Decryption verification | **PASS** |
| Owner confirmation of decrypt | **PASS** (local decrypt test: identifiers present, count match, values nonempty; values not printed) |
| Plaintext-not-in-Git verification | **PASS** (temporary plaintext wiped after verify; ciphertext and key are outside the repository; this file contains metadata only) |

## Verification (A–G)

| Check | Result |
|-------|--------|
| A. Encrypted escrow artifact exists | **PASS** (outside Git) |
| B. Artifact can be decrypted by owner | **PASS** |
| C. Checksum recorded | **PASS** |
| D. Identifier unique | **PASS** |
| E. Secret count matches ESCROW REQUIRED inventory | **PASS** (37 / 37) |
| F. No plaintext secret entered Git in this pass | **PASS** |
| G. No secret value in generated documentation | **PASS** |

## Classification notes (no values)

Items classified **NOT FOUND** were not required for this pack and were not invented: `CLOUDFLARE_API_TOKEN`, `ADMIN_AUTH_TOKEN`, `RENDER_API_KEY`, `REDIS_URL_EXTERNAL` (production store uses `REDIS_URL`), `VITE_GA4_MEASUREMENT_ID`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `SENTRY_DSN`, mailbox passwords.

Items classified **NOT REQUIRED**: `API_PUBLIC_URL`; GitHub account password / 2FA.

Signing materials remain out of scope for SB-E01 (SB-H01 / SB-I01).
