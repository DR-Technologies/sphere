import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const artifactDir = path.resolve(process.cwd(), 'artifacts', 'report-editor-visual-integrity');
const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);
type VisualType = 'card' | 'line' | 'bar' | 'area' | 'pie' | 'treemap' | 'table' | 'map';

const chartSelectorByType: Record<Exclude<VisualType, 'card' | 'table'>, string> = {
  line: '.recharts-line-curve, .recharts-line-dot',
  bar: '.recharts-bar-rectangle, .recharts-rectangle',
  area: '.recharts-area-area, .recharts-area-curve',
  pie: '.recharts-sector, .recharts-pie-sector',
  treemap: 'svg rect',
  map: '[data-visual-type="map"] canvas, [data-visual-type="map"] .gm-style'
};

const relevantConsolePattern = /(Encountered two children with the same key|ResizeObserver loop|Recharts|Unhandled Runtime Error|Chart tipo no soportado|Cannot read properties|No valid data available)/i;

async function openRefine(
  page: import('@playwright/test').Page,
  fileName: string,
  dateFormat: 'DD/MM/YYYY' | 'AUTO' = 'DD/MM/YYYY',
  preparePreview?: () => Promise<void>
) {
  await page.goto('/');
  await expect(page.getByText(/Upload Dataset|Subir dataset/).first()).toBeVisible();
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture(fileName));
  await expect(page.getByText(/Import options|Opciones de importación/)).toBeVisible();
  if (dateFormat !== 'AUTO') {
    await page.locator('select').last().selectOption(dateFormat);
  }
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow')).toBeVisible();
  await preparePreview?.();
  await expect(page.getByTestId('report-preloader')).toHaveCount(0);
  await page.getByRole('button', { name: /^Refine$/ }).first().click();
  await expect(page.getByText(/Visualizations|Visualizaciones/i)).toBeVisible();
  await expect.poll(() => page.locator('.layout .react-grid-item').count()).toBeGreaterThanOrEqual(4);
  expect(await page.locator('.layout .react-grid-item').count()).toBeLessThanOrEqual(9);
  await expect.poll(async () => page.locator('.animate-spin').count()).toBe(0);
  await expect.poll(async () => page.locator('.layout [data-visual-ready="true"]').count()).toBeGreaterThanOrEqual(2);
}

function widgetById(page: import('@playwright/test').Page, widgetId: string) {
  return page.locator('.layout .react-grid-item').filter({
    has: page.locator(`.sphere-report-widget-card[data-widget-id="${widgetId}"]`)
  }).first();
}

function widgetByType(page: import('@playwright/test').Page, type: VisualType) {
  return page.locator('.layout .react-grid-item').filter({
    has: page.locator(`.sphere-report-widget-card[data-widget-type="${type}"]`)
  }).first();
}

async function getWidgetDescriptors(page: import('@playwright/test').Page) {
  return page.locator('.layout .sphere-report-widget-card').evaluateAll((cards) => cards.map((card) => ({
    id: card.getAttribute('data-widget-id') || '',
    type: (card.getAttribute('data-widget-type') || 'card') as VisualType
  })).filter((widget) => widget.id));
}

async function expectRenderedVisual(widget: import('@playwright/test').Locator, type: VisualType) {
  await expect(widget).toBeVisible();
  await expect(widget.getByText(/No data available|No hay datos válidos|Configuración incompleta/i)).toHaveCount(0);

  if (type === 'card') {
    await expect.poll(async () => {
      const text = await widget.locator('.sphere-report-widget-card').textContent();
      return /\d/.test(text || '');
    }).toBe(true);
    return;
  }

  if (type === 'table') {
    await expect(widget.locator('table')).toBeVisible();
    await expect.poll(async () => widget.locator('tbody tr').count()).toBeGreaterThan(0);
    return;
  }

  await expect(widget.locator('svg').first()).toBeVisible();
  await expect.poll(async () => widget.locator(chartSelectorByType[type as Exclude<VisualType, 'card' | 'table'>]).count()).toBeGreaterThan(0);
}

