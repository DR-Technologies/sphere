import { expect, test } from '@playwright/test';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);

async function goToUpload(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByText(/Upload Dataset|Subir dataset/).first()).toBeVisible();
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await expect(page.locator('#file-upload')).toBeAttached();
}

async function expectRenderedChart(widget: import('@playwright/test').Locator, type: 'line' | 'bar' | 'pie' | 'treemap') {
  const chartContainer = widget.locator(`[data-visual-type="${type}"]`);
  await expect(chartContainer).toBeVisible();

  await expect.poll(async () => {
    return widget.evaluate((node) => node.getBoundingClientRect().height);
  }).toBeGreaterThan(80);

  await expect.poll(async () => {
    return chartContainer.evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    });
  }).toBe(true);

  await expect(widget.locator('svg').first()).toBeVisible();
  await expect(widget.getByText(/No data available|No hay datos válidos|Configuración incompleta/i)).toHaveCount(0);

  const selectorByType: Record<'line' | 'bar' | 'pie' | 'treemap', string> = {
    line: '.recharts-line-curve, .recharts-line-dot',
    bar: '.recharts-bar-rectangle, .recharts-rectangle',
    pie: '.recharts-sector, .recharts-pie-sector',
    treemap: 'svg rect'
  };

  await expect.poll(async () => widget.locator(selectorByType[type]).count()).toBeGreaterThan(0);
}

