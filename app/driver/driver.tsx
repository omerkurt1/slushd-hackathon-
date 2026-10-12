'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Car, ChevronRight, ClipboardList, Clock3, House, Mic, MoreHorizontal, Phone, Shield, TriangleAlert, Truck, Wrench } from 'lucide-react';
import { appendSignal, DRIVER_ID, FLEET_SNAPSHOT_KEY, parseSignalLog, readFleetCard, SIGNAL_KEY, type DriverSignal, type FleetCard, type TaskPhase } from './signals';
import './driver.css';

const DEPOT_PHONE = '+905320000000';
const MIN_HOLD_MS = 400;
const FALLBACK: FleetCard = { id: DRIVER_ID, plate: '34 LOG 101', driver: 'Ahmet Yılmaz', destination: 'Gebze Logistics Park', eta: '16:30', status: 'active', detail: 'On time' };

type Notice = { id: string; title: string; at: number; delayMinutes?: number };

function dockLabel(destination: string) {
  const match = destination.match(/Dock door\s*(\d+)/i);
  return match ? `Dock ${match[1]}` : null;
}
function plannedTime(eta: string) {
  return /^\d{2}:\d{2}/.test(eta) ? eta : null;
}
function formatWhen(at: number) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' }).format(new Date(at));
}
function phaseFrom(log: DriverSignal[]): TaskPhase {
  return log.reduce<TaskPhase>((phase, signal) => signal.type === 'delivered' ? 'DELIVERED' : signal.type === 'at_ramp' ? 'AT_RAMP' : phase, 'EN_ROUTE');
}
function noticeFrom(signal: DriverSignal): Notice {
  return { id: signal.id, title: signal.summary, at: signal.at, ...(signal.delayMinutes ? { delayMinutes: signal.delayMinutes } : {}) };
}

