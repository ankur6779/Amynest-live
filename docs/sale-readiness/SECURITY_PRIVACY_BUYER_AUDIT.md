# SECURITY / PRIVACY BUYER AUDIT

**Date:** 24 September 2026  
**Not a legal compliance opinion. Not a penetration test.**

| Area | Finding | Status |
|------|---------|--------|
| Auth | Firebase email/Google/Apple/Facebook | PARTIAL — live config UNVERIFIED |
| Authorization / premium bypass | `decidePremiumRouteAccess` in AppCore | PARTIAL — no adversarial retest this pass |
| Secrets in git | Env examples only (good). Buyer will scan history | PARTIAL |
| Debug routes | `/speech-coach-v2-debug`, `/openai-realtime-test`, `/debug/*` gated in AppCore | PARTIAL — confirm production flags off |
| Admin | Growth OS | PARTIAL — auth strength UNVERIFIED |
| Storage / signed URLs | GCS TTS | PARTIAL |
| CORS / rate limits | Present in API historically | NOT VERIFIED this pass |
| Child data / PII | Profiles, routines, speech, health | HIGH sensitivity |
| Account deletion | `/delete-account` route | PARTIAL — completeness UNVERIFIED |
| Processors | Firebase, RC, Razorpay, OpenAI, ElevenLabs, GCS, ads | Need DPA list |
| Privacy / terms | Routes exist | Copy claims AmyWorld ownership — **conflicts with IPO applicant** |
| Consent / parental | Child profiles 0–12 | UNVERIFIED legal sufficiency |
| Analytics privacy | Firebase + first-party | PARTIAL |
| Landing claims | “12,000+ Parents”, “30+ research studies”, Harvard-adjacent history in prior attack test | **P0 advertising risk** |

**No major CVE hunt was run.** Do not claim PASS.

**Status: PARTIAL.** Hard-cap 69 would apply if a critical vulnerability is later confirmed; none was independently proven this pass.
