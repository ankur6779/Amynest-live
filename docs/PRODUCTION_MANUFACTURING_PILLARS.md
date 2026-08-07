# AmyNest Production Manufacturing — Four Pillars

**Status:** NON-NEGOTIABLE · Founder law  
**Applies to:** Every redesign after Welcome V3 foundation  
**Welcome `/begin`:** Permanently frozen  

Every redesign must satisfy **ALL FOUR** pillars simultaneously.  
If any pillar fails — stop, review, do not ship.

---

## Pillar 1 — Premium Experience

Every screen must feel premium.

- Apple-level craftsmanship  
- Luxury materials  
- Refined spacing  
- Beautiful motion  
- Photography-first where the moment requires it  

**Reject:** cheap SaaS feeling · HTML feeling · engineering-looking UI  

---

## Pillar 2 — Product Experience

Every interaction must reduce parent anxiety.

- Every screen answers **one question only**  
- **One** primary action  
- No confusion  
- No feature competition  
- No emotional pressure  

### Question Tax Law (absolute)

- Every additional question is a tax  
- Every tap must earn its existence  
- If the product can infer safely, never ask  
- If the product must ask, immediately demonstrate why the answer mattered  
- Parents feel smarter after every answer — never more tired  

See: `docs/AMYNEST_PHILOSOPHY.md` · `mayAskParentQuestion()` in `amynest-philosophy.ts`  

---

## Pillar 3 — Production Safety

**NON-NEGOTIABLE. Never regress production.**

No redesign may break:

| Auth & session | Platform & commerce | Quality |
|---|---|---|
| Google Sign Up | Deep Links | Accessibility |
| Apple Sign In | OAuth redirects | Loading states |
| Facebook Login | Firebase | Offline behavior |
| Email Login | RevenueCat | Existing APIs |
| Forgot Password | Analytics | Navigation |
| Verify Email | Feature Flags | Error Recovery |
| Session handling | Token refresh | Authentication flow |

If visual improvements require functionality changes → **stop. Review first.**

Never trade reliability for beauty.

---

## Pillar 4 — Conversion

Every decision must improve at least one of:

- Signup %  
- Activation %  
- Retention %  
- Subscription %  

If it improves visuals but hurts conversion → **reject it.**

---

## Engineering Rule — Reuse Before Rewrite (absolute)

If functionality already exists in the codebase:

1. **Discover** it first  
2. **Reuse** or **safely refactor** it  
3. Build a **new** implementation only when existing architecture cannot support the use case  

Before implementation:

1. Search for existing modules, APIs, schema, UI primitives, and helpers  
2. Study production dependencies and callers  
3. Prefer extend/adapt over duplicate  
4. Preserve every business rule  
5. Refactor only when safe  
6. Never rewrite stable systems unnecessarily  
7. Document why a greenfield path was required (if ever)

**FAIL:** parallel implementations of the same capability without justification.  

---

## Final Quality Gate — Six Reviews (absolute)

A feature is **COMPLETE** only if **all six** pass:

1. Founder Review  
2. Parent Review  
3. Apple Craft Review  
4. Engineering Review  
5. Database Review  
6. Growth Review  

**Automatic FAIL:** beautiful but unstable · technically perfect but emotionally weak · good UX but poor conversion · good conversion but broken trust  

Engineering sub-gate (necessary, not sufficient):

- [ ] Build passes  
- [ ] Tests pass  
- [ ] OAuth / Google / Apple / Facebook / Email work  
- [ ] Analytics fire  
- [ ] No console errors  
- [ ] Mobile + desktop verified  
- [ ] Accessibility preserved  
- [ ] Existing users unaffected  
- [ ] Database impact reviewed  
- [ ] Growth / conversion impact reviewed  

Full law: `docs/AMYNEST_MANUFACTURING_LAW.md`

Beauty, emotion, trust, conversion, and engineering must pass together.

---

## Relation to prior freezes

| Layer | Status |
|---|---|
| Welcome (R1–R3.6 + Philosophy) | Permanently frozen |
| Signup Keep (R6) | Permanently frozen |
| Child Discovery Day-0 questions | Permanently frozen |
| Child Discovery Phase 3 craft | Permanently frozen — `docs/v2/CHILD_DISCOVERY_PHASE3_PRODUCTION.md` |
| Today Home | Apple final 1% craft complete — `docs/v2/TODAY_HOME_APPLE_FINAL_1PCT.md` — frozen |
| Parent Hub | Rooms locked Help·Understand·Care·Moments — validation `docs/v2/PARENT_HUB_ROOM_VALIDATION.md` — **no code until Founder** |
| Question Tax Law | Absolute — see `docs/AMYNEST_PHILOSOPHY.md` |
| Today Home Law | Absolute — product decides next; parent never chooses among options |
| Six Reviews Manufacturing Law | Absolute — see `docs/AMYNEST_MANUFACTURING_LAW.md` |
| Reuse Before Rewrite | Absolute — discover → reuse/refactor → new only if architecture cannot support |

See also: `docs/WELCOME_V3_PRODUCTION_FOUNDATION.md` · `docs/AMYNEST_PHILOSOPHY.md` · `docs/AMYNEST_MANUFACTURING_LAW.md` · `docs/SIGNUP_V3_KEEP_EXPERIENCE.md` · `docs/v2/CHILD_DISCOVERY_BLUEPRINT.md` · `docs/v2/TODAY_HOME_BLUEPRINT.md`
