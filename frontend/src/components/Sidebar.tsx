import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Activity, 
  Layers, 
  GitBranch, 
  Settings, 
  Terminal, 
  Zap, 
  Github, 
  LogOut, 
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Play,
  ChevronDown
} from 'lucide-react';

export type DashboardTab = 'landing' | 'overview' | 'repositories' | 'incidents' | 'settings';

export interface WorkflowRunItem {
  id: string;
  name: string;
  status: string;
  conclusion: string;
  branch: string;
  commit_sha: string;
  commit_message: string;
  html_url: string;
  created_at: string;
}

interface SidebarProps {
  currentTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  incidentsCount: number;
  backendHealthy: boolean;
  onTriggerRun?: (repo: string, branch: string, workflow: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  incidentsCount,
  backendHealthy,
  onTriggerRun,
}) => {
  const { user, isAuthenticated, loginWithGitHub, logout, authFetch } = useAuth();
  const [actionRuns, setActionRuns] = useState<WorkflowRunItem[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  const API_BASE =
    (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.VITE_API_URL || import.meta.env.NEXT_PUBLIC_API_URL)) ||
    'http://localhost:8000';

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchActionRuns = async () => {
      setLoadingRuns(true);
      try {
        const res = await authFetch(`${API_BASE}/api/github/repos/Shaswati2005/autopatch-ci/actions/runs`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.workflow_runs)) {
            setActionRuns(data.workflow_runs);
          }
        }
      } catch {
        /* silent */
      } finally {
        setLoadingRuns(false);
      }
    };

    fetchActionRuns();
    const interval = setInterval(fetchActionRuns, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, authFetch, API_BASE]);

  return (
    <aside className="w-60 flex-shrink-0 bg-[#0b0d14] border-r border-[#232838] flex flex-col justify-between h-screen sticky top-0 select-none overflow-y-auto">
      
      {/* Top Header & Brand */}
      <div className="p-4 space-y-5">
        
        {/* Warp Terminal Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232838]">
          <button
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-7 h-7 rounded-lg bg-[#161a25] border border-[#2e3447] flex items-center justify-center text-[#7553f6] group-hover:border-[#7553f6] transition-colors">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-[#f1f1f4] tracking-tight block">
                AutoPatch<span className="text-[#7553f6]">-CI</span>
              </span>
              <span className="text-[10px] font-mono text-[#5f6580] block">
                Warp × Sentry v0.3
              </span>
            </div>
          </button>

          <span
            className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-[#5ee78a]' : 'bg-[#f6827d]'}`}
            title={backendHealthy ? 'Backend API Online' : 'Backend API Disconnected'}
          />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <button
            onClick={() => onTabChange('overview')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'overview'
                ? 'bg-[#1e2331] text-[#f1f1f4] border border-[#2e3447]'
                : 'text-[#9aa1b3] hover:text-[#f1f1f4] hover:bg-[#161a25]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-[#7553f6]" />
              <span>Overview</span>
            </div>
          </button>

          <button
            onClick={() => onTabChange('incidents')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'incidents'
                ? 'bg-[#1e2331] text-[#f1f1f4] border border-[#2e3447]'
                : 'text-[#9aa1b3] hover:text-[#f1f1f4] hover:bg-[#161a25]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4 text-[#ff7a59]" />
              <span>Incidents & Traces</span>
            </div>
            <span className="px-1.5 py-0.2 text-[10px] font-mono font-medium rounded bg-[#161a25] text-[#ff7a59] border border-[#2e3447] tabular-nums">
              {incidentsCount}
            </span>
          </button>

          <button
            onClick={() => onTabChange('repositories')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'repositories'
                ? 'bg-[#1e2331] text-[#f1f1f4] border border-[#2e3447]'
                : 'text-[#9aa1b3] hover:text-[#f1f1f4] hover:bg-[#161a25]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GitBranch className="w-4 h-4 text-[#9aa1b3]" />
              <span>Repositories</span>
            </div>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              currentTab === 'settings'
                ? 'bg-[#1e2331] text-[#f1f1f4] border border-[#2e3447]'
                : 'text-[#9aa1b3] hover:text-[#f1f1f4] hover:bg-[#161a25]'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-[#9aa1b3]" />
              <span>Settings</span>
            </div>
          </button>
        </nav>

        {/* Live GitHub Actions CI Runs Section */}
        {isAuthenticated && (
          <div className="pt-2 space-y-2 border-t border-[#232838]">
            <div className="flex items-center justify-between px-1">
              <span className="text-[10px] font-mono uppercase tracking-wider text-[#5f6580] font-semibold">
                GitHub Action Runs
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#5ee78a] animate-pulse" />
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {actionRuns.length === 0 ? (
                <div className="p-2 rounded bg-[#11141d] border border-[#232838] text-[10px] font-mono text-[#5f6580]">
                  {loadingRuns ? 'Fetching live runs...' : 'No GitHub runs found'}
                </div>
              ) : (
                actionRuns.slice(0, 5).map((run) => {
                  const isFail = run.conclusion === 'failure';
                  return (
                    <div
                      key={run.id}
                      className="p-2 rounded-md bg-[#11141d] border border-[#232838] hover:border-[#2e3447] text-[11px] font-mono space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              isFail ? 'bg-[#f6827d]' : run.conclusion === 'success' ? 'bg-[#5ee78a]' : 'bg-[#ff7a59]'
                            }`}
                          />
                          <span className="truncate text-[#f1f1f4] font-medium text-[10px]">
                            {run.name}
                          </span>
                        </div>
                        <span className="text-[9px] text-[#5f6580]">#{run.commit_sha}</span>
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-[9px] text-[#5f6580] truncate max-w-[110px]">
                          {run.branch}
                        </span>
                        {isFail && onTriggerRun && (
                          <button
                            onClick={() => onTriggerRun('Shaswati2005/autopatch-ci', run.branch, run.name)}
                            className="px-1.5 py-0.5 rounded bg-[#7553f6]/20 text-[#7553f6] hover:bg-[#7553f6]/30 text-[9px] font-mono flex items-center gap-0.5"
                          >
                            <Zap className="w-2.5 h-2.5" /> Heal
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* Marketing / Landing Switcher Link */}
        <div className="pt-1">
          <button
            onClick={() => onTabChange('landing')}
            className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono text-[#5f6580] hover:text-[#9aa1b3] hover:bg-[#11141d] flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7553f6]" />
            Marketing Page
          </button>
        </div>
      </div>

      {/* Bottom User Profile or Real GitHub OAuth */}
      <div className="p-3 border-t border-[#232838] bg-[#11141d]">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-[#161a25] border border-[#232838]">
            <div className="flex items-center gap-2 overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.username}
                  className="w-7 h-7 rounded-md object-cover border border-[#2e3447]"
                />
              ) : (
                <div className="w-7 h-7 rounded-md bg-[#1e2331] flex items-center justify-center font-mono text-xs text-[#7553f6]">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-xs font-medium text-[#f1f1f4] truncate block">
                  {user.name || user.username}
                </span>
                <span className="text-[10px] font-mono text-[#5f6580] truncate block">
                  @{user.username}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-md hover:bg-[#1e2331] text-[#5f6580] hover:text-[#f6827d] transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={loginWithGitHub}
            className="w-full btn-warp-primary py-2 text-xs font-medium flex items-center justify-center gap-2"
          >
            <Github className="w-3.5 h-3.5" />
            Sign in with GitHub
          </button>
        )}
      </div>

    </aside>
  );
};
