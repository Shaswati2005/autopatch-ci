import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, NavTab } from './components/Navbar';
import { LandingPage } from './views/LandingPage';
import { DashboardOverview } from './views/DashboardOverview';
import { RepositoriesView } from './views/RepositoriesView';
import { IncidentsView } from './views/IncidentsView';
import { SettingsView } from './views/SettingsView';
import { StreamStatus } from './components/ConnectionStatus';
import { TraceStep } from './types';

export type { TraceStep };

function AppContent() {
  const [currentTab, setCurrentTab] = useState<NavTab>('landing');
  const [runs, setRuns] = useState<string[]>([]);
  const [selectedRun, setSelectedRun] = useState<string | null>(null);
  const [traces, setTraces] = useState<TraceStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [streamStatus, setStreamStatus] = useState<StreamStatus>('idle');
  const [backendHealthy, setBackendHealthy] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
    (typeof process !== 'undefined' && process.env && (process.env.VITE_API_URL || process.env.NEXT_PUBLIC_API_URL)) ||
    'http://localhost:8000';

  // Check backend health
  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      setBackendHealthy(res.ok);
    } catch {
      setBackendHealthy(false);
    }
  }, [API_BASE]);

  // Fetch runs list from backend
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

  // Fetch traces for a run
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

  // Health and runs periodic check
  useEffect(() => {
    checkHealth();
    fetchRuns();
    const interval = setInterval(() => {
      checkHealth();
      fetchRuns();
    }, 4000);
    return () => clearInterval(interval);
  }, [checkHealth, fetchRuns]);

  // SSE Trace Subscription
  useEffect(() => {
    if (!selectedRun) {
      setStreamStatus('idle');
      setTraces([]);
      return;
    }

    setLoading(true);
    setStreamStatus('connecting');

    // Fetch initial traces snapshot
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
        } catch { /* ignore */ }
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

    // Polling fallback interval
    const pollInterval = setInterval(() => {
      if (streamStatus !== 'streaming') {
        fetchTraces(selectedRun);
      }
    }, 2500);

    return () => {
      eventSourceRef.current?.close();
      clearInterval(pollInterval);
    };
  }, [selectedRun, API_BASE]);

  // Trigger CI Check against real connected workflows
  const handleTriggerCheck = async (
    repoName = 'Shaswati2005/autopatch-ci',
    branch = 'main',
    workflowName = 'AutoPatch-CI Build & Verification Pipeline'
  ) => {
    setTriggering(true);
    try {
      const res = await fetch(`${API_BASE}/api/trigger-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoName,
          branch: branch,
          workflow_name: workflowName,
        }),
      });
      const data = await res.json();
      if (data.run_id) {
        setTraces([]);
        setSelectedRun(data.run_id);
        fetchRuns();
        setCurrentTab('incidents'); // Auto-navigate to live diagnostic workspace
      }
    } catch (err) {
      console.error('Trigger demo failed', err);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060b08] text-[#f0faf4] flex flex-col selection:bg-[#00f59b]/20 selection:text-[#00f59b]">
      {/* Top Solarpunk Navbar */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        backendHealthy={backendHealthy}
      />

      {/* Main View Router */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {currentTab === 'landing' && (
          <LandingPage
            onLaunchConsole={() => setCurrentTab('overview')}
            onExploreIncidents={() => setCurrentTab('incidents')}
            onConnectRepo={() => setCurrentTab('repositories')}
            runsCount={runs.length}
            latestRunId={selectedRun}
          />
        )}

        {currentTab === 'overview' && (
          <DashboardOverview
            runs={runs}
            selectedRun={selectedRun}
            onSelectRun={(id) => {
              setSelectedRun(id);
              setCurrentTab('incidents');
            }}
            onNavigateToIncidents={() => setCurrentTab('incidents')}
            onNavigateToRepos={() => setCurrentTab('repositories')}
            onTriggerExistingCI={() => handleTriggerCheck()}
            triggering={triggering}
          />
        )}

        {currentTab === 'repositories' && (
          <RepositoriesView
            onTriggerCheck={(name, branch, workflow) => handleTriggerCheck(name, branch, workflow)}
            triggering={triggering}
          />
        )}

        {currentTab === 'incidents' && (
          <IncidentsView
            runs={runs}
            selectedRun={selectedRun}
            traces={traces}
            loading={loading}
            streamStatus={streamStatus}
            onSelectRun={(id) => setSelectedRun(id)}
            onRefresh={fetchRuns}
            onTriggerCheck={() => handleTriggerCheck()}
            triggering={triggering}
          />
        )}

        {currentTab === 'settings' && <SettingsView />}
      </main>

      {/* Solarpunk Footer */}
      <footer className="border-t border-[#1b3022] bg-[#060b08] py-6 px-4 text-center text-xs font-mono text-[#557562]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-[#00f59b]">🌿 AutoPatch-CI</span>
            <span>— Photosynthetic DevOps Self-Healing Agent</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/Shaswati2005/autopatch-ci"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#00f59b] transition-colors"
            >
              GitHub Repository
            </a>
            <span>•</span>
            <span>Gemini 2.5 Flash</span>
            <span>•</span>
            <span>Cloud Build Sandbox</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
