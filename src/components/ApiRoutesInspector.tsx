import React, { useState } from 'react';
import { Terminal, Play, Copy, Check } from 'lucide-react';

interface RouteDefinition {
  method: 'GET' | 'POST';
  path: string;
  description: string;
  sampleBody?: any;
}

const API_ROUTES: RouteDefinition[] = [
  {
    method: 'GET',
    path: '/api/health',
    description: 'System health check and database status.'
  },
  {
    method: 'GET',
    path: '/api/gardens/stats/summary',
    description: 'Aggregated vulnerability stats, borough risk averages, and jurisdiction breakdowns.'
  },
  {
    method: 'GET',
    path: '/api/gardens?limit=10&borough=Manhattan&sortBy=land_asc',
    description: 'Query gardens with calculated scores. sortBy accepts total score or Policy / Land Security / Development Pressure / Community Strength.'
  },
  {
    method: 'GET',
    path: '/api/gardens/M001',
    description: 'Detailed garden profile by ID or BBL with risk breakdown and crowdsourced reports.'
  },
  {
    method: 'POST',
    path: '/api/gardens/M001/reports',
    description: 'Submit crowdsourced community threat alert ("Know something that we don\'t report").',
    sampleBody: {
      reporterRole: 'Garden Steward',
      threatCategory: 'Site Visit / Surveyors Seen',
      title: 'City surveyors spotted taking measurements',
      description: 'HPD surveyors seen measuring property lot boundary.'
    }
  },
  {
    method: 'POST',
    path: '/api/data/sync',
    description: 'Force manual sync refresh with Socrata NYC Open Data API.'
  }
];

export const ApiRoutesInspector: React.FC = () => {
  const [selectedRoute, setSelectedRoute] = useState<RouteDefinition>(API_ROUTES[0]);
  const [requestBody, setRequestBody] = useState<string>(
    selectedRoute.sampleBody ? JSON.stringify(selectedRoute.sampleBody, null, 2) : ''
  );
  const [responseJson, setResponseJson] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const handleSelectRoute = (route: RouteDefinition) => {
    setSelectedRoute(route);
    setRequestBody(route.sampleBody ? JSON.stringify(route.sampleBody, null, 2) : '');
    setResponseJson(null);
  };

  const executeRequest = async () => {
    setLoading(true);
    setResponseJson(null);
    try {
      const options: RequestInit = {
        method: selectedRoute.method,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      if (selectedRoute.method === 'POST' && requestBody.trim()) {
        options.body = requestBody;
      }

      const res = await fetch(selectedRoute.path, options);
      const data = await res.json();
      setResponseJson(data);
    } catch (err: any) {
      setResponseJson({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const copyEndpoint = () => {
    navigator.clipboard.writeText(`${window.location.origin}${selectedRoute.path}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Route List Sidebar */}
      <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
        <h3 className="font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4 text-slate-700" /> REST API Endpoints Overview
        </h3>

        <div className="space-y-1.5 text-xs">
          {API_ROUTES.map((route, idx) => {
            const isSelected = selectedRoute.path === route.path && selectedRoute.method === route.method;
            return (
              <button
                key={idx}
                onClick={() => handleSelectRoute(route)}
                className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      route.method === 'GET' ? 'bg-emerald-500 text-white' : 'bg-purple-600 text-white'
                    }`}
                  >
                    {route.method}
                  </span>
                  <span className="font-mono text-xs truncate">{route.path}</span>
                </div>
                <p className={`text-[11px] truncate ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {route.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Request & Response Console */}
      <div className="lg:col-span-7 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${
                  selectedRoute.method === 'GET' ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-800'
                }`}
              >
                {selectedRoute.method}
              </span>
              <span className="font-mono text-sm font-bold text-slate-900">{selectedRoute.path}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">{selectedRoute.description}</p>
          </div>

          <button
            onClick={copyEndpoint}
            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded flex items-center gap-1"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy URL'}
          </button>
        </div>

        {selectedRoute.method === 'POST' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">JSON Request Payload</label>
            <textarea
              rows={5}
              value={requestBody}
              onChange={e => setRequestBody(e.target.value)}
              className="w-full p-2.5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-lg border border-slate-700 focus:outline-none"
            />
          </div>
        )}

        <button
          onClick={executeRequest}
          disabled={loading}
          className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg text-xs transition-all flex items-center justify-center gap-2"
        >
          <Play className={`w-3.5 h-3.5 text-emerald-400 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Executing API Request...' : `Send ${selectedRoute.method} Request`}
        </button>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Live HTTP Response JSON</label>
          <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-lg border border-slate-800 max-h-[350px] overflow-y-auto min-h-[150px]">
            {loading ? (
              <span className="text-slate-500">Executing HTTP call...</span>
            ) : responseJson ? (
              <pre>{JSON.stringify(responseJson, null, 2)}</pre>
            ) : (
              <span className="text-slate-500">Click "Send Request" to test this API endpoint.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
