# Eclipse Website Blocker

A browser extension that blocks chosen websites until you write down your reason for visiting and confirm your intent. The goal is to add friction to mindless browsing rather than hard-blocking sites outright.

## Features

- Add and remove domains you want to block (e.g. `youtube.com`)
- Blocked sites show an overlay requiring you to state your reason and how long you'll stay before proceeding
- Configurable minimum reason length (set in the popup settings, default 50 characters); a live counter on the overlay turns green once you've reached it
- The reason has to be typed: pasting or dropping text into the field is blocked
- Once allowed, a fixed bottom banner shows your reason and a countdown; hovering the countdown reveals a **STOP** button to re-block the site immediately, discarding the remaining time
- Works across all URLs via a content script injected at page load
- Popup with a quick-block home screen (including a one-click **Block <current site>** button), a separate **Blocked sites** list and a **Settings** screen
- Available in 11 languages (English, Spanish, Portuguese PT/BR, French, German, Chinese Simplified, Japanese, Russian, Hindi, Italian); follows the browser language by default, with a Language setting to override it

## Installation (Chrome / Chromium-based browsers)

1. Clone this repository.
2. Open `chrome://extensions` in your browser.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the project folder.
5. Click the extension icon to open the popup and start adding domains to block.

## Project structure

- `manifest.json` — Manifest V3 extension configuration
- `popup.html` / `popup.js` / `popup.css` — extension popup UI (home, blocked sites and settings screens)
- `i18n.js` — all UI translations, language resolution and the `t()` helper, shared by the popup and the content script
- `_locales/` — translated extension name and description used by the manifest and the Chrome Web Store
- `scripts/check-i18n.js` — run `node scripts/check-i18n.js` to check every language has all strings and placeholders
- `content.js` / `content.css` — content script that blocks matching sites and renders the reason prompt
- `icon.png` — extension icon

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## License

Personal project, all rights reserved.
