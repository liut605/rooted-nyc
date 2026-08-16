import { Garden, GardenResilienceScore, ResilienceLevel } from '../types';
import { NycOpenDataService } from './nycOpenData';
import { calculateGardenResilience } from './resilienceEngine';
import { gardenShowsPhotoPin } from '../data/gardensWithVisuals';

export type EnrichedGarden = Garden & { resilience: GardenResilienceScore };

const API_TIMEOUT_MS = 2500;

async function loadFromApi(): Promise<EnrichedGarden[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  try {
    const res = await fetch('/api/gardens?limit=2000', { signal: controller.signal });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data?.gardens) || data.gardens.length === 0) return null;
    return data.gardens;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function loadFromOpenData(): Promise<EnrichedGarden[]> {
  const service = new NycOpenDataService();
  const gardens = await service.fetchLiveGardens({ skipMapPluto: true });
  return gardens.map((garden) => ({
    ...garden,
    hasVisuals: gardenShowsPhotoPin(garden),
    resilience: calculateGardenResilience(garden, []),
  }));
}

/** Prefer the local/Vercel API; if it is down, fetch NYC Open Data in the browser. */
export async function loadEnrichedGardens(): Promise<EnrichedGarden[]> {
  const fromApi = await loadFromApi();
  if (fromApi) return fromApi;
  return loadFromOpenData();
}

export function filterEnrichedGardens(
  gardens: EnrichedGarden[],
  options: {
    borough?: string;
    resilienceLevel?: string;
    search?: string;
  } = {}
): EnrichedGarden[] {
  const borough = options.borough && options.borough !== 'All' ? options.borough : undefined;
  const resilienceLevel =
    options.resilienceLevel && options.resilienceLevel !== 'All'
      ? (options.resilienceLevel as ResilienceLevel)
      : undefined;
  const search = (options.search || '').toLowerCase().trim();

  const filtered = gardens.filter((garden) => {
    if (borough && garden.borough !== borough) return false;
    if (resilienceLevel && garden.resilience.resilienceLevel !== resilienceLevel) return false;
    if (search) {
      const haystack = [
        garden.name,
        garden.address,
        garden.zipCode,
        garden.bbl,
        garden.communityBoard,
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });

  return filtered.sort((a, b) => b.resilience.score - a.resilience.score);
}
