'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpRight, MapPin, Plus, Search, ShieldAlert, Truck, UserRound, X } from 'lucide-react';
import Operations, { delayedEta, type Operation } from './operations';
import TaskDrawer from './task-drawer';
import { applyAssignment, parseAssignment, type Assignment, type AssignmentInput } from './assignment';
import { evolve, FLEET_SNAPSHOT_KEY, parseSignalLog, SIGNAL_KEY, type DriverSignal, type DriverState } from '../driver/signals';

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
type FleetOperation = Operation & { assignment?: Assignment; driverState?: DriverState; driverClearedAt?: number };
function projectDriver(vehicle: Vehicle, operation: FleetOperation): Vehicle {
  const state = operation.driverState;
  if (!state) return vehicle;
  const baseEta = initialVehicles.find(item => item.id === vehicle.id)?.eta ?? vehicle.eta;
  const canShift = /^\d{2}:\d{2}/.test(baseEta);
  const eta = operation.delayApproved && canShift ? delayedEta(baseEta, 40) : state.delayMinutes > 0 && canShift ? delayedEta(baseEta, state.delayMinutes) : vehicle.eta;
  return { ...vehicle, status: state.status, detail: state.detail, eta, speed: state.halted ? 0 : vehicle.speed, location: state.location ?? vehicle.location };
}
const normalize = (value: string) => value.toLocaleLowerCase('tr-TR').replace(/\s+/g, '');
const FleetMap = dynamic(() => import('./fleet-map'), { ssr: false, loading: () => <div className="map-loading" role="status">Harita yükleniyor…</div> });

