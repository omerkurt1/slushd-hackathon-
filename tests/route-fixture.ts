import type { Page } from '@playwright/test';

export async function mockRoadRoutes(page: Page) {
  const starts: Record<string, [number, number]> = { v1: [41.1004, 29.2731], v2: [40.8235, 29.4384], v3: [41.0372, 29.1244], v4: [40.7519, 29.5169] };
  await page.route('**/api/route?*', route => {
    const url = new URL(route.request().url());
    const from = url.searchParams.get('from');
    const id = url.searchParams.get('vehicle');
    let lat: number;
    let lng: number;
    if (from) {
      const parts = from.split(',').map(Number);
      if (parts.length !== 2 || parts.some(part => !Number.isFinite(part))) return route.fulfill({ status: 400, json: { error: 'Geçersiz koordinat.' } });
      [lat, lng] = parts;
    } else if (id && starts[id]) [lat, lng] = starts[id];
    else return route.fulfill({ status: 400, json: { error: 'Araç için tanımlı rota bulunamadı.' } });
    return route.fulfill({ json: { points: [[lat, lng], [lat + .001, lng], [lat + .001, lng + .002]], distance: 1250, duration: 180, snappedDistance: 0 } });
  });
}
