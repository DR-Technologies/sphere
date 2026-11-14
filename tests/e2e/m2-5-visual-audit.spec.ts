import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);
const ARTIFACT_ROOT = path.resolve(process.cwd(), 'artifacts/m2-5-visual-audit');
const EXPORT_STATUS_ROOT = path.resolve(process.cwd(), 'artifacts/story-exports');

function shot(...segments: string[]) {
  return path.join(ARTIFACT_ROOT, ...segments);
}

async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function setDesktop(page: Page) {
  await page.setViewportSize({ width: 1600, height: 1200 });
}

async function setTablet(page: Page) {
  await page.setViewportSize({ width: 1024, height: 1366 });
}

async function setMobile(page: Page) {
  await page.setViewportSize({ width: 430, height: 932 });
}

async function goToQuickResult(page: Page, fileName: string, dateFormat?: string) {
  await page.goto('/');
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture(fileName));
  await expect(page.getByText(/Import options|Opciones de importación/)).toBeVisible();
  if (dateFormat) {
    await page.locator('select').last().selectOption(dateFormat);
  }
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow')).toBeVisible();
  await expect(page.locator('.template-chip')).toHaveCount(3);
}

async function applyTemplate(page: Page, templateIndex: 0 | 1 | 2) {
  await page.locator('.template-chip').nth(templateIndex).click();
  await page.waitForTimeout(300);
}

async function savePngDownload(page: Page, targetPath: string) {
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PNG$/ }).click();
  const download = await downloadPromise;
  await ensureDir(path.dirname(targetPath));
  await download.saveAs(targetPath);
}

async function publishQuickResult(page: Page) {
  await page.getByRole('button', { name: /^Publish$/ }).click();
  await expect(page.getByText(/Publicado correctamente/i)).toBeVisible();
}

async function openPublicReport(page: Page, context: BrowserContext) {
  const href = await page.locator('a:has-text("Open")').getAttribute('href');
  expect(href).toBeTruthy();
  const publicPage = await context.newPage();
  await publicPage.goto(href!);
  await expect(publicPage.getByText('Public', { exact: true })).toBeVisible();
  return publicPage;
}

async function createStory(page: Page) {
  await page.getByRole('button', { name: /^Create Story$/ }).first().click();
  await expect(page.getByText(/Story Mode/i)).toBeVisible();
}

async function publishStory(page: Page) {
  await page.getByRole('button', { name: /^Publish$/ }).click();
  await expect(page.getByText(/Story publicada/i)).toBeVisible();
}

async function openPublicStory(page: Page, context: BrowserContext) {
  const href = await page.locator('a:has-text("Open Public Story")').getAttribute('href');
  expect(href).toBeTruthy();
  const publicPage = await context.newPage();
  await publicPage.goto(href!);
  await expect(publicPage.getByRole('banner').getByText('Story', { exact: true })).toBeVisible();
  return publicPage;
}

async function captureSceneIfPresent(page: Page, label: string, fileName: string) {
  const card = page.locator('.scene-card').filter({ hasText: label }).first();
  if (await card.count()) {
    await card.click();
    await page.waitForTimeout(150);
    await page.locator('[data-testid="story-frame"]').screenshot({ path: shot('story-studio', fileName) });
  }
}

async function createExportStatus(jobId: string, overrides: Record<string, unknown>) {
  const jobDir = path.join(EXPORT_STATUS_ROOT, jobId);
  await fs.rm(jobDir, { recursive: true, force: true });
  await fs.mkdir(jobDir, { recursive: true });
  await fs.writeFile(
    path.join(jobDir, 'status.json'),
    JSON.stringify({
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
    }, null, 2),
    'utf8'
  );
}

