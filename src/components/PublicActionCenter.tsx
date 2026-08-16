import React, { useState, useEffect } from 'react';
import { Garden, GardenResilienceScore, PublicAction } from '../types';
import { Megaphone, Users, FileText, AlertTriangle, Check, ShieldAlert, HeartHandshake, Sparkles, Send, Copy, ThumbsUp } from 'lucide-react';

export const PublicActionCenter: React.FC = () => {
  const [gardens, setGardens] = useState<(Garden & { resilience: GardenResilienceScore })[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [sortBy, setSortBy] = useState<string>('score_asc');
  const [activeModalAction, setActiveModalAction] = useState<{ garden: Garden; action: PublicAction } | null>(null);

  // Form states for active public actions
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [signerZip, setSignerZip] = useState('');
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [signedCount, setSignedCount] = useState<Record<string, number>>({});

  const fetchLowResilienceGardens = async () => {
    try {
      setLoading(true);
      // Fetch gardens sorted by lowest resilience score first
      const res = await fetch(`/api/gardens?sortBy=${sortBy}&limit=60`);
      const data = await res.json();
      setGardens(data.gardens || []);
    } catch (err) {
      console.error('Failed to fetch action center gardens:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLowResilienceGardens();
  }, [sortBy]);

  const handleTakeAction = (garden: Garden, action: PublicAction) => {
    setActiveModalAction({ garden, action });
    setActionSubmitted(false);
    setCopiedScript(false);
    setSignerName('');
    setSignerEmail('');
    setSignerZip('');
  };

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalAction) return;
    const actionId = activeModalAction.action.id;
    setSignedCount(prev => ({ ...prev, [actionId]: (prev[actionId] || 0) + 1 }));
    setActionSubmitted(true);
  };

  const handleCopyScript = (scriptText: string) => {
    navigator.clipboard.writeText(scriptText);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  // Filter actions based on category
  const filteredGardensWithActions = gardens.map(garden => {
    const actions = (garden.resilience.publicActions || []).filter(act => {
      if (selectedCategory === 'All') return true;
      return act.category === selectedCategory;
    });
    return { garden, actions };
  }).filter(item => item.actions.length > 0);

  return (
    <div className="space-y-6">
      {/* Hero Call To Action Header */}
      <div className="bg-gradient-to-r from-red-900 via-slate-900 to-amber-950 text-white p-6 rounded-2xl border border-red-950 shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 text-xs font-bold mb-3">
            <Megaphone className="w-3.5 h-3.5 animate-pulse text-red-400" />
            Public Advocacy & Mobilization Center
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Targeted Community Call to Action for At-Risk NYC Gardens
          </h2>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            Every call to action below is generated from a low score in Policy Support, Land Security, Development Pressure, or Community Strength.
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold bg-white p-3 rounded-xl border border-slate-200">
        <span className="text-slate-500 uppercase tracking-wider text-[10px] font-bold mr-1">Filter by score category:</span>
        {[
          { id: 'All', label: 'All categories' },
          { id: 'Low Policy Support', label: 'Policy Support' },
          { id: 'Low Land Security', label: 'Land Security' },
          { id: 'High Development Pressure', label: 'Development Pressure' },
          { id: 'Low Community Strength', label: 'Community Strength' }
        ].map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              selectedCategory === cat.id
                ? 'bg-slate-900 text-white font-bold shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="ml-auto px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-700"
        >
          <option value="score_asc">Total score: Low → High</option>
          <option value="score_desc">Total score: High → Low</option>
          <option value="policy_asc">Policy Support: Low → High</option>
          <option value="land_asc">Land Security: Low → High</option>
          <option value="pressure_asc">Development Pressure: Most pressure first</option>
          <option value="community_asc">Community Strength: Low → High</option>
        </select>
      </div>

      {/* Action List Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          Loading targeted public calls to action...
        </div>
      ) : filteredGardensWithActions.length === 0 ? (
        <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          No active public actions match the selected category filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGardensWithActions.map(({ garden, actions }) => {
            const score = garden.resilience.score;
            const level = garden.resilience.resilienceLevel;

            return (
              <div key={garden.id} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500">{garden.borough} • District {garden.councilDistrict}</span>
                        <span className="text-xs text-slate-400 font-mono">BBL: {garden.bbl}</span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">{garden.name}</h3>
                      <p className="text-xs text-slate-500">{garden.address}</p>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-black">
                        <span>Score {score}/100</span>
                      </div>
                      <div className="text-[10px] text-red-600 font-bold mt-0.5">{level}</div>
                    </div>
                  </div>

                  {/* Actions List */}
                  <div className="p-4 space-y-4">
                    {actions.map(act => {
                      const signatures = signedCount[act.id] || 0;
                      return (
                        <div key={act.id} className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                              {act.category}
                            </span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              {act.impactBoost}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-sm leading-snug">{act.title}</h4>

                          <p className="text-xs text-slate-600 leading-relaxed">{act.description}</p>

                          {/* Specific Reason Explaining Low Score */}
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold">Category Diagnosis: </span>
                              {act.specificReason}
                            </div>
                          </div>

                          <div className="pt-2 flex items-center justify-between gap-2 text-xs">
                            <span className="text-slate-500 text-[11px] font-medium">
                              Target: <strong className="text-slate-700">{act.targetAudience}</strong>
                            </span>

                            <button
                              onClick={() => handleTakeAction(garden, act)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs transition-all shadow-xs flex items-center gap-1.5 shrink-0"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {act.buttonLabel}
                              {signatures > 0 && <span className="bg-emerald-800 px-1.5 py-0.2 rounded-full text-[10px]">{signatures} taken</span>}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex justify-between items-center">
                  <span>Jurisdiction: <strong>{garden.jurisdiction}</strong></span>
                  <span>
                    P {garden.resilience.breakdown.policySupportScore}/20 · L {garden.resilience.breakdown.landSecurityScore}/35 · D {garden.resilience.breakdown.developmentPressureScore}/25 · C {garden.resilience.breakdown.communityStrengthScore}/20
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Action Modal */}
      {activeModalAction && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-slate-200 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-slate-900 text-white flex justify-between items-start">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeModalAction.action.category}
                </span>
                <h3 className="text-lg font-bold mt-1 text-white">{activeModalAction.action.title}</h3>
                <p className="text-xs text-slate-300">{activeModalAction.garden.name} • {activeModalAction.garden.address}</p>
              </div>
              <button
                onClick={() => setActiveModalAction(null)}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs font-bold text-slate-300"
              >
                Close
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-sm text-slate-700">
              {actionSubmitted ? (
                <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-lg font-black text-emerald-900">Thank You! Action Submitted Successfully</h4>
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    Your response has been registered for <strong>{activeModalAction.garden.name}</strong>. This official action strengthens the community advocacy log for City Council District {activeModalAction.garden.councilDistrict}.
                  </p>
                  <div className="pt-2">
                    <button
                      onClick={() => setActiveModalAction(null)}
                      className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-lg text-xs hover:bg-emerald-500"
                    >
                      Done
                    </button>
                  </div>
                </div>
              ) : activeModalAction.action.actionType === 'community_board' ? (
                /* Public Testimony Script Handler */
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900">
                    <strong>2-Minute Hearing Public Comment Script</strong> generated for {activeModalAction.garden.communityBoard}:
                  </div>

                  <div className="p-4 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 leading-relaxed relative">
                    <p className="mb-2">"Good evening Members of {activeModalAction.garden.communityBoard}. My name is [Your Name], resident of District {activeModalAction.garden.councilDistrict}."</p>
                    <p className="mb-2">"I am speaking today in strong defense of {activeModalAction.garden.name} located at {activeModalAction.garden.address} (Block {activeModalAction.garden.block}, Lot {activeModalAction.garden.lot})."</p>
                    <p className="mb-2">"This lot currently has a Land Security Score of only {activeModalAction.garden.resilience.breakdown.landSecurityScore}/35 pts due to its non-Parks municipal status under {activeModalAction.garden.jurisdiction}. It provides critical green infrastructure, food security, and storm absorption for our neighborhood."</p>
                    <p>"We urge the Community Board to pass a formal resolution requesting NYC Parks GreenThumb deed transfer and rejecting any disposition or commercial upzoning. Thank you."</p>

                    <button
                      onClick={() => handleCopyScript(`Good evening Members of ${activeModalAction.garden.communityBoard}. My name is [Your Name], resident of District ${activeModalAction.garden.councilDistrict}.\n\nI am speaking today in strong defense of ${activeModalAction.garden.name} located at ${activeModalAction.garden.address} (Block ${activeModalAction.garden.block}, Lot ${activeModalAction.garden.lot}).\n\nThis lot currently has a Land Security Score of only ${activeModalAction.garden.resilience.breakdown.landSecurityScore}/35 pts due to its non-Parks municipal status under ${activeModalAction.garden.jurisdiction}.\n\nWe urge the Community Board to pass a formal resolution requesting NYC Parks GreenThumb deed transfer and rejecting any disposition.`)}
                      className="mt-3 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedScript ? 'Copied Script to Clipboard!' : 'Copy Script to Clipboard'}
                    </button>
                  </div>

                  <form onSubmit={handleSubmitAction} className="pt-2 space-y-3">
                    <p className="text-xs text-slate-500 font-semibold">Pledge to attend & deliver testimony:</p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Your Name"
                        required
                        value={signerName}
                        onChange={e => setSignerName(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                      <input
                        type="email"
                        placeholder="Your Email"
                        required
                        value={signerEmail}
                        onChange={e => setSignerEmail(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      />
                    </div>
                    <button type="submit" className="w-full py-2 bg-slate-900 text-white font-bold rounded-lg text-xs hover:bg-slate-800">
                      Pledge Hearing Testimony
                    </button>
                  </form>
                </div>
              ) : (
                /* Standard Petition / Volunteer Form */
                <form onSubmit={handleSubmitAction} className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                    <strong>Action Details:</strong> {activeModalAction.action.description}
                  </div>

                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900">
                    <strong>Why this specific action?</strong> {activeModalAction.action.specificReason}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="Jane Doe"
                        value={signerName}
                        onChange={e => setSignerName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                        <input
                          type="email"
                          required
                          placeholder="jane@example.com"
                          value={signerEmail}
                          onChange={e => setSignerEmail(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">NYC Zip Code</label>
                        <input
                          type="text"
                          required
                          placeholder={activeModalAction.garden.zipCode}
                          value={signerZip}
                          onChange={e => setSignerZip(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                  >
                    <Send className="w-4 h-4" />
                    Submit {activeModalAction.action.buttonLabel}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
