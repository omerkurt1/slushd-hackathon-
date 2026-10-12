import { test, expect, type Page } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';

const emptyTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

test.beforeEach(async ({ page }) => {
  await mockRoadRoutes(page);
  await page.route('**://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: emptyTile }));
});

async function fillTask(page: Page) {
  await page.getByLabel('Origin').fill('Gebze Logistics Park');
  await page.getByLabel('Delivery point').fill('Borusan Gebze Warehouse, Dock door 4');
  await page.getByLabel('Planned arrival time').fill('16:30');
  await page.getByLabel('Recipient company or person').fill('Borusan Supply Unit');
  await page.getByLabel('Recipient phone').fill('0532 000 00 00');
  await page.getByLabel('Cargo and delivery note').fill('12 pallets of auto parts · Note: IRS-9021');
}

test('çekmece ön seçimi, doğrulama, Escape ve odak çalışır', async ({ page }) => {
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Assign a task', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Vehicle and driver')).toHaveValue('');
  await expect(page.locator('#vehicleId option')).toHaveText(['Select an idle vehicle', '34 LOG 505 · Can Özkan']);
  await page.getByRole('button', { name: 'Assign task and send to driver' }).click();
  await expect(page.getByText('Select an idle vehicle.')).toBeVisible();
  await expect(page.getByText('Origin could not be verified.')).toBeVisible();
  await expect(page.getByText('Delivery point could not be verified.')).toBeVisible();
  await expect(page.getByText('Choose a target arrival time.')).toBeVisible();
  await expect(page.getByText('Recipient company or person is required.')).toBeVisible();
  await expect(page.getByText('Enter a 10-digit mobile number starting with 5.')).toBeVisible();
  await page.getByLabel('Vehicle and driver').selectOption('v5');
  await page.getByLabel('Origin').fill('Unknown pier');
  await page.getByLabel('Delivery point').fill('Gebze Logistics Park');
  await page.getByLabel('Planned arrival time').fill('16:30');
  await page.getByLabel('Recipient company or person').fill('   ');
  await page.getByLabel('Recipient phone').fill('12345');
  await page.getByRole('button', { name: 'Assign task and send to driver' }).click();
  await expect(page.getByText('Origin could not be verified.')).toBeVisible();
  await expect(page.getByText('Recipient company or person is required.')).toBeVisible();
  await page.getByLabel('Origin').fill('Gebze Logistics Park');
  await page.getByLabel('Delivery point').fill('Gebze Logistics Park');
  await page.getByLabel('Recipient company or person').fill('Borusan Supply Unit');
  await page.getByLabel('Recipient phone').fill('+90 532 000 00 00');
  await page.getByRole('button', { name: 'Assign task and send to driver' }).click();
  await expect(page.getByText('The destination must differ from the origin.')).toBeVisible();
  for (let step = 0; step < 20; step += 1) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.querySelector('[role="dialog"]')?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Assign a task', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Idle 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Idle 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await page.getByRole('button', { name: 'Assign this vehicle', exact: true }).click();
  await expect(page.getByLabel('Vehicle and driver')).toHaveValue('v5');
  await expect(page.getByLabel('Origin')).toHaveValue('Tuzla Fleet Yard');
});

test('görev araca, rotaya, takibe ve yenilemeye bağlanır', async ({ page }) => {
  test.setTimeout(60000);
  await page.clock.install({ time: new Date('2026-10-12T08:00:00Z') });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Idle 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await page.getByRole('button', { name: 'Assign this vehicle', exact: true }).click();
  await fillTask(page);
  const routeRequest = page.waitForRequest(request => request.url().includes('/api/route') && request.url().includes('from='));
  await page.getByRole('button', { name: 'Assign task and send to driver' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  const routeUrl = decodeURIComponent((await routeRequest).url());
  expect(routeUrl).toContain('from=40.854,29.433');
  expect(routeUrl).toContain('to=40.8242,29.442');
  expect(routeUrl).not.toContain('vehicle=');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Idle 0', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'En route 3', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'All 5', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Driver' }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 505');
  await expect(page.locator('.vehicle-card', { hasText: '34 LOG 505' })).toContainText('En route (ETA: 16:30)');
  await page.getByRole('tab', { name: 'Route' }).click();
  await expect(page.locator('.detail-panel')).toContainText('Borusan Gebze Warehouse, Dock door 4');
  await expect(page.locator('.cargo-summary')).toContainText('12 pallets of auto parts · Note: IRS-9021');
  await expect(page.getByTitle('34 LOG 505 · En route', { exact: true })).toHaveClass(/active/);
  await expect(page.locator('.vehicle-route')).toHaveCount(1);
  const taskId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('slushd-tracking-v1') || '[]') as { id: string }[];
    const tasks = records.filter(record => record.id.startsWith('tsk_'));
    if (tasks.length !== 1) throw new Error(`Expected 1 task, found ${tasks.length}`);
    return tasks[0].id;
  });
  const tracking = await page.context().newPage();
  await tracking.goto(`/track/${taskId}`);
  await expect(tracking.getByText('Borusan Gebze Warehouse, Dock door 4')).toBeVisible();
  await expect(tracking.getByText('16:30', { exact: true })).toBeVisible();
  await expect(tracking.locator('body')).not.toContainText('Can Özkan');
  await expect(tracking.locator('body')).not.toContainText('Borusan Supply Unit');
  await expect(tracking.locator('body')).not.toContainText('+90');
  await tracking.goto('/track/olmayan-gorev');
  await expect(tracking.getByText('No data for this shipment was found in this browser.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'En route 3', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Idle 0', exact: true })).toBeVisible();
  await page.locator('.vehicle-card', { hasText: '34 LOG 505' }).click();
  await page.getByRole('tab', { name: 'Route' }).click();
  await expect(page.locator('.telemetry')).toContainText('16:30');
  await expect(page.locator('.detail-panel')).toContainText('Gebze Logistics Park');
  await expect(page.locator('.detail-panel')).toContainText('12 pallets of auto parts · Note: IRS-9021');
});

test('rota servisi hata verirse görev düz çizgiye düşmez', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00Z') });
  await page.route('**/api/route?*', route => {
    if (route.request().url().includes('from=')) return route.fulfill({ status: 503, json: { error: 'No road route was found.' } });
    return route.fallback();
  });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Idle 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await page.getByRole('button', { name: 'Assign this vehicle', exact: true }).click();
  await fillTask(page);
  await page.getByRole('button', { name: 'Assign task and send to driver' }).click();
  await expect(page.locator('.vehicle-route')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'En route 3', exact: true })).toBeVisible();
});

test('depolama engelliyse görev ekranda kalır ve kayıp olduğu belirtilir', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00Z') });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Idle 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await page.getByRole('button', { name: 'Assign this vehicle', exact: true }).click();
  await fillTask(page);
  await page.getByRole('button', { name: 'Assign task and send to driver' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Could not save in this browser.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'En route 3', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Idle 1', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobil çekmece taşmadan açılır', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Assign a task', exact: true }).click();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box?.width).toBeLessThanOrEqual(390);
  await expect(page.getByLabel('Delivery point')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test('ses araç değişince durur', async ({ page }) => {
  await page.goto('/dispatcher');
  await page.getByRole('tab', { name: 'Message' }).click();
  await page.getByRole('button', { name: 'Play recording' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Idle 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Rampa|Rampadayım/);
});
