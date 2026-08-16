import React, { useState, useEffect } from 'react';
import { Garden, CrowdsourcedReport, GardenResilienceScore } from '../types';
import { MessageSquarePlus, CheckCircle2, ShieldAlert, Send } from 'lucide-react';

export const CrowdsourceTester: React.FC = () => {
  const [gardens, setGardens] = useState<(Garden & { resilience?: GardenResilienceScore })[]>([]);
  const [selectedGardenId, setSelectedGardenId] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('score_asc');
  const [reports, setReports] = useState<CrowdsourcedReport[]>([]);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [reporterRole, setReporterRole] = useState<'Garden Steward' | 'Neighbor' | 'Community Board Member' | 'Volunteer' | 'Concerned Citizen'>('Garden Steward');
  const [threatCategory, setThreatCategory] = useState<any>('Site Visit / Surveyors Seen');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    fetch(`/api/gardens?limit=50&sortBy=${sortBy}`)
      .then(res => res.json())
      .then(data => {
        if (data.gardens && data.gardens.length > 0) {
          setGardens(data.gardens);
          setSelectedGardenId(prev => prev || data.gardens[0].id);
        }
      });
  }, [sortBy]);

  const fetchReportsForGarden = async (id: string) => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/gardens/${id}`);
      const data = await res.json();
      setReports(data.crowdsourcedReports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedGardenId) {
      fetchReportsForGarden(selectedGardenId);
    }
  }, [selectedGardenId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGardenId || !title || !description) return;

    try {
      setSubmitting(true);
      setSuccessMsg('');
      const res = await fetch(`/api/gardens/${selectedGardenId}/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reporterRole,
          threatCategory,
          title,
          description,
          sourceUrl: sourceUrl || undefined
        })
      });

      if (!res.ok) throw new Error('Failed to submit report');
      const data = await res.json();
      setSuccessMsg(`Report added! Garden score updated to ${data.updatedVulnerability.score} (${data.updatedVulnerability.riskLevel}).`);
      setTitle('');
      setDescription('');
      setSourceUrl('');
      await fetchReportsForGarden(selectedGardenId);
    } catch (err: any) {
      alert('Error submitting report: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (reportId: string) => {
    try {
      await fetch(`/api/gardens/${selectedGardenId}/reports/${reportId}/verify`, {
        method: 'POST'
      });
      await fetchReportsForGarden(selectedGardenId);
    } catch (err) {
      console.error('Failed to verify:', err);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column: Form Tester */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
            <MessageSquarePlus className="w-5 h-5 text-purple-600" /> "Know Something We Don't?" Crowdsource API Tester
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Test POST endpoint <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">/api/gardens/:id/reports</code>
          </p>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg font-medium">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Target Community Garden</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full mb-2 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="score_asc">Sort gardens: Total score Low → High</option>
              <option value="score_desc">Sort gardens: Total score High → Low</option>
              <option value="policy_asc">Sort by Policy Support (low first)</option>
              <option value="land_asc">Sort by Land Security (low first)</option>
              <option value="pressure_asc">Sort by Development Pressure (most pressure first)</option>
              <option value="community_asc">Sort by Community Strength (low first)</option>
              <option value="name_asc">Sort by name A → Z</option>
            </select>
            <select
              value={selectedGardenId}
              onChange={e => setSelectedGardenId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              {gardens.map(g => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.resilience
                    ? ` — P ${g.resilience.breakdown.policySupportScore}/20 · L ${g.resilience.breakdown.landSecurityScore}/35 · D ${g.resilience.breakdown.developmentPressureScore}/25 · C ${g.resilience.breakdown.communityStrengthScore}/20`
                    : ` (${g.borough})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Reporter Role</label>
              <select
                value={reporterRole}
                onChange={e => setReporterRole(e.target.value as any)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="Garden Steward">Garden Steward</option>
                <option value="Neighbor">Neighbor</option>
                <option value="Community Board Member">Community Board Member</option>
                <option value="Volunteer">Volunteer</option>
                <option value="Concerned Citizen">Concerned Citizen</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Threat Category</label>
              <select
                value={threatCategory}
                onChange={e => setThreatCategory(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="Site Visit / Surveyors Seen">Site Visit / Surveyors Seen</option>
                <option value="Lease Renewal Issue">Lease Renewal Issue</option>
                <option value="Rezoning / ULURP Mention">Rezoning / ULURP Mention</option>
                <option value="Real Estate Listing / RFP">Real Estate Listing / RFP</option>
                <option value="Community Board Hearing">Community Board Hearing</option>
                <option value="Other Threat Alert">Other Threat Alert</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alert Title</label>
            <input
              type="text"
              placeholder="e.g. Surveyors spotted taking site photos"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Detailed Description / Intelligence</label>
            <textarea
              rows={3}
              placeholder="Provide context on who was seen, what was mentioned in meeting, or lease expiration notice received..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Source URL (Optional)</label>
            <input
              type="text"
              placeholder="https://..."
              value={sourceUrl}
              onChange={e => setSourceUrl(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'Submitting Threat Alert...' : 'Submit Crowdsourced Intelligence Alert'}
          </button>
        </form>
      </div>

      {/* Right Column: Active Reports for Garden */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-lg">Active Crowdsourced Alerts ({reports.length})</h3>
          <p className="text-xs text-slate-500">Live community reports affecting vulnerability calculations</p>
        </div>

        {loading ? (
          <div className="p-4 text-center text-slate-400 text-xs">Loading alerts...</div>
        ) : reports.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg">
            No active threat alerts for this garden yet. Use the form on the left to test submitting one!
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(rep => (
              <div key={rep.id} className="p-4 rounded-lg bg-purple-50/50 border border-purple-100 text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{rep.title}</span>
                    <span className="text-slate-500 text-[11px]">
                      Reported by {rep.reporterRole} • {new Date(rep.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded font-bold ${
                      rep.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                    }`}
                  >
                    {rep.isVerified ? 'Verified Threat' : 'Unverified'}
                  </span>
                </div>

                <p className="text-slate-700">{rep.description}</p>

                <div className="pt-2 flex justify-between items-center border-t border-purple-100/80">
                  <span className="text-slate-500 text-[11px] font-mono">
                    Verifications: {rep.verificationCount}
                  </span>
                  <button
                    onClick={() => handleVerify(rep.id)}
                    className="px-2.5 py-1 bg-white border border-purple-200 text-purple-700 hover:bg-purple-100 rounded font-bold flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Confirm / Upvote Alert
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
