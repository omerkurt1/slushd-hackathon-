type Point = [number, number];
const trips: Record<string, [Point, Point]> = {
  v1: [[41.1004, 29.2731], [40.854, 29.433]],
  v2: [[40.8235, 29.4384], [40.8242, 29.442]],
  v3: [[41.0372, 29.1244], [41.008, 29.163]],
  v4: [[40.7519, 29.5169], [40.793, 29.545]],
};
type Result = { points: Point[]; distance: number; duration: number; snappedDistance: number };
const cache = new Map<string, { expires: number; result: Result }>();
const pending = new Map<string, Promise<Result>>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;

async function calculate(id: string): Promise<Result> {
  const wait = Math.max(0, 1100 - (Date.now() - lastRequest));
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  lastRequest = Date.now();
  const coordinates = trips[id].map(([lat, lng]) => `${lng},${lat}`).join(';');
  const response = await fetch(`https://routing.openstreetmap.de/routed-car/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=true&radiuses=2000;2000`, {
    signal: AbortSignal.timeout(12000), cache: 'no-store', headers: { 'User-Agent': 'Slushd-Dispatcher-Demo/0.3 (https://github.com/omerkurt1/slushd-hackathon-)' },
  });
  if (!response.ok) throw new Error('Rota servisine ulaşılamadı.');
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route || route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2) throw new Error('Bu noktalar arasında yol rotası bulunamadı.');
  // The public car profile cannot exclude ferries; reject any ferry leg instead.
  if (route.legs?.some((leg: { steps?: { mode: string }[] }) => leg.steps?.some(step => step.mode === 'ferry'))) throw new Error('Bu rota feribot içeriyor; kara yolu rotası doğrulanamadı.');
  if (!route.geometry.coordinates.every((point: unknown) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90) || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) throw new Error('Geçersiz rota yanıtı.');
  const result: Result = { points: route.geometry.coordinates.map(([lng, lat]: Point) => [lat, lng]), distance: route.distance, duration: route.duration, snappedDistance: data.waypoints?.[0]?.distance ?? 0 };
  cache.set(id, { expires: Date.now() + 3600000, result });
  return result;
}

export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get('vehicle') ?? '';
  if (!Object.hasOwn(trips, id)) return Response.json({ error: 'Araç için tanımlı rota bulunamadı.' }, { status: 400 });
  const stored = cache.get(id);
  if (stored && stored.expires > Date.now()) return Response.json(stored.result);
  try {
    let work = pending.get(id);
    if (!work) {
      work = queue.then(() => calculate(id));
      queue = work.catch(() => undefined);
      pending.set(id, work);
      void work.finally(() => pending.delete(id)).catch(() => undefined);
    }
    return Response.json(await work);
  } catch (error) {
    return Response.json({ error: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'Rota servisi zaman aşımına uğradı.' }, { status: 503 });
  }
}
