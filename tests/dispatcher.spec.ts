import { test, expect } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';
test.beforeEach(async ({ page }) => mockRoadRoutes(page));

test.beforeEach(async ({ page }) => { await page.route('**://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') })); });

test('filtre, plaka arama ve araç profili senkron çalışır', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dispatcher');
  await expect(page).toHaveURL(/\/dispatcher$/);
  await expect(page.locator('.vehicle-card')).toHaveCount(5);
  await expect(page.locator('.vehicle-card').first()).toContainText('34 LOG 101');
  await page.getByRole('button', { name: 'Idle 1', exact: true }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(1);
  await page.locator('.vehicle-card').click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 505');
  await page.getByRole('tab', { name: 'Incident' }).click();
  await expect(page.getByText('This vehicle has no active task.')).toBeVisible();
  await expect(page.locator('.fleet-panel').getByRole('textbox', { name: 'Search plate' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Search plate' }).fill('34log308');
  await page.getByRole('textbox', { name: 'Search plate' }).press('Enter');
  await page.getByRole('tab', { name: 'Driver' }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 308');
  await page.getByRole('textbox', { name: 'Search plate' }).fill('99XYZ');
  await expect(page.getByText('No vehicle found')).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'Review', exact: true }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 101');
  await expect(page.locator('.vehicle-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'All 5', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Assign a task', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBeTruthy();
  await page.screenshot({ path: '.local/phase-1-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobil düzende sayfa taşmaz, araç seçimi erişilebilir kalır', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'En route 2', exact: true }).click();
  await page.locator('.vehicle-card').last().click();
  await expect(page.getByTestId('selected-plate')).toHaveText('16 LOG 412');
  expect(await page.evaluate(() => ({ horizontal: document.documentElement.scrollWidth <= innerWidth, vertical: document.documentElement.scrollHeight <= innerHeight }))).toEqual({ horizontal: true, vertical: true });
  await page.screenshot({ path: '.local/phase-1-mobile.png', fullPage: true });
});
