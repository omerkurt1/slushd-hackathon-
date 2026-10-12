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
  await page.getByRole('button', { name: 'Boşta 1', exact: true }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(1);
  await page.locator('.vehicle-card').click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 505');
  await page.getByRole('tab', { name: 'Olay' }).click();
  await expect(page.getByText('Bu araç şu anda aktif bir göreve sahip değil.')).toBeVisible();
  await expect(page.locator('.fleet-panel').getByRole('textbox', { name: 'Plaka ara' })).toBeVisible();
  await page.getByRole('textbox', { name: 'Plaka ara' }).fill('34log308');
  await page.getByRole('textbox', { name: 'Plaka ara' }).press('Enter');
  await page.getByRole('tab', { name: 'Sürücü' }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 308');
  await page.getByRole('textbox', { name: 'Plaka ara' }).fill('99XYZ');
  await expect(page.getByText('Araç bulunamadı')).toBeVisible();
  await page.getByRole('button', { name: 'Filtreleri temizle' }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(5);
  await page.getByRole('button', { name: 'İncele', exact: true }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 101');
  await expect(page.locator('.vehicle-card')).toHaveCount(1);
  await page.getByRole('button', { name: 'Tümü 5', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Yeni görev ata', exact: true })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight)).toBeTruthy();
  await page.screenshot({ path: '.local/phase-1-desktop.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('mobil düzende sayfa taşmaz, araç seçimi erişilebilir kalır', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Yolda 2', exact: true }).click();
  await page.locator('.vehicle-card').last().click();
  await expect(page.getByTestId('selected-plate')).toHaveText('16 LOG 412');
  expect(await page.evaluate(() => ({ horizontal: document.documentElement.scrollWidth <= innerWidth, vertical: document.documentElement.scrollHeight <= innerHeight }))).toEqual({ horizontal: true, vertical: true });
  await page.screenshot({ path: '.local/phase-1-mobile.png', fullPage: true });
});
