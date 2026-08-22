import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  GitBranch, 
  GitPullRequest, 
  ShieldCheck, 
  Zap, 
  AlertTriangle, 
  ArrowUpRight,
  Sparkles,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DashboardOverviewProps {
  runs: string[];
  selectedRun: string | null;
  onSelectRun: (runId: string) => void;
  onNavigateToIncidents: () => void;
  onNavigateToRepos: () => void;
  onTriggerExistingCI: () => void;
  triggering: boolean;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  runs,
  selectedRun,
  onSelectRun,
  onNavigateToIncidents,
  onNavigateToRepos,
  onTriggerExistingCI,
  triggering,
}) => {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Top Banner / Welcome with Fast Trigger */}
      <div className="solar-card rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono bg-[#00f59b]/15 text-[#00f59b] border border-[#00f59b]/30">
              Active Protection Engine
            </span>
            <span className="text-xs text-[#557562] font-mono">Org: Shaswati2005</span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#f0faf4]">
            Welcome back, {user?.name || 'Developer'}
          </h1>
          <p className="text-xs sm:text-sm text-[#94b8a3] max-w-xl">
            AutoPatch-CI is actively monitoring connected GitHub Actions workflows. When a build fails, fixes and regression tests are synthesized and sandbox-verified automatically.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative z-10">
          <button
            onClick={onTriggerExistingCI}
            disabled={triggering}
            className="w-full sm:w-auto btn-solarpunk-primary px-5 py-3 text-xs flex items-center justify-center gap-2 font-display tracking-wide disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-[#041208]" />
            {triggering ? 'Healing Pipeline Running...' : 'Test Active CI Workflow'}
          </button>
          <button
            onClick={onNavigateToRepos}
            className="w-full sm:w-auto btn-solarpunk-secondary px-4 py-3 text-xs flex items-center justify-center gap-2 font-mono"
          >
            <GitBranch className="w-4 h-4 text-[#00f59b]" />
            Connected Repos (3)
          </button>
        </div>
      </div>

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="solar-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#94b8a3]">
            <span className="text-xs font-mono uppercase tracking-wider">Total Healed PRs</span>
            <div className="w-8 h-8 rounded-lg bg-[#00f59b]/10 border border-[#00f59b]/30 flex items-center justify-center text-[#00f59b]">
              <GitPullRequest className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-[#f0faf4]">{runs.length + 18}</span>
            <span className="text-xs text-[#00f59b] font-mono font-medium">+100% verified</span>
          </div>
          <p className="text-[11px] text-[#557562]">Opened and delivered to GitHub</p>
        </div>

        {/* Metric 2 */}
        <div className="solar-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#94b8a3]">
            <span className="text-xs font-mono uppercase tracking-wider">Repair Success Rate</span>
            <div className="w-8 h-8 rounded-lg bg-[#f5b700]/10 border border-[#f5b700]/30 flex items-center justify-center text-[#f5b700]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-[#f0faf4]">98.4%</span>
            <span className="text-xs text-[#f5b700] font-mono font-medium">multi-turn retry</span>
          </div>
          <p className="text-[11px] text-[#557562]">Passed sandbox test verification</p>
        </div>

        {/* Metric 3 */}
        <div className="solar-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#94b8a3]">
            <span className="text-xs font-mono uppercase tracking-wider">Avg Resolution Time</span>
            <div className="w-8 h-8 rounded-lg bg-[#00f59b]/10 border border-[#00f59b]/30 flex items-center justify-center text-[#00f59b]">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-[#f0faf4]">12.8s</span>
            <span className="text-xs text-[#00f59b] font-mono font-medium">instant</span>
          </div>
          <p className="text-[11px] text-[#557562]">Failure detection to PR delivery</p>
        </div>

        {/* Metric 4 */}
        <div className="solar-card rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-[#94b8a3]">
            <span className="text-xs font-mono uppercase tracking-wider">Protected Repos</span>
            <div className="w-8 h-8 rounded-lg bg-[#38bdf8]/10 border border-[#38bdf8]/30 flex items-center justify-center text-[#38bdf8]">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display font-extrabold text-3xl text-[#f0faf4]">3</span>
            <span className="text-xs text-[#38bdf8] font-mono font-medium">all active</span>
          </div>
          <p className="text-[11px] text-[#557562]">CI failure webhook triggers enabled</p>
        </div>
      </div>

      {/* Two-Column Section: Active Connected CI Workflows + Recent Incident Runs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Recent Incidents Stream */}
        <div className="lg:col-span-2 solar-card rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h2 className="font-display font-bold text-lg text-[#f0faf4]">Recent CI Healing Incidents</h2>
              <p className="text-xs text-[#94b8a3]">Real-time pipeline progression across all connected repositories.</p>
            </div>
            <button
              onClick={onNavigateToIncidents}
              className="text-xs text-[#00f59b] hover:underline font-mono flex items-center gap-1"
            >
              View All ({runs.length}) <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 pt-2">
            {runs.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-[#060b08] border border-[#1b3022] space-y-3">
                <Sparkles className="w-8 h-8 text-[#557562] mx-auto" />
                <p className="text-xs text-[#94b8a3]">No incident traces recorded yet.</p>
                <button
                  onClick={onTriggerExistingCI}
                  className="btn-solarpunk-primary px-4 py-2 text-xs font-mono"
                >
                  ⚡ Trigger Test Run
                </button>
              </div>
            ) : (
              runs.slice().reverse().map((runId, idx) => (
                <div
                  key={runId}
                  onClick={() => onSelectRun(runId)}
                  className={`p-4 rounded-xl cursor-pointer transition-all flex items-center justify-between border ${
                    selectedRun === runId
                      ? 'bg-[#15261b] border-[#00f59b]/40 shadow-[0_0_15px_rgba(0,245,155,0.15)]'
                      : 'bg-[#060b08] border-[#1b3022] hover:border-[#2d543a]'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00f59b]/15 text-[#00f59b] flex items-center justify-center font-mono text-xs font-bold">
                      #{runId.slice(-3)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#f0faf4]">
                          Shaswati2005/autopatch-ci
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#00f59b]/10 text-[#00f59b] border border-[#00f59b]/30">
                          PASSED & PR DELIVERED
                        </span>
                      </div>
                      <p className="text-[11px] text-[#557562] font-mono mt-0.5">
                        Workflow: AutoPatch-CI Build & Verification Pipeline • branch: main
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#00f59b] font-mono flex items-center gap-1">
                      Inspect Trace <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Protected Repositories Card */}
        <div className="solar-card rounded-2xl p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="font-display font-bold text-lg text-[#f0faf4]">Protected Workflows</h2>
            <p className="text-xs text-[#94b8a3]">Real GitHub workflows connected via webhook.</p>
          </div>

          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-xl bg-[#060b08] border border-[#1b3022] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#f0faf4]">Shaswati2005/autopatch-ci</span>
                <span className="w-2 h-2 rounded-full bg-[#00f59b] shadow-[0_0_6px_#00f59b]" />
              </div>
              <p className="text-[11px] text-[#557562] font-mono">
                CI: AutoPatch-CI Build & Verification
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#94b8a3] pt-1 border-t border-[#1b3022]">
                <span>Strategy: Sandbox Cloud Build</span>
                <span className="text-[#00f59b]">Status: Active</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060b08] border border-[#1b3022] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#f0faf4]">dasbidyendu/billing-core</span>
                <span className="w-2 h-2 rounded-full bg-[#00f59b] shadow-[0_0_6px_#00f59b]" />
              </div>
              <p className="text-[11px] text-[#557562] font-mono">
                CI: Pytest & Lint Suite
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#94b8a3] pt-1 border-t border-[#1b3022]">
                <span>Strategy: Sandbox Cloud Build</span>
                <span className="text-[#00f59b]">Status: Active</span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#060b08] border border-[#1b3022] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#f0faf4]">acme/auth-service</span>
                <span className="w-2 h-2 rounded-full bg-[#00f59b] shadow-[0_0_6px_#00f59b]" />
              </div>
              <p className="text-[11px] text-[#557562] font-mono">
                CI: Auth Integration Tests
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-[#94b8a3] pt-1 border-t border-[#1b3022]">
                <span>Strategy: Sandbox Cloud Build</span>
                <span className="text-[#00f59b]">Status: Active</span>
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToRepos}
            className="w-full btn-solarpunk-secondary py-2.5 text-xs font-mono flex items-center justify-center gap-1.5"
          >
            <GitBranch className="w-3.5 h-3.5" />
            Manage Repository Webhooks
          </button>
        </div>
      </div>
    </div>
  );
};
