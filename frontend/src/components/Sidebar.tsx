import React, { useState } from 'react';
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
  CalendarDays,
  Sparkles
} from 'lucide-react';

export type DashboardTab = 'landing' | 'overview' | 'repositories' | 'incidents' | 'calendar' | 'settings';

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
}) => {
  const { user, isAuthenticated, loginWithGitHub, logout } = useAuth();
  const [healMode, setHealMode] = useState<'autonomous' | 'supervised'>('autonomous');

  return (
    <aside className="w-[240px] flex-shrink-0 bg-surface border-r border-border flex flex-col justify-between h-screen sticky top-0 select-none overflow-y-auto z-20 transition-all duration-200">
      
      {/* Top Header & Brand */}
      <div className="p-4 space-y-4">
        
        {/* Brand Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <button
            onClick={() => onTabChange('overview')}
            className="flex items-center gap-2.5 text-left focus:outline-none group"
          >
            <div className="w-7 h-7 rounded-[8px] bg-surface-2 border border-border-strong flex items-center justify-center text-accent group-hover:border-accent transition-colors">
              <Terminal className="w-4 h-4" />
            </div>
            <div>
              <span className="font-mono text-[13px] font-bold text-text tracking-tight block">
                AutoPatch<span className="text-accent">-CI</span>
              </span>
              <span className="text-[11px] font-mono text-text-dim block">
                Autonomous DevOps
              </span>
            </div>
          </button>

          <span
            className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-success' : 'bg-danger'}`}
            title={backendHealthy ? 'Backend API Online' : 'Backend API Disconnected'}
          />
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          <button
            onClick={() => onTabChange('overview')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
              currentTab === 'overview'
                ? 'bg-surface-2 text-text border border-border-strong'
                : 'text-text-muted hover:text-text hover:bg-surface-2/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className={`w-4 h-4 ${currentTab === 'overview' ? 'text-accent' : 'text-text-dim'}`} />
              <span>Overview</span>
            </div>
          </button>

          <button
            onClick={() => onTabChange('incidents')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
              currentTab === 'incidents'
                ? 'bg-surface-2 text-text border border-border-strong'
                : 'text-text-muted hover:text-text hover:bg-surface-2/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Activity className={`w-4 h-4 ${currentTab === 'incidents' ? 'text-accent' : 'text-text-dim'}`} />
              <span>Incidents & Traces</span>
            </div>
            {incidentsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded text-[11px] font-mono font-medium bg-bg-alt text-warning border border-border tabular-nums">
                {incidentsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('repositories')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
              currentTab === 'repositories'
                ? 'bg-surface-2 text-text border border-border-strong'
                : 'text-text-muted hover:text-text hover:bg-surface-2/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <GitBranch className={`w-4 h-4 ${currentTab === 'repositories' ? 'text-accent' : 'text-text-dim'}`} />
              <span>Repositories</span>
            </div>
          </button>

          <button
            onClick={() => onTabChange('calendar')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
              currentTab === 'calendar'
                ? 'bg-surface-2 text-text border border-border-strong'
                : 'text-text-muted hover:text-text hover:bg-surface-2/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CalendarDays className={`w-4 h-4 ${currentTab === 'calendar' ? 'text-accent' : 'text-text-dim'}`} />
              <span>CI Calendar</span>
            </div>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors ${
              currentTab === 'settings'
                ? 'bg-surface-2 text-text border border-border-strong'
                : 'text-text-muted hover:text-text hover:bg-surface-2/60'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Settings className={`w-4 h-4 ${currentTab === 'settings' ? 'text-accent' : 'text-text-dim'}`} />
              <span>Settings</span>
            </div>
          </button>
        </nav>

        {/* Auto-Heal Daemon Mode Switcher */}
        {isAuthenticated && (
          <div className="p-3 rounded-[8px] bg-bg-alt border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-text-dim uppercase tracking-wider font-semibold">
                Auto-Heal Daemon
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
            </div>
            <div className="grid grid-cols-2 gap-1 bg-surface p-0.5 rounded-[8px] border border-border">
              <button
                onClick={() => setHealMode('autonomous')}
                className={`py-1 text-[11px] font-mono rounded-[6px] transition-colors ${
                  healMode === 'autonomous'
                    ? 'bg-accent text-bg font-medium'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Auto
              </button>
              <button
                onClick={() => setHealMode('supervised')}
                className={`py-1 text-[11px] font-mono rounded-[6px] transition-colors ${
                  healMode === 'supervised'
                    ? 'bg-surface-2 text-text font-medium border border-border-strong'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Supervised
              </button>
            </div>
          </div>
        )}

        {/* Marketing / Landing Switcher Link */}
        <div className="pt-2">
          <button
            onClick={() => onTabChange('landing')}
            className="w-full text-left px-3 py-2 rounded-[8px] text-[12px] font-mono text-text-dim hover:text-text hover:bg-surface-2/40 flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            Landing Page
          </button>
        </div>
      </div>

      {/* Bottom User Profile or Real GitHub OAuth */}
      <div className="p-3 border-t border-border bg-surface-2">
        {isAuthenticated && user ? (
          <div className="flex items-center justify-between gap-2 p-2 rounded-[8px] bg-bg-alt border border-border">
            <div className="flex items-center gap-2 overflow-hidden">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name || user.username}
                  className="w-6 h-6 rounded-[6px] object-cover border border-border"
                />
              ) : (
                <div className="w-6 h-6 rounded-[6px] bg-surface-2 border border-border flex items-center justify-center font-mono text-[11px] text-accent">
                  {user.username.slice(0, 2).toUpperCase()}
                </div>
              )}
              <div className="overflow-hidden">
                <span className="text-[12px] font-medium text-text truncate block">
                  {user.name || user.username}
                </span>
                <span className="text-[11px] font-mono text-text-dim truncate block">
                  @{user.username}
                </span>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-1 rounded-[6px] hover:bg-surface-2 text-text-dim hover:text-danger transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            onClick={loginWithGitHub}
            className="w-full btn-primary py-2 text-[13px] font-medium flex items-center justify-center gap-2"
          >
            <Github className="w-3.5 h-3.5 text-bg" />
            Sign in with GitHub
          </button>
        )}
      </div>

    </aside>
  );
};
