# CLAUDE.md

Static web page that flashes Owie firmware onto an ESP8266 over Web Serial (esp-web-tools).
README.md describes the page's behaviour; this file is the working notes.

## Layout

- `site/index.html` - the whole app (HTML, CSS, JS in one file). `site/404.html` - not-found page.
  Everything in `site/` is published; nothing else is.
- `wrangler.jsonc` - Cloudflare assets-only Worker `owie-flashingtool`, custom domain
  owie-flashingtool.klaska.net.
- `.github/workflows/deploy.yml` - production deploy on push to `master` (manual runs only on
  `master`), per-PR preview + a new PR comment per deploy (QR code, Visual and Lighthouse rows),
  visual regression, Lighthouse, preview cleanup on close. Same setup as https://cfsite.klaska.net
  (repo radimklaska/cfsite): copy improvements from there.
- `.github/workflows/link-checker.yml` - lychee over `site/`.
- `tests/visual.spec.mjs` + `playwright.config.mjs` - preview vs production screenshots
  (GitHub API responses replayed, clock frozen); `tests/visual-report.mjs` builds the summary
  and the diffs page.

## Rules

- `master` only accepts changes through PRs (ruleset "master"). Work on a branch, open a PR;
  the PR comment links the preview.
- Keep every tool pinned to an exact version; commit `package-lock.json`. Updates take only
  releases at least 7 days old (`npm install --save-dev --save-exact --before=...`, see cfsite).
- A PR that changes how the page looks fails the `visual` job on purpose: check the diffs page
  linked from the preview comment.
- No GitHub Pages, no Netlify, no `CNAME` file.
- Local check: `npx wrangler dev`; visual test against it:
  `PREVIEW_URL=http://localhost:8787 npx playwright test`.

Shared setup for all of Radim's Cloudflare-hosted sites: `~/claude/cloudflare-projects.md`.
