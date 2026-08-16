import { GardenVisual } from '../types';
import generatedCatalogFile from '../data/gardenVisuals.generated.json';

const catalog = (generatedCatalogFile.byGardenId || {}) as Record<string, GardenVisual[]>;

export function getGardenVisualsForClient(gardenId: string, altIds: string[] = []): GardenVisual[] {
  const seen = new Set<string>();
  const merged: GardenVisual[] = [];
  for (const id of [gardenId, ...altIds]) {
    for (const visual of catalog[id] || []) {
      if (seen.has(visual.url)) continue;
      seen.add(visual.url);
      merged.push(visual);
    }
  }
  return merged;
}
