# Owie Flashing Tool

A static web page that flashes [Owie](https://github.com/lolwheel/Owie) firmware onto an ESP8266 over Web Serial, using [esp-web-tools](https://esphome.github.io/esp-web-tools/).

Live page: <https://radimklaska.github.io/owie-flashingtool/>

## How it works

`index.html` reads the selected repo through the GitHub API at load time and shows:

- **Releases** — every release that ships a `firmware.bin` asset, with GitHub's `latest` and `pre-release` badges. CI pre-releases tagged `ci-pr-<number>` are left out here.
- **Open pull requests** — number and title, linked to the PR. If the PR has a build (the `ci-pr-<number>` pre-release, asset `firmware.bin` or `firmware_<short sha>.bin`), the row says which commit it was built from and links the `.bin`; otherwise it says the PR has no build yet. Expanding **Commits** lists every commit of the PR with its `.bin` when one is kept, or a link to its CI run (zip artifact, needs a GitHub login).
- **Flash a downloaded file** — pick a `.bin` from disk and flash it.

### Why some builds need downloading first

GitHub release downloads (`github.com/.../releases/download/...` and the redirect behind it) send no CORS headers, so no web page can fetch them for esp-web-tools. A build gets a one-click connect button only when a copy exists on the repo's `firmware-builds` branch, which `raw.githubusercontent.com` serves with CORS allowed:

```
firmware-builds
├── releases/<tag>/firmware.bin
└── pr-<number>/<commit sha>/firmware.bin
```

Everything else shows a download link: download the `.bin`, then flash it under **Flash a downloaded file**.

## Picking a firmware source

The page defaults to [`radimklaska/owie`](https://github.com/radimklaska/owie). You can switch sources in two ways:

- **Dropdown** — pick `lolwheel/Owie`, `ow-breaker/Owie`, or `Other…` to type any `owner/Repo`.
- **URL parameter** — append `?repo=owner/Repo`, e.g. `?repo=lolwheel/Owie`. The dropdown and URL stay in sync.

The target repo must publish releases whose assets include a file named `firmware.bin`.

## Requirements

A Chromium-based browser (Chrome, Edge, Opera) on desktop — Web Serial is not supported in Firefox or Safari. You may also need [USB-to-serial drivers](https://esphome.github.io/esp-web-tools/#drivers).

## Local development

It's a single file. Open `index.html` in a browser, or serve the directory with any static server (e.g. `python3 -m http.server`). esp-web-tools is loaded from unpkg, so no build step is required.
