# Popup rework + languages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate Eclipse into 11 languages with a Language override, and split the popup into Home / Blocked sites / Settings screens with a "Block current site" button.

**Architecture:** One classic script `i18n.js` (no modules) holds all UI strings, the language resolver and `t()`; it is loaded before `popup.js` and before `content.js`. `_locales/` only carries manifest strings. Popup screens are three `<section>`s toggled with `hidden`.

**Tech Stack:** Plain JS, Manifest V3, Node (only for the check script).

**Spec:** `docs/superpowers/specs/2026-10-28-popup-rework-and-languages-design.md`

## Global Constraints

- Languages, in this order: `en, es, pt_PT, pt_BR, fr, de, zh_CN, ja, ru, hi, it`. `en` is default and fallback.
- New storage key `language` in `chrome.storage.sync`, values `"auto"` (default) or a code above. Existing keys unchanged.
- "Eclipse" is never translated. pt_PT and pt_BR use their own vocabulary (ecrã/definições vs tela/configurações).
- Permission added: `activeTab` only. Never `tabs`.
- Classic scripts share one global scope: `i18n.js` top-level names must not collide with `popup.js`/`content.js` (prefix constants `I18N_`).
- Version 1.5.0.

## Review Focus

1. Browser UI language not in the list (`ko`, `ar`) → English. Covered by resolver test.
2. `pt`, `pt-PT`, `pt-BR`, `zh-TW`, `es-419` → `pt_PT`, `pt_PT`, `pt_BR`, `zh_CN`, `es`. Covered by resolver test.
3. Stored `language` value no longer valid (e.g. removed code) → treated as `"auto"`. Covered by resolver test.
4. A key missing from one language → English string, not `undefined`. Covered by `t()` test + parity check.
5. Popup opened on `chrome://` / Web Store / new tab → no "Block" button, no error. Manual check in Task 4.

---

### Task 1: i18n core + check script

**Files:**
- Create: `i18n.js`, `scripts/check-i18n.js`

**Interfaces — Produces (globals):**
- `I18N_LANGUAGE_KEY = "language"`
- `I18N_LANGUAGES: Array<{code: string, name: string}>` — order above, names in their own language.
- `I18N_STRINGS: Record<code, Record<key, string>>`
- `resolveLanguage(setting: string, uiLanguage: string) -> code`
- `t(lang: code, key: string, vars?: object) -> string` — replaces `{name}`; falls back to `en`.
- `async getLanguage() -> code` — reads storage (default `"auto"`) and `chrome.i18n.getUILanguage()`.
- When `module` exists, `module.exports = { I18N_LANGUAGES, I18N_STRINGS, resolveLanguage, t }`.

- [ ] **Step 1:** Write `scripts/check-i18n.js` asserting: `resolveLanguage("auto", x)` for `pt→pt_PT, pt-PT→pt_PT, pt-BR→pt_BR, zh-TW→zh_CN, es-419→es, de-AT→de, ko→en, en-GB→en`; `resolveLanguage("fr","pt-BR")==="fr"`; `resolveLanguage("xx","de")==="de"`; `t("en","reasonCounter",{count:3,min:50})==="3 / 50 characters"`; `t` falls back to en for a key deleted from a language copy; every language has exactly the `en` keys with the same `{placeholders}`; every `_locales/*/messages.json` has the same keys as `_locales/en`, and there is one per language.
- [ ] **Step 2:** `node scripts/check-i18n.js` → fails (no i18n.js).
- [ ] **Step 3:** Implement `i18n.js` with `en` strings only (keys listed in Task 2) and the functions above.
- [ ] **Step 4:** Check passes except the per-language parity (only `en` present) — acceptable until Task 2.

### Task 2: Translations + manifest strings

**Files:** Modify `i18n.js`; Create `_locales/<code>/messages.json` ×11; Modify `manifest.json`.

Keys (English source, keep current wording):
popup — `settingsButton` "Settings", `back` "Back", `blockCurrentSite` "Block {site}", `siteAlreadyBlocked` "{site} is blocked", `domainInputLabel` "Domain to block", `addButton` "Add", `invalidDomain` "Enter a valid domain, like example.com.", `blockedSitesTitle` "Blocked sites", `noBlockedSites` "No blocked sites yet.", `removeButton` "Remove", `settingsTitle` "Settings", `languageLabel` "Language", `languageAuto` "Browser default", `minCharsLabel` "Minimum characters required to unlock".
content — `overlayMessage`, `reasonPlaceholder` "…(at least {min} characters)...", `reasonLabel`, `reasonCounter` "{count} / {min} characters", `pasteBlocked`, `timeQuestion`, `minutesValue` "{minutes} min", `minutesLabel`, `declaration`, `continueButton`, `bannerReason` "I'm only using this because: {reason}", `bannerTimeLeft` "Time left: {time}", `stopButton` "STOP", `stopLabel`.
`_locales` — `extName`, `extDescription`, `actionTitle`.

- [ ] Add 10 translations; create `_locales`; manifest: `"default_locale": "en"`, `name`/`description`/`default_title` → `__MSG_extName__`/`__MSG_extDescription__`/`__MSG_actionTitle__`.
- [ ] `node scripts/check-i18n.js` → all pass. Commit.

### Task 3: Content script uses translations

**Files:** Modify `manifest.json` (content_scripts js → `["i18n.js","content.js"]`), `content.js`.

- [ ] `showBlockOverlay` and `showBanner` get `lang` via `await getLanguage()` and replace every literal with `t(lang, key, …)`. Banner keeps `lang` in a module variable for `updateBannerCountdown`. No re-render on language change.
- [ ] `node --check content.js`; manual: set Chrome UI to another language or set storage `language`, reload a blocked site → overlay/banner translated. Commit.

### Task 4: Popup three screens + language setting + block current site

**Files:** Modify `popup.html`, `popup.js`, `popup.css`, `manifest.json` (`permissions: ["storage","activeTab"]`).

- [ ] `popup.html`: `#home` (header logo + "Eclipse" + `#open-settings` pill button; `#block-current` button, hidden by default; existing add form; `#open-sites` row with `#sites-count`), `#sites` (back button + title + existing list), `#settings` (back button + title; `<select id="language-select">`; existing min-chars input). Text nodes filled from `data-i18n="key"` attributes.
- [ ] `popup.js`: `applyTranslations(lang)` fills `[data-i18n]`, `[data-i18n-aria]`; `showScreen(id)`; language select (auto + `I18N_LANGUAGES`) saves `language` and re-applies; `render` also updates count; block-current: `chrome.tabs.query({active:true,currentWindow:true})`, only for `http(s)` + `isValidDomain(normalizeDomain(host))`; disabled with `siteAlreadyBlocked` if any listed domain matches it or a parent.
- [ ] `popup.css`: pill button, nav row, back header, setting rows; remove old `#settings` card styling that no longer applies.
- [ ] Manual check: popup on a normal site, on `chrome://extensions`, on an already blocked site; navigation both ways; change language → popup re-renders. Commit.

### Task 5: Release housekeeping

- [ ] `manifest.json` version 1.5.0; CHANGELOG `[1.5.0]` Added/Changed; README features + structure (`i18n.js`, `_locales/`, `scripts/check-i18n.js`). Commit.
