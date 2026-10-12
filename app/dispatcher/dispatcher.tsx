'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUpRight, ChevronRight, Clock3, MapPin, Navigation, Plus, Radio, Search, ShieldAlert, Truck, UserRound, X } from 'lucide-react';
import Operations, { delayedEta, type Operation } from './operations';
import TaskDrawer from './task-drawer';
import { applyAssignment, parseAssignment, type Assignment, type AssignmentInput } from './assignment';

export type Status = 'emergency' | 'ramp' | 'active' | 'idle';
export type Vehicle = {
  id: string; plate: string; driver: string; phone: string; status: Status;
  origin: string; destination: string; location: string; speed: number;
  coordinates: [number, number]; destinationCoordinates?: [number, number]; eta: string; detail: string; cargo: string;
  taskId?: string; recipientName?: string; recipientPhone?: string;
};

const initialVehicles: Vehicle[] = [
  { id: 'v1', plate: '34 LOG 101', driver: 'Ahmet Yılmaz', phone: '+90 532 000 01 01', status: 'emergency', origin: 'Hadımköy Dağıtım Merkezi', destination: 'Gebze Lojistik Köyü', location: 'Kuzey Marmara Otoyolu · Çekmeköy', speed: 0, coordinates: [41.1004, 29.2731], eta: '16:30', detail: '+40 dk gecikme', cargo: '12 palet otomotiv parçası' },
  { id: 'v2', plate: '41 LOG 204', driver: 'Mehmet Demir', phone: '+90 532 000 02 04', status: 'ramp', origin: 'Tuzla Transfer Merkezi', destination: 'Borusan Gebze Depo · Peron No: 4', location: 'Gebze · Kocaeli', speed: 0, coordinates: [40.8235, 29.4384], eta: '14:45', detail: 'Mal kabulde bekliyor', cargo: '8 palet endüstriyel ekipman' },
  { id: 'v3', plate: '34 LOG 308', driver: 'Elif Kaya', phone: '+90 532 000 03 08', status: 'active', origin: 'İkitelli Depo', destination: 'Dudullu Dağıtım Merkezi', location: 'TEM Otoyolu · Ümraniye', speed: 68, coordinates: [41.0372, 29.1244], eta: '15:50', detail: 'Zamanında', cargo: '16 palet ambalaj malzemesi' },
  { id: 'v4', plate: '16 LOG 412', driver: 'Mustafa Çelik', phone: '+90 532 000 04 12', status: 'active', origin: 'Bursa Organize Sanayi', destination: 'Dilovası Transfer Merkezi', location: 'Osmangazi Köprüsü · Dilovası', speed: 74, coordinates: [40.7519, 29.5169], eta: '16:10', detail: 'Zamanında', cargo: '10 palet tekstil ürünü' },
  { id: 'v5', plate: '34 LOG 505', driver: 'Can Özkan', phone: '+90 532 000 05 05', status: 'idle', origin: 'Tuzla Filo Parkı', destination: 'Görev bekleniyor', location: 'Tuzla · İstanbul', speed: 0, coordinates: [40.8763, 29.3421], eta: '—', detail: 'Görev bekliyor', cargo: 'Araç boş' },
];
const statuses: Record<Status, { label: string; short: string }> = {
  emergency: { label: 'Olay / Kriz', short: 'Acil' }, ramp: { label: 'Mal kabul', short: 'Mal kabul' },
  active: { label: 'Yolda', short: 'Yolda' }, idle: { label: 'Boşta', short: 'Boşta' },
};
const priority: Record<Status, number> = { emergency: 0, ramp: 1, active: 2, idle: 3 };
type FleetOperation = Operation & { assignment?: Assignment };
const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
const FleetMap = dynamic(() => import('./fleet-map'), { ssr: false, loading: () => <div className="map-loading" role="status">Harita yükleniyor…</div> });

