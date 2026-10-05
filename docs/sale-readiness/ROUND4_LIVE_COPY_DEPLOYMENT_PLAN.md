# ROUND 4 — LIVE COPY DEPLOYMENT PLAN

**Do not deploy from this document.**  
**Live site is NOT corrected.** Repo (Round 2) already has replacements. Verified live 24 Sep 2026 via `curl` + homepage.

| Location | Current live wording | Correct wording (repo / allowed) | Evidence | Deploy required | Store review? |
|----------|----------------------|----------------------------------|----------|-----------------|---------------|
| Homepage meta / SEO | “patent-pending adaptive scheduling technology” | Application **202611059355 filed**. Not granted. | HTML 24 Sep | **YES** (web) | No |
| JSON-LD | AmyWorld `legalName`; “organization behind AmyNest” | Keep as **trading name** only if Path A; do not claim registered owner | HTML 24 Sep | **YES** if legalName overclaims | No |
| Splash / footer | “AmyNest AI is a product of AmyWorld” / “Developed and operated by AmyWorld” | Path A: operated under the AmyWorld **name**; Path B: only after CIN | Homepage snapshot | **YES** | No |
| `/privacy` | “owned and operated by AmyWorld” | Operator-name language (repo already softened) | `curl -L` 24 Sep | **YES** | No |
| `/terms` | “product owned and operated by AmyWorld” | Same | `curl -L` 24 Sep | **YES** | No |
| In-app i18n (after deploy) | Live still old bundle | 12,000+ / 30+ studies / 87% already removed in repo | repo vs live | **YES** | No |
| Cinematic stats/testimonials | Live old if that landing ships | Repo: no 95% / 10,000+ / named fake reviews | repo | **YES** if that bundle is live | No |
| App Store listing | historically “patent-pending” | Application number or strip | diligence notes; **not re-fetched this gate** | Owner rewrite | **YES** |
| Play listing | UNVERIFIED current text | Same | **UNKNOWN** | Owner check | **YES** if changed |

Repo already removed: 12,000+, 10,000+ parents, 87%, 95% satisfaction, named fake testimonials, generic “provisional patent filed.”  
**Those removals are not live.**

Do not claim the live site is corrected until a post-deploy `curl` / store screenshot matches the “correct wording” column.
