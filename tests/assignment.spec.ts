import { test, expect, type Page } from '@playwright/test';
import { mockRoadRoutes } from './route-fixture';

const emptyTile = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');

test.beforeEach(async ({ page }) => {
  await mockRoadRoutes(page);
  await page.route('**://tile.openstreetmap.org/**', route => route.fulfill({ contentType: 'image/png', body: emptyTile }));
});

async function fillTask(page: Page) {
  await page.getByLabel('Çıkış noktası').fill('Gebze Lojistik Köyü');
  await page.getByLabel('Teslimat noktası').fill('Borusan Gebze Depo, Peron No: 4');
  await page.getByLabel('Hedef varış saati').fill('16:30');
  await page.getByLabel('Alıcı şirket veya kişi').fill('Borusan Tedarik Birimi');
  await page.getByLabel('Alıcı telefonu').fill('0532 000 00 00');
  await page.getByLabel('Yük ve irsaliye notu').fill('12 Palet Otomotiv Parçası · İrsaliye: IRS-9021');
}

test('çekmece ön seçimi, doğrulama, Escape ve odak çalışır', async ({ page }) => {
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Yeni görev ata', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(page.getByLabel('Araç ve sürücü')).toHaveValue('');
  await expect(page.locator('#vehicleId option')).toHaveText(['Boşta araç seçin', '34 LOG 505 · Can Özkan']);
  await page.getByRole('button', { name: 'Görevi ata ve sürücüye ilet' }).click();
  await expect(page.getByText('Boşta bir araç seçin.')).toBeVisible();
  await expect(page.getByText('Çıkış noktası doğrulanamadı.')).toBeVisible();
  await expect(page.getByText('Teslimat noktası doğrulanamadı.')).toBeVisible();
  await expect(page.getByText('Hedef varış saati seçin.')).toBeVisible();
  await expect(page.getByText('Alıcı şirket veya kişi adı gerekli.')).toBeVisible();
  await expect(page.getByText('Telefon 5 ile başlayan 10 haneli bir cep numarası olmalı.')).toBeVisible();
  await page.getByLabel('Araç ve sürücü').selectOption('v5');
  await page.getByLabel('Çıkış noktası').fill('Kadıköy iskelesi');
  await page.getByLabel('Teslimat noktası').fill('Gebze Lojistik Köyü');
  await page.getByLabel('Hedef varış saati').fill('16:30');
  await page.getByLabel('Alıcı şirket veya kişi').fill('   ');
  await page.getByLabel('Alıcı telefonu').fill('12345');
  await page.getByRole('button', { name: 'Görevi ata ve sürücüye ilet' }).click();
  await expect(page.getByText('Çıkış noktası doğrulanamadı.')).toBeVisible();
  await expect(page.getByText('Alıcı şirket veya kişi adı gerekli.')).toBeVisible();
  await page.getByLabel('Çıkış noktası').fill('Gebze Lojistik Köyü');
  await page.getByLabel('Teslimat noktası').fill('Gebze Lojistik Köyü');
  await page.getByLabel('Alıcı şirket veya kişi').fill('Borusan Tedarik Birimi');
  await page.getByLabel('Alıcı telefonu').fill('+90 532 000 00 00');
  await page.getByRole('button', { name: 'Görevi ata ve sürücüye ilet' }).click();
  await expect(page.getByText('Hedef, çıkış noktasından farklı olmalı.')).toBeVisible();
  for (let step = 0; step < 20; step += 1) await page.keyboard.press('Tab');
  expect(await page.evaluate(() => !!document.querySelector('[role="dialog"]')?.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Yeni görev ata', exact: true })).toBeFocused();
  await expect(page.getByRole('button', { name: 'Boşta 1', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Boşta 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Olay' }).click();
  await page.getByRole('button', { name: 'Bu araca görev ata', exact: true }).click();
  await expect(page.getByLabel('Araç ve sürücü')).toHaveValue('v5');
  await expect(page.getByLabel('Çıkış noktası')).toHaveValue('Tuzla Filo Parkı');
});

test('görev araca, rotaya, takibe ve yenilemeye bağlanır', async ({ page }) => {
  test.setTimeout(60000);
  await page.clock.install({ time: new Date('2026-10-12T08:00:00Z') });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Boşta 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Olay' }).click();
  await page.getByRole('button', { name: 'Bu araca görev ata', exact: true }).click();
  await fillTask(page);
  const routeRequest = page.waitForRequest(request => request.url().includes('/api/route') && request.url().includes('from='));
  await page.getByRole('button', { name: 'Görevi ata ve sürücüye ilet' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  const routeUrl = decodeURIComponent((await routeRequest).url());
  expect(routeUrl).toContain('from=40.854,29.433');
  expect(routeUrl).toContain('to=40.8242,29.442');
  expect(routeUrl).not.toContain('vehicle=');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Boşta 0', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yolda 3', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tümü 5', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Sürücü' }).click();
  await expect(page.getByTestId('selected-plate')).toHaveText('34 LOG 505');
  await expect(page.locator('.vehicle-card', { hasText: '34 LOG 505' })).toContainText('Yolda (Hedef: 16:30)');
  await page.getByRole('tab', { name: 'Yol' }).click();
  await expect(page.locator('.detail-panel')).toContainText('Borusan Gebze Depo, Peron No: 4');
  await expect(page.locator('.cargo-summary')).toContainText('12 Palet Otomotiv Parçası · İrsaliye: IRS-9021');
  await expect(page.getByTitle('34 LOG 505 · Yolda', { exact: true })).toHaveClass(/active/);
  await expect(page.locator('.vehicle-route')).toHaveCount(1);
  const taskId = await page.evaluate(() => {
    const records = JSON.parse(localStorage.getItem('slushd-tracking-v1') || '[]') as { id: string }[];
    const tasks = records.filter(record => record.id.startsWith('tsk_'));
    if (tasks.length !== 1) throw new Error(`Beklenen 1 görev, bulunan ${tasks.length}`);
    return tasks[0].id;
  });
  const tracking = await page.context().newPage();
  await tracking.goto(`/track/${taskId}`);
  await expect(tracking.getByText('Borusan Gebze Depo, Peron No: 4')).toBeVisible();
  await expect(tracking.getByText('16:30', { exact: true })).toBeVisible();
  await expect(tracking.locator('body')).not.toContainText('Can Özkan');
  await expect(tracking.locator('body')).not.toContainText('Borusan Tedarik Birimi');
  await expect(tracking.locator('body')).not.toContainText('+90');
  await tracking.goto('/track/olmayan-gorev');
  await expect(tracking.getByText('Bu tarayıcıda bu gönderiye ait veri bulunamadı.')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Yolda 3', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Boşta 0', exact: true })).toBeVisible();
  await page.locator('.vehicle-card', { hasText: '34 LOG 505' }).click();
  await page.getByRole('tab', { name: 'Yol' }).click();
  await expect(page.locator('.telemetry')).toContainText('16:30');
  await expect(page.locator('.detail-panel')).toContainText('Gebze Lojistik Köyü');
  await expect(page.locator('.detail-panel')).toContainText('12 Palet Otomotiv Parçası · İrsaliye: IRS-9021');
});

test('rota servisi hata verirse görev düz çizgiye düşmez', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00Z') });
  await page.route('**/api/route?*', route => {
    if (route.request().url().includes('from=')) return route.fulfill({ status: 503, json: { error: 'Yol rotası bulunamadı.' } });
    return route.fallback();
  });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Boşta 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Olay' }).click();
  await page.getByRole('button', { name: 'Bu araca görev ata', exact: true }).click();
  await fillTask(page);
  await page.getByRole('button', { name: 'Görevi ata ve sürücüye ilet' }).click();
  await expect(page.locator('.vehicle-route')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Rotayı göster', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Yolda 3', exact: true })).toBeVisible();
});

