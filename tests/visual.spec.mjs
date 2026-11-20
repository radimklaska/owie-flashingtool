/**
 * Visual regression: the PR's Cloudflare Workers Preview vs production
 * (owie-flashingtool.klaska.net). Run by the `visual` job in .github/workflows/deploy.yml.
 *
 * No committed baseline images: production is the baseline. A PR that changes how
 * a page looks fails this check by design; the diff images in the visual-diffs
 * artifact are what a human looks at before merging.
 *
 * Every page also writes visual-results/<name>.json (pass or fail, with the numbers);
 * tests/visual-report.mjs turns those into the job summary, the preview comment row
 * and, when something differs, one HTML page with the images. Same setup as
 * https://cfsite.klaska.net/checks/#visual.
 *
 * Named *.spec.mjs so `node --test` does not pick it up.
 */
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const PREVIEW = (process.env.PREVIEW_URL || '').replace(/\/$/, '');
const PROD = (process.env.PROD_URL || 'https://owie-flashingtool.klaska.net').replace(/\/$/, '');
// Two limits per page. The share of differing pixels catches broad changes (layout,
// colours); the most differing pixels within any 16x16 square catches compact ones that
// are a tiny share of a long page, like one changed character (identical renders score 0).
const MAX_DIFF_RATIO = Number(process.env.MAX_DIFF_RATIO || 0.002);
const WINDOW_SIZE = 16;
const MAX_WINDOW_PIXELS = Number(process.env.MAX_WINDOW_PIXELS || 10);
const DIFF_DIR = 'visual-diffs';
const RESULTS_DIR = 'visual-results';

if (!PREVIEW) throw new Error('PREVIEW_URL is not set');

const pages = [
  // github: the page renders GitHub API data (see freezeData)
  { name: 'home', path: '/', github: true },
  { name: 'other-repo', path: '/?repo=lolwheel/Owie', github: true },
  { name: 'not-found', path: '/no-such-page' },
];

/**
 * Elements that legitimately differ between two loads. Add a selector here
 * rather than raising MAX_DIFF_RATIO.
 */
const MASK_SELECTORS = [];

/**
 * The page renders releases and pull requests from the GitHub API at load time, and
 * "3 hours ago"-style times from the clock. So that both sides render the same data:
 * every api.github.com response is fetched once per test and replayed for the other
 * side (this also halves the unauthenticated API calls, 60/hour per runner IP), and
 * the clock is frozen. Only for those pages: a frozen clock can hang pages whose
 * scripts wait for time to pass.
 */
async function freezeData(page) {
  const cache = new Map();
  await page.route('https://api.github.com/**', async (route) => {
    const key = `${route.request().method()} ${route.request().url()}`;
    if (!cache.has(key)) {
      const response = await route.fetch();
      cache.set(key, { status: response.status(), headers: response.headers(), body: await response.body() });
    }
    await route.fulfill(cache.get(key));
  });
  await page.clock.setFixedTime(new Date());
}

async function shoot(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts && document.fonts.ready);
  return page.screenshot({
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    mask: MASK_SELECTORS.map((s) => page.locator(s)),
  });
}

test.describe('preview matches production', () => {
  for (const p of pages) {
    test(`page ${p.name}`, async ({ page }) => {
      if (p.github) await freezeData(page);
      const previewPng = PNG.sync.read(await shoot(page, `${PREVIEW}${p.path}`));
      const prodPng = PNG.sync.read(await shoot(page, `${PROD}${p.path}`));
      const width = Math.min(previewPng.width, prodPng.width);
      const height = Math.min(previewPng.height, prodPng.height);
      const heightDelta = Math.abs(previewPng.height - prodPng.height);
      const crop = (src) => {
        const out = new PNG({ width, height });
        PNG.bitblt(src, out, 0, 0, width, height, 0, 0);
        return out;
      };
      const a = crop(previewPng);
      const b = crop(prodPng);
      const diff = new PNG({ width, height });
      const differing = pixelmatch(a.data, b.data, diff.data, width, height, { threshold: 0.2, includeAA: false });
      const ratio = differing / (width * height);
      const windowMax = pixelmatch(a.data, b.data, null, width, height,
        { threshold: 0.2, includeAA: false, windowSize: WINDOW_SIZE });

      const passed = ratio <= MAX_DIFF_RATIO && windowMax <= MAX_WINDOW_PIXELS && heightDelta <= 20;
      fs.mkdirSync(RESULTS_DIR, { recursive: true });
      fs.writeFileSync(path.join(RESULTS_DIR, `${p.name}.json`), JSON.stringify({
        name: p.name, path: p.path, passed, ratio, differing, pixels: width * height, windowMax,
        previewHeight: previewPng.height, productionHeight: prodPng.height,
      }));

      if (!passed) {
        fs.mkdirSync(DIFF_DIR, { recursive: true });
        fs.writeFileSync(path.join(DIFF_DIR, `${p.name}-diff.png`), PNG.sync.write(diff));
        fs.writeFileSync(path.join(DIFF_DIR, `${p.name}-preview.png`), PNG.sync.write(previewPng));
        fs.writeFileSync(path.join(DIFF_DIR, `${p.name}-production.png`), PNG.sync.write(prodPng));
      }
      expect.soft(heightDelta, `page height differs by ${heightDelta}px`).toBeLessThanOrEqual(20);
      expect.soft(windowMax, `${windowMax} pixels differ within one ${WINDOW_SIZE}x${WINDOW_SIZE} square - see the visual diffs page`)
        .toBeLessThanOrEqual(MAX_WINDOW_PIXELS);
      expect(
        ratio,
        `${differing} of ${width * height} pixels differ (${(ratio * 100).toFixed(3)}%) - see the visual diffs page`
      ).toBeLessThanOrEqual(MAX_DIFF_RATIO);
    });
  }
});
