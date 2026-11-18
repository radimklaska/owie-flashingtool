# CLAUDE.md

Static web page that flashes Owie firmware onto an ESP8266 over Web Serial (esp-web-tools).
README.md describes the page's behaviour; this file is the working notes.

## Layout

- `site/index.html` - the whole app (HTML, CSS, JS in one file). `site/404.html` - not-found page.
  Everything in `site/` is published; nothing else is.
- `wrangler.jsonc` - Cloudflare assets-only Worker `owie-flashingtool`, custom domain
  owie-flashingtool.klaska.net.
- `.github/workflows/deploy.yml` - production deploy on push to `master`, per-PR preview + PR
  comment, visual regression, preview cleanup on close.
- `.github/workflows/link-checker.yml` - lychee over `site/`.
- `tests/visual.spec.mjs` + `playwright.config.mjs` - preview vs production screenshots
  (Playwright 1.62.1 pinned exactly; GitHub API responses replayed, clock frozen).

## Rules

- `master` only accepts changes through PRs (ruleset "master"). Work on a branch, open a PR;
  the PR comment links the preview.
- Keep wrangler and Playwright pinned to exact versions; commit `package-lock.json`.
- A PR that changes how the page looks fails the `visual` job on purpose: check the
  `visual-diffs` artifact.
- No GitHub Pages, no Netlify, no `CNAME` file.
- Local check: `npx wrangler dev`; visual test against it:
  `PREVIEW_URL=http://localhost:8787 npx playwright test`.

Shared setup for all of Radim's Cloudflare-hosted sites: `~/claude/cloudflare-projects.md`.
