import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from '../tests/e2e/support/mockSupabase.ts';

const BASE_URL = process.env.SPHERE_VISUAL_AUDIT_BASE_URL || 'http://127.0.0.1:3303';
const ROOT = path.resolve(process.cwd(), process.env.SPHERE_VISUAL_AUDIT_ROOT || 'artifacts/m2-5-visual-audit');
const EXPORT_STATUS_ROOT = path.resolve(process.cwd(), 'artifacts/story-exports');
const FIXTURES = path.resolve(process.cwd(), 'tests/fixtures');

function fixture(name) {
  return path.join(FIXTURES, name);
}

function shot(...segments) {
  return path.join(ROOT, ...segments);
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function cleanRoot() {
  await fs.rm(ROOT, { recursive: true, force: true });
  for (const dir of ['shell', 'quick-result', 'refine', 'public-report', 'png', 'story-studio', 'public-story', 'export-ux', 'mp4']) {
    await ensureDir(shot(dir));
  }
}

async function setDesktop(page) {
  await page.setViewportSize({ width: 1600, height: 1200 });
}

async function setTablet(page) {
  await page.setViewportSize({ width: 1024, height: 1366 });
}

async function setMobile(page) {
  await page.setViewportSize({ width: 430, height: 932 });
}

async function waitForUi(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(250);
}

async function saveScreenshot(target, page, locator = null, options = {}) {
  await ensureDir(path.dirname(target));
  if (locator) {
    await locator.screenshot({ path: target, ...options });
  } else {
    await page.screenshot({ path: target, ...options });
  }
  const stat = await fs.stat(target);
  console.log(`saved ${path.relative(process.cwd(), target)} (${stat.size} bytes)`);
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

async function applyTemplate(page, index) {
  await page.locator('.template-chip').nth(index).click();
  await page.waitForTimeout(350);
}

async function savePngDownload(page, targetPath) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PNG$/ }).click();
  const download = await downloadPromise;
  await ensureDir(path.dirname(targetPath));
  await download.saveAs(targetPath);
  const stat = await fs.stat(targetPath);
  console.log(`saved ${path.relative(process.cwd(), targetPath)} (${stat.size} bytes)`);
}

async function publishQuickResult(page) {
  await page.getByRole('button', { name: /^Publish$/ }).click();
  await page.getByText(/Publicado correctamente/i).waitFor();
  await page.waitForTimeout(250);
}

async function openPublicReport(page, context) {
  const href = await page.locator('a:has-text("Open")').getAttribute('href');
  if (!href) {
    throw new Error('Public report URL not found.');
  }
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
  await page.waitForTimeout(250);
}

async function openPublicStory(page, context) {
  const href = await page.locator('a:has-text("Open Public Story")').getAttribute('href');
  if (!href) {
    throw new Error('Public story URL not found.');
  }
  const publicPage = await context.newPage();
  await publicPage.goto(href);
  await publicPage.getByRole('banner').getByText(/Sphere Story/i).waitFor();
  await waitForUi(publicPage);
  return publicPage;
}

async function captureSceneIfPresent(page, label, fileName) {
  const card = page.locator('.scene-card').filter({ hasText: label }).first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(250);
    await saveScreenshot(shot('story-studio', fileName), page, page.locator('[data-testid="story-frame"]'));
  }
}

async function createExportStatus(jobId, overrides) {
  const jobDir = path.join(EXPORT_STATUS_ROOT, jobId);
  await fs.rm(jobDir, { recursive: true, force: true });
  await fs.mkdir(jobDir, { recursive: true });
  await fs.writeFile(
    path.join(jobDir, 'status.json'),
    JSON.stringify(
      {
        jobId,
        status: 'processing',
        phase: 'rendering_frames',
        fps: 24,
        durationMs: 10114,
        frameCount: 243,
        currentFrame: 121,
        currentTimeMs: 5015,
        progress: 0.4979423868,
        renderTimeMs: null,
        frameRenderTimeMs: null,
        encodingTimeMs: null,
        fileName: null,
        outputPath: null,
        outputSizeBytes: null,
        error: null,
        technicalMetadata: { width: 1920, height: 1080 },
        startedAt: '2026-07-28T21:00:00.000Z',
        completedAt: null,
        heartbeatAt: '2026-07-28T21:00:30.000Z',
        updatedAt: '2026-07-28T21:00:30.000Z',
        ...overrides
      },
      null,
      2
    ),
    'utf8'
  );
}

