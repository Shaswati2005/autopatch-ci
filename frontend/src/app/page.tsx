'use client';

import React, { useState, useEffect } from 'react';

interface TraceStep {
  step_id: string;
  stage: string;
  timestamp: string;
  title: string;
  detail: string;
  payload?: Record<string, string>;
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchRuns = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/runs`);
      const data = await res.json();
      if (data.runs && data.runs.length > 0) {
        setRuns(data.runs);
        if (!selectedRun) {
          setSelectedRun(data.runs[data.runs.length - 1]);
        }
      }
    } catch (err) {
      console.warn('API fetch warning:', err);
    }
  };

  const fetchTraces = async (runId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/traces/${runId}`);
      const data = await res.json();
      setTraces(data.traces || []);
    } catch (err) {
      console.warn('Traces fetch warning:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRun) {
      fetchTraces(selectedRun);
      const interval = setInterval(() => fetchTraces(selectedRun), 2000);
      return () => clearInterval(interval);
    }
  }, [selectedRun]);

  const handleTriggerDemo = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/api/trigger-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: 'acme/autopatch-demo',
          branch: 'main',
          workflow_name: 'CI / Pytest Suite'
        })
      });
      const data = await res.json();
      if (data.run_id) {
        setSelectedRun(data.run_id);
        fetchRuns();
      }
    } catch (err) {
      alert('Failed to trigger demo backend service.');
    } finally {
      setTriggering(false);
    }
  };

  const prStep = traces.find((t) => t.stage === 'PR_CREATED');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
      {/* Left Panel: Event Stream & Trigger Control */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center justify-between">
            <span>⚡ Interactive Trigger</span>
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Simulate an incoming GitHub Actions pipeline build failure event to trigger Gemini self-healing pipeline.
          </p>
          <button
            onClick={handleTriggerDemo}
            disabled={triggering}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-semibold py-2.5 px-4 rounded-lg transition-all text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950"
          >
            {triggering ? 'Triggering Build Failure...' : '🚀 Trigger Simulated CI Build Failure'}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-3">
            📋 Processed Workflow Runs ({runs.length})
          </h2>
          {runs.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-800 rounded-lg">
              No active runs logged yet. Click the trigger button above to initiate.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {runs.slice().reverse().map((runId) => (
                <button
                  key={runId}
                  onClick={() => setSelectedRun(runId)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    selectedRun === runId
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="font-mono">Run #{runId}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">Processed</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center & Right Panel: Agent Reasoning Trace & PR Card */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                🧠 Agent Reasoning & Pipeline Trace
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Target Run ID: <span className="font-mono text-emerald-400">{selectedRun || 'None Selected'}</span>
              </p>
            </div>
            {prStep && (
              <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-xs font-semibold">
                ✓ Auto-Healed & PR Created
              </span>
            )}
          </div>

          {loading && traces.length === 0 ? (
            <div className="text-xs text-slate-400 py-12 text-center">Loading agent execution steps...</div>
          ) : traces.length === 0 ? (
            <div className="text-xs text-slate-500 py-12 text-center border border-dashed border-slate-800 rounded-xl">
              Select or trigger a workflow run to inspect Gemini reasoning steps.
            </div>
          ) : (
            <div className="space-y-4">
              {traces.map((step, idx) => (
                <div
                  key={step.step_id || idx}
                  className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-mono text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-200">{step.title}</h3>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      {step.stage}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 ml-9 leading-relaxed">{step.detail}</p>
                  {step.payload && Object.keys(step.payload).length > 0 && (
                    <div className="mt-3 ml-9 p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                      {Object.entries(step.payload).map(([k, v]) => (
                        <div key={k} className="flex gap-2">
                          <span className="text-slate-500">{k}:</span>
                          <span className="text-emerald-400 break-all">{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PR Delivery Card */}
        {prStep && prStep.payload?.pr_url && (
          <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2">
                  🎉 GitHub Pull Request Delivered
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Code fix and regression unit test verified in Cloud Build and delivered directly to target repository.
                </p>
              </div>
              <a
                href={prStep.payload.pr_url}
                target="_blank"
                rel="noreferrer"
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs transition-all shadow-md"
              >
                View Pull Request on GitHub ↗
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
