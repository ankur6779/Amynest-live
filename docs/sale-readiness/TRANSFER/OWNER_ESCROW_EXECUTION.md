# OWNER ESCROW EXECUTION

**Date:** 24 September 2026  
**Status: NOT ESCROWED.** Do not paste secrets into Cursor, chat, or Git.

Tooling is owner-chosen (age, GPG, or OS encrypted disk). Record **ciphertext** checksums only.

## Shared steps (every artifact)

1. **Prepare** — locate the file on your machine. Confirm it still works (sign/login/health) without writing the value down in git.
2. **Encrypt** — encrypt on an offline or local machine. Output = `*.age` / `*.gpg` / encrypted disk image.
3. **Checksum** — `shasum -a 256` (or equivalent) of the **encrypted** file.
4. **Offline storage** — two copies, neither inside this repo.
5. **Identifier** — write only: filename, date, SHA-256, storage label (“safe A / safe B”).
6. **Verify** — decrypt once to a temp dir; confirm the inner file opens; delete temp.
7. **Git rule** — never commit passwords, private keys, `.jks`, `.p12`, `.p8`, SA JSON, `.env`, auth codes, seed phrases.

Identifier file goes in `EVIDENCE/03-ESCROW/` (or 04/05/06). The archive does **not**.

### Production secrets (SB-E01)

- Inventory categories in `SECRET_ESCROW_MANIFEST.md` (names only).
- One encrypted blob (or one blob per category). Include Birth Sky **if** that env is set; if unset, write `birth-sky: unset` in the identifier file.
- Buyer receives the blob only under signed terms. Rotate **after** buyer control.

### Android upload / signing key (SB-H01)

- Encrypt the keystore file + a **separate** note of store/key passwords (inside the same encrypted blob, not in git).
- Identifier may include: package `com.amynest.app`, alias **name**, SHA-256.
- Do not submit an AAB.

### iOS certificates / profiles / APNs (SB-I01)

- Encrypt `.p12` / `.cer` + `.mobileprovision` + APNs `.p8` if present.
- If no APNs file: identifier line `apns: not found`.
- Do not submit an IPA.

### Birth Sky key (SB-E02)

- If present in Coolify: include inside SB-E01 blob.
- If absent: `unset` attestation in `EVIDENCE/03-ESCROW/`.
- Do not rotate this key in production during this pass.

### Database dump (SB-G02)

- Only after hostname is recorded (`OWNER_DB_CLOSURE_RUNBOOK.md`).
- Encrypt the dump file. SHA-256 the ciphertext. Restore from decrypt → scratch. Keep dump outside Git.
