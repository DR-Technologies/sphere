import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from '../tests/e2e/support/mockSupabase.ts';

const BASE_URL = process.env.SPHERE_VISUAL_AUDIT_BASE_URL || 'http://127.0.0.1:3305';
const ROOT = path.resolve(process.cwd(), 'artifacts/m2-5-acceptance');
const FIXTURES = path.resolve(process.cwd(), 'tests/fixtures');

const fixture = (name) => path.join(FIXTURES, name);
const shot = (...segments) => path.join(ROOT, ...segments);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function cleanRoot() {
  await fs.rm(ROOT, { recursive: true, force: true });
  for (const dir of ['quick-result', 'refine', 'public-report', 'png', 'story-studio', 'public-story', 'transitions', 'portrait']) {
    await ensureDir(shot(dir));
  }
}

async function saveScreenshot(target, page, locator = null, options = {}) {
  await ensureDir(path.dirname(target));
  if (locator) {
    await locator.screenshot({ path: target, ...options });
  } else {
    await page.screenshot({ path: target, ...options });
  }
}

async function setViewport(page, width, height) {
  await page.setViewportSize({ width, height });
}

async function waitForUi(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(250);
}

async function goToQuickResult(page, fileName, dateFormat) {
  await page.goto(BASE_URL);
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture(fileName));
  await page.getByText(/Import options|Opciones de importación/).waitFor();
  if (dateFormat) {
    await page.locator('select').last().selectOption(dateFormat);
  }
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await page.getByText('Instant Wow').waitFor();
  await waitForUi(page);
}

async function publishQuickResult(page) {
  await page.getByRole('button', { name: /^Publish$/ }).click();
  await page.getByText(/Publicado correctamente/i).waitFor();
  await page.waitForTimeout(300);
}

async function openPublicReport(page, context) {
  const href = await page.locator('a:has-text("Open")').getAttribute('href');
  const publicPage = await context.newPage();
  await publicPage.goto(href);
  await publicPage.getByText(/Sphere Public/i).waitFor();
  await waitForUi(publicPage);
  return publicPage;
}

async function createStory(page) {
  await page.getByRole('button', { name: /^Create Story$/ }).first().click();
  await page.getByText(/Story Mode/i).waitFor();
  await waitForUi(page);
}

async function publishStory(page) {
  await page.getByRole('button', { name: /^Publish$/ }).click();
  await page.getByText(/Story publicada/i).waitFor();
  await page.waitForTimeout(300);
}

async function openPublicStory(page, context) {
  const href = await page.locator('a:has-text("Open Public Story")').getAttribute('href');
  const publicPage = await context.newPage();
  await publicPage.goto(href);
  await publicPage.getByRole('banner').getByText(/Sphere Story/i).waitFor();
  await waitForUi(publicPage);
  return publicPage;
}

async function savePngDownload(page, targetPath) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PNG$/ }).click();
  const download = await downloadPromise;
  await ensureDir(path.dirname(targetPath));
  await download.saveAs(targetPath);
}

