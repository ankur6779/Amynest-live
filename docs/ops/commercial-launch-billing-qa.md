# AmyNest v1.0 — Billing Lifecycle QA (L1)

**Project:** RevenueCat `proj9c1919f0` (AmyNest AI)  
**Entitlement:** `premium` (`entld84a0126e2`)  
**Webhook (updated 2026-07-18):** `https://www.amynest.in/api/subscription/webhook`  
**Apps:** Android Play `com.amynest.app` · iOS App Store `com.amynest.app` · Test Store

---

## Production evidence (already observed)

| Signal | Value (2026-07-18) |
|--------|---------------------|
| RC active subscriptions | **2** |
| RC active trials | 0 |
| DB `provider=revenuecat` ACTIVE | **2** |
| Webhook events processed | INITIAL_PURCHASE×2, RENEWAL×2 (0 failed) |
| Stuck internal trials | **0** |
| Duplicate user subscriptions | **0** |
| Webhook endpoint auth | Rejects unsigned body (`invalid_webhook_signature`) |

Code paths: Android `BillingBridge.kt` · iOS `native-billing-ios.ts` · API `subscription.ts` webhook + `rc-sync` restore.

---

## Manual device matrix (must tick before FULL commercial GO)

### Google Play (closed testing track)

| Scenario | Pass? | Notes / UID |
|----------|-------|-------------|
| Fresh purchase → premium UI | ☐ | Expect RC `INITIAL_PURCHASE` + DB ACTIVE |
| Free trial (if offer configured) | ☐ | |
| Restore on second device / reinstall | ☐ | `rc-sync` purpose=restore |
| Cancel in Play → remains premium until period end | ☐ | |
| Expiration after period | ☐ | |
| Renewal | ☐ | RC shows historical RENEWAL×2 |
| Upgrade / downgrade plan | ☐ | |
| Refund | ☐ | |
| Grace period / account hold | ☐ | `BILLING_ISSUE` / grace states |
| Premium unlock within 30s of purchase | ☐ | |

### Apple App Store (Sandbox / TestFlight)

| Scenario | Pass? | Notes / UID |
|----------|-------|-------------|
| Sandbox purchase → premium | ☐ | |
| Restore purchases | ☐ | |
| Cancel / expire / renew | ☐ | |
| Refund / billing issue | ☐ | |
| Premium unlock within 30s | ☐ | |

### Web (India Razorpay — if in scope)

| Scenario | Pass? |
|----------|-------|
| Checkout → active | ☐ |
| Cancel at period end | ☐ |
| Webhook secret present on Coolify | ☐ |

---

## Webhook verification commands

```bash
# Unsigned probe (expect 401 invalid_webhook_signature — proves route is live)
curl -sS -X POST https://www.amynest.in/api/subscription/webhook \
  -H 'Content-Type: application/json' -d '{}'

# Confirm RC dashboard URL is www (not apex) — apex returns 307
```

After a real purchase, confirm:

```sql
SELECT event_type, processing_status, received_at
FROM revenuecat_webhook_events
ORDER BY received_at DESC LIMIT 10;

SELECT user_id, provider, status, subscription_state, current_period_end
FROM subscriptions
WHERE provider = 'revenuecat';
```
