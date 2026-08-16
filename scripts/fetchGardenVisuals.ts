/**
 * One-time (or occasional) lookup of licensed garden visuals.
 * Writes src/data/gardenVisuals.generated.json
 *
 * Skips Elizabeth Street Garden — visuals will be added locally.
 */
import fs from 'fs';
import path from 'path';
import { GardenVisual } from '../src/types';

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const OPEN_DATA = 'https://data.cityofnewyork.us/resource/p78i-pat6.json?$limit=2000';
const NYPL_SEARCH = 'https://digitalcollections.nypl.org/search/index.json';
const OUT_PATH = path.resolve(process.cwd(), 'src/data/gardenVisuals.generated.json');
const USER_AGENT = 'RootedNYC/1.0 (NYPL hackathon garden visuals; https://github.com)';
const COMMONS_ROOT = 'Category:Community gardens in New York City';
const SKIP_NAME = /elizabeth\s+street\s+garden/i;
const SKIP_IDS = new Set(['MGT056']);
const MAX_PER_GARDEN = 8;

interface OpenDataGarden {
  parksid?: string;
  gardenname?: string;
  borough?: string;
}

interface GardenRef {
  id: string;
  name: string;
  core: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function wikiGet(params: Record<string, string>): Promise<any> {
  const url = new URL(COMMONS_API);
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' }
  });
  if (!res.ok) {
    throw new Error(`Commons HTTP ${res.status} for ${params.action}`);
  }
  return res.json();
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function coreName(name: string): string {
  return normalize(name)
    .replace(/\b(community|garden|gardens|inc|incorporated|the|of|and|nyc|new york|city|jardin|block|association)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isSkipped(id: string, name: string): boolean {
  return SKIP_IDS.has(id) || SKIP_NAME.test(name);
}

function isArtwork(title: string, description: string, categories: string): boolean {
  const blob = `${title} ${description} ${categories}`.toLowerCase();
  return /mural|painting|drawing|lithograph|etching|woodcut|print|poster|illustration|artwork|watercolor|oil on|graffiti art/.test(
    blob
  );
}

function qualityScore(visual: GardenVisual): number {
  let score = 0;
  if (visual.kind === 'artwork') score += 50;
  const width = visual.width || 0;
  if (width >= 2000) score += 30;
  else if (width >= 1200) score += 15;
  else if (width >= 800) score += 5;
  if ((visual.height || 0) >= 1200) score += 5;
  return score;
}

function findGarden(gardens: GardenRef[], haystack: string): GardenRef | null {
  const hay = normalize(haystack);
  const hayCore = coreName(haystack);
  if (!hayCore) return null;

  const exact = gardens.find(
    (garden) => garden.core === hayCore || normalize(garden.name) === hay
  );
  if (exact) return exact;

  const hayTokens = hayCore.split(' ').filter((token) => token.length >= 2);
  let best: { garden: GardenRef; score: number } | null = null;

  for (const garden of gardens) {
    if (!garden.core || garden.core.length < 4) continue;
    const gardenTokens = garden.core.split(' ').filter((token) => token.length >= 2);
    if (gardenTokens.length === 0 || hayTokens.length === 0) continue;

    const overlap = hayTokens.filter(
      (token) => gardenTokens.includes(token) || garden.core.includes(token)
    );
    const recall = overlap.length / hayTokens.length;
    const precision = overlap.length / gardenTokens.length;
    if (recall < 0.8) continue;

    const lengthRatio = Math.min(hayCore.length, garden.core.length) / Math.max(hayCore.length, garden.core.length);
    if (lengthRatio < 0.55 && precision < 0.7) continue;

    const score = recall * 0.55 + precision * 0.3 + lengthRatio * 0.15;
    if (!best || score > best.score) {
      best = { garden, score };
    }
  }

  return best && best.score >= 0.72 ? best.garden : null;
}

async function listCategoryMembers(title: string, type: 'subcat' | 'file'): Promise<string[]> {
  const titles: string[] = [];
  let cmcontinue: string | undefined;
  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: title,
      cmtype: type,
      cmlimit: '500'
    };
    if (cmcontinue) params.cmcontinue = cmcontinue;
    const data = await wikiGet(params);
    const members = data?.query?.categorymembers || [];
    for (const member of members) {
      titles.push(member.title);
    }
    cmcontinue = data?.continue?.cmcontinue;
    await sleep(80);
  } while (cmcontinue);
  return titles;
}

