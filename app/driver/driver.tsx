'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, Car, ClipboardList, Clock3, Mic, MoreHorizontal, Phone, TriangleAlert, Truck, Wrench } from 'lucide-react';
import { appendSignal, DRIVER_ID, FLEET_SNAPSHOT_KEY, parseSignalLog, readFleetCard, SIGNAL_KEY, type DriverSignal, type FleetCard, type TaskPhase } from './signals';
import './driver.css';

const DEPOT_PHONE = '+905320000000';
const MIN_HOLD_MS = 400;
const FALLBACK: FleetCard = { id: DRIVER_ID, plate: '34 LOG 101', driver: 'Ahmet Yılmaz', destination: 'Gebze Lojistik Köyü', eta: '16:30', status: 'active', detail: 'Zamanında' };

type Notice = { id: string; title: string; at: number; delayMinutes?: number };

function dockLabel(destination: string) {
  const match = destination.match(/Peron No:\s*(\d+)/i);
  return match ? `Peron ${match[1]}` : null;
}
function plannedTime(eta: string) {
  return /^\d{2}:\d{2}/.test(eta) ? eta : null;
}
function formatWhen(at: number) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' }).format(new Date(at));
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
      publish({ type: 'voice', summary: 'Trafik kazası (+40 dk gecikme)', detail: 'Trafik kazası (+40 dk gecikme)', delayMinutes: 40, transcript: 'Kocaeli çıkışında kaza var.' });
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
    publish({ type: 'delivered', summary: 'Teslim edildi', detail: 'İrsaliye alındı', location: vehicle.destination });
  }

  const hasTask = vehicle.destination !== 'Görev bekleniyor';
  const dock = hasTask ? dockLabel(vehicle.destination) : null;
  const arrival = hasTask ? plannedTime(vehicle.eta) : null;
  const stage = !hasTask ? { label: 'Görev bekleniyor', tone: 'idle' } : phase === 'DELIVERED' ? { label: 'Tamamlandı', tone: 'done' } : phase === 'AT_RAMP' ? { label: 'Mal kabulde', tone: 'wait' } : { label: 'Yolda', tone: 'go' };
  const live = isRecording ? 'Kayıt alınıyor' : processing ? 'Örnek bildirim hazırlanıyor' : '';

  return <div className="driver-frame">
    <main className="driver-app" data-phase={phase} data-booted={booted ? 'yes' : 'no'}>
      <header className="driver-header">
        <div className="driver-identity">
          <span className="driver-mark" aria-hidden="true"><Truck size={22} /></span>
          <div><p className="driver-kicker">Sürücü</p><p className="driver-who">{vehicle.driver} · <span className="mono">{vehicle.plate}</span></p></div>
        </div>
        <p className="driver-demo">Demo</p>
      </header>

      <section className="driver-card" aria-label="Güncel görev">
        <div className="driver-task-row">
          <div className="driver-task-copy">
            <p className={`driver-chip ${stage.tone === 'wait' ? 'driver-chip-wait' : stage.tone === 'idle' ? 'driver-chip-idle' : ''}`}>{stage.label}</p>
            <h1 className="driver-target" data-testid="driver-destination">{hasTask ? vehicle.destination : 'Açık görev yok'}</h1>
            {(dock || arrival) && <p className="driver-meta">{[dock, arrival ? `Planlanan varış ${arrival}` : null].filter(Boolean).join(' · ')}</p>}
            {phase === 'DELIVERED' && <p className="driver-note">İrsaliye fotoğrafı bu cihazda onaylandı. Fotoğraf sunucuya gönderilmedi.</p>}
          </div>
          {hasTask && phase !== 'DELIVERED' && <a className="driver-call" href={`tel:${DEPOT_PHONE}`}><Phone size={20} />Depoyu ara</a>}
        </div>
      </section>

      {notice && <section className="driver-card" aria-label="Son bildirim" data-testid="last-notice" role="status">
        <p className="driver-kicker">Son bildirim</p>
        <p className="driver-notice-title">{notice.title}</p>
        <p className="driver-note">{formatWhen(notice.at)} · Örnek bildirim bu tarayıcıda kaydedildi{notice.delayMinutes ? ` · Demo örneği: +${notice.delayMinutes} dk` : ''}</p>
      </section>}
      {persistError && <p className="driver-alert" role="alert">Bildirim bu tarayıcıda saklanamadı.</p>}

      <section className="driver-card" aria-label="Durum bildir">
        <h2 className="driver-section-title">Durum bildir</h2>
        <div className="driver-mic-wrap">
          <button type="button" className={`driver-mic ${isRecording ? 'is-recording' : ''} ${processing ? 'is-processing' : ''}`} aria-label="Basılı tut, durumu söyle" aria-pressed={isRecording} onContextMenu={event => event.preventDefault()} onPointerDown={event => { event.preventDefault(); pointerDown.current = true; try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* Capture is optional. */ } startRecording(); }} onPointerUp={event => { pointerDown.current = false; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); stopRecording('complete'); }} onPointerCancel={() => { pointerDown.current = false; stopRecording('cancel'); }} onBlur={() => { if (pointerDown.current) return; stopRecording('cancel'); }} onKeyDown={event => { if (event.repeat || (event.key !== ' ' && event.key !== 'Enter')) return; event.preventDefault(); startRecording(); }} onKeyUp={event => { if (event.key !== ' ' && event.key !== 'Enter') return; event.preventDefault(); stopRecording('complete'); }}><Mic size={40} /></button>
          <p className="driver-caption">Basılı tut, durumu söyle</p>
          <p className="driver-note">Yalnızca güvenli duruşta kullan</p>
          <p className="driver-timer" aria-hidden="true">{isRecording ? `Kayıt alınıyor ${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}` : processing ? 'Örnek bildirim hazırlanıyor' : ''}</p>
        </div>
      </section>
      <p className="driver-sr" data-testid="record-state" aria-live="polite">{live}</p>

      <section className="driver-block" aria-label="Hızlı bildirim">
        <h2 className="driver-block-title">Hızlı bildirim</h2>
        <div className="driver-grid">
          <button type="button" className="driver-choice" onClick={() => publish({ type: 'traffic', summary: 'Trafik', detail: 'Trafik yoğunluğu' })}><Car size={22} />Trafik</button>
          <button type="button" className="driver-choice" onClick={() => publish({ type: 'breakdown', summary: 'Arıza', detail: 'Acil teknik destek' })}><Wrench size={22} />Arıza</button>
          <button type="button" className="driver-choice" onClick={() => publish({ type: 'gate', summary: 'Depoda bekleme', detail: 'Depo giriş sırası' })}><Clock3 size={22} />Depoda bekleme</button>
          <button ref={moreButtonRef} type="button" className="driver-choice" aria-expanded={moreOpen} aria-controls="more-panel" onClick={() => setMoreOpen(true)}><MoreHorizontal size={22} />Diğer</button>
        </div>
      </section>

      <section className="driver-card" aria-label="Görev adımı">
        <h2 className="driver-block-title">Görev adımı</h2>
        {phase === 'EN_ROUTE' && hasTask && <button ref={stepButtonRef} type="button" className="driver-step" onClick={() => { setPhase('AT_RAMP'); publish({ type: 'at_ramp', summary: 'Mal kabuldeyim', detail: 'Mal kabulde bekliyor', location: vehicle.destination }); }}><ClipboardList size={22} />Mal kabuldeyim</button>}
        {phase === 'AT_RAMP' && <button ref={stepButtonRef} type="button" className="driver-step" onClick={() => { setPhoto(''); setPhotoOpen(true); }}><ClipboardList size={22} />Teslim ettim</button>}
        {phase === 'DELIVERED' && <p className="driver-note">Görev tamamlandı. Teslim bilgisi bu tarayıcıdaki operasyon kaydına yazıldı.</p>}
        {!hasTask && <p className="driver-note">Bu araç için sıradaki görev adımı yok.</p>}
      </section>

      <button type="button" className="driver-emergency" onClick={() => publish({ type: 'crash', summary: 'Acil durum / Kaza', detail: '+30 dk gecikme', delayMinutes: 30 })}><TriangleAlert size={22} />Acil durum / Kaza</button>
      <p className="driver-footnote">Demo: gerçek ses kaydı yok</p>

      {moreOpen && <section id="more-panel" className="driver-sheet" role="dialog" aria-modal="true" aria-labelledby="more-title">
        <h2 id="more-title" className="driver-target">Diğer</h2>
        <p className="driver-note">Kantar ve gümrük bu kayıtta tek bildirimdir.</p>
        <button ref={moreActionRef} type="button" onClick={() => { setMoreOpen(false); moreButtonRef.current?.focus(); publish({ type: 'customs', summary: 'Kantar / gümrük', detail: 'Kantar / gümrük bekleniyor' }); }}>Kantar / gümrük</button>
        <button type="button" onClick={() => { setMoreOpen(false); moreButtonRef.current?.focus(); }}>Vazgeç</button>
      </section>}

      {photoOpen && <section className="driver-modal" role="dialog" aria-modal="true" aria-labelledby="photo-title">
        <h2 id="photo-title" className="driver-target">İrsaliye fotoğrafı</h2>
        <p className="driver-note">Tek fotoğraf yeter. Yazı yazmanız gerekmez. Fotoğraf sunucuya gönderilmez.</p>
        <input ref={fileRef} className="driver-file" type="file" accept="image/*" capture="environment" aria-hidden="true" tabIndex={-1} onChange={event => onPhoto(event.target.files?.[0])} />
        <button ref={cameraRef} type="button" className="driver-step" onClick={() => fileRef.current?.click()}><Camera size={22} />Kamerayı aç</button>
        {photo && <img className="driver-preview" alt="İrsaliye önizlemesi" src={photo} />}
        <button type="button" className="driver-step" disabled={!photo} onClick={confirmPhoto}>İrsaliyeyi onayla</button>
        <button type="button" className="driver-choice" onClick={() => { setPhoto(''); if (fileRef.current) fileRef.current.value = ''; }}>Yeniden çek</button>
        <button type="button" className="driver-choice" onClick={closePhoto}>Vazgeç</button>
      </section>}
    </main>
  </div>;
}
