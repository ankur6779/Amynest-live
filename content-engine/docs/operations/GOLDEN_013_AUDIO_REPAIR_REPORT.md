# GOLDEN 013 AUDIO REPAIR REPORT

**Date:** 2026-09-01T15:51:33.246Z
**Status:** PASS
**Publish:** not attempted

## Durations

| Metric | Value |
|--------|------:|
| Old master duration | 49.000s |
| Old narration duration | 45.840s |
| Picture end (pre-black pad) | 28.000s |
| Preserved video duration | 28.067s |
| New narration duration | 23.520s |
| Mixed audio duration | 28.067s |
| Final master duration | 28.067s |
| Breathing room after last word | 4.547s (music under endcard; last spoken word ends ~23.5s) |
| Blackdetect on final | 0.000s |

## New narration text

```
It's eight forty-seven PM. Big feelings after school. Calm down lands like gasoline. You both need air. Amy appears as a warm guide. Health Lab includes breath-control play and a calmness meter. One shared breath can bring a family back into the same room. Download AmyNest AI.
```

Word count: **49**

## Golden 013 integrity

| Check | Result |
|-------|--------|
| Source golden | `golden-013` — Breath Play That Helps Kids Find Calm |
| Feature | Health Lab Breath & Calm |
| Situation coverage | 92.9% |
| Product coverage | 60.9% |
| Hope coverage | 100.0% |
| Speech Practice / foreign markers | none |
| assertGoldenVoiceIntegrity | PASS |

## Video stream unchanged

| Check | Result |
|-------|--------|
| Source master | `/Users/macbook/AmyNestProject/AmyNest-AI-p0-integrity/.amynest-assets/kie-veo-720p-golden-013/amynest-veo-720p-golden-013.mp4` |
| Extract method | `ffmpeg -t 28.000 -an -c:v copy` (trim black pad only) |
| Final mux | `-c:v copy` + new AAC audio |
| Scene / KIE regeneration | **none** |
| Video frames | existing picture stream preserved (no Veo/KIE video) |

## Audio coverage

| Check | Result |
|-------|--------|
| TTS model | gemini-3.1-flash-tts-preview |
| Chunk-based TTS | yes (3 chunks) |
| Completeness floor | 13.72s |
| Measured duration | 23.52s |
| Last word before video end | YES |
| Mid-narration silence | none (music-only tail after VO is intentional) |
| Music under | yes (existing `audio/music.wav` @ low level) |
| Time-stretch of 45.84s VO | **not used** |
| Aggressive speed-up | **not used** |

## KIE spend

| Metric | Value |
|--------|------:|
| KIE video generation calls | **0** |
| KIE video credits consumed | **0** |
| KIE TTS credits (audio only) | n/a (Gemini TTS fallback or unreported) |

## Output

`/Users/macbook/AmyNestProject/AmyNest-AI-p0-integrity/.amynest-assets/kie-veo-720p-golden-013/amynest-veo-720p-golden-013-audio-fixed.mp4`

---

GOLDEN 013 AUDIO-ONLY REPAIR COMPLETE —
VIDEO PRESERVED — ZERO VIDEO GENERATION CREDITS SPENT.
