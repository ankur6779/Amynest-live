# FINAL SECRET CLOSURE PLAN

**Date:** 24 September 2026  
**Status: NOT ESCROWED — PROCEDURE READY**  
Do **not** collect values. Do **not** create plaintext secret files.  
Ceremony: `TRANSFER/SECRET_ESCROW_CEREMONY.md`. Names: `TRANSFER/SECRET_ESCROW_MANIFEST.md`.

Buyer handover point = Phase 1 of `TRANSFER/BUYER_CLOSING_SEQUENCE.md` (under signed terms).  
Rotation point = after buyer control verified (Phase 3–4), not before.

| Category | Current state | Required owner action | Safe storage | Buyer handover point | Rotation point | Acceptance test |
|----------|---------------|----------------------|--------------|----------------------|----------------|-----------------|
| Android upload keystore | **ESCROWED** `AMYNEST-ANDROID-ESCROW-2026-10-02-15a19d9e`; not in git | Encrypt keystore + alias notes | Offline encrypted archive | Closing escrow delivery | Only if Play reset | Buyer `bundleRelease` signs `com.amynest.app` |
| iOS signing | NOT ESCROWED | Encrypt certs/profiles | Same archive | Closing | Typical: new certs after ASC transfer | Buyer-signed IPA |
| APNs | Existence UNKNOWN | Confirm + encrypt `.p8` if used | Same | Closing | After transfer | Test push **or** written unused |
| Birth Sky key | UNKNOWN if set | Confirm; escrow if set | Same | Closing; load scratch **before** rotate | Dangerous if early | Scratch decrypt **or** unused |
| Database | Host UNKNOWN; URL not escrowed | Hostname + encrypted dump (preferred) and/or URL in archive | Archive **outside Git** | Closing | On new host | Scratch restore R/W |
| Redis | Host UNKNOWN | Hostname + URL in archive | Same | Closing | New instance | Worker processes a job |
| GCS | SA JSON name only | JSON in archive; no git | Same | Closing | New SA | `healthz/audio` on buyer SA |
| Firebase | Admin + VITE names | JSON + client IDs in archive | Same | Closing | New project or rotate | Sign-in + push |
| AI APIs | Names on GH | Inventory which are live | Same | Closing | **Buyer new keys + TOS** | One TTS/LLM on buyer key |
| OAuth | Google/Apple/YouTube names | List clients; no secrets in git | Same | Closing | Recreate clients | Native + web sign-in |
| RevenueCat | Inferred Coolify | Secret + webhook in archive | Same | Closing | After buyer admin | Webhook 2xx + offering edit |
| Email | Mailbox UNKNOWN | Inbox password if any | Same | Closing | Buyer mailbox | Test to `support@` |
| Cloudflare | Token **name** | Token in archive | Same | Closing | New token | Pages + Worker deploy |
| CI/CD | GH secret names | Recreate on buyer repo (do not sell `ankur6779` login) | Buyer org secrets | After repo transfer | Immediate on buyer repo | Green Actions |
| Deployment | Coolify env + Hetzner SSH name | Env export encrypted; SSH in archive | Same | Closing | New SSH + Coolify env | Buyer deploy |
| Optional Sentry/Slack/Razorpay/Render | Live use UNKNOWN | Confirm; escrow if set | Same | If used | Revoke Render after unused | Written unused **or** test |

**Acceptance of this plan:** procedure exists. **Escrow is not complete.**
