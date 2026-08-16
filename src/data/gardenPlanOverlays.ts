import type { LatLngBoundsLiteral } from 'leaflet';

/** Bird’s-eye plans placed on the live map. Only ESG has this asset today. */
export interface GardenPlanOverlay {
  url: string;
  bounds: LatLngBoundsLiteral;
}

export const GARDEN_PLAN_OVERLAYS: Record<string, GardenPlanOverlay> = {
  MGT056: {
    url: '/figma-profile/esg-plan.png',
    // Elizabeth Street Garden: between Mott (W) and Elizabeth (E), Prince (S) and Spring (N).
    bounds: [
      [40.72188, -73.99532],
      [40.72266, -73.99436]
    ]
  }
};

export function isElizabethStreetGarden(garden: { id?: string; name?: string; bbl?: string } | null): boolean {
  if (!garden) return false;
  return (
    garden.id === 'MGT056' ||
    garden.bbl === '1004930030' ||
    /elizabeth\s+street/i.test(garden.name || '')
  );
}

export function lotBoundsForGarden(
  garden: {
    id?: string;
    name?: string;
    bbl?: string;
    latitude?: number;
    longitude?: number;
    sizeSqFt?: number;
  } | null
): LatLngBoundsLiteral | null {
  const plan = planOverlayForGarden(garden);
  if (plan) return plan.bounds;
  if (!garden?.latitude || !garden?.longitude) return null;

  const lat = garden.latitude;
  const lon = garden.longitude;
  const sideFt = Math.sqrt(Math.max(garden.sizeSqFt || 8000, 4000));
  const sideM = sideFt * 0.3048 * 1.3;
  const halfLat = sideM / 111320 / 2;
  const halfLon = sideM / (111320 * Math.cos((lat * Math.PI) / 180)) / 2;
  return [
    [lat - halfLat, lon - halfLon],
    [lat + halfLat, lon + halfLon]
  ];
}

export function planOverlayForGarden(garden: { id?: string; name?: string; bbl?: string } | null): GardenPlanOverlay | null {
  if (!garden) return null;
  if (garden.id && GARDEN_PLAN_OVERLAYS[garden.id]) return GARDEN_PLAN_OVERLAYS[garden.id];
  if (isElizabethStreetGarden(garden)) return GARDEN_PLAN_OVERLAYS.MGT056;
  return null;
}
