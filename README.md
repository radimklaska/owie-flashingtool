# Owie Flashing Tool

A static web page that flashes [Owie](https://github.com/lolwheel/Owie) firmware onto an ESP8266 over Web Serial, using [esp-web-tools](https://esphome.github.io/esp-web-tools/).

Live page: <https://owie-flashingtool.klaska.net/>

## How it works

`site/index.html` reads the selected repo through the GitHub API at load time and shows:

- **Releases** — every release that ships a firmware asset (`firmware.bin` or `firmware_<suffix>.bin`), with GitHub's `latest` and `pre-release` badges. CI pre-releases tagged `ci-pr-<number>` are left out here.
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

The target repo must publish releases whose assets include a file named `firmware.bin` or `firmware_<suffix>.bin` (e.g. `firmware_v1.5.1.bin`).

## Requirements

A Chromium-based browser (Chrome, Edge, Opera) on desktop — Web Serial is not supported in Firefox or Safari. You may also need [USB-to-serial drivers](https://esphome.github.io/esp-web-tools/#drivers).

## Local development

The site is `site/` (`index.html` plus a `404.html`); esp-web-tools is loaded from unpkg, so there is no build step. Open `site/index.html` in a browser, or serve it the way production does:

```sh
npm ci
npx wrangler dev        # http://localhost:8787, with the 404 page
```

## Hosting and deploys

Served by Cloudflare as an assets-only Worker named `owie-flashingtool` (`wrangler.jsonc`) on the custom domain owie-flashingtool.klaska.net. No GitHub Pages, no Netlify. The old address klaska.net/owie-flashingtool/ redirects here.

`.github/workflows/deploy.yml`:

- **Push to `master`** deploys production (`npx wrangler deploy`). It can also be started by hand from the Actions tab.
- **Pull request** uploads a preview named `pr-<number>` on workers.dev and posts its link in one PR comment, updated on every push. Previews are not indexed.
- **Visual regression** (job `visual`, `tests/visual.spec.mjs`) screenshots the preview and production and fails on a pixel difference. GitHub API responses are fetched once and replayed to both sides and the clock is frozen, so both render the same data. A PR that changes how the page looks fails it on purpose: check the `visual-diffs` artifact, then merge.
- **Closing or merging the PR** deletes its preview and the comment says so.

`.github/workflows/link-checker.yml` checks the links in `site/` on PRs, weekly and on demand.

Secrets: `CLOUDFLARE_API_TOKEN` (this repo's own deploy token: Workers Scripts Edit + Account Settings Read on the account, Workers Routes Edit + Zone Read on klaska.net) and `CLOUDFLARE_ACCOUNT_ID`. Dependabot PRs get no secrets, so they get no preview.

Visitor stats come from Cloudflare Web Analytics, which the klaska.net zone injects; there is no tracking code in the page.