export default function Dispatcher() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [operations, setOperations] = useState<Record<string, FleetOperation>>({});
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [persistError, setPersistError] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetVehicleId, setPresetVehicleId] = useState('');
  const [routeFit, setRouteFit] = useState({ token: 0, vehicleId: '' });
  const assignLock = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const started = Date.now();
    const defaults: Record<string, FleetOperation> = Object.fromEntries(initialVehicles.map(v => [v.id, { delayApproved: false, resolved: false, waitingSince: v.status === 'ramp' ? started - 6495 * 1000 : 0, invoiceNote: '' }]));
    try {
      const saved = JSON.parse(localStorage.getItem('slushd-operations-v1') ?? 'null');
      for (const id of Object.keys(defaults)) {
        const entry = saved?.[id];
        if (!entry || typeof entry.delayApproved !== 'boolean' || typeof entry.resolved !== 'boolean' || !Number.isFinite(entry.waitingSince) || entry.waitingSince < 0 || entry.waitingSince > started || typeof entry.invoiceNote !== 'string') continue;
        const assignment = parseAssignment(entry.assignment);
        defaults[id] = { delayApproved: entry.delayApproved, resolved: entry.resolved, waitingSince: entry.waitingSince, invoiceNote: entry.invoiceNote, ...(assignment ? { assignment } : {}) };
      }
    } catch { /* An unavailable or invalid store falls back to the demo. */ }
    setOperations(defaults);
    setVehicles(initialVehicles.map(v => {
      const saved = defaults[v.id];
      const next = { ...v, eta: saved.delayApproved ? delayedEta(v.eta, 40) : v.eta, status: saved.resolved && v.status === 'emergency' ? 'active' as const : v.status, detail: saved.resolved ? 'Olay çözüldü' : v.detail };
      return saved.assignment && v.status === 'idle' ? applyAssignment(next, saved.assignment) : next;
    }));
    setNow(started); setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('slushd-operations-v1', JSON.stringify(operations));
      localStorage.setItem('slushd-tracking-v1', JSON.stringify(vehicles.filter(v => v.status !== 'idle').map(v => ({ id: v.taskId ?? v.id, plate: v.plate, eta: v.eta, location: v.location, destination: v.destination, status: statuses[v.status].label, detail: v.detail }))));
      setPersistError(false);
    } catch { setPersistError(true); }
  }, [ready, operations, vehicles]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('v1');
  const [focusRequest, setFocusRequest] = useState(0);
  const [showMap, setShowMap] = useState(false);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 901px)');
    const update = () => setShowMap(media.matches);
    update(); media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [query, setQuery] = useState('');
  const [clock, setClock] = useState('—:—:—');
  useEffect(() => {
    const update = () => setClock(new Intl.DateTimeFormat('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date()));
    update(); const timer = setInterval(update, 1000); return () => clearInterval(timer);
  }, []);
  const selected = vehicles.find(vehicle => vehicle.id === selectedVehicleId)!;
  const selectedOperation = operations[selected.id];
  const firstIncident = vehicles.find(v => v.status === 'emergency');
  function approveDelay() {
    if (!selectedOperation || selectedOperation.delayApproved || selectedOperation.resolved) return;
    setOperations(current => ({ ...current, [selected.id]: { ...current[selected.id], delayApproved: true } }));
    setVehicles(current => current.map(v => v.id === selected.id ? { ...v, eta: delayedEta(initialVehicles.find(item => item.id === v.id)!.eta, 40), detail: 'Gecikme onaylandı' } : v));
  }
  function resolveIncident() {
    if (!selectedOperation || selectedOperation.resolved) return;
    setOperations(current => ({ ...current, [selected.id]: { ...current[selected.id], resolved: true } }));
    setVehicles(current => current.map(v => v.id === selected.id ? { ...v, status: 'active', detail: 'Olay çözüldü' } : v));
  }
  const counts = Object.fromEntries(Object.keys(statuses).map(status => [status, vehicles.filter(v => v.status === status).length])) as Record<Status, number>;
  const matches = vehicles.filter(vehicle => normalize(vehicle.plate).includes(normalize(query)));
  const visible = vehicles.filter(vehicle => (filter === 'all' || vehicle.status === filter) && matches.includes(vehicle)).sort((a, b) => priority[a.status] - priority[b.status]);
  const selectVehicle = (id: string) => { setSelectedVehicleId(id); setFocusRequest(request => request + 1); };
  function openTaskDrawer(vehicleId: string, opener: HTMLElement) {
    assignLock.current = false;
    openerRef.current = opener;
    setPresetVehicleId(vehicleId);
    setDrawerOpen(true);
  }
  function closeTaskDrawer() {
    setDrawerOpen(false);
    const opener = openerRef.current;
    requestAnimationFrame(() => opener?.focus());
  }
  function assignTask(input: AssignmentInput) {
    if (assignLock.current) return false;
    const vehicle = vehicles.find(item => item.id === input.vehicleId);
    if (!vehicle || vehicle.status !== 'idle') return false;
    assignLock.current = true;
    const assignment: Assignment = { taskId: `tsk_${crypto.randomUUID()}`, origin: input.origin, originCoordinates: input.originCoordinates, destination: input.destination, destinationCoordinates: input.destinationCoordinates, eta: input.eta, recipientName: input.recipientName, recipientPhone: input.recipientPhone, cargo: input.cargo };
    setVehicles(current => current.map(item => item.id === vehicle.id && item.status === 'idle' ? applyAssignment(item, assignment) : item));
    setOperations(current => ({ ...current, [input.vehicleId]: { ...(current[input.vehicleId] ?? { delayApproved: false, resolved: false, waitingSince: 0, invoiceNote: '' }), assignment } }));
    setSelectedVehicleId(input.vehicleId);
    setFocusRequest(request => request + 1);
    setRouteFit(current => ({ token: current.token + 1, vehicleId: input.vehicleId }));
    setFilter('all');
    setQuery('');
    setDrawerOpen(false);
    return true;
  }

  return (
    <main className="console-shell">
      <header className="topbar">
        <a className="brand" href="/dispatcher" aria-label="Slushd operasyon merkezi"><span className="brand-icon"><Truck size={21} /></span><span>SLUSHD<span className="brand-divider">/</span><span className="brand-sub">Operasyon</span></span></a>
        <div className="top-summary" aria-label="Filo özeti"><span>Toplam <b className="mono">{vehicles.length}</b></span>{(['active', 'ramp', 'emergency', 'idle'] as Status[]).map(status => <span key={status}><i className={`dot ${status}`} />{statuses[status].label} <b className="mono">{counts[status]}</b></span>)}</div>
        <div className="operator"><span className="avatar">OK</span><span>Operasyon ekibi<small>Marmara bölgesi</small></span></div>
      </header>

      <section className="workspace-bar">
        <div><div className="eyebrow">FİLO YÖNETİMİ</div><h1>Operasyon merkezi</h1></div>
        <div className="workspace-actions"><div className="clock"><Clock3 size={15} /><time className="mono">{clock}</time><span>TR</span></div><span className="demo-label"><Radio size={13} />Demo veri</span><button className="primary-button" disabled={!ready} onClick={event => openTaskDrawer('', event.currentTarget)}><Plus size={16} />Yeni görev ata</button></div>
      </section>

      <div className="workspace-grid">
        <aside className="fleet-panel" aria-label="Filo araç listesi">
          <div className="panel-heading"><h2>Filo görünümü <span className="count">{vehicles.length}</span></h2><span className="muted text-xs">Önceliğe göre <ArrowDown size={12} /></span></div>
          <form className="search" onSubmit={event => { event.preventDefault(); if (matches[0]) { selectVehicle(matches[0].id); setFilter('all'); } }}><Search size={16} /><input aria-label="Plaka ara" placeholder="Plaka ara · 34 LOG 101" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Aramayı temizle" onClick={() => setQuery('')}><X size={14} /></button>}</form>
          <div className="filter-tabs" role="group" aria-label="Araç durum filtresi">{(['all', 'emergency', 'ramp', 'active', 'idle'] as const).map(status => <button key={status} className={filter === status ? 'filter active-filter' : 'filter'} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === 'all' ? 'Tümü' : statuses[status].short}<span>{status === 'all' ? vehicles.length : counts[status]}</span></button>)}</div>
          <div className="fleet-list">{visible.map(vehicle => <button key={vehicle.id} className={`vehicle-card ${selectedVehicleId === vehicle.id ? 'selected' : ''}`} aria-pressed={selectedVehicleId === vehicle.id} onClick={() => selectVehicle(vehicle.id)}><div className="card-top"><span className={`vehicle-icon ${vehicle.status}`}><Truck size={18} /></span><strong className="mono">{vehicle.plate}</strong><ChevronRight size={15} className="card-chevron" /></div><div className="driver">{vehicle.driver}</div><div className="card-location"><MapPin size={13} /><span>{vehicle.location}</span></div><div className="card-bottom"><span className={`badge ${vehicle.status}`}><i className={`dot ${vehicle.status}`} />{vehicle.detail}</span><span className="eta mono">{vehicle.status === 'idle' ? '—' : vehicle.eta}</span></div></button>)}{visible.length === 0 && <div className="empty-state"><Search size={24} /><strong>Araç bulunamadı</strong><p>Plakayı veya durum filtresini değiştirin.</p><button onClick={() => { setFilter('all'); setQuery(''); }}>Filtreleri temizle</button></div>}</div>
          <div className="panel-footer"><span className="mono">{visible.length} / {vehicles.length}</span> araç gösteriliyor<span>Örnek filo</span></div>
        </aside>

        <section className="map-panel" aria-label="Harita alanı">
          <div className="panel-heading"><h2><Navigation size={15} />Operasyon sahası</h2><span className="region-label">MARMARA</span></div>
          {showMap && <FleetMap vehicles={vehicles} selected={selected} focusRequest={focusRequest} routeFitRequest={routeFit.token} routeFitVehicleId={routeFit.vehicleId} onSelect={id => { selectVehicle(id); setFilter('all'); setQuery(''); }} />}
          <div className="map-legend">{(Object.keys(statuses) as Status[]).map(status => <span key={status}><i className={`dot ${status}`} />{statuses[status].label}</span>)}</div>
          <div className="map-note"><ShieldAlert size={16} /><div><strong>Operasyon önceliği</strong><span>{counts.emergency ? `${counts.emergency} araç için olay bildirimi bulunuyor.` : 'Açık olay bildirimi bulunmuyor.'}</span></div>{firstIncident && <button onClick={() => { setFilter('emergency'); setQuery(''); selectVehicle(firstIncident.id); }}>İncele <ArrowUpRight size={14} /></button>}</div>
        </section>

        <aside className="detail-panel" aria-label="Araç detayı">
          <div className="panel-heading"><h2>Araç detayı</h2><span className="muted text-xs">SEÇİLİ ARAÇ</span></div>
          <div className="detail-scroll" key={selected.id}>
            <div className="vehicle-profile"><span className={`badge ${selected.status}`}><i className={`dot ${selected.status}`} />{statuses[selected.status].label}</span><h2 className="mono" data-testid="selected-plate">{selected.plate}</h2><p>Çekici + yarı römork <span>·</span> Marmara filosu</p></div>
            <div className="driver-profile"><span className="avatar"><UserRound size={20} /></span><div><strong>{selected.driver}</strong><span className="mono">{selected.phone}</span></div><span className="driver-label">SÜRÜCÜ</span></div>
            <div className="telemetry"><div><span>Anlık hız</span><strong className="mono">{selected.speed}<small>km/sa</small></strong></div><div><span>Hedef varış</span><strong className="mono">{selected.eta}</strong></div></div>
            {ready && selected.status !== 'idle' && <Operations vehicle={selected} operation={selectedOperation} now={now} onApprove={approveDelay} onResolve={resolveIncident} onInvoice={note => setOperations(current => ({ ...current, [selected.id]: { ...current[selected.id], invoiceNote: current[selected.id].invoiceNote || note } }))} />}
            <section className="detail-section"><h3>GÜZERGAH BİLGİSİ</h3><div className="route"><div><span className="route-dot" /><small>ÇIKIŞ NOKTASI</small><strong>{selected.origin}</strong></div><div><span className="route-square" /><small>TESLİMAT NOKTASI</small><strong>{selected.destination}</strong></div></div><div className="location-box"><MapPin size={15} /><div><strong>{selected.location}</strong><span className="mono">{selected.coordinates.map(c => c.toFixed(4)).join(', ')}</span></div></div></section>
            <section className="detail-section"><h3>YÜK BİLGİSİ</h3><p className="cargo"><Truck size={15} />{selected.cargo}</p></section>
            {selected.taskId && <section className="detail-section"><h3>GÖREV KAYDI</h3><p className="cargo">Takip kaydı <span className="mono">{selected.taskId}</span></p>{selected.recipientName && <p className="cargo">Alıcı: {selected.recipientName}{selected.recipientPhone ? <span className="mono"> · {selected.recipientPhone}</span> : null}</p>}<p className="operation-caption">Demo kaydıdır. Sürücüye gerçek bildirim gönderilmedi.</p></section>}
            {selected.status === 'idle' && <section className="detail-section"><h3>OPERASYON DURUMU</h3><div className="status-note"><strong>Yeni göreve hazır</strong><p>Bu araç şu anda aktif bir göreve sahip değil.</p><button className="secondary-button" disabled={!ready} onClick={event => openTaskDrawer(selected.id, event.currentTarget)}><Plus size={15} />Bu araca görev ata</button></div></section>}
          </div>
        </aside>
      </div>
      <TaskDrawer open={drawerOpen} vehicles={vehicles} presetVehicleId={presetVehicleId} now={now} onClose={closeTaskDrawer} onAssign={assignTask} />
      <footer className="statusbar"><span><i className="dot idle" />Simülasyon ortamı · Canlı GPS bağlantısı yok</span>{persistError && <span role="status">Kayıt bu tarayıcıda saklanamadı. Yenilemede görev kaybolur.</span>}<span>Faz 04<span className="footer-divider">|</span>SLUSHD Dispatcher <span className="mono">v0.4</span></span></footer>
    </main>
  );
}
