# Amy AI — Final Visual + UX Polish Review

**Status:** POLISHED PRODUCTION SURFACE · PENDING REAL-DEVICE QA  
**Date:** 2026-08-16  
**Branch:** `main`  
**Baseline:** `29959edb` (conversation workspace already shipped)  
**Authority:** Founder Order — Amy AI final visual + UX polish audit  

This is **not** a redesign. This is **not** a Final Apple Audit.  
VoiceOver / Dynamic Type / TalkBack / physical IME are **not** claimed.

AI prompts, model, memory, quotas, API contracts, DB schema, Firebase, RevenueCat, auth, and business logic were **not** changed.

---

## Baseline

Shipped workspace already had:

- blank new chat
- local session history (drawer / sidebar)
- `AmyAIIcon`
- markdown rendering
- fullscreen `visualViewport` composer on mobile
- client `amy_ai_latency` marks
- “Amy is thinking…” / 4s family-context line

The previous review (`docs/v2/AMY_AI_CONVERSATION_EXPERIENCE_REVIEW.md`) was **directionally correct** and **not fully correct on identity**:

- The surface was still a **generic night void** (`#08060c`) vs Amy Coach / Amy Audio / Parent Hub evening rooms (`#141018 → #1a1520 → #121018`).
- Blank copy was a three-line hero, not the quiet “What’s on your mind?” target.
- Loading still used a **card + bouncing dots** (typing theatre).
- History drawer was missing a screen-reader dialog title (Radix warning).
- Amy mark features were thin at 16–24px.

---

## Findings → smallest corrections

| # | Finding | Change | Not done |
|---|---|---|---|
| 1 | Chat too black/generic vs AmyNest rooms | Warm sanctuary evening gradient (Coach/Audio house). No photography, conversation stays primary | Did not turn chat into a decorative room |
| 2 | Blank state slightly catalog-like | Copy: mark + “Hi, I'm Amy.” + “What's on your mind?” + 3 chips. Icon 40px. Vertically centered in remaining column | No feature mall |
| 3 | Mark faint at 16–24px | Larger eyes/stroke, cream `#F4E6D4`, quieter smile | No second identity |
| 4 | Header a bit heavy | 22px mark, thinner hairline, less padding | Structure kept: Back / History / Amy / New chat |
| 5 | History felt gray-SaaS | Cream active wash; rename/delete 44px; hover-only on desktop | Leave continuity kept (P0 leave law), quieter card |
| 6 | Long replies needed editorial type | 15px / 1.65, heading spacing, wrap, autolink bare `https://` | Model text unchanged |
| 7 | Loading felt like a chatbot | App-theme: Amy mark + status copy, no dots/card. Subtle breathe; reduced-motion off | No fake streaming |
| 8 | Error CTA verbose | “Back” | Calm copy unchanged |
| 9 | Drawer a11y | `SheetTitle` / `SheetDescription` (sr-only) | Device VO not claimed |
| 10 | 4s slow threshold | **Kept.** Context-before-enqueue can exceed 4s; 4s is when freeze anxiety starts | Did **not** refactor `getAmyOperatingContext` |

No DB / API / prompt / quota / auth / RevenueCat stop condition was hit.

---

## Exact changes

| File | Polish |
|---|---|
| `amy-ai-workspace.css` | Evening sanctuary field, empty centering, editorial markdown, composer/send, breathe, focus rings, light day paper |
| `amy-ai-icon.tsx` | Small-size readable face |
| `amy-ai-conversation-workspace.tsx` | Quiet blank copy; “Back”; 22px header mark; sheet title |
| `amy-ai-history-panel.tsx` | Active cream; 44px rename/delete |
| `amy-message-bubble.tsx` | App thinking: mark + copy only; 22px avatar |
| `amy-markdown.tsx` | Bare URL autolink + wrap |
| Fixture | Long reply + `panel=slow` (5.5s) for wait copy |

---

## AmyNest consistency

Compared with `/begin`, Today Home, Parent Hub, Help, Moments, Amy Coach, Amy Audio:

| Token | AmyNest living rooms | Amy AI after polish |
|---|---|---|
| Field | Evening `#141018–#1a1520` + cream radial | Same house |
| Type | Quicksand titles, cream ink | Same |
| Accent | Restrained cream, not orange bars | Composer/send cream wash |
| Photography | Rooms use FE photography | **Intentionally none** — conversation is primary |
| Motion | Quiet | Mark breathe on wait only |
| Navigation | Back + leave to Today/Hub | Header back; leave in history footer |

Smallest identity correction was the **field**, not a new visual universe.

---

## New chat

Intentional, not empty:

- Mark (40px)
- “Hi, I'm Amy.”
- “What's on your mind?”
- Three optional chips

Verified at **360 / 390 / 430 / desktop 1200**. **375** is the same stack as 360–390. Tablet uses the 900px sidebar split.

---

## Amy mark

One component `AmyAIIcon`:

- Recognizably Amy (quiet cream face)
- 16px test asserts eye radius
- 22px header / 22px bubbles / 40px empty
- Dark + light fills
- No neon, knot, or Cursor mark

---

## Header / history

Header recedes: hairline only. Identity is small mark + name or thread title.

