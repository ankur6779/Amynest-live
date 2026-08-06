# Home API Law

**Status:** BINDING  
**Authority:** Founder  
**Canonical home:** [`V3_HOME_CONTRACT.md`](./V3_HOME_CONTRACT.md) §V (survival document — prefer Contract if conflict)  
**Companions:** [`RESIDENT_LAW.md`](./RESIDENT_LAW.md) · [`ONE_MEMORY_LAW.md`](./ONE_MEMORY_LAW.md) · [`FOUNDER_DEATH_TEST.md`](./FOUNDER_DEATH_TEST.md)  
**Scope:** All frameworks · AI providers · billing providers · SDKs · Platform V3 · future capability

---

## The Law

The Home

is the primary API.

Frameworks are adapters.

AI providers are adapters.

Billing providers are adapters.

SDKs are adapters.

Nothing outside

the Home

may define

the user experience.

---

## Meaning

| Truth | Implication |
|-------|-------------|
| **Home is primary API** | Rooms, shell, memory, atmosphere, navigation — Home contracts define what the parent experiences |
| **Everything else is adapter** | ChatPlatform, coach engines, speech engines, OpenAI/Gemini/etc., RevenueCat/store, Capacitor plugins — adapt **into** Home |
| **UX sovereignty** | No adapter may dictate layout, chrome, loading theatre, identity, or emotional language |

---

## Adapter rule

An adapter may:

- Execute (compute, stream, charge, authenticate, notify)  
- Return data the Home already knows how to hold  
- Fail gracefully into Nest prepare / Home error air  

An adapter may **not**:

- Define the user experience  
- Own shell, navigation, atmosphere, or memory  
- Surface its own product identity inside AmyNest  
- Force visitor chrome (spinners, mode dashboards, store DNA as Nest care)

---

## Stack (conceptual)

```
Parent experience
       ↑
   THE HOME  ← primary API (rooms · shell · memory · continuity)
       ↑
   adapters  ← frameworks · AI · billing · SDKs
```

Invert this stack → violate Home API Law.

---

## Founder gate

> Does the Home define the experience — with this provider only as adapter?

| Answer | Action |
|--------|--------|
| **Yes** | May proceed |
| **No — outside defines UX** | Reject. Wrap or replace until Home is primary. |

---

## Relation

| Document | Role |
|----------|------|
| [`V3_HOME_CONTRACT.md`](./V3_HOME_CONTRACT.md) | Home permanent · frameworks temporary |
| [`RESIDENT_LAW.md`](./RESIDENT_LAW.md) | Adapters deepen rooms; they are not products |
| [`ONE_MEMORY_LAW.md`](./ONE_MEMORY_LAW.md) | Adapters read/write through Home memory |
| [`PLATFORM_V3_ARCHITECTURE.md`](./PLATFORM_V3_ARCHITECTURE.md) | Replace visitor frameworks with Home-primary adapters |

---

## STOP

Binding. No implementation implied.
