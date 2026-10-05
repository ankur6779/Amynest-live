# BUYER ACCEPTANCE CHECKLIST

**Date:** 24 September 2026  
Marks: **[ ] OPEN** · **[x] READY** · **[x] VERIFIED**  
Nothing is marked VERIFIED without evidence. READY means the buyer can do it from the public repo/data room alone.

---

## PRE-CLOSING

| Item | Mark |
|------|------|
| Path A vs Path B seller elected in writing | [ ] OPEN |
| IP assignment / bill of sale executed | [ ] OPEN |
| Patent 202611059355 marked INCLUDED or EXCLUDED | [ ] OPEN |
| If INCLUDED: IPO assignment counsel engaged | [ ] OPEN |
| MIT / no LICENSE / © footer counsel memo | [ ] OPEN |
| Play Console enrollment proof (AMYWORLD) | [ ] OPEN |
| ASC enrollment proof (AMYWORLD) | [ ] OPEN |
| Domain registrar proof | [ ] OPEN |
| Coolify + Hetzner + CF + GCP account proofs | [ ] OPEN |
| Production DB host identified (offline) | [ ] OPEN |
| Encrypted Postgres dump produced | [ ] OPEN |
| Android keystore dual-control escrow | [ ] OPEN |
| iOS cert/profile/APNs escrow | [ ] OPEN |
| Birth Sky encryption key escrow | [ ] OPEN |
| GCS object inventory | [ ] OPEN |
| Actions secret inventory (names already listed) + value escrow | [ ] OPEN |
| Buyer GitHub org created | [ ] OPEN |
| Buyer Play + Apple Developer enrollment | [ ] OPEN |
| Child-data transfer legality reviewed | [ ] OPEN |
| Public clone of source available | [x] READY (repo is public; **not** title) |

## DAY-OF-CLOSING

| Item | Mark |
|------|------|
| GitHub repository transfer accepted | [ ] OPEN |
| Buyer is GitHub Owner | [ ] OPEN |
| Actions secrets recreated on buyer repo | [ ] OPEN |
| Coolify git source retargeted | [ ] OPEN |
| Cloudflare invite accepted | [ ] OPEN |
| GCP project IAM / move initiated | [ ] OPEN |
| RevenueCat Admin invite accepted | [ ] OPEN |
| Domain auth-code issued / transfer started | [ ] OPEN |
| Play app transfer started | [ ] OPEN |
| Apple app transfer started | [ ] OPEN |
| Google Ads MCC / transfer started (campaign not edited in this audit) | [ ] OPEN |
| `ADMIN_ALERT_EMAIL` pointed at buyer | [ ] OPEN |
| Founder production passwords not yet revoked (overlap window) | [ ] OPEN |

## POST-CLOSING

| Item | Mark |
|------|------|
| Scratch DB restore + R/W smoke | [ ] OPEN |
| Buyer `DATABASE_URL` / `REDIS_URL` on API+worker | [ ] OPEN |
| GCS/Firebase SA rotated; founder keys revoked | [ ] OPEN |
| OpenAI/Gemini/other keys rotated; founder keys revoked | [ ] OPEN |
| RC webhook 2xx on buyer secret | [ ] OPEN |
| www HTTPS + `/api/healthz` on buyer CF/Coolify | [ ] OPEN |
| Worker job on buyer Hetzner SSH | [ ] OPEN |
| Buyer-signed Android AAB | [ ] OPEN |
| Buyer-signed iOS IPA | [ ] OPEN |
| Store transfers **completed** (not merely started) | [ ] OPEN |
| support@ on buyer MX; SPF/DKIM/DMARC | [ ] OPEN |
| Legal pages live as buyer (deploy authorized) | [ ] OPEN |
| `ankur6779` removed from GitHub/CF/GCP/RC/Ads | [ ] OPEN |
| Patent election filed/recorded if INCLUDED | [ ] OPEN |
| Render key revoked if unused | [ ] OPEN |

## FINAL ACCEPTANCE

| Item | Mark |
|------|------|
| Founder-exit test would PASS on all FOUNDER_EXIT_TEST rows | [ ] OPEN |
| Buyer operates without any Ankur login | [ ] OPEN |
| Signing possible without Ankur | [ ] OPEN |
| Backup/restore evidenced | [ ] OPEN |
| Title instrument executed (still not a legal sufficiency opinion) | [ ] OPEN |

**Overall: not accepted.** Only pre-closing “public clone” is READY.
