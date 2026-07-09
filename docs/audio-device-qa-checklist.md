# Device QA Checklist — Audio Instant Playback

**App build / pack version:** _______________  
**Tester:** _______________  
**Date:** _______________  

Paste after each device:
```js
copy(window.__amynestAudioReliability.latencySummary())
JSON.stringify(window.__amynestAudioReliability.latencyReport(), null, 2)
```

## Pass criteria (per device)

| Metric | Pass |
|--------|------|
| Hot bundled tap P95 | &lt; 50ms |
| Cached P95 | &lt; 100ms |
| First CDN P95 | &lt; 600ms |
| Educational TTS % | 0% (`source_mix.tts_percent`) |
| Silent failures / 200 taps | 0 |
| Watchdog storms | none unexpected |

---

## Android WebView (Play Store `android/`)

| Scenario | Low-end | Mid | Flagship | Notes | PASS/FAIL |
|----------|---------|-----|----------|-------|-----------|
| Cold launch → first phonics letter | | | | | |
| Warm letter tap | | | | | |
| Replay same clip | | | | | |
| Rapid 20 taps | | | | | |
| Offline (airplane) hot pack | | | | | |
| Slow 3G first lesson para | | | | | |
| Background 30s → foreground | | | | | |
| Bluetooth disconnect mid-play | | | | | |
| Headphones unplug | | | | | |
| Silent / mute switch | | | | | |
| Incoming call interruption | | | | | |

OS versions exercised: 10 / 11 / 12 / 13 / 14 / 15 (circle)

## iOS Capacitor

| Scenario | iPhone | iPad | Notes | PASS/FAIL |
|----------|--------|------|-------|-----------|
| Cold launch | | | | |
| Warm / replay | | | | |
| Offline hot pack | | | | |
| BG → FG | | | | |
| Headphones / BT | | | | |
| Silent mode | | | | |
| Interruption | | | | |

## Browsers

| Browser | Cold | Warm | Offline SW | PASS/FAIL |
|---------|------|------|------------|-----------|
| Chrome | | | | |
| Safari | | | | |
| Edge | | | | |
| Firefox | | | | |

## Sign-off

- [ ] Pack `validate:audio-pack` OK on this build  
- [ ] `latencySummary` attached for each device class  
- [ ] Educational TTS % = 0 on curriculum paths  
- [ ] No silent failures  

**Overall device QA:** PASS / FAIL  
**Blockers found:** _______________
