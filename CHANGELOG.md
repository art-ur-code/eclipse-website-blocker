# Changelog

All notable changes to this project are documented in this file.

## [1.3.0]

### Added

- New popup setting to require a configurable minimum number of characters (default 100) in the unlock reason before continuing is allowed.
- The block overlay now shows a live character counter below the reason field, turning green once the minimum required length is reached (white while below it).

## [1.2.1]

### Changed

- Restyled the popup (blocked sites list) to match the dark eclipse theme used by the block overlay and banner.
- The popup title now shows the extension icon as its logo instead of a generic gradient placeholder.

## [1.2.0]

### Added

- Dark eclipse-themed redesign for the block overlay, matching the extension icon (deep black background, amber accents).
- The block overlay now displays the extension icon instead of a generic gradient placeholder.
- The bottom banner shown while a site is temporarily allowed was restyled to match the same dark/amber theme.
- Hovering the countdown in the bottom banner reveals a **STOP** button; clicking it immediately re-blocks the site and discards the remaining allowed time.

## [1.1.0]

### Changed

- Replaced the "minutes to use this website" number input with a slider (range 5–60 minutes, step 5) on the block overlay.

## [1.0.0]

### Added

- Initial release: block chosen websites via a content script.
- Blocked sites show an overlay requiring a written reason and a time allowance before proceeding.
- Popup UI for managing the list of blocked domains.
- Bottom banner with a live countdown while a site is temporarily allowed.
