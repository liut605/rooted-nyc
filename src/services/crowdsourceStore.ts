import fs from 'fs';
import path from 'path';
import { CrowdsourcedReport } from '../types';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const FILE_PATH = path.join(DATA_DIR, 'crowdsourced_reports.json');

const INITIAL_REPORTS: CrowdsourcedReport[] = [
  {
    id: 'REP-001',
    gardenId: 'M003',
    timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
    reporterRole: 'Garden Steward',
    threatCategory: 'Site Visit / Surveyors Seen',
    title: 'City surveyors spotted taking lot measurements',
    description: 'Two land surveyors with NYC HPD badges were measuring the east fence boundary on Wednesday morning and asking about parcel access.',
    verificationCount: 4,
    isVerified: true
  },
  {
    id: 'REP-002',
    gardenId: 'B002',
    timestamp: new Date(Date.now() - 3600000 * 24 * 5).toISOString(),
    reporterRole: 'Neighbor',
    threatCategory: 'Real Estate Listing / RFP',
    title: 'Landlord listed adjacent lot on LoopNet',
    description: 'Private lot owner listed 354 Stockton St as potential residential teardown development assemblage.',
    verificationCount: 8,
    isVerified: true
  },
  {
    id: 'REP-003',
    gardenId: 'X001',
    timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
    reporterRole: 'Community Board Member',
    threatCategory: 'Rezoning / ULURP Mention',
    title: 'Mott Haven Rezoning Study discussed in CB1 Land Use agenda',
    description: 'Community Board 1 Land Use subcommittee agenda lists E 138th St parcels for affordable housing upzoning review.',
    verificationCount: 3,
    isVerified: false
  }
];

export class CrowdsourceStore {
  private reports: CrowdsourcedReport[] = [];

  constructor() {
    if (!process.env.VERCEL) {
      this.ensureDirectoryAndFile();
    }
    this.loadReports();
  }

  private ensureDirectoryAndFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (!fs.existsSync(FILE_PATH)) {
        fs.writeFileSync(FILE_PATH, JSON.stringify(INITIAL_REPORTS, null, 2), 'utf-8');
      }
    } catch (err) {
      console.warn('Unable to initialize JSON store filesystem, relying on memory:', err);
    }
  }

  private loadReports() {
    if (process.env.VERCEL) {
      this.reports = [...INITIAL_REPORTS];
      return;
    }
    try {
      if (fs.existsSync(FILE_PATH)) {
        const raw = fs.readFileSync(FILE_PATH, 'utf-8').trim();
        if (!raw) {
          this.reports = [...INITIAL_REPORTS];
          this.saveReports();
          return;
        }
        this.reports = JSON.parse(raw);
      } else {
        this.reports = [...INITIAL_REPORTS];
      }
    } catch (err) {
      console.error('Failed to parse crowdsourced_reports.json, using fallback:', err);
      this.reports = [...INITIAL_REPORTS];
      this.saveReports();
    }
  }

  private saveReports() {
    if (process.env.VERCEL) return;
    try {
      fs.writeFileSync(FILE_PATH, JSON.stringify(this.reports, null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to save reports to disk:', err);
    }
  }

  public getReportsForGarden(gardenId: string): CrowdsourcedReport[] {
    return this.reports.filter(r => r.gardenId === gardenId);
  }

  public getAllReports(): CrowdsourcedReport[] {
    return [...this.reports];
  }

  public addReport(data: Omit<CrowdsourcedReport, 'id' | 'timestamp' | 'verificationCount' | 'isVerified'>): CrowdsourcedReport {
    const newReport: CrowdsourcedReport = {
      ...data,
      id: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      verificationCount: 1,
      isVerified: false
    };

    this.reports.unshift(newReport);
    this.saveReports();
    return newReport;
  }

  public verifyReport(reportId: string): CrowdsourcedReport | null {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) return null;

    report.verificationCount += 1;
    if (report.verificationCount >= 3) {
      report.isVerified = true;
    }
    this.saveReports();
    return report;
  }
}
