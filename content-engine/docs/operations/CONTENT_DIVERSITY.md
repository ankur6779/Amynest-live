# Content Diversity — Production Fix

**Version:** 1.0.0  
**Kill-switch:** `AMYNEST_CONTENT_DIVERSITY=0` (default **on**)

Fixes the production bug where Golden Scripts change but Shorts still feel like the **same video** (same room, tablet, camera, CTA, metadata).

Does **not** modify: Rendering · Providers · Validators · Character Bible · AI Director · Performance Director.

---

## Allow-list justification

1. **Production bug** — channel quality destroyed by template sameness  
2. **KPI** — improves CTR / Retention by making each Short a distinct cinematic identity  

---

## What changes

| Layer | Behavior |
|-------|----------|
| Scene library | Kitchen, reading corner, garden, astro night, phonics fridge wall, … |
| Planner | Locations / cameras / Amy poses / feature props chosen **from script topic** |
| Feature props | Phonics→magnets/CVC · Speech→mirror/mic · Health→stretch/water · never Study Zone tablet for unrelated features |
| Metadata | Unique title, description, hashtags, playlist from script |
| Thumbnails | Rotating hero composition + script headline |
| Gate | Similarity to previous **20** Shorts must be **≤ 40%**; Diversity Score **> 90**; reject reused opening location / same-room templates |
| World style | Photoreal environments + stylized Amy AI (Paddington/Ted); Indian lived-in homes; story-driven locations/cameras/props |

---

## Mandatory report

`CONTENT_DIVERSITY_REPORT.md` written to the production output dir before Veo generation.

---

## Wiring

- `creative-composition/plan.ts` → calls `diversifyCompositionPlan`
- `operations/google-production-run.ts` → `runContentDiversityGate` before compose; persist fingerprint after upload
- Store: `content-diversity/data/content-diversity-store.json`

---

## Target

**Content Diversity Score > 90**
