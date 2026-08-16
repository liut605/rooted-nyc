import fs from 'fs';
import path from 'path';
import { GardenVisual } from '../types';

const GENERATED_PATH = path.resolve(process.cwd(), 'src/data/gardenVisuals.generated.json');
const LOCAL_DIR = path.resolve(process.cwd(), 'public/garden-visuals');
const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

interface GeneratedCatalog {
  generatedAt?: string | null;
  byGardenId?: Record<string, GardenVisual[]>;
}

function loadGeneratedCatalog(): Record<string, GardenVisual[]> {
  try {
    const raw = fs.readFileSync(GENERATED_PATH, 'utf8');
    const parsed = JSON.parse(raw) as GeneratedCatalog;
    return parsed.byGardenId || {};
  } catch {
    return {};
  }
}

function loadLocalVisuals(gardenId: string): GardenVisual[] {
  const dir = path.join(LOCAL_DIR, gardenId);
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => IMAGE_EXT.has(path.extname(file).toLowerCase()))
    .sort()
    .map((file) => {
      const kind: GardenVisual['kind'] = /mural|painting|drawing|print|art|illustration/i.test(file)
        ? 'artwork'
        : 'photo';
      return {
        url: `/garden-visuals/${gardenId}/${encodeURIComponent(file)}`,
        title: file.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
        credit: 'Provided for this project',
        license: 'Local upload',
        kind,
        source: 'local' as const
      };
    });
}

export function getGardenVisualPool(gardenId: string, altIds: string[] = []): GardenVisual[] {
  const local = [gardenId, ...altIds].flatMap((id) => loadLocalVisuals(id));
  const catalog = loadGeneratedCatalog();
  const generated = [gardenId, ...altIds].flatMap((id) => catalog[id] || []);

  const seen = new Set<string>();
  const merged: GardenVisual[] = [];
  for (const visual of [...local, ...generated]) {
    if (seen.has(visual.url)) continue;
    seen.add(visual.url);
    merged.push(visual);
  }
  return merged;
}
