export type Borough = 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island';

export type Jurisdiction = 
  | 'NYC Parks / GreenThumb'
  | 'HPD (Housing Preservation & Dev)'
  | 'NYCHA (Housing Authority)'
  | 'Private Owner'
  | 'Trust for Public Land'
  | 'DOT / City Agency'
  | 'Unknown / Unlicensed';

export type ResilienceLevel = 'High Resilience' | 'Moderate Resilience' | 'Vulnerable' | 'Critical Vulnerability';

export type EvidenceEffect = 'plus' | 'minus' | 'none';
export type EvidenceSource = 'nyc_open_data' | 'hand_verified' | 'scoring_rule';

export interface EvidenceExplainer {
  didYouKnow: string;
  whatItMeans: string;
}

export interface EvidenceBullet {
  text: string;
  effect: EvidenceEffect;
  source: EvidenceSource;
  didYouKnow?: string;
  whatItMeans?: string;
}

export interface CategoryEvidence {
  policy: EvidenceBullet[];
  landSecurity: EvidenceBullet[];
  developmentPressure: EvidenceBullet[];
  community: EvidenceBullet[];
}

export type DensityLevel = 'high' | 'moderate' | 'low';

export type GardenVisualKind = 'photo' | 'artwork';
export type GardenVisualSource = 'wikimedia_commons' | 'nypl' | 'local';

export interface GardenVisual {
  url: string;
  thumbUrl?: string;
  title: string;
  credit: string;
  license: string;
  sourceUrl?: string;
  kind: GardenVisualKind;
  source: GardenVisualSource;
  width?: number;
  height?: number;
}

export interface Garden {
  id: string;
  propID?: string;
  name: string;
  address: string;
  borough: Borough;
  zipCode: string;
  communityBoard: string;
  councilDistrict: number;
  block: number;
  lot: number;
  bbl: string; // Borough-Block-Lot identifier
  sizeSqFt: number;
  jurisdiction: Jurisdiction;
  greenThumbStatus: 'Active' | 'Inactive' | 'Pending License' | 'Non-GreenThumb';
  landUseZoning: string; // e.g. R7A, R6, M1-1, Park
  maxFAR: number; // Maximum Floor Area Ratio allowed
  builtFAR: number; // Currently built Floor Area Ratio on lot
  airRightsUnused: number;
  surroundingBuildingDensity?: DensityLevel;
  developmentActivity?: DensityLevel;
  nearLargeDevelopmentParcel?: boolean;
  latitude: number;
  longitude: number;
  establishedYear?: number;
  stewardGroup?: string;
  lastUpdated: string;
  /** True when a hand-verified overlay patched this record after Open Data ingest. */
  isCurated?: boolean;
  curatedNote?: string;
  curatedSources?: { label: string; url: string; asOf: string }[];
  curatedFields?: string[];
  curatedEvidence?: Partial<CategoryEvidence>;
  /** True when Wikimedia/NYPL/local photos are available for this garden. */
  hasVisuals?: boolean;
}

export interface ScoreBreakdown {
  policySupportScore: number;          // 0 - 20
  landSecurityScore: number;           // 0 - 35
  developmentPressureScore: number;    // 0 - 25 (higher = less pressure)
  communityStrengthScore: number;      // 0 - 20
  totalScore: number;                  // 0 - 100
  jurisdictionProtectionScore: number; // alias of landSecurityScore
  airRightsSafetyScore: number;        // alias of developmentPressureScore
  realEstateSafetyScore: number;       // alias of developmentPressureScore
  zoningProtectionScore: number;       // alias of policySupportScore
}

export interface ResilienceFactor {
  category: 'Policy Support' | 'Land Security' | 'Development Pressure' | 'Community Report';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
}

export interface RecommendedAction {
  id: string;
  title: string;
  type: 'council_letter' | 'community_board' | 'greenthumb_license' | 'canvassing';
  targetAudience: string;
  urgency: 'Immediate' | 'Medium Term' | 'Proactive';
  description: string;
}

export interface PublicAction {
  id: string;
  category: 'Low Policy Support' | 'Low Land Security' | 'High Development Pressure' | 'Low Community Strength';
  title: string;
  actionType: 'sign_letter' | 'volunteer' | 'community_board' | 'surveyor_alert' | 'donate_tools' | 'attend_rally';
  buttonLabel: string;
  description: string;
  targetAudience: string;
  impactBoost: string; // e.g. "+15 Land Protection Score"
  urgency: 'Immediate Action Needed' | 'High Priority' | 'Ongoing Support';
  specificReason: string; // Tailored explanation based on the low score category
}

export interface GardenResilienceScore {
  gardenId: string;
  gardenName: string;
  bbl: string;
  score: number; // 0 - 100
  resilienceLevel: ResilienceLevel;
  breakdown: ScoreBreakdown;
  categoryEvidence: CategoryEvidence;
  primaryResilienceFactors: ResilienceFactor[];
  recommendedActions: RecommendedAction[];
  publicActions: PublicAction[];
  calculatedAt: string;
}

export interface CrowdsourcedReport {
  id: string;
  gardenId: string;
  timestamp: string;
  reporterName?: string;
  reporterRole: 'Garden Steward' | 'Neighbor' | 'Community Board Member' | 'Volunteer' | 'Concerned Citizen';
  threatCategory: 
    | 'Site Visit / Surveyors Seen'
    | 'Lease Renewal Issue'
    | 'Rezoning / ULURP Mention'
    | 'Real Estate Listing / RFP'
    | 'Community Board Hearing'
    | 'Other Threat Alert';
  title: string;
  description: string;
  sourceUrl?: string;
  verificationCount: number;
  isVerified: boolean;
}

export interface GardenFilters {
  borough?: Borough | 'All';
  jurisdiction?: Jurisdiction | 'All';
  resilienceLevel?: ResilienceLevel | 'All';
  search?: string;
  minScore?: number;
  maxScore?: number;
  sortBy?:
    | 'score_desc'
    | 'score_asc'
    | 'policy_desc'
    | 'policy_asc'
    | 'land_desc'
    | 'land_asc'
    | 'pressure_desc'
    | 'pressure_asc'
    | 'community_desc'
    | 'community_asc'
    | 'name_asc'
    | 'size_desc';
  page?: number;
  limit?: number;
}

export interface PaginatedGardensResponse {
  gardens: (Garden & { resilience: GardenResilienceScore })[];
  total: number;
  page: number;
  totalPages: number;
  filtersApplied: GardenFilters;
}

export interface SummaryStats {
  totalGardens: number;
  highResilienceCount: number;
  moderateResilienceCount: number;
  vulnerableCount: number;
  criticalVulnerabilityCount: number;
  boroughResilienceAverage: Record<Borough, number>;
  jurisdictionBreakdown: Record<string, number>;
  totalCrowdsourcedReports: number;
  lastSyncTime: string;
}
