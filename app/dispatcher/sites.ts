export type Site = { id: string; name: string; coordinates: [number, number] };

// Coordinates already used by the demo fleet and /api/route trips.
// Free text is not geocoded and is not mapped onto these points.
export const sites: Site[] = [
  { id: 'tuzla-park', name: 'Tuzla Filo Parkı', coordinates: [40.8763, 29.3421] },
  { id: 'gebze-village', name: 'Gebze Lojistik Köyü', coordinates: [40.854, 29.433] },
  { id: 'borusan', name: 'Borusan Gebze Depo, Peron No: 4', coordinates: [40.8242, 29.442] },
  { id: 'dudullu', name: 'Dudullu Dağıtım Merkezi', coordinates: [41.008, 29.163] },
  { id: 'dilovasi', name: 'Dilovası Transfer Merkezi', coordinates: [40.793, 29.545] },
  { id: 'cekmekoy', name: 'Kuzey Marmara Otoyolu · Çekmeköy', coordinates: [41.1004, 29.2731] },
];

export function findSite(name: string) {
  const value = name.trim().toLocaleLowerCase('tr-TR');
  return sites.find(site => site.name.toLocaleLowerCase('tr-TR') === value);
}