async function setStoryTime(page, timeMs) {
  const slider = page.locator('.story-progress-block input[type="range"]').first();
  await slider.evaluate((element, value) => {
    element.value = String(value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, timeMs);
  await page.waitForTimeout(80);
}

async function getStorySceneMeta(page) {
  return page.locator('.scene-card').evaluateAll((cards) => cards.map((card) => ({
    id: card.getAttribute('data-scene-id') || '',
    kind: card.getAttribute('data-scene-kind') || ''
  })));
}

async function findTransitionRange(page, fromId, toId) {
  const total = Number(await page.locator('[data-story-ready]').getAttribute('data-story-total-duration-ms'));
  let start = null;
  let end = null;

  for (let time = 0; time <= total; time += 40) {
    await setStoryTime(page, time);
    const visibleIds = ((await page.locator('[data-story-ready]').getAttribute('data-story-visible-scene-ids')) || '').split(',').filter(Boolean);
    const includesPair = visibleIds.includes(fromId) && visibleIds.includes(toId);
    if (includesPair) {
      start ??= time;
      end = time;
    } else if (start !== null) {
      break;
    }
  }

  if (start === null || end === null || end <= start) {
    return null;
  }

  return { startMs: start, endMs: end };
}

async function captureTransition(page, prefix, transition) {
  if (!transition) return;

  for (const [label, pct] of [['25', 0.25], ['50', 0.5], ['75', 0.75]]) {
    const timeMs = Math.round(transition.startMs + (transition.endMs - transition.startMs) * pct);
    await setStoryTime(page, timeMs);
    await saveScreenshot(
      shot('transitions', `${prefix}-${label}.png`),
      page,
      page.locator('[data-testid="story-frame"]')
    );
  }
}

async function capturePortraitScene(page, label, fileName) {
  const card = page.locator('.scene-card').filter({ hasText: label }).first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(250);
    await saveScreenshot(shot('portrait', fileName), page, page.locator('[data-testid="story-frame"]'));
  }
}

async function main() {
  await cleanRoot();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await setViewport(page, 1600, 1200);
    await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
    await saveScreenshot(shot('quick-result', 'quick-result-desktop.png'), page, null, { fullPage: true });

    await setViewport(page, 430, 932);
    await waitForUi(page);
    await saveScreenshot(shot('quick-result', 'quick-result-430.png'), page, null, { fullPage: true });

    await setViewport(page, 390, 844);
    await waitForUi(page);
    await saveScreenshot(shot('quick-result', 'quick-result-390.png'), page, null, { fullPage: true });

    await setViewport(page, 1600, 1200);
    await page.getByRole('button', { name: /^Refine$|^Ir a Refine$/ }).first().click();
    await page.locator('.canvas-sidebar').waitFor();
    await waitForUi(page);
    await saveScreenshot(shot('refine', 'refine-desktop.png'), page, null, { fullPage: true });

    await page.goto(BASE_URL);
    await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
    await page.locator('.template-chip').filter({ hasText: 'Dark' }).click();
    await waitForUi(page);
    await publishQuickResult(page);
    const publicReportPage = await openPublicReport(page, context);
    await setViewport(publicReportPage, 1600, 1200);
    await saveScreenshot(shot('public-report', 'public-report-desktop.png'), publicReportPage, publicReportPage.getByTestId('public-report-root'));
    await setViewport(publicReportPage, 430, 932);
    await waitForUi(publicReportPage);
    await saveScreenshot(shot('public-report', 'public-report-mobile.png'), publicReportPage, publicReportPage.getByTestId('public-report-root'));
    await publicReportPage.close();

    await page.goto(BASE_URL);
    await goToQuickResult(page, 'dataset-a-simple.csv', 'DD/MM/YYYY');
    await savePngDownload(page, shot('png', 'dataset-a-modern.png'));

    await page.goto(BASE_URL);
    await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
    await page.locator('.template-chip').filter({ hasText: 'Dark' }).click();
    await waitForUi(page);
    await savePngDownload(page, shot('png', 'dataset-b-dark.png'));

    await page.goto(BASE_URL);
    await goToQuickResult(page, 'dataset-c-visual.csv');
    await createStory(page);
    await saveScreenshot(shot('story-studio', 'story-studio-16x9.png'), page, null, { fullPage: true });

    const sceneMeta = await getStorySceneMeta(page);
    for (const [index, prefix] of [
      [0, 'intro-kpi'],
      [1, 'kpi-evolution'],
      [2, 'evolution-ranking'],
      [3, 'ranking-race']
    ]) {
      const from = sceneMeta[index];
      const to = sceneMeta[index + 1];
      if (from && to) {
        const transition = await findTransitionRange(page, from.id, to.id);
        await captureTransition(page, prefix, transition);
      }
    }

    await page.getByRole('button', { name: /^9:16$/ }).click();
    await waitForUi(page);
    await saveScreenshot(shot('story-studio', 'story-studio-9x16.png'), page, null, { fullPage: true });

    await capturePortraitScene(page, 'KPI', 'portrait-kpi.png');
    await capturePortraitScene(page, 'Evolution', 'portrait-evolution.png');
    await capturePortraitScene(page, 'Ranking', 'portrait-ranking.png');
    await capturePortraitScene(page, 'Race', 'portrait-race.png');

    await publishStory(page);
    const publicStoryPage = await openPublicStory(page, context);
    await setViewport(publicStoryPage, 1600, 1200);
    await saveScreenshot(shot('public-story', 'public-story-desktop-9x16.png'), publicStoryPage, null, { fullPage: true });
    await setViewport(publicStoryPage, 430, 932);
    await waitForUi(publicStoryPage);
    await saveScreenshot(shot('public-story', 'public-story-mobile.png'), publicStoryPage, null, { fullPage: true });
    await publicStoryPage.close();

    await context.close();
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