History flows (experience-layer, already shipped) remain:

New chat → send → title in list → New chat keeps old → search/open/continue → delete confirm → rename.

Mobile: slide-over, close control, `aria-current` on the open thread. Not a dashboard.

---

## Readability

Long fixture reply: heading, numbered list, quote, autolinked URL. No raw `**`. No giant cards. Amy text is editorial on a transparent surface.

---

## Mobile composer

**Browser fixture (this VM), not a physical device.**

| Check | Evidence |
|---|---|
| 360 / 390 / 430 composer visible at bottom | Screenshots |
| Multiline grow to 120px | Existing `useAutoGrowTextarea` |
| Send 44px | Workspace CSS |
| `visualViewport` fullscreen &lt;900px | Existing chat platform |
| Safe-area footer | `env(safe-area-inset-bottom)` |
| Physical IME / rotation / Safari toolbar | **DEVICE REQUIRED** |

Do not treat fixture screenshots as iPhone/Android keyboard certification.

---

## Scrolling

Unchanged platform rules: auto-scroll near bottom; respect upward reading; “Jump to latest”; reopen lands on latest. Not re-certified on device.

---

## Latency

Instrumentation unchanged. Server path unchanged:

UI submit → POST (includes **`getAmyOperatingContext` before enqueue**) → 200 or `{jobId}` → poll → persist → render.

**No first token.** Delay is visible. Wait is calm and truthful. **4 seconds remains the UI threshold** — it is the parent freeze line, not a claim about median model time. Do not hide the context-before-enqueue bottleneck.

Fixture `panel=slow` (5.5s) showed “Amy is thinking…” then the reply.

---

## Accessibility (static / browser)

| Item | Result |
|---|---|
| Labels (Back, History, New chat, Send, Search, Close) | Present |
| Drawer title/description | Added this polish |
| Focus rings | Cream `:focus-visible` |
| Touch ≥44px on primary controls | Yes |
| Contrast cream on evening field | Static OK |
| Reduced motion | Breathe disabled |
| VoiceOver / Dynamic Type / TalkBack | **NOT PASS** |

---

## Performance

No measured duplicate-request or markdown-cost issue. No extra virtualization. Living workspace still skips briefing auto-fetch and does not auto-open history.

---

## Screenshots

<img alt="360 blank new chat" src="/opt/cursor/artifacts/amy_ai_polish_360_empty.webp" />
<img alt="430 history drawer" src="/opt/cursor/artifacts/amy_ai_polish_430_history.webp" />
<img alt="430 long Amy reply" src="/opt/cursor/artifacts/amy_ai_polish_430_thread.webp" />
<img alt="Amy is thinking" src="/opt/cursor/artifacts/amy_ai_polish_thinking.webp" />
<img alt="Desktop sidebar and blank chat" src="/opt/cursor/artifacts/amy_ai_polish_desktop_empty.webp" />
<img alt="Desktop active thread" src="/opt/cursor/artifacts/amy_ai_polish_desktop_thread.webp" />

Also captured: 390 empty, 430 empty, focused composer, slow-path reply.

---

## Regression

| Gate | Result |
|---|---|
| `pnpm --filter @workspace/kidschedule run typecheck` | PASS |
| Relevant vitest (markdown, icon, latency, sessions, chat-thread) | PASS |
| `pnpm --filter @workspace/kidschedule run build` | PASS (`✓ built in 22.66s`) |

---

## Remaining debt

- Flat server message log (no multi-device sessions) — schema stop still holds
- No token streaming
- `getAmyOperatingContext` still on the HTTP thread before enqueue
- Titles are first-sentence, not model-rewritten
- Delete/rename local only
- Physical keyboard / VoiceOver / Dynamic Type / TalkBack **DEVICE REQUIRED**
- Living OFF still uses the legacy tabbed assistant

---

## Final visual blind test

1. Looks like AmyNest? **Yes, after the evening-field correction.**  
2. Modern AI workspace? **Yes.**  
3. ChatGPT clone? **No** — sanctuary cream/ink, not void + green.  
4. Cursor clone? **No.**  
5. Amy recognizable? **Yes.**  
6. Blank state intentional? **Yes.**  
7. History intuitive? **Yes.**  
8. Composer excellent on mobile? **Architecture yes; device IME not certified.**  
9. Long-form reading comfortable? **Yes in fixture.**  
10. Waiting trustworthy? **Yes — thinking, then truthful slow line.**  
11. Old SaaS/chatbot leftover? **Mostly gone.** Leave continuity in history is a Nest exit, not a dashboard.

### Score

| Axis | Score |
|---|---|
| Visual Identity | 8.5 |
| Conversation UX | 9 |
| Mobile UX | 8 (device IME outstanding) |
| History UX | 8.5 |
| Accessibility | 7 (static only) |
| Performance | 8.5 |
| AmyNest Consistency | 8.5 |
| Premium Feel | 8.5 |
| Trust | 9 |
| **Overall** | **8.5** |

Amy AI is a **stable production surface pending real-device QA**.

**STOP.** Do not start another module. Do not touch Routine. Do not touch P0/P1. Do not rerun the Apple Audit.
