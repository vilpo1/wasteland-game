WASTELAND: REAL WORLD — post-apocalyptic survival RPG on the real map
Open index.html (or the single-file wasteland.html) in a desktop browser. Internet needed (Leaflet CDN, map tiles, OpenStreetMap places).
Files: index.html + css/ + js/ (data.js, core.js, world.js, actions.js, ui.js). Run "python3 build.py" to regenerate wasteland.html after edits.
Map tiles: Esri (dark/satellite/street) + OpenTopoMap, switchable top-right. POIs: Overpass API, cached in localStorage; procedural fallback if offline.

iPhone / iPad (PWA)
- Must be served over HTTPS (any static host). Open the URL in Safari → Share → "Add to Home Screen" → launches fullscreen.
- manifest.json + icons/ + sw.js (offline app shell + up to 1500 cached map tiles). SW only registers on http(s); file:// and wasteland.html skip it.
- Host by uploading this folder as-is (no build step): GitHub Pages, Netlify, Cloudflare Pages, Vercel, etc.
Tests: tests/playwright-test.js (desktop Chromium), tests/ios-webkit-test.js (WebKit, iPhone 14 portrait+landscape, touch).
