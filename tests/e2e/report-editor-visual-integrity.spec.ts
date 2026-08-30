import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const artifactDir = path.resolve(process.cwd(), 'artifacts', 'report-editor-visual-integrity');
const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);
const reportATitles = {
  card: 'Metrica',
  line: 'Metrica por Fecha',
  bar: 'Metrica por Categoria',
  treemap: 'Categoria por Metrica',
  pie: 'Participación de Metrica',
  table: 'Detalle'
} as const;
const reportContractTitles = {
  card: 'Horas',
  line: 'Horas por Fecha',
  bar: 'Horas por Nombre Contrato',
  treemap: 'Nombre Contrato por Horas',
  pie: 'Participación de Horas',
  table: 'Detalle'
} as const;

type VisualType = keyof typeof reportATitles;

const chartSelectorByType: Record<Exclude<VisualType, 'card' | 'table'>, string> = {
  line: '.recharts-line-curve, .recharts-line-dot',
  bar: '.recharts-bar-rectangle, .recharts-rectangle',
  pie: '.recharts-sector, .recharts-pie-sector',
  treemap: 'svg rect'
};

const relevantConsolePattern = /(Encountered two children with the same key|ResizeObserver loop|Recharts|Unhandled Runtime Error|Chart tipo no soportado|Cannot read properties|No valid data available)/i;

async function openRefine(page: import('@playwright/test').Page, fileName: string, dateFormat: 'DD/MM/YYYY' | 'AUTO' = 'DD/MM/YYYY') {
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
  await page.getByRole('button', { name: /^Refine$/ }).first().click();
  await expect(page.getByText(/Visualizations|Visualizaciones/i)).toBeVisible();
  await expect(page.locator('.layout .react-grid-item')).toHaveCount(6);
  await expect.poll(async () => page.locator('.animate-spin').count()).toBe(0);
  await expect.poll(async () => page.locator('[data-visual-ready="true"]').count()).toBeGreaterThanOrEqual(4);
}

function widgetByTitle(page: import('@playwright/test').Page, title: string) {
  return page.locator('.layout .react-grid-item').filter({
    has: page.getByRole('heading', { name: title, exact: true })
  }).first();
}

function getVisualTypeByTitle(titles: Record<VisualType, string>, title: string): VisualType {
  return (Object.entries(titles).find(([, value]) => value === title)?.[0] || 'card') as VisualType;
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

async function captureVisualState(page: import('@playwright/test').Page, titles: Record<VisualType, string>, suffix: string) {
  for (const [type, title] of Object.entries(titles) as Array<[VisualType, string]>) {
    const widget = widgetByTitle(page, title);
    await expectRenderedVisual(widget, type);
    await widget.screenshot({ path: path.join(artifactDir, `${suffix}-${type}.png`) });
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
    await captureVisualState(page, reportATitles, 'default');
    await page.screenshot({ path: path.join(artifactDir, 'dense-report-default.png'), fullPage: true });

    for (const title of Object.values(reportATitles)) {
      const widget = widgetByTitle(page, title);
      await resizeWidget(widget, page, -640, -480);
      await expectRenderedVisual(widget, getVisualTypeByTitle(reportATitles, title));
      await assertGridHealthy(page);
    }

    await captureVisualState(page, reportATitles, 'min');

    page.once('dialog', (dialog) => dialog.accept('Visual Integrity QA'));
    await page.getByRole('button', { name: /Guardar reporte|Save Report|Save/i }).last().click();
    await expect(page.getByText(/Guardado|Saved/i).last()).toBeVisible();
    await page.getByText(/Mis reportes|My Reports/i).first().click();
    await page.getByText('Visual Integrity QA').first().click();
    await captureVisualState(page, reportATitles, 'reloaded');
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

    for (const title of Object.values(reportATitles)) {
      const widget = widgetByTitle(page, title);
      await resizeWidget(widget, page, 720, 560);
      await expectRenderedVisual(widget, getVisualTypeByTitle(reportATitles, title));
      await assertGridHealthy(page);
    }

    await captureVisualState(page, reportATitles, 'max');
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

    await openRefine(page, 'export-horas-contrato.csv');
    await page.screenshot({ path: path.join(artifactDir, 'export-horas-contrato-refine.png'), fullPage: true });

    const barWidget = widgetByTitle(page, reportContractTitles.bar);
    const treemapWidget = widgetByTitle(page, reportContractTitles.treemap);
    const pieWidget = widgetByTitle(page, reportContractTitles.pie);

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
