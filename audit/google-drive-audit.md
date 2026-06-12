# Phase 6 — Google Drive Audit

**Generated:** 2026-06-11T18:45:00Z

---

## Reference Inventory

**Total `drive.google.com` references in codebase:** 47 matches across 7 files

| File | Role |
|------|------|
| `artifacts/api-server/src/lib/googleDrive.ts` | Core Drive API client |
| `artifacts/api-server/src/routes/stories.ts` | Story Hub sync + stream |
| `artifacts/api-server/src/routes/reels.ts` | Reels video listing |
| `artifacts/api-server/src/routes/coloring.ts` | Coloring book PDFs |
| `artifacts/api-server/src/routes/funsheets.ts` | Funsheets |
| `artifacts/api-server/src/routes/worksheets.ts` | Worksheet thumbnails |
| `artifacts/kidschedule/src/components/daily-kids-activity.tsx` | 38 hardcoded folder URLs |
| `artifacts/kidschedule/src/components/art-craft-reels.tsx` | Reels embed |
| `artifacts/kidschedule/src/components/printable-worksheets.tsx` | Thumbnail links |

---

## Folder IDs

| ID | Usage | Expiration Risk |
|----|-------|-----------------|
| `1q4bvGXt7h2yug-gGgybNpnf9_Dx2QKaj` | Story Hub video folder 1 | **HIGH** — tied to service account + sharing |
| `1pSrec0X4nD3cTwf68qylNCFlKJbACjA4` | Story Hub video folder 2 | **HIGH** |
| `1rZqwBYoSIxnDIXBO4XvIqN5b4UBnbQD3` | Reels + daily kids activity (38 refs) | **HIGH** |

---

## Production Health Probe

**Endpoint:** `GET /api/healthz/drive`

```json
{
  "ok": true,
  "driveConfigured": true,
  "activeVar": "GOOGLE_API_KEY",
  "storyFolderVideoCount": 3,
  "sampleFileId": "1nTh4XGXfVt23vvSI1s1A41xCx-jdLiQx"
}
```

| Check | Status |
|-------|--------|
| Drive API configured | YES |
| Story folders reachable | YES |
| Video count | **Only 3** — content sparsity concern |
| Sample file accessible | YES |

---

## Access Model

| Flow | Pattern |
|------|---------|
| Story playback | `/api/stories/stream/:driveFileId` — GCS when mirrored, Drive proxy fallback |
| Reels | `/api/reels/stream/:fileId` |
| Coloring/funsheets | Server-side Drive download |
| Daily kids activity | **Client iframe embed** to Drive folder — depends on public sharing |
| Worksheets | `drive.google.com/thumbnail?id=` |

---

## Risk Assessment

| Risk | Severity | Detail |
|------|----------|--------|
| Sharing permission change | **CRITICAL** | Any folder made private breaks Story Hub / Reels / daily activity |
| API key quota / revocation | HIGH | `GOOGLE_API_KEY` / `GOOGLE_DRIVE_API_KEY` |
| No GCS mirror for Reels | HIGH | Unlike Story Hub, reels may always hit Drive |
| Hardcoded folder URLs in client | MEDIUM | 38 identical URLs in daily-kids-activity.tsx |
| Moved/deleted files | MEDIUM | No automated link checker for embed URLs |
| Expiring signed URLs | LOW for API paths | Server refreshes; embeds use public links |

---

## Broken Link Verification

| Asset | Method | Result |
|-------|--------|--------|
| Story stream (sample) | Production E2E Parent Hub Story | **PASS** — video played |
| Drive folder embed | Not probed (iframe) | **UNVERIFIED** |
| Reels stream | Not probed in this session | **UNVERIFIED** |

---

## Recommendations (Post-Report)

1. Migrate all video to GCS (Story Hub mirror cron exists; extend to Reels)
2. Replace client-side Drive folder embeds with API-proxied streams
3. Add automated Drive folder health check to CI (beyond story count)
4. Document folder ownership and sharing requirements in ops runbook