async function captureQuickResult(browser) {
  const context = await browser.newContext({ acceptDownloads: true });
  const page = await context.newPage();
  const state = await createMockSupabaseState();
  await installMockSupabase(context, page, state);
  await setDesktop(page);

  await page.goto(BASE_URL);
  await page.getByText(/Sphere/i).first().waitFor();
  await saveScreenshot(shot('shell', 'dashboard-home-desktop.png'), page, null, { fullPage: true });

  await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
  await saveScreenshot(shot('quick-result', 'quick-modern-desktop.png'), page, null, { fullPage: true });

  await applyTemplate(page, 1);
  await saveScreenshot(shot('quick-result', 'quick-editorial-desktop.png'), page, null, { fullPage: true });

  await applyTemplate(page, 2);
  await saveScreenshot(shot('quick-result', 'quick-dark-desktop.png'), page, null, { fullPage: true });

  await setTablet(page);
  await saveScreenshot(shot('quick-result', 'quick-dark-tablet.png'), page, null, { fullPage: true });

  await setMobile(page);
  await saveScreenshot(shot('quick-result', 'quick-dark-mobile.png'), page, null, { fullPage: true });

  await setDesktop(page);
  await savePngDownload(page, shot('png', 'quick-result-dark.png'));

  await context.close();
}

async function captureRefineAndPublicReport(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const state = await createMockSupabaseState();
  await installMockSupabase(context, page, state);
  await setDesktop(page);

  await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
  await publishQuickResult(page);
  const publicPage = await openPublicReport(page, context);
  await setDesktop(publicPage);
  await saveScreenshot(shot('public-report', 'public-report-desktop.png'), publicPage, null, { fullPage: true });
  await setMobile(publicPage);
  await saveScreenshot(shot('public-report', 'public-report-mobile.png'), publicPage, null, { fullPage: true });
  await publicPage.close();

  await setDesktop(page);
  await page.getByRole('button', { name: /^Refine$|^Ir a Refine$/ }).first().click();
  await page.locator('.canvas-sidebar').waitFor();
  await waitForUi(page);
  await saveScreenshot(shot('refine', 'report-canvas-desktop.png'), page, null, { fullPage: true });

  await context.close();
}

async function captureStory(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const state = await createMockSupabaseState();
  await installMockSupabase(context, page, state);
  await setDesktop(page);

  await goToQuickResult(page, 'dataset-c-visual.csv');
  await createStory(page);

  await saveScreenshot(shot('story-studio', 'story-studio-16x9-initial.png'), page, null, { fullPage: true });
  await page.getByTestId('story-play-toggle').click();
  await page.waitForTimeout(900);
  await page.getByTestId('story-play-toggle').click();
  await saveScreenshot(shot('story-studio', 'story-frame-16x9-playing.png'), page, page.locator('[data-testid="story-frame"]'));

  for (const [label, fileName] of [
    ['Intro', 'scene-intro-16x9.png'],
    ['KPI', 'scene-kpi-16x9.png'],
    ['Evolution', 'scene-evolution-16x9.png'],
    ['Ranking', 'scene-ranking-16x9.png'],
    ['Race', 'scene-race-16x9.png'],
    ['Composition', 'scene-composition-16x9.png']
  ]) {
    await captureSceneIfPresent(page, label, fileName);
  }

  await page.getByRole('button', { name: /^9:16$/ }).click();
  await page.waitForTimeout(400);
  await saveScreenshot(shot('story-studio', 'story-studio-9x16-initial.png'), page, null, { fullPage: true });

  for (const [label, fileName] of [
    ['Intro', 'scene-intro-9x16.png'],
    ['KPI', 'scene-kpi-9x16.png'],
    ['Evolution', 'scene-evolution-9x16.png']
  ]) {
    await captureSceneIfPresent(page, label, fileName);
  }

  await publishStory(page);
  const publicPage = await openPublicStory(page, context);
  await setDesktop(publicPage);
  await saveScreenshot(shot('public-story', 'public-story-desktop-initial.png'), publicPage, null, { fullPage: true });
  await publicPage.getByRole('button', { name: /^Play$/ }).click();
  await publicPage.waitForTimeout(900);
  await saveScreenshot(shot('public-story', 'public-story-desktop-playing.png'), publicPage, null, { fullPage: true });
  await setMobile(publicPage);
  await saveScreenshot(shot('public-story', 'public-story-mobile.png'), publicPage, null, { fullPage: true });
  await publicPage.close();

  await context.close();
}

