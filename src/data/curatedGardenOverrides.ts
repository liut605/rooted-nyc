import { CategoryEvidence, Garden } from '../types';

/**
 * Hand-verified patches for a small set of gardens where NYC Open Data lags
 * news, deeds, or operator records. Applied on top of the live Socrata row.
 * Do not scrape search results or Gemini output into this file.
 */
export interface GardenOverride {
  match: { id?: string; bbl?: string };
  patch: Partial<Garden>;
  note: string;
  sources: { label: string; url: string; asOf: string }[];
  evidence: Partial<CategoryEvidence>;
}

export const CURATED_GARDEN_OVERRIDES: GardenOverride[] = [
  {
    match: { id: 'MGT056', bbl: '1004930030' },
    note: 'Open Data still lists Housing Preservation and Development and no steward. City designated the lot as parkland in November 2025. Elizabeth Street Garden Inc operates the site. Housing-related litigation may continue; this overlay reflects the parkland notice, not a court final judgment.',
    sources: [
      {
        label: 'Gothamist — parkland designation',
        url: 'https://gothamist.com/news/mayor-adams-aims-to-save-elizabeth-street-garden-by-making-it-official-nyc-park',
        asOf: '2025-11'
      },
      {
        label: 'NY1 — Parks transfer notice',
        url: 'https://ny1.com/nyc/all-boroughs/news/2025/11/13/adams-aims-to-save-elizabeth-street-garden-by-making-it-an-official-park',
        asOf: '2025-11-13'
      },
      {
        label: 'Elizabeth Street Garden Inc — about',
        url: 'https://www.elizabethstreetgarden.com/aboutus',
        asOf: '2026-08'
      }
    ],
    patch: {
      address: 'Elizabeth Street between Prince Street and Spring Street',
      jurisdiction: 'NYC Parks / GreenThumb',
      // Parkland dedication is Parks ownership, not a GreenThumb license in the city table.
      greenThumbStatus: 'Non-GreenThumb',
      stewardGroup: 'Elizabeth Street Garden Inc',
      sizeSqFt: 20000,
      latitude: 40.72227,
      longitude: -73.99469,
      surroundingBuildingDensity: 'high',
      developmentActivity: 'high',
      nearLargeDevelopmentParcel: true
    },
    evidence: {
      policy: [
        {
          text: 'Designated as city parkland in November 2025',
          effect: 'plus',
          source: 'hand_verified',
          didYouKnow: 'Parkland designation is a city notice that a lot should be treated as park, not as a housing or development site.',
          whatItMeans: 'The City designated this lot as parkland in November 2025. Litigation may continue; this reflects the notice, not a final judgment.'
        }
      ],
      landSecurity: [
        {
          text: 'Parkland dedication makes removal require state legislation',
          effect: 'plus',
          source: 'hand_verified',
          didYouKnow: 'In New York, taking dedicated parkland for another use generally requires state legislation.',
          whatItMeans: 'That is a much higher bar than ending a license. It does not erase nearby development pressure.'
        }
      ],
      community: [
        {
          text: 'Elizabeth Street Garden Inc is a volunteer 501(c)(3) nonprofit operator',
          effect: 'plus',
          source: 'hand_verified',
          didYouKnow: 'A 501(c)(3) is a nonprofit that can operate a garden as volunteer steward. Stewardship is not ownership.',
          whatItMeans: 'Elizabeth Street Garden Inc is the volunteer nonprofit that operates this site, which is a Community Strength plus.'
        }
      ]
    }
  },
  {
    match: { id: 'B398-GT001', bbl: '3016010062' },
    note: 'Open Data already lists NYC Parks and an active GreenThumb license. It does not include the steward organization. Northeast Brooklyn Housing Development Corporation developed and still sponsors the garden.',
    sources: [
      {
        label: 'GrowNYC — Kosciusko Garden / Learning Center',
        url: 'https://www.grownyc.org/openspace/gardens/bk/kosciusko',
        asOf: '2026-08'
      },
      {
        label: 'Northeast Brooklyn Housing Development Corporation — community gardens',
        url: 'https://nebhdco.org/community-gardens/',
        asOf: '2026-08'
      }
    ],
    patch: {
      stewardGroup: 'Northeast Brooklyn Housing Development Corporation',
      establishedYear: 1998,
      sizeSqFt: 2500,
      surroundingBuildingDensity: 'moderate',
      developmentActivity: 'low',
      nearLargeDevelopmentParcel: false
    },
    evidence: {
      community: [
        {
          text: 'Northeast Brooklyn Housing Development Corporation developed and still sponsors the garden',
          effect: 'plus',
          source: 'hand_verified',
          didYouKnow: 'A garden sponsor is an organization that developed or still backs a community garden. That is Community Strength, not Parks ownership or a GreenThumb license.',
          whatItMeans: 'Northeast Brooklyn Housing Development Corporation developed this garden and still sponsors it.'
        }
      ]
    }
  }
];

export function applyCuratedOverrides(gardens: Garden[]): Garden[] {
  return gardens.map((garden) => {
    const override = CURATED_GARDEN_OVERRIDES.find((entry) => {
      if (entry.match.id && (garden.id === entry.match.id || garden.propID === entry.match.id)) {
        return true;
      }
      if (entry.match.bbl && garden.bbl === entry.match.bbl) {
        return true;
      }
      return false;
    });

    if (!override) {
      return garden;
    }

    return {
      ...garden,
      ...override.patch,
      isCurated: true,
      curatedNote: override.note,
      curatedSources: override.sources,
      curatedFields: Object.keys(override.patch),
      curatedEvidence: override.evidence,
      lastUpdated: new Date().toISOString()
    };
  });
}
