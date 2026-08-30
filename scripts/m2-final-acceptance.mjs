import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from '../tests/e2e/support/mockSupabase.ts';

const BASE_URL = process.env.SPHERE_FINAL_ACCEPTANCE_BASE_URL || 'http://127.0.0.1:3305';
const ROOT = path.resolve(process.cwd(), 'artifacts/m2-final-acceptance');
const FIXTURES = path.resolve(process.cwd(), 'tests/fixtures');

const fixture = (name) => path.join(FIXTURES, name);
const shot = (...segments) => path.join(ROOT, ...segments);

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function cleanRoot() {
  await fs.rm(ROOT, { recursive: true, force: true });
  for (const dir of ['report', 'story', 'transitions']) {
    await ensureDir(shot(dir));
  }
}

async function setViewport(page, width, height) {
  await page.setViewportSize({ width, height });
}

async function waitForFonts(page) {
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
}

async function saveScreenshot(target, page, locator = null, options = {}) {
  await ensureDir(path.dirname(target));
  if (locator) {
    await locator.screenshot({ path: target, ...options });
  } else {
    await page.screenshot({ path: target, ...options });
  }
}

async function waitForQuickResult(page) {
  await page.getByText('Instant Wow').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.quick-grid-item').length >= 4);
  await page.waitForFunction(() => document.querySelectorAll('.animate-spin').length === 0);
  await waitForFonts(page);
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
  await waitForQuickResult(page);
}

async function waitForReportStable(page, testId) {
  await page.getByTestId(testId).waitFor();
  await page.waitForFunction((id) => {
    const root = document.querySelector(`[data-testid="${id}"]`);
    if (!root) return false;
    return root.getAttribute('data-report-ready') === 'true';
  }, testId);
  await page.waitForFunction(() => document.querySelectorAll('.animate-spin').length === 0);
  await page.waitForFunction(() => document.querySelectorAll('[data-visual-ready="true"]').length >= 4);
  await waitForFonts(page);
}

async function waitForRefineStable(page) {
  await page.locator('.canvas-sidebar').waitFor();
  await page.waitForFunction(() => document.querySelectorAll('.animate-spin').length === 0);
  await page.waitForFunction(() => document.querySelectorAll('.react-grid-item [data-visual-ready="true"]').length >= 4);
  await waitForFonts(page);
}

async function prepareRefineScreenshot(page) {
  await page.evaluate(() => {
    const main = document.querySelector('main');
    const dashboardContent = document.querySelector('.dashboard-content');
    const gridWrapper = document.querySelector('.react-grid-layout');

    if (main instanceof HTMLElement) {
      main.style.overflow = 'visible';
      main.style.height = 'auto';
      main.style.minHeight = '0';
    }

    if (dashboardContent instanceof HTMLElement) {
      dashboardContent.style.overflow = 'visible';
      dashboardContent.style.height = 'auto';
      dashboardContent.style.minHeight = '0';
    }

    if (gridWrapper instanceof HTMLElement) {
      gridWrapper.style.minHeight = 'auto';
      gridWrapper.style.height = 'auto';
    }
  });
  await page.waitForTimeout(120);
}

async function waitForStoryReady(page) {
  await page.locator('[data-story-ready="true"]').waitFor();
  await waitForFonts(page);
}

async function publishQuickResult(page) {
  await page.getByRole('button', { name: /^Publish$/ }).click();
  await page.getByText(/Publicado correctamente/i).waitFor();
}

async function openPublicReport(page, context) {
  const href = await page.locator('a:has-text("Open")').getAttribute('href');
  const publicPage = await context.newPage();
  await publicPage.goto(href);
  await publicPage.getByText(/Sphere Public/i).waitFor();
  await waitForReportStable(publicPage, 'public-report-root');
  return publicPage;
}

async function createStory(page) {
  await page.getByRole('button', { name: /^Create Story$/ }).first().click();
  await page.getByText(/Story Mode/i).waitFor();
  await waitForStoryReady(page);
}

