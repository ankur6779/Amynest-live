# SECRET ESCROW CEREMONY

**Date:** 24 September 2026  
**Status: NOT ESCROWED — PROCEDURE READY**

Inventory of names: `SECRET_ESCROW_MANIFEST.md`.  
This file is the **offline ceremony only**. No secret values. No escrow files generated.

Do **not** commit secret values, keystores, `.p12`, `.p8`, SA JSON, or dump files to Git.

## Procedure (owner, offline)

1. **Inventory** secret categories below. Tick only categories that exist.
2. **Verify** each secret still works (login, health probe, or signing dry-run) without pasting values into chat or git.
3. **Create encrypted offline escrow** (owner-chosen tool; e.g. age / GPG / OS encrypted disk). Store the archive **outside Git**.
4. **Store** the archive in a second offline location (owner-chosen).
5. **Record escrow identifier only** in the data room (filename + date + checksum of the *encrypted* archive — not plaintext).
6. **Buyer receives escrow only** under signed transaction terms.
7. **Buyer rotates** secrets after control transfer. Founder access is revoked only after gates G1–G16.

## Categories (values never recorded here)

| Category | Exists in repo as name/config? | Escrow status |
|----------|--------------------------------|---------------|
| Android upload keystore | Path examples only | **NOT ESCROWED** |
| iOS signing (certs / profiles) | Docs only | **NOT ESCROWED** |
| APNs | Plugin documented; key file UNKNOWN | **NOT ESCROWED** |
| Birth Sky key if production-required | Inferred Coolify | **NOT ESCROWED** |
| Database | `DATABASE_URL` name | **NOT ESCROWED** |
| Redis | `REDIS_URL` name | **NOT ESCROWED** |
| GCS | SA JSON name; bucket `amynest-audio-storage` | **NOT ESCROWED** |
| Firebase | Admin + `VITE_FIREBASE_*` names | **NOT ESCROWED** |
| AI APIs | OpenAI / Gemini / optional ElevenLabs / KIE | **NOT ESCROWED** |
| OAuth | Google / Apple / YouTube names | **NOT ESCROWED** |
| RevenueCat | Inferred Coolify | **NOT ESCROWED** |
| Email | Mailbox / SMTP UNKNOWN | **NOT ESCROWED** |
| Cloudflare | Token name | **NOT ESCROWED** |
| CI/CD | GitHub Actions secret **names** | **NOT ESCROWED** |
| Deployment | Coolify / Hetzner SSH names | **NOT ESCROWED** |

Ceremony **not performed**. Identifier **not recorded**.
