import { Garden, Borough, Jurisdiction } from '../types';
import { SEED_GARDENS } from '../data/seedGardens';
import { applyCuratedOverrides } from '../data/curatedGardenOverrides';

const GREENTHUMB_GARDENS_ENDPOINT = 'https://data.cityofnewyork.us/resource/p78i-pat6.json';
const GREENTHUMB_LOTS_ENDPOINT = 'https://data.cityofnewyork.us/resource/fsjc-9fyh.json';
const MAP_PLUTO_ENDPOINT = 'https://data.cityofnewyork.us/resource/64uk-42ks.json';

interface SocrataGardenItem {
  parksid?: string;
  gardenname?: string;
  address?: string;
  borough?: string;
  communityboard?: string;
  coundist?: string;
  juris?: string;
  status?: string;
  zipcode?: string;
  bbl?: string;
  lat?: string;
  lon?: string;
}

interface SocrataLotItem {
  parksid?: string;
  lotsize?: string;
}

export class NycOpenDataService {
  private gardensCache: Garden[] = [];
  private lastSyncTime: string | null = null;

  constructor() {
    this.gardensCache = [...SEED_GARDENS];
    this.lastSyncTime = new Date().toISOString();
  }

  public async fetchLiveGardens(options?: { skipMapPluto?: boolean }): Promise<Garden[]> {
    try {
      console.log('Fetching live NYC Open Data community gardens dataset (p78i-pat6)...');
      
      const [gardensRes, lotsRes] = await Promise.all([
        fetch(`${GREENTHUMB_GARDENS_ENDPOINT}?$limit=2000`, { headers: { 'Accept': 'application/json' } }),
        fetch(`${GREENTHUMB_LOTS_ENDPOINT}?$limit=2000`, { headers: { 'Accept': 'application/json' } })
      ]);

      if (!gardensRes.ok) {
        throw new Error(`NYC Open Data GreenThumb API HTTP Error ${gardensRes.status}`);
      }

      const rawItems: SocrataGardenItem[] = await gardensRes.json();
      let rawLots: SocrataLotItem[] = [];
      if (lotsRes.ok) {
        rawLots = await lotsRes.json();
      }

      if (!Array.isArray(rawItems) || rawItems.length === 0) {
        console.warn('NYC Open Data returned empty or invalid response. Utilizing seed data.');
        return this.gardensCache;
      }

      // Map lot sizes indexed by parksid
      const lotSizeMap = new Map<string, number>();
      if (Array.isArray(rawLots)) {
        rawLots.forEach(lot => {
          if (lot.parksid && lot.lotsize) {
            const sz = parseFloat(lot.lotsize);
            if (!isNaN(sz) && sz > 0) {
              lotSizeMap.set(lot.parksid, (lotSizeMap.get(lot.parksid) || 0) + sz);
            }
          }
        });
      }

      const mappedGardens: Garden[] = rawItems.map((item, index) => {
        const borough = parseBorough(item.borough);
        const name = item.gardenname || `NYC Community Garden #${index + 1}`;
        const address = item.address || 'NYC Street Lot';
        const zipCode = item.zipcode || '10001';
        
        const cbRaw = item.communityboard || '101';
        const cbNum = cbRaw.slice(-2);
        const communityBoard = `${borough} CB ${parseInt(cbNum, 10) || 1}`;
        const councilDistrict = parseInt(item.coundist || '1', 10) || 1;
        
        // Clean BBL (Borough-Block-Lot string)
        const rawBbl = item.bbl ? item.bbl.split('.')[0] : '';
        const boroughCodeMap: Record<Borough, string> = {
          'Manhattan': '1', 'Bronx': '2', 'Brooklyn': '3', 'Queens': '4', 'Staten Island': '5'
        };
        const bCode = boroughCodeMap[borough];
        
        let block = 100;
        let lot = 1;
        let bbl = rawBbl;

        if (rawBbl.length === 10) {
          block = parseInt(rawBbl.slice(1, 6), 10) || 100;
          lot = parseInt(rawBbl.slice(6, 10), 10) || 1;
        } else {
          bbl = `${bCode}001000001`;
        }

        const sizeSqFt = item.parksid && lotSizeMap.has(item.parksid)
          ? lotSizeMap.get(item.parksid)!
          : (borough === 'Manhattan' ? 3500 : borough === 'Brooklyn' ? 5000 : 6000);

        const jurisdiction = parseJurisdiction(item.juris);
        const greenThumbStatus = parseGreenThumbStatus(item.status);

        // Standard NYC density zoning defaults based on borough
        const landUseZoning = borough === 'Manhattan' ? 'R7-2' : borough === 'Brooklyn' ? 'R6' : borough === 'Bronx' ? 'R5' : 'R4';
        const maxFAR = borough === 'Manhattan' ? 3.44 : borough === 'Brooklyn' ? 2.43 : borough === 'Bronx' ? 1.65 : 1.25;
        const builtFAR = 0.05;
        const airRightsUnused = Math.max(0, maxFAR - builtFAR);

        const lat = parseFloat(item.lat || '0');
        const lng = parseFloat(item.lon || '0');

        const id = item.parksid || `GARDEN-${borough.slice(0, 1)}-${index + 1}`;

        return {
          id,
          propID: item.parksid,
          name,
          address,
          borough,
          zipCode,
          communityBoard,
          councilDistrict,
          block,
          lot,
          bbl,
          sizeSqFt,
          jurisdiction,
          greenThumbStatus,
          landUseZoning,
          maxFAR,
          builtFAR,
          airRightsUnused,
          latitude: isNaN(lat) || lat === 0 ? getBoroughDefaultLat(borough) : lat,
          longitude: isNaN(lng) || lng === 0 ? getBoroughDefaultLng(borough) : lng,
          lastUpdated: new Date().toISOString()
        };
      });

      const enrichedGardens = options?.skipMapPluto
        ? mappedGardens
        : await enrichGardensWithMapPluto(mappedGardens);

      // Seed rows first, then live Open Data, then hand-verified overlays for priority gardens.
      this.gardensCache = applyCuratedOverrides(mergeGardens(SEED_GARDENS, enrichedGardens));
      this.lastSyncTime = new Date().toISOString();
      console.log(`Successfully synced ${this.gardensCache.length} NYC community gardens from NYC Open Data.`);
      return this.gardensCache;
    } catch (err) {
      console.error('Error fetching live NYC Open Data:', err);
      return this.gardensCache; // Fallback to seed
    }
  }

