# AmyNest Teacher OS — Pilot Guide

**Version:** v9.0 RC  
**Audience:** LPS teachers in controlled pilot

## Access

- Web: `/teacher-os` (also from Parent Hub → **AmyNest Teacher OS**)
- Legacy URL `/worksheet` opens Worksheet Studio inside Teacher OS

## What works in pilot

| Module | Capability |
|--------|------------|
| Dashboard | Natural-language lesson command → full teaching pack |
| Teaching Pack | Lesson plan, worksheets, homework, assessment, parent message |
| Daily / Weekly Planner | Local AI-assisted planning |
| Curriculum | Topic memory & suggestions |
| Worksheet Studio | Generate, edit, export PDF/DOCX/PNG |
| Reconstruction | Photo/PDF → editable worksheet |
| Lesson Chat | Guided commands (regex intents, not full LLM) |
| Search | Navigate to modules from pack results |

## Known limitations (pilot)

- **DOCX** exports text blocks only — not full canvas artwork
- **Print** prints the current page; use PDF for multi-page
- **Data** is device-local (localStorage + IndexedDB) — no cloud sync
- **Lesson Chat** is guided commands, not open-ended GPT chat
- **Admin dashboard** requires pilot mode flag (not URL in production)

## Pilot mode (internal)

Enable via browser console:

```js
localStorage.setItem('teacher-os-pilot-mode-v81', '1');
location.reload();
```

## Support

Use **Feedback** button (top-right) in Teacher OS. Include screenshot when reporting layout or export issues.

## Release checklist

Before GA: zero `pnpm typecheck` errors, async AI job polling verified in production, pilot crash-free rate > 99%.
