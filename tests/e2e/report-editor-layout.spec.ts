import { expect, test } from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const artifactDir = path.resolve(process.cwd(), 'artifacts', 'report-editor-layout-hardening');
const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);

async function goToRefine(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByText(/Upload Dataset|Subir dataset/).first()).toBeVisible();
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture('dataset-a-simple.csv'));
  await expect(page.getByText(/Import options|Opciones de importación/)).toBeVisible();
  await page.locator('select').last().selectOption('DD/MM/YYYY');
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow')).toBeVisible();
  await page.getByRole('button', { name: /^Refine$/ }).first().click();
  await expect(page.getByText(/Visualizations|Visualizaciones/i)).toBeVisible();
  await expect.poll(() => page.locator('.layout .react-grid-item').count()).toBeGreaterThanOrEqual(4);
  const widgetCount = await page.locator('.layout .react-grid-item').count();
  expect(widgetCount).toBeLessThanOrEqual(9);
  await expect(page.locator('.layout .sphere-report-widget-card')).toHaveCount(widgetCount);
  await expect.poll(() => page.locator('.layout [data-visual-ready="true"]').count()).toBeGreaterThanOrEqual(2);
  await expect(page.locator('.animate-spin')).toHaveCount(0);
  return widgetCount;
}

function widgetByType(page: import('@playwright/test').Page, type: string, index = 0) {
  return page.locator('.layout .react-grid-item').filter({
    has: page.locator(`.sphere-report-widget-card[data-widget-type="${type}"]`)
  }).nth(index);
}

async function getGridDiagnostics(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.layout .react-grid-item')).map((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const card = item.querySelector('.sphere-report-widget-card');
      const visual = item.querySelector('[data-visual-type]');
      const itemStyle = window.getComputedStyle(item);

      return {
        index,
        type: visual?.getAttribute('data-visual-type') || 'unknown',
        itemRect: { left: itemRect.left, top: itemRect.top, right: itemRect.right, bottom: itemRect.bottom, width: itemRect.width, height: itemRect.height },
        itemHeight: Number.parseFloat(itemStyle.height || '0'),
        cardRect: card ? (() => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        })() : null,
        visualRect: visual ? (() => {
          const rect = visual.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        })() : null
      };
    });

    const overlapPairs: Array<[number, number]> = [];
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i].itemRect;
        const b = items[j].itemRect;
        const intersects = a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        if (intersects) overlapPairs.push([i, j]);
      }
    }

    const cardOverflow = items
      .filter((item) => item.cardRect)
      .filter((item) => {
        const card = item.cardRect!;
        const outer = item.itemRect;
        return card.left < outer.left - 1 || card.right > outer.right + 1 || card.top < outer.top - 1 || card.bottom > outer.bottom + 1;
      })
      .map((item) => item.index);

    const visualOverflow = items
      .filter((item) => item.visualRect)
      .filter((item) => {
        const visual = item.visualRect!;
        const card = item.cardRect ?? item.itemRect;
        return visual.left < card.left - 1 || visual.right > card.right + 1 || visual.top < card.top - 1 || visual.bottom > card.bottom + 1;
      })
      .map((item) => item.index);

    return { items, overlapPairs, cardOverflow, visualOverflow };
  });
}

async function resizeWidget(widget: import('@playwright/test').Locator, page: import('@playwright/test').Page, deltaX: number, deltaY: number) {
  const box = await widget.boundingBox();
  if (!box) throw new Error('Widget bounding box not available');

  const startX = box.x + box.width - 10;
  const startY = box.y + box.height - 10;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 12 });
  await page.mouse.up();
}

