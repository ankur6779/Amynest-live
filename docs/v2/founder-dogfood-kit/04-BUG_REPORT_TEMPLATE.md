# 4. Bug Report Template

**One bug per report.** Attach video clip or timestamp in the full recording.

---

```text
Title: [short — what broke / confused]

Severity: P0 | P1 | P2
(P0 = blocked dogfood path · P1 = major confusion / wrong destination · P2 = polish)

Device:
OS:
Build: (version / TestFlight / APK / URL / git SHA)

Steps:
1.
2.
3.

Expected:

Actual:

Video attached: Y/N
Video file / timestamp:

Screenshot: Y/N

Repro rate: Always / Sometimes / Once

Account state: Guest / Signed-in / Anonymous / Unknown

Flags known?: (leave blank if unsure)

Additional notes:
```

---

## Severity guide (founder dogfood)

| Level | Meaning | Examples |
|-------|---------|----------|
| **P0** | Cannot complete Front Door → Mission → Today | Crash, blank screen, COMPLETE loop, raw auth wall mid-journey CTA |
| **P1** | Completes but trust/clarity breaks | Double back, wrong hierarchy, Premium surprise, sheet wrong copy |
| **P2** | Polish | Spacing, copy tone, minor label |

## Naming

`BUG-{initials}-{n}-{short-slug}`  
Example: `BUG-RK-01-mission-no-back`
