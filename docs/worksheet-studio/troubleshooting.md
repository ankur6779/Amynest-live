# Worksheet Studio — Troubleshooting

## Generation failed

- Check internet for AI; local templates still work offline
- Retry with a shorter prompt
- Reduce page count to 1–2

## Editor blank or won't load

- Go back to home and reopen the worksheet
- Tap **Retry** if shown
- Clear browser cache only as last resort (drafts are in IndexedDB)

## Export failed

- Stay on the worksheet; tap Export again
- For PDF: wait for progress to complete
- Large worksheets: export one page as PNG first

## Draft not restored

- Tap **Resume draft** on home
- Open **Version history** from the save indicator
- Check Library for saved copies

## Branding not showing

- Open **Branding** → **Save** active profile
- Reopen worksheet or regenerate export

## Autosave shows Offline

- Normal without network; data is stored on device
- Reconnects automatically when online

## Something went wrong (error screen)

- Tap **Recover & continue**
- Your local drafts are preserved

## Support data

Analytics events are stored locally (`worksheet-studio-analytics-v1`). Error boundary logs `worksheet_error` events for diagnosis.
