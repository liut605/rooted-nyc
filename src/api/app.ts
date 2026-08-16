import express, { Request, Response } from 'express';
import { NycOpenDataService } from '../services/nycOpenData';
import { calculateGardenResilience } from '../services/resilienceEngine';
import { CrowdsourceStore } from '../services/crowdsourceStore';
import { getGardenVisualPool, gardenHasVisuals } from '../services/gardenVisuals';
import { Borough, Jurisdiction, ResilienceLevel, SummaryStats } from '../types';

const SKIP_MAP_PLUTO = Boolean(process.env.VERCEL);

export function createApiApp() {
  const app = express();
  const openDataService = new NycOpenDataService();
  const crowdsourceStore = new CrowdsourceStore();

  const gardensReady = openDataService
    .fetchLiveGardens({ skipMapPluto: SKIP_MAP_PLUTO })
    .catch((err) => {
      console.warn('NYC Open Data sync warning:', err);
      return openDataService.getCachedGardens();
    });

  app.set('trust proxy', true);
  app.use(express.json());
  // Vercel rewrites /api/* onto this function and sometimes strip the /api prefix.
  // Do not rewrite local Vite URLs — that makes localhost serve HTML for every module.
  if (process.env.VERCEL) {
    app.use((req, _res, next) => {
      const url = req.url || '/';
      if (!url.startsWith('/api')) {
        req.url = `/api${url.startsWith('/') ? url : `/${url}`}`;
      }
      next();
    });
  }
  app.use(async (_req, _res, next) => {
    try {
      await Promise.race([
        gardensReady,
        new Promise((resolve) => setTimeout(resolve, 7000))
      ]);
    } catch {
      // Serve seed/cached gardens if the live fetch is slow or fails.
    }
    next();
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    const gardens = openDataService.getCachedGardens();
    res.json({
      status: 'ok',
      service: 'NYC Community Gardens Resilience Index API',
      totalGardensInDatabase: gardens.length,
      lastSyncTime: openDataService.getLastSyncTime()
    });
  });

  app.get('/api/gardens/stats/summary', (_req: Request, res: Response) => {
    const gardens = openDataService.getCachedGardens();
    const allReports = crowdsourceStore.getAllReports();

    let highResilienceCount = 0;
    let moderateResilienceCount = 0;
    let vulnerableCount = 0;
    let criticalVulnerabilityCount = 0;

    const boroughSums: Record<Borough, { totalScore: number; count: number }> = {
      Manhattan: { totalScore: 0, count: 0 },
      Brooklyn: { totalScore: 0, count: 0 },
      Queens: { totalScore: 0, count: 0 },
      Bronx: { totalScore: 0, count: 0 },
      'Staten Island': { totalScore: 0, count: 0 }
    };

    const jurisdictionBreakdown: Record<string, number> = {};

    gardens.forEach((g) => {
      const reports = crowdsourceStore.getReportsForGarden(g.id);
      const resObj = calculateGardenResilience(g, reports);

      if (resObj.resilienceLevel === 'High Resilience') highResilienceCount++;
      else if (resObj.resilienceLevel === 'Moderate Resilience') moderateResilienceCount++;
      else if (resObj.resilienceLevel === 'Vulnerable') vulnerableCount++;
      else criticalVulnerabilityCount++;

      if (boroughSums[g.borough]) {
        boroughSums[g.borough].totalScore += resObj.score;
        boroughSums[g.borough].count += 1;
      }

      jurisdictionBreakdown[g.jurisdiction] = (jurisdictionBreakdown[g.jurisdiction] || 0) + 1;
    });

    const boroughResilienceAverage: Record<Borough, number> = {
      Manhattan: boroughSums.Manhattan.count
        ? Math.round(boroughSums.Manhattan.totalScore / boroughSums.Manhattan.count)
        : 0,
      Brooklyn: boroughSums.Brooklyn.count
        ? Math.round(boroughSums.Brooklyn.totalScore / boroughSums.Brooklyn.count)
        : 0,
      Queens: boroughSums.Queens.count
        ? Math.round(boroughSums.Queens.totalScore / boroughSums.Queens.count)
        : 0,
      Bronx: boroughSums.Bronx.count ? Math.round(boroughSums.Bronx.totalScore / boroughSums.Bronx.count) : 0,
      'Staten Island': boroughSums['Staten Island'].count
        ? Math.round(boroughSums['Staten Island'].totalScore / boroughSums['Staten Island'].count)
        : 0
    };

    const stats: SummaryStats = {
      totalGardens: gardens.length,
      highResilienceCount,
      moderateResilienceCount,
      vulnerableCount,
      criticalVulnerabilityCount,
      boroughResilienceAverage,
      jurisdictionBreakdown,
      totalCrowdsourcedReports: allReports.length,
      lastSyncTime: openDataService.getLastSyncTime()
    };

    res.json(stats);
  });

  app.get('/api/gardens', (req: Request, res: Response) => {
    const gardens = openDataService.getCachedGardens();

    const borough = req.query.borough as Borough | 'All' | undefined;
    const jurisdiction = req.query.jurisdiction as Jurisdiction | 'All' | undefined;
    const resilienceLevel = (req.query.resilienceLevel || req.query.riskLevel) as
      | ResilienceLevel
      | 'All'
      | undefined;
    const search = ((req.query.search as string) || '').toLowerCase().trim();
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined;
    const maxScore = req.query.maxScore ? parseInt(req.query.maxScore as string, 10) : undefined;
    const sortBy = (req.query.sortBy as string) || 'score_desc';
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.max(1, Math.min(2000, parseInt((req.query.limit as string) || '20', 10)));

    let enriched = gardens.map((g) => {
      const reports = crowdsourceStore.getReportsForGarden(g.id);
      const resilience = calculateGardenResilience(g, reports);
      return {
        ...g,
        hasVisuals: gardenHasVisuals(g.id, g.propID ? [g.propID] : []),
        resilience,
      };
    });

    if (borough && borough !== 'All') enriched = enriched.filter((g) => g.borough === borough);
    if (jurisdiction && jurisdiction !== 'All') {
      enriched = enriched.filter((g) => g.jurisdiction === jurisdiction);
    }
    if (resilienceLevel && resilienceLevel !== 'All') {
      enriched = enriched.filter((g) => g.resilience.resilienceLevel === resilienceLevel);
    }
    if (search) {
      enriched = enriched.filter(
        (g) =>
          g.name.toLowerCase().includes(search) ||
          g.address.toLowerCase().includes(search) ||
          g.zipCode.includes(search) ||
          g.bbl.includes(search) ||
          g.communityBoard.toLowerCase().includes(search)
      );
    }
    if (minScore !== undefined) enriched = enriched.filter((g) => g.resilience.score >= minScore);
    if (maxScore !== undefined) enriched = enriched.filter((g) => g.resilience.score <= maxScore);

    enriched.sort((a, b) => {
      const bd = a.resilience.breakdown;
      const cd = b.resilience.breakdown;
      if (sortBy === 'score_desc') return b.resilience.score - a.resilience.score;
      if (sortBy === 'score_asc') return a.resilience.score - b.resilience.score;
      if (sortBy === 'policy_desc') return cd.policySupportScore - bd.policySupportScore;
      if (sortBy === 'policy_asc') return bd.policySupportScore - cd.policySupportScore;
      if (sortBy === 'land_desc') return cd.landSecurityScore - bd.landSecurityScore;
      if (sortBy === 'land_asc') return bd.landSecurityScore - cd.landSecurityScore;
      if (sortBy === 'pressure_desc') return cd.developmentPressureScore - bd.developmentPressureScore;
      if (sortBy === 'pressure_asc') return bd.developmentPressureScore - cd.developmentPressureScore;
      if (sortBy === 'community_desc') return cd.communityStrengthScore - bd.communityStrengthScore;
      if (sortBy === 'community_asc') return bd.communityStrengthScore - cd.communityStrengthScore;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'size_desc') return b.sizeSqFt - a.sizeSqFt;
      return b.resilience.score - a.resilience.score;
    });

    const total = enriched.length;
    const totalPages = Math.ceil(total / limit);
    const startIndex = (page - 1) * limit;

    res.json({
      gardens: enriched.slice(startIndex, startIndex + limit),
      total,
      page,
      totalPages,
      filtersApplied: {
        borough,
        jurisdiction,
        resilienceLevel,
        search: search || undefined,
        minScore,
        maxScore,
        sortBy,
        page,
        limit
      }
    });
  });

  app.get('/api/gardens/:id/visuals', (req: Request, res: Response) => {
    const { id } = req.params;
    const garden = openDataService
      .getCachedGardens()
      .find((g) => g.id === id || g.bbl === id || g.propID === id);

    if (!garden) {
      res.status(404).json({ error: `Garden with ID or BBL '${id}' not found.` });
      return;
    }

    res.json({
      gardenId: garden.id,
      name: garden.name,
      visuals: getGardenVisualPool(garden.id, garden.propID ? [garden.propID] : [])
    });
  });

  app.get('/api/gardens/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const garden = openDataService.getCachedGardens().find((g) => g.id === id || g.bbl === id);

    if (!garden) {
      res.status(404).json({ error: `Garden with ID or BBL '${id}' not found.` });
      return;
    }

    const reports = crowdsourceStore.getReportsForGarden(garden.id);
    res.json({
      ...garden,
      hasVisuals: gardenHasVisuals(garden.id, garden.propID ? [garden.propID] : []),
      resilience: calculateGardenResilience(garden, reports),
      crowdsourcedReports: reports,
      visuals: getGardenVisualPool(garden.id, garden.propID ? [garden.propID] : [])
    });
  });

  app.post('/api/gardens/:id/reports', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reporterName, reporterRole, threatCategory, title, description, sourceUrl } = req.body;
    const garden = openDataService.getCachedGardens().find((g) => g.id === id || g.bbl === id);

    if (!garden) {
      res.status(404).json({ error: `Garden with ID '${id}' not found.` });
      return;
    }
    if (!title || !description || !threatCategory) {
      res.status(400).json({ error: 'Missing required fields: threatCategory, title, description.' });
      return;
    }

    const newReport = crowdsourceStore.addReport({
      gardenId: garden.id,
      reporterName: typeof reporterName === 'string' && reporterName.trim() ? reporterName.trim() : undefined,
      reporterRole: reporterRole || 'Neighbor',
      threatCategory,
      title,
      description,
      sourceUrl
    });
    const updatedReports = crowdsourceStore.getReportsForGarden(garden.id);

    res.status(201).json({
      message: 'Crowdsourced community threat alert submitted successfully.',
      report: newReport,
      updatedResilience: calculateGardenResilience(garden, updatedReports)
    });
  });

  app.post('/api/gardens/:id/reports/:reportId/verify', (req: Request, res: Response) => {
    const updatedReport = crowdsourceStore.verifyReport(req.params.reportId);
    if (!updatedReport) {
      res.status(404).json({ error: `Report with ID '${req.params.reportId}' not found.` });
      return;
    }
    res.json({ message: 'Report verification recorded.', report: updatedReport });
  });

  app.post('/api/data/sync', async (_req: Request, res: Response) => {
    try {
      const syncedGardens = await openDataService.fetchLiveGardens({ skipMapPluto: SKIP_MAP_PLUTO });
      res.json({
        message: 'Successfully refreshed NYC Open Data API feeds.',
        totalGardens: syncedGardens.length,
        syncedAt: openDataService.getLastSyncTime()
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to sync with NYC Open Data API', details: err.message });
    }
  });

  app.use((err: unknown, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error('API error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
