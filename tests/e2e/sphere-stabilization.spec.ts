import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const artifactDir = path.resolve(process.cwd(), 'artifacts', 'sphere-stabilization');
const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);

async function goToQuickResult(page: Page) {
  await page.goto('/');
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture('dataset-a-simple.csv'));
  await page.locator('select').last().selectOption('DD/MM/YYYY');
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow')).toBeVisible();
  await expect(page.locator('.animate-spin')).toHaveCount(0);
}

async function expectReportPreloaderCentered(page: Page) {
  const centers = await page.getByTestId('report-preloader').evaluate((element) => {
    const content = element.querySelector('[data-testid="report-preloader-content"]');
    if (!(content instanceof HTMLElement)) throw new Error('Report preloader content is missing.');
    const hostRect = element.getBoundingClientRect();
    const contentRect = content.getBoundingClientRect();
    return {
      horizontal: Math.abs((hostRect.left + hostRect.width / 2) - (contentRect.left + contentRect.width / 2)),
      vertical: Math.abs((hostRect.top + hostRect.height / 2) - (contentRect.top + contentRect.height / 2))
    };
  });
  expect(centers.horizontal).toBeLessThanOrEqual(1);
  expect(centers.vertical).toBeLessThanOrEqual(1);
}

test.describe('Sphere lifecycle and theme stabilization', () => {
  test.describe.configure({ mode: 'serial' });
  test.beforeEach(async () => {
    await fs.mkdir(artifactDir, { recursive: true });
  });

  test('collapsed navigation is restored through its centered theme logo', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await page.goto('/');

    await page.locator('.sidebar').screenshot({ path: path.join(artifactDir, 'sidebar-expanded-light.png') });
    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    const expandLogo = page.getByRole('button', { name: 'Expandir navegación' });
    await expect(expandLogo).toBeVisible();
    await expect(page.getByRole('button', { name: 'Expand sidebar' })).toHaveCount(0);
    await page.locator('.sidebar').screenshot({ path: path.join(artifactDir, 'sidebar-collapsed-light.png') });

    await expandLogo.click();
    await expect(page.getByRole('button', { name: 'Collapse sidebar' })).toBeVisible();
  });

  test('report save, save as, listing, limit, deletion and active public URL stay coherent', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText(/Publicado correctamente|Published successfully/i)).toBeVisible();
    expect(state.reports).toHaveLength(1);
    expect(state.snapshots).toHaveLength(1);

    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    const reportName = page.getByRole('textbox', { name: 'Report name' });
    await expect(reportName).toBeVisible();
    const originalId = state.reports[0].id;
    await reportName.fill('Ventas Agosto');
    await page.getByRole('button', { name: /^Save$/ }).click();
    await expect.poll(() => state.reports.find((report) => report.id === originalId)?.name).toBe('Ventas Agosto');
    expect(state.reports).toHaveLength(1);

    const editorSettings = page.locator('button.btn-secondary').filter({ hasText: /^Settings$/ });
    await editorSettings.click();
    await expect(page.locator('input[readonly][value*="/report/pub_"]')).toBeVisible();
    await page.locator('.canvas-sidebar').screenshot({ path: path.join(artifactDir, 'report-settings-active-url.png') });
    await editorSettings.click();

    page.once('dialog', (dialog) => dialog.accept('Ventas Septiembre'));
    await page.getByRole('button', { name: /Save As/i }).click();
    await expect.poll(() => state.reports.length).toBe(2);
    expect(state.reports.some((report) => report.id === originalId && report.name === 'Ventas Agosto')).toBe(true);

    page.once('dialog', (dialog) => dialog.accept('Ventas Octubre'));
    await page.getByRole('button', { name: /Save As/i }).click();
    await expect.poll(() => state.reports.length).toBe(3);

    await reportName.fill('Ventas Octubre Final');
    await page.getByRole('button', { name: /^Save$/ }).click();
    await expect.poll(() => state.reports.some((report) => report.name === 'Ventas Octubre Final')).toBe(true);
    expect(state.reports).toHaveLength(3);

    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('límite de 3 reportes');
      return dialog.accept();
    });
    await page.getByRole('button', { name: /Save As/i }).click();
    expect(state.reports).toHaveLength(3);

    await page.locator('.sidebar-nav .nav-item[title]').filter({ has: page.locator('svg') }).nth(2).click();
    await expect(page.locator('.report-item')).toHaveCount(3);
    await expect(page.getByText('Ventas Agosto')).toBeVisible();
    await expect(page.getByText('Ventas Septiembre')).toBeVisible();
    await expect(page.getByText('Ventas Octubre Final')).toBeVisible();
    await page.screenshot({ path: path.join(artifactDir, 'reports-three-records.png'), fullPage: true });

    const renameCard = page.locator('.report-item').filter({ hasText: 'Ventas Septiembre' });
    await renameCard.getByRole('button', { name: 'Actions' }).click();
    page.once('dialog', (dialog) => dialog.accept('Ventas Septiembre Renombrado'));
    await page.getByRole('button', { name: /Rename|Cambiar nombre/ }).click();
    await expect(page.getByText('Ventas Septiembre Renombrado')).toBeVisible();
    await expect.poll(() => state.reports.some((report) => report.name === 'Ventas Septiembre Renombrado')).toBe(true);

    const publishedCard = page.locator('.report-item').filter({ hasText: 'Ventas Agosto' });
    await publishedCard.getByRole('button', { name: 'Actions' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Delete|Eliminar/ }).click();
    await expect.poll(() => state.reports.length).toBe(2);
    expect(state.snapshots).toHaveLength(0);
    await expect(page.locator('.report-item')).toHaveCount(2);
  });

  test('Instant Wow blocks report-dependent actions before creating partial records', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    const datasetId = state.datasets[0].id;
    state.reports = [1, 2, 3].map((index) => ({
      id: `report_limit_${index}`,
      user_id: state.user.id,
      name: `Existing report ${index}`,
      dataset_id: datasetId,
      widgets: [],
      filters: [],
      created_at: new Date(2026, 6, index).toISOString()
    }));

    await page.getByRole('button', { name: /^Create Story$/ }).first().click();
    await expect(page.getByText(/alcanzó el límite de 3 reportes/i)).toBeVisible();
    expect(state.reports).toHaveLength(3);
    expect(state.stories).toHaveLength(0);

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText(/alcanzó el límite de 3 reportes/i)).toBeVisible();
    expect(state.reports).toHaveLength(3);
    expect(state.snapshots).toHaveLength(0);

    state.datasets.push(
      { ...state.datasets[0], id: 'standard_dataset_2', name: 'Dataset 2' },
      { ...state.datasets[0], id: 'standard_dataset_3', name: 'Dataset 3' }
    );
    const datasetLimitStatus = await page.evaluate(async () => {
      const response = await fetch('/rest/v1/datasets', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify([{ name: 'Dataset 4', file_url: 'mock://dataset-4', columns: [], stats: [] }])
      });
      return response.status;
    });
    expect(datasetLimitStatus).toBe(400);
  });

  test('Report Settings never exposes a revoked publication as active', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByRole('button', { name: /^Unpublish$/ })).toBeVisible();
    await page.getByRole('button', { name: /^Unpublish$/ }).click();
    await expect(page.getByText(/Publicación revocada|revoked/i)).toBeVisible();
    expect(state.snapshots.filter((snapshot) => snapshot.revoked_at === null)).toHaveLength(0);

    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    await page.locator('button.btn-secondary').filter({ hasText: /^Settings$/ }).click();
    await expect(page.locator('input[readonly][value="No publicado"]')).toBeVisible();
    await expect(page.locator('input[readonly][value*="/report/"]')).toHaveCount(0);
  });

  test('Story deletion removes its public snapshots and export jobs', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    const datasetId = state.datasets[0].id;
    const timestamp = '2026-09-03T12:00:00.000Z';
    state.stories.push({
      id: 'story_lifecycle_1',
      user_id: state.user.id,
      dataset_id: datasetId,
      source_report_id: null,
      title: 'Story lifecycle QA',
      subtitle: 'Lifecycle fixture',
      template_id: 'modern',
      motion_preset_id: 'smooth',
      pacing_preset_id: 'standard',
      orientation: 'landscape',
      definition_version: 1,
      story_definition: {},
      created_at: timestamp,
      updated_at: timestamp
    });
    state.storySnapshots.push({
      id: 'story_snapshot_lifecycle_1',
      slug: 'story-lifecycle-public',
      story_id: 'story_lifecycle_1',
      dataset_id: datasetId,
      user_id: state.user.id,
      title: 'Story lifecycle QA',
      subtitle: 'Lifecycle fixture',
      template_id: 'modern',
      motion_preset_id: 'smooth',
      pacing_preset_id: 'standard',
      orientation: 'landscape',
      definition_version: 1,
      render_model_version: 1,
      story_definition: {},
      materialized_story: {},
      published_at: timestamp,
      revoked_at: null,
      created_at: timestamp,
      updated_at: timestamp
    });
    state.storyExportJobs.push({
      id: 'story_export_lifecycle_1',
      story_id: 'story_lifecycle_1',
      user_id: state.user.id,
      status: 'completed',
      phase: 'completed',
      orientation: 'landscape',
      render_token: 'render-token',
      file_name: 'story.mp4',
      output_path: 'artifacts/story-exports/story_export_lifecycle_1/story.mp4',
      output_size_bytes: 1024,
      duration_ms: 1000,
      frame_count: 24,
      current_frame: 24,
      current_time_ms: 1000,
      progress: 100,
      fps: 24,
      render_time_ms: 1000,
      frame_render_time_ms: 900,
      encoding_time_ms: 100,
      error: null,
      technical_metadata: {},
      created_at: timestamp,
      started_at: timestamp,
      completed_at: timestamp,
      heartbeat_at: timestamp,
      updated_at: timestamp
    });

    await page.getByRole('button', { name: /My Reports|Mis reportes/i }).click();
    const storyCard = page.locator('.report-item').filter({ hasText: 'Story lifecycle QA' });
    await expect(storyCard).toBeVisible();
    await storyCard.getByRole('button', { name: 'Actions' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Delete|Eliminar/ }).click();

    await expect.poll(() => state.stories.length).toBe(0);
    expect(state.storySnapshots).toHaveLength(0);
    expect(state.storyExportJobs).toHaveLength(0);
    await expect(storyCard).toHaveCount(0);
  });

  test('Dataset deletion is blocked while reports or Stories depend on it', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    const dataset = state.datasets[0];
    const timestamp = '2026-09-03T12:00:00.000Z';
    state.reports.push({
      id: 'dataset_report_1', user_id: state.user.id, name: 'Dataset report', dataset_id: dataset.id,
      widgets: [], filters: [], created_at: timestamp
    });
    state.snapshots.push({
      id: 'dataset_report_snapshot_1', slug: 'dataset-report-public', report_id: 'dataset_report_1',
      dataset_id: dataset.id, user_id: state.user.id, title: 'Dataset report', subtitle: null,
      template_id: 'modern', widgets: [], widget_results: [], columns: [], published_at: timestamp,
      revoked_at: null, created_at: timestamp, updated_at: timestamp
    });
    state.stories.push({
      id: 'dataset_story_1', user_id: state.user.id, dataset_id: dataset.id, source_report_id: 'dataset_report_1',
      title: 'Dataset story', subtitle: '', template_id: 'modern', motion_preset_id: 'smooth',
      pacing_preset_id: 'standard', orientation: 'landscape', definition_version: 1,
      story_definition: {}, created_at: timestamp, updated_at: timestamp
    });

    await page.getByRole('button', { name: /My Datasets|Mis datasets/i }).click();
    const datasetCard = page.locator('.ds-item').filter({ hasText: dataset.name });
    await datasetCard.getByRole('button', { name: 'Actions' }).click();
    page.once('dialog', (dialog) => {
      expect(dialog.message()).toContain('1 reporte');
      expect(dialog.message()).toContain('Dataset report');
      return dialog.accept();
    });
    await page.getByRole('button', { name: /Delete|Eliminar/ }).click();

    expect(state.datasets).toHaveLength(1);
    expect(state.reports).toHaveLength(1);
    expect(state.snapshots).toHaveLength(1);
    expect(state.stories).toHaveLength(1);

    const directDelete = await page.evaluate(async (datasetId) => {
      const response = await fetch('/rest/v1/rpc/delete_dataset_lifecycle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ p_dataset_id: datasetId })
      });
      return { status: response.status, body: await response.json() };
    }, dataset.id);
    expect(directDelete.status).toBe(400);
    expect(directDelete.body.message).toBe('DATASET_HAS_REPORTS');
    expect(state.datasets).toHaveLength(1);

    state.reports = [];
    state.snapshots = [];
    state.stories = [];
    await datasetCard.getByRole('button', { name: 'Actions' }).click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: /Delete|Eliminar/ }).click();
    await expect.poll(() => state.datasets.length).toBe(0);
    await expect(datasetCard).toHaveCount(0);
  });

  test('an existing report opens in Instant Wow preview and returns there from Refine', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText(/Publicado correctamente|Published successfully/i)).toBeVisible();
    expect(state.reports).toHaveLength(1);
    const reportId = state.reports[0].id;
    const widgetSnapshot = JSON.stringify(state.reports[0].widgets);

    await page.getByRole('button', { name: /My Reports|Mis reportes/i }).click();
    state.storageReadDelayMs = 5000;
    state.datasetQueryFailuresRemaining = 1;
    await page.locator('.report-item').filter({ hasText: state.reports[0].name }).click();
    const preloader = page.getByTestId('report-preloader');
    await expect(preloader).toContainText('Preparando tu reporte...');
    const preloaderLogo = preloader.locator('img');
    await expect(preloaderLogo).toHaveAttribute('src', /logoModoOscuro\.png/);
    await expect(preloaderLogo).toHaveCSS('width', '56px');
    await expect(preloaderLogo).toHaveCSS('height', '56px');
    await expect(preloaderLogo).toHaveCSS('animation-duration', '8s');
    await expect(preloaderLogo).toHaveCSS('animation-timing-function', 'linear');
    await expect(preloaderLogo).toHaveCSS('animation-iteration-count', 'infinite');
    for (const viewport of [{ width: 1280, height: 720 }, { width: 820, height: 1180 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(viewport);
      await expectReportPreloaderCentered(page);
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(preloaderLogo).toHaveCSS('animation-name', 'none');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page.getByText(/Previsualización|Preview/)).toHaveCount(0);
    await expect(page.getByText('Instant Wow')).toBeVisible();
    await expect(page.getByTestId('report-preloader')).toHaveCount(0);
    await expect(page.getByText(/La consulta tardó demasiado/i)).toBeVisible();
    await page.getByRole('button', { name: 'Reintentar' }).click();
    await expect(page.getByText(/La consulta tardó demasiado/i)).toHaveCount(0);
    state.storageReadDelayMs = 0;
    await expect(page.getByRole('button', { name: /^Create Story$/ }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Refine$/ }).first()).toBeVisible();
    expect(state.reports).toHaveLength(1);

    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    await expect(page.getByRole('textbox', { name: 'Report name' })).toBeVisible();
    await page.getByRole('button', { name: 'Volver a la previsualización' }).click();
    await expect(page.getByText('Instant Wow')).toBeVisible();
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0].id).toBe(reportId);
    expect(JSON.stringify(state.reports[0].widgets)).toBe(widgetSnapshot);

    const firstWidgetId = (state.reports[0].widgets[0] as { id: string }).id;
    await page.getByRole('button', { name: 'Edit Report title' }).click();
    const titleInput = page.getByRole('textbox', { name: 'Report title' });
    await titleInput.fill('Reporte guardado desde preview');
    await titleInput.press('Enter');
    await page.getByRole('button', { name: /^Editorial\b/ }).first().click();
    await page.locator('.quick-grid-item').first().getByRole('button', { name: 'Mover abajo' }).click();
    await page.getByRole('button', { name: /^Save$/ }).first().click();
    await expect(page.getByText('Cambios guardados.')).toBeVisible();
    expect(state.reports).toHaveLength(1);
    expect(state.reports[0].id).toBe(reportId);
    expect(state.reports[0].name).toBe('Reporte guardado desde preview');
    expect((state.reports[0].presentation as { templateId: string }).templateId).toBe('editorial');
    expect((state.reports[0].widgets[0] as { id: string }).id).not.toBe(firstWidgetId);
  });

  test('standard limits are enforced while superadmin report creation is unlimited', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    state.accountRole = 'superadmin';
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    const datasetId = state.datasets[0].id;
    state.reports = [1, 2, 3].map((index) => ({
      id: `superadmin_report_${index}`,
      user_id: state.user.id,
      name: `Admin report ${index}`,
      dataset_id: datasetId,
      widgets: [],
      filters: [],
      created_at: new Date(2026, 10, index).toISOString()
    }));

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText(/Publicado correctamente|Published successfully/i)).toBeVisible();
    expect(state.reports).toHaveLength(4);

    const superadminDatasetStatuses = await page.evaluate(async () => Promise.all(
      [2, 3, 4].map(async (index) => {
        const response = await fetch('/rest/v1/datasets', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify([{ name: `Admin dataset ${index}`, file_url: `mock://admin-${index}`, columns: [], stats: [] }])
        });
        return response.status;
      })
    ));
    expect(superadminDatasetStatuses).toEqual([201, 201, 201]);
    expect(state.datasets).toHaveLength(4);

    const roleEscalation = await page.evaluate(async () => {
      const response = await fetch('/rest/v1/user_roles?user_id=eq.user_qa_001', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ role: 'superadmin' })
      });
      return response.status;
    });
    expect(roleEscalation).toBe(403);
  });

  test('Instant Wow title editor keeps readable contrast in a dark app shell', async ({ page, context }) => {
    await context.addCookies([{ name: 'sphere_theme', value: 'dark', domain: '127.0.0.1', path: '/' }]);
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    await page.getByRole('button', { name: 'Edit Report title' }).click();
    const titleInput = page.getByRole('textbox', { name: 'Report title' });
    await expect(titleInput).toHaveCSS('color', 'rgb(17, 28, 45)');
    await expect(titleInput).toHaveCSS('caret-color', 'rgb(17, 28, 45)');
  });

  test('Dark application chrome does not contaminate Light or Dark report stages', async ({ page, context }) => {
    await context.addCookies([{ name: 'sphere_theme', value: 'dark', domain: '127.0.0.1', path: '/' }]);
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    const reportStage = page.locator('.layout').locator('..').locator('..');
    await expect(reportStage).toHaveCSS('color', 'rgb(17, 28, 45)');
    await page.screenshot({ path: path.join(artifactDir, 'app-dark-report-light.png'), fullPage: true });

    await expect(page.locator('.sidebar img[src*="logoModoOscuro.png"]')).toBeVisible();
    await page.locator('.sidebar').screenshot({ path: path.join(artifactDir, 'sidebar-collapsed-dark.png') });
  });

  test('Dark report template remains dark inside Dark application chrome', async ({ page, context }) => {
    await context.addCookies([{ name: 'sphere_theme', value: 'dark', domain: '127.0.0.1', path: '/' }]);
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);
    await page.getByRole('button', { name: /^Dark\b/ }).first().click();
    await page.getByRole('button', { name: /^Refine$/ }).first().click();

    const reportStage = page.locator('.layout').locator('..').locator('..');
    await expect(reportStage).toHaveCSS('color', 'rgb(245, 247, 251)');
    await page.screenshot({ path: path.join(artifactDir, 'app-dark-report-dark.png'), fullPage: true });
  });

});
