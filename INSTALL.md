# Installation

## Requirements

- Microsoft Edge
- Developer mode enabled in `edge://extensions/`

No build step is required. This is an unpacked Manifest V3 extension.

## Install Locally

1. Open `edge://extensions/`.
2. Enable `Developer mode`.
3. Click `Load unpacked`.
4. Select this folder: `EdgePageLimiter`.
5. Open the extension popup or the options page to configure rules.

## Files

- `manifest.json`: Edge extension manifest
- `background.js`: rule state, cooldowns, tab enforcement
- `content.js`: page snapshot collection for keyword rules
- `options.html` / `options.js` / `options.css`: rule editor UI
- `popup.html` / `popup.js` / `popup.css`: popup status UI
- `blocked.html` / `blocked.js` / `blocked.css`: redirect target for blocked pages

## Rule Storage

Rules and runtime state are stored in Edge extension local storage via `chrome.storage.local`.
They are local to each browser profile and are not included in this repository.

## Permissions

The extension uses:

- `storage`: save rules and runtime state
- `tabs`: inspect and close or redirect matching tabs
- `alarms`: schedule limit checks
- `<all_urls>` host permission: allow domain and keyword rules across user-selected sites

If you want to reduce scope, edit `host_permissions` and `content_scripts.matches` in `manifest.json` to only include the domains you intend to limit.
