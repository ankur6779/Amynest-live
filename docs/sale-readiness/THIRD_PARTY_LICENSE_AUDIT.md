# THIRD-PARTY LICENSE AUDIT

**Date:** 24 September 2026  
**Not an SBOM. Not counsel advice.**

| Layer | Observation | Buyer risk |
|-------|-------------|------------|
| Root `package.json` | `"license": "MIT"` | Implies outbound MIT; **no LICENSE file** |
| pnpm lockfile | Hundreds of npm packages | Typical MIT/Apache/BSD mix **UNVERIFIED in full** |
| GPL/AGPL | Prior targeted search found no hits (14 Sep) | **NOT a full audit** |
| Fonts / icons / images | Mixed | UNKNOWN per file |
| Audio / TTS | OpenAI TTS; GCS cache | Vendor TOS |
| Video / YouTube pipeline | content-engine scripts | Platform TOS |
| AI APIs | OpenAI, Gemini, ElevenLabs | No model ownership |
| Capacitor / Play / Store SDKs | Standard | Transfer with apps |
| RevenueCat | Commercial SaaS | Account transfer |

**Can a buyer legally operate?**  
Technically yes **if** they obtain vendor accounts and the owned code is assigned.  
**They cannot be told the repo is a clean proprietary asset** while `package.json` says MIT and no assignment exists.

**LICENSE decision:** Do **not** add a LICENSE file in this pass. Counsel must choose: keep MIT (hurts exclusive sale) vs proprietary / all-rights-reserved (may need to revoke implied MIT). Documented in `handover/LICENSE_DECISION.md`.
