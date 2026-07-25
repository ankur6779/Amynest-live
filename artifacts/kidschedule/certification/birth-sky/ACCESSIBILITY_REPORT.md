# Birth Sky Accessibility Report

**Authority:** Pack 8 Part 2  
**App Build:** birth_sky_rc3/1.0.0  
**RC2:** Every item is PASS, FAIL, or WAIVED.

| ID | Item | Status | Evidence |
| --- | --- | --- | --- |
| A11Y-VO | VoiceOver full create→delete path | WAIVED | Physical iOS lab not attached; static SR contracts PASS in CI |
| A11Y-TB | TalkBack full create→delete path | WAIVED | Physical Android lab not attached; static SR contracts PASS in CI |
| A11Y-KB | Keyboard (web) — tablist / dialogs | PASS | segment-nav tablist + dialog aria; accessibility.test.ts |
| A11Y-SW | Switch Control / switch access | WAIVED | Relies on focus system; physical switch lab not attached |
| A11Y-RM | Reduced Motion | PASS | prefers-reduced-motion consulted on dashboard + settings |
| A11Y-DT | Dynamic Type largest category | WAIVED | Device lab not attached; layout uses rem/relative type tags |
| A11Y-FOCUS | Focus restoration after sheet dismiss | PASS | conversation-sheet dialog semantics; static cert |
| A11Y-ROTOR | Rotor navigation (VO) | WAIVED | Requires VoiceOver device lab |
| A11Y-CONTRAST | Contrast AA sample major screens | WAIVED | Design token audit pending A11y owner |
| A11Y-SHELL | Back control labeled / delete modal named | PASS | accessibility.test.ts |

## Certification statement

Static keyboard/dialog/reduced-motion contracts are **PASS** in CI.
Physical VoiceOver/TalkBack/Switch/Dynamic Type/Rotor remain **WAIVED** until A11y completes device lab (risk accepted for engineering RC2).
