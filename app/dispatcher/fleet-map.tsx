'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Crosshair, Expand, Route, Truck } from 'lucide-react';
import { divIcon, latLngBounds } from 'leaflet';
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Vehicle, Status } from './dispatcher';
import 'leaflet/dist/leaflet.css';
import './map.css';

type Point = [number, number];
type Props = { vehicles: Vehicle[]; selected: Vehicle; focusRequest: number; routeFitRequest: number; routeFitVehicleId: string; onSelect: (id: string) => void };

type RoadRoute = { points: Point[]; distance: number; duration: number; snappedDistance: number };
const labels: Record<Status, string> = { emergency: 'Acil', ramp: 'Mal kabul', active: 'Yolda', idle: 'Boşta' };
const truckSvg = renderToStaticMarkup(<Truck size={18} strokeWidth={1.8} aria-hidden="true" />);
const markerIcons = Object.fromEntries((Object.keys(labels) as Status[]).map(status => [status,
  divIcon({ className: `fleet-marker ${status}`, html: `<span class="marker-halo"></span><span class="marker-truck">${truckSvg}</span>`, iconSize: [34, 34], iconAnchor: [17, 17], tooltipAnchor: [0, -22] }),
])) as Record<Status, ReturnType<typeof divIcon>>;

function MapControls({ vehicles, selected, focusRequest, route, routeFitRequest, routeFitVehicleId }: Props & { route: Point[] }) {
  const map = useMap();
  const fitted = useRef(0);
  const animate = () => !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [latitude, longitude] = selected.coordinates;
  useEffect(() => {
    if (focusRequest > 0) map.flyTo([latitude, longitude], 15, { animate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches, duration: .8 });
  }, [map, latitude, longitude, focusRequest]);
  useEffect(() => {
    if (!routeFitRequest || routeFitRequest === fitted.current || selected.id !== routeFitVehicleId || route.length < 2) return;
    fitted.current = routeFitRequest;
    map.flyToBounds(latLngBounds(route), { paddingTopLeft: [70, 64], paddingBottomRight: [70, 120], maxZoom: 15, animate: animate(), duration: .8 });
  }, [map, route, routeFitRequest, routeFitVehicleId, selected.id]);
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map]);
  return <div className="map-controls" onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    <button type="button" onClick={() => map.flyToBounds(latLngBounds(vehicles.map(v => v.coordinates)), { paddingTopLeft: [70, 64], paddingBottomRight: [70, 120], maxZoom: 12, animate: animate(), duration: .8 })}><Expand size={14} />Tüm filo</button>
    <button type="button" onClick={() => map.flyTo(selected.coordinates, 15, { animate: animate(), duration: .8 })}><Crosshair size={14} />Araca odaklan</button>
    <button type="button" disabled={route.length < 2} onClick={() => map.flyToBounds(latLngBounds(route), { paddingTopLeft: [70, 64], paddingBottomRight: [70, 120], maxZoom: 15, animate: animate(), duration: .8 })}><Route size={14} />Rotayı göster</button>
  </div>;
}

export default function FleetMap(props: Props) {
  const { vehicles, selected, onSelect } = props;
  const [tileError, setTileError] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const [road, setRoad] = useState<{ id: string; data?: RoadRoute; error?: string } | null>(null);
  const routeKey = selected.status === 'idle' ? '' : selected.destinationCoordinates ? `c:${selected.coordinates.join(',')};${selected.destinationCoordinates.join(',')}` : `v:${selected.id}`;
  useEffect(() => {
    if (!routeKey) return;
    const controller = new AbortController();
    setRoad(null);
    const coordinates = routeKey.startsWith('c:') ? routeKey.slice(2).split(';') : null;
    const query = coordinates ? `from=${encodeURIComponent(coordinates[0])}&to=${encodeURIComponent(coordinates[1])}` : `vehicle=${encodeURIComponent(routeKey.slice(2))}`;
    fetch(`/api/route?${query}`, { signal: controller.signal })
      .then(async response => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Rota hesaplanamadı.');
        if (!controller.signal.aborted) setRoad({ id: routeKey, data });
      })
      .catch(error => { if (!controller.signal.aborted) setRoad({ id: routeKey, error: error instanceof Error ? error.message : 'Rota hesaplanamadı.' }); });
    return () => controller.abort();
  }, [routeKey]);
  const bounds = useMemo(() => latLngBounds(vehicles.map(vehicle => vehicle.coordinates)), [vehicles]);
  const currentRoad = road?.id === routeKey && selected.status !== 'idle' ? road : null;
  const route = currentRoad?.data?.points ?? [];
  const mapSelected = route.length ? { ...selected, coordinates: route[0] } : selected;
  return <div className="fleet-map-wrapper">
    <MapContainer bounds={bounds} boundsOptions={{ paddingTopLeft: [70, 64], paddingBottomRight: [70, 120] }} className="fleet-map" minZoom={4} maxZoom={19} zoomControl={false}>
      <TileLayer key={tileAttempt} url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" attribution={'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'} eventHandlers={{ tileerror: () => setTileError(true) }} />
      <MapControls {...props} selected={mapSelected} route={route} />
      {route.length > 1 && <>
        <Polyline positions={route} smoothFactor={0} pathOptions={{ color: '#3478e5', weight: 5, opacity: .95, dashArray: '10 6', className: 'vehicle-route' }}><Tooltip>Yol ağı rotası · {selected.destination}</Tooltip></Polyline>
        <CircleMarker center={route[route.length - 1]} radius={6} pathOptions={{ color: '#3478e5', fillColor: '#fff', fillOpacity: 1, weight: 2 }}><Tooltip>Hedef: {selected.destination}</Tooltip></CircleMarker>
      </>}
      {vehicles.map(vehicle => <Marker key={`${vehicle.id}-${vehicle.status}`} position={vehicle.id === selected.id ? mapSelected.coordinates : vehicle.coordinates} icon={markerIcons[vehicle.status]} title={`${vehicle.plate} · ${labels[vehicle.status]}`} zIndexOffset={vehicle.id === selected.id ? 1000 : vehicle.status === 'emergency' ? 500 : 0} eventHandlers={{ click: () => onSelect(vehicle.id), keydown: event => { if (event.originalEvent.key === 'Enter' || event.originalEvent.key === ' ') { event.originalEvent.preventDefault(); event.originalEvent.stopPropagation(); onSelect(vehicle.id); } } }}>
        <Tooltip key={`${vehicle.id}-${vehicle.id === selected.id}`} permanent={vehicle.id === selected.id} direction="top" className="vehicle-tooltip"><span className="mono">{vehicle.plate}</span>{vehicle.id === selected.id && <span> · Seçili</span>}</Tooltip>
      </Marker>)}
    </MapContainer>
    {tileError && <div className="tile-error" role="status">Harita zemini yüklenemedi. Araç seçimi kullanılabilir.<button onClick={() => { setTileError(false); setTileAttempt(attempt => attempt + 1); }}>Yeniden dene</button></div>}
  </div>;
}
