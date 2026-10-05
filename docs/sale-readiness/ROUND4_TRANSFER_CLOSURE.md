# ROUND 4 — TRANSFER CLOSURE

**Date:** 24 September 2026  
**No secrets.** Documentation ≠ READY.

| Account | Current owner | Transfer method | Buyer receives | Seller action | Vendor approval | Rotate creds | 2FA | Recovery email | Backup | Status |
|---------|---------------|-----------------|----------------|---------------|-----------------|--------------|-----|----------------|--------|--------|
| GitHub `ankur6779/Amynest-live` | ankur6779 (apparent) | Repo transfer or org invite | Admin on repo | Start transfer | GitHub | SSH/PATs | Org 2FA | Change | git is backup | **OWNER ACTION REQUIRED** |
| Domain `amynest.in` | UNVERIFIED registrar | Auth code | Domain | Unlock + code | Registrar | — | — | Update | WHOIS after | **UNKNOWN** |
| DNS | UNVERIFIED (CF likely) | Account / zone | Zone | Invite | Cloudflare | Tokens | Yes | Yes | Export zone | **UNKNOWN** |
| Google Cloud | UNVERIFIED | Project move | Project | IAM | Google | SA keys | Yes | Yes | — | **OWNER ACTION REQUIRED** |
| GCS | same GCP | With project | Buckets | IAM | Google | Yes | Yes | Yes | Object inventory | **OWNER ACTION REQUIRED** |
| Firebase | same GCP | With project | Auth + apps | IAM | Google | Yes | Yes | Yes | User export policy | **OWNER ACTION REQUIRED** |
| Play Console `com.amynest.app` | UNVERIFIED | Play app transfer | Listing + users | Start transfer | **Google** | Keystore stays | Yes | Yes | — | **VENDOR ACTION REQUIRED** |
| Apple Developer / ASC `6767664343` | “Amyworld” listing | App transfer | Listing | Start transfer | **Apple** | New certs | Yes | Yes | — | **VENDOR ACTION REQUIRED** |
| RevenueCat `proj9c1919f0` | UNVERIFIED org | Invite / transfer | Project | Invite | RC | Public/secret keys | Yes | Yes | — | **OWNER ACTION REQUIRED** |
| Razorpay | UNVERIFIED | KYC transfer or re-onboard | Merchant or new | Export + KYC | **Razorpay** | Keys | Yes | Yes | Settlement CSV | **VENDOR ACTION REQUIRED** |
| Google Ads `6395859996` | ankur6779@gmail.com | MCC / transfer | Account | Transfer | Google | — | Yes | Yes | — | **OWNER ACTION REQUIRED** |
| Hosting / Coolify | UNVERIFIED | Access or rebuild | Compose + env | Grant + dump | Coolify host | Yes | Yes | Yes | Image history | **OWNER ACTION REQUIRED** |
| Hetzner worker | UNVERIFIED | Access or rebuild | Server | Grant | Hetzner | SSH | Yes | Yes | — | **OWNER ACTION REQUIRED** |
| Database | UNVERIFIED host | Dump + new instance | Data (if lawful) | Encrypted dump | Host | Yes | — | — | **Restore proof** | **OWNER ACTION REQUIRED** |
| Render | Stale docs | Confirm unused | Nothing if dead | Confirm | — | — | — | — | — | **UNKNOWN** |
| CI/CD GitHub Actions | Repo | With repo | Workflows | New secrets | GitHub | Yes | — | — | — | **OWNER ACTION REQUIRED** |
| Android keystore | Founder-only | **Escrow** (not git) | Keystore + passwords offline | Dual-control handoff | — | N/A | — | — | **Fatal if lost** | **OWNER ACTION REQUIRED** |
| iOS certificates | Founder-only | Apple transfer + new certs | Signing | Transfer + revoke old | Apple | Yes | Yes | Yes | — | **OWNER ACTION REQUIRED** |
| AI (OpenAI / Gemini) | UNVERIFIED | New buyer keys | Continuity after rotate | Revoke founder keys | Vendor TOS | **Yes** | Yes | Yes | — | **OWNER ACTION REQUIRED** |
| TTS (OpenAI / ElevenLabs) | UNVERIFIED | New keys | Same | Revoke | Vendor | Yes | Yes | Yes | GCS cache | **OWNER ACTION REQUIRED** |
| Email `support@` / alerts | UNVERIFIED / `ankur6779@gmail.com` example | MX + mailbox | Inbox | Change `ADMIN_ALERT_EMAIL` | Google/registrar | Yes | Yes | **Yes** | — | **OWNER ACTION REQUIRED** |
| Analytics Firebase/GA4 | UNVERIFIED | With GCP | Properties | IAM | Google | Yes | Yes | Yes | — | **OWNER ACTION REQUIRED** |

**None of the rows is READY.** Overall transfer: **REQUIRES OWNER ACTION** (several also **VENDOR ACTION REQUIRED**).
