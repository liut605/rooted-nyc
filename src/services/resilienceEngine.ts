import { Garden, GardenResilienceScore, ScoreBreakdown, ResilienceLevel, ResilienceFactor, RecommendedAction, PublicAction, CrowdsourcedReport, CategoryEvidence, EvidenceEffect, EvidenceSource, DensityLevel, EvidenceExplainer } from '../types';

function fieldSource(garden: Garden, field: string, fallback: EvidenceSource): EvidenceSource {
  return garden.curatedFields?.includes(field) ? 'hand_verified' : fallback;
}

function mergeCategoryEvidence(base: CategoryEvidence, extra?: Partial<CategoryEvidence>): CategoryEvidence {
  if (!extra) return base;
  return {
    policy: [...(extra.policy || []), ...base.policy],
    landSecurity: [...base.landSecurity, ...(extra.landSecurity || [])],
    developmentPressure: [...(extra.developmentPressure || []), ...base.developmentPressure],
    community: [...(extra.community || []), ...base.community]
  };
}

function isCommercialOrMixedManufacturing(zoning: string): boolean {
  const z = zoning.toUpperCase();
  return z.startsWith('C') || /M[0-9].*\/R/.test(z) || z.startsWith('M');
}

function describeCommercialOrMixedZoning(zoning: string): string {
  const z = zoning.toUpperCase();
  if (/M[0-9].*\/R/.test(z)) {
    return 'a mixed manufacturing district';
  }
  if (z.startsWith('C6') || z.startsWith('C5')) {
    return 'a high-density commercial district';
  }
  if (z.startsWith('C')) {
    return 'a commercial district';
  }
  if (z.startsWith('M')) {
    return 'a manufacturing district';
  }
  return 'a commercial or mixed manufacturing district';
}

function inferSurroundingDensity(garden: Garden): DensityLevel {
  const highPressureZips = ['10009', '10002', '10035', '11206', '11216', '10451', '11101'];
  if (garden.borough === 'Manhattan') return 'high';
  if (highPressureZips.includes(garden.zipCode)) return 'high';
  return 'moderate';
}

function inferDevelopmentActivity(gardenReports: CrowdsourcedReport[]): DensityLevel {
  const developmentThreats = ['Real Estate Listing / RFP', 'Site Visit / Surveyors Seen'];
  if (gardenReports.some((report) => developmentThreats.includes(report.threatCategory))) {
    return 'high';
  }
  return 'low';
}

function capitalizeDensity(level: DensityLevel): string {
  if (level === 'high') return 'High';
  if (level === 'low') return 'Low';
  return 'Moderate';
}

