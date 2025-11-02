# Repository Guidelines

## Project Structure & Module Organization
HNES is a cross-browser extension packaged from the repository root. `manifest.json` declares entry points and permissions, `background.js` handles background events, and `js/hn.js` drives page behavior. `style.css` contains the entire visual refresh, `js/jquery-3.2.1.min.js` and `js/linkify/` provide third-party helpers, and `images/` stores icons and animations. Keep `screenshots/` (store media) and `notes` (HN reference links) out of published bundles.

## Build, Test, and Development Commands
- `bash zip.sh`: build Firefox (`../HNES-firefox.zip`) and Chrome (`../HNES-chrome.zip`) archives; run from Git Bash, WSL, or any shell where `zip` is installed.
- `npx web-ext lint --source-dir .`: optional Firefox lint before submission; install `web-ext` globally if you use it routinely.

## Coding Style & Naming Conventions
Match the existing two-space indentation in JavaScript and CSS. Favor `const` or `let` in modernized code, but keep legacy sections consistent. Use camelCase for JavaScript identifiers (`highlightNewComments`), kebab-case for CSS classes (`.comment-body`), and single quotes for strings unless a template literal adds clarity. Avoid new runtime dependencies and keep assets relative to the extension root.

## Testing Guidelines
Automated tests are not available, so perform manual passes in both Chrome and Firefox. Confirm the styled index page, keyboard shortcuts (`j`, `k`, `o`, `l`, `p`, `c`, `b`), comment collapsing and inline replies, tag rendering, visited-link highlighting, and redirects on expired stories. Note tested browsers and scenarios in the pull request description.

## Commit & Pull Request Guidelines
Use concise, sentence-style commit subjects similar to the existing history (`Fix link opening shortcut functionality`), keeping the first line under 72 characters and linking issues with `Fixes #123` where relevant. Pull requests should describe the change, enumerate manual test coverage, mention packaging checks if assets move, and include screenshots for UI updates. Bump the `version` in `manifest.json` whenever you prepare a store build.

## Release & Configuration Tips
Regenerate both archives with `bash zip.sh` after feature work and confirm excluded paths (`screenshots/`, `notes`, unminified libraries) stay out of the zips. Audit `manifest.json` permissions before submission, and add any new assets to `web_accessible_resources` so the extension can retrieve them at runtime.
