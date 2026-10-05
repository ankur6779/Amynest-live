# BUYER-DEPENDENT CLOSURE LIST

**Date:** 2 October 2026  
Only items that require a buyer account, buyer credentials, buyer acceptance, a vendor transfer to the buyer, a buyer-signed build, buyer-operated infrastructure, buyer domain/email, or buyer billing.

Play **app transfer** and Apple **app transfer** are on this list as **closing mechanics**, **not** current commercial P0s (owner 2 Oct 2026).

| Item | Blocker | Why buyer-dependent |
|------|---------|---------------------|
| Buyer GitHub org + accept repo transfer | SB-B01 | Destination org + GitHub accept |
| Buyer-triggered Actions / Coolify from buyer remote | SB-F02 | Buyer secrets + buyer remote |
| Buyer GCP / Cloudflare / Coolify / Hetzner admin | SB-F01 | Buyer logins + vendor accept |
| Buyer Firebase / GCS SA | SB-K01 | Buyer project IAM |
| Buyer Play Developer + accept app transfer | SB-H02 | Buyer account + Play |
| Buyer-signed AAB | SB-H01 | Buyer machine after escrow |
| Buyer Apple Developer + accept app transfer | SB-I02 | Buyer account + Apple |
| Buyer-signed IPA / TestFlight | SB-I01 | Buyer machine after escrow |
| Buyer `.in` + DNS zone | SB-J01 | Buyer registrar + vendor |
| Buyer `support@` mailbox + MX | SB-J02 | Buyer mail |
| Buyer RevenueCat admin + webhook on buyer infra | SB-L01 | Buyer RC + buyer API |
| Buyer store billing consoles | SB-L01 / H02 / I02 | After store transfers |
| Buyer FA/GA4 / Ads admin | SB-M01, M02 | Buyer Google accounts |
| Buyer new AI keys + TOS | Founder-exit AI row | Buyer vendor orgs |
| Scratch restore **on buyer infra** (owner scratch can be done pre-buyer) | SB-G02 (buyer half) | Buyer Postgres |
| Buyer independent operation / founder-exit PASS | SB-P01 | All of the above |
| Counter-sign assignment / bill of sale | SB-A02 | Buyer signatory |

Vendor transfers (GitHub, Play, Apple, CF, GCP, Hetzner, RC, Ads, registrar) appear here because they need a **buyer destination**.
