export type Site = { id: string; name: string; coordinates: [number, number] };

// Coordinates already used by the demo fleet and /api/route trips.
// Free text is not geocoded and is not mapped onto these points.
export const sites: Site[] = [
  { id: 'tuzla-park', name: 'Tuzla Fleet Yard', coordinates: [40.8763, 29.3421] },
  { id: 'gebze-village', name: 'Gebze Logistics Park', coordinates: [40.854, 29.433] },
  { id: 'borusan', name: 'Borusan Gebze Warehouse, Dock door 4', coordinates: [40.8242, 29.442] },
  { id: 'dudullu', name: 'Dudullu Distribution Center', coordinates: [41.008, 29.163] },
  { id: 'dilovasi', name: 'Dilovasi Transfer Center', coordinates: [40.793, 29.545] },
  { id: 'cekmekoy', name: 'North Marmara Motorway · Cekmekoy', coordinates: [41.1004, 29.2731] },
];

export function findSite(name: string) {
  const value = name.trim().toLocaleLowerCase('en-US');
  return sites.find(site => site.name.toLocaleLowerCase('en-US') === value);
}
