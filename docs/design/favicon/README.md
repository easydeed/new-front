# DeedPro favicon

A purple (#7C4DFF) rounded square with a white slash: the slash from the `deed/pro` wordmark. Same geometry at every size.

## Files
- `favicon.svg` — master, used by modern browsers
- `favicon.ico` — 16, 32 and 48px in one file, for older browsers
- `favicon-16.png`, `favicon-32.png`, `favicon-48.png`
- `apple-touch-icon.png` — 180px, square corners (iOS rounds them)
- `icon-192.png`, `icon-512.png` — Android and install icons
- `icon-maskable-512.png` — square corners, for Android adaptive icons
- `site.webmanifest`

## Installing in the Next.js app
1. Copy `favicon.ico` to `frontend/src/app/favicon.ico` (replace the existing one).
2. Copy `favicon.svg` to `frontend/src/app/icon.svg`.
3. Copy `apple-touch-icon.png` to `frontend/src/app/apple-icon.png`.
4. Copy `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` and `site.webmanifest` to `frontend/public/`, and set `manifest: '/site.webmanifest'` in the root layout metadata.
5. Remove any older icon files or `<link rel="icon">` tags so they do not compete.

Next.js picks up `favicon.ico`, `icon.svg` and `apple-icon.png` in `app/` automatically.
