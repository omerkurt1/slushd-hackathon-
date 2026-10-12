import { test, expect } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    let used = false;
    const fail = () => { used = true; };
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: { getCurrentPosition: fail, watchPosition: fail, clearWatch() {} } });
    Object.defineProperty(window, '__slushdGps', { configurable: true, get: () => used });
  });
});

async function openDispatcher(context: import('@playwright/test').BrowserContext) {
  const dispatcher = await context.newPage();
  await mockRoadRoutes(dispatcher);
  await dispatcher.route('**://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: png }));
  await dispatcher.goto('/dispatcher');
  await expect(dispatcher.getByTestId('selected-plate')).toHaveText('34 LOG 101');
  return dispatcher;
}

test('sürücü ekranı trafik, kaza, ses, mal kabul ve teslimi ayırır', async ({ page, context }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/driver');
  await expect(page.locator('.driver-app')).toHaveAttribute('data-booted', 'yes');
  await expect(page.getByText('Ahmet Yılmaz ·')).toBeVisible();
  await expect(page.getByTestId('driver-destination')).toHaveText('Gebze Logistics Park');
  await expect(page.getByText('En route')).toBeVisible();
  await expect(page.getByText(/Planned arrival 16:30/)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Call the warehouse' })).toHaveAttribute('href', 'tel:+905320000000');
  await expect(page.getByText('Demo: no real voice recording')).toBeVisible();
  await expect(page.getByTestId('last-notice')).toHaveCount(0);
  await expect(page.locator('select, textarea, input:not([type="file"])')).toHaveCount(0);
  const mic = page.getByRole('button', { name: 'Hold to speak' });
  const micBox = await mic.boundingBox();
  expect(Math.min(micBox!.width, micBox!.height)).toBeGreaterThanOrEqual(100);
  const step = page.getByRole('button', { name: "I'm at receiving" });
  expect((await step.boundingBox())!.height).toBeGreaterThanOrEqual(56);
  expect(await step.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(18);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
  await page.screenshot({ path: '.local/driver-ui-390.png' });

  const dispatcher = await openDispatcher(context);
  await page.getByRole('button', { name: 'Traffic', exact: true }).click();
  await expect(page.getByTestId('last-notice')).toContainText('Traffic');
  await expect(page.getByTestId('last-notice')).toContainText('Sample report saved in this browser');
  await expect(page.getByTestId('last-notice')).not.toContainText('Operations approved');
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('Traffic congestion');
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('16:30');

  await page.getByRole('button', { name: 'Breakdown', exact: true }).click();
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('Urgent technical support');
  await page.getByRole('button', { name: 'Waiting at the dock', exact: true }).click();
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('Dock entry queue');
  await page.getByRole('button', { name: 'More', exact: true }).click();
  await page.getByRole('button', { name: 'Scale / customs', exact: true }).click();
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('Waiting at scale or customs');
  await page.getByRole('button', { name: 'Emergency / Accident' }).click();
  await expect(page.getByTestId('last-notice')).toContainText('Demo example: +30 min');
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('+30 min delay');
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('17:00');

  await mic.dispatchEvent('pointerdown');
  await expect(page.getByTestId('record-state')).toHaveText('Recording');
  await page.waitForTimeout(500);
  await mic.dispatchEvent('pointerup');
  await expect(page.getByTestId('last-notice')).toContainText('Traffic accident (+40 min delay)');
  await expect(dispatcher.getByRole('tab', { name: 'Message' })).toHaveAttribute('aria-selected', 'true');
  await expect(dispatcher.getByText('There is an accident at the Kocaeli exit.')).toBeVisible();
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('17:10');

  await step.click();
  await expect(page.getByRole('button', { name: 'Delivered', exact: true })).toBeVisible();
  await expect(dispatcher.locator('.vehicle-card', { hasText: '34 LOG 101' })).toContainText('Waiting at receiving');
  await dispatcher.getByRole('tab', { name: 'Incident' }).click();
  await expect.poll(() => dispatcher.getByTestId('waiting-time').textContent()).toMatch(/^00:00:0/);
  await expect.poll(() => dispatcher.evaluate(() => localStorage.getItem('slushd-tracking-v1') ?? '')).toContain('Receiving');
  const tracking = await context.newPage();
  await tracking.goto('/track/v1');
  await expect(tracking.getByText(/Receiving/)).toBeVisible();

  await page.getByRole('button', { name: 'Delivered', exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: 'irsaliye.png', mimeType: 'image/png', buffer: png });
  const approve = page.getByRole('button', { name: 'Confirm delivery note' });
  await expect(approve).toBeEnabled();
  await approve.click();
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText(/The photo was not uploaded/)).toBeVisible();
  await expect.poll(() => dispatcher.evaluate(() => localStorage.getItem('slushd-tracking-v1') ?? '')).toContain('Delivered');
  await tracking.reload();
  await expect(tracking.getByText('Delivered')).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __slushdGps: boolean }).__slushdGps)).toBe(false);
});

test('kısa basış ve iptal bildirim yazmaz; saklama hatası başarı göstermez', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/driver');
  await expect(page.locator('.driver-app')).toHaveAttribute('data-booted', 'yes');
  const mic = page.getByRole('button', { name: 'Hold to speak' });
  await mic.dispatchEvent('pointerdown');
  await expect(page.getByTestId('record-state')).toHaveText('Recording');
  await mic.dispatchEvent('pointercancel');
  await expect(page.getByTestId('record-state')).toHaveText('');
  await expect(page.getByTestId('last-notice')).toHaveCount(0);
  await mic.dispatchEvent('pointerdown');
  await mic.dispatchEvent('pointerup');
  await expect(page.getByTestId('record-state')).toHaveText('');
  await expect(page.getByTestId('last-notice')).toHaveCount(0);
  await page.evaluate(() => {
    const original = localStorage.setItem.bind(localStorage);
    localStorage.setItem = (key: string, value: string) => { if (key === 'slushd-driver-signals-v1') throw new Error('full'); original(key, value); };
  });
  await page.getByRole('button', { name: 'Traffic', exact: true }).click();
  await expect(page.locator('.driver-alert')).toContainText('The report could not be saved in this browser');
  await expect(page.getByTestId('last-notice')).toHaveCount(0);
});

test('açık görev yokken peron ve depo araması uydurulmaz', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('slushd-fleet-snapshot-v1', JSON.stringify([{ id: 'v1', plate: '34 LOG 101', driver: 'Ahmet Yilmaz', destination: 'Awaiting task', eta: '—', status: 'idle', detail: 'Awaiting task' }])));
  await page.setViewportSize({ width: 360, height: 640 });
  await page.goto('/driver');
  await expect(page.getByText('Awaiting assignment')).toBeVisible();
  await expect(page.getByText('No active task')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Call the warehouse' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: "I'm at receiving" })).toHaveCount(0);
  await expect(page.getByText(/Dock /)).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test('320, 360, 390 ve 430 genişlikte yatay taşma yoktur', async ({ page }) => {
  for (const [width, height] of [[320, 568], [360, 640], [390, 844], [430, 932]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto('/driver');
    await expect(page.locator('.driver-app')).toHaveAttribute('data-booted', 'yes');
    const fit = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth <= window.innerWidth, emergency: document.querySelector('.driver-emergency')?.getBoundingClientRect().bottom ?? 0 }));
    expect(fit.overflow).toBeTruthy();
    const emergency = page.getByRole('button', { name: 'Emergency / Accident' });
    await emergency.scrollIntoViewIfNeeded();
    await expect(emergency).toBeVisible();
  }
});