test.describe('M1 acceptance QA', () => {
  test('Dataset A completes the main M1 flow end-to-end', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Acceptance flow is validated in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await goToUpload(page);
    await page.locator('#file-upload').setInputFiles(fixture('dataset-a-simple.csv'));
    await expect(page.getByText(/Import options|Opciones de importación/)).toBeVisible();
    await page.locator('select').last().selectOption('DD/MM/YYYY');
    await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();

    await expect(page.getByText('Instant Wow').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /^Refine$/ }).first()).toBeVisible();
    await expect.poll(() => page.locator('.quick-grid-item').count()).toBeGreaterThanOrEqual(4);
    const initialWidgetCount = await page.locator('.quick-grid-item').count();
    expect(initialWidgetCount).toBeLessThanOrEqual(9);
    await expectRenderedChart(page.locator('.quick-type-line').first(), 'line');
    await expectRenderedChart(page.locator('.quick-type-bar').first(), 'bar');
    await expect.poll(() => state.datasetQueries.length).toBe(initialWidgetCount);
    expect(new Set(state.datasetQueries).size).toBe(initialWidgetCount);
    await page.waitForTimeout(300);
    expect(state.datasetQueries).toHaveLength(initialWidgetCount);

    await page.getByRole('button', { name: 'Edit Report title' }).click();
    await expect(page.locator('input[aria-label="Report title"]')).toBeVisible();
    await page.locator('input[aria-label="Report title"]').fill('Acceptance Result A');
    await page.locator('input[aria-label="Report title"]').press('Enter');
    await expect(page.locator('input[aria-label="Report title"]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Edit Report subtitle' }).click();
    await expect(page.locator('textarea[aria-label="Report subtitle"]')).toBeVisible();
    await page.locator('textarea[aria-label="Report subtitle"]').fill('QA quick result for dataset A.');
    await page.locator('textarea[aria-label="Report subtitle"]').press('Escape');

    await page.getByRole('button', { name: 'Editorial' }).click();
    await page.getByRole('button', { name: 'Dark' }).click();
    await page.getByRole('button', { name: 'Modern' }).click();

    const firstTitle = await page.locator('.quick-grid-item h3').first().textContent();
    const secondCard = page.locator('.quick-grid-item').nth(1);
    await secondCard.getByLabel('Mover arriba').click();
    await expect(page.locator('.quick-grid-item h3').first()).not.toHaveText(firstTitle || '');

    await page.locator('.quick-grid-item').nth(0).getByLabel('Eliminar').click();
    await expect(page.locator('.quick-grid-item')).toHaveCount(4);

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^PNG$/ }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.png');

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText(/Publicado correctamente|Published/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^Republish$/ })).toBeVisible();

    const publicHref = await page.locator('a:has-text("Open")').getAttribute('href');
    expect(publicHref).toBeTruthy();

    const publicPage = await context.newPage();
    await publicPage.goto(publicHref!);
    await expect(publicPage.getByText('Public', { exact: true })).toBeVisible();
    await expect(publicPage.getByText('Acceptance Result A')).toBeVisible();
    await expect(publicPage.locator('.recharts-surface').first()).toBeVisible();

    await page.getByRole('button', { name: /^Republish$/ }).click();
    await expect(page.getByRole('button', { name: /^Unpublish$/ })).toBeVisible();
    await page.getByRole('button', { name: /^Unpublish$/ }).click();
    await expect(page.getByText(/Publicación revocada|revoked/i)).toBeVisible();

    const revokedPage = await context.newPage();
    await revokedPage.goto(publicHref!);
    await expect(revokedPage.getByText(/revocada|does not exist|No se pudo cargar la publicación/i)).toBeVisible();

    await page.getByRole('button', { name: /Home|Inicio/i }).click();
    await page.getByRole('heading', { name: 'Acceptance Result A' }).click();
    await expect(page.getByText('Instant Wow')).toBeVisible();
    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    await expect(page.getByText(/Visualizations|Visualizaciones/i)).toBeVisible();

    expect(state.networkErrors).toEqual([]);
    const meaningfulConsoleErrors = state.consoleErrors.filter((message) =>
      !message.includes('favicon') &&
      !message.includes('webpack-hmr') &&
      !message.includes('ERR_INVALID_HTTP_RESPONSE')
    );
    expect(meaningfulConsoleErrors).toEqual([]);
  });

  test('Dataset B generates a valid quick result without configuration failures', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await goToUpload(page);
    await page.locator('#file-upload').setInputFiles(fixture('dataset-b-empresarial.csv'));
    await page.locator('select').last().selectOption('DD/MM/YYYY');
    await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();

    await expect(page.getByText('Instant Wow')).toBeVisible();
    await expect.poll(() => page.locator('.quick-grid-item').count()).toBeGreaterThanOrEqual(4);
    expect(await page.locator('.quick-grid-item').count()).toBeLessThanOrEqual(9);
    await expect(page.getByRole('heading', { name: /Revenue Amount|Order ID|Booking Date/ }).first()).toBeVisible();
    await expect(page.getByText(/Configuración incompleta|Cannot|compatible/i)).toHaveCount(0);
    await expectRenderedChart(page.locator('.quick-type-line').first(), 'line');
    await expectRenderedChart(page.locator('.quick-type-bar').first(), 'bar');
    await expectRenderedChart(page.locator('.quick-type-pie').first(), 'pie');
    expect(state.datasetQueries.some((query) => /SUM\("(Order ID|Customer ID)"/i.test(query))).toBe(false);
    expect(new Set(state.datasetQueries).size).toBe(state.datasetQueries.length);
  });

  test('a failed Instant Wow widget stops loading and can retry independently', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    state.datasetQueryFailuresRemaining = 1;
    await installMockSupabase(context, page, state);

    await goToUpload(page);
    await page.locator('#file-upload').setInputFiles(fixture('dataset-a-simple.csv'));
    await page.locator('select').last().selectOption('DD/MM/YYYY');
    await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();

    await expect(page.getByText('Instant Wow')).toBeVisible();
    const retry = page.getByRole('button', { name: 'Reintentar' }).first();
    await expect(retry).toBeVisible();
    await expect(page.getByText(/La consulta tardó demasiado/).first()).toBeVisible();
    await retry.click();
    await expect(retry).toHaveCount(0);
    await expect(page.locator('.quick-grid-item').first().getByText(/La consulta tardó demasiado/)).toHaveCount(0);
  });

  test('Dataset C keeps quick result and public report usable on tablet and mobile', async ({ page, context }) => {
    await context.addInitScript(() => {
      (window as Window & { __SPHERE_QA_STATIC__?: boolean }).__SPHERE_QA_STATIC__ = true;
    });
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await goToUpload(page);
    await page.locator('#file-upload').setInputFiles(fixture('dataset-c-visual.csv'));
    await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();

    await expect(page.getByText('Instant Wow').first()).toBeVisible();

    await page.setViewportSize({ width: 820, height: 1180 });
    await expect(page.locator('.quick-grid-item').first()).toBeVisible();
    await expectRenderedChart(page.locator('.quick-type-line').first(), 'line');
    const quickTabletOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(quickTabletOverflow).toBeLessThanOrEqual(1);

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.locator('.quick-grid-item').first()).toBeVisible();
    const quickMobileOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(quickMobileOverflow).toBeLessThanOrEqual(1);

    await page.getByRole('button', { name: /^Publish$/ }).click();
    const publicHref = await page.locator('a:has-text("Open")').getAttribute('href');
    expect(publicHref).toBeTruthy();

    const publicPage = await context.newPage();
    await publicPage.setViewportSize({ width: 768, height: 1024 });
    await publicPage.goto(publicHref!);
    await expect(publicPage.getByText('Public', { exact: true })).toBeVisible();
    const publicTabletOverflow = await publicPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(publicTabletOverflow).toBeLessThanOrEqual(1);

    await publicPage.setViewportSize({ width: 390, height: 844 });
    await expect(publicPage.locator('section').first()).toBeVisible();
    const publicMobileOverflow = await publicPage.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(publicMobileOverflow).toBeLessThanOrEqual(1);
  });
});