function formatSqFt(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

function explainUnusedFloorAreaRatio(garden: Garden): EvidenceExplainer {
  const unused = garden.airRightsUnused;
  const maxFAR = garden.maxFAR;
  const builtFAR = garden.builtFAR;
  const lotSize = garden.sizeSqFt > 0 ? garden.sizeSqFt : undefined;
  const allowedFloor = lotSize ? Math.round(lotSize * maxFAR) : undefined;
  const parkland = garden.jurisdiction === 'NYC Parks / GreenThumb' || garden.jurisdiction === 'Trust for Public Land';

  const numbers = lotSize && allowedFloor !== undefined
    ? `This garden's lot is about ${formatSqFt(lotSize)} square feet, and zoning allows an FAR of ${maxFAR.toFixed(2)} — roughly ${formatSqFt(allowedFloor)} square feet of indoor space`
    : `Zoning here allows an FAR of ${maxFAR.toFixed(2)}, and the unused FAR on this lot is ${unused.toFixed(2)}`;

  const unusedToday =
    builtFAR <= 0.05
      ? ', almost none of which is built today.'
      : `. About ${builtFAR.toFixed(2)} FAR is already built, which leaves ${unused.toFixed(2)} unused.`;

  const protection = parkland ? 'parkland protection' : 'legal protections';
  const implication =
    unused >= 5
      ? `A large unused envelope does not override ${protection}, but it can make the lot look valuable to build on.`
      : unused >= 2
        ? `Leftover building room does not override ${protection}, but it can still make an open lot more interesting to developers.`
        : 'Relatively little unused building permission remains, so there is less leftover air rights for a new project.';

  return {
    didYouKnow: 'Floor Area Ratio, or FAR, is how NYC measures how much building is allowed on a lot. Unused FAR is the leftover room to build.',
    whatItMeans: `${numbers}${unusedToday} ${implication}`
  };
}

function explainSurroundingDensity(level: DensityLevel, garden: Garden): EvidenceExplainer {
  const didYouKnow = 'Surrounding density is how tightly nearby lots are already built.';
  if (level === 'high') {
    return {
      didYouKnow,
      whatItMeans: `This garden sits in ${garden.borough}, in a packed neighborhood. Leftover open land is scarce, so the lot can look like one of the last places to build.`
    };
  }
  if (level === 'low') {
    return {
      didYouKnow,
      whatItMeans: `This garden sits in ${garden.borough}. Open land is less scarce here, so the garden is less likely to stand out as a building site.`
    };
  }
  return {
    didYouKnow,
    whatItMeans: `This garden sits in ${garden.borough}. Nearby buildings take up a fair amount of land, so the open lot still has value without extreme scarcity.`
  };
}

function explainJurisdiction(garden: Garden): EvidenceExplainer {
  switch (garden.jurisdiction) {
    case 'Trust for Public Land':
      return {
        didYouKnow: 'A land trust can hold a lot under a conservation restriction meant to keep it as open space.',
        whatItMeans: 'Selling or building here would require undoing that restriction, not just ending a license.'
      };
    case 'NYC Parks / GreenThumb':
      return {
        didYouKnow: 'NYC Parks jurisdiction means the city parks agency holds the lot. Dedicated parkland is harder to convert than housing-agency or private land.',
        whatItMeans: 'NYC Parks controls this garden, so tenure is stronger than an HPD or private lot. A GreenThumb license is scored separately under Policy Support.'
      };
    case 'DOT / City Agency':
      return {
        didYouKnow: 'Some gardens sit on land held by a city agency other than Parks, without parkland dedication.',
        whatItMeans: 'This lot is held that way, so the agency can still reassign or develop it, and tenure is weaker than Parks.'
      };
    case 'NYCHA (Housing Authority)':
      return {
        didYouKnow: 'NYCHA is the New York City Housing Authority. Gardens on NYCHA campuses sit on public-housing land.',
        whatItMeans: 'This garden sits on a NYCHA campus, so it depends on housing plans, not parkland rules.'
      };
    case 'HPD (Housing Preservation & Dev)':
      return {
        didYouKnow: 'HPD is the Department of Housing Preservation and Development. Its job is to produce housing, including on city-owned lots.',
        whatItMeans: 'HPD owns this lot, so the garden sits in the housing pipeline, which is why Land Security is low.'
      };
    case 'Private Owner':
      return {
        didYouKnow: 'A privately owned garden lot has no Parks or conservation restriction unless one is on file.',
        whatItMeans: 'A private owner holds this lot, so they can sell, redevelop, or close the garden with fewer public-land protections.'
      };
    default:
      return {
        didYouKnow: 'Land Security is scored on who holds the lot — Parks, a land trust, a housing agency, or a private owner.',
        whatItMeans: 'This garden has no clear tenure record, so it is harder to know who could sell or develop the site.'
      };
  }
}

function explainHpdHousingPipeline(): EvidenceExplainer {
  return {
    didYouKnow: 'HPD can offer lots for housing through city disposition, including requests for proposals, or RFPs.',
    whatItMeans: 'A garden here is using the lot in the meantime; it is not removed from that housing pipeline.'
  };
}

function explainGreenThumbStatus(status: Garden['greenThumbStatus']): EvidenceExplainer {
  if (status === 'Active') {
    return {
      didYouKnow: 'A GreenThumb license is the city’s permission for volunteers to operate a garden on city land.',
      whatItMeans: 'This garden has an active license. That is official support, not parkland, and it does not by itself stop the city from using the lot for something else.'
    };
  }
  if (status === 'Pending License') {
    return {
      didYouKnow: 'A pending GreenThumb license means the garden is in the city’s volunteer-garden program but has no active operating agreement yet.',
      whatItMeans: 'This garden’s license is still pending, so the group has less official standing than an active license, which lowers Policy Support.'
    };
  }
  return {
    didYouKnow: 'GreenThumb is the city’s main volunteer-garden program. A license is official permission to operate on city land.',
    whatItMeans: 'This garden has no active or pending license in the city table, which is a Policy Support minus. Parks ownership, if any, is scored separately under Land Security.'
  };
}

function explainZoningPolicy(isCommercialOrMixed: boolean, garden: Garden): EvidenceExplainer {
  if (isCommercialOrMixed) {
    const district = describeCommercialOrMixedZoning(garden.landUseZoning);
    return {
      didYouKnow: `${district.charAt(0).toUpperCase()}${district.slice(1)} is written to allow stores, offices, or industry — not to protect open space.`,
      whatItMeans: `This lot is zoned that way, which is less protective of a garden. Leftover building room is scored under Development Pressure.`
    };
  }
  return {
    didYouKnow: 'Commercial and mixed manufacturing districts are written for stores, offices, or industry. Other zoning is a milder setting for keeping open space.',
    whatItMeans: 'This lot is not in a commercial or mixed manufacturing district. How much unused building room remains is a Development Pressure question.'
  };
}

function explainRezoningCorridor(inCorridor: boolean, zipCode: string): EvidenceExplainer {
  const didYouKnow =
    'A rezoning corridor is a neighborhood where the city has been changing what can be built — often to allow more housing or commercial floor area.';
  if (inCorridor) {
    return {
      didYouKnow,
      whatItMeans: `Postal code ${zipCode} is on this index’s short list of those neighborhoods. That is a neighborhood flag, not a finding about this garden’s deed.`
    };
  }
  return {
    didYouKnow,
    whatItMeans: `Postal code ${zipCode} is not on that list. The neighborhood could still be rezoned; this line stays neutral.`
  };
}

function explainStewardGroup(name: string): EvidenceExplainer {
  return {
    didYouKnow: 'A steward group is the volunteer organization that maintains a community garden. Stewardship is not a land title.',
    whatItMeans: `"${name}" maintains this garden, which raises Community Strength. Tenure is scored under Land Security.`
  };
}

function explainThreatReport(title: string): EvidenceExplainer {
  return {
    didYouKnow: 'Neighbors can file crowdsourced alerts about surveyors, listings, or rezoning talk. Those reports are local intelligence, not city permits.',
    whatItMeans: `This garden has a report titled “${title}.” Each active report lowers Community Strength.`
  };
}

function explainNoThreatReports(): EvidenceExplainer {
  return {
    didYouKnow: 'This tool lets neighbors flag threats like surveyors or listings.',
    whatItMeans: 'None are on file for this garden. That does not prove the site is safe; it is a neutral baseline.'
  };
}

function explainDevelopmentActivityAndProximity(
  activity: DensityLevel,
  nearLargeParcel: boolean,
  garden: Garden
): EvidenceExplainer {
  const size = garden.sizeSqFt > 0
    ? ` This lot is about ${formatSqFt(garden.sizeSqFt)} square feet.`
    : '';
  const didYouKnow =
    'Development activity tracks nearby construction, listings, or other signs of new building. A large development parcel is a big open lot that can attract proposals.';

  if (activity === 'high' && nearLargeParcel) {
    return {
      didYouKnow,
      whatItMeans: `Activity around this garden is high, and it sits on or near a large open parcel.${size} That mix can attract housing or commercial proposals.`
    };
  }
  if (activity === 'high') {
    return {
      didYouKnow,
      whatItMeans: `Nearby building interest is high around this garden, which raises pressure even if the lot is not a large development parcel.${size}`
    };
  }
  if (nearLargeParcel) {
    return {
      didYouKnow,
      whatItMeans: `This garden sits on or near a large open parcel.${size} That can still attract proposals even when nearby construction activity is not high.`
    };
  }
  return {
    didYouKnow,
    whatItMeans: `Activity around this garden is low, and the lot is not a large development parcel.${size} That usually means less immediate push to build here.`
  };
}

export function calculateGardenResilience(
  garden: Garden,
  reports: CrowdsourcedReport[] = []
): GardenResilienceScore {
  const resilienceFactors: ResilienceFactor[] = [];
  const evidence: CategoryEvidence = {
    policy: [],
    landSecurity: [],
    developmentPressure: [],
    community: []
  };

  const pushEvidence = (
    bucket: keyof CategoryEvidence,
    text: string,
    effect: EvidenceEffect,
    source: EvidenceSource,
    explanation?: EvidenceExplainer
  ) => {
    evidence[bucket].push({ text, effect, source, ...explanation });
  };

  // 1. Land Security Score (0 - 35)
  let landSecurityScore = 0;

  switch (garden.jurisdiction) {
    case 'Trust for Public Land':
      landSecurityScore = 35;
      resilienceFactors.push({
        category: 'Land Security',
        severity: 'low',
        title: 'Land Trust Protection',
        description: 'Permanently deed-restricted land trust space with strong legal preservation safeguards.'
      });
      break;
    case 'NYC Parks / GreenThumb':
      landSecurityScore = 30;
      resilienceFactors.push({
        category: 'Land Security',
        severity: 'low',
        title: 'NYC Parks Municipal Park Status',
        description: 'Protected under NYC Parks jurisdiction.'
      });
      break;
    case 'DOT / City Agency':
      landSecurityScore = 18;
      resilienceFactors.push({
        category: 'Land Security',
        severity: 'medium',
        title: 'City Agency Parcel (Non-Parks)',
        description: 'Governed by municipal agency without explicit parkland dedication.'
      });
      break;
    case 'NYCHA (Housing Authority)':
      landSecurityScore = 14;
      resilienceFactors.push({
        category: 'Land Security',
        severity: 'medium',
        title: 'NYCHA Authority Campus Lot',
        description: 'Located on public housing campus; subject to administrative infill review.'
      });
      break;
    case 'HPD (Housing Preservation & Dev)':
      landSecurityScore = 8;
      resilienceFactors.push({
        category: 'Land Security',
        severity: 'high',
        title: 'HPD Housing Bank Listing',
        description: 'Under municipal housing pipeline jurisdiction; eligible for housing disposition RFPs.'
      });
      break;
    case 'Private Owner':
      landSecurityScore = 4;
      resilienceFactors.push({
        category: 'Land Security',
        severity: 'high',
        title: 'Privately Held Parcel',
        description: 'Privately owned property without permanent conservation easement.'
      });
      break;
    case 'Unknown / Unlicensed':
    default:
      landSecurityScore = 2;
      resilienceFactors.push({
        category: 'Land Security',
        severity: 'high',
        title: 'Unlicensed / Unverified Deed Status',
        description: 'Operating without formal municipal license or long-term lease agreement.'
      });
      break;
  }

  const jurisdictionSource = fieldSource(garden, 'jurisdiction', 'nyc_open_data');
  const jurisdictionExplanation = explainJurisdiction(garden);
  if (garden.jurisdiction === 'Trust for Public Land') {
    pushEvidence('landSecurity', 'Permanently protected land-trust ownership', 'plus', jurisdictionSource, jurisdictionExplanation);
  } else if (garden.jurisdiction === 'NYC Parks / GreenThumb') {
    pushEvidence('landSecurity', 'New York City Parks jurisdiction', 'plus', jurisdictionSource, jurisdictionExplanation);
  } else if (garden.jurisdiction === 'DOT / City Agency') {
    pushEvidence('landSecurity', 'City agency parcel without parkland dedication', 'minus', jurisdictionSource, jurisdictionExplanation);
  } else if (garden.jurisdiction === 'NYCHA (Housing Authority)') {
    pushEvidence('landSecurity', 'New York City Housing Authority campus lot', 'minus', jurisdictionSource, jurisdictionExplanation);
  } else if (garden.jurisdiction === 'HPD (Housing Preservation & Dev)') {
    pushEvidence('landSecurity', 'Owned by NYC Department of Housing Preservation and Development', 'minus', jurisdictionSource, jurisdictionExplanation);
    pushEvidence(
      'landSecurity',
      'In the municipal housing pipeline',
      'minus',
      jurisdictionSource,
      explainHpdHousingPipeline()
    );
  } else if (garden.jurisdiction === 'Private Owner') {
    pushEvidence('landSecurity', 'Privately owned parcel without a conservation restriction', 'minus', jurisdictionSource, jurisdictionExplanation);
  } else {
    pushEvidence('landSecurity', 'No formal municipal license or long-term lease on file', 'minus', jurisdictionSource, jurisdictionExplanation);
  }

  // 2. Policy Support Score (0 - 20)
  let policySupportScore = 12;
  const greenThumbSource = fieldSource(garden, 'greenThumbStatus', 'nyc_open_data');
  if (garden.greenThumbStatus === 'Active') {
    policySupportScore += 4;
    pushEvidence('policy', 'Active GreenThumb license', 'plus', greenThumbSource, explainGreenThumbStatus(garden.greenThumbStatus));
  } else if (garden.greenThumbStatus === 'Pending License') {
    policySupportScore -= 2;
    pushEvidence('policy', 'Pending GreenThumb license', 'minus', greenThumbSource, explainGreenThumbStatus(garden.greenThumbStatus));
  } else {
    policySupportScore -= 4;
    pushEvidence('policy', 'No existing or pending GreenThumb license', 'minus', greenThumbSource, explainGreenThumbStatus(garden.greenThumbStatus));
  }

  const commercialZoning = isCommercialOrMixedManufacturing(garden.landUseZoning);
  if (commercialZoning) {
    policySupportScore -= 4;
    pushEvidence(
      'policy',
      `Zoned as ${describeCommercialOrMixedZoning(garden.landUseZoning)}`,
      'minus',
      'nyc_open_data',
      explainZoningPolicy(true, garden)
    );
  } else {
    policySupportScore += 3;
    pushEvidence(
      'policy',
      'Not zoned as a commercial or mixed manufacturing district',
      'plus',
      'nyc_open_data',
      explainZoningPolicy(false, garden)
    );
  }

  const highPressureZips = ['10009', '10002', '10035', '11206', '11216', '10451', '11101'];
  if (highPressureZips.includes(garden.zipCode)) {
    policySupportScore -= 5;
    resilienceFactors.push({
      category: 'Policy Support',
      severity: 'medium',
      title: 'High-Density Rezoning Zone',
      description: `Situated in postal code ${garden.zipCode}, designated as an active urban redevelopment corridor.`
    });
    pushEvidence(
      'policy',
      `Postal code ${garden.zipCode} is listed as a high-density rezoning corridor`,
      'minus',
      'nyc_open_data',
      explainRezoningCorridor(true, garden.zipCode)
    );
  } else {
    pushEvidence(
      'policy',
      `Postal code ${garden.zipCode} is not listed as a high-density rezoning corridor`,
      'none',
      'nyc_open_data',
      explainRezoningCorridor(false, garden.zipCode)
    );
  }

  const hasCuratedPolicyPlus = (garden.curatedEvidence?.policy || []).some((item) => item.effect === 'plus');
  if (hasCuratedPolicyPlus) {
    policySupportScore += 5;
  }
  policySupportScore = Math.min(20, Math.max(0, policySupportScore));

  // 3. Development Pressure Score (0 - 25) — higher means less pressure
  let envelopeScore = 8;
  let envelopeEffect: EvidenceEffect = 'plus';
  if (garden.airRightsUnused >= 5.0) {
    envelopeScore = 1;
    envelopeEffect = 'minus';
    resilienceFactors.push({
      category: 'Development Pressure',
      severity: 'high',
      title: 'High Unused Zoning Envelope',
      description: `Zoning permits up to ${garden.maxFAR} Floor Area Ratio with ${garden.airRightsUnused.toFixed(2)} unused.`
    });
  } else if (garden.airRightsUnused >= 3.5) {
    envelopeScore = 3;
    envelopeEffect = 'minus';
    resilienceFactors.push({
      category: 'Development Pressure',
      severity: 'medium',
      title: 'Substantial Unused Zoning Envelope',
      description: `Unused Floor Area Ratio of ${garden.airRightsUnused.toFixed(1)}.`
    });
  } else if (garden.airRightsUnused >= 2.0) {
    envelopeScore = 5;
    envelopeEffect = 'minus';
  } else if (garden.airRightsUnused >= 1.0) {
    envelopeScore = 7;
    envelopeEffect = 'plus';
  }

  pushEvidence(
    'developmentPressure',
    `Zoning envelope unused Floor Area Ratio of ${garden.airRightsUnused.toFixed(2)}`,
    envelopeEffect,
    'nyc_open_data',
    explainUnusedFloorAreaRatio(garden)
  );

  const surroundingDensity = garden.surroundingBuildingDensity || inferSurroundingDensity(garden);
  let surroundingScore = 3;
  let surroundingEffect: EvidenceEffect = 'none';
  if (surroundingDensity === 'high') {
    surroundingScore = 1;
    surroundingEffect = 'minus';
  } else if (surroundingDensity === 'low') {
    surroundingScore = 6;
    surroundingEffect = 'plus';
  }
  pushEvidence(
    'developmentPressure',
    `${capitalizeDensity(surroundingDensity)} surrounding building density`,
    surroundingEffect,
    garden.surroundingBuildingDensity ? fieldSource(garden, 'surroundingBuildingDensity', 'scoring_rule') : 'scoring_rule',
    explainSurroundingDensity(surroundingDensity, garden)
  );

  const developmentActivity = garden.developmentActivity || inferDevelopmentActivity(reports.filter((r) => r.gardenId === garden.id));
  let developmentScore = 3;
  let developmentEffect: EvidenceEffect = 'none';
  if (developmentActivity === 'high') {
    developmentScore = 1;
    developmentEffect = 'minus';
  } else if (developmentActivity === 'low') {
    developmentScore = 6;
    developmentEffect = 'plus';
  }

  const nearLargeParcel =
    garden.nearLargeDevelopmentParcel !== undefined
      ? garden.nearLargeDevelopmentParcel
      : garden.airRightsUnused >= 5 || garden.sizeSqFt >= 15000;
  const proximityScore = nearLargeParcel ? 1 : 5;
  const proximityEffect: EvidenceEffect = nearLargeParcel ? 'minus' : 'plus';

  let combinedEffect: EvidenceEffect = 'none';
  if (developmentEffect === 'plus' && proximityEffect === 'plus') {
    combinedEffect = 'plus';
  } else if (developmentEffect === 'minus' && proximityEffect === 'minus') {
    combinedEffect = 'minus';
  }

  const proximityPhrase = nearLargeParcel
    ? 'near or on a large development parcel'
    : 'not near a large development parcel';
  pushEvidence(
    'developmentPressure',
    `${capitalizeDensity(developmentActivity)} development activity and ${proximityPhrase}`,
    combinedEffect,
    'scoring_rule',
    explainDevelopmentActivityAndProximity(developmentActivity, nearLargeParcel, garden)
  );

  const developmentPressureScore = envelopeScore + surroundingScore + developmentScore + proximityScore;

  // 4. Community Strength & Mobilization Score (0 - 20)
  let communityStrengthScore = 15;

  if (garden.stewardGroup) {
    communityStrengthScore += 3;
    resilienceFactors.push({
      category: 'Community Report',
      severity: 'low',
      title: 'Organized Community Steward Group',
      description: `Actively maintained by "${garden.stewardGroup}".`
    });
    const hasCuratedCommunityPlus = (garden.curatedEvidence?.community || []).some(
      (item) => item.effect === 'plus'
    );
    if (!hasCuratedCommunityPlus) {
      pushEvidence(
        'community',
        `Organized steward group: ${garden.stewardGroup}`,
        'plus',
        fieldSource(garden, 'stewardGroup', 'scoring_rule'),
        explainStewardGroup(garden.stewardGroup)
      );
    }
  }

  const gardenReports = reports.filter(r => r.gardenId === garden.id);
  if (gardenReports.length > 0) {
    const activeThreatsCount = gardenReports.length;
    communityStrengthScore = Math.max(2, communityStrengthScore - (activeThreatsCount * 3));

    gardenReports.forEach(r => {
      resilienceFactors.push({
        category: 'Community Report',
        severity: r.isVerified ? 'high' : 'medium',
        title: `Active Alert: ${r.threatCategory}`,
        description: `Community intelligence reported: "${r.title}".`
      });
      pushEvidence(
        'community',
        `Crowdsourced threat report: ${r.title}`,
        'minus',
        'scoring_rule',
        explainThreatReport(r.title)
      );
    });
  } else {
    pushEvidence('community', 'No crowdsourced threat reports', 'none', 'scoring_rule', explainNoThreatReports());
  }

  communityStrengthScore = Math.min(20, Math.max(0, communityStrengthScore));

  const totalScore = Math.round(
    policySupportScore +
    landSecurityScore +
    developmentPressureScore +
    communityStrengthScore
  );

  let resilienceLevel: ResilienceLevel = 'High Resilience';
  if (totalScore < 35) {
    resilienceLevel = 'Critical Vulnerability';
  } else if (totalScore < 60) {
    resilienceLevel = 'Vulnerable';
  } else if (totalScore < 80) {
    resilienceLevel = 'Moderate Resilience';
  }

  const recommendedActions: RecommendedAction[] = [
    {
      id: `act-council-${garden.id}`,
      title: `Petition City Council Member (District ${garden.councilDistrict}) for Parkland Transfer`,
      type: 'council_letter',
      targetAudience: `NYC Council Member - District ${garden.councilDistrict}`,
      urgency: totalScore < 60 ? 'Immediate' : 'Proactive',
      description: `Submit a data-backed petition requesting permanent NYC Parks jurisdiction transfer to boost resilience for Block ${garden.block}, Lot ${garden.lot}.`
    },
    {
      id: `act-cb-${garden.id}`,
      title: `Testify at ${garden.communityBoard} Land Use Hearing`,
      type: 'community_board',
      targetAudience: `${garden.communityBoard} Land Use & Parks Committee`,
      urgency: totalScore < 50 ? 'Immediate' : 'Medium Term',
      description: 'Deliver a 2-minute public comment script outlining neighborhood environmental benefits and food sovereignty.'
    },
    {
      id: `act-gt-${garden.id}`,
      title: 'Strengthen GreenThumb Long-Term License Agreement',
      type: 'greenthumb_license',
      targetAudience: 'NYC Parks GreenThumb Directorate',
      urgency: garden.greenThumbStatus !== 'Active' ? 'Immediate' : 'Proactive',
      description: 'Complete formal renewal to convert temporary access into multi-year NYC Parks license or Land Trust deed.'
    },
    {
      id: `act-canvass-${garden.id}`,
      title: 'Mobilize Local Steward & Resident Volunteers',
      type: 'canvassing',
      targetAudience: 'Neighborhood Residents & Local Business Sponsors',
      urgency: 'Medium Term',
      description: 'Gather 100+ local neighborhood resident support signatures to build community resilience score.'
    }
  ];

  // Build category-specific Public Actions for low resilience categories
  const publicActions: PublicAction[] = [];

  // Category 1: Low Land Security Score (< 25 / 35)
  if (landSecurityScore < 25) {
    publicActions.push({
      id: `pub-jur-letter-${garden.id}`,
      category: 'Low Land Security',
      title: `Sign Open Letter to Mayor & Council Member (District ${garden.councilDistrict})`,
      actionType: 'sign_letter',
      buttonLabel: 'Sign Open Petition to Mayor',
      description: `Demand that Mayor Eric Adams and City Council execute a permanent deed restriction or Parks jurisdiction transfer for Block ${garden.block}, Lot ${garden.lot}.`,
      targetAudience: `Mayor Eric Adams & NYC Council District ${garden.councilDistrict}`,
      impactBoost: '+15 Land Security Score',
      urgency: landSecurityScore <= 10 ? 'Immediate Action Needed' : 'High Priority',
      specificReason: `Low Land Security Score (${landSecurityScore}/35 pts): Operating under ${garden.jurisdiction} leaves parcel vulnerable to administrative sale or disposition.`
    });

    publicActions.push({
      id: `pub-gt-license-${garden.id}`,
      category: 'Low Land Security',
      title: 'Demand Emergency GreenThumb License Protection',
      actionType: 'sign_letter',
      buttonLabel: 'Sign License Demand Petition',
      description: 'Petition NYC Parks GreenThumb directorate to grant a formal multi-year license to preserve community garden access.',
      targetAudience: 'NYC Parks GreenThumb Directorate',
      impactBoost: '+10 Land Security Score',
      urgency: 'High Priority',
      specificReason: `GreenThumb License status is currently "${garden.greenThumbStatus}".`
    });
  }

  // Category 2: High Real Estate / Development Pressure (< 18 / 25)
  if (developmentPressureScore < 18) {
    publicActions.push({
      id: `pub-re-vigil-${garden.id}`,
      category: 'High Development Pressure',
      title: 'Join Site Surveyor & Developer Vigil Network',
      actionType: 'surveyor_alert',
      buttonLabel: 'Join Site Vigil Alert List',
      description: 'Sign up to receive immediate SMS/email alerts if surveyors, demolition crews, or real estate RFP notices are spotted on lot.',
      targetAudience: 'Neighborhood Garden Preservation Watch Network',
      impactBoost: '+10 Development Pressure Score',
      urgency: 'Immediate Action Needed',
      specificReason: `High Development Pressure (${developmentPressureScore}/25 pts): Parcel contains ${garden.airRightsUnused.toFixed(2)} unused Floor Area Ratio in zoning district ${garden.landUseZoning}.`
    });

    publicActions.push({
      id: `pub-re-comment-${garden.id}`,
      category: 'High Development Pressure',
      title: 'Submit Public Comment Opposing Commercial Air Rights Transfer',
      actionType: 'community_board',
      buttonLabel: 'Submit Zoning Opposition Comment',
      description: 'File an official written objection against private air rights transfers or commercial upzoning on this garden parcel.',
      targetAudience: 'NYC Department of City Planning & City Council',
      impactBoost: '+8 Zoning Safety Score',
      urgency: 'High Priority',
      specificReason: `Unused buildable density on site makes lot a target for private commercial developer acquisitions.`
    });
  }

  // Category 3: Low Policy Support (< 12 / 20)
  if (policySupportScore < 12) {
    publicActions.push({
      id: `pub-zone-testify-${garden.id}`,
      category: 'Low Policy Support',
      title: `Testify at ${garden.communityBoard} Land Use Committee Meeting`,
      actionType: 'community_board',
      buttonLabel: 'Get Hearing Public Testimony Script',
      description: `Register for public comment at the next ${garden.communityBoard} meeting to deliver a 2-minute statement defending community land rights.`,
      targetAudience: `${garden.communityBoard} Land Use & Parks Committee`,
      impactBoost: '+12 Policy Support Score',
      urgency: 'Immediate Action Needed',
      specificReason: `Policy Support (${policySupportScore}/20 pts): Situated in high-density urban redevelopment zip code ${garden.zipCode}.`
    });
  }

  // Category 4: Low Community Mobilization & Active Threat Reports (< 16 / 20)
  if (communityStrengthScore < 16) {
    publicActions.push({
      id: `pub-comm-volunteer-${garden.id}`,
      category: 'Low Community Strength',
      title: `Volunteer at ${garden.name} Open Hours & Workdays`,
      actionType: 'volunteer',
      buttonLabel: 'Sign Up to Volunteer',
      description: 'Sign up for weekend open hours, weeding, soil prep, composting, or community events to demonstrate active community usage.',
      targetAudience: garden.stewardGroup ? garden.stewardGroup : `${garden.name} Volunteer Committee`,
      impactBoost: '+10 Community Strength Score',
      urgency: 'Ongoing Support',
      specificReason: `Community Strength Score (${communityStrengthScore}/20 pts): Higher public volunteer turnout strengthens legal defense against claims of lot abandonment.`
    });

    publicActions.push({
      id: `pub-comm-rally-${garden.id}`,
      category: 'Low Community Strength',
      title: `Attend Emergency "Save ${garden.name}" Community Rally`,
      actionType: 'attend_rally',
      buttonLabel: 'Pledge Rally Attendance',
      description: 'Join local stewards, neighbors, and environmental activists for an on-site press conference and petition canvassing drive.',
      targetAudience: 'Local Residents, Media & Neighborhood Allies',
      impactBoost: '+15 Mobilization Score',
      urgency: totalScore < 50 ? 'Immediate Action Needed' : 'High Priority',
      specificReason: `Active threat reports or low volunteer density detected on lot.`
    });
  }

  // Default Fallback Public Action for higher score gardens
  if (publicActions.length === 0) {
    publicActions.push({
      id: `pub-general-volunteer-${garden.id}`,
      category: 'Low Community Strength',
      title: `Volunteer & Support Garden Open Hours at ${garden.name}`,
      actionType: 'volunteer',
      buttonLabel: 'Sign Up as Volunteer Steward',
      description: 'Help maintain plots, host educational workshops, or donate garden tools to keep community resilience high.',
      targetAudience: `${garden.name} Garden Stewards`,
      impactBoost: '+5 Community Strength Score',
      urgency: 'Ongoing Support',
      specificReason: 'Help preserve high community engagement and keep garden open to the public.'
    });
  }

  const breakdown: ScoreBreakdown = {
    policySupportScore,
    landSecurityScore,
    developmentPressureScore,
    communityStrengthScore,
    totalScore,
    jurisdictionProtectionScore: landSecurityScore,
    airRightsSafetyScore: developmentPressureScore,
    realEstateSafetyScore: developmentPressureScore,
    zoningProtectionScore: policySupportScore
  };

  return {
    gardenId: garden.id,
    gardenName: garden.name,
    bbl: garden.bbl,
    score: totalScore,
    resilienceLevel,
    breakdown,
    categoryEvidence: mergeCategoryEvidence(evidence, garden.curatedEvidence),
    primaryResilienceFactors: resilienceFactors,
    recommendedActions,
    publicActions,
    calculatedAt: new Date().toISOString()
  };
}
