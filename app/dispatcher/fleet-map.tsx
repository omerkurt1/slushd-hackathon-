'use client';

import { useEffect, useMemo, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Crosshair, Expand, Route, Truck } from 'lucide-react';
import { divIcon, latLngBounds } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Vehicle, Status } from './dispatcher';
import 'leaflet/dist/leaflet.css';
import './map.css';

type Point = [number, number];
type Props = { vehicles: Vehicle[]; selected: Vehicle; focusRequest: number; onSelect: (id: string) => void };

// Illustrative waypoints, not road-routing or navigable directions.
const routeWaypoints: Record<string, Point[]> = {
  v1: [[41.1004, 29.2731], [41.087, 29.307], [41.051, 29.336], [40.998, 29.398], [40.938, 29.432], [40.854, 29.433]],
  v2: [[40.8235, 29.4384], [40.8242, 29.442]],
  v3: [[41.0372, 29.1244], [41.028, 29.136], [41.016, 29.149], [41.008, 29.163]],
  v4: [[40.7519, 29.5169], [40.768, 29.525], [40.782, 29.535], [40.793, 29.545]],
};
const labels: Record<Status, string> = { emergency: 'Acil', ramp: 'Mal kabul', active: 'Yolda', idle: 'Boşta' };
const truckSvg = renderToStaticMarkup(<Truck size={18} strokeWidth={1.8} aria-hidden="true" />);
const markerIcons = Object.fromEntries((Object.keys(labels) as Status[]).map(status => [status,
  divIcon({ className: `fleet-marker ${status}`, html: `<span class="marker-halo"></span><span class="marker-truck">${truckSvg}</span>`, iconSize: [34, 34], iconAnchor: [17, 17], tooltipAnchor: [0, -22] }),
])) as Record<Status, ReturnType<typeof divIcon>>;

function MapControls({ vehicles, selected, focusRequest, route }: Props & { route: Point[] }) {
  const map = useMap();
  const animate = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [latitude, longitude] = selected.coordinates;
  useEffect(() => {
    if (focusRequest > 0) map.flyTo([latitude, longitude], 15, { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, duration: .8 });
  }, [map, latitude, longitude, focusRequest]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return <div className="map-controls" onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    <button type="button" onClick={() => map.flyToBounds(latLngBounds(vehicles.map(v => v.coordinates)), { padding: [45, 65], maxZoom: 12, animate: animate(), duration: .8 })}><Expand size={14} />Tüm filo</button>
    <button type="button" onClick={() => map.flyTo(selected.coordinates, 15, { animate: animate(), duration: .8 })}><Crosshair size={14} />Araca odaklan</button>
    <button type="button" disabled={route.length < 2} onClick={() => map.flyToBounds(latLngBounds(route), { padding: [50, 75], maxZoom: 15, animate: animate(), duration: .8 })}><Route size={14} />Rotayı göster</button>
  </div>;
}

export default function FleetMap(props: Props) {
  const { vehicles, selected, onSelect } = props;
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const bounds = useMemo(() => latLngBounds(vehicles.map(vehicle => vehicle.coordinates)), [vehicles]);
  const route = selected.status === 'idle' ? [] : routeWaypoints[selected.id] ?? [];
  return <div className="fleet-map-wrapper">
    <MapContainer bounds={bounds} boundsOptions={{ padding: [45, 65] }} className="fleet-map" minZoom={4} maxZoom={19} zoomControl={false}>
      <TileLayer key={tileAttempt} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} eventHandlers={{ tileerror: () => setTileError(true) }} />
      <MapControls {...props} route={route} />
      {route.length > 1 && <>
        <Polyline positions={route} pathOptions={{ color: '#527594', weight: 4, opacity: .85, dashArray: '8 7', className: 'vehicle-route' }}><Tooltip>Temsili rota · {selected.destination}</Tooltip></Polyline>
        <CircleMarker center={route[route.length - 1]} radius={6} pathOptions={{ color: '#527594', fillColor: '#fff', fillOpacity: 1, weight: 2 }}><Tooltip>Hedef: {selected.destination}</Tooltip></CircleMarker>
      </>}
      {vehicles.map(vehicle => <Marker key={`${vehicle.id}-${vehicle.status}`} position={vehicle.coordinates} icon={markerIcons[vehicle.status]} title={`${vehicle.plate} · ${labels[vehicle.status]}`} zIndexOffset={vehicle.id === selected.id ? 1000 : vehicle.status === 'emergency' ? 500 : 0} eventHandlers={{ click: () => onSelect(vehicle.id), keydown: event => { if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') { event.originalEvent.preventDefault(); event.originalEvent.stopPropagation(); onSelect(vehicle.id); } } }}>
        <Tooltip key={`${vehicle.id}-${vehicle.id === selected.id}`} permanent={vehicle.id === selected.id} direction="top" className="vehicle-tooltip"><span className="mono">{vehicle.plate}</span>{vehicle.id === selected.id && <span> · Seçili</span>}</Tooltip>
      </Marker>)}
    </MapContainer>
    {tileError && <div className="tile-error" role="status">Harita zemini yüklenemedi. Araç seçimi kullanılabilir.<button onClick={() => { setTileError(false); setTileAttempt(attempt => attempt + 1); }}>Yeniden dene</button></div>}
    <div className="map-selection" aria-live="polite"><div className="selected-location"><i className={`dot ${selected.status}`} /><strong className="mono">{selected.plate}</strong><span className="mono">{selected.coordinates.map(c => c.toFixed(4)).join(' / ')}</span></div><p>{selected.status === 'idle' ? 'Görev bekliyor · Aktif rota yok' : 'Temsili rota · Navigasyon amaçlı değildir'}</p></div>
  </div>;
}
