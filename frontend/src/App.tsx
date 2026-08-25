import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Sidebar, DashboardTab } from './components/Sidebar';
import { LandingPage } from './views/LandingPage';
import { DashboardOverview } from './views/DashboardOverview';
import { RepositoriesView } from './views/RepositoriesView';
import { IncidentsView } from './views/IncidentsView';
import { SettingsView } from './views/SettingsView';
import { CICalendarView } from './views/CICalendarView';
import { AuthCallbackView } from './views/AuthCallbackView';
import { StreamStatus } from './components/ConnectionStatus';
import { TraceStep } from './types';
import { Terminal, Lock, Github, ArrowRight } from 'lucide-react';

export type { TraceStep };

function AppContent() {
  const { isAuthenticated, token, loginWithGitHub, authFetch } = useAuth();

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
    (typeof import.meta !== 'undefined' && import.meta.env &&
      (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
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
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`${API_BASE}/api/runs`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.runs)) {
        setRuns(data.runs);
        setSelectedRun((prev) => prev ?? (data.runs.length > 0 ? data.runs[data.runs.length - 1] : null));
      }
    } catch { /* silent */ }
  }, [API_BASE, isAuthenticated, authFetch]);

  const fetchTraces = useCallback(async (runId: string) => {
    if (!isAuthenticated) return;
    try {
      const res = await authFetch(`${API_BASE}/api/traces/${runId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.traces)) {
        setTraces(data.traces);
      }
    } catch {
      setStreamStatus('disconnected');
    }
  }, [API_BASE, isAuthenticated, authFetch]);

  useEffect(() => {
    checkHealth();
    if (isAuthenticated) fetchRuns();
    const interval = setInterval(() => {
      checkHealth();
      if (isAuthenticated) fetchRuns();
    }, 4000);
    return () => clearInterval(interval);
  }, [checkHealth, fetchRuns, isAuthenticated]);

  // SSE Trace Subscription
  useEffect(() => {
    if (!selectedRun || !isAuthenticated) {
      setStreamStatus('idle');
      setTraces([]);
      return;
    }
    setLoading(true);
    setStreamStatus('connecting');
    fetchTraces(selectedRun).finally(() => setLoading(false));

    try {
      const authQuery = token ? `?token=${encodeURIComponent(token)}` : '';
      const es = new EventSource(`${API_BASE}/api/traces/${selectedRun}/stream${authQuery}`);
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
      if (streamStatus !== 'streaming' && isAuthenticated) {
        fetchTraces(selectedRun);
      }
    }, 2500);

    return () => {
      eventSourceRef.current?.close();
      clearInterval(pollInterval);
    };
  }, [selectedRun, API_BASE, isAuthenticated, token, fetchTraces]);

  // Trigger Handlers
  const handleTriggerOnRealRun = async (repo: string, runId: string, branch: string) => {
    if (!isAuthenticated) { loginWithGitHub(); return; }
    setTriggering(true);
    try {
      const res = await authFetch(`${API_BASE}/api/runs/${runId}/autopatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo,
          run_id: runId,
          branch,
          github_token: token || '',
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
      console.error('Trigger autopatch failed', err);
    } finally {
      setTriggering(false);
    }
  };

  const handleTriggerCheck = async (
    repoName = 'acme/payment-service',
    branch = 'main',
    workflowName = 'CI Pipeline',
    runId?: string,
  ) => {
    if (!isAuthenticated) { loginWithGitHub(); return; }

    if (runId && repoName) {
      return handleTriggerOnRealRun(repoName, runId, branch);
    }

    setTriggering(true);
    try {
      const res = await authFetch(`${API_BASE}/api/trigger-demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repo: repoName,
          branch,
          workflow_name: workflowName,
          github_token: token || '',
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
      console.error('Trigger check failed', err);
    } finally {
      setTriggering(false);
    }
  };

  // ── Auth Callback ────────────────────────────────────────────────────────
  if (isAuthCallback) {
    return (
      <div className="min-h-screen bg-bg text-text relative flex items-center justify-center p-6">
        <AuthCallbackView
          onAuthSuccess={() => { setIsAuthCallback(false); setCurrentTab('overview'); }}
          onAuthError={() => { setIsAuthCallback(false); setCurrentTab('overview'); }}
        />
      </div>
    );
  }

  // ── Landing Page (Marketing layout max 1280, 24px gutter) ─────────────────
  if (currentTab === 'landing') {
    return (
      <div className="min-h-screen bg-bg text-text relative">
        <header className="border-b border-border bg-bg/90 backdrop-blur-md sticky top-0 z-50">
          <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5 font-mono text-[13px] font-bold text-text">
              <div className="w-7 h-7 rounded-[8px] bg-surface-2 border border-border-strong flex items-center justify-center text-accent">
                <Terminal className="w-4 h-4" />
              </div>
              <span className="tracking-tight text-[15px] font-semibold">
                AutoPatch<span className="text-accent">-CI</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <button onClick={() => setCurrentTab('overview')} className="btn-primary text-[13px]">
                  Launch Console
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button onClick={loginWithGitHub} className="btn-primary text-[13px]">
                  <Github className="w-3.5 h-3.5" />
                  Sign in with GitHub
                </button>
              )}
            </div>
          </div>
        </header>
        <LandingPage
          onLaunchConsole={() => { if (isAuthenticated) setCurrentTab('overview'); else loginWithGitHub(); }}
          runsCount={runs.length}
        />
      </div>
    );
  }

  // ── Auth Guard ──────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-bg text-text flex items-center justify-center p-6">
        <div className="warp-card max-w-md w-full p-8 text-center space-y-5 bg-surface border border-border">
          <div className="w-12 h-12 rounded-[10px] bg-surface-2 border border-border-strong flex items-center justify-center mx-auto text-accent">
            <Lock className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <h2 className="font-headline text-[24px] text-text font-semibold tracking-tight">Authentication Required</h2>
            <p className="text-[13px] text-text-muted font-sans leading-relaxed">
              AutoPatch-CI requires GitHub OAuth. Sign in to view and heal your CI/CD pipelines.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <button onClick={loginWithGitHub} className="w-full btn-primary py-2.5 text-[13px] font-medium flex items-center justify-center gap-2">
              <Github className="w-4 h-4" />
              Sign in with GitHub
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={() => setCurrentTab('landing')} className="w-full btn-secondary py-2 text-[12px] font-mono">
              Return to Landing Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Main App Shell (Full-width, 240px sidebar, fluid main) ────────────────
  return (
    <div className="min-h-screen bg-bg text-text flex relative">
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => setCurrentTab(tab)}
        incidentsCount={runs.length}
        backendHealthy={backendHealthy}
        onTriggerRun={(repo, branch, workflow) => handleTriggerCheck(repo, branch, workflow)}
      />

      <main className="flex-1 min-w-0 p-6 lg:p-8 overflow-y-auto bg-bg">
        {currentTab === 'overview' && (
          <DashboardOverview
            runs={runs}
            selectedRun={selectedRun}
            onSelectRun={(id) => { setSelectedRun(id); setCurrentTab('incidents'); }}
            onNavigateToIncidents={() => setCurrentTab('incidents')}
            onNavigateToRepos={() => setCurrentTab('repositories')}
            onTriggerExistingCI={() => handleTriggerCheck()}
            triggering={triggering}
          />
        )}

        {currentTab === 'repositories' && (
          <RepositoriesView
            onTriggerCheck={(name, branch, workflow, runId) => handleTriggerCheck(name, branch, workflow, runId)}
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

        {currentTab === 'calendar' && (
          <CICalendarView
            onTriggerAutopatch={(repo, runId, branch) => handleTriggerOnRealRun(repo, runId, branch)}
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
