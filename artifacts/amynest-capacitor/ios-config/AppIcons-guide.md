# AmyNest — iOS App Icon Sizes Required

All icons must be:
- **Format**: PNG, no transparency, no rounded corners (Apple adds them)
- **Color space**: sRGB
- **No alpha channel**

Place all files in Xcode at:
`ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## Required sizes

| File name | Size (px) | Usage |
|---|---|---|
| `icon-20.png` | 20×20 | iPad notifications |
| `icon-20@2x.png` | 40×40 | iPhone notifications |
| `icon-20@3x.png` | 60×60 | iPhone notifications (3x) |
| `icon-29.png` | 29×29 | iPad Settings |
| `icon-29@2x.png` | 58×58 | iPhone Settings |
| `icon-29@3x.png` | 87×87 | iPhone Settings (3x) |
| `icon-40.png` | 40×40 | iPad Spotlight |
| `icon-40@2x.png` | 80×80 | iPhone Spotlight |
| `icon-40@3x.png` | 120×120 | iPhone Spotlight (3x) |
| `icon-60@2x.png` | 120×120 | iPhone Home screen |
| `icon-60@3x.png` | 180×180 | iPhone Home screen (3x) |
| `icon-76.png` | 76×76 | iPad Home screen |
| `icon-76@2x.png` | 152×152 | iPad Home screen (retina) |
| `icon-83.5@2x.png` | 167×167 | iPad Pro Home screen |
| `icon-1024.png` | 1024×1024 | App Store listing |

## Quick generation

Use any of these free tools with your master 1024×1024 icon:
- [appicon.co](https://www.appicon.co/) — upload 1024px → download all sizes
- [makeappicon.com](https://makeappicon.com/)
- Capacitor plugin: `npx @capacitor/assets generate` (requires `@capacitor/assets` package)

## Design notes
- Background: `#0a061a` (AmyNest brand dark purple)
- Use the Amy character / logo centered with ~15% padding
- The 1024px App Store icon must not have any alpha/transparency
