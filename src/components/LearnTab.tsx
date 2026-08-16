import React, { useEffect, useState } from 'react';
import { Garden, GardenResilienceScore, DensityLevel } from '../types';
import { BookOpen, ArrowRight, Landmark, Scale, Building2, Users } from 'lucide-react';

type EnrichedGarden = Garden & { resilience: GardenResilienceScore };

export interface LearnTabProps {
  focusSectionId?: string | null;
  onOpenGarden: (gardenId: string, sectionId: string, sectionLabel: string) => void;
}

const HIGH_PRESSURE_ZIPS = ['10009', '10002', '10035', '11206', '11216', '10451', '11101'];

function pickExamples(
  gardens: EnrichedGarden[],
  rank: (garden: EnrichedGarden) => number,
  filter: (garden: EnrichedGarden) => boolean = () => true,
  limit = 3
): EnrichedGarden[] {
  return gardens
    .filter(filter)
    .filter((garden) => Number.isFinite(rank(garden)))
    .sort((a, b) => rank(b) - rank(a))
    .slice(0, limit);
}

function isCommercialOrMixed(zoning: string): boolean {
  const z = zoning.toUpperCase();
  return z.startsWith('C') || z.startsWith('M') || /M[0-9].*\/R/.test(z);
}

function isHighDensityCommercial(zoning: string): boolean {
  const z = zoning.toUpperCase();
  return z.startsWith('C5') || z.startsWith('C6');
}

function surroundingDensity(garden: EnrichedGarden): DensityLevel {
  if (garden.surroundingBuildingDensity) return garden.surroundingBuildingDensity;
  if (garden.borough === 'Manhattan') return 'high';
  if (HIGH_PRESSURE_ZIPS.includes(garden.zipCode)) return 'high';
  return 'moderate';
}

function nearLargeParcel(garden: EnrichedGarden): boolean {
  if (garden.nearLargeDevelopmentParcel !== undefined) return garden.nearLargeDevelopmentParcel;
  return garden.airRightsUnused >= 5 || garden.sizeSqFt >= 15000;
}

function developmentActivity(garden: EnrichedGarden): DensityLevel {
  return garden.developmentActivity || 'low';
}

