import { expect, test, type BrowserContext, type Locator, type Page } from '@playwright/test';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const phase = process.env.SPHERE_CONTROL_EVIDENCE_PHASE || 'after';
const artifact = (name: string) => path.resolve(process.cwd(), 'artifacts/ui-control-colors', phase, name);
const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);

async function setTheme(context: BrowserContext, theme: 'light' | 'dark') {
  await context.addCookies([{ name: 'sphere_theme', value: theme, domain: '127.0.0.1', path: '/' }]);
}

async function goToQuickResult(page: Page) {
  await page.goto('/');
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture('dataset-c-visual.csv'));
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow')).toBeVisible();
}

async function expectLightForeground(locator: Locator) {
  const color = await locator.evaluate((node) => getComputedStyle(node).color);
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
  expect(channels).toHaveLength(3);
  expect(Math.min(...channels)).toBeGreaterThanOrEqual(238);
}

async function expectDarkForeground(locator: Locator) {
  const color = await locator.evaluate((node) => getComputedStyle(node).color);
  const channels = color.match(/[\d.]+/g)?.slice(0, 3).map(Number) || [];
  expect(channels).toHaveLength(3);
  expect(Math.max(...channels)).toBeLessThanOrEqual(80);
}

test.describe('UI control color consistency', () => {
  test('Light controls preserve geometry and readable foreground states', async ({ page, context }) => {
    await setTheme(context, 'light');
    const state = await createMockSupabaseState();
    (state.datasets as unknown as Array<Record<string, unknown>>).push({
      id: 'dataset-control-colors',
      user_id: state.user.id,
      name: 'Control colors dataset',
      file_url: 'mock://control-colors.csv',
      columns: [{ name: 'Category', type: 'VARCHAR' }, { name: 'Value', type: 'DOUBLE' }],
      stats: [],
      created_at: '2026-07-27T18:00:00.000Z',
      rows: [{ Category: 'A', Value: 10 }]
    });
    (state.reports as unknown as Array<Record<string, unknown>>).push({
      id: 'report-control-colors',
      user_id: state.user.id,
      dataset_id: 'dataset-control-colors',
      name: 'Control colors report',
      widgets: [],
      filters: [],
      created_at: '2026-07-27T18:00:00.000Z'
    });
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    const createStory = page.getByRole('button', { name: /^Create Story$/ }).first();
    await createStory.screenshot({ path: artifact('primary-normal.png') });
    await createStory.hover();
    await createStory.screenshot({ path: artifact('primary-hover.png') });

    if (phase === 'after') {
      await expectLightForeground(createStory);
      await expectLightForeground(createStory.locator('svg'));
    }

    await createStory.click();
    await expect(page.getByText(/Story Mode/i)).toBeVisible();
    const selectedControls = page.locator('.story-chip.active');
    await expect(selectedControls).toHaveCount(4);
    await page.locator('.story-header-actions').screenshot({ path: artifact('story-selected-and-publish.png') });

    if (phase === 'after') {
      for (const control of await selectedControls.all()) await expectLightForeground(control);
      const publish = page.getByRole('button', { name: /^Publish$/ });
      await expectLightForeground(publish);
      await expectLightForeground(publish.locator('svg'));
    }

    const refinePage = await context.newPage();
    await goToQuickResult(refinePage);
    await refinePage.getByRole('button', { name: /^Refine$/ }).first().click();
    const save = refinePage.locator('.btn-primary').filter({ hasText: /Save|Guardar/ }).first();
    await expect(save).toBeVisible();
    await save.screenshot({ path: artifact('refine-save.png') });
    if (phase === 'after') {
      await expectLightForeground(save);
      await expectLightForeground(save.locator('svg'));
    }

    await refinePage.locator('.sidebar-nav .nav-item').nth(2).click();
    await expect(refinePage.locator('.report-item').first()).toBeVisible();
    await refinePage.locator('.report-item .menu-toggle').first().click();
    const reportMenu = refinePage.locator('.menu-dropdown');
    await reportMenu.screenshot({ path: artifact('reports-context-menu.png') });
    if (phase === 'after') {
      await expectDarkForeground(reportMenu.locator('.menu-item').filter({ hasText: /Open|Abrir/ }));
      await expectDarkForeground(reportMenu.locator('.menu-item').filter({ hasText: /Rename|Cambiar nombre/ }));
    }

    await refinePage.locator('.report-item .menu-toggle').first().click();
    await refinePage.locator('.sidebar-nav .nav-item').nth(1).click();
    await expect(refinePage.locator('.ds-item').first()).toBeVisible();
    await refinePage.locator('.ds-item .menu-toggle').first().click();
    const datasetMenu = refinePage.locator('.menu-dropdown');
    await datasetMenu.screenshot({ path: artifact('datasets-context-menu.png') });
    if (phase === 'after') {
      await expectDarkForeground(datasetMenu.locator('.menu-item').filter({ hasText: /Open|Abrir/ }));
    }
  });

  test('Dark controls retain their existing readable contrast', async ({ page, context }) => {
    await setTheme(context, 'dark');
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);
    await page.getByRole('button', { name: /^Create Story$/ }).first().click();
    await expect(page.getByText(/Story Mode/i)).toBeVisible();
    await page.locator('.story-header-actions').screenshot({ path: artifact('dark-controls.png') });

    if (phase === 'after') {
      for (const control of await page.locator('.story-chip.active').all()) await expectDarkForeground(control);
      await expectDarkForeground(page.getByRole('button', { name: /^Publish$/ }));
    }
  });
});