async function getGridDiagnostics(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.layout .react-grid-item')).map((item, index) => {
      const itemRect = item.getBoundingClientRect();
      const card = item.querySelector('.sphere-report-widget-card');
      const visual = item.querySelector('[data-visual-type]');

      return {
        index,
        title: item.querySelector('h3')?.textContent?.trim() || '',
        itemRect: { left: itemRect.left, top: itemRect.top, right: itemRect.right, bottom: itemRect.bottom },
        cardRect: card ? (() => {
          const rect = card.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        })() : null,
        visualRect: visual ? (() => {
          const rect = visual.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        })() : null
      };
    });

    const overlapPairs: Array<[string, string]> = [];
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i].itemRect;
        const b = items[j].itemRect;
        const intersects = a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
        if (intersects) overlapPairs.push([items[i].title, items[j].title]);
      }
    }

    const visualOverflow = items
      .filter((item) => item.visualRect)
      .filter((item) => {
        const visual = item.visualRect!;
        const card = item.cardRect ?? item.itemRect;
        return visual.left < card.left - 1 || visual.right > card.right + 1 || visual.top < card.top - 1 || visual.bottom > card.bottom + 1;
      })
      .map((item) => item.title);

    return { overlapPairs, visualOverflow };
  });
}

async function resizeWidget(widget: import('@playwright/test').Locator, page: import('@playwright/test').Page, deltaX: number, deltaY: number) {
  const box = await widget.boundingBox();
  if (!box) throw new Error('Widget bounding box not available');

  const startX = box.x + box.width - 10;
  const startY = box.y + box.height - 10;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + deltaX, startY + deltaY, { steps: 14 });
  await page.mouse.up();
}

async function assertGridHealthy(page: import('@playwright/test').Page) {
  await expect.poll(() => getGridDiagnostics(page)).toMatchObject({
    overlapPairs: [],
    visualOverflow: []
  });
}

function createConsoleCollector(page: import('@playwright/test').Page) {
  const consoleMessages: string[] = [];
  const pageErrors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error' || relevantConsolePattern.test(message.text())) {
      consoleMessages.push(`[${message.type()}] ${message.text()}`);
    }
  });

  page.on('pageerror', (error) => {
    pageErrors.push(error.message);
  });

  return {
    assertClean() {
      const relevantConsole = Array.from(new Set(consoleMessages)).filter((message) => relevantConsolePattern.test(message));
      expect(relevantConsole).toEqual([]);
      expect(pageErrors).toEqual([]);
    }
  };
}

async function captureVisualState(page: import('@playwright/test').Page, suffix: string) {
  const descriptors = await getWidgetDescriptors(page);
  for (const [index, descriptor] of descriptors.entries()) {
    const widget = widgetById(page, descriptor.id);
    await expectRenderedVisual(widget, descriptor.type);
    await widget.screenshot({ path: path.join(artifactDir, `${suffix}-${descriptor.type}-${index + 1}.png`) });
  }
}