async function fileInfo(titles: string[]): Promise<GardenVisual[]> {
  const visuals: GardenVisual[] = [];
  for (let i = 0; i < titles.length; i += 10) {
    const chunk = titles.slice(i, i + 10);
    const data = await wikiGet({
      action: 'query',
      titles: chunk.join('|'),
      prop: 'imageinfo|categories',
      iiprop: 'url|size|mime|extmetadata',
      iiurlwidth: '1600',
      cllimit: '20'
    });
    const pages = data?.query?.pages || {};
    for (const page of Object.values(pages) as any[]) {
      const info = page.imageinfo?.[0];
      if (!info?.url || !String(info.mime || '').startsWith('image/')) continue;
      const meta = info.extmetadata || {};
      const license = String(meta.LicenseShortName?.value || meta.UsageTerms?.value || 'See Commons');
      if (/fair use/i.test(license) || /noncommercial|nc-/i.test(license)) continue;
      const artist = String(meta.Artist?.value || '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/This photo was taken[\s\S]*/i, ' ')
        .replace(/This file is licensed[\s\S]*/i, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const description = String(meta.ImageDescription?.value || '')
        .replace(/<[^>]+>/g, ' ')
        .trim();
      const cats = (page.categories || []).map((c: { title: string }) => c.title).join(' ');
      const width = Number(info.width) || 0;
      const height = Number(info.height) || 0;
      visuals.push({
        url: width > 2400 && info.thumburl ? info.thumburl : info.url,
        thumbUrl: info.thumburl || info.url,
        title: String(page.title || '').replace(/^File:/, ''),
        credit: artist || 'Wikimedia Commons',
        license,
        sourceUrl: info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title)}`,
        kind: isArtwork(page.title || '', description, cats) ? 'artwork' : 'photo',
        source: 'wikimedia_commons',
        width,
        height
      });
    }
    await sleep(80);
  }
  return visuals;
}

async function loadGardens(): Promise<GardenRef[]> {
  const res = await fetch(OPEN_DATA, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Open Data HTTP ${res.status}`);
  const rows = (await res.json()) as OpenDataGarden[];
  const gardens: GardenRef[] = [];
  for (const row of rows) {
    const id = (row.parksid || '').trim();
    const name = (row.gardenname || '').trim();
    if (!id || !name) continue;
    if (isSkipped(id, name)) continue;
    gardens.push({ id, name, core: coreName(name) });
  }
  return gardens;
}

function addVisual(
  byId: Record<string, GardenVisual[]>,
  gardenId: string,
  visual: GardenVisual
) {
  if (!byId[gardenId]) byId[gardenId] = [];
  if (byId[gardenId].some((item) => item.url === visual.url || item.title === visual.title)) return;
  byId[gardenId].push(visual);
}

function trimPools(byId: Record<string, GardenVisual[]>) {
  for (const id of Object.keys(byId)) {
    byId[id] = byId[id]
      .sort((a, b) => qualityScore(b) - qualityScore(a))
      .slice(0, MAX_PER_GARDEN);
  }
}

async function ingestCommonsCategory(
  categoryTitle: string,
  gardens: GardenRef[],
  byId: Record<string, GardenVisual[]>,
  forcedGarden?: GardenRef
) {
  if (SKIP_NAME.test(categoryTitle)) {
    console.log(`Skipping ${categoryTitle}`);
    return;
  }
  const files = await listCategoryMembers(categoryTitle, 'file');
  if (files.length === 0) return;
  const visuals = await fileInfo(files);
  const garden =
    forcedGarden || findGarden(gardens, categoryTitle.replace(/^Category:/, ''));
  for (const visual of visuals) {
    const match =
      garden ||
      findGarden(gardens, `${visual.title} ${visual.credit}`);
    if (!match) continue;
    addVisual(byId, match.id, visual);
  }
}

async function searchCommonsForGarden(garden: GardenRef): Promise<string[]> {
  const query = `"${garden.name}" New York garden`;
  const data = await wikiGet({
    action: 'query',
    list: 'search',
    srsearch: query,
    srnamespace: '6',
    srlimit: '8'
  });
  return (data?.query?.search || []).map((hit: { title: string }) => hit.title);
}

async function searchNypl(gardens: GardenRef[], byId: Record<string, GardenVisual[]>) {
  const queries = [
    'New York community garden',
    'community garden Manhattan',
    'community garden Brooklyn',
    'Liz Christy garden',
    'Green Guerillas',
    'GreenThumb garden New York'
  ];

  for (const q of queries) {
    try {
      const url = `${NYPL_SEARCH}?keywords=${encodeURIComponent(q)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': USER_AGENT }
      });
      if (!res.ok) {
        console.warn(`NYPL search HTTP ${res.status} for "${q}"`);
        continue;
      }
      const data = await res.json();
      const items = data?.response?.docs || data?.items || data?.results || [];
      if (!Array.isArray(items) || items.length === 0) {
        console.log(`NYPL: no JSON items for "${q}"`);
        continue;
      }
      for (const item of items) {
        const title = String(item.title || item.title_t || '');
        const garden = findGarden(gardens, title);
        if (!garden) continue;
        const image =
          item.high_res_link ||
          item.image_url ||
          item.cover_image ||
          item.thumbnail_url;
        if (!image) continue;
        addVisual(byId, garden.id, {
          url: image,
          thumbUrl: item.thumbnail_url || image,
          title,
          credit: 'NYPL Digital Collections',
          license: String(item.rights || 'NYPL Digital Collections — check item rights'),
          sourceUrl: item.url || item.link || undefined,
          kind: isArtwork(title, '', '') ? 'artwork' : 'photo',
          source: 'nypl'
        });
      }
    } catch (err) {
      console.warn(`NYPL search failed for "${q}":`, err);
    }
    await sleep(200);
  }
}

async function main() {
  console.log('Loading GreenThumb gardens…');
  const gardens = await loadGardens();
  console.log(`Gardens eligible for auto visuals: ${gardens.length} (Elizabeth Street skipped)`);

  const byId: Record<string, GardenVisual[]> = {};

  console.log('Crawling Commons category tree…');
  const subcats = await listCategoryMembers(COMMONS_ROOT, 'subcat');
  await ingestCommonsCategory(COMMONS_ROOT, gardens, byId);

  for (const subcat of subcats) {
    if (/urban farms/i.test(subcat)) continue;
    const forced = findGarden(gardens, subcat.replace(/^Category:/, ''));
    console.log(`  ${subcat}${forced ? ` → ${forced.name}` : ''}`);
    await ingestCommonsCategory(subcat, gardens, byId, forced || undefined);
  }

  const unmatched = gardens.filter((garden) => !byId[garden.id] && garden.core.length >= 5);
  const extra = unmatched.slice(0, 80);
  console.log(`Commons name search for ${extra.length} unmatched gardens…`);
  for (const garden of extra) {
    try {
      const titles = await searchCommonsForGarden(garden);
      if (titles.length === 0) {
        await sleep(80);
        continue;
      }
      const visuals = await fileInfo(titles);
      for (const visual of visuals) {
        const match = findGarden(gardens, visual.title);
        if (match?.id !== garden.id) continue;
        addVisual(byId, garden.id, visual);
      }
    } catch (err) {
      console.warn(`Search failed for ${garden.name}:`, err);
    }
    await sleep(120);
  }

  console.log('Trying NYPL Digital Collections…');
  await searchNypl(gardens, byId);

  trimPools(byId);

  const gardenCount = Object.keys(byId).length;
  const imageCount = Object.values(byId).reduce((sum, list) => sum + list.length, 0);
  const payload = {
    generatedAt: new Date().toISOString(),
    gardenCount,
    imageCount,
    byGardenId: byId
  };
  fs.writeFileSync(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${imageCount} visuals for ${gardenCount} gardens → ${OUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