test.describe('report editor layout hardening', () => {
  test('widgets resize without overlap, remain contained, and persist normalized sizes', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Editor layout QA runs in chromium only.');

    await fs.mkdir(artifactDir, { recursive: true });

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);

    const widgetCount = await goToRefine(page);

    const initialDiagnostics = await getGridDiagnostics(page);
    expect(initialDiagnostics.overlapPairs).toEqual([]);
    expect(initialDiagnostics.cardOverflow).toEqual([]);
    expect(initialDiagnostics.visualOverflow).toEqual([]);
    await page.screenshot({ path: path.join(artifactDir, 'dense-report-default.png'), fullPage: true });

    const lineWidget = widgetByType(page, 'line');
    const barWidget = widgetByType(page, 'bar');
    const tableWidget = widgetByType(page, 'table');

    await resizeWidget(lineWidget, page, -220, -260);
    await resizeWidget(barWidget, page, 180, 140);
    await resizeWidget(tableWidget, page, 0, 260);

    await expect.poll(() => getGridDiagnostics(page)).toMatchObject({
      overlapPairs: [],
      cardOverflow: [],
      visualOverflow: []
    });

    const afterResizeDiagnostics = await getGridDiagnostics(page);
    const lineMetrics = afterResizeDiagnostics.items.find((item) => item.type === 'line');
    const tableScrollMetrics = await tableWidget.evaluate((node) => {
      const scroller = node.querySelector('div[style*="overflow: auto"]') as HTMLDivElement | null;
      if (!scroller) return null;
      return {
        clientHeight: scroller.clientHeight,
        scrollHeight: scroller.scrollHeight
      };
    });

    expect(lineMetrics?.itemHeight ?? 0).toBeGreaterThanOrEqual(358);
    expect(tableScrollMetrics?.clientHeight ?? 0).toBeGreaterThan(0);
    expect((tableScrollMetrics?.scrollHeight ?? 0) >= (tableScrollMetrics?.clientHeight ?? 0)).toBe(true);

    await page.screenshot({ path: path.join(artifactDir, 'dense-report-resized.png'), fullPage: true });

    await page.getByLabel('Report name').fill('Layout Hardening QA');
    await page.getByRole('button', { name: /Guardar reporte|Save Report|Save/i }).last().click();
    await expect(page.getByText(/Guardado|Saved/i).last()).toBeVisible();

    const savedReport = state.reports[0];
    expect(savedReport).toBeTruthy();

    await page.getByRole('button', { name: /My Reports|Mis reportes/i }).click();
    await expect(page.getByRole('heading', { name: /My Reports|Mis reportes/i })).toBeVisible();
    await page.getByText('Layout Hardening QA').first().click();
    await expect(page.getByText('Instant Wow')).toBeVisible();
    await expect(page.getByTestId('report-preloader')).toHaveCount(0);
    await expect(page.locator('.quick-grid-item')).toHaveCount(widgetCount);
    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    await expect(page.locator('.layout .react-grid-item')).toHaveCount(widgetCount);
    await expect.poll(() => getGridDiagnostics(page)).toMatchObject({
      overlapPairs: [],
      cardOverflow: [],
      visualOverflow: []
    });

    await page.screenshot({ path: path.join(artifactDir, 'persisted-layout-reloaded.png'), fullPage: true });

    const reloadedBar = widgetByType(page, 'bar');
    const reloadedTable = widgetByType(page, 'table');

    await resizeWidget(reloadedBar, page, -220, -220);
    await resizeWidget(reloadedTable, page, -520, -360);
    await expect.poll(() => getGridDiagnostics(page)).toMatchObject({
      overlapPairs: [],
      cardOverflow: [],
      visualOverflow: []
    });

    for (const type of ['card', 'line', 'bar', 'area', 'pie', 'treemap', 'table', 'map']) {
      const widget = widgetByType(page, type);
      if (await widget.count()) {
        await widget.screenshot({ path: path.join(artifactDir, `min-${type}.png`) });
      }
    }

    const maxLine = widgetByType(page, 'line');
    const maxTable = widgetByType(page, 'table');
    await resizeWidget(maxLine, page, 520, 420);
    await resizeWidget(maxTable, page, 520, 420);
    await expect.poll(() => getGridDiagnostics(page)).toMatchObject({
      overlapPairs: [],
      cardOverflow: [],
      visualOverflow: []
    });

    await maxLine.screenshot({ path: path.join(artifactDir, 'max-line.png') });
    await maxTable.screenshot({ path: path.join(artifactDir, 'max-table.png') });
  });
});
