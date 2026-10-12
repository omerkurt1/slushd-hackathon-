type Point = [number, number];
const trips: Record<string, [Point, Point]> = {
  v1: [[41.1004, 29.2731], [40.854, 29.433]],
  v2: [[40.8235, 29.4384], [40.8242, 29.442]],
  v3: [[41.0372, 29.1244], [41.008, 29.163]],
  v4: [[40.7519, 29.5169], [40.793, 29.545]],
};
const upstream = 'https://routing.openstreetmap.de/routed-car/route/v1/driving';
type Result = { points: Point[]; distance: number; duration: number; snappedDistance: number };
const cache = new Map<string, { expires: number; result: Result }>();
const pending = new Map<string, Promise<Result>>();
let queue: Promise<unknown> = Promise.resolve();
let lastRequest = 0;

function parsePoint(value: string | null): Point | null {
  if (!value || !/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/.test(value)) return null;
  const [lat, lng] = value.split(',').map(Number);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [Math.round(lat * 1e6) / 1e6, Math.round(lng * 1e6) / 1e6];
}

async function calculate(key: string, start: Point, end: Point): Promise<Result> {
  const wait = Math.max(0, 1100 - (Date.now() - lastRequest));
  if (wait) await new Promise(resolve => setTimeout(resolve, wait));
  lastRequest = Date.now();
  const coordinates = [start, end].map(([lat, lng]) => `${lng},${lat}`).join(';');
  const response = await fetch(`${upstream}/${coordinates}?overview=full&geometries=geojson&steps=true&radiuses=2000;2000`, {
    signal: AbortSignal.timeout(12000), cache: 'no-store', headers: { 'User-Agent': 'Slushd-Dispatcher-Demo/0.4 (https://github.com/omerkurt1/slushd-hackathon-)' },
  });
  if (!response.ok) throw new Error('The routing service could not be reached.');
  const data = await response.json();
  const route = data.routes?.[0];
  if (data.code !== 'Ok' || !route || route.geometry?.type !== 'LineString' || !Array.isArray(route.geometry.coordinates) || route.geometry.coordinates.length < 2) throw new Error('No road route was found between these points.');
  if (route.legs?.some((leg: { steps?: { mode: string }[] }) => leg.steps?.some(step => step.mode === 'ferry'))) throw new Error('This route includes a ferry; a road-only route could not be verified.');
  if (!route.geometry.coordinates.every((point: unknown) => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90) || !Number.isFinite(route.distance) || !Number.isFinite(route.duration)) throw new Error('Invalid route response.');
  const result: Result = { points: route.geometry.coordinates.map(([lng, lat]: Point) => [lat, lng]), distance: route.distance, duration: route.duration, snappedDistance: data.waypoints?.[0]?.distance ?? 0 };
  cache.set(key, { expires: Date.now() + 3600000, result });
  return result;
}

function readPair(params: URLSearchParams): { key: string; start: Point; end: Point } | Response {
  if (params.has('from') || params.has('to')) {
    const start = parsePoint(params.get('from'));
    const end = parsePoint(params.get('to'));
    if (!start || !end) return Response.json({ error: 'Invalid coordinate. Latitude must be between -90 and 90, longitude between -180 and 180.' }, { status: 400 });
    if (start[0] === end[0] && start[1] === end[1]) return Response.json({ error: 'Origin and destination are the same point. A road route cannot be calculated.' }, { status: 400 });
    return { key: `${start[0]},${start[1]};${end[0]},${end[1]}`, start, end };
  }
  const id = params.get('vehicle') ?? '';
  if (!Object.hasOwn(trips, id)) return Response.json({ error: 'No route is defined for this vehicle.' }, { status: 400 });
  const [start, end] = trips[id];
  return { key: `vehicle:${id}`, start, end };
}

export async function GET(request: Request) {
  const pair = readPair(new URL(request.url).searchParams);
  if (pair instanceof Response) return pair;
  const stored = cache.get(pair.key);
  if (stored && stored.expires > Date.now()) return Response.json(stored.result);
  try {
    let work = pending.get(pair.key);
    if (!work) {
      work = queue.then(() => calculate(pair.key, pair.start, pair.end));
      queue = work.catch(() => undefined);
      pending.set(pair.key, work);
      void work.finally(() => pending.delete(pair.key)).catch(() => undefined);
    }
    return Response.json(await work);
  } catch (error) {
    return Response.json({ error: error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'The routing service timed out.' }, { status: 503 });
  }
}
