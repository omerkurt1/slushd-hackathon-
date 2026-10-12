import { test, expect } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';

test('rota servisi hatasında düz çizgi çizilmez ve tekrar deneme çalışır', async ({ page }) => {
  await page.route('**://tile.openstreetmap.org/**', route => route.abort());
  await page.route('**/api/route?*', route => route.fulfill({ status: 503, json: { error: 'Yol rotası bulunamadı.' } }));
  await page.goto('/dispatcher');
  await expect(page.locator('.vehicle-route')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rotayı göster', exact: true })).toBeDisabled();
  await mockRoadRoutes(page);
  await page.reload();
  await expect(page.locator('.vehicle-route')).toHaveCount(1);
  await expect(page.locator('.leaflet-tile-pane')).toHaveCSS('filter', 'none');
  await expect(page.locator('.leaflet-tile-pane')).toHaveCSS('opacity', '1');
});

test('araç değiştiğinde geç gelen eski rota gösterilmez', async ({ page }) => {
  await page.route('**://tile.openstreetmap.org/**', route => route.abort());
  let release!: () => void;
  const delayed = new Promise<void>(resolve => { release = resolve; });
  await mockRoadRoutes(page);
  await page.route('**/api/route?vehicle=v1', async route => {
    await delayed;
    await route.fulfill({ json: { points: [[41.1, 29.2], [41.2, 29.3]], distance: 99999, duration: 9999, snappedDistance: 0 } }).catch(() => undefined);
  });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Boşta 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  release();
  await expect(page.locator('.vehicle-route')).toHaveCount(0);
  await page.getByRole('button', { name: 'Yolda 2', exact: true }).click();
  await page.locator('.vehicle-card').first().click();
  await expect(page.locator('.vehicle-route')).toHaveCount(1);
});

test('API bilinmeyen araç kimliğini ve geçersiz koordinatı reddeder', async ({ request }) => {
  expect((await request.get('/api/route?vehicle=unknown')).status()).toBe(400);
  expect((await request.get('/api/route?from=91,29&to=40.8,29.4')).status()).toBe(400);
  expect((await request.get('/api/route?from=40.8,29.4&to=40.8,29.4')).status()).toBe(400);
  expect((await request.get('/api/route?from=abc&to=40.8,29.4')).status()).toBe(400);
});
