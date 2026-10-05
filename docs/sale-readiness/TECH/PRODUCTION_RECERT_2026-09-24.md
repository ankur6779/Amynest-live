# PRODUCTION RECERT 24 SEP 2026

**Host:** https://www.amynest.in  
**Method:** Cursor browser. One session already signed in as `demo@amynest.in`.  
**Code changes from this sprint were not deployed.** Live UI still has pre-fix marketing copy.

| Surface | Result | Evidence |
|---------|--------|----------|
| Homepage / splash | **PASS** | Title “AmyNest AI — Where Smart Parenting Begins”; AmyWorld operator lines |
| Dashboard / Today | **PASS** | `/dashboard` — “Today’s plan”, Child 5, “Wake up & freshen up”, AQI “Air quality is poor” |
| Age / child switcher | **PASS** | John 2 months; Child 2 5y; Child 3 10y; Audit-Toddler; Child 5 3y6m; Add child |
| Environmental selection | **PARTIAL** | Live AQI message on Today; dedicated `/environment` not separately opened |
| Rooms / Help / Understand / Care / Moments | **PARTIAL** | Nav links present; not all rooms opened |
| Nutrition / Learning / Play / Speech Coach | **PARTIAL** | Nav present; not opened end-to-end |
| Birth Sky | **PARTIAL** | Nav link present |
| Ask Amy `/assistant` | **NOT VERIFIED** | Navigation hit splash overlay; not completed |
| Routine generate | **NOT VERIFIED** | Same splash on second tab |
| Onboarding / signup | **NOT VERIFIED** | Session already logged in |
| Premium / paywall / `/pricing` | **NOT VERIFIED** | Splash only |
| Audio / GCS / printables / coloring / curiosity / videos / stories | **NOT VERIFIED** | Not opened |
| Health Lab / Gaming Hub / infant | **NOT VERIFIED** | Infant child exists (John 2 months); module not opened |
| Desktop layout | **PARTIAL** | Dashboard usable in desktop browser |
| Mobile layout | **NOT VERIFIED** | Viewport not switched |
| Debug `/debug/learning` | **PASS (redirect)** | Landed on `/dashboard` (prod debug redirect) |
| Admin `/admin/growth` | **FAIL / EXPOSED TO DEMO** | Growth OS chrome loaded for `demo@amynest.in` (API allowlist likely includes demo; lock screen not shown) |

**P0 product defects found in live cert:** none that break Today for the demo account.  
**P0 security observation:** demo account reaches Growth OS UI.  
**Do not claim full production certification.**
