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
    <div className="eyebrow">SLUSHD · DEMO SHIPMENT TRACKING</div><h1>Shipment status</h1>
    <p style={{ color: '#64748b', lineHeight: 1.8, margin: '16px 0' }}>This local demo only shows data written by the operations console in the same browser. It is not live GPS or a public customer service.</p>
    {!loaded ? <p role="status">Loading…</p> : !tracking ? <p role="status">No data for this shipment was found in this browser.</p> : <section style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 6, padding: 24 }}><h2 className="mono" style={{ fontSize: 24 }}>{tracking.plate}</h2><dl style={{ lineHeight: 2.2 }}><dt>Status</dt><dd>{tracking.status} · {tracking.detail}</dd><dt>Planned arrival</dt><dd className="mono">{tracking.eta}</dd><dt>Delivery point</dt><dd>{tracking.destination}</dd><dt>Last sample location</dt><dd>{tracking.location}</dd></dl></section>}
  </main>;
}
