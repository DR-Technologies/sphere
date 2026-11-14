import { expect, test } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const fixture = (name: string) => path.join(process.cwd(), 'tests', 'fixtures', name);

test('exports one wide PowerPoint slide per report widget without breaking PNG', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Browser-generated export is validated in Chromium.');

  const state = await createMockSupabaseState();
  await installMockSupabase(context, page, state);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Hello, QA|Hola, QA/i })).toBeVisible();
  await page.getByRole('button', { name: /Upload dataset|Subir dataset/i }).click();
  await page.locator('#file-upload').setInputFiles(fixture('dataset-a-simple.csv'));
  await page.locator('select').last().selectOption('DD/MM/YYYY');
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();

  await expect(page.getByText('Instant Wow')).toBeVisible();
  await expect.poll(() => page.locator('.quick-grid-item').count()).toBeGreaterThanOrEqual(4);
  const initialWidgetCount = await page.locator('.quick-grid-item').count();
  expect(initialWidgetCount).toBeLessThanOrEqual(9);
  await expect.poll(() => state.datasetQueries.length).toBe(initialWidgetCount);

  const pngDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PNG$/ }).click();
  const pngDownload = await pngDownloadPromise;
  expect(pngDownload.suggestedFilename()).toMatch(/\.png$/i);

  await page.getByRole('button', { name: /^Publish$/ }).click();
  await expect(page.getByText(/Publicado correctamente|Published successfully/i)).toBeVisible();
  const expectedSlides = await page.locator('.quick-grid-item').count();
  expect(expectedSlides).toBe(initialWidgetCount);

  const pptxDownloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: /^PPTX$/ }).click();
  const pptxDownload = await pptxDownloadPromise;
  expect(pptxDownload.suggestedFilename()).toMatch(/\.pptx$/i);

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sphere-pptx-'));
  const pptxPath = path.join(outputDir, pptxDownload.suggestedFilename());
  await pptxDownload.saveAs(pptxPath);
  const archiveList = execFileSync('unzip', ['-Z1', pptxPath], { encoding: 'utf8' });
  const slideFiles = archiveList.split('\n').filter((entry) => /^ppt\/slides\/slide\d+\.xml$/.test(entry));
  const slideImages = archiveList.split('\n').filter((entry) => /^ppt\/media\/image.*\.(?:png|jpe?g)$/i.test(entry));
  expect(slideFiles).toHaveLength(expectedSlides);
  expect(slideImages).toHaveLength(expectedSlides);
  const firstSlideXml = execFileSync('unzip', ['-p', pptxPath, 'ppt/slides/slide1.xml'], { encoding: 'utf8' });
  expect(firstSlideXml).toContain('SPHERE REPORT · dataset-a-simple');
  expect(state.networkErrors).toEqual([]);
});
