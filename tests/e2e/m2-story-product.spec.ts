import { expect, test } from '@playwright/test';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);
const screenshot = (name: string) => path.resolve(process.cwd(), 'artifacts/m2-block3', name);

async function goToQuickResult(page: import('@playwright/test').Page, fileName: string, dateFormat?: string) {
  await page.goto('/');
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture(fileName));
  await expect(page.getByText(/Import options|Opciones de importación/)).toBeVisible();
  if (dateFormat) {
    await page.locator('select').last().selectOption(dateFormat);
  }
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow')).toBeVisible();
}

function stagePrimaryButton(page: import('@playwright/test').Page) {
  return page.getByTestId('story-play-toggle');
}

function sceneCard(page: import('@playwright/test').Page, label: string) {
  return page.locator('.scene-card').filter({ hasText: label }).first();
}

async function toggleStoryPlayback(page: import('@playwright/test').Page) {
  await stagePrimaryButton(page).click({ force: true });
}

test.describe('M2 Story Product', () => {
  test('Quick Result -> Create Story produces an editable animated story for Dataset C', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Story product is validated in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await goToQuickResult(page, 'dataset-c-visual.csv');
    await page.getByRole('button', { name: /^Create Story$/ }).first().click();

    await expect(page.getByText(/Story Mode/i)).toBeVisible();
    await expect(page.getByText(/Light Edit/i)).toBeVisible();
    await expect(page.locator('.scene-card')).toHaveCount(5);
    await expect(page.getByText(/Race/i)).toBeVisible();

    const storyFrame = page.getByTestId('story-frame');
    await expect(storyFrame).toBeVisible();

    const currentTimeBeforePlay = Number(await page.locator('[data-story-current-time-ms]').getAttribute('data-story-current-time-ms'));
    await toggleStoryPlayback(page);
    await expect.poll(async () => {
      const value = await page.locator('[data-story-current-time-ms]').getAttribute('data-story-current-time-ms');
      return Number(value || 0);
    }).toBeGreaterThan(currentTimeBeforePlay);
    await toggleStoryPlayback(page);

    await sceneCard(page, 'Evolution').click();
    await expect(page.getByRole('heading', { name: /Revenue por Month/i })).toBeVisible();
    await toggleStoryPlayback(page);
    await page.waitForTimeout(650);
    await toggleStoryPlayback(page);
    await storyFrame.screenshot({ path: screenshot('story-modern-16x9.png') });

    const slider = page.locator('input[type="range"]').first();
    await sceneCard(page, 'Race').click();
    await expect.poll(async () => {
      const value = await page.locator('[data-story-current-time-ms]').getAttribute('data-story-current-time-ms');
      return Number(value || 0);
    }).toBeGreaterThan(1000);
    await expect(page.getByRole('heading', { name: /Revenue en movimiento/i })).toBeVisible();
    await toggleStoryPlayback(page);
    await page.waitForTimeout(700);
    await toggleStoryPlayback(page);

    await page.getByRole('button', { name: /^Editorial$/ }).click();
    await storyFrame.screenshot({ path: screenshot('story-editorial-16x9.png') });
    await page.getByRole('button', { name: /^Dark$/ }).click();
    await expect(page.getByRole('button', { name: /^Dark$/ })).toHaveClass(/active/);
    await storyFrame.screenshot({ path: screenshot('story-dark-16x9.png') });
    await page.getByRole('button', { name: /^Cinematic$/ }).click();
    await expect(page.getByRole('button', { name: /^Cinematic$/ })).toHaveClass(/active/);

    const durationBefore = Number(await slider.getAttribute('max'));
    await page.getByRole('button', { name: /^Extended$/ }).click();
    await expect.poll(async () => Number(await slider.getAttribute('max'))).toBeGreaterThan(durationBefore);

    await page.getByRole('button', { name: /^9:16$/ }).click();
    await expect.poll(async () => {
      return storyFrame.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return rect.height > rect.width;
      });
    }).toBe(true);
    await sceneCard(page, 'Evolution').click();
    await expect(page.getByRole('heading', { name: /Revenue por Month/i })).toBeVisible();
    await toggleStoryPlayback(page);
    await page.waitForTimeout(650);
    await toggleStoryPlayback(page);
    await storyFrame.screenshot({ path: screenshot('story-dark-9x16.png') });

    await page.getByRole('button', { name: /^16:9$/ }).click();
    await expect.poll(async () => {
      return storyFrame.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > rect.height;
      });
    }).toBe(true);

    await sceneCard(page, 'Evolution').click();
    await page.getByLabel('Scene title').fill('Revenue timeline');
    await expect(page.getByLabel('Scene title')).toHaveValue('Revenue timeline');
    await expect(page.locator('.scene-card.active')).toContainText('Revenue timeline');

    const sceneCountBeforeRemove = await page.locator('.scene-card').count();
    await page.locator('.scene-card').nth(1).getByLabel('Eliminar escena').click();
    await expect(page.locator('.scene-card')).toHaveCount(sceneCountBeforeRemove - 1);

    expect(state.networkErrors).toEqual([]);
    expect(state.consoleErrors.filter((message) =>
      !message.includes('favicon') &&
      !message.includes('webpack-hmr') &&
      !message.includes('ERR_INVALID_HTTP_RESPONSE') &&
      !message.includes('403 (Forbidden)')
    )).toEqual([]);
  });

  test('Story generator avoids race for Dataset A and still produces a coherent player', async ({ page, context }) => {
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await goToQuickResult(page, 'dataset-a-simple.csv', 'DD/MM/YYYY');
    await page.getByRole('button', { name: /^Create Story$/ }).first().click();

    await expect(page.locator('.scene-card')).toHaveCount(5);
    await expect(page.getByText(/^Race$/)).toHaveCount(0);
    await expect(page.getByText(/^Composition$/)).toBeVisible();
    await expect(page.getByTestId('story-frame')).toBeVisible();
  });

  test('Story can save, reopen, publish, republish, unpublish and export video', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Story persistence and export are validated in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    await goToQuickResult(page, 'dataset-a-simple.csv', 'DD/MM/YYYY');
    await page.getByRole('button', { name: /^Create Story$/ }).first().click();

    await expect(page.getByText(/Story Mode/i)).toBeVisible();
    await expect(page.getByText(/Story guardada automáticamente/i)).toBeVisible();

    await sceneCard(page, 'KPI').click();
    await page.getByLabel('Scene title').fill('Ventas destacadas');
    await expect(page.getByText(/Pending changes|Saving…|Saved/i)).toBeVisible();
    await expect.poll(() => page.getByText(/Saved/i).count()).toBeGreaterThan(0);
    await expect.poll(() => state.stories.length).toBeGreaterThan(0);

    await page.getByText(/My Reports|Mis Reportes/i).first().click();
    await expect(page.getByText(/^Stories$/)).toBeVisible();
    await expect(page.locator('.report-item').last()).toBeVisible();
    await page.locator('.report-item').last().click();

    await expect(page.getByText(/Story Mode/i)).toBeVisible();
    await sceneCard(page, 'KPI').click();
    await expect(page.getByLabel('Scene title')).toHaveValue('Ventas destacadas');

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText(/Story publicada|Story publicada.|Story publicada/i)).toBeVisible();
    await expect(page.getByText(/Copy Public URL/i)).toBeVisible();

    const publicUrl = await page.locator('a:has-text("Open Public Story")').getAttribute('href');
    expect(publicUrl).toBeTruthy();

    const publicPage = await context.newPage();
    await publicPage.goto(publicUrl!);
    await expect(publicPage.getByRole('banner').getByText('Sphere Story')).toBeVisible();
    await expect(publicPage.getByRole('button', { name: /^Play$/ })).toBeVisible();
    await expect(publicPage.getByTestId('story-frame')).toBeVisible();

    await page.getByRole('button', { name: /^Republish$/ }).click();
    await expect(page.getByText(/Story republicada|Story republicada./i)).toBeVisible();
    await page.getByRole('button', { name: /^Unpublish$/ }).click();
    await expect(page.getByText(/Publicación revocada/i)).toBeVisible();

    const revokedPage = await context.newPage();
    await revokedPage.goto(publicUrl!);
    await expect(revokedPage.getByText(/No se pudo cargar la Story pública|revocada|does not exist/i)).toBeVisible();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /^Export 16:9$/ }).click();
    await expect.poll(async () => {
      return (await page.locator('.story-export-item').first().textContent()) || '';
    }, { timeout: 120000 }).toMatch(/Ready|Rendering video|Encoding video/i);
    await expect.poll(async () => {
      return (await page.locator('.story-export-item').first().textContent()) || '';
    }, { timeout: 120000 }).toContain('Ready');
    await page.getByRole('button', { name: /^Download$/ }).first().click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('.mp4');
  });
});
