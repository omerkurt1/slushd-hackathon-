'use client';

import { useRef, useState } from 'react';
import { Check, Clock3, Copy, FileText, Pause, Phone, Play } from 'lucide-react';
import type { Vehicle } from './dispatcher';
import './operations.css';

export type Operation = { delayApproved: boolean; resolved: boolean; waitingSince: number; invoiceNote: string };
export const FREE_WAIT_SECONDS = 7200;
export function duration(seconds: number) {
  const value = Math.max(0, Math.floor(seconds));
  return [Math.floor(value / 3600), Math.floor(value / 60) % 60, value % 60].map(part => String(part).padStart(2, '0')).join(':');
}
export function delayedEta(eta: string, minutes: number) {
  const [hour, minute] = eta.split(':').map(Number);
  const total = hour * 60 + minute + minutes;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}${total >= 1440 ? ' (+1 day)' : ''}`;
}

export default function Operations({ vehicle, operation, now, report, part, onApprove, onResolve, onInvoice }: {
  vehicle: Vehicle; operation: Operation; now: number; part: 'message' | 'incident';
  report?: { title: string; transcript: string; delay: string } | null;
  onApprove: () => void; onResolve: () => void; onInvoice: (note: string) => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [length, setLength] = useState(0);
  const [message, setMessage] = useState('');
  const [fallbackLink, setFallbackLink] = useState('');
  const hasReport = vehicle.id === 'v1';
  const elapsed = operation.waitingSince && now ? Math.max(0, Math.floor((now - operation.waitingSince) / 1000)) : 0;
  const overLimit = elapsed >= FREE_WAIT_SECONDS;

  async function toggleAudio() {
    if (!audio.current) return;
    if (playing) audio.current.pause();
    else try { await audio.current.play(); setMessage(''); } catch { setMessage('Could not play the recording. Try again; the transcript is below.'); }
  }
  async function copyLink() {
    const url = new URL(`/track/${vehicle.taskId ?? vehicle.id}`, window.location.origin).href;
    try { await navigator.clipboard.writeText(url); setMessage('Demo tracking link copied.'); setFallbackLink(''); }
    catch { setFallbackLink(url); setMessage('Clipboard is unavailable. Copy the link below.'); }
  }

  if (part === 'message') return <>
    {hasReport && <section className="detail-section"><h3>DRIVER AUDIO</h3>
      <audio ref={audio} src="/audio/02_lastik_arizasi.wav" preload="metadata" onLoadedMetadata={event => setLength(event.currentTarget.duration)} onTimeUpdate={event => setSeconds(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setMessage('Sample recording failed to load. You can still read the transcript.')} />
      <div className="audio-controls"><button onClick={toggleAudio} aria-label={playing ? 'Pause recording' : 'Play recording'}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Pause' : 'Play'}</button><span className="mono">{duration(seconds).slice(3)} / {duration(length).slice(3)}</span><button aria-label="Playback speed" onClick={() => { const next = speed === 1 ? 1.2 : 1; setSpeed(next); if (audio.current) audio.current.playbackRate = next; }}>{speed.toFixed(1)}x</button></div>
      <p className="operation-caption">Synthetic demo recording · Not a real driver recording.</p>
      <h3 className="report-subtitle">MESSAGE SUMMARY <span>SAMPLE</span></h3>
      <blockquote>“There is a pile-up at the North Marmara exit. The road is blocked. We have been stopped for 40 minutes.”</blockquote>
      <p className="operation-caption">The message summary is prepared demo text.</p>
    </section>}
    {report?.transcript && <section className="detail-section" data-testid="driver-report"><h3 className="report-subtitle">DRIVER REPORT <span>DEMO</span></h3><blockquote>“{report.transcript}”</blockquote><p className="operation-caption">Speech was not transcribed in this browser. The text is the demo classification from the driver console.</p></section>}
    {!hasReport && !report?.transcript && <p className="operation-caption">No message on file for this vehicle.</p>}
  </>;

  return <>
    {vehicle.status === 'ramp' && <section className="detail-section"><h3>WAREHOUSE DWELL TIME</h3><div className={`waiting-counter ${overLimit ? 'over-limit' : ''}`}><span><Clock3 size={15} />At receiving · Dock door 4</span><strong className="mono" data-testid="waiting-time">{now ? duration(elapsed) : '—:—:—'}</strong><small>Free limit: <span className="mono">02:00:00</span></small><p>{overLimit ? `Free time exceeded · ${duration(elapsed - FREE_WAIT_SECONDS)}` : 'Receiving is still in progress.'}</p></div>
      <p className="operation-caption">Contact: Warehouse contact · Status: Dock entry queue</p>
      {overLimit && <button className="operation-button" disabled={!!operation.invoiceNote} onClick={() => onInvoice(`${vehicle.plate} · ${vehicle.destination} · Warehouse dwell time ${duration(elapsed)}. Free limit 02:00:00; overrun ${duration(elapsed - FREE_WAIT_SECONDS)}. Created: ${new Date(now).toLocaleString('en-GB', { timeZone: 'Europe/Istanbul' })}.`)}><FileText size={15} />{operation.invoiceNote ? 'Invoice note created' : 'Create invoice note'}</button>}
      {operation.invoiceNote && <div className="invoice-note"><strong>Invoice note draft</strong><p>{operation.invoiceNote}</p><small>Demo note; no invoice was issued.</small></div>}
    </section>}
    {hasReport && <dl className="incident-ticket"><div><dt>Incident</dt><dd>Traffic blockage</dd></div><div><dt>Expected deviation</dt><dd className="mono">+40 min</dd></div><div><dt>Priority</dt><dd>High</dd></div><div><dt>Latest status</dt><dd>{operation.resolved ? 'Done' : 'In progress'}</dd></div></dl>}
    {report?.title && <dl className="incident-ticket"><div><dt>Incident</dt><dd>{report.title}</dd></div><div><dt>Expected deviation</dt><dd className="mono">{report.delay}</dd></div><div><dt>Priority</dt><dd>High</dd></div></dl>}
    {!hasReport && !report?.title && vehicle.status !== 'ramp' && <p className="operation-caption">No open incident.</p>}
    <section className="detail-section incident-actions"><div className="operation-actions">
      {hasReport && <button className="operation-button" disabled={operation.delayApproved || operation.resolved} onClick={onApprove}><Clock3 size={15} />{operation.delayApproved ? 'Delay approved (+40 min)' : 'Approve delay (+40 min)'}</button>}
      <button className="operation-button" onClick={copyLink}><Copy size={15} />Copy customer tracking link</button>
      <a className="operation-button" href={`tel:${vehicle.phone.replace(/\s/g, '')}`}><Phone size={15} />Call driver</a>
      {hasReport && <button className="operation-button resolve-button" disabled={operation.resolved} onClick={onResolve}><Check size={15} />{operation.resolved ? 'Incident closed' : 'Mark incident resolved'}</button>}
    </div>
    {message && <p className="operation-message" role="status">{message}</p>}
    {fallbackLink && <input className="copy-fallback" aria-label="Tracking link" value={fallbackLink} readOnly onFocus={event => event.target.select()} />}
    </section>
  </>;
}
