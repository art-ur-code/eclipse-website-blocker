# Popup rework + languages — design

Date: 2026-10-28 · Target version: 1.5.0

## Intent

Eclipse is published on the Chrome Web Store and works well. Two things are next:

1. **Languages.** It is only in English today. Published users should see it in their own language, automatically, with the option to pick another one.
2. **A cleaner popup.** Today the popup shows the add form, the full blocked-sites list and the settings all on one page. The owner wants the home page to stay focused on quickly blocking a site, with the list and the settings each on their own screen — settings needing to be obvious, not hidden behind a tiny icon.

## Goals

- Every user-facing string (popup, block overlay, bottom banner, store name/description) is translatable.
- Default language follows the browser; a **Language** setting lets the user override it. The override applies everywhere the extension shows text (popup, overlay, banner).
- Popup becomes three screens inside the same popup: **Home**, **Blocked sites**, **Settings**.
- A one-click "Block <current site>" button on Home.

## Non-goals

- New settings beyond **Language** and the existing **Minimum characters**. More settings may come later; the Settings screen just needs to make adding one easy.
- Right-to-left languages (Arabic, Urdu, Hebrew…). Possible later as a separate step.
- A full-page options page (`options_page`). Everything stays in the popup.
- Translating the store listing per the user's *chosen* language — the store always follows the browser language; that is a platform limit, accepted.
- The Web Store's long "detailed description". `_locales` only translates the name and short summary; the long text is typed per language in the Developer Dashboard, not shipped in code. *My call:* out of scope here; can be produced separately as copy to paste.

## Anti-goals

- Anything that weakens the friction. Settings, language switching and the new button must not create a way to skip or shorten the reason/time/declaration flow. (The paste block from 1.4.0 stays as is.)
- Changing behaviour that works today: blocking, allowances, countdown, STOP, min-chars logic, storage keys `blockedSites`, `activeAllowances`, `minReasonChars`.

## Languages

Launch set (11):

| Code | Language |
|---|---|
| `en` | English (default and fallback) |
| `es` | Spanish |
| `pt_PT` | Portuguese (Portugal) |
| `pt_BR` | Portuguese (Brazil) |
| `fr` | French |
| `de` | German |
| `zh_CN` | Chinese (Simplified) |
| `ja` | Japanese |
| `ru` | Russian |
| `hi` | Hindi |
| `it` | Italian |

Both Portuguese variants are required and must be genuinely different where usage differs (e.g. PT "ecrã / definições / utilizar", BR "tela / configurações / usar").

Translations are written by the builder (no native review available). Keep them natural and short; the brand name **Eclipse** is never translated.

### Language resolution

- Setting stored in `chrome.storage.sync` under a new key `language`. Value `"auto"` (default) or one of the codes above.
- `"auto"` → take `chrome.i18n.getUILanguage()` (e.g. `pt-BR`, `de`, `zh-CN`), match exact (`pt-BR` → `pt_BR`), then by base language (`de-AT` → `de`, `es-419` → `es`), else `en`.
  - *My call:* bare `pt` and `pt-PT` → `pt_PT`; `pt-BR` → `pt_BR`. Any `zh-*` → `zh_CN` (only Simplified is shipped).
- A key missing in a language falls back to the English string.

### How strings are stored — *my call*

Chrome's built-in `chrome.i18n` always follows the browser and can't be overridden per extension, so it can't serve the Language setting on its own. Approach:

- `_locales/<code>/messages.json` holds **only** `extName`, `extDescription` (and `actionTitle` if useful), used by `manifest.json` via `__MSG_…__` with `"default_locale": "en"`. This is what translates the store listing and the extensions page.
- All UI strings live in one plain JS file, `i18n.js`, exporting a global object keyed by language code, plus a small `t(key, vars)` helper and the resolver above. It is loaded by `popup.html` and listed first in the content script's `js` array. Synchronous, no fetch, no extra `web_accessible_resources`.
- Placeholders use `{name}` (e.g. `"{count} / {min} characters"`, `"Block {site}"`).

### When the language changes

- Popup: re-renders immediately on change.
- Overlay/banner: picks up the new language the next time they're rendered (page load, re-block). Re-rendering an overlay already on screen is not required — and must not clear text the user is typing.

## Popup — chosen layout ("A2")

A mockup was reviewed; the owner chose layout A with a labelled settings button. All three screens live in `popup.html`; switching shows/hides sections (no new windows/pages). Same dark eclipse theme as today (`popup.css`). Popup width stays 360px.

### Home

- Header: logo + "Eclipse" on the left; on the right a pill button with gear + text **"⚙ Settings"** (translated) that opens Settings. It must read clearly as a button, not a bare icon.
- **"Block <current site>"** primary button — *my idea, not objected to*:
  - Shows the active tab's domain, normalised the same way as the add form (lowercase, no `www.`).
  - Only shown when the active tab is a normal `http`/`https` page whose host passes the existing `isValidDomain`. Hidden for `chrome://`, the Web Store, `file://`, new tab, IPs/localhost.
  - If that domain (or a parent domain already in the list) is already blocked, show it as a disabled state, e.g. "youtube.com is blocked".
  - On click: add to `blockedSites` (sorted, deduped as today). The open tab's content script already reacts to the storage change and shows the overlay — no extra messaging.
  - Needs the `activeTab` permission (no install warning). Do **not** add `tabs`.
- Quick-add form (input + Add), exactly as today including validation and error text.
- A row **"Blocked sites"** with the count on the right and a `›`, opening the list screen.

### Blocked sites screen

- Header: `‹` back button + title "Blocked sites".
- The current list with **Remove** buttons, and the existing empty state. Behaviour unchanged.

### Settings screen

- Header: `‹` back button + title "Settings".
- **Language**: a `<select>` with "Browser default" first, then each language in its own name (English, Español, Português (Portugal), Português (Brasil), Français, Deutsch, 简体中文, 日本語, Русский, हिन्दी, Italiano). Saves on change.
- **Minimum characters to unlock**: the existing number input, moved here unchanged.
- Laid out as a list of setting rows so adding a future setting is one more row.

### Navigation details — *my calls*

- Popup always opens on Home.
- No slide animation required; a simple swap is fine. A short fade is acceptable if trivial.
- Back button and Settings button are real `<button>`s with accessible labels.

## Content script strings to translate

Overlay: main message, textarea placeholder (with min chars), textarea aria-label, counter (`{count} / {min} characters`), paste-blocked notice, time question, `{n} min`, slider aria-label, declaration checkbox text, Continue button.
Banner: "I'm only using this because: {reason}", "Time left: {time}", "STOP", STOP aria-label.

## Housekeeping

- Version 1.5.0 in `manifest.json`; CHANGELOG entry (Added / Changed); README features + project structure updated (new `i18n.js`, `_locales/`).
- One small runnable check, no framework: a Node script (e.g. `node scripts/check-i18n.js`) that loads `i18n.js` and asserts every language has exactly the same keys as `en` and the same `{placeholders}` per key, and that every `_locales/*/messages.json` has the same keys. *My call* — cheap insurance against a missing string in one of 11 languages.

## Left to the builder

- Exact markup/CSS for the three screens, within the existing theme.
- Exact string keys and wording of the English source strings (keep today's English text where it exists).
- Whether the min-chars input saves on `change` (as today) or `input`.
