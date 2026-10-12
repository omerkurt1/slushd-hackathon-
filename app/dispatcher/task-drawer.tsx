'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { Vehicle } from './dispatcher';
import { validateDraft, resolveEta, type AssignmentInput, type Draft } from './assignment';
import { findSite, sites } from './sites';
import './task-drawer.css';

const emptyDraft: Draft = { vehicleId: '', origin: '', destination: '', time: '', recipientName: '', recipientPhone: '', cargo: '' };

export default function TaskDrawer({ open, vehicles, presetVehicleId, now, onClose, onAssign }: {
  open: boolean;
  vehicles: Vehicle[];
  presetVehicleId: string;
  now: number;
  onClose: () => void;
  onAssign: (value: AssignmentInput) => boolean;
}) {
  const titleId = useId();
  const noteId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const saving = useRef(false);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const idle = vehicles.filter(vehicle => vehicle.status === 'idle');
  const preset = idle.find(vehicle => vehicle.id === presetVehicleId);
  const presetId = preset?.id ?? '';
  const presetOrigin = preset?.origin ?? '';
  const eta = resolveEta(draft.time, new Date(now || Date.now()));
  const originSite = findSite(draft.origin);
  const destinationSite = findSite(draft.destination);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const origin = sites.find(site => site.name === presetOrigin)?.name ?? '';
    setDraft({ ...emptyDraft, vehicleId: presetId, origin });
    setErrors({});
    setFormError('');
    saving.current = false;
  }, [open, presetId, presetOrigin]);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = () => [...dialog.querySelectorAll<HTMLElement>('button, input, select, textarea')].filter(element => !element.hasAttribute('disabled'));
    (dialog.querySelector<HTMLElement>('#vehicleId') ?? focusable()[0])?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return; }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open) return null;

  function update(field: keyof Draft, value: string) {
    setDraft(current => ({ ...current, [field]: value }));
    setErrors(current => ({ ...current, [field]: '' }));
    setFormError('');
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (saving.current) return;
    const result = validateDraft(draft, idle.map(vehicle => vehicle.id), new Date(now || Date.now()));
    if (!result.ok) {
      setErrors(result.errors);
      const field = ['vehicleId', 'origin', 'destination', 'time', 'recipientName', 'recipientPhone', 'cargo'].find(key => result.errors[key]);
      if (field) document.getElementById(field)?.focus();
      return;
    }
    saving.current = true;
    if (!onAssign(result.value)) {
      saving.current = false;
      setFormError('This vehicle already has an active task. The current job was not overwritten.');
    }
  }

  return (
    <div className="drawer-root">
      <button type="button" className="drawer-backdrop" aria-label="Close without saving" onClick={onClose} />
      <div ref={dialogRef} className="task-drawer" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={noteId}>
        <header className="drawer-header">
          <div><div className="eyebrow">TASK ASSIGNMENT</div><h2 id={titleId}>New task</h2></div>
          <button type="button" aria-label="Close task form" onClick={onClose}><X size={16} /></button>
        </header>
        <form className="task-form" onSubmit={submit}>
          <label htmlFor="vehicleId">Vehicle and driver</label>
          <select id="vehicleId" value={draft.vehicleId} aria-invalid={!!errors.vehicleId} aria-describedby={errors.vehicleId ? 'vehicleId-error' : undefined} onChange={event => update('vehicleId', event.target.value)}>
            <option value="">Select an idle vehicle</option>
            {idle.map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.plate} · {vehicle.driver}</option>)}
          </select>
          {errors.vehicleId && <p id="vehicleId-error" className="field-error" role="alert">{errors.vehicleId}</p>}

          <label htmlFor="origin">Origin</label>
          <input id="origin" list="origin-sites" autoComplete="off" placeholder="Gebze Logistics Park" value={draft.origin} aria-invalid={!!errors.origin} aria-describedby={errors.origin ? 'origin-error' : 'origin-hint'} onChange={event => update('origin', event.target.value)} />
          <datalist id="origin-sites">{sites.map(site => <option key={site.id} value={site.name} />)}</datalist>
          {errors.origin ? <p id="origin-error" className="field-error" role="alert">{errors.origin}</p> : <p id="origin-hint" className="field-hint">{originSite ? `Verified demo site · ${originSite.coordinates.map(value => value.toFixed(4)).join(', ')}` : 'Free-text addresses are not accepted. Pick a demo site from the list.'}</p>}

          <label htmlFor="destination">Delivery point</label>
          <input id="destination" list="destination-sites" autoComplete="off" placeholder="Borusan Gebze Warehouse, Dock door 4" value={draft.destination} aria-invalid={!!errors.destination} aria-describedby={errors.destination ? 'destination-error' : 'destination-hint'} onChange={event => update('destination', event.target.value)} />
          <datalist id="destination-sites">{sites.map(site => <option key={site.id} value={site.name} />)}</datalist>
          {errors.destination ? <p id="destination-error" className="field-error" role="alert">{errors.destination}</p> : <p id="destination-hint" className="field-hint">{destinationSite ? `Verified demo site · ${destinationSite.coordinates.map(value => value.toFixed(4)).join(', ')}` : 'The dock is part of the site name. Example: Dock door 4.'}</p>}

          <label htmlFor="time">Planned arrival time</label>
          <input id="time" className="mono" type="time" step={60} value={draft.time} aria-invalid={!!errors.time} aria-describedby={errors.time ? 'time-error' : 'time-hint'} onChange={event => update('time', event.target.value)} />
          {errors.time ? <p id="time-error" className="field-error" role="alert">{errors.time}</p> : <p id="time-hint" className="field-hint">{eta ? (eta.nextDay ? `That time has passed today. Planned arrival is accepted as tomorrow ${eta.eta}.` : `Planned arrival is accepted as today ${eta.eta}.`) : 'Europe/Istanbul time. A past time is written as the next day.'}</p>}

          <label htmlFor="recipientName">Recipient company or person</label>
          <input id="recipientName" autoComplete="off" placeholder="Borusan Supply Unit" value={draft.recipientName} aria-invalid={!!errors.recipientName} aria-describedby={errors.recipientName ? 'recipientName-error' : undefined} onChange={event => update('recipientName', event.target.value)} />
          {errors.recipientName && <p id="recipientName-error" className="field-error" role="alert">{errors.recipientName}</p>}

          <label htmlFor="recipientPhone">Recipient phone</label>
          <input id="recipientPhone" className="mono" inputMode="tel" autoComplete="off" placeholder="+90 532 000 00 00" value={draft.recipientPhone} aria-invalid={!!errors.recipientPhone} aria-describedby={errors.recipientPhone ? 'recipientPhone-error' : undefined} onChange={event => update('recipientPhone', event.target.value)} />
          {errors.recipientPhone && <p id="recipientPhone-error" className="field-error" role="alert">{errors.recipientPhone}</p>}

          <label htmlFor="cargo">Cargo and delivery note <span>optional</span></label>
          <textarea id="cargo" rows={3} placeholder="12 pallets of auto parts · Note: IRS-9021" value={draft.cargo} aria-invalid={!!errors.cargo} aria-describedby={errors.cargo ? 'cargo-error' : undefined} onChange={event => update('cargo', event.target.value)} />
          {errors.cargo && <p id="cargo-error" className="field-error" role="alert">{errors.cargo}</p>}

          <p id={noteId} className="drawer-note">Assigning a task creates a customer tracking link. This is a demo: no SMS or app notification is sent to the driver; the record stays in this browser.</p>
          {formError && <p className="field-error" role="alert">{formError}</p>}
          <button type="submit" className="assign-button" disabled={idle.length === 0}>Assign task and send to driver</button>
          {idle.length === 0 && <p className="field-hint">No idle vehicle. A new task is not written over an active job.</p>}
        </form>
      </div>
    </div>
  );
}
