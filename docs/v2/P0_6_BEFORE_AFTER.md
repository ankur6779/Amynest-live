# P0.6 Before / After — Law of Three

**Sprint:** P0.6 Hierarchy / composition only  
**Law:** 1 Emotional Hero · 1 Primary Action · 1 Supporting Object  
**Not changed:** typography tokens · spacing tokens · lighting · navigation · materials · Brain · routing · components

---

## Per-screen Before → After

### Landing (V2 Front Door path)

| Role | Before | After |
|------|--------|-------|
| Hero | H1 + badges + Meet AMY + avatar all compete | Brand promise H1 |
| Primary | Get the app **and** Try on Web equal | **Try on Web** Bloom-weight |
| Support | Multiple trust lines + age line | One support line |
| Quieted | — | Badges · Meet AMY · stores/QR · nav Get-app · Get-app secondary |

### Front Door

| Role | Before | After |
|------|--------|-------|
| Hero | H1 + orb + brand + progress | Step H1 |
| Primary | Bloom CTA | Bloom CTA (`primary`) |
| Support | Support line | Support line (`support`) |
| Quieted | — | Brand whisper · progress whisper · orb peer · non-selected Soft Plates |

### Today

| Role | Before | After |
|------|--------|-------|
| Hero | Greeting + focus + message + Mission + Coach peers | **Today's focus** (else greeting) |
| Primary | Mission CTA (ok) but peers compete | Mission CTA (`primary`) |
| Support | Message at `text-foreground` (competed) | Amy message muted (`support`) |
| Quieted | — | Coach Soft Plate peer · Ask Amy · Premium · eyebrows · greeting when focus present |

### Mission Play

| Role | Before | After |
|------|--------|-------|
| Hero | Title + Speech + steps ink | Mission title |
| Primary | Mark complete | Mark complete (`primary`) |
| Support | Steps as loud Soft Plate | Steps muted Soft Plate (`support`) |
| Quieted | — | Speech eyebrow whisper |

### Mission Success

| Role | Before | After |
|------|--------|-------|
| Hero | Orb + H1 + bridge equal energy | H1 |
| Primary | Coach / Back stack | One primary · Back recedes when Coach leads |
| Support | Body + bridge | Body (`support`) · bridge peer |
| Quieted | — | Orb peer · Ask Amy recede |

### Coach

| Role | Before | After |
|------|--------|-------|
| Hero | Headline + eyebrow + ink spans | Journey headline |
| Primary | Continue Bloom | Continue (`primary`) |
| Support | Body with foreground emphasis | Body support · muted emphasis |
| Quieted | — | Eyebrow whisper |

### Ask Amy

| Role | Before | After |
|------|--------|-------|
| Hero | Headline | Immediate help headline |
| Primary | Start **and** 3 prompt Soft Plates | **Start** Bloom only |
| Support | Context line | Context (`support`) |
| Quieted | — | Prompt catalogue peer + muted ink |

### Premium

| Role | Before | After |
|------|--------|-------|
| Hero | H1 | Continue the journey |
| Primary | Continue + Restore + plan glow | Continue (`primary`) |
| Support | Trust line | Trust (`support`) |
| Quieted | — | Plans peer · non-selected recede · badge whisper · Restore recede |

### Signup (V2 calm)

| Role | Before | After |
|------|--------|-------|
| Hero | Neon ring + title | Continuity title |
| Primary | Multi-OAuth + submit | Submit (`primary`) |
| Support | Continuity subline | Continuity (`support`) |
| Quieted | — | Neon ring opacity · OAuth stack peer |

### For Child

| Role | Before | After |
|------|--------|-------|
| Hero | H1 | For {name} |
| Primary | Save CTA | Save (`primary`) |
| Support | Hope + second para twin | Hope (`support`) · second para peer |

### Guest Sheet

| Role | Before | After |
|------|--------|-------|
| Hero | Title | Title (`hero`) |
| Primary | Continue | Continue (`primary`) |
| Support | Body | Body (`support`) |
| Quieted | — | Not now whisper |

---

## Composition cookbook (P0.6)

| Token | Class | Use |
|-------|-------|-----|
| `V2_HIERARCHY_PEER` | `opacity-80` | Soft Plate peers (Coach, prompts, plans) |
| `V2_HIERARCHY_RECEDE` | `opacity-70` | Below-fold catalogue / tertiary CTAs |
| `V2_HIERARCHY_WHISPER` | `opacity-60` | Eyebrows · chrome · dismiss |
| `v2LawRole(role)` | `data-v2-law` | Audit / test markers |

---

## Production drift (locked)

| System | Held |
|--------|------|
| Type | hero 36 · caption 13 |
| Space | 8→64 |
| Nav | h-14 · 22 · blur 24 |
| Soft Plate | 8% · rim · flat |
| Lighting | bloom escape · orb emit · Morning/Evening/Night |

Only hierarchy opacity / role markers / ink demotion evolved.
