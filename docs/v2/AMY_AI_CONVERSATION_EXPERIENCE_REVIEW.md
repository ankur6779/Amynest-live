# Amy AI Conversation Experience — Implementation Review

**Status:** EXPERIENCE-LAYER REMANUFACTURED · STREAMING UNAVAILABLE · SCHEMA UNCHANGED  
**Date:** 2026-08-16  
**Branch:** `main`  
**Baseline HEAD:** `c609a50f`  
**Authority:** Founder Order — Amy AI conversation experience remanufacture  

This is **not** a Final Apple Audit. This is **not** VoiceOver / Dynamic Type / TalkBack certification.  
Routine Generation, Parent Hub, P0/P1, and other modules were not modified.

---

## 1. Current UI diagnosis

Baseline screenshot problems (pre-change `/assistant` companion chrome):

| Problem | Cause |
|---|---|
| Oversized legacy header | Layout mobile header still shown (`BrandLogo` + mascot + hamburger). `/assistant` was not immersive. |
| Neon / game Amy icon | `AmyIcon` with ring glow in the conversation header and bubbles |
| Conversation occupies the page immediately | `GET /api/ai/messages` auto-hydrated the thread |
| No new-chat blank state | Empty copy sat under briefing cards / leftover history |
| No persistent chat history | Server stores a **flat** per-user list (`user_ai_messages`), not sessions |
| Weak mobile keyboard | Assistant `ChatThread` used **embedded** layout, not fullscreen `visualViewport` |
| Input competing with conversation | Leave-continuity block + orange “Latest” jump bar under the thread |
| Raw `**markdown**` | Amy bubbles rendered `whitespace-pre-wrap` text |
| Unexplained wait | Loading dots only; no slow-path copy; no client latency marks |
| Returning felt like an old chatbot page | Modes/tabs still in living-OFF; living-ON still auto-loaded history |

---

## 2. Information architecture

```
Amy AI (immersive /assistant)
├── Compact header: Back · History (mobile) · Amy identity · New chat
├── Conversation workspace (primary)
│   ├── Blank new chat  OR  active thread
│   └── Composer (keyboard-aware)
└── History
    ├── Desktop/tablet: left sidebar (≥900px)
    ├── Mobile: slide-over drawer
    ├── New chat · Search · Today / Yesterday / Older
    ├── Rename · Delete (local, confirmed)
    └── Leave continuity (Today Home · Parent Hub)
```

No dashboard. No marketing panel. No giant hero. Settings/account is **not** a new product here — exits live in history footer via existing `AmyNestLeaveContinuity`.

---

## 3. New chat architecture

Entering Amy AI (living/companion ON):

- Does **not** auto-open the previous thread
- Starts a clean in-memory conversation titled `New chat`
- Empty conversations are **not** written to local history or the database
- First user message titles the session and inserts it into history
- Header `+` / history **New chat** preserve the previous session and show the blank welcome
- Composer autofocuses on desktop (≥900px) only — mobile does not force the keyboard open

Living OFF (`VITE_FF_ASK_AMY_LIVING_V1=0` / universe legacy) keeps the previous tabbed assistant. Default living universe uses the new workspace.

---

## 4. Chat history architecture

**Stop condition:** backend/database changes were **not** required.

Server truth remains `GET/DELETE /api/ai/messages` — a flat list. The unused `conversations` table has no `userId` and is not Amy AI.

Experience-layer sessions live in `localStorage` key `amynest:amy-ai:sessions:v1:{userId}`:

- stable conversation id (not shown in UI)
- title from first user line
- createdAt / updatedAt
- message list

First visit with a non-empty server list **seeds one archived session** and still opens a blank new chat. Delete/rename are **local only** — calling server `DELETE /api/ai/messages` would wipe every turn.

---

## 5. Amy AI icon / logo replacement

Reusable `AmyAIIcon`:

- Cream disc, quiet ink face, no glow filter, no purple orb, no ChatGPT knot, no Cursor mark
- Used in header, empty state, typing bubble, Amy messages
- Small-size readable; works on dark sanctuary and light cream

`AmyIcon` / `AmyMascotLogo` neon treatments remain elsewhere; the conversation surface no longer uses them.

---

## 6. Desktop UI

- `/assistant` is immersive: layout header and desktop app sidebar hidden
- History sidebar 240–280px; chat is the primary column
- Compact header; composer max-width 3xl, sticky in the thread column
- Jump-to-latest is a quiet pill, not an orange “Latest” bar

---

## 7. Mobile UI

- Slide-over history drawer (`Sheet`, left, ~86vw, does not consume width when closed)
- Compact header owns Back / History / Amy / New chat
- Leave continuity moved **out** of the composer stack into the history footer
- Suggestion chips wrap; no horizontal overflow in the fixture at ~390–430px

---

## 8. Keyboard implementation

