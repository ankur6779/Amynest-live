# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: dev-route-redirect.spec.ts >> Dev route redirect (production) >> /dev/phonics-audio-preview redirects to /dashboard
- Location: ../../audit/final-cert/dev-route-redirect.spec.ts:14:9

# Error details

```
Error: expect(received).toContain(expected) // indexOf

Expected substring: "/dashboard"
Received string:    "https://www.amynest.in/sign-in"
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e4]:
    - generic:
      - generic:
        - status "Loading AmyNest" [ref=e5]:
          - generic [ref=e6]:
            - generic [ref=e11]:
              - generic [ref=e12]: Meet
              - generic [ref=e13]: AMY
            - paragraph [ref=e14]: Loading your page…
        - region "Notifications (F8)":
          - list
  - iframe [ref=e15]:
    
```

# Test source

```ts
  1  | /**
  2  |  * Verify dev routes redirect client-side in production.
  3  |  */
  4  | import { test, expect } from "@playwright/test";
  5  | 
  6  | const DEV_ROUTES = [
  7  |   { path: "/debug-parity", expectPath: "/dashboard" },
  8  |   { path: "/dev/phonics-audio-preview", expectPath: "/dashboard" },
  9  |   { path: "/dev/rhymes-audio-ab", expectPath: "/dashboard" },
  10 | ];
  11 | 
  12 | test.describe("Dev route redirect (production)", () => {
  13 |   for (const { path, expectPath } of DEV_ROUTES) {
  14 |     test(`${path} redirects to ${expectPath}`, async ({ page }) => {
  15 |       await page.goto(path, { waitUntil: "domcontentloaded", timeout: 60_000 });
  16 |       await page.waitForTimeout(3_000);
> 17 |       expect(page.url()).toContain(expectPath);
     |                          ^ Error: expect(received).toContain(expected) // indexOf
  18 |     });
  19 |   }
  20 | 
  21 |   test("/debug/learning requires auth (not public dev surface)", async ({ page }) => {
  22 |     await page.goto("/debug/learning", { waitUntil: "domcontentloaded", timeout: 60_000 });
  23 |     await page.waitForTimeout(2_000);
  24 |     const url = page.url();
  25 |     const onSignIn = url.includes("/sign-in");
  26 |     const onDebug = url.includes("/debug/learning");
  27 |     expect(onSignIn || !onDebug, `Unauthenticated access to debug/learning: ${url}`).toBe(true);
  28 |   });
  29 | });
  30 | 
```