test.describe('M2.5A Visual Audit Baseline', () => {
  test.beforeAll(async () => {
    await fs.rm(ARTIFACT_ROOT, { recursive: true, force: true });
    await ensureDir(ARTIFACT_ROOT);
    await ensureDir(shot('shell'));
    await ensureDir(shot('quick-result'));
    await ensureDir(shot('refine'));
    await ensureDir(shot('public-report'));
    await ensureDir(shot('png'));
    await ensureDir(shot('story-studio'));
    await ensureDir(shot('public-story'));
    await ensureDir(shot('export-ux'));
  });

  test('global shell and quick result baseline', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual baseline is generated in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await setDesktop(page);

    await page.goto('/');
    await expect(page.getByText(/Sphere/i).first()).toBeVisible();
    await page.screenshot({ path: shot('shell', 'dashboard-home-desktop.png'), fullPage: true });

    await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
    await page.screenshot({ path: shot('quick-result', 'quick-modern-desktop.png'), fullPage: true });

    await applyTemplate(page, 1);
    await page.screenshot({ path: shot('quick-result', 'quick-editorial-desktop.png'), fullPage: true });

    await applyTemplate(page, 2);
    await page.screenshot({ path: shot('quick-result', 'quick-dark-desktop.png'), fullPage: true });

    await setTablet(page);
    await page.screenshot({ path: shot('quick-result', 'quick-dark-tablet.png'), fullPage: true });

    await setMobile(page);
    await page.screenshot({ path: shot('quick-result', 'quick-dark-mobile.png'), fullPage: true });

    await setDesktop(page);
    await savePngDownload(page, shot('png', 'quick-result-dark.png'));
  });

  test('refine and public report baseline', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual baseline is generated in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await setDesktop(page);

    await goToQuickResult(page, 'dataset-b-empresarial.csv', 'DD/MM/YYYY');
    await publishQuickResult(page);
    const publicPage = await openPublicReport(page, context);

    await setDesktop(publicPage);
    await publicPage.screenshot({ path: shot('public-report', 'public-report-desktop.png'), fullPage: true });
    await setMobile(publicPage);
    await publicPage.screenshot({ path: shot('public-report', 'public-report-mobile.png'), fullPage: true });
    await publicPage.close();

    await setDesktop(page);
    await page.getByRole('button', { name: /^Refine$|^Ir a Refine$/ }).first().click();
    await expect(page.locator('.canvas-sidebar')).toBeVisible();
    await page.screenshot({ path: shot('refine', 'report-canvas-desktop.png'), fullPage: true });
  });

  test('story studio and public story baseline', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual baseline is generated in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await setDesktop(page);

    await goToQuickResult(page, 'dataset-c-visual.csv');
    await createStory(page);

    await page.screenshot({ path: shot('story-studio', 'story-studio-16x9-initial.png'), fullPage: true });
    await page.getByTestId('story-play-toggle').click();
    await page.waitForTimeout(900);
    await page.getByTestId('story-play-toggle').click();
    await page.locator('[data-testid="story-frame"]').screenshot({ path: shot('story-studio', 'story-frame-16x9-playing.png') });

    const scenes16 = [
      ['Intro', 'scene-intro-16x9.png'],
      ['KPI', 'scene-kpi-16x9.png'],
      ['Evolution', 'scene-evolution-16x9.png'],
      ['Ranking', 'scene-ranking-16x9.png'],
      ['Race', 'scene-race-16x9.png'],
      ['Composition', 'scene-composition-16x9.png']
    ] as const;

    for (const [label, fileName] of scenes16) {
      await captureSceneIfPresent(page, label, fileName);
    }

    await page.getByRole('button', { name: /^9:16$/ }).click();
    await page.waitForTimeout(400);
    await page.screenshot({ path: shot('story-studio', 'story-studio-9x16-initial.png'), fullPage: true });

    const scenes9 = [
      ['Intro', 'scene-intro-9x16.png'],
      ['KPI', 'scene-kpi-9x16.png'],
      ['Evolution', 'scene-evolution-9x16.png']
    ] as const;

    for (const [label, fileName] of scenes9) {
      await captureSceneIfPresent(page, label, fileName);
    }

    await publishStory(page);
    const publicPage = await openPublicStory(page, context);

    await setDesktop(publicPage);
    await publicPage.screenshot({ path: shot('public-story', 'public-story-desktop-initial.png'), fullPage: true });
    await publicPage.getByRole('button', { name: /^Play$/ }).click();
    await publicPage.waitForTimeout(900);
    await publicPage.screenshot({ path: shot('public-story', 'public-story-desktop-playing.png'), fullPage: true });
    await setMobile(publicPage);
    await publicPage.screenshot({ path: shot('public-story', 'public-story-mobile.png'), fullPage: true });
    await publicPage.close();
  });

  test('export UX phase baseline', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual baseline is generated in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await setDesktop(page);

    await goToQuickResult(page, 'dataset-c-visual.csv');
    await createStory(page);
    const storyId = state.stories[0]?.id;
    expect(storyId).toBeTruthy();

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
        story_id: storyId!,
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
        story_id: storyId!,
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
        story_id: storyId!,
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
        story_id: storyId!,
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
        story_id: storyId!,
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

    await page.goto('/');
    await page.getByRole('button', { name: /My Reports|Mis reportes/i }).click();
    await expect(page.getByText(/^Stories$/)).toBeVisible();
    await page.locator('.report-item').last().click();
    await expect(page.getByText(/Story Mode/i)).toBeVisible();
    await page.screenshot({ path: shot('export-ux', 'story-studio-export-jobs.png'), fullPage: true });
  });
});
