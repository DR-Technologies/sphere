import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const artifactDir = path.resolve(process.cwd(), 'artifacts', 'report-presentation-unification');
const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);

interface GeometrySnapshot {
  root: { width: number; height: number };
  widgets: Record<string, { title: string; left: number; top: number; width: number; height: number; xRatio: number; widthRatio: number }>;
}

async function goToQuickResult(page: import('@playwright/test').Page) {
  await page.goto('/');
  await expect(page.getByText(/Upload Dataset|Subir dataset/).first()).toBeVisible();
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture('dataset-b-empresarial.csv'));
  await expect(page.getByText(/Import options|Opciones de importación/)).toBeVisible();
  await page.locator('select').last().selectOption('DD/MM/YYYY');
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow').first()).toBeVisible();
  await expect(page.locator('.quick-grid-item')).toHaveCount(6);
  await expect(page.locator('.animate-spin')).toHaveCount(0);
  await expect.poll(async () => page.locator('.sphere-report-widget-card [data-visual-ready="true"]').count()).toBeGreaterThanOrEqual(4);
}

async function readGeometry(page: import('@playwright/test').Page, rootSelector: string): Promise<GeometrySnapshot> {
  return page.evaluate((selector) => {
    const root = document.querySelector(selector) as HTMLElement | null;
    if (!root) {
      throw new Error(`Root selector not found: ${selector}`);
    }

    const rootRect = root.getBoundingClientRect();
    const widgets = Array.from(root.querySelectorAll('.sphere-report-widget-card[data-widget-id]')).reduce<Record<string, GeometrySnapshot['widgets'][string]>>((acc, element) => {
      const card = element as HTMLElement;
      const widgetId = card.dataset.widgetId;
      if (!widgetId) return acc;
      const rect = card.getBoundingClientRect();
      acc[widgetId] = {
        title: card.dataset.widgetTitle || widgetId,
        left: Number((rect.left - rootRect.left).toFixed(2)),
        top: Number((rect.top - rootRect.top).toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
        xRatio: Number(((rect.left - rootRect.left) / rootRect.width).toFixed(4)),
        widthRatio: Number((rect.width / rootRect.width).toFixed(4))
      };
      return acc;
    }, {});

    return {
      root: {
        width: Number(rootRect.width.toFixed(2)),
        height: Number(rootRect.height.toFixed(2))
      },
      widgets
    };
  }, rootSelector);
}

function expectGeometryParity(reference: GeometrySnapshot, candidate: GeometrySnapshot, label: string) {
  expect(Object.keys(candidate.widgets).sort()).toEqual(Object.keys(reference.widgets).sort());

  for (const widgetId of Object.keys(reference.widgets)) {
    const expected = reference.widgets[widgetId];
    const received = candidate.widgets[widgetId];

    expect(received.top, `${label}:${widgetId}:top`).toBeCloseTo(expected.top, 0);
    expect(received.height, `${label}:${widgetId}:height`).toBeCloseTo(expected.height, 0);
    expect(received.xRatio, `${label}:${widgetId}:xRatio`).toBeCloseTo(expected.xRatio, 2);
    expect(received.widthRatio, `${label}:${widgetId}:widthRatio`).toBeCloseTo(expected.widthRatio, 2);
  }
}

test.describe('report presentation unification', () => {
  test('instant wow, refine, public and export share the same canonical report geometry', async ({ page, context, browserName }) => {
    test.skip(browserName !== 'chromium', 'Geometry parity QA runs in chromium only.');
    await fs.mkdir(artifactDir, { recursive: true });

    await context.addInitScript(() => {
      (window as Window & { __SPHERE_QA_STATIC__?: boolean }).__SPHERE_QA_STATIC__ = true;
    });

    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await page.setViewportSize({ width: 1680, height: 1400 });

    await goToQuickResult(page);

    const quickGrid = page.locator('.sphere-presentation-grid').first();
    await quickGrid.screenshot({ path: path.join(artifactDir, 'instant-wow.png') });
    const quickGeometry = await readGeometry(page, '.sphere-presentation-grid');
    const exportHost = page.getByTestId('report-export-host');
    await expect(exportHost).toBeAttached();
    await exportHost.evaluate((node) => {
      const host = node as HTMLElement;
      host.style.left = '24px';
      host.style.top = '24px';
      host.style.opacity = '1';
    });
    await expect(page.getByTestId('report-export-surface')).toHaveAttribute('data-report-ready', 'true');
    await page.getByTestId('report-export-surface').locator('.sphere-presentation-grid').screenshot({ path: path.join(artifactDir, 'export.png') });
    const exportGeometry = await readGeometry(page, '[data-testid="report-export-surface"] .sphere-presentation-grid');
    await exportHost.evaluate((node) => {
      const host = node as HTMLElement;
      host.style.left = '-20000px';
      host.style.top = '0';
      host.style.opacity = '0';
    });

    await page.getByRole('button', { name: /^Publish$/ }).click();
    await expect(page.getByText(/Publicado correctamente|Published/i)).toBeVisible();
    const publicHref = await page.locator('a:has-text("Open")').getAttribute('href');
    expect(publicHref).toBeTruthy();

    const publicPage = await context.newPage();
    await publicPage.setViewportSize({ width: 1680, height: 1400 });
    await publicPage.goto(publicHref!);
    await expect(publicPage.getByTestId('public-report-root')).toHaveAttribute('data-report-ready', 'true');
    await publicPage.locator('.sphere-presentation-grid').first().screenshot({ path: path.join(artifactDir, 'public.png') });
    const publicGeometry = await readGeometry(publicPage, '.sphere-presentation-grid');

    await page.getByRole('button', { name: /^Refine$/ }).first().click();
    await expect(page.getByText(/Visualizations|Visualizaciones/i)).toBeVisible();
    await expect(page.locator('.layout .react-grid-item')).toHaveCount(6);
    await expect(page.locator('.animate-spin')).toHaveCount(0);
    await expect.poll(async () => page.locator('.layout .sphere-report-widget-card [data-visual-ready="true"]').count()).toBeGreaterThanOrEqual(4);
    await page.locator('.layout').screenshot({ path: path.join(artifactDir, 'refine.png') });
    const refineGeometry = await readGeometry(page, '.layout');

    await fs.writeFile(
      path.join(artifactDir, 'geometry.json'),
      JSON.stringify(
        {
          quickGeometry,
          publicGeometry,
          refineGeometry,
          exportGeometry
        },
        null,
        2
      ),
      'utf8'
    );

    expectGeometryParity(quickGeometry, publicGeometry, 'public');
    expectGeometryParity(quickGeometry, refineGeometry, 'refine');
    expectGeometryParity(quickGeometry, exportGeometry, 'export');
  });
});