export default function DriverConsole() {
  const [vehicle, setVehicle] = useState<FleetCard>(FALLBACK);
  const [phase, setPhase] = useState<TaskPhase>('EN_ROUTE');
  const [isRecording, setIsRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [persistError, setPersistError] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [photo, setPhoto] = useState('');
  const [booted, setBooted] = useState(false);
  const mode = useRef<'idle' | 'recording' | 'processing'>('idle');
  const startedAt = useRef(0);
  const pointerDown = useRef(false);
  const ticker = useRef<number | null>(null);
  const finishTimer = useRef<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLButtonElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);
  const moreActionRef = useRef<HTMLButtonElement>(null);
  const stepButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setBooted(true);
    try { setVehicle(readFleetCard(DRIVER_ID) ?? FALLBACK); } catch { setVehicle(FALLBACK); }
    try {
      const mine = parseSignalLog(localStorage.getItem(SIGNAL_KEY)).filter(signal => signal.vehicleId === DRIVER_ID);
      setPhase(phaseFrom(mine));
      const latest = mine[mine.length - 1];
      if (latest) setNotice(noticeFrom(latest));
    } catch { /* The screen still opens on the current task. */ }
    const onStorage = (event: StorageEvent) => { if (event.key === FLEET_SNAPSHOT_KEY) setVehicle(readFleetCard(DRIVER_ID) ?? FALLBACK); };
    window.addEventListener('storage', onStorage);
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) navigator.serviceWorker.register('/driver-sw.js').catch(() => undefined);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!photoOpen && !moreOpen) return;
    const opener = moreOpen ? moreButtonRef.current : stepButtonRef.current;
    const focusTarget = moreOpen ? moreActionRef.current : cameraRef.current;
    focusTarget?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPhotoOpen(false);
      setMoreOpen(false);
      opener?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photoOpen, moreOpen]);

  useEffect(() => () => { if (ticker.current) window.clearInterval(ticker.current); if (finishTimer.current) window.clearTimeout(finishTimer.current); }, []);

  function publish(input: Omit<DriverSignal, 'id' | 'vehicleId' | 'at'>) {
    const signal: DriverSignal = { ...input, id: crypto.randomUUID(), vehicleId: DRIVER_ID, at: Date.now() };
    try {
      appendSignal(signal);
      setPersistError(false);
      setNotice(noticeFrom(signal));
    } catch { setPersistError(true); }
  }
  function stopTicker() {
    if (ticker.current) window.clearInterval(ticker.current);
    ticker.current = null;
  }
  function startRecording() {
    if (mode.current !== 'idle') return;
    mode.current = 'recording';
    startedAt.current = Date.now();
    setElapsed(0);
    setIsRecording(true);
    setProcessing(false);
    ticker.current = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 250);
  }
  function stopRecording(reason: 'complete' | 'cancel') {
    if (mode.current !== 'recording') return;
    const held = Date.now() - startedAt.current;
    stopTicker();
    setIsRecording(false);
    if (reason === 'cancel' || held < MIN_HOLD_MS) { mode.current = 'idle'; return; }
    mode.current = 'processing';
    setProcessing(true);
    if (finishTimer.current) window.clearTimeout(finishTimer.current);
    finishTimer.current = window.setTimeout(() => {
      if (mode.current !== 'processing') return;
      mode.current = 'idle';
      setProcessing(false);
      publish({ type: 'voice', summary: 'Traffic accident (+40 min delay)', detail: 'Traffic accident (+40 min delay)', delayMinutes: 40, transcript: 'There is an accident at the Kocaeli exit.' });
    }, 800);
  }
  function onPhoto(file: File | undefined) {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => { if (typeof reader.result === 'string') setPhoto(reader.result); };
    reader.readAsDataURL(file);
  }
  function closePhoto() {
    setPhotoOpen(false);
    stepButtonRef.current?.focus();
  }
  function confirmPhoto() {
    if (!photo) return;
    setPhase('DELIVERED');
    setPhotoOpen(false);
    publish({ type: 'delivered', summary: 'Delivered', detail: 'Delivery note received', location: vehicle.destination });
  }

  const hasTask = vehicle.destination !== 'Awaiting task';
  const dock = hasTask ? dockLabel(vehicle.destination) : null;
  const arrival = hasTask ? plannedTime(vehicle.eta) : null;
  const stage = !hasTask ? { label: 'Awaiting assignment', tone: 'idle' } : phase === 'DELIVERED' ? { label: 'Completed', tone: 'done' } : phase === 'AT_RAMP' ? { label: 'At receiving', tone: 'wait' } : { label: 'En route', tone: 'go' };
  const live = isRecording ? 'Recording' : processing ? 'Preparing sample report' : '';

  return <div className="driver-frame">
    <main className="driver-app" data-phase={phase} data-booted={booted ? 'yes' : 'no'}>
      <header className="driver-header">
        <div className="driver-identity">
          <span className="driver-mark" aria-hidden="true"><Truck size={20} /></span>
          <div><p className="driver-title">Driver</p><p className="driver-who">{vehicle.driver} · <span className="mono">{vehicle.plate}</span></p></div>
        </div>
        <p className="driver-demo">Demo</p>
      </header>

      <section className="driver-task" aria-label="Current task">
        <div className="driver-task-top">
          <div className="driver-task-copy">
            <p className={`driver-chip ${stage.tone === 'wait' ? 'driver-chip-wait' : stage.tone === 'idle' ? 'driver-chip-idle' : ''}`}><i />{stage.label}</p>
            <h1 className="driver-target" data-testid="driver-destination">{hasTask ? vehicle.destination : 'No active task'}</h1>
          </div>
          {hasTask && phase !== 'DELIVERED' && <a className="driver-call" href={`tel:${DEPOT_PHONE}`}><Phone size={18} />Call the warehouse</a>}
        </div>
        {(dock || arrival) && <p className="driver-meta">{dock && <span><House size={16} />{dock}</span>}{arrival && <span><Clock3 size={16} />Planned arrival {arrival}</span>}</p>}
        {phase === 'DELIVERED' && <p className="driver-note">The delivery note photo was confirmed on this device. The photo was not uploaded.</p>}
      </section>

      {notice && <section className="driver-card" aria-label="Last report" data-testid="last-notice" role="status">
        <p className="driver-kicker">Last report</p>
        <p className="driver-notice-title">{notice.title}</p>
        <p className="driver-note">{formatWhen(notice.at)} · Sample report saved in this browser{notice.delayMinutes ? ` · Demo example: +${notice.delayMinutes} min` : ''}</p>
      </section>}
      {persistError && <p className="driver-alert" role="alert">The report could not be saved in this browser.</p>}

      <section className="driver-speak" aria-label="Report status">
        <h2 className="driver-section-title">Report status</h2>
        <div className="driver-mic-wrap">
          <button type="button" className={`driver-mic ${isRecording ? 'is-recording' : ''} ${processing ? 'is-processing' : ''}`} aria-label="Hold to speak" aria-pressed={isRecording} onContextMenu={event => event.preventDefault()} onPointerDown={event => { event.preventDefault(); pointerDown.current = true; try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture is optional. */ } startRecording(); }} onPointerUp={event => { pointerDown.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); stopRecording('complete'); }} onPointerCancel={() => { pointerDown.current = false; stopRecording('cancel'); }} onBlur={() => { if (pointerDown.current) return; stopRecording('cancel'); }} onKeyDown={event => { if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return; event.preventDefault(); startRecording(); }} onKeyUp={event => { if (event.key !== ' ' && event.key !== 'Enter') return; event.preventDefault(); stopRecording('complete'); }}><Mic size={36} /></button>
          <p className="driver-caption">Hold to speak</p>
          <p className="driver-note driver-safety"><Shield size={15} />Use only when safely stopped</p>
          <p className="driver-timer" aria-hidden="true">{isRecording ? `Recording ${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}` : processing ? 'Preparing sample report' : ''}</p>
        </div>
      </section>
      <p className="driver-sr" data-testid="record-state" aria-live="polite">{live}</p>

      <section className="driver-block" aria-label="Quick reports">
        <h2 className="driver-block-title">Quick reports</h2>
        <div className="driver-grid">
          <button type="button" className="driver-choice" onClick={() => publish({ type: 'traffic', summary: 'Traffic', detail: 'Traffic congestion' })}><span className="driver-well driver-well-amber" aria-hidden="true"><Car size={22} /></span>Traffic</button>
          <button type="button" className="driver-choice" onClick={() => publish({ type: 'breakdown', summary: 'Breakdown', detail: 'Urgent technical support' })}><span className="driver-well driver-well-slate" aria-hidden="true"><Wrench size={22} /></span>Breakdown</button>
          <button type="button" className="driver-choice" onClick={() => publish({ type: 'gate', summary: 'Waiting at the dock', detail: 'Dock entry queue' })}><span className="driver-well driver-well-sage" aria-hidden="true"><Clock3 size={22} /></span>Waiting at the dock</button>
          <button ref={moreButtonRef} type="button" className="driver-choice" aria-expanded={moreOpen} aria-controls="more-panel" onClick={() => setMoreOpen(true)}><span className="driver-well driver-well-neutral" aria-hidden="true"><MoreHorizontal size={22} /></span>More<ChevronRight size={18} className="driver-chevron" /></button>
        </div>
      </section>

      <section className="driver-block" aria-label="Task step">
        <h2 className="driver-block-title">Task step</h2>
        {phase === 'EN_ROUTE' && hasTask && <button ref={stepButtonRef} type="button" className="driver-step" onClick={() => { setPhase('AT_RAMP'); publish({ type: 'at_ramp', summary: "I'm at receiving", detail: 'Waiting at receiving', location: vehicle.destination }); }}><span className="driver-well driver-well-mint" aria-hidden="true"><ClipboardList size={22} /></span>I'm at receiving</button>}
        {phase === 'AT_RAMP' && <button ref={stepButtonRef} type="button" className="driver-step" onClick={() => { setPhoto(''); setPhotoOpen(true); }}><span className="driver-well driver-well-mint" aria-hidden="true"><ClipboardList size={22} /></span>Delivered<ChevronRight size={18} className="driver-chevron" /></button>}
        {phase === 'DELIVERED' && <p className="driver-note">Task completed. The delivery was written to the operations record in this browser.</p>}
        {!hasTask && <p className="driver-note">There is no next task step for this vehicle.</p>}
      </section>

      <button type="button" className="driver-emergency" onClick={() => publish({ type: 'crash', summary: 'Emergency / Accident', detail: '+30 min delay', delayMinutes: 30 })}><TriangleAlert size={22} />Emergency / Accident</button>
      <p className="driver-footnote">Demo: no real voice recording</p>

      {moreOpen && <section id="more-panel" className="driver-sheet" role="dialog" aria-modal="true" aria-labelledby="more-title">
        <h2 id="more-title" className="driver-target">More</h2>
        <p className="driver-note">Scale and customs are one report in this record.</p>
        <button ref={moreActionRef} type="button" onClick={() => { setMoreOpen(false); moreButtonRef.current?.focus(); publish({ type: 'customs', summary: 'Scale / customs', detail: 'Waiting at scale or customs' }); }}>Scale / customs</button>
        <button type="button" onClick={() => { setMoreOpen(false); moreButtonRef.current?.focus(); }}>Cancel</button>
      </section>}

      {photoOpen && <section className="driver-modal" role="dialog" aria-modal="true" aria-labelledby="photo-title">
        <h2 id="photo-title" className="driver-target">Delivery note photo</h2>
        <p className="driver-note">One photo is enough. You do not need to type. The photo is not uploaded.</p>
        <input ref={fileRef} className="driver-file" type="file" accept="image/*" capture="environment" aria-hidden="true" tabIndex={-1} onChange={event => onPhoto(event.target.files?.[0])} />
        <button ref={cameraRef} type="button" className="driver-step" onClick={() => fileRef.current?.click()}><Camera size={22} />Open camera</button>
        {photo && <img className="driver-preview" alt="Delivery note preview" src={photo} />}
        <button type="button" className="driver-step" disabled={!photo} onClick={confirmPhoto}>Confirm delivery note</button>
        <button type="button" className="driver-choice" onClick={() => { setPhoto(''); if (fileRef.current) fileRef.current.value = ''; }}>Retake</button>
        <button type="button" className="driver-choice" onClick={closePhoto}>Cancel</button>
      </section>}
    </main>
  </div>;
}
