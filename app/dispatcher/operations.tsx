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
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}${total >= 1440 ? ' (+1 gün)' : ''}`;
}

export default function Operations({ vehicle, operation, now, onApprove, onResolve, onInvoice }: {
  vehicle: Vehicle; operation: Operation; now: number;
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
    else try { await audio.current.play(); setMessage(''); } catch { setMessage('Ses oynatılamadı. Yeniden deneyin; transkript aşağıda.'); }
  }
  async function copyLink() {
    const url = new URL(`/track/${vehicle.taskId ?? vehicle.id}`, window.location.origin).href;
    try { await navigator.clipboard.writeText(url); setMessage('Demo takip bağlantısı kopyalandı.'); setFallbackLink(''); }
    catch { setFallbackLink(url); setMessage('Panoya erişilemedi. Bağlantıyı aşağıdan kopyalayın.'); }
  }

  return <>
    {hasReport && <section className="detail-section operation-report"><h3>SÜRÜCÜ SES KAYDI</h3>
      <audio ref={audio} src="/audio/driver-report-demo.wav" preload="metadata" onLoadedMetadata={event => setLength(event.currentTarget.duration)} onTimeUpdate={event => setSeconds(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setMessage('Örnek ses kaydı yüklenemedi. Transkripti kullanabilirsiniz.')} />
      <div className="audio-controls"><button onClick={toggleAudio} aria-label={playing ? 'Ses kaydını duraklat' : 'Ses kaydını oynat'}>{playing ? <Pause size={15} /> : <Play size={15} />}{playing ? 'Duraklat' : 'Oynat'}</button><span className="mono">{duration(seconds).slice(3)} / {duration(length).slice(3)}</span><button aria-label="Oynatma hızı" onClick={() => { const next = speed === 1 ? 1.2 : 1; setSpeed(next); if (audio.current) audio.current.playbackRate = next; }}>{speed.toFixed(1)}x</button></div>
      <p className="operation-caption">Sentetik demo kayıt · Gerçek sürücü kaydı değildir.</p>
      <h3 className="report-subtitle">MESAJ ÖZETİ <span>ÖRNEK</span></h3>
      <blockquote>“Kuzey Marmara çıkışında zincirleme kaza var, yol tıkandı, 40 dakika durduk.”</blockquote>
      <dl className="incident-ticket"><div><dt>Olay</dt><dd>Trafik tıkanıklığı</dd></div><div><dt>Öngörülen sapma</dt><dd className="mono">+40 dk</dd></div><div><dt>Öncelik</dt><dd>Yüksek</dd></div><div><dt>Son durum</dt><dd>{operation.resolved ? 'Bitti' : 'Devam ediyor'}</dd></div></dl>
      <p className="operation-caption">Mesaj özeti önceden hazırlanmış demo metnidir.</p>
    </section>}
    {vehicle.status === 'ramp' && <section className="detail-section"><h3>DEPO BEKLEME SÜRESİ</h3><div className={`waiting-counter ${overLimit ? 'over-limit' : ''}`}><span><Clock3 size={15} />Mal kabuldeyim · Peron No: 4</span><strong className="mono" data-testid="waiting-time">{now ? duration(elapsed) : '—:—:—'}</strong><small>Ücretsiz limit: <span className="mono">02:00:00</span></small><p>{overLimit ? `Ücretsiz süre aşıldı · ${duration(elapsed - FREE_WAIT_SECONDS)}` : 'Mal kabul işlemi bekleniyor.'}</p></div>
      <p className="operation-caption">İrtibat: Depo yetkilisi · Durum: Depo giriş sırası</p>
      {overLimit && <button className="operation-button" disabled={!!operation.invoiceNote} onClick={() => onInvoice(`${vehicle.plate} · ${vehicle.destination} · Depo bekleme süresi ${duration(elapsed)}. Ücretsiz limit 02:00:00; aşım ${duration(elapsed - FREE_WAIT_SECONDS)}. Oluşturma: ${new Date(now).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}.`)}><FileText size={15} />{operation.invoiceNote ? 'Fatura notu oluşturuldu' : 'Fatura notu oluştur'}</button>}
      {operation.invoiceNote && <div className="invoice-note"><strong>Fatura notu taslağı</strong><p>{operation.invoiceNote}</p><small>Demo notudur; fatura düzenlenmedi.</small></div>}
    </section>}
    <section className="detail-section"><h3>HIZLI AKSİYONLAR</h3><div className="operation-actions">
      {hasReport && <button className="operation-button" disabled={operation.delayApproved || operation.resolved} onClick={onApprove}><Clock3 size={15} />{operation.delayApproved ? 'Gecikme onaylandı (+40 dk)' : 'Gecikmeyi onayla (+40 dk)'}</button>}
      <button className="operation-button" onClick={copyLink}><Copy size={15} />Müşteri takip linkini kopyala</button>
      <a className="operation-button" href={`tel:${vehicle.phone.replace(/\s/g, '')}`}><Phone size={15} />Sürücüye çağrı başlat</a>
      {hasReport && <button className="operation-button resolve-button" disabled={operation.resolved} onClick={onResolve}><Check size={15} />{operation.resolved ? 'Olay çözüldü' : 'Olayı çözüldü olarak kapat'}</button>}
    </div><p className="operation-caption">Takip, bu tarayıcıdaki demo veriyi gösterir. Çağrı düğmesi telefon uygulamasını açar.</p>
    {message && <p className="operation-message" role="status">{message}</p>}
    {fallbackLink && <input className="copy-fallback" aria-label="Takip bağlantısı" value={fallbackLink} readOnly onFocus={event => event.target.select()} />}
    </section>
  </>;
}