  public getCachedGardens(): Garden[] {
    return this.gardensCache;
  }

  public getLastSyncTime(): string {
    return this.lastSyncTime || new Date().toISOString();
  }
}

interface SocrataPlutoItem {
  bbl?: string;
  zonedist1?: string;
  builtfar?: string;
  residfar?: string;
  commfar?: string;
  facilfar?: string;
  lotarea?: string;
  latitude?: string;
  longitude?: string;
}

async function enrichGardensWithMapPluto(gardens: Garden[]): Promise<Garden[]> {
  const bbls = [...new Set(gardens.map((g) => g.bbl).filter((bbl) => /^\d{10}$/.test(bbl)))];
  const plutoByBbl = new Map<string, SocrataPlutoItem>();
  const chunkSize = 40;

  for (let i = 0; i < bbls.length; i += chunkSize) {
    const chunk = bbls.slice(i, i + chunkSize);
    try {
      const where = `bbl in(${chunk.join(',')})`;
      const url = `${MAP_PLUTO_ENDPOINT}?$limit=${chunkSize}&$select=bbl,zonedist1,builtfar,residfar,commfar,facilfar,lotarea,latitude,longitude&$where=${encodeURIComponent(where)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) continue;
      const rows: SocrataPlutoItem[] = await res.json();
      if (!Array.isArray(rows)) continue;
      rows.forEach((row) => {
        const key = (row.bbl || '').split('.')[0];
        if (key) plutoByBbl.set(key, row);
      });
    } catch (err) {
      console.warn('MapPLUTO chunk failed:', err);
    }
  }

  console.log(`Matched ${plutoByBbl.size} gardens to MapPLUTO zoning and Floor Area Ratio records.`);

  return gardens.map((garden) => {
    const pluto = plutoByBbl.get(garden.bbl);
    if (!pluto) return garden;

    const builtFAR = parseFloat(pluto.builtfar || '0') || 0;
    const residFAR = parseFloat(pluto.residfar || '0') || 0;
    const commFAR = parseFloat(pluto.commfar || '0') || 0;
    const facilFAR = parseFloat(pluto.facilfar || '0') || 0;
    const maxFAR = Math.max(residFAR, commFAR, facilFAR, garden.maxFAR);
    const lotArea = parseFloat(pluto.lotarea || '0') || 0;
    const lat = parseFloat(pluto.latitude || '0');
    const lng = parseFloat(pluto.longitude || '0');

    return {
      ...garden,
      landUseZoning: pluto.zonedist1 || garden.landUseZoning,
      builtFAR,
      maxFAR,
      airRightsUnused: Math.max(0, maxFAR - builtFAR),
      sizeSqFt: lotArea > 0 ? lotArea : garden.sizeSqFt,
      latitude: !isNaN(lat) && lat !== 0 ? lat : garden.latitude,
      longitude: !isNaN(lng) && lng !== 0 ? lng : garden.longitude
    };
  });
}

function parseBorough(rawBorough?: string): Borough {
  if (!rawBorough) return 'Manhattan';
  const b = rawBorough.trim().toUpperCase();
  if (b.startsWith('M') || b.includes('MANHATTAN')) return 'Manhattan';
  if (b.startsWith('B') && !b.includes('BRONX') || b.includes('BROOKLYN')) return 'Brooklyn';
  if (b.includes('BRONX') || b === 'X') return 'Bronx';
  if (b.includes('QUEENS') || b === 'Q') return 'Queens';
  if (b.includes('STATEN') || b === 'R') return 'Staten Island';
  return 'Manhattan';
}

function parseJurisdiction(rawJur?: string): Jurisdiction {
  if (!rawJur) return 'NYC Parks / GreenThumb';
  const j = rawJur.trim().toUpperCase();
  if (j === 'DPR' || j.includes('PARK') || j.includes('GREENTHUMB')) return 'NYC Parks / GreenThumb';
  if (j === 'PRI' || j.includes('PRIVATE') || j.includes('PVT')) return 'Private Owner';
  if (j === 'NYCHA') return 'NYCHA (Housing Authority)';
  if (j === 'HPD' || j.includes('HOUSING PRESERVATION')) return 'HPD (Housing Preservation & Dev)';
  if (j === 'NYRP' || j === 'BQLT' || j === 'BLT' || j === 'MLT' || j === 'BANG' || j.includes('TPL') || j.includes('TRUST')) return 'Trust for Public Land';
  if (j === 'DOT' || j === 'DOE' || j === 'MTA' || j === 'DEP' || j === 'DCAS' || j.includes('AGENCY')) return 'DOT / City Agency';
  return 'Unknown / Unlicensed';
}

function parseGreenThumbStatus(rawStatus?: string): 'Active' | 'Inactive' | 'Pending License' | 'Non-GreenThumb' {
  if (!rawStatus) return 'Active';
  const s = rawStatus.toUpperCase();
  if (s.includes('ACTIVE') || s.includes('LICENSED')) return 'Active';
  if (s.includes('PENDING')) return 'Pending License';
  if (s.includes('INACTIVE')) return 'Inactive';
  return 'Non-GreenThumb';
}

function constructBBL(borough: Borough, block: number, lot: number): string {
  const boroughCodeMap: Record<Borough, string> = {
    'Manhattan': '1',
    'Bronx': '2',
    'Brooklyn': '3',
    'Queens': '4',
    'Staten Island': '5'
  };
  const bCode = boroughCodeMap[borough];
  const blockPadded = String(block).padStart(5, '0');
  const lotPadded = String(lot).padStart(4, '0');
  return `${bCode}${blockPadded}${lotPadded}`;
}

function getBoroughDefaultLat(borough: Borough): number {
  switch (borough) {
    case 'Manhattan': return 40.7831;
    case 'Brooklyn': return 40.6782;
    case 'Queens': return 40.7282;
    case 'Bronx': return 40.8448;
    case 'Staten Island': return 40.5795;
  }
}

function getBoroughDefaultLng(borough: Borough): number {
  switch (borough) {
    case 'Manhattan': return -73.9712;
    case 'Brooklyn': return -73.9442;
    case 'Queens': return -73.7949;
    case 'Bronx': return -73.8648;
    case 'Staten Island': return -74.1502;
  }
}

function mergeGardens(seeds: Garden[], fetched: Garden[]): Garden[] {
  const gardenMap = new Map<string, Garden>();
  
  // First insert seeds (high detailed metadata)
  seeds.forEach(g => gardenMap.set(g.id, g));

  // Merge/add fetched
  fetched.forEach(f => {
    if (!gardenMap.has(f.id)) {
      gardenMap.set(f.id, f);
    }
  });

  return Array.from(gardenMap.values());
}
