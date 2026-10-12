import { test, expect } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';
test.beforeEach(async ({ page }) => mockRoadRoutes(page));

test.beforeEach(async ({ page }) => {
  await page.route('**://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }));
});

test('ses, ETA onayı, olay kapatma, takip ve kalıcılık', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/dispatcher');
  await page.getByRole('tab', { name: 'Message' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('readyState', 4);
  await page.getByRole('button', { name: 'Playback speed' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('playbackRate', 1.2);
  await page.getByRole('button', { name: 'Play recording' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Pause recording' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', true);
  await expect(page.getByRole('heading', { name: 'MESSAGE SUMMARY SAMPLE' })).toBeVisible();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await expect(page.getByText('Latest status')).toBeVisible();
  await expect(page.getByText('In progress', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Approve delay (+40 min)', exact: true }).click();
  await page.getByRole('tab', { name: 'Route' }).click();
  await expect(page.locator('.telemetry')).toContainText('17:10');
  await page.getByRole('tab', { name: 'Incident' }).click();
  await expect(page.getByRole('button', { name: 'Delay approved (+40 min)' })).toBeDisabled();
  await page.getByRole('button', { name: 'Copy customer tracking link' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://127.0.0.1:3000/track/v1');
  await expect(page.getByRole('link', { name: 'Call driver' })).toHaveAttribute('href', 'tel:+905320000101');
  const tracking = await context.newPage();
  await tracking.goto('/track/v1');
  await expect(tracking.getByText('17:10', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark incident resolved' }).click();
  await expect(page.getByText('Done', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Incident 0', exact: true })).toBeVisible();
  await expect(page.getByTitle('34 LOG 101 · En route', { exact: true })).toHaveClass(/active/);
  await expect(page.locator('.fleet-marker.emergency')).toHaveCount(0);
  await expect(tracking.getByText('En route · Incident closed')).toBeVisible();
  await page.reload();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await expect(page.getByRole('button', { name: 'Incident closed', exact: true })).toBeDisabled();
  await page.getByRole('tab', { name: 'Route' }).click();
  await expect(page.locator('.telemetry')).toContainText('17:10');
});

test('depo süresi sınırda kırmızı olur, not ve başlangıç zamanı korunur', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-12T10:00:01Z'));
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Receiving 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await expect(page.getByTestId('waiting-time')).toHaveText('01:48:15');
  await expect(page.getByRole('button', { name: 'Create invoice note', exact: true })).toHaveCount(0);
  await page.clock.fastForward(704000);
  await expect(page.getByTestId('waiting-time')).toHaveText('01:59:59');
  await page.clock.fastForward(1000);
  await expect(page.getByTestId('waiting-time')).toHaveText('02:00:00');
  await expect(page.locator('.waiting-counter')).toHaveClass(/over-limit/);
  await page.getByRole('button', { name: 'Create invoice note', exact: true }).click();
  await expect(page.locator('.invoice-note')).toContainText('Dock door 4');
  await page.reload();
  await page.getByRole('button', { name: 'Receiving 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Incident' }).click();
  await expect(page.getByTestId('waiting-time')).toHaveText('02:00:00');
  await expect(page.getByRole('button', { name: 'Invoice note created' })).toBeDisabled();
  await expect(page.locator('body')).not.toContainText(/Rampa|Rampadayım/);
});

test('pano reddinde kopyalanabilir bağlantı ve bulunamayan takip durumu', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } } }); });
  await page.goto('/dispatcher');
  await page.getByRole('tab', { name: 'Incident' }).click();
  await page.getByRole('button', { name: 'Copy customer tracking link' }).click();
  await expect(page.getByRole('textbox', { name: 'Tracking link' })).toHaveValue('http://127.0.0.1:3000/track/v1');
  await page.goto('/track/unknown');
  await expect(page.getByText('No data for this shipment was found in this browser.')).toBeVisible();
});