async function captureExportUx(browser) {
  const context = await browser.newContext();
  const page = await context.newPage();
  const state = await createMockSupabaseState();
  await installMockSupabase(context, page, state);
  await setDesktop(page);

  await goToQuickResult(page, 'dataset-c-visual.csv');
  await createStory(page);
  const storyId = state.stories[0]?.id;
  if (!storyId) {
    throw new Error('Mock story id not found.');
  }

  const preparingId = 'audit_export_preparing';
  const renderingId = 'audit_export_rendering';
  const encodingId = 'audit_export_encoding';
  const readyId = 'audit_export_ready';
  const failedId = 'audit_export_failed';

  await createExportStatus(preparingId, { phase: 'preparing', progress: 0, currentFrame: null, currentTimeMs: null });
  await createExportStatus(renderingId, { phase: 'rendering_frames', progress: 0.42, currentFrame: 102, currentTimeMs: 4250 });
  await createExportStatus(encodingId, { phase: 'encoding', progress: 1, currentFrame: 243, currentTimeMs: 10114 });
  await createExportStatus(readyId, {
    status: 'completed',
    phase: 'completed',
    progress: 1,
    currentFrame: 243,
    currentTimeMs: 10114,
    frameRenderTimeMs: 55459,
    encodingTimeMs: 1755,
    renderTimeMs: 57214,
    fileName: 'sphere-story.mp4',
    outputPath: '/tmp/sphere-story.mp4',
    outputSizeBytes: 406836,
    completedAt: '2026-07-28T21:10:00.000Z'
  });
  await createExportStatus(failedId, {
    status: 'failed',
    phase: 'failed',
    error: 'FFmpeg failed while encoding the final MP4.',
    completedAt: '2026-07-28T21:11:00.000Z'
  });

  state.storyExportJobs.push(
    {
      id: preparingId,
      story_id: storyId,
      user_id: state.user.id,
      status: 'processing',
      phase: 'preparing',
      orientation: 'landscape',
      render_token: 'token-preparing',
      file_name: null,
      output_path: null,
      output_size_bytes: null,
      duration_ms: 10114,
      frame_count: 243,
      current_frame: null,
      current_time_ms: null,
      progress: 0,
      fps: 24,
      render_time_ms: null,
      frame_render_time_ms: null,
      encoding_time_ms: null,
      error: null,
      technical_metadata: {},
      created_at: '2026-07-28T21:00:00.000Z',
      started_at: '2026-07-28T21:00:00.000Z',
      completed_at: null,
      heartbeat_at: '2026-07-28T21:00:05.000Z',
      updated_at: '2026-07-28T21:00:05.000Z'
    },
    {
      id: renderingId,
      story_id: storyId,
      user_id: state.user.id,
      status: 'processing',
      phase: 'rendering_frames',
      orientation: 'landscape',
      render_token: 'token-rendering',
      file_name: null,
      output_path: null,
      output_size_bytes: null,
      duration_ms: 10114,
      frame_count: 243,
      current_frame: 102,
      current_time_ms: 4250,
      progress: 0.42,
      fps: 24,
      render_time_ms: null,
      frame_render_time_ms: null,
      encoding_time_ms: null,
      error: null,
      technical_metadata: {},
      created_at: '2026-07-28T21:00:00.000Z',
      started_at: '2026-07-28T21:00:00.000Z',
      completed_at: null,
      heartbeat_at: '2026-07-28T21:00:20.000Z',
      updated_at: '2026-07-28T21:00:20.000Z'
    },
    {
      id: encodingId,
      story_id: storyId,
      user_id: state.user.id,
      status: 'processing',
      phase: 'encoding',
      orientation: 'portrait',
      render_token: 'token-encoding',
      file_name: null,
      output_path: null,
      output_size_bytes: null,
      duration_ms: 10114,
      frame_count: 243,
      current_frame: 243,
      current_time_ms: 10114,
      progress: 1,
      fps: 24,
      render_time_ms: null,
      frame_render_time_ms: 56727,
      encoding_time_ms: null,
      error: null,
      technical_metadata: {},
      created_at: '2026-07-28T21:00:00.000Z',
      started_at: '2026-07-28T21:00:00.000Z',
      completed_at: null,
      heartbeat_at: '2026-07-28T21:00:30.000Z',
      updated_at: '2026-07-28T21:00:30.000Z'
    },
    {
      id: readyId,
      story_id: storyId,
      user_id: state.user.id,
      status: 'completed',
      phase: 'completed',
      orientation: 'landscape',
      render_token: 'token-ready',
      file_name: 'sphere-story.mp4',
      output_path: '/tmp/sphere-story.mp4',
      output_size_bytes: 406836,
      duration_ms: 10114,
      frame_count: 243,
      current_frame: 243,
      current_time_ms: 10114,
      progress: 1,
      fps: 24,
      render_time_ms: 57214,
      frame_render_time_ms: 55459,
      encoding_time_ms: 1755,
      error: null,
      technical_metadata: {},
      created_at: '2026-07-28T21:00:00.000Z',
      started_at: '2026-07-28T21:00:00.000Z',
      completed_at: '2026-07-28T21:01:00.000Z',
      heartbeat_at: '2026-07-28T21:01:00.000Z',
      updated_at: '2026-07-28T21:01:00.000Z'
    },
    {
      id: failedId,
      story_id: storyId,
      user_id: state.user.id,
      status: 'failed',
      phase: 'failed',
      orientation: 'portrait',
      render_token: 'token-failed',
      file_name: null,
      output_path: null,
      output_size_bytes: null,
      duration_ms: 10114,
      frame_count: 243,
      current_frame: 243,
      current_time_ms: 10114,
      progress: 1,
      fps: 24,
      render_time_ms: null,
      frame_render_time_ms: 56727,
      encoding_time_ms: null,
      error: 'FFmpeg failed while encoding the final MP4.',
      technical_metadata: {},
      created_at: '2026-07-28T21:00:00.000Z',
      started_at: '2026-07-28T21:00:00.000Z',
      completed_at: '2026-07-28T21:02:00.000Z',
      heartbeat_at: '2026-07-28T21:02:00.000Z',
      updated_at: '2026-07-28T21:02:00.000Z'
    }
  );

  await page.goto(BASE_URL);
  await page.getByText(/My Reports|Mis Reportes/i).first().click();
  await page.getByText(/^Stories$/).waitFor();
  await page.locator('.report-item').last().click();
  await page.getByText(/Story Mode/i).waitFor();
  await waitForUi(page);
  await saveScreenshot(shot('export-ux', 'story-studio-export-jobs.png'), page, null, { fullPage: true });

  await context.close();
}

async function main() {
  await cleanRoot();
  const browser = await chromium.launch({ headless: true });
  try {
    await captureQuickResult(browser);
    await captureRefineAndPublicReport(browser);
    await captureStory(browser);
    await captureExportUx(browser);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
