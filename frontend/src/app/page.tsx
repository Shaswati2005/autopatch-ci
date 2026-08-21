'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, StreamStatus } from '../components/ConnectionStatus';
import { PipelineTimeline } from '../components/PipelineTimeline';
import { PullRequestCard } from '../components/PullRequestCard';
import { RunSidebar, PRESETS } from '../components/RunSidebar';

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
    [key: string]: unknown;
  };
}

export default function DashboardPage() {
  const [runs, setRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [repo, setRepo] = useState(PRESETS[0].repo);
  const [branch, setBranch] = useState(PRESETS[0].branch);
  const eventSourceRef = useRef<EventSource | null>(null);
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/runs`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.runs) && data.runs.length > 0) {
        setRuns(data.runs);
        setSelectedRun((prev) => prev ?? data.runs[data.runs.length - 1]);
      }
    } catch { /* silent */ }
  }, [API_BASE]);

  const fetchTraces = useCallback(async (runId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/traces/${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      setTraces(data.traces ?? []);
      setStreamStatus('polling');
    } catch {
      setStreamStatus('disconnected');
    } finally {
      setLoading(false);
    }
  }, [API_BASE]);

  useEffect(() => {
    if (!selectedRun) { setStreamStatus('idle'); return; }

    eventSourceRef.current?.close();
    setStreamStatus('connecting');
    fetchTraces(selectedRun);

    try {
      const es = new EventSource(`${API_BASE}/api/traces/${selectedRun}/stream`);
      eventSourceRef.current = es;

      es.addEventListener('trace', (e: MessageEvent) => {
        try {
          const step: TraceStep = JSON.parse(e.data);
          setTraces((prev) => {
            const exists = prev.some((t) => t.step_id === step.step_id);
            return exists ? prev.map((t) => (t.step_id === step.step_id ? step : t)) : [...prev, step];
          });
          setStreamStatus('streaming');
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('done', () => { setStreamStatus('idle'); es.close(); });
      es.onerror = () => { setStreamStatus('polling'); es.close(); };
    } catch {
      setStreamStatus('polling');
    }

    const pollInterval = setInterval(() => {
      fetchRuns();
      if (streamStatus !== 'streaming') fetchTraces(selectedRun);
    }, 2500);

    return () => {
      eventSourceRef.current?.close();
      clearInterval(pollInterval);
    };
  }, [selectedRun, API_BASE]);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 4000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  const handleScenarioChange = (i: number) => {
    setScenarioIndex(i);
    setRepo(PRESETS[i].repo);
    setBranch(PRESETS[i].branch);
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/api/trigger-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo, branch, workflow_name: PRESETS[scenarioIndex].workflow_name }),
      });
      const data = await res.json();
      if (data.run_id) {
        setTraces([]);
        setSelectedRun(data.run_id);
        fetchRuns();
      }
    } catch {
      alert('Could not reach backend. Is it running on port 8000?');
    } finally {
      setTriggering(false);
    }
  };

  const prStep = traces.find((t) => t.stage === 'PR_CREATED');

  return (
    <div className="flex gap-6" style={{ minHeight: 'calc(100vh - 56px - 48px)' }}>
      {/* Sidebar */}
      <aside className="w-72 flex-shrink-0 hidden lg:block">
        <RunSidebar
          runs={runs}
          selectedRun={selectedRun}
          onSelect={(id) => { setTraces([]); setSelectedRun(id); }}
          onRefresh={fetchRuns}
          onTrigger={handleTrigger}
          triggering={triggering}
          scenarioIndex={scenarioIndex}
          onScenarioChange={handleScenarioChange}
          repo={repo}
          branch={branch}
          onRepoChange={setRepo}
          onBranchChange={setBranch}
        />
      </aside>

      {/* Main Panel */}
      <main className="flex-1 min-w-0 flex flex-col gap-5">
        {/* Mobile trigger */}
        <div className="lg:hidden">
          <button
            onClick={handleTrigger}
            disabled={triggering}
            className="w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #a855f7)',
              color: '#fff',
              border: 'none',
              cursor: triggering ? 'not-allowed' : 'pointer',
            }}
            data-testid="trigger-btn"
          >
            {triggering ? 'Simulating...' : '⚡ Trigger CI Failure'}
          </button>
        </div>

        {/* Trace Panel */}
        <div
          className="rounded-2xl flex-1 flex flex-col"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
        >
          {/* Trace header */}
          <div
            className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div>
              <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
                Agent Reasoning Trace
              </h1>
              {selectedRun ? (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                  run/{selectedRun}
                </p>
              ) : (
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  Trigger a simulation to begin
                </p>
              )}
            </div>
            <ConnectionStatus status={streamStatus} runId={selectedRun} />
          </div>

          {/* Trace body */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading && traces.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-20" style={{ color: 'var(--text-muted)' }}>
                <div
                  className="w-6 h-6 rounded-full border-2 animate-spin-slow"
                  style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}
                />
                <span className="text-xs">Loading trace steps...</span>
              </div>
            ) : traces.length === 0 ? (
              <div className="flex flex-col items-center gap-4 py-20">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
                  style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                >
                  🤖
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    No active trace
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    Select a run from the sidebar or trigger a new simulation.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-0">
                <PipelineTimeline traces={traces} />
                {prStep?.payload?.pr_url && (
                  <div className="mt-6 animate-fade-in-up">
                    <PullRequestCard
                      prUrl={prStep.payload.pr_url}
                      prNumber={prStep.payload.pr_number as number | undefined}
                      branch={prStep.payload.branch}
                      repo={prStep.payload.repo}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
