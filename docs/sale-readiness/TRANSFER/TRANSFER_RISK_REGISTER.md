# TRANSFER RISK REGISTER

**Date:** 24 September 2026  
No overall score. Levels: **CRITICAL** · **HIGH** · **MEDIUM** · **LOW**

| ID | Risk | Level | Why | Mitigation (not done) |
|----|------|-------|-----|------------------------|
| TR-01 | Source legal title UNKNOWN | **CRITICAL** | No LICENSE; MIT field; © footer; no executed assignment | Execute assignment; counsel on MIT |
| TR-02 | Founder-only credentials | **CRITICAL** | GH secrets, Coolify env, CF token, Hetzner SSH | Escrow + rotate onto buyer |
| TR-03 | Android upload keystore not escrowed | **CRITICAL** | Not in git (correct) and not handed over | Dual-control escrow; confirm Play App Signing |
| TR-04 | iOS signing materials not escrowed | **CRITICAL** | Certs/profiles founder Keychain | Escrow + post-transfer new certs |
| TR-05 | Database recovery untested | **CRITICAL** | Host UNKNOWN; restore FAIL 24 Sep | Dump + scratch R/W test |
| TR-06 | Domain ownership unknown | **CRITICAL** | No WHOIS/registrar proof | Auth-code transfer |
| TR-07 | Store transfer unverified | **CRITICAL** | Play/ASC only SELLER-STATED; eligibility unknown | Start vendor transfers; do not assume |
| TR-08 | Patent scope unresolved | **CRITICAL** | INCLUDED/EXCLUDED unchecked; still Ankur’s | Sign election |
| TR-09 | Production secrets not transferable as files | **CRITICAL** | Live in GH/Coolify; no buyer escrow | Offline secret ceremony |
| TR-10 | Birth Sky field encryption key not escrowed | **HIGH** | Named env; loss = unreadable PII | Escrow |
| TR-11 | Coolify git integration unknown | **HIGH** | Repo hooks API empty | Disclose App/poll/webhook |
| TR-12 | Two Hetzner IPs documented | **HIGH** | Wrong host = dead worker | Owner names live IP |
| TR-13 | GCS media inventory missing | **HIGH** | Bucket name known; objects not listed | Inventory |
| TR-14 | Ads remain on founder Gmail | **HIGH** | Campaign historically ENABLED | MCC transfer; do not edit here |
| TR-15 | Child data may be non-assignable | **HIGH** | Privacy / DPDP | Counsel; possible delete vs sell |
| TR-16 | Public repo + MIT metadata | **HIGH** | Implied public grant argument | Counsel; consider private after transfer |
| TR-17 | No branch protection on `main` | **MEDIUM** | Accidental prod deploy | Enable on buyer org |
| TR-18 | Render API key still in GH secrets | **MEDIUM** | Stale plane; leak/resume risk | Revoke after confirm unused |
| TR-19 | Sentry/Slack/KIE/YouTube live-use unknown | **MEDIUM** | Surprise bills or silent deps | Owner confirm |
| TR-20 | Razorpay only seller-stated unused | **MEDIUM** | Code still present | Export if needed |
| TR-21 | Legal pages live vs repo | **MEDIUM** | Prior live-copy FAIL | Authorized deploy |
| TR-22 | Open-Meteo has no account | **LOW** | Public API change | Monitor |
| TR-23 | Historic GH Environments noise | **LOW** | Render-era names | Delete after confirm |

**CRITICAL items are all OPEN.** Any one of TR-01–TR-09 is enough to keep operational close incomplete.