test.describe('report editor visual data & render integrity', () => {
  test('dataset A keeps visible content at default and minimum sizes, persists layout, and stays console-clean', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual integrity QA runs in chromium only.');
    await fs.mkdir(artifactDir, { recursive: true });

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    const consoleCollector = createConsoleCollector(page);

    await openRefine(page, 'dataset-a-simple.csv');
    await captureVisualState(page, 'default');
    await page.screenshot({ path: path.join(artifactDir, 'dense-report-default.png'), fullPage: true });

    for (const descriptor of await getWidgetDescriptors(page)) {
      const widget = widgetById(page, descriptor.id);
      await resizeWidget(widget, page, -640, -480);
      await expectRenderedVisual(widget, descriptor.type);
      await assertGridHealthy(page);
    }

    await captureVisualState(page, 'min');

    await page.getByLabel('Report name').fill('Visual Integrity QA');
    await page.getByRole('button', { name: /Guardar reporte|Save Report|Save/i }).last().click();
    await expect(page.getByText(/Guardado|Saved/i).last()).toBeVisible();
    await page.getByRole('button', { name: /My Reports|Mis reportes/i }).click();
    await page.getByText('Visual Integrity QA').first().click();
    await expect(page.getByText('Instant Wow')).toBeVisible();
    await expect(page.getByTestId('report-preloader')).toHaveCount(0);
    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    await captureVisualState(page, 'reloaded');
    await page.screenshot({ path: path.join(artifactDir, 'persisted-layout-reloaded.png'), fullPage: true });

    consoleCollector.assertClean();
    const meaningfulConsoleErrors = state.consoleErrors.filter((message) => relevantConsolePattern.test(message));
    expect(meaningfulConsoleErrors).toEqual([]);
  });

  test('dataset A keeps visible content at maximum sizes without overlap or console noise', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual integrity QA runs in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    const consoleCollector = createConsoleCollector(page);

    await openRefine(page, 'dataset-a-simple.csv');

    for (const descriptor of await getWidgetDescriptors(page)) {
      const widget = widgetById(page, descriptor.id);
      await resizeWidget(widget, page, 720, 560);
      await expectRenderedVisual(widget, descriptor.type);
      await assertGridHealthy(page);
    }

    await captureVisualState(page, 'max');
    await page.screenshot({ path: path.join(artifactDir, 'dense-report-max.png'), fullPage: true });

    consoleCollector.assertClean();
    const meaningfulConsoleErrors = state.consoleErrors.filter((message) => relevantConsolePattern.test(message));
    expect(meaningfulConsoleErrors).toEqual([]);
  });

  test('contract-hours report keeps treemap semantics aligned with bar and pie', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Visual integrity QA runs in chromium only.');

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    const consoleCollector = createConsoleCollector(page);

    await openRefine(page, 'export-horas-contrato.csv', 'DD/MM/YYYY', async () => {
      await page.getByRole('button', { name: /^Publish$/ }).click();
      await expect(page.getByText(/Publicado correctamente|Published/i)).toBeVisible();
      const report = state.reports[0];
      const widgets = report.widgets as Array<Record<string, unknown>>;
      const categorical = widgets.find((widget) => ['bar', 'pie', 'treemap'].includes(String(widget.type)));
      if (!categorical) throw new Error('Expected a categorical widget in the generated report.');
      if (!widgets.some((widget) => widget.type === 'bar')) {
        widgets.push({ ...categorical, id: 'qa-contract-bar', type: 'bar', title: 'Horas por Nombre Contrato' });
      }
      if (!widgets.some((widget) => widget.type === 'pie')) {
        widgets.push({ ...categorical, id: 'qa-contract-pie', type: 'pie', title: 'Participación de Horas' });
      }
      if (!widgets.some((widget) => widget.type === 'treemap')) {
        widgets.push({ ...categorical, id: 'qa-contract-treemap', type: 'treemap', title: 'Nombre Contrato por Horas' });
      }
      await page.reload();
      await expect(page.getByText(/Upload Dataset|Subir dataset/).first()).toBeVisible();
      await page.getByRole('button', { name: /My Reports|Mis reportes/i }).click();
      await page.locator('.report-item').filter({ hasText: report.name }).click();
      await expect(page.getByText('Instant Wow')).toBeVisible();
    });
    await page.screenshot({ path: path.join(artifactDir, 'export-horas-contrato-refine.png'), fullPage: true });

    const barWidget = widgetByType(page, 'bar');
    const treemapWidget = widgetByType(page, 'treemap');
    const pieWidget = widgetByType(page, 'pie');

    await expectRenderedVisual(barWidget, 'bar');
    await expectRenderedVisual(treemapWidget, 'treemap');
    await expectRenderedVisual(pieWidget, 'pie');

    await expect(barWidget.getByText('Soporte')).toBeVisible();
    await expect(barWidget.getByText('Proyectos')).toBeVisible();

    const treemapLabels = (await treemapWidget.locator('svg text').allTextContents())
      .map((value) => value.trim())
      .filter((value) => value === 'Soporte' || value === 'Proyectos');
    expect(treemapLabels.filter((value) => value === 'Soporte').length).toBeLessThanOrEqual(1);
    expect(treemapLabels.filter((value) => value === 'Proyectos').length).toBeLessThanOrEqual(1);

    consoleCollector.assertClean();
    const meaningfulConsoleErrors = state.consoleErrors.filter((message) => relevantConsolePattern.test(message));
    expect(meaningfulConsoleErrors).toEqual([]);
  });
});
