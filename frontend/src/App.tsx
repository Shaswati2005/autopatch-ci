import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ConnectionStatus, StreamStatus } from './components/ConnectionStatus';
import { PipelineTimeline } from './components/PipelineTimeline';
import { PullRequestCard } from './components/PullRequestCard';
import { RunSidebar, PRESETS } from './components/RunSidebar';
import { TraceStep } from './types';

export type { TraceStep };

export default function App() {
  const [runs, setRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [repo, setRepo] = useState(PRESETS[0].repo);
  const [branch, setBranch] = useState(PRESETS[0].branch);
  const [customLog, setCustomLog] = useState<string>(PRESETS[0].raw_log || '');
  const eventSourceRef = useRef<EventSource | null>(null);

  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
    (typeof process !== 'undefined' && process.env && (process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL)) ||
    'http://localhost:8000';

  const fetchRuns = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/runs`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.runs)) {
        setRuns(data.runs);
        setSelectedRun((prev) => prev ?? (data.runs.length > 0 ? data.runs[data.runs.length - 1] : null));
      }
    } catch { /* silent */ }
  }, [API_BASE]);

  const fetchTraces = useCallback(async (runId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/traces/${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.traces)) {
        setTraces(data.traces);
      }
    } catch {
      setStreamStatus('disconnected');
    }
  }, [API_BASE]);

  // Initial runs fetch & background refresh
  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 4000);
    return () => clearInterval(interval);
  }, [fetchRuns]);

  // Real-time trace subscription per selected run
  useEffect(() => {
    if (!selectedRun) {
      setStreamStatus('idle');
      setTraces([]);
      return;
    }

    setLoading(true);
    setStreamStatus('connecting');

    // Fetch initial state
    fetchTraces(selectedRun).finally(() => setLoading(false));

    // Open real-time SSE stream
    try {
      const es = new EventSource(`${API_BASE}/api/traces/${selectedRun}/stream`);
      eventSourceRef.current = es;

      es.addEventListener('trace', (e: MessageEvent) => {
        try {
          const step: TraceStep = JSON.parse(e.data);
          setTraces((prev) => {
            const idx = prev.findIndex((t) => t.step_id === step.step_id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = step;
              return next;
            }
            return [...prev, step];
          });
          setStreamStatus('streaming');
        } catch { /* ignore parse errors */ }
      });

      es.addEventListener('done', () => {
        setStreamStatus('idle');
        es.close();
      });

      es.onerror = () => {
        setStreamStatus('polling');
        es.close();
      };
    } catch {
      setStreamStatus('polling');
    }

    // Fallback polling only when streaming is not active
    const pollTimer = setInterval(() => {
      if (!eventSourceRef.current || eventSourceRef.current.readyState === EventSource.CLOSED) {
        fetchTraces(selectedRun);
      }
    }, 3000);

    return () => {
      eventSourceRef.current?.close();
      clearInterval(pollTimer);
    };
  }, [selectedRun, API_BASE, fetchTraces]);

  const handleScenarioChange = (i: number) => {
    setScenarioIndex(i);
    setRepo(PRESETS[i].repo);
    setBranch(PRESETS[i].branch);
    setCustomLog(PRESETS[i].raw_log || '');
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/api/trigger-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          branch,
          workflow_name: PRESETS[scenarioIndex].workflow_name,
          raw_log: customLog || undefined,
        }),
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
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)', overflowX: 'hidden' }}>
      {/* Ambient background orbs — deep-space atmosphere */}
      <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: '-15%', left: '-10%',
          width: '60vw', height: '60vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)',
          animation: 'orbPulse 8s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', right: '-10%',
          width: '55vw', height: '55vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.06) 0%, transparent 70%)',
          animation: 'orbPulse 10s ease-in-out infinite 3s',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '30vw', height: '30vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(168,85,247,0.04) 0%, transparent 70%)',
          animation: 'orbPulse 12s ease-in-out infinite 6s',
        }} />
      </div>

      {/* Sticky header — glassmorphism */}
      <header
        style={{
          borderBottom: '1px solid var(--border)',
          background: 'rgba(6,6,12,0.80)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{
          position: 'absolute', bottom: -1, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent 0%, rgba(139,92,246,0.4) 30%, rgba(168,85,247,0.5) 50%, rgba(139,92,246,0.4) 70%, transparent 100%)',
        }} aria-hidden="true" />

        <div className="max-w-screen-2xl mx-auto px-6 h-14 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold animate-glow"
              style={{
                background: 'linear-gradient(135deg, #8b5cf6, #a855f7)',
                boxShadow: '0 0 20px rgba(139,92,246,0.45), 0 0 8px rgba(168,85,247,0.3)',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              ⚡
            </div>
            <div className="flex items-center gap-2">
              <span
                className="font-semibold text-sm"
                style={{
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em',
                }}
              >
                AutoPatch-CI
              </span>
              <span
                className="text-xs px-2 py-0.5 rounded-md font-medium"
                style={{
                  background: 'rgba(139,92,246,0.12)',
                  color: 'var(--accent-neon)',
                  border: '1px solid rgba(139,92,246,0.25)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                v0.1.0
              </span>
            </div>
          </div>

          {/* Right: Status + GitHub */}
          <div className="flex items-center gap-3">
            <div
              className="hidden sm:flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg"
              style={{
                background: 'rgba(74,222,128,0.06)',
                border: '1px solid rgba(74,222,128,0.18)',
                color: 'var(--text-secondary)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{
                background: 'var(--green-neon)',
                boxShadow: '0 0 6px rgba(74,222,128,0.8)',
                animation: 'pulseRing 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite',
              }} />
              <span style={{ color: 'var(--text-secondary)' }}>Gemini 3.5 Flash</span>
            </div>
            <a
              href="https://github.com/Shaswati2005/autopatch-ci"
              target="_blank"
              rel="noreferrer"
              className="text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all hover:text-white hover:border-[rgba(139,92,246,0.35)] hover:-translate-y-0.5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                textDecoration: 'none',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-screen-2xl mx-auto p-6" style={{ position: 'relative', zIndex: 1 }}>
        <div className="flex gap-6 animate-slide-up" style={{ minHeight: 'calc(100vh - 56px - 48px)' }}>
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
              customLog={customLog}
              onCustomLogChange={setCustomLog}
            />
          </aside>

          {/* Main Panel */}
          <main className="flex-1 min-w-0 flex flex-col gap-5">
            {/* Mobile trigger */}
            <div className="lg:hidden">
              <button
                onClick={handleTrigger}
                disabled={triggering}
                className="shimmer-btn w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-50"
                style={{
                  background: triggering ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
                  color: triggering ? 'var(--text-muted)' : '#fff',
                  border: 'none',
                  cursor: triggering ? 'not-allowed' : 'pointer',
                  fontFamily: "'Syne', sans-serif",
                  fontWeight: 700,
                  boxShadow: triggering ? 'none' : '0 4px 24px rgba(139,92,246,0.35)',
                }}
                data-testid="trigger-btn"
              >
                {triggering ? 'Repairing…' : '⚡ Start Autonomous Repair'}
              </button>
            </div>

            {/* Trace Panel */}
            <div
              className="rounded-2xl flex-1 flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.018)',
                border: '1px solid rgba(255,255,255,0.07)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Left accent strip on trace panel */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', top: 0, left: 0, bottom: 0, width: 2,
                  background: 'linear-gradient(to bottom, rgba(139,92,246,0.5), rgba(139,92,246,0.1), transparent)',
                }}
              />

              {/* Trace header */}
              <div
                className="flex items-center justify-between px-6 py-4"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div>
                  <h1
                    className="font-bold text-sm"
                    style={{
                      fontFamily: "'Syne', sans-serif",
                      background: 'linear-gradient(135deg, var(--text-primary), var(--text-secondary))',
                      WebkitBackgroundClip: 'text',
                      backgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      letterSpacing: '-0.02em',
                    }}
                  >
                    Agent Reasoning Trace
                  </h1>
                  {selectedRun ? (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                      run/{selectedRun}
                    </p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>
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
                      style={{ borderColor: 'rgba(139,92,246,0.2)', borderTopColor: 'var(--accent)' }}
                    />
                    <span className="text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      Loading trace steps…
                    </span>
                  </div>
                ) : traces.length === 0 ? (
                  <div className="flex flex-col items-center gap-5 py-20">
                    <div
                      className="relative"
                      style={{ width: 72, height: 72 }}
                    >
                      <div
                        className="absolute inset-0 rounded-full animate-glow"
                        style={{
                          background: 'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)',
                        }}
                        aria-hidden="true"
                      />
                      <div
                        className="absolute inset-3 rounded-2xl flex items-center justify-center text-2xl"
                        style={{
                          background: 'rgba(139,92,246,0.08)',
                          border: '1px solid rgba(139,92,246,0.2)',
                          backdropFilter: 'blur(8px)',
                        }}
                      >
                        🤖
                      </div>
                    </div>
                    <div className="text-center space-y-1">
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)', fontFamily: "'Syne', sans-serif" }}>
                        No active trace
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Select a run or trigger a new autonomous repair.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-0">
                    <PipelineTimeline traces={traces} />
                    {prStep?.payload?.pr_url && (
                      <div className="mt-6 animate-slide-up">
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
      </main>
    </div>
  );
}
