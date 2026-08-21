'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, StreamStatus } from '../components/ConnectionStatus';
import { DiffViewer } from '../components/DiffViewer';
import { TerminalOutput } from '../components/TerminalOutput';
import { PullRequestCard } from '../components/PullRequestCard';

export interface TraceStep {
  step_id: string;
  stage: string;
  timestamp: string;
  title: string;
  detail: string;
  payload?: {
    diff?: string;
    target_file?: string;
    explanation?: string;
    test_output?: string;
    passed?: boolean | string;
    duration_s?: number | string;
    pr_url?: string;
    pr_number?: number | string;
    branch?: string;
    repo?: string;
    [key: string]: any;
  };
}

const FAILURE_PRESETS = [
  {
    name: 'Pytest IndexError (calculator.py)',
    repo: 'acme/autopatch-demo',
    branch: 'main',
    workflow_name: 'CI / Pytest Suite',
  },
  {
    name: 'TypeError in Auth Token Validator',
    repo: 'acme/auth-service',
    branch: 'main',
    workflow_name: 'CI / Auth Integration',
  },
  {
    name: 'Async Timeout in Worker Queue',
    repo: 'acme/queue-worker',
    branch: 'develop',
    workflow_name: 'CI / Worker E2E',
  },
];

export default function DashboardPage() {
  const [runs, setRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [triggering, setTriggering] = useState<boolean>(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [customRepo, setCustomRepo] = useState<string>(FAILURE_PRESETS[0].repo);
  const [customBranch, setCustomBranch] = useState<string>(FAILURE_PRESETS[0].branch);
  const [customWorkflow, setCustomWorkflow] = useState<string>(FAILURE_PRESETS[0].workflow_name);

  const eventSourceRef = useRef<EventSource | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/runs`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.runs && Array.isArray(data.runs) && data.runs.length > 0) {
        setRuns(data.runs);
        setSelectedRun((prev) => prev || data.runs[data.runs.length - 1]);
      }
    } catch (err) {
      console.warn('Runs fetch warning:', err);
    }
  }, [API_BASE]);

  const fetchTracesFallback = useCallback(async (runId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/traces/${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      setTraces(data.traces || []);
      setStreamStatus('polling');
    } catch (err) {
      console.warn('Traces fallback polling error:', err);
      setStreamStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  // Connect to SSE stream for the selected run with fallback to polling
  useEffect(() => {
    if (!selectedRun) {
      setStreamStatus('idle');
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStreamStatus('connecting');

    // Initial load
    fetchTracesFallback(selectedRun);

    // Attempt EventSource SSE streaming
    try {
      const es = new EventSource(`${API_BASE}/api/traces/${selectedRun}/stream`);
      eventSourceRef.current = es;

      es.addEventListener('trace', (e: MessageEvent) => {
        try {
          const step: TraceStep = JSON.parse(e.data);
          setTraces((prev) => {
            const exists = prev.some((t) => t.step_id === step.step_id || (t.title === step.title && t.stage === step.stage));
            if (exists) {
              return prev.map((t) => (t.step_id === step.step_id ? step : t));
            }
            return [...prev, step];
          });
          setStreamStatus('streaming');
        } catch (parseErr) {
          console.warn('Failed to parse SSE trace payload:', parseErr);
        }
      });

      es.addEventListener('done', () => {
        setStreamStatus('idle');
        es.close();
      });

      es.onerror = () => {
        // Fallback to polling mode if SSE fails or backend does not have SSE stream ready yet
        setStreamStatus('polling');
        es.close();
      };
    } catch {
      setStreamStatus('polling');
    }

    // Polling interval backup
    const pollInterval = setInterval(() => {
      fetchRuns();
      if (streamStatus !== 'streaming') {
        fetchTracesFallback(selectedRun);
      }
    }, 2500);

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      clearInterval(pollInterval);
    };
  }, [selectedRun, API_BASE, fetchRuns, fetchTracesFallback]);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 4000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const handlePresetSelect = (idx: number) => {
    setSelectedPreset(idx);
    setCustomRepo(FAILURE_PRESETS[idx].repo);
    setCustomBranch(FAILURE_PRESETS[idx].branch);
    setCustomWorkflow(FAILURE_PRESETS[idx].workflow_name);
  };

  const handleTriggerDemo = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/api/trigger-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: customRepo,
          branch: customBranch,
          workflow_name: customWorkflow,
        }),
      });
      const data = await res.json();
      if (data.run_id) {
        setSelectedRun(data.run_id);
        fetchRuns();
      }
    } catch (err) {
      alert('Failed to trigger simulated build failure on backend.');
    } finally {
      setTriggering(false);
    }
  };

  const prStep = traces.find((t) => t.stage === 'PR_CREATED');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 max-w-7xl mx-auto">
      {/* Left Panel: Trigger & Runs */}
      <div className="lg:col-span-4 space-y-5">
        {/* Interactive Trigger Panel */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>⚡ Interactive Trigger</span>
            </h2>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono">
              Demo Sandbox
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 font-medium">Failure Scenario Preset:</label>
            <select
              value={selectedPreset}
              onChange={(e) => handlePresetSelect(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-all font-mono"
            >
              {FAILURE_PRESETS.map((preset, idx) => (
                <option key={idx} value={idx}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Target Repo</label>
              <input
                type="text"
                value={customRepo}
                onChange={(e) => setCustomRepo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[11px] rounded px-2.5 py-1.5 font-mono outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-500 font-mono">Branch</label>
              <input
                type="text"
                value={customBranch}
                onChange={(e) => setCustomBranch(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-[11px] rounded px-2.5 py-1.5 font-mono outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            onClick={handleTriggerDemo}
            disabled={triggering}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-slate-950 font-bold py-2.5 px-4 rounded-lg transition-all text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950"
            data-testid="trigger-btn"
          >
            {triggering ? 'Simulating Pipeline Failure...' : '🚀 Trigger Simulated CI Failure'}
          </button>
        </div>

        {/* Processed Runs List */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              📋 Workflow Runs ({runs.length})
            </h2>
            <button
              onClick={fetchRuns}
              className="text-[10px] text-slate-400 hover:text-slate-200 underline font-mono"
            >
              Refresh
            </button>
          </div>

          {runs.length === 0 ? (
            <div className="text-xs text-slate-500 py-6 text-center border border-dashed border-slate-800 rounded-lg">
              No workflow runs logged yet. Click trigger above to start.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
              {runs.slice().reverse().map((runId) => (
                <button
                  key={runId}
                  onClick={() => setSelectedRun(runId)}
                  className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    selectedRun === runId
                      ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 font-medium'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                  data-testid={`run-item-${runId}`}
                >
                  <span className="font-mono">Run #{runId}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">
                    {selectedRun === runId ? 'ACTIVE' : 'READY'}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Observability Stream & Traces */}
      <div className="lg:col-span-8 space-y-5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                🧠 Agent Reasoning & Pipeline Trace
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Target Run: <span className="font-mono text-emerald-400 font-semibold">{selectedRun ? `#${selectedRun}` : 'None'}</span>
              </p>
            </div>
            <ConnectionStatus status={streamStatus} runId={selectedRun} />
          </div>

          {loading && traces.length === 0 ? (
            <div className="text-xs text-slate-400 py-16 text-center flex flex-col items-center gap-2">
              <span className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></span>
              Loading agent execution trace steps...
            </div>
          ) : traces.length === 0 ? (
            <div className="text-xs text-slate-500 py-16 text-center border border-dashed border-slate-800 rounded-xl">
              Select or trigger a workflow run to view real-time Gemini reasoning traces.
            </div>
          ) : (
            <div className="space-y-4">
              {traces.map((step, idx) => {
                const isPatch = step.stage === 'PATCH_GENERATED' && step.payload?.diff;
                const isVerification =
                  (step.stage === 'VERIFIED' || step.stage === 'VERIFICATION_PASSED' || step.stage === 'VERIFICATION_FAILED') &&
                  step.payload?.test_output;

                return (
                  <div
                    key={step.step_id || idx}
                    className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 transition-all hover:border-slate-700 shadow-md"
                    data-testid={`trace-step-${idx}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-emerald-400 border border-slate-700 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-200">{step.title}</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 font-medium">
                        {step.stage}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-2 ml-9 leading-relaxed">{step.detail}</p>

                    {/* Rich Diff Display */}
                    {isPatch && step.payload && (
                      <div className="ml-9">
                        <DiffViewer
                          diff={step.payload.diff!}
                          targetFile={step.payload.target_file}
                          explanation={step.payload.explanation}
                        />
                      </div>
                    )}

                    {/* Rich Terminal Output Display */}
                    {isVerification && step.payload && (
                      <div className="ml-9">
                        <TerminalOutput
                          output={step.payload.test_output!}
                          passed={Boolean(step.payload.passed ?? true)}
                          durationSeconds={Number(step.payload.duration_s || 0)}
                        />
                      </div>
                    )}

                    {/* Generic Payload Fallback */}
                    {!isPatch && !isVerification && step.payload && Object.keys(step.payload).length > 0 && (
                      <div className="mt-3 ml-9 p-3 bg-slate-900 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-300 space-y-1">
                        {Object.entries(step.payload).map(([k, v]) => (
                          <div key={k} className="flex gap-2">
                            <span className="text-slate-500">{k}:</span>
                            <span className="text-emerald-400 break-all">{String(v)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* PR Delivery Card */}
        {prStep && prStep.payload?.pr_url && (
          <PullRequestCard
            prUrl={prStep.payload.pr_url}
            prNumber={prStep.payload.pr_number}
            branch={prStep.payload.branch}
            repo={prStep.payload.repo}
          />
        )}
      </div>
    </div>
  );
}