export default function Dispatcher() {
  const [vehicles, setVehicles] = useState(initialVehicles);
  const [operations, setOperations] = useState<Record<string, FleetOperation>>({});
  const [now, setNow] = useState(0);
  const [ready, setReady] = useState(false);
  const [persistError, setPersistError] = useState(false);
  const operationsRef = useRef<Record<string, FleetOperation>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [presetVehicleId, setPresetVehicleId] = useState('');
  const [routeFit, setRouteFit] = useState({ token: 0, vehicleId: '' });
  const assignLock = useRef(false);
  const openerRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const started = Date.now();
    const defaults: Record<string, FleetOperation> = Object.fromEntries(initialVehicles.map(v => [v.id, { delayApproved: false, resolved: false, waitingSince: v.status === 'ramp' ? started - 6495 * 1000 : 0, invoiceNote: '', driverClearedAt: 0 }]));
    try {
      const saved = JSON.parse(localStorage.getItem('slushd-operations-v1') ?? 'null');
      for (const id of Object.keys(defaults)) {
        const entry = saved?.[id];
        if (!entry || typeof entry.delayApproved !== 'boolean' || typeof entry.resolved !== 'boolean' || !Number.isFinite(entry.waitingSince) || entry.waitingSince < 0 || entry.waitingSince > started || typeof entry.invoiceNote !== 'string') continue;
        const assignment = parseAssignment(entry.assignment);
        const driverClearedAt = typeof entry.driverClearedAt === 'number' && Number.isFinite(entry.driverClearedAt) && entry.driverClearedAt >= 0 && entry.driverClearedAt <= started ? entry.driverClearedAt : 0;
        defaults[id] = { delayApproved: entry.delayApproved, resolved: entry.resolved, waitingSince: entry.waitingSince, invoiceNote: entry.invoiceNote, driverClearedAt, ...(assignment ? { assignment } : {}) };
      }
    } catch { /* An unavailable or invalid store falls back to the demo. */ }
    try {
      const log = parseSignalLog(localStorage.getItem(SIGNAL_KEY));
      for (const id of Object.keys(defaults)) {
        const mine = log.filter(signal => signal.vehicleId === id && signal.at > (defaults[id].driverClearedAt ?? 0));
        if (!mine.length) continue;
        const driverState = mine.reduce<DriverState | undefined>((state, signal) => evolve(state, signal), undefined);
        if (!driverState) continue;
        const previousWait = defaults[id].waitingSince;
        const waitingSince = previousWait && driverState.waitingSince ? Math.min(previousWait, driverState.waitingSince) : driverState.waitingSince || previousWait;
        defaults[id] = { ...defaults[id], driverState, waitingSince, resolved: driverState.status === 'emergency' ? false : defaults[id].resolved };
      }
    } catch { /* A bad signal log leaves the fleet on its saved operation. */ }
    setOperations(defaults);
    setVehicles(initialVehicles.map(v => {
      const saved = defaults[v.id];
      const next = { ...v, eta: saved.delayApproved ? delayedEta(v.eta, 40) : v.eta, status: saved.resolved && v.status === 'emergency' ? 'active' as const : v.status, detail: saved.resolved ? 'Olay çözüldü' : v.detail };
      const assigned = saved.assignment && v.status === 'idle' ? applyAssignment(next, saved.assignment) : next;
      return saved.driverState ? projectDriver(assigned, saved) : assigned;
    }));
    const driven = Object.entries(defaults).find(([, operation]) => operation.driverState);
    if (driven?.[1].driverState) {
      const state = driven[1].driverState;
      setDetailTab(state.status === 'ramp' ? 'incident' : state.reportActive ? 'message' : state.status === 'emergency' ? 'incident' : 'driver');
    }
    setNow(started); setReady(true);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem('slushd-operations-v1', JSON.stringify(operations));
      localStorage.setItem(FLEET_SNAPSHOT_KEY, JSON.stringify(vehicles.map(v => ({ id: v.id, plate: v.plate, driver: v.driver, destination: v.destination, eta: v.eta, status: v.status, detail: v.detail }))));
      localStorage.setItem('slushd-tracking-v1', JSON.stringify(vehicles.filter(v => v.status !== 'idle').map(v => ({ id: v.taskId ?? v.id, plate: v.plate, eta: v.eta, location: v.location, destination: v.destination, status: operations[v.id]?.driverState?.delivered ? 'Teslim edildi' : statuses[v.status].label, detail: v.detail }))));
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
  const [fleetOpen, setFleetOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(true);
  const [detailTab, setDetailTab] = useState<'driver' | 'message' | 'incident' | 'route'>('driver');
  const [query, setQuery] = useState('');
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
    const clearedAt = Date.now();
    setOperations(current => ({ ...current, [selected.id]: { ...current[selected.id], resolved: true, driverClearedAt: clearedAt, driverState: undefined } }));
    setVehicles(current => current.map(v => v.id === selected.id ? { ...v, status: 'active', detail: 'Olay çözüldü' } : v));
  }
  function applyLive(signal: DriverSignal) {
    const current = operationsRef.current;
    const prev = current[signal.vehicleId];
    if (!prev || !initialVehicles.some(vehicle => vehicle.id === signal.vehicleId) || prev.driverState?.signalId === signal.id || signal.at <= (prev.driverClearedAt ?? 0)) return;
    const driverState = evolve(prev.driverState, signal);
    const waitingSince = signal.type === 'at_ramp' ? (prev.waitingSince || signal.at) : prev.waitingSince;
    const nextOp: FleetOperation = { ...prev, driverState, waitingSince, resolved: driverState.status === 'emergency' ? false : prev.resolved };
    operationsRef.current = { ...current, [signal.vehicleId]: nextOp };
    setOperations(operationsRef.current);
    setVehicles(items => items.map(vehicle => vehicle.id === signal.vehicleId ? projectDriver(vehicle, nextOp) : vehicle));
    setSelectedVehicleId(signal.vehicleId);
    setDetailTab(signal.type === 'voice' ? 'message' : signal.type === 'delivered' ? 'driver' : 'incident');
    setDetailOpen(true);
    setFleetOpen(true);
    setFilter('all');
    setQuery('');
    if (signal.type === 'voice') new Audio('/audio/02_lastik_arizasi.wav').play().catch(() => undefined);
  }
  const applyLiveRef = useRef(applyLive);
  applyLiveRef.current = applyLive;
  operationsRef.current = operations;
  useEffect(() => {
    if (!ready) return;
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SIGNAL_KEY || !event.newValue) return;
      const log = parseSignalLog(event.newValue);
      const latest = log[log.length - 1];
      if (latest) applyLiveRef.current(latest);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [ready]);
  const counts = Object.fromEntries(Object.keys(statuses).map(status => [status, vehicles.filter(v => v.status === status).length])) as Record<Status, number>;
  const matches = vehicles.filter(vehicle => normalize(vehicle.plate).includes(normalize(query)));
  const visible = vehicles.filter(vehicle => (filter === 'all' || vehicle.status === filter) && matches.includes(vehicle)).sort((a, b) => priority[a.status] - priority[b.status]);
  const selectVehicle = (id: string) => { setSelectedVehicleId(id); setFocusRequest(request => request + 1); setDetailOpen(true); };
  const fleetShown = fleetOpen || !showMap;
  const detailShown = detailOpen || !showMap;
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
        <h1>Operasyon merkezi</h1>
        <button className="primary-button" disabled={!ready} onClick={event => openTaskDrawer('', event.currentTarget)}><Plus size={16} />Yeni görev ata</button>
      </section>

      <div className="workspace-grid">
        <section className="map-panel" aria-label="Harita alanı">
          <div className="map-stage">
            {showMap && <FleetMap vehicles={vehicles} selected={selected} focusRequest={focusRequest} routeFitRequest={routeFit.token} routeFitVehicleId={routeFit.vehicleId} onSelect={id => { selectVehicle(id); setFilter('all'); setQuery(''); }} />}
            <div className="map-note"><ShieldAlert size={16} /><div><strong>Operasyon önceliği</strong><span>{counts.emergency ? `${counts.emergency} araç için olay bildirimi bulunuyor.` : 'Açık olay bildirimi bulunmuyor.'}</span></div>{firstIncident && <button onClick={() => { setFilter('emergency'); setQuery(''); selectVehicle(firstIncident.id); }}>İncele <ArrowUpRight size={14} /></button>}</div>
          </div>
        </section>

        <div className={`dock dock-fleet ${fleetShown ? 'is-open' : ''}`}>
          {fleetShown ? <aside id="fleet-dock" className="fleet-panel" aria-label="Filo araç listesi">
            <form className="search fleet-search" onSubmit={event => { event.preventDefault(); if (matches[0]) { selectVehicle(matches[0].id); setFilter('all'); } }}><Search size={16} /><input aria-label="Plaka ara" placeholder="Plaka ara · 34 LOG 101" value={query} onChange={event => setQuery(event.target.value)} />{query && <button type="button" aria-label="Aramayı temizle" onClick={() => setQuery('')}><X size={14} /></button>}</form>
            <div className="panel-heading"><h2>Filo görünümü <span className="count">{vehicles.length}</span></h2>{showMap && <button type="button" className="dock-toggle" aria-expanded="true" aria-controls="fleet-dock" onClick={() => setFleetOpen(false)}><X size={14} />Kapat</button>}</div>
            <div className="filter-tabs" role="group" aria-label="Araç durum filtresi">{(['all', 'emergency', 'ramp', 'active', 'idle'] as const).map(status => <button key={status} className={filter === status ? 'filter active-filter' : 'filter'} aria-pressed={filter === status} onClick={() => setFilter(status)}>{status === 'all' ? 'Tümü' : statuses[status].short}<span>{status === 'all' ? vehicles.length : counts[status]}</span></button>)}</div>
            <div className="fleet-list">{visible.map(vehicle => <button key={vehicle.id} className={`vehicle-card ${selectedVehicleId === vehicle.id ? 'selected' : ''}`} aria-pressed={selectedVehicleId === vehicle.id} onClick={() => selectVehicle(vehicle.id)}><span className={`vehicle-icon ${vehicle.status}`}><Truck size={16} /></span><span className="card-identity"><strong className="mono">{vehicle.plate}</strong><span className="driver">{vehicle.driver}</span></span><span className="card-location"><MapPin size={13} /><span>{vehicle.location}</span></span><span className={`badge ${vehicle.status}`}><i className={`dot ${vehicle.status}`} />{vehicle.detail}</span><span className="eta mono">{vehicle.status === 'idle' ? '—' : vehicle.eta}</span></button>)}{visible.length === 0 && <div className="empty-state"><Search size={24} /><strong>Araç bulunamadı</strong><p>Plakayı veya durum filtresini değiştirin.</p><button onClick={() => { setFilter('all'); setQuery(''); }}>Filtreleri temizle</button></div>}</div>
            <div className="panel-footer"><span className="mono">{visible.length} / {vehicles.length}</span> araç gösteriliyor<span>Örnek filo</span></div>
          </aside> : <button type="button" className="dock-toggle" aria-expanded="false" aria-controls="fleet-dock" onClick={() => setFleetOpen(true)}><Truck size={15} />Filo</button>}
        </div>

        <div className={`dock dock-detail ${detailShown ? 'is-open' : ''}`}>
          {detailShown ? <aside id="detail-dock" className="detail-panel" aria-label="Araç detayı">
          <div className="panel-heading"><h2>Araç detayı</h2>{showMap && <button type="button" className="dock-toggle" aria-expanded="true" aria-controls="detail-dock" onClick={() => setDetailOpen(false)}><X size={14} />Kapat</button>}</div>
          <div className="filter-tabs detail-tabs" role="tablist" aria-label="Araç detay sekmeleri">{(['driver', 'message', 'incident', 'route'] as const).map(tab => <button key={tab} type="button" role="tab" aria-selected={detailTab === tab} className={detailTab === tab ? 'filter active-filter' : 'filter'} onClick={() => setDetailTab(tab)}>{tab === 'driver' ? 'Sürücü' : tab === 'message' ? 'Mesaj' : tab === 'incident' ? 'Olay' : 'Yol'}</button>)}</div>
          <div className="detail-layout">
            {detailTab === 'driver' && <div className="detail-identity driver-tab" role="tabpanel">
              <h2 className="mono" data-testid="selected-plate">{selected.plate}</h2>
              <div className="driver-profile"><span className="avatar"><UserRound size={18} /></span><div><strong>{selected.driver}</strong><span className="mono">{selected.phone}</span></div></div>
            </div>}
            {detailTab === 'message' && <div role="tabpanel">{ready && selected.status !== 'idle' ? <Operations part="message" vehicle={selected} operation={selectedOperation} now={now} report={selectedOperation?.driverState?.reportActive ? { title: selectedOperation.driverState.reportTitle, transcript: selectedOperation.driverState.reportTranscript, delay: selectedOperation.driverState.delayMinutes ? `+${selectedOperation.driverState.delayMinutes} dk` : '—' } : null} onApprove={approveDelay} onResolve={resolveIncident} onInvoice={note => setOperations(current => ({ ...current, [selected.id]: { ...current[selected.id], invoiceNote: current[selected.id].invoiceNote || note } }))} /> : <p className="operation-caption">Bu araçta mesaj kaydı yok.</p>}</div>}
            {detailTab === 'incident' && <div role="tabpanel">{selected.status === 'idle' ? <section className="detail-section"><h3>OPERASYON DURUMU</h3><div className="status-note"><strong>Yeni göreve hazır</strong><p>Bu araç şu anda aktif bir göreve sahip değil.</p><button className="secondary-button" disabled={!ready} onClick={event => openTaskDrawer(selected.id, event.currentTarget)}><Plus size={15} />Bu araca görev ata</button></div></section> : ready && <Operations part="incident" vehicle={selected} operation={selectedOperation} now={now} report={selectedOperation?.driverState?.reportActive ? { title: selectedOperation.driverState.reportTitle, transcript: selectedOperation.driverState.reportTranscript, delay: selectedOperation.driverState.delayMinutes ? `+${selectedOperation.driverState.delayMinutes} dk` : '—' } : null} onApprove={approveDelay} onResolve={resolveIncident} onInvoice={note => setOperations(current => ({ ...current, [selected.id]: { ...current[selected.id], invoiceNote: current[selected.id].invoiceNote || note } }))} />}</div>}
            {detailTab === 'route' && <div role="tabpanel">
              <div className="telemetry"><div><span>Yük</span><strong className="cargo-summary">{selected.cargo}</strong></div><div><span>Hedef varış</span><strong className="mono">{selected.eta}</strong></div></div>
              <section className="detail-section"><h3>GÜZERGAH BİLGİSİ</h3><div className="route"><div><span className="route-dot" /><small>ÇIKIŞ NOKTASI</small><strong>{selected.origin}</strong></div><div><span className="route-square" /><small>TESLİMAT NOKTASI</small><strong>{selected.destination}</strong></div></div><div className="location-box"><MapPin size={15} /><div><strong>{selected.location}</strong><span className="mono">{selected.coordinates.map(c => c.toFixed(4)).join(', ')}</span></div></div></section>
            </div>}
          </div>
        </aside> : <button type="button" className="dock-toggle" aria-expanded="false" aria-controls="detail-dock" onClick={() => setDetailOpen(true)}><UserRound size={15} />Detay</button>}
        </div>
      </div>
      <TaskDrawer open={drawerOpen} vehicles={vehicles} presetVehicleId={presetVehicleId} now={now} onClose={closeTaskDrawer} onAssign={assignTask} />
      <footer className="statusbar"><span><i className="dot idle" />Simülasyon ortamı · Canlı GPS bağlantısı yok</span>{persistError && <span role="status">Kayıt bu tarayıcıda saklanamadı. Yenilemede görev kaybolur.</span>}<span>Faz 04<span className="footer-divider">|</span>SLUSHD Dispatcher <span className="mono">v0.4</span></span></footer>
    </main>
  );
}
