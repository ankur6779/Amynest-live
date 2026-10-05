# PRODUCTION AUTHORIZATION AUDIT

**Date:** 24 September 2026  
**Non-destructive.** No deploy of the UI harden until authorized.

## Answers

1. **Is demo@amynest.in a real production account?**  
   **YES as a product identity.** Hardcoded exemptions: unlimited children, unlimited devices, email-verification bypass, Birth Sky allowlist. RevenueCat email search returned **no customer**. Live dashboard session used this email in Round 2.

2. **What role does it have?**  
   **Privileged QA / demo**, not a normal parent. Growth-admin is **not hardcoded** in `isGrowthAdminUser`. Dev example sets `ADMIN_GROWTH_EMAILS=demo@amynest.in`. Production env value: **UNVERIFIED**.

3. **Why did it see Growth OS?**  
   `admin-growth.tsx` rendered full chrome **while the query was loading**. Refresh was disabled (`isFetching`). That is **IA leak / loading chrome**, not proof the dashboard JSON returned 200.

4. **Is Growth OS intended for production?**  
   Yes — shipped route + API. Intended for allowlisted admins.

5. **Is `/admin/growth` accessible to normal users?**  
   Route is reachable if signed in (`makeProtectedRoute`). Chrome used to show before 403. APIs: **401 without auth** (verified live).

6. **Is authentication sufficient for APIs?**  
   Anonymous `GET /api/admin/growth/dashboard` → **401**. Anonymous `GET /api/admin/growth/gos/overview` → **401**.

7. **Is authorization sufficient?**  
   `isGrowthAdminUser` requires `ADMIN_USER_IDS` or `ADMIN_GROWTH_EMAILS`. **Cannot confirm production allowlist contents.** If production copied the dev example, demo is an admin.

8. **Is data exposed?**  
   Anonymous: **no** (401). Demo-with-admin-env: **possible**. Not proven this pass (no ID token).

9. **Can a buyer/user modify data?**  
   Growth APIs include settings/experiment writes behind the same gate. Anonymous: no.

10. **Can a non-admin access admin APIs?**  
    Unauthenticated: **401**. Authenticated non-admin: expected **403** (code). **Not live-tested** without a second account.

## Verdict

**Not an unauthenticated critical RCE.**  
**P0 residual:** production allowlist unknown; demo is a privileged identity; loading chrome leaked admin IA (repo now waits for access check — **not deployed**).

Do not apply the “critical vuln → max 69” cap from this finding alone. Ownership cap already 69.