test('depolama engelliyse görev ekranda kalır ve kayıp olduğu belirtilir', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-12T08:00:00Z') });
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new Error('blocked'); }; });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Boşta 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await page.getByRole('tab', { name: 'Olay' }).click();
  await page.getByRole('button', { name: 'Bu araca görev ata', exact: true }).click();
  await fillTask(page);
  await page.getByRole('button', { name: 'Görevi ata ve sürücüye ilet' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Kayıt bu tarayıcıda saklanamadı.' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yolda 3', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Boşta 1', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('mobil çekmece taşmadan açılır', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/dispatcher');
  await page.getByRole('button', { name: 'Yeni görev ata', exact: true }).click();
  const box = await page.getByRole('dialog').boundingBox();
  expect(box?.width).toBeLessThanOrEqual(390);
  await expect(page.getByLabel('Teslimat noktası')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight)).toBe(true);
});

test('ses araç değişince durur', async ({ page }) => {
  await page.goto('/dispatcher');
  await page.getByRole('tab', { name: 'Mesaj' }).click();
  await page.getByRole('button', { name: 'Ses kaydını oynat' }).click();
  await expect(page.locator('audio')).toHaveJSProperty('paused', false);
  await page.getByRole('button', { name: 'Boşta 1', exact: true }).click();
  await page.locator('.vehicle-card').click();
  await expect(page.locator('audio')).toHaveCount(0);
  await expect(page.locator('body')).not.toContainText(/Rampa|Rampadayım/);
});
