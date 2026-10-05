# REVENUECAT ACCOUNT OWNERSHIP (2 OCT 2026)

**Not a transfer. No invitations sent. No keys printed.**

Queried via RevenueCat API against the connected seller project (no dashboard mutation).

| Field | Finding | Type |
|-------|---------|------|
| Production project | `proj9c1919f0` — name **AmyNest AI** | **VERIFIED** |
| Second project on same API key | `proj04992681` — name `project-G8jlulZm` (created ~4 minutes earlier) | **VERIFIED** (disclose; not production billing) |
| Collaborators on `proj9c1919f0` | **One:** Ankur Raman `<ankur6779@gmail.com>` role **owner**; `accepted_at` null (owner row); MFA **false** | **VERIFIED** |
| Play app | `app7b7fc89f20` type `play_store`; package `com.amynest.app`; **Play service-account credentials configured = true** | **VERIFIED** |
| App Store app | `appa31011b39a` type `app_store`; bundle `com.amynest.app`; **ASC API key configured = true**; **subscription key configured = true** | **VERIFIED** |
| Test Store app | `app5c5ca2ad1a` | **VERIFIED** |
| Entitlement | `premium` (`entld84a0126e2`, display AmyNest Premium) | **VERIFIED** |
| Webhook | `whintgr515736810e` name AmyNest → `https://www.amynest.in/api/subscription/webhook` | **VERIFIED** |

**Not shown by this query:** a vendor “transfer project to another RevenueCat org” button; Google/Apple **store** transfer; webhook HMAC secret (never returned by list).

Legal entity on the RevenueCat **billing/org** (company vs personal) is **not** in this payload. Owner login is **personal Gmail**.
