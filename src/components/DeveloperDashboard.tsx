import React, { useEffect, useState } from 'react';
import { SummaryStats } from '../types';
import { ShieldAlert, Database, MapPin, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';

export const DeveloperDashboard: React.FC = () => {
  const [stats, setStats] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gardens/stats/summary');
      if (!res.ok) throw new Error('Failed to fetch stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      await fetch('/api/data/sync', { method: 'POST' });
      await fetchStats();
    } catch (err) {
      console.error('Failed to sync:', err);
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
        Loading resilience index & backend data streams...
      </div>
    );
  }

  const highResilience = stats?.highResilienceCount ?? 0;
  const criticalVulnerable = stats?.criticalVulnerabilityCount ?? 0;
  const vulnerable = stats?.vulnerableCount ?? 0;
  const total = stats?.totalGardens ?? 1;

  const boroughAverages = stats?.boroughResilienceAverage || (stats as any)?.boroughRiskAverage || {};
  const jurisdictionBreakdown = stats?.jurisdictionBreakdown || {};

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-900 text-white p-6 rounded-xl gap-4 border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              API Pipeline Active
            </span>
            <span className="text-xs text-slate-400">NYPL Hackathon Backend Engine</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white">NYC Community Gardens Resilience Index Engine</h2>
          <p className="text-sm text-slate-300">
            Open Data pipeline connecting NYC Parks, Socrata, Zoning, and Crowdsourced Intelligence
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50 shrink-0 shadow-xs"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing Open Data...' : 'Re-sync NYC Open Data'}
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-center text-slate-500 text-xs font-medium uppercase tracking-wider">
            Total Tracked Gardens
            <Database className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{stats?.totalGardens || 0}</div>
          <div className="text-xs text-slate-500 mt-1">Synced across 5 NYC Boroughs</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-xs">
          <div className="flex justify-between items-center text-emerald-700 text-xs font-medium uppercase tracking-wider">
            High Resilience Tier
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">{highResilience}</div>
          <div className="text-xs text-emerald-700 font-medium mt-1">
            {Math.round((highResilience / total) * 100)}% in the high-resilience band (80–100)
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-xs">
          <div className="flex justify-between items-center text-amber-700 text-xs font-medium uppercase tracking-wider">
            Vulnerable / High Pressure
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-extrabold text-amber-600 mt-2">{vulnerable}</div>
          <div className="text-xs text-slate-500 mt-1">Low Policy Support, Land Security, or high development pressure</div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-red-200 shadow-xs">
          <div className="flex justify-between items-center text-red-600 text-xs font-medium uppercase tracking-wider">
            Critical Vulnerability
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-3xl font-extrabold text-red-600 mt-2">{criticalVulnerable}</div>
          <div className="text-xs text-red-500 mt-1">Immediate intervention required</div>
        </div>
      </div>

      {/* Borough Resilience Averages & Jurisdiction Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-slate-600" /> Average Borough Resilience Index (0 - 100)
          </h3>
          <div className="space-y-3">
            {Object.entries(boroughAverages).map(([borough, scoreVal]) => {
              const score = Number(scoreVal) || 0;
              return (
                <div key={borough}>
                  <div className="flex justify-between text-xs font-medium text-slate-700 mb-1">
                    <span className="font-semibold">{borough}</span>
                    <span className={score >= 75 ? 'text-emerald-600 font-bold' : score >= 50 ? 'text-blue-600' : 'text-amber-600'}>
                      {score} / 100 Resilience
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <h3 className="text-base font-bold text-slate-900 mb-3">Land Jurisdiction Distribution</h3>
          <div className="space-y-2 text-xs">
            {Object.entries(jurisdictionBreakdown).map(([jur, count]) => (
              <div key={jur} className="flex justify-between items-center p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="font-medium text-slate-700">{jur}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-bold">{count as number} gardens</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
