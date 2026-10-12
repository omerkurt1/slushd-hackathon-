import { test, expect, type Page } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';
test.beforeEach(async ({ page }) => mockRoadRoutes(page));

// Interaction tests never pan/zoom against public tile servers.
const tiles = '**://tile.openstreetmap.org/**';
const emptyTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
test.beforeEach(async ({ page }) => { await page.route(tiles, route => route.fulfill({ contentType: 'image/png', body: emptyTile })); });

async function expectCentered(page: Page, title: string) {
  await expect.poll(async () => {
    const map = await page.locator('.fleet-map').boundingBox();
    const marker = await page.getByTitle(title, { exact: true }).boundingBox();
    return map && marker ? Math.hypot(marker.x + marker.width / 2 - map.x - map.width / 2, marker.y + marker.height / 2 - map.y - map.height / 2) : Infinity;
  }).toBeLessThan(3);
}

test('harita pinleri, rota ve araç seçimi senkron çalışır', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dispatcher');
  await expect(page.locator('.fleet-marker')).toHaveCount(5);
  await expect(page.locator('.vehicle-route')).toHaveCount(1);
  await expect(page.locator('.marker-halo').first()).toHaveCSS('animation-name', 'emergency-pulse');
  // The map layer loads fixture tiles; live imagery is checked separately.
  await expect.poll(() => page.locator('.leaflet-tile-loaded').count()).toBeGreaterThan(0);
  await page.getByTitle('34 LOG 505 · Idle', { exact: true }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 505');
  await expect(page.locator('.vehicle-card.selected')).toContainText('34 LOG 505');
  await expect(page.locator('.vehicle-route')).toHaveCount(0);
  await expectCentered(page, '34 LOG 505 · Idle');
  await page.getByRole('textbox', { name: 'Search plate' }).fill('34log308');
  await page.getByRole('textbox', { name: 'Search plate' }).press('Enter');
  await expectCentered(page, '34 LOG 308 · En route');
  await expect(page.locator('.vehicle-route')).toHaveCount(1);
  await expect(page.locator('.vehicle-tooltip')).toContainText('34 LOG 308');
  await page.getByRole('button', { name: 'Entire fleet', exact: true }).click();
  await page.getByTitle('41 LOG 204 · Receiving', { exact: true }).click();
  await expect(page.locator('.vehicle-card')).toHaveCount(5);
  await expect(page.getByTestId('selected-plate')).toHaveText('41 LOG 204');
  await expectCentered(page, '41 LOG 204 · Receiving');
  await expect(page.locator('.vehicle-route')).toHaveCount(1);
  await expectCentered(page, '41 LOG 204 · Receiving');
  await page.getByRole('button', { name: 'Entire fleet', exact: true }).click();
  await page.getByTitle('34 LOG 101 · Incident', { exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('tab', { name: 'Driver' }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 101');
  expect(errors).toEqual([]);
});

test('zemin yüklenmezse hata ve tekrar deneme görünür; azaltılmış hareket korunur', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route(tiles, route => route.abort());
  await page.goto('/dispatcher');
  await expect(page.getByText('Map tiles failed to load.', { exact: false })).toBeVisible();
  await expect(page.locator('.marker-halo').first()).toHaveCSS('animation-name', 'none');
  await page.getByTitle('34 LOG 505 · Idle', { exact: true }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 505');
  await page.unroute(tiles);
  await page.route(tiles, route => route.fulfill({ contentType: 'image/png', body: emptyTile }));
  await page.getByRole('button', { name: 'Try again' }).click();
  await expect.poll(() => page.locator('.leaflet-tile-loaded').count()).toBeGreaterThan(0);
  await expect(page.locator('.tile-error')).toHaveCount(0);
});
