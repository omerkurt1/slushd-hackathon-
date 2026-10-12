import { test, expect } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';
test.beforeEach(async ({ page }) => mockRoadRoutes(page));

test.beforeEach(async ({ page }) => {
  await page.route('**://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') }));
});

test('ses, ETA onayı, olay kapatma, takip ve kalıcılık', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/dispatcher');
  await expect(page.locator('audio')).toHaveJSProperty('readyState', 4);
  await page.getByRole('button', { name: 'Oynatma hızı' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('playbackRate', 1.2);
  await page.getByRole('button', { name: 'Ses kaydını oynat' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Ses kaydını duraklat' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', true);
  await expect(page.getByRole('heading', { name: 'MESAJ ÖZETİ ÖRNEK' })).toBeVisible();
  await expect(page.getByText('Son durum')).toBeVisible();
  await expect(page.getByText('Devam ediyor', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Gecikmeyi onayla (+40 dk)', exact: true }).click();
  await expect(page.locator('.telemetry')).toContainText('17:10');
  await expect(page.getByRole('button', { name: 'Gecikme onaylandı (+40 dk)' })).toBeDisabled();
  await page.getByRole('button', { name: 'Müşteri takip linkini kopyala' }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('http://127.0.0.1:3000/track/v1');
  await expect(page.getByRole('link', { name: 'Sürücüye çağrı başlat' })).toHaveAttribute('href', 'tel:+905320000101');
  const tracking = await context.newPage();
  await tracking.goto('/track/v1');
  await expect(tracking.getByText('17:10', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Olayı çözüldü olarak kapat' }).click();
  await expect(page.getByText('Bitti', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Acil 0', exact: true })).toBeVisible();
  await expect(page.getByTitle('34 LOG 101 · Yolda', { exact: true })).toHaveClass(/active/);
  await expect(page.locator('.fleet-marker.emergency')).toHaveCount(0);
  await expect(tracking.getByText('Yolda · Olay çözüldü')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Olay çözüldü', exact: true })).toBeDisabled();
  await expect(page.locator('.telemetry')).toContainText('17:10');
});

test('depo süresi sınırda kırmızı olur, not ve başlangıç zamanı korunur', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T10:00:00Z') });
  await page.clock.pauseAt(new Date('2026-10-12T10:00:01Z'));
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Mal kabul 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await expect(page.getByTestId('waiting-time')).toHaveText('01:48:15');
  await expect(page.getByRole('button', { name: 'Fatura notu oluştur', exact: true })).toHaveCount(0);
  await page.clock.fastForward(704000);
  await expect(page.getByTestId('waiting-time')).toHaveText('01:59:59');
  await page.clock.fastForward(1000);
  await expect(page.getByTestId('waiting-time')).toHaveText('02:00:00');
  await expect(page.locator('.waiting-counter')).toHaveClass(/over-limit/);
  await page.getByRole('button', { name: 'Fatura notu oluştur', exact: true }).click();
  await expect(page.locator('.invoice-note')).toContainText('Peron No: 4');
  await page.reload();
  await page.getByRole('button', { name: 'Mal kabul 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await expect(page.getByTestId('waiting-time')).toHaveText('02:00:00');
  await expect(page.getByRole('button', { name: 'Fatura notu oluşturuldu' })).toBeDisabled();
  await expect(page.locator('body')).not.toContainText(/Rampa|Rampadayım/);
});

test('pano reddinde kopyalanabilir bağlantı ve bulunamayan takip durumu', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { throw new Error('Denied'); } } }); });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Müşteri takip linkini kopyala' }).click();
  await expect(page.getByRole('textbox', { name: 'Takip bağlantısı' })).toHaveValue('http://127.0.0.1:3000/track/v1');
  await page.goto('/track/unknown');
  await expect(page.getByText('Bu tarayıcıda bu gönderiye ait veri bulunamadı.')).toBeVisible();
});