export const LearnTab: React.FC<LearnTabProps> = ({ focusSectionId, onOpenGarden }) => {
  const [gardens, setGardens] = useState<EnrichedGarden[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/gardens?limit=2000')
      .then((res) => res.json())
      .then((data) => setGardens(data.gardens || []))
      .catch((err) => console.error('Failed to load gardens for Learn tab:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!focusSectionId) return;
    const node = document.getElementById(focusSectionId);
    if (node) {
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [focusSectionId, loading]);

  const mostUnusedFar = pickExamples(gardens, (g) => g.airRightsUnused);
  const highDensityCommercial = pickExamples(
    gardens,
    (g) => (isHighDensityCommercial(g.landUseZoning) ? 2 : 1) * 100 - g.resilience.breakdown.developmentPressureScore,
    (g) => isCommercialOrMixed(g.landUseZoning)
  );
  const highSurroundingDensity = pickExamples(
    gardens,
    (g) => -g.resilience.breakdown.developmentPressureScore,
    (g) => surroundingDensity(g) === 'high'
  );
  const largeParcels = pickExamples(
    gardens,
    (g) => g.sizeSqFt,
    (g) => nearLargeParcel(g)
  );
  const highDevActivity = pickExamples(
    gardens,
    (g) => -g.resilience.breakdown.developmentPressureScore,
    (g) => developmentActivity(g) === 'high'
  );

  const noGreenThumb = pickExamples(
    gardens,
    (g) => -g.resilience.breakdown.policySupportScore,
    (g) => g.greenThumbStatus !== 'Active'
  );
  const rezoningCorridor = pickExamples(
    gardens,
    (g) => -g.resilience.breakdown.policySupportScore,
    (g) => HIGH_PRESSURE_ZIPS.includes(g.zipCode)
  );

  const lowestLand = pickExamples(gardens, (g) => -g.resilience.breakdown.landSecurityScore);
  const hpdLots = pickExamples(gardens, (g) => -g.resilience.breakdown.landSecurityScore, (g) =>
    g.jurisdiction.startsWith('HPD')
  );
  const privateLots = pickExamples(gardens, (g) => -g.resilience.breakdown.landSecurityScore, (g) =>
    g.jurisdiction === 'Private Owner'
  );
  const nychaLots = pickExamples(gardens, (g) => -g.resilience.breakdown.landSecurityScore, (g) =>
    g.jurisdiction.startsWith('NYCHA')
  );

  const noSteward = pickExamples(
    gardens,
    (g) => -g.resilience.breakdown.communityStrengthScore,
    (g) => !g.stewardGroup
  );
  const lowestCommunity = pickExamples(gardens, (g) => -g.resilience.breakdown.communityStrengthScore);

  return (
    <div className="space-y-8">
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800">
        <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          <BookOpen className="w-3.5 h-3.5" />
          Learn
        </div>
        <h2 className="text-xl font-bold mt-2">How NYC community gardens became part of the park system — and how we score them</h2>
        <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
          This page is citywide, not garden-by-garden. History and terms come first. Example gardens are a secondary way to see the idea in live scores. Open a garden to read its full resilience profile, then use Back to return to the term you were reading.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <a href="#learn-development-pressure" className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-blue-300 hover:bg-slate-700">
            Development Pressure
          </a>
          <a href="#learn-land-security" className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-emerald-300 hover:bg-slate-700">
            Land Security
          </a>
          <a href="#learn-policy-support" className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-amber-300 hover:bg-slate-700">
            Policy Support
          </a>
          <a href="#learn-community-strength" className="px-2.5 py-1 rounded-lg bg-slate-800 text-xs font-semibold text-purple-300 hover:bg-slate-700">
            Community Strength
          </a>
        </div>
      </div>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Stand-alone Parks history</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          NYC Parks’ official history is mostly the story of the <em>park system</em>, not of community gardens. Central Park and Prospect Park, the 1898 consolidation of Greater New York, and Robert Moses’ 1934–1960 building boom (playgrounds, pools, parkways, acres of new parkland) explain how Parks became a citywide agency. That background matters for civic literacy, but it does not feed Policy Support, Land Security, Development Pressure, or Community Strength. We keep it short here so it does not get mistaken for a scoring input.
        </p>
        <p className="text-xs text-slate-500">
          Source:{' '}
          <a className="text-emerald-700 underline" href="https://www.nycgovparks.org/about/history" target="_blank" rel="noreferrer">
            NYC Parks — About / History
          </a>
        </p>
      </section>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
        <h3 className="text-base font-bold text-slate-900">History that belongs with the four scores</h3>
        <p className="text-sm text-slate-600 leading-relaxed">
          Parks’ community-garden history is the part that maps onto this index. After the top-down Moses years, the 1960s opened more neighborhood input (vest-pocket parks, local advice). The 1970s fiscal crisis left vacant, often unsafe city lots. Volunteers — including the Green Guerillas, who started in 1973 — turned those lots into gardens. In 1978 the City created Operation GreenThumb (then under General Services, funded largely by HUD block grants) to coordinate use of city-owned vacant land. Early use was strictly temporary: token leases, and the city kept the right to develop. In 1984 GreenThumb added ten-year leases and a preservation track. In 1995 the program moved into Parks; long-term leases gave way to licenses, and many sites became more stable because Parks held them. Tenure, licenses, and leftover building rights are why that story still shows up in today’s scores.
        </p>
        <ul className="text-sm text-slate-600 leading-relaxed list-disc pl-5 space-y-1">
          <li>
            <strong>Development Pressure:</strong> Many sites were temporary. Unused FAR, dense surroundings, large parcels, and commercial zoning are the modern version of “this lot could still be built.”
          </li>
          <li>
            <strong>Land Security:</strong> Who holds the land now — Parks, HPD, NYCHA, a trust, or a private owner — is still the main tenure question.
          </li>
          <li>
            <strong>Policy Support:</strong> GreenThumb began as a city program to legalize gardeners on city land. A license is support, not a permanent park.
          </li>
          <li>
            <strong>Community Strength:</strong> The movement was volunteer-led. Stewards and neighbor reports are still what keep a garden used and defensible.
          </li>
        </ul>
        <p className="text-xs text-slate-500">
          Source:{' '}
          <a
            className="text-emerald-700 underline"
            href="https://www.nycgovparks.org/about/history/community-gardens/movement"
            target="_blank"
            rel="noreferrer"
          >
            NYC Parks — History of the Community Garden Movement
          </a>
          {' '}and{' '}
          <a className="text-emerald-700 underline" href="https://www.nycgovparks.org/greenthumb/about" target="_blank" rel="noreferrer">
            About GreenThumb
          </a>
        </p>
      </section>

      <CategorySection
        id="learn-development-pressure"
        icon={<Building2 className="w-4 h-4 text-blue-600" />}
        title="Development Pressure"
        intro="Higher score means less pressure. These terms are why a garden lot can look valuable to build on."
      >
        <TermCard
          id="term-far"
          title="Floor Area Ratio (FAR)"
          definition="FAR is how NYC measures how much building is allowed on a lot. Multiply lot area by FAR to get allowed indoor space. Unused FAR — sometimes called air rights — is what is allowed but not built yet."
          meaning="High unused FAR makes a lot more attractive to developers. It does not override Parks or parkland rules (Land Security). In this index, leftover FAR lowers the Development Pressure score."
          loading={loading}
          gardens={mostUnusedFar}
          examplesHeading="Highest unused FAR (up to 3 gardens)"
          metric={(g) => `unused FAR ${g.airRightsUnused.toFixed(2)} · allowed ${g.maxFAR.toFixed(2)} · ${g.sizeSqFt.toLocaleString()} sq ft`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-commercial-district"
          title="High-density commercial district"
          definition="NYC zoning districts say what a lot may be used for. C5 and C6 are high-density commercial districts, written for offices, stores, and other large buildings. Other C and mixed manufacturing districts also favor business over open space."
          meaning="Commercial zoning makes a garden lot look like a building site. The live profile currently records that zoning flag under Policy Support, because it is a land-use rule — while unused FAR, density, and parcels stay in Development Pressure."
          loading={loading}
          gardens={highDensityCommercial}
          examplesHeading="Commercial or mixed manufacturing zoning (up to 3 gardens)"
          metric={(g) => `${g.landUseZoning} · Development Pressure ${g.resilience.breakdown.developmentPressureScore}/25`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-surrounding-density"
          title="Surrounding building density"
          definition="Surrounding density is how tightly nearby lots are already built — high, moderate, or low. A packed block means leftover open land is scarce."
          meaning="In a high-density neighborhood, a garden can look like one of the last places a new building could go. That raises development pressure even if the garden itself is small."
          loading={loading}
          gardens={highSurroundingDensity}
          examplesHeading="High surrounding density (up to 3 gardens)"
          metric={(g) => `${surroundingDensity(g)} density · ${g.borough}`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-dev-parcel"
          title="Large development parcel"
          definition="A development parcel is a lot large enough for a substantial project, not a leftover sliver. This index treats a garden as near or on a large parcel when the lot is about 15,000 square feet or more, or unused FAR is 5 or higher."
          meaning="Large open parcels in active neighborhoods often attract housing or commercial proposals. Smaller or isolated lots are usually harder to turn into a big construction project."
          loading={loading}
          gardens={largeParcels}
          examplesHeading="On or near a large development parcel (up to 3 gardens)"
          metric={(g) => `${g.sizeSqFt.toLocaleString()} sq ft · unused FAR ${g.airRightsUnused.toFixed(2)}`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-dev-activity"
          title="Development activity"
          definition="Development activity tracks nearby signs of new building: construction, real-estate listings, RFPs, or surveyors. High means the land around the garden is already in demand."
          meaning="High activity raises pressure. Combined with a large parcel, it is a strong signal that the lot could attract a proposal. Parkland protection, if any, is scored under Land Security."
          loading={loading}
          gardens={highDevActivity}
          examplesHeading="High development activity (up to 3 gardens)"
          metric={(g) => `${developmentActivity(g)} activity · Development Pressure ${g.resilience.breakdown.developmentPressureScore}/25`}
          onOpenGarden={onOpenGarden}
        />
      </CategorySection>

      <CategorySection
        id="learn-land-security"
        icon={<Landmark className="w-4 h-4 text-emerald-600" />}
        title="Land Security"
        intro="The largest slice of the index (0–35). Scored on who holds the lot — not on the GreenThumb license."
      >
        <TermCard
          id="term-jurisdiction"
          title="Jurisdiction / who holds the land"
          definition="Jurisdiction is which agency or owner controls the lot: NYC Parks, HPD, NYCHA, a land trust, another city agency, or a private owner. Gardens started on leftover vacant lots, which is why this still varies."
          meaning="Parks or land-trust tenure is harder to undo. HPD and private lots sit closer to housing or sales. A GreenThumb license does not automatically make a garden parkland."
          loading={loading}
          gardens={lowestLand}
          metric={(g) => `${g.jurisdiction} · Land Security ${g.resilience.breakdown.landSecurityScore}/35`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-parkland"
          title="Parkland dedication"
          definition="Dedicated parkland in New York is land the city has set aside as park. Taking it for another use generally requires state legislation — a much higher bar than ending a license."
          meaning="Parkland is a Land Security fact. It does not erase nearby development pressure; it changes how hard the land is to take."
          loading={loading}
          gardens={pickExamples(gardens, (g) => g.resilience.breakdown.landSecurityScore, (g) =>
            g.jurisdiction === 'NYC Parks / GreenThumb'
          )}
          examplesHeading="Parks jurisdiction (up to 3 gardens)"
          metric={(g) => `Land Security ${g.resilience.breakdown.landSecurityScore}/35`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-hpd-pipeline"
          title="HPD housing pipeline"
          definition="The Department of Housing Preservation and Development owns some garden lots. HPD’s job is to produce housing, and it can offer lots through city disposition, including requests for proposals."
          meaning="A garden on HPD land is using the lot in the meantime. It is not removed from the housing pipeline, which is why those sites score low on Land Security."
          loading={loading}
          gardens={hpdLots}
          examplesHeading="HPD-owned gardens (up to 3 gardens)"
          metric={(g) => `Land Security ${g.resilience.breakdown.landSecurityScore}/35`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-nycha"
          title="NYCHA campus lot"
          definition="Some gardens sit on New York City Housing Authority campuses. NYCHA land is public, but it is housing land first."
          meaning="NYCHA can review infill or campus changes. The garden depends on housing plans, not parkland rules."
          loading={loading}
          gardens={nychaLots}
          examplesHeading="NYCHA gardens (up to 3 gardens)"
          metric={(g) => `Land Security ${g.resilience.breakdown.landSecurityScore}/35`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-private"
          title="Private owner / conservation restriction"
          definition="A private owner can sell, redevelop, or close a garden unless a conservation restriction or land-trust deed says otherwise. A land trust is the opposite: open-space ownership meant to last."
          meaning="No conservation restriction means weak Land Security. Trust ownership sits at the top of this category."
          loading={loading}
          gardens={privateLots}
          examplesHeading="Privately owned gardens (up to 3 gardens)"
          metric={(g) => `Land Security ${g.resilience.breakdown.landSecurityScore}/35`}
          onOpenGarden={onOpenGarden}
        />
      </CategorySection>

      <CategorySection
        id="learn-policy-support"
        icon={<Scale className="w-4 h-4 text-amber-600" />}
        title="Policy Support"
        intro="City permission and neighborhood land-use policy (0–20). A plus here is support, not ownership."
      >
        <TermCard
          id="term-license"
          title="GreenThumb license"
          definition="A GreenThumb license is the city’s current permission for volunteers to operate a garden on city land. Parks history notes the shift from cheap leases to licenses. Many gardens were designed as temporary."
          meaning="An active license is a Policy Support plus. Pending or none is a minus. A license is not parkland dedication."
          loading={loading}
          gardens={noGreenThumb}
          examplesHeading="No active GreenThumb license (up to 3 gardens)"
          metric={(g) => `${g.greenThumbStatus} · Policy Support ${g.resilience.breakdown.policySupportScore}/20`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-rezoning-corridor"
          title="High-density rezoning corridor"
          definition="Some zip codes in this index are treated as neighborhoods where the city has been changing what can be built — more housing or commercial floor area."
          meaning="That is a neighborhood-level Policy Support minus, not a finding about this garden’s own deed. The current list includes 10009, 10002, 10035, 11206, 11216, 10451, and 11101."
          loading={loading}
          gardens={rezoningCorridor}
          examplesHeading="In a listed rezoning-corridor zip (up to 3 gardens)"
          metric={(g) => `${g.zipCode} · Policy Support ${g.resilience.breakdown.policySupportScore}/20`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-parkland-policy"
          title="Parkland designation (policy act)"
          definition="When the City designates a lot as parkland, that is a policy choice: treat the site as park, not as a housing-disposition lot. It is stronger than a GreenThumb license, which is only permission to garden."
          meaning="The designation is Policy Support. Whether the land is actually hard to take (state legislation) is Land Security. Litigation can still be ongoing after a notice."
          loading={loading}
          gardens={pickExamples(gardens, (g) => g.resilience.breakdown.policySupportScore, (g) =>
            Boolean(g.isCurated && g.curatedEvidence?.policy?.some((item) => item.effect === 'plus'))
          )}
          examplesHeading="Hand-verified parkland policy plus (up to 3 gardens)"
          metric={(g) => `Policy Support ${g.resilience.breakdown.policySupportScore}/20`}
          onOpenGarden={onOpenGarden}
        />
      </CategorySection>

      <CategorySection
        id="learn-community-strength"
        icon={<Users className="w-4 h-4 text-purple-600" />}
        title="Community Strength"
        intro="Whether people are present (0–20) — the original Green Guerillas idea, not zoning math."
      >
        <TermCard
          id="term-steward"
          title="Steward group"
          definition="A steward is the organized volunteer group that maintains the garden — a 501(c)(3), block association, or housing sponsor. NYC gardens were built by volunteers, not by a Parks construction program."
          meaning="A named steward raises Community Strength. Stewardship is not a land title; tenure is Land Security."
          loading={loading}
          gardens={noSteward}
          examplesHeading="No steward listed (up to 3 gardens)"
          metric={(g) => `Community Strength ${g.resilience.breakdown.communityStrengthScore}/20`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-crowdsource"
          title="Crowdsourced threat reports"
          definition="Neighbors and volunteers can file alerts when they see pressure on a garden. Each active report lowers Community Strength. It is local intelligence, not a city permit."
          meaning="No report on file does not prove the site is safe; it is a neutral baseline. A steward group is scored separately."
          loading={loading}
          gardens={lowestCommunity}
          examplesHeading="Lowest Community Strength (up to 3 gardens)"
          metric={(g) => `Community Strength ${g.resilience.breakdown.communityStrengthScore}/20`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-surveyors"
          title="Site visit / surveyors"
          definition="Surveyors or unexpected site visits can mean someone is measuring the lot for a project. In this index that is a crowdsourced threat category, and it can also raise development-activity under Development Pressure."
          meaning="A surveyor report is a community alert. It does not by itself change who owns the land."
          loading={loading}
          gardens={lowestCommunity}
          examplesHeading="Lowest Community Strength (up to 3 gardens)"
          metric={(g) => `Community Strength ${g.resilience.breakdown.communityStrengthScore}/20`}
          onOpenGarden={onOpenGarden}
        />
        <TermCard
          id="term-rfp"
          title="Real estate listing / RFP"
          definition="An RFP (request for proposals) or a listing means the lot — or land near it — is being offered for development. That is another crowdsourced threat category."
          meaning="A listing or RFP report lowers Community Strength and can mark development activity as high. HPD disposition of the same lot is also a Land Security issue."
          loading={loading}
          gardens={lowestCommunity}
          examplesHeading="Lowest Community Strength (up to 3 gardens)"
          metric={(g) => `Community Strength ${g.resilience.breakdown.communityStrengthScore}/20`}
          onOpenGarden={onOpenGarden}
        />
      </CategorySection>
    </div>
  );
};

function CategorySection({
  id,
  icon,
  title,
  intro,
  children
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="space-y-4 scroll-mt-24">
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-base font-bold text-slate-900">{title}</h3>
        </div>
        <p className="text-sm text-slate-600 mt-1">{intro}</p>
      </div>
      {children}
    </section>
  );
}

function TermCard({
  id,
  title,
  definition,
  meaning,
  loading,
  gardens,
  metric,
  examplesHeading = 'Lowest resilience on this idea (up to 3 gardens)',
  onOpenGarden
}: {
  id: string;
  title: string;
  definition: string;
  meaning: string;
  loading: boolean;
  gardens: EnrichedGarden[];
  metric: (garden: EnrichedGarden) => string;
  examplesHeading?: string;
  onOpenGarden: (gardenId: string, sectionId: string, sectionLabel: string) => void;
}) {
  return (
    <article id={id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 scroll-mt-24">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <div className="space-y-2 text-sm text-slate-600 leading-relaxed">
        <p>{definition}</p>
        <p>{meaning}</p>
      </div>

      <div>
        <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{examplesHeading}</h5>
        {loading ? (
          <p className="text-xs text-slate-400">Loading live garden scores…</p>
        ) : gardens.length === 0 ? (
          <p className="text-xs text-slate-400">No live examples match this term yet.</p>
        ) : (
          <ul className="space-y-2">
            {gardens.map((garden) => (
              <li key={garden.id}>
                <button
                  type="button"
                  onClick={() => onOpenGarden(garden.id, id, title)}
                  className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-slate-900">{garden.name}</div>
                      <div className="text-xs text-slate-500">
                        {garden.borough} · {metric(garden)}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-emerald-700 inline-flex items-center gap-1 shrink-0">
                      Open profile <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </article>
  );
}
