export const DRIVER_ID = 'v1';
export const SIGNAL_KEY = 'slushd-driver-signals-v1';
export const FLEET_SNAPSHOT_KEY = 'slushd-fleet-snapshot-v1';

export type DriverSignalType = 'voice' | 'traffic' | 'crash' | 'breakdown' | 'gate' | 'customs' | 'at_ramp' | 'delivered';
export type TaskPhase = 'EN_ROUTE' | 'AT_RAMP' | 'DELIVERED';
export type DriverStatus = 'emergency' | 'ramp' | 'active' | 'idle';

export type DriverSignal = {
  id: string;
  vehicleId: string;
  type: DriverSignalType;
  at: number;
  summary: string;
  detail: string;
  delayMinutes?: number;
  transcript?: string;
  location?: string;
};

export type DriverState = {
  signalId: string;
  at: number;
  phase: TaskPhase;
  status: DriverStatus;
  summary: string;
  detail: string;
  delayMinutes: number;
  waitingSince: number;
  halted: boolean;
  delivered: boolean;
  reportActive: boolean;
  reportTitle: string;
  reportTranscript: string;
  location?: string;
};

export type FleetCard = {
  id: string;
  plate: string;
  driver: string;
  destination: string;
  eta: string;
  status: string;
  detail: string;
};

const types = new Set<DriverSignalType>(['voice', 'traffic', 'crash', 'breakdown', 'gate', 'customs', 'at_ramp', 'delivered']);

function isSignal(value: unknown): value is DriverSignal {
  if (!value || typeof value !== 'object') return false;
  const signal = value as Record<string, unknown>;
  return typeof signal.id === 'string' && signal.id.length > 0 && signal.id.length < 80
    && typeof signal.vehicleId === 'string' && signal.vehicleId.length < 40
    && typeof signal.type === 'string' && types.has(signal.type as DriverSignalType)
    && typeof signal.at === 'number' && Number.isFinite(signal.at) && signal.at > 0 && signal.at < Date.now() + 60_000
    && typeof signal.summary === 'string' && signal.summary.length > 0 && signal.summary.length < 180
    && typeof signal.detail === 'string' && signal.detail.length > 0 && signal.detail.length < 180
    && (signal.transcript === undefined || (typeof signal.transcript === 'string' && signal.transcript.length < 240))
    && (signal.location === undefined || (typeof signal.location === 'string' && signal.location.length < 180))
    && (signal.delayMinutes === undefined || (typeof signal.delayMinutes === 'number' && signal.delayMinutes >= 0 && signal.delayMinutes <= 240));
}

export function parseSignalLog(raw: string | null): DriverSignal[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(isSignal).slice(-30);
  } catch {
    return [];
  }
}

export function appendSignal(signal: DriverSignal) {
  const next = [...parseSignalLog(localStorage.getItem(SIGNAL_KEY)), signal].slice(-30);
  localStorage.setItem(SIGNAL_KEY, JSON.stringify(next));
}

export function readFleetCard(id: string): FleetCard | null {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(FLEET_SNAPSHOT_KEY) ?? 'null');
    if (!Array.isArray(data)) return null;
    const found = data.find(item => item && typeof item === 'object' && (item as { id?: unknown }).id === id) as Record<string, unknown> | undefined;
    if (!found || typeof found.plate !== 'string' || typeof found.driver !== 'string' || typeof found.destination !== 'string' || typeof found.eta !== 'string') return null;
    return { id, plate: found.plate, driver: found.driver, destination: found.destination, eta: found.eta, status: typeof found.status === 'string' ? found.status : '', detail: typeof found.detail === 'string' ? found.detail : '' };
  } catch {
    return null;
  }
}

const empty = (): DriverState => ({
  signalId: '', at: 0, phase: 'EN_ROUTE', status: 'active', summary: '', detail: '', delayMinutes: 0, waitingSince: 0, halted: false, delivered: false, reportActive: false, reportTitle: '', reportTranscript: '',
});

export function evolve(previous: DriverState | undefined, signal: DriverSignal): DriverState {
  const next: DriverState = { ...(previous ?? empty()), signalId: signal.id, at: signal.at, summary: signal.summary, detail: signal.detail, reportActive: false };
  if (signal.location) next.location = signal.location;
  switch (signal.type) {
    case 'voice':
      return { ...next, status: 'emergency', delayMinutes: signal.delayMinutes ?? 40, halted: true, delivered: false, reportActive: true, reportTitle: signal.summary, reportTranscript: signal.transcript ?? '' };
    case 'traffic':
      return { ...next, status: 'active', detail: signal.detail, halted: false, delivered: false };
    case 'crash':
      return { ...next, status: 'emergency', delayMinutes: 30, halted: true, delivered: false };
    case 'breakdown':
    case 'gate':
    case 'customs':
      return { ...next, status: 'emergency', halted: true, delivered: false };
    case 'at_ramp':
      return { ...next, phase: 'AT_RAMP', status: 'ramp', detail: 'Waiting at receiving', waitingSince: previous?.waitingSince || signal.at, halted: true, delivered: false };
    case 'delivered':
      return { ...next, phase: 'DELIVERED', status: 'active', detail: 'Delivery note received', halted: true, delivered: true };
  }
}
