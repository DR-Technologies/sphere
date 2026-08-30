import { expect, test, type BrowserContext, type Page } from '@playwright/test';
import path from 'node:path';
import { createMockSupabaseState, installMockSupabase } from './support/mockSupabase';

const artifact = (name: string) => path.resolve(process.cwd(), 'artifacts/sphere-logo', name);
const fixture = (name: string) => path.resolve(process.cwd(), 'tests/fixtures', name);

async function setTheme(context: BrowserContext, theme: 'light' | 'dark') {
  await context.addCookies([{ name: 'sphere_theme', value: theme, domain: '127.0.0.1', path: '/' }]);
}

async function goToQuickResult(page: Page) {
  await page.goto('/');
  await page.getByText(/Upload Dataset|Subir dataset/).first().click();
  await page.locator('#file-upload').setInputFiles(fixture('dataset-a-simple.csv'));
  await page.locator('select').last().selectOption('DD/MM/YYYY');
  await page.getByRole('button', { name: /Procesar archivo|Process file/i }).click();
  await expect(page.getByText('Instant Wow')).toBeVisible();
}

test.describe('Official Sphere brand assets', () => {
  test('shell uses the official wordmark in Light and official mark in compact mode', async ({ page, context }) => {
    await setTheme(context, 'light');
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await page.goto('/');

    const header = page.locator('.sidebar-header');
    await expect(header.locator('img[alt="Sphere"]')).toHaveAttribute('src', /logoSphere\.png/);
    await header.screenshot({ path: artifact('shell-light.png') });

    await page.getByRole('button', { name: 'Collapse sidebar' }).click();
    await expect(header.locator('img[alt="Sphere"]')).toHaveAttribute('src', /favicon\.png/);
    await header.screenshot({ path: artifact('shell-compact.png') });

    await expect(page.locator('link[rel="icon"][href="/brand/favicon.png"]')).toHaveCount(1);
    await expect(page.locator('link[rel*="icon"][href*="favicon.ico"]')).toHaveCount(0);

    await page.locator('.logout-btn').click();
    await expect(page.locator('.login-card')).toBeVisible();
    await page.locator('.login-card').screenshot({ path: artifact('auth-light.png') });
  });

  test('shell and auth keep the official identity readable in Dark', async ({ page, context }) => {
    await setTheme(context, 'dark');
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await page.goto('/');

    const header = page.locator('.sidebar-header');
    await expect(header.locator('img[src*="favicon.png"]')).toBeVisible();
    await expect(header.getByText('Sphere')).toBeVisible();
    await header.screenshot({ path: artifact('shell-dark.png') });

    await page.locator('.logout-btn').click();
    await expect(page.locator('.login-card')).toBeVisible();
    await page.locator('.login-card').screenshot({ path: artifact('auth-dark.png') });
  });

  test('Public Report and Public Story use the same official branding', async ({ page, context }) => {
    await setTheme(context, 'light');
    const state = await createMockSupabaseState();
    await installMockSupabase(context, page, state);
    await goToQuickResult(page);

    await page.getByRole('button', { name: /^Publish$/ }).click();
    const reportUrl = await page.locator('a:has-text("Open")').getAttribute('href');
    expect(reportUrl).toBeTruthy();
    const reportPage = await context.newPage();
    await reportPage.goto(reportUrl!);
    const reportBrand = reportPage.getByTestId('public-report-root').locator('.sphere-logo').first();
    await expect(reportBrand).toBeVisible();
    await reportBrand.screenshot({ path: artifact('public-report.png') });

    await page.getByRole('button', { name: /^Create Story$/ }).first().click();
    await expect(page.getByText(/Story Mode/i)).toBeVisible();
    await page.getByRole('button', { name: /^Publish$/ }).click();
    const storyUrl = await page.locator('a:has-text("Open Public Story")').getAttribute('href');
    expect(storyUrl).toBeTruthy();
    const storyPage = await context.newPage();
    await storyPage.goto(storyUrl!);
    const storyBrand = storyPage.locator('header .sphere-logo').first();
    await expect(storyBrand).toBeVisible();
    await storyBrand.screenshot({ path: artifact('public-story.png') });
  });
});
