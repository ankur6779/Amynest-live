# AmyNest Thumbnail Learning Engine 1.0

**Version:** 1.0.0  
**Kill-switch:** `AMYNEST_THUMBNAIL_LEARNING=0` (default **on**)

Additive **CTR feedback loop** — learns which thumbnails raise CTR from **real YouTube Analytics only**.

Does **not** modify:

- Rendering
- Publishing
- Thumbnail Engine
- Validators
- Production pipeline

---

## Mission

Every published video becomes training data.

```
Published Video → Thumbnail features → YouTube Analytics
  → CTR / Impressions / Views / Watch Time / AVD / Retention
  → Permanent store → Pattern detection → Recommendations
```

No guesses. No new API providers. Uses existing `YouTubeAnalyticsProvider` / `MockAnalyticsProvider`.

---

## Stored permanently

| Feature | Outcome |
|---------|---------|
| Variant, headline, length, style | CTR |
| Emotion, characters, face size, eye contact | Retention |
| Background, color palette | Watch time |
| Feature category, topic, day, time | AVD / impressions |

---

## Pattern detection

Automatically ranks (trusted samples only, default ≥100 impressions):

- Headline length
- Emotions
- Cast: Amy only / Amy+Girl / Amy+Boy / Group
- Backgrounds
- Colors
- Headline style
- CTA style
- Layouts / framing

---

## Auto-optimization

Writes `thumbnail-learning-recommendations.json` for **future** generation:

- Highest CTR layouts / colors / character placement
- Highest CTR headline style / framing / emotions

**Thumbnail Engine code is not modified.** Load recommendations when you choose to wire them later:

```ts
import { loadThumbnailLearningRecommendations } from "../thumbnail-learning-engine/index.js";
```

---

## A/B history

Never forgets previous results:

- Top 100 thumbnails
- Worst 100 thumbnails
- Reason tags (`winning-emotion:…`, `hit-ctr-10`, `low-ctr`, …)

Store path (default):

`content-engine/thumbnail-learning-engine/data/thumbnail-learning-store.json`

---

## Reports

| File | Contents |
|------|----------|
| `THUMBNAIL_LEARNING_REPORT.md` | Patterns + recommendations |
| `TOP_THUMBNAILS.md` | Best CTR thumbnails |
| `LOW_PERFORMING_THUMBNAILS.md` | Worst CTR thumbnails |
| `MONTHLY_CTR_REPORT.md` | Monthly CTR buckets |
| `thumbnail-learning-dashboard.html` | Avg CTR, trend, winners |
| `thumbnail-learning-recommendations.json` | Machine-readable prefs |

---

## Quality targets

| Horizon | CTR |
|---------|-----|
| Current | **> 10%** |
| Long-term | **> 15%** |

---

## Usage

```bash
# Offline / CI (MockAnalyticsProvider — deterministic fixture metrics)
node --import tsx/esm content-engine/thumbnail-learning-engine/cli.ts \
  --mock=1 --video-ids=id1,id2,id3 --out=./out/thumbnail-learning

# Real YouTube Analytics (existing provider + token)
node --import tsx/esm content-engine/thumbnail-learning-engine/cli.ts \
  --video-ids=VIDEO_ID_1,VIDEO_ID_2 \
  --access-token="$YOUTUBE_ACCESS_TOKEN" \
  --out=./out/thumbnail-learning
```

Programmatic:

```ts
import { MockAnalyticsProvider } from "../analytics/providers/mock.js";
import { runThumbnailLearningEngine } from "../thumbnail-learning-engine/index.js";

const pack = await runThumbnailLearningEngine({
  provider: new MockAnalyticsProvider(),
  videoIds: ["abc", "def"],
  outputDir: "./out/thumbnail-learning",
});
```

Every new upload ingested makes the store smarter. Re-run after Analytics has CTR + impressions for published videos.
