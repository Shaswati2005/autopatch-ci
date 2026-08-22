import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Leaf, 
  Layers, 
  GitBranch, 
  Activity, 
  Settings, 
  Sparkles, 
  Github, 
  LogOut, 
  LogIn, 
  ShieldCheck,
  ChevronDown
} from 'lucide-react';

export type NavTab = 'landing' | 'overview' | 'repositories' | 'incidents' | 'settings';

interface NavbarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  backendHealthy: boolean;
  onQuickSimulate?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  backendHealthy,
}) => {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-[#060b08]/85 backdrop-blur-xl border-b border-[#1b3022]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand Identity with Solarpunk Glow */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => onTabChange('landing')}
            className="flex items-center gap-3 group text-left focus:outline-none"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00f59b] via-[#10b981] to-[#f5b700] p-[1.5px] shadow-[0_0_20px_rgba(0,245,155,0.35)] group-hover:shadow-[0_0_30px_rgba(0,245,155,0.6)] transition-all">
              <div className="w-full h-full bg-[#060b08] rounded-[10px] flex items-center justify-center">
                <Leaf className="w-5 h-5 text-[#00f59b] group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-base tracking-tight text-[#f0faf4] group-hover:text-[#00f59b] transition-colors">
                  AutoPatch<span className="text-[#00f59b]">-CI</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded bg-[#00f59b]/10 text-[#00f59b] border border-[#00f59b]/30">
                  v0.2 solar
                </span>
              </div>
              <p className="text-[10px] text-[#557562] font-mono tracking-tight hidden sm:block">
                Photosynthetic Self-Healing DevOps
              </p>
            </div>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 ml-4 p-1 rounded-xl bg-[#0b140e] border border-[#1b3022]">
            <button
              onClick={() => onTabChange('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'landing'
                  ? 'bg-[#15261b] text-[#00f59b] border border-[#00f59b]/30 shadow-sm'
                  : 'text-[#94b8a3] hover:text-[#f0faf4] hover:bg-[#101e14]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Landing
            </button>
            <button
              onClick={() => onTabChange('overview')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'overview'
                  ? 'bg-[#15261b] text-[#00f59b] border border-[#00f59b]/30 shadow-sm'
                  : 'text-[#94b8a3] hover:text-[#f0faf4] hover:bg-[#101e14]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Dashboard
            </button>
            <button
              onClick={() => onTabChange('repositories')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'repositories'
                  ? 'bg-[#15261b] text-[#00f59b] border border-[#00f59b]/30 shadow-sm'
                  : 'text-[#94b8a3] hover:text-[#f0faf4] hover:bg-[#101e14]'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              Repositories
            </button>
            <button
              onClick={() => onTabChange('incidents')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'incidents'
                  ? 'bg-[#15261b] text-[#00f59b] border border-[#00f59b]/30 shadow-sm'
                  : 'text-[#94b8a3] hover:text-[#f0faf4] hover:bg-[#101e14]'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Incidents & Traces
            </button>
            <button
              onClick={() => onTabChange('settings')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                currentTab === 'settings'
                  ? 'bg-[#15261b] text-[#00f59b] border border-[#00f59b]/30 shadow-sm'
                  : 'text-[#94b8a3] hover:text-[#f0faf4] hover:bg-[#101e14]'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              Settings
            </button>
          </nav>
        </div>

        {/* Right Controls: Health Pill, Protected Repos, User Profile */}
        <div className="flex items-center gap-3">
          {/* Backend Health Badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#0b140e] border border-[#1b3022] text-[#94b8a3]">
            <span className={`w-2 h-2 rounded-full ${backendHealthy ? 'bg-[#00f59b] shadow-[0_0_8px_#00f59b]' : 'bg-[#ff5c5c]'}`} />
            <span>{backendHealthy ? 'Agent Core Online' : 'Connecting...'}</span>
          </div>

          {/* User Auth Profile / Fast Connect */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-3 rounded-full bg-[#0f1c13] hover:bg-[#15261b] border border-[#1b3022] hover:border-[#00f59b]/40 transition-all text-left"
              >
                <div className="flex flex-col text-right">
                  <span className="text-xs font-semibold text-[#f0faf4]">{user.name}</span>
                  <span className="text-[10px] font-mono text-[#557562]">@{user.username}</span>
                </div>
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="w-7 h-7 rounded-full object-cover border border-[#00f59b]/40"
                />
                <ChevronDown className="w-3.5 h-3.5 text-[#557562]" />
              </button>

              {/* Profile Dropdown Menu */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-[#0b140e] border border-[#1b3022] shadow-[0_10px_40px_rgba(0,0,0,0.8)] p-2 z-50 animate-fade-in-up">
                  <div className="px-3 py-2 border-b border-[#1b3022] mb-1">
                    <p className="text-xs font-semibold text-[#f0faf4]">{user.org}</p>
                    <p className="text-[10px] text-[#00f59b] font-mono flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="w-3 h-3" /> Protected {user.connectedReposCount} Repositories
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      onTabChange('repositories');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#94b8a3] hover:text-[#f0faf4] hover:bg-[#15261b] flex items-center gap-2"
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Manage Repositories
                  </button>
                  <button
                    onClick={() => {
                      onTabChange('settings');
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#94b8a3] hover:text-[#f0faf4] hover:bg-[#15261b] flex items-center gap-2"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    API Credentials
                  </button>
                  <div className="border-t border-[#1b3022] my-1" />
                  <button
                    onClick={() => {
                      logout();
                      setProfileDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs text-[#ff5c5c] hover:bg-[#ff5c5c]/10 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => login()}
              className="btn-solarpunk-primary px-4 py-2 text-xs flex items-center gap-2"
            >
              <Github className="w-4 h-4" />
              Sign in with GitHub
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