Amy AI `ChatThread` uses `layout="fullscreen"` below 900px (existing `useKeyboardChatLayout` + `visualViewport`). Desktop uses `embedded` so the history sidebar is not covered by a full-viewport overlay.

Composer:

- grows to 120px
- Enter sends on fine pointers; Return does not send on coarse (mobile)
- `env(safe-area-inset-bottom)` on the footer
- Send control 44×44 in workspace CSS

**Device IME** (iOS/Android keyboard covering composer) is **not certified on this VM**. Architecture is the existing chat platform, not `100vh`.

---

## 9. Scroll behaviour

Existing chat platform:

- auto-scrolls on new messages when near the bottom
- “Jump to latest” when scrolled up >160px
- does not force-jump while reading older messages

Opening an old conversation lands at the latest (platform `scrollDeps` include the message list). No new orange Latest bar.

---

## 10. Response rendering

`AmyMarkdown` (presentation only; model text unchanged):

- headings, bold, italics, lists, quotes, http(s) links, inline code
- no HTML execution
- numbered `**Start with a Wind Down**` renders as a real list + strong — raw `**` not shown in tests or screenshots

---

## 11. Streaming status

**NO STREAMING. Do not fake it.**

`POST /api/ai/assistant-ai` → `submitAiJobAndRespond` → 200 JSON or `{ jobId }` + poll `GET /api/result/:jobId`.

UI:

- “Amy is thinking…” immediately
- After 4s: “Amy is taking a little longer because she's considering your family's context.”
- Full answer renders when the poll/sync body arrives

---

## 12. Latency investigation

Traced (no backend edits):

| Stage | Where | Notes |
|---|---|---|
| UI submit | `AmyAiConversationWorkspace.sendMessage` | `requestStart` |
| Auth fetch | `useAuthFetch` POST | token if signed in |
| Request handler | `artifacts/api-server/src/routes/ai.ts` | **before** enqueue |
| Family context | `getAmyOperatingContext` | prefs → `refreshFamilyIntelligence` → timeline(100) → **persist briefing/graph/timeline** |
| Prompt construct | same handler | system prompt + last 6 client turns |
| Enqueue | `submitAiJobAndRespond` | rate limit then queue |
| HTTP wait | prod BullMQ `waitMs=0` | usually 202 `{ jobId }` **after** context work |
| Model | `openai.chat`, 600 max tokens | no first-token API |
| Poll | client 2s × 30 | until terminal |
| Persist | `persistAssistantExchange` | flat `user_ai_messages` |
| UI render | markdown | after full `answer` |

**Measured, not guessed:** client `amy_ai_latency` (`queueClientLog`, no conversation content).  
**Not measurable from the client:** context vs model split inside the job.  
**Likely server bottleneck (code path, not a production sample):** `getAmyOperatingContext` runs on the HTTP thread **before** enqueue, including family intelligence refresh and artifact writes. Model time then sits behind poll. Do not mask this with fake tokens.

---

## 13. Latency breakdown (client marks)

| Mark | Meaning |
|---|---|
| `requestStart` | send tapped |
| `fetchStart` / `fetchEnd` | POST envelope (includes server context+enqueue) |
| `pollStart` | set only when body has `jobId` |
| `responseComplete` | answer JSON unwrapped |
| `persistenceComplete` | local session upsert |
| `totalMs` | start → persist (or response) |
| `asyncJob` | poll path vs sync 200 |

Slow copy threshold: `AMY_AI_SLOW_MS = 4000`. Parents never see `API latency 4.8s`.

---

## 14. Error / empty states

Empty: `AmyAIIcon` · “Hi, I'm Amy.” · “How can I be beside you today?” · supporting line · three optional chips.

Error: “Something interrupted Amy's reply.” · **Try again** (same user text) · **Back to conversation**. User turn is kept in the session.

402 quota: existing soft-continue copy; quotas unchanged.

---

## 15. Accessibility

Wired labels: Back, Open history, New chat, Close history, Search conversations, Send, composer placeholder, Conversation history dialog, message `article` labels, typing `role="status"`.

Touch: header/history/send ≥44px in the workspace. Contrast: cream on `#08060c` / ink on `#f7f1e8`.

**Not claimed:** VoiceOver, Dynamic Type, TalkBack, physical device keyboard. DEVICE REQUIRED.

---

## 16. Performance

- Living workspace skips auto-load into the visible thread and skips `amy-daily-briefing` query
- History is local; no extra FTS service
- Markdown is a small renderer (no new MD library)
- Virtualization not added (typical Ask Amy threads are short)
- Chat-thread props (`showDraft=false`) avoid a live draft bubble

---

## 17. Data / persistence approach

| Layer | Behaviour |
|---|---|
| Server | Unchanged flat `user_ai_messages`; last-6 history still posted to `/api/ai/assistant-ai` |
| Client sessions | localStorage per user; empty chats omitted |
| Seed | one archive from server list if local store empty |
| Delete/rename | local only |
| Search | title + already-loaded message text |

