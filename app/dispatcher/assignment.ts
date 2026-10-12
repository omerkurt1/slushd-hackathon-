import type { Vehicle } from './dispatcher';
import { findSite } from './sites';

export type Assignment = {
  taskId: string;
  origin: string;
  originCoordinates: [number, number];
  destination: string;
  destinationCoordinates: [number, number];
  eta: string;
  recipientName: string;
  recipientPhone: string;
  cargo: string;
};

export type AssignmentInput = Omit<Assignment, 'taskId'> & { vehicleId: string };

export type Draft = {
  vehicleId: string;
  origin: string;
  destination: string;
  time: string;
  recipientName: string;
  recipientPhone: string;
  cargo: string;
};

const taskIdPattern = /^tsk_[0-9a-f-]{36}$/i;
const etaPattern = /^\d{2}:\d{2}( \(\+1 day\))?$/;
const phonePattern = /^\+90 5\d{2} \d{3} \d{2} \d{2}$/;

export function normalizePhone(input: string) {
  let digits = input.replace(/\D/g, '');
  if (digits.startsWith('90') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (!/^5\d{9}$/.test(digits)) return null;
  return `+90 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6, 8)} ${digits.slice(8)}`;
}

export function resolveEta(time: string, now: Date) {
  const match = /^(\d{2}):(\d{2})(?::\d{2})?$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(now);
  const currentHour = Number(parts.find(part => part.type === 'hour')?.value);
  const currentMinute = Number(parts.find(part => part.type === 'minute')?.value);
  const nextDay = hour * 60 + minute <= currentHour * 60 + currentMinute;
  const clock = `${match[1]}:${match[2]}`;
  return { eta: nextDay ? `${clock} (+1 day)` : clock, nextDay };
}

export function validateDraft(draft: Draft, idleIds: string[], now: Date): { ok: true; value: AssignmentInput } | { ok: false; errors: Record<string, string> } {
  const errors: Record<string, string> = {};
  if (!idleIds.includes(draft.vehicleId)) errors.vehicleId = 'Select an idle vehicle. A new task is not written over an active one.';
  const origin = findSite(draft.origin);
  const destination = findSite(draft.destination);
  if (!origin) errors.origin = 'Origin could not be verified. Choose a demo site from the list.';
  if (!destination) errors.destination = 'Delivery point could not be verified. Choose a demo site from the list.';
  else if (origin && origin.id === destination.id) errors.destination = 'The destination must differ from the origin.';
  const eta = resolveEta(draft.time, now);
  if (!eta) errors.time = 'Choose a target arrival time.';
  const recipientName = draft.recipientName.trim();
  if (!recipientName) errors.recipientName = 'Recipient company or person is required.';
  else if (recipientName.length > 120) errors.recipientName = 'Recipient name cannot exceed 120 characters.';
  const recipientPhone = normalizePhone(draft.recipientPhone);
  if (!recipientPhone) errors.recipientPhone = 'Enter a 10-digit mobile number starting with 5. Example: +90 532 000 00 00';
  const cargo = draft.cargo.trim();
  if (cargo.length > 240) errors.cargo = 'Cargo note cannot exceed 240 characters.';
  if (Object.keys(errors).length || !origin || !destination || !eta || !recipientPhone) return { ok: false, errors };
  return {
    ok: true,
    value: {
      vehicleId: draft.vehicleId,
      origin: origin.name,
      originCoordinates: origin.coordinates,
      destination: destination.name,
      destinationCoordinates: destination.coordinates,
      eta: eta.eta,
      recipientName,
      recipientPhone,
      cargo,
    },
  };
}

export function parseAssignment(value: unknown): Assignment | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  const origin = findSite(typeof item.origin === 'string' ? item.origin : '');
  const destination = findSite(typeof item.destination === 'string' ? item.destination : '');
  if (!origin || !destination || origin.id === destination.id) return null;
  if (typeof item.taskId !== 'string' || !taskIdPattern.test(item.taskId)) return null;
  if (typeof item.eta !== 'string' || !etaPattern.test(item.eta)) return null;
  if (typeof item.recipientName !== 'string' || !item.recipientName.trim() || item.recipientName.length > 120) return null;
  if (typeof item.recipientPhone !== 'string' || !phonePattern.test(item.recipientPhone)) return null;
  if (typeof item.cargo !== 'string' || item.cargo.length > 240) return null;
  return {
    taskId: item.taskId,
    origin: origin.name,
    originCoordinates: origin.coordinates,
    destination: destination.name,
    destinationCoordinates: destination.coordinates,
    eta: item.eta,
    recipientName: item.recipientName.trim(),
    recipientPhone: item.recipientPhone,
    cargo: item.cargo.trim(),
  };
}

export function applyAssignment(vehicle: Vehicle, assignment: Assignment): Vehicle {
  return {
    ...vehicle,
    status: 'active',
    origin: assignment.origin,
    destination: assignment.destination,
    coordinates: assignment.originCoordinates,
    destinationCoordinates: assignment.destinationCoordinates,
    location: assignment.origin,
    speed: 0,
    eta: assignment.eta,
    detail: `En route (ETA: ${assignment.eta})`,
    cargo: assignment.cargo || 'No cargo note',
    taskId: assignment.taskId,
    recipientName: assignment.recipientName,
    recipientPhone: assignment.recipientPhone,
  };
}
