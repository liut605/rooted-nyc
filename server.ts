import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { NycOpenDataService } from './src/services/nycOpenData';
import { calculateGardenResilience } from './src/services/resilienceEngine';
import { CrowdsourceStore } from './src/services/crowdsourceStore';
import { getGardenVisualPool } from './src/services/gardenVisuals';
import { Borough, Jurisdiction, ResilienceLevel, SummaryStats } from './src/types';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Instantiate Core Services
  const openDataService = new NycOpenDataService();
  const crowdsourceStore = new CrowdsourceStore();

  // Listen with seed data first; Open Data + MapPLUTO can take minutes.
  void openDataService.fetchLiveGardens().catch((err) => {
    console.warn('Initial NYC Open Data sync warning:', err);
  });

  // -------------------------------------------------------------
  // REST API ENDPOINTS
  // -------------------------------------------------------------

  // 1. Health Check
  app.get('/api/health', (req: Request, res: Response) => {
    const gardens = openDataService.getCachedGardens();
    res.json({
      status: 'ok',
      service: 'NYC Community Gardens Resilience Index API',
      totalGardensInDatabase: gardens.length,
      lastSyncTime: openDataService.getLastSyncTime()
    });
  });

  // 2. Summary Statistics & Aggregated Metrics
  app.get('/api/gardens/stats/summary', (req: Request, res: Response) => {
    const gardens = openDataService.getCachedGardens();
    const allReports = crowdsourceStore.getAllReports();

    let highResilienceCount = 0;
    let moderateResilienceCount = 0;
    let vulnerableCount = 0;
    let criticalVulnerabilityCount = 0;

    const boroughSums: Record<Borough, { totalScore: number; count: number }> = {
      'Manhattan': { totalScore: 0, count: 0 },
      'Brooklyn': { totalScore: 0, count: 0 },
      'Queens': { totalScore: 0, count: 0 },
      'Bronx': { totalScore: 0, count: 0 },
      'Staten Island': { totalScore: 0, count: 0 }
    };

    const jurisdictionBreakdown: Record<string, number> = {};

    gardens.forEach(g => {
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
      'Manhattan': boroughSums['Manhattan'].count ? Math.round(boroughSums['Manhattan'].totalScore / boroughSums['Manhattan'].count) : 0,
      'Brooklyn': boroughSums['Brooklyn'].count ? Math.round(boroughSums['Brooklyn'].totalScore / boroughSums['Brooklyn'].count) : 0,
      'Queens': boroughSums['Queens'].count ? Math.round(boroughSums['Queens'].totalScore / boroughSums['Queens'].count) : 0,
      'Bronx': boroughSums['Bronx'].count ? Math.round(boroughSums['Bronx'].totalScore / boroughSums['Bronx'].count) : 0,
      'Staten Island': boroughSums['Staten Island'].count ? Math.round(boroughSums['Staten Island'].totalScore / boroughSums['Staten Island'].count) : 0
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

  // 3. Paginated & Filtered Garden Search
  app.get('/api/gardens', (req: Request, res: Response) => {
    const gardens = openDataService.getCachedGardens();

    const borough = req.query.borough as Borough | 'All' | undefined;
    const jurisdiction = req.query.jurisdiction as Jurisdiction | 'All' | undefined;
    const resilienceLevel = (req.query.resilienceLevel || req.query.riskLevel) as ResilienceLevel | 'All' | undefined;
    const search = (req.query.search as string || '').toLowerCase().trim();
    const minScore = req.query.minScore ? parseInt(req.query.minScore as string, 10) : undefined;
    const maxScore = req.query.maxScore ? parseInt(req.query.maxScore as string, 10) : undefined;
    const sortBy = (req.query.sortBy as string || 'score_desc');
    const page = Math.max(1, parseInt(req.query.page as string || '1', 10));
    const limit = Math.max(1, Math.min(2000, parseInt(req.query.limit as string || '20', 10)));

    // Calculate resilience and filter
    let enriched = gardens.map(g => {
      const reports = crowdsourceStore.getReportsForGarden(g.id);
      const resilience = calculateGardenResilience(g, reports);
      return {
        ...g,
        resilience
      };
    });

    if (borough && borough !== 'All') {
      enriched = enriched.filter(g => g.borough === borough);
    }

    if (jurisdiction && jurisdiction !== 'All') {
      enriched = enriched.filter(g => g.jurisdiction === jurisdiction);
    }

    if (resilienceLevel && resilienceLevel !== 'All') {
      enriched = enriched.filter(g => g.resilience.resilienceLevel === resilienceLevel);
    }

    if (search) {
      enriched = enriched.filter(g => 
        g.name.toLowerCase().includes(search) ||
        g.address.toLowerCase().includes(search) ||
        g.zipCode.includes(search) ||
        g.bbl.includes(search) ||
        g.communityBoard.toLowerCase().includes(search)
      );
    }

    if (minScore !== undefined) {
      enriched = enriched.filter(g => g.resilience.score >= minScore);
    }

    if (maxScore !== undefined) {
      enriched = enriched.filter(g => g.resilience.score <= maxScore);
    }

    // Sort
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
    const paginated = enriched.slice(startIndex, startIndex + limit);

    res.json({
      gardens: paginated,
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
    const gardens = openDataService.getCachedGardens();
    const garden = gardens.find(g => g.id === id || g.bbl === id || g.propID === id);

    if (!garden) {
      res.status(404).json({ error: `Garden with ID or BBL '${id}' not found.` });
      return;
    }

    const visuals = getGardenVisualPool(garden.id, garden.propID ? [garden.propID] : []);
    res.json({ gardenId: garden.id, name: garden.name, visuals });
  });

  // 4. Get Single Garden Detail & Reports
  app.get('/api/gardens/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const gardens = openDataService.getCachedGardens();
    const garden = gardens.find(g => g.id === id || g.bbl === id);

    if (!garden) {
      res.status(404).json({ error: `Garden with ID or BBL '${id}' not found.` });
      return;
    }

    const reports = crowdsourceStore.getReportsForGarden(garden.id);
    const resilience = calculateGardenResilience(garden, reports);

    res.json({
      ...garden,
      resilience,
      crowdsourcedReports: reports,
      visuals: getGardenVisualPool(garden.id, garden.propID ? [garden.propID] : [])
    });
  });

  // 5. Submit Crowdsourced Intelligence Alert
  app.post('/api/gardens/:id/reports', (req: Request, res: Response) => {
    const { id } = req.params;
    const { reporterRole, threatCategory, title, description, sourceUrl } = req.body;

    const gardens = openDataService.getCachedGardens();
    const garden = gardens.find(g => g.id === id || g.bbl === id);

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
      reporterRole: reporterRole || 'Neighbor',
      threatCategory,
      title,
      description,
      sourceUrl
    });

    const updatedReports = crowdsourceStore.getReportsForGarden(garden.id);
    const updatedResilience = calculateGardenResilience(garden, updatedReports);

    res.status(201).json({
      message: 'Crowdsourced community threat alert submitted successfully.',
      report: newReport,
      updatedResilience
    });
  });

  // 6. Upvote / Verify a Crowdsourced Report
  app.post('/api/gardens/:id/reports/:reportId/verify', (req: Request, res: Response) => {
    const { reportId } = req.params;
    const updatedReport = crowdsourceStore.verifyReport(reportId);

    if (!updatedReport) {
      res.status(404).json({ error: `Report with ID '${reportId}' not found.` });
      return;
    }

    res.json({
      message: 'Report verification recorded.',
      report: updatedReport
    });
  });

  // 7. Manual Sync Trigger with NYC Open Data API
  app.post('/api/data/sync', async (req: Request, res: Response) => {
    try {
      const syncedGardens = await openDataService.fetchLiveGardens();
      res.json({
        message: 'Successfully refreshed NYC Open Data API feeds.',
        totalGardens: syncedGardens.length,
        syncedAt: openDataService.getLastSyncTime()
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to sync with NYC Open Data API', details: err.message });
    }
  });

  // -------------------------------------------------------------
  // VITE / STATIC MIDDLEWARE
  // -------------------------------------------------------------
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`NYC Community Gardens Resilience Index API running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