No schema/API/prompt/quota/RevenueCat/Firebase change.

---

## 18. Files changed

| Path | Role |
|---|---|
| `pages/assistant.tsx` | Companion → workspace; skip history auto-open |
| `components/layout.tsx` | `/assistant` immersive |
| `components/ask-amy/amy-ai-*` | Workspace, history, icon, CSS |
| `lib/ask-amy/conversation-*` | Titles, sessions |
| `lib/ask-amy/amy-markdown.tsx` | Safe render |
| `lib/ask-amy/amy-ai-latency.ts` | Client marks |
| `components/chat-thread/*` | markdown, typing label, jump class, Enter-on-coarse, send label |
| `playwright-amy-ai-workspace.html` + fixture | Visual harness |

---

## 19. Tests

```
pnpm exec vitest run --config vitest.config.ts \
  src/lib/ask-amy/conversation-title.test.ts \
  src/lib/ask-amy/conversation-sessions.test.ts \
  src/lib/ask-amy/amy-markdown.test.tsx \
  src/lib/ask-amy/amy-ai-latency.test.ts \
  src/components/ask-amy/amy-ai-icon.test.tsx \
  src/lib/ask-amy/living-room.test.ts \
  src/components/amy-nest-leave-continuity.test.tsx \
  src/lib/chat-thread.test.ts
```

**8 files / 25 PASS** (21 new/related + 4 existing chat-thread).

Also: `pnpm run typecheck:libs` PASS · `pnpm --filter @workspace/kidschedule run typecheck` PASS.

---

## 20. Production build

`pnpm --filter @workspace/kidschedule run build` **PASS** (`✓ built in 23.26s`).

---

## 21. Mobile verification

| Width | Result |
|---|---|
| ~390–430px | Compact header, blank welcome, drawer history, composer at bottom |
| Desktop ~1200px | Left Chats sidebar + blank/thread column |
| 360 / landscape / physical IME | **Not device-certified** on this VM |

Keyboard: fullscreen `visualViewport` wiring present; real iPhone/Android IME **DEVICE REQUIRED**.

---

## 22. Before / after

**Before:** oversized AmyNest header, neon orb, auto-loaded thread, orange Latest bar, leave bar under composer, raw markdown.

**After:**

<img alt="Mobile new chat blank state" src="/opt/cursor/artifacts/amy_ai_mobile_empty.webp" />
<img alt="Mobile history drawer" src="/opt/cursor/artifacts/amy_ai_mobile_history.webp" />
<img alt="Mobile thread with rendered markdown" src="/opt/cursor/artifacts/amy_ai_mobile_thread.webp" />
<img alt="Mobile send and Amy reply" src="/opt/cursor/artifacts/amy_ai_mobile_reply.webp" />
<img alt="Desktop sidebar + blank new chat" src="/opt/cursor/artifacts/amy_ai_desktop_empty.webp" />

<video src="/opt/cursor/artifacts/amy_ai_conversation_workspace_walkthrough.mp4" controls></video>

---

## 23. Remaining debt

- Server still has **one flat message log**; multi-device session sync needs a schema (stopped; not changed)
- **No token streaming** until the job API streams
- Family-context work on the **HTTP thread before enqueue** is the honest slow path
- Titles are first-sentence, not model-rewritten (“John's sleep struggles”)
- Search is local only
- Delete does not remove server rows (by design)
- Device a11y / IME / Dynamic Type uncertified
- Living OFF still uses the legacy tabbed assistant

---

## Blind test

1. **Modern conversation workspace?** Yes — blank start, history, compact header, calm composer.  
2. **Blank new chat on enter?** Yes, when living/companion is ON.  
3. **Reopen old conversations?** Yes, from history (seeded archive + local sessions).  
4. **Proper chat history?** Yes at the experience layer; not a server session table.  
5. **Mobile keyboard comfortable?** Architecture yes (`visualViewport`); physical IME not certified here.  
6. **Composer above keyboard?** Same platform as other fullscreen chats; device still required.  
7. **New icon feels like AmyNest?** Yes — cream/ink companion face, not a generic AI knot.  
8. **Responses rendered cleanly?** Yes — markdown lists/bold in tests and screenshots.  
9. **Latency measured?** Yes — `amy_ai_latency` client marks; server split documented from code.  
10. **Slow-response feedback?** Yes — thinking, then 4s family-context line.  
11. **Feels like AmyNest?** Yes — sanctuary cream/ink, Quicksand, leave continuity. Not a ChatGPT clone.  
12. **AI/business logic changed?** **No.** Prompts, memory, quotas, RevenueCat, Firebase, API contracts, DB schema untouched.

---

**STOP.** Do not start another AmyNest module.
