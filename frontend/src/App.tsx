import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, DashboardTab } from './components/Sidebar';
import { LandingPage } from './views/LandingPage';
import { DashboardOverview } from './views/DashboardOverview';
import { RepositoriesView } from './views/RepositoriesView';
import { IncidentsView } from './views/IncidentsView';
import { SettingsView } from './views/SettingsView';
import { AuthCallbackView } from './views/AuthCallbackView';
import { StreamStatus } from './components/ConnectionStatus';
import { TraceStep } from './types';

export type { TraceStep };

function AppContent() {
  const [currentTab, setCurrentTab] = useState<DashboardTab>(() => {
    if (typeof window !== 'undefined' && window.location.pathname.includes('/auth-callback')) {
      return 'overview';
    }
    return 'landing';
  });

  const [isAuthCallback, setIsAuthCallback] = useState(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      return urlParams.has('token') || urlParams.has('error') || window.location.pathname.includes('/auth-callback');
    }
    return false;
  });

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
    'http://localhost:8000';

  const checkHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      setBackendHealthy(res.ok);
    } catch {
      setBackendHealthy(false);
    }
  }, [API_BASE]);

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

  useEffect(() => {
    checkHealth();
    fetchRuns();
    const interval = setInterval(() => {
      checkHealth();
      fetchRuns();
    }, 4000);
    return () => clearInterval(interval);
  }, [checkHealth, fetchRuns]);

  useEffect(() => {
    if (!selectedRun) {
      setStreamStatus('idle');
      setTraces([]);
      return;
    }

    setLoading(true);
    setStreamStatus('connecting');
    fetchTraces(selectedRun).finally(() => setLoading(false));

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

  const handleTriggerCheck = async (
    repoName = 'Shaswati2005/autopatch-ci',
    branch = 'main',
    workflowName = 'CI / Pytest Suite'
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
        setCurrentTab('incidents');
      }
    } catch (err) {
      console.error('Trigger demo failed', err);
    } finally {
      setTriggering(false);
    }
  };

  // If receiving OAuth callback
  if (isAuthCallback) {
    return (
      <div className="min-h-screen bg-[#0b0d14] text-[#f1f1f4]">
        <AuthCallbackView
          onAuthSuccess={() => {
            setIsAuthCallback(false);
            setCurrentTab('overview');
          }}
          onAuthError={() => {
            setIsAuthCallback(false);
            setCurrentTab('overview');
          }}
        />
      </div>
    );
  }

  // If on Landing Page
  if (currentTab === 'landing') {
    return (
      <div className="min-h-screen bg-[#0b0d14] text-[#f1f1f4]">
        <header className="border-b border-[#232838] bg-[#0b0d14]/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-[1280px] mx-auto px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2 font-mono text-xs font-bold text-[#f1f1f4]">
              <span className="w-2.5 h-2.5 rounded bg-[#7553f6]" />
              AutoPatch-CI
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCurrentTab('overview')}
                className="btn-warp-primary text-xs"
              >
                Launch Console
              </button>
            </div>
          </div>
        </header>

        <LandingPage
          onLaunchConsole={() => setCurrentTab('overview')}
          runsCount={runs.length}
        />
      </div>
    );
  }

  // Warp Full-Width App Shell with Persistent 240px Sidebar
  return (
    <div className="min-h-screen bg-[#0b0d14] text-[#f1f1f4] flex">
      {/* 240px Persistent Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        incidentsCount={runs.length}
        backendHealthy={backendHealthy}
      />

      {/* Fluid Main Content */}
      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto">
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
