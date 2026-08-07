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

## Engineering Rule

Before implementation:

1. Study existing production code  
2. Understand dependencies  
3. Identify risks  
4. Preserve every business rule  
5. Refactor only when safe  
6. Never rewrite stable systems unnecessarily  

---

## Final Quality Gate

Before Founder Review, verify:

- [ ] Build passes  
- [ ] Tests pass  
- [ ] OAuth works  
- [ ] Google Login works  
- [ ] Apple Login works  
- [ ] Facebook Login works  
- [ ] Email Login works  
- [ ] Analytics fire  
- [ ] No console errors  
- [ ] Mobile responsive  
- [ ] Accessibility preserved  
- [ ] Existing users unaffected  

Only then present for Founder Review.

Beauty and engineering must improve together.

---

## Relation to prior freezes

| Layer | Status |
|---|---|
| Welcome (R1–R3.6 + Philosophy) | Permanently frozen |
| Signup Keep (R6) | Manufacturing — must pass all four pillars |
| Child Discovery | Not allowed until Founder opens it |

See also: `docs/WELCOME_V3_PRODUCTION_FOUNDATION.md` · `docs/AMYNEST_PHILOSOPHY.md` · `docs/SIGNUP_V3_KEEP_EXPERIENCE.md`
