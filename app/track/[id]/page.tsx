'use client';

import { useEffect, useState } from 'react';

type Tracking = { id: string; plate: string; eta: string; location: string; destination: string; status: string; detail: string };

export default function TrackingPage() {
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const id = window.location.pathname.split('/').filter(Boolean).pop();
    const refresh = () => {
      try {
        const records: unknown = JSON.parse(localStorage.getItem('slushd-tracking-v1') ?? '[]');
        const record = Array.isArray(records) ? records.find(item => item?.id === id) : null;
        setTracking(record && ['id', 'plate', 'eta', 'location', 'destination', 'status', 'detail'].every(key => typeof record[key] === 'string') ? record : null);
      } catch { setTracking(null); }
      setLoaded(true);
    };
    refresh(); window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);
  return <main style={{ maxWidth: 560, margin: '40px auto', padding: 24 }}>
    <div className="eyebrow">SLUSHD · DEMO GÖNDERİ TAKİBİ</div><h1>Gönderi durumu</h1>
    <p style={{ color: '#64748b', lineHeight: 1.8, margin: '16px 0' }}>Bu yerel demo yalnızca operasyon konsoluyla aynı tarayıcıdaki verileri gösterir. Canlı GPS veya müşteriye açık bir servis değildir.</p>
    {!loaded ? <p role="status">Yükleniyor…</p> : !tracking ? <p role="status">Bu tarayıcıda bu gönderiye ait veri bulunamadı.</p> : <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: 24 }}><h2 className="mono" style={{ fontSize: 24 }}>{tracking.plate}</h2><dl style={{ lineHeight: 2.2 }}><dt>Durum</dt><dd>{tracking.status} · {tracking.detail}</dd><dt>Hedef varış</dt><dd className="mono">{tracking.eta}</dd><dt>Teslimat noktası</dt><dd>{tracking.destination}</dd><dt>Son örnek konum</dt><dd>{tracking.location}</dd></dl></section>}
  </main>;
}