async function setStoryTime(page, timeMs) {
  const slider = page.locator('.story-progress-block input[type="range"]').first();
  await slider.evaluate((element, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    setter?.call(element, String(value));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, timeMs);
  await page.waitForTimeout(80);
}

async function captureTransition(page, filePrefix, fromSceneId, toSceneId) {
  const timeline = await page.locator('[data-story-ready="true"]').evaluate((node) => {
    const raw = node.getAttribute('data-story-timeline') || '[]';
    return JSON.parse(raw);
  });

  const fromEntry = timeline.find((entry) => entry.sceneId === fromSceneId);
  const toEntry = timeline.find((entry) => entry.sceneId === toSceneId);

  if (!fromEntry || !toEntry || !fromEntry.overlapMs) {
    return { filePrefix, captured: false, reason: 'missing-overlap' };
  }

  const transitionStartMs = toEntry.startMs;
  const transitionEndMs = fromEntry.endMs;
  const samples = [
    ['25', 0.25],
    ['50', 0.5],
    ['75', 0.75]
  ];

  for (const [label, ratio] of samples) {
    const timeMs = Math.round(transitionStartMs + (transitionEndMs - transitionStartMs) * ratio);
    await setStoryTime(page, timeMs);
    await saveScreenshot(
      shot('transitions', `${filePrefix}-${label}.png`),
      page,
      page.locator('[data-testid="story-frame"]')
    );
  }

  return { filePrefix, captured: true };
}

async function publishStory(page) {
  await page.getByRole('button', { name: /^Publish$/ }).click();
  await page.getByText(/Story publicada/i).waitFor();
}

async function openPublicStory(page, context) {
  const href = await page.locator('a:has-text("Open Public Story")').getAttribute('href');
  const publicPage = await context.newPage();
  await publicPage.goto(href);
  await publicPage.getByRole('banner').getByText(/Sphere Story/i).waitFor();
  await waitForStoryReady(publicPage);
  return publicPage;
}

async function main() {
  await cleanRoot();
  const browser = await chromium.launch({ headless: true });

  try {
    const context = await browser.newContext({ acceptDownloads: true });
    await context.addInitScript(() => {
      window.__SPHERE_QA_STATIC__ = true;
    });

    const page = await context.newPage();
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await setViewport(page, 1600, 1200);
    await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
    await page.getByRole('button', { name: /^Refine$|^Ir a Refine$/ }).first().click();
    await waitForRefineStable(page);
    await setViewport(page, 1600, 2100);
    await waitForRefineStable(page);
    await prepareRefineScreenshot(page);
    await saveScreenshot(shot('report', 'refine-stable.png'), page, null, { fullPage: true });

    await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
    await publishQuickResult(page);
    const publicReportPage = await openPublicReport(page, context);
    await setViewport(publicReportPage, 1600, 1200);
    await waitForReportStable(publicReportPage, 'public-report-root');
    await saveScreenshot(
      shot('report', 'public-desktop-stable.png'),
      publicReportPage,
      publicReportPage.getByTestId('public-report-root')
    );
    await setViewport(publicReportPage, 430, 932);
    await waitForReportStable(publicReportPage, 'public-report-root');
    await saveScreenshot(
      shot('report', 'public-mobile-stable.png'),
      publicReportPage,
      publicReportPage.getByTestId('public-report-root')
    );
    await publicReportPage.close();

    await goToQuickResult(page, 'dataset-c-visual.csv');
    await createStory(page);
    await waitForStoryReady(page);

    const sceneMeta = await page.locator('.scene-card').evaluateAll((cards) => cards.map((card) => ({
      id: card.getAttribute('data-scene-id') || '',
      kind: card.getAttribute('data-scene-kind') || ''
    })));

    const transitions = [
      ['intro-kpi', sceneMeta[0], sceneMeta[1]],
      ['kpi-evolution', sceneMeta[1], sceneMeta[2]],
      ['evolution-ranking', sceneMeta[2], sceneMeta[3]],
      ['ranking-race', sceneMeta[3], sceneMeta[4]]
    ];

    for (const [prefix, from, to] of transitions) {
      if (from?.id && to?.id) {
        await captureTransition(page, prefix, from.id, to.id);
      }
    }

    await page.getByRole('button', { name: /^9:16$/ }).click();
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-story-ready="true"]');
      return root?.getAttribute('data-story-orientation') === 'portrait';
    });
    await waitForStoryReady(page);

    await publishStory(page);
    const publicStoryPage = await openPublicStory(page, context);
    await setViewport(publicStoryPage, 1600, 1200);
    await publicStoryPage.waitForFunction(() => {
      const root = document.querySelector('[data-story-ready="true"]');
      return root?.getAttribute('data-story-orientation') === 'portrait';
    });
    await saveScreenshot(shot('story', 'public-story-9x16.png'), publicStoryPage, null, { fullPage: true });
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
