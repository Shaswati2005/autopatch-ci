import React, { useState } from 'react';
import { ConnectionStatus, StreamStatus } from '../components/ConnectionStatus';
import { PipelineTimeline } from '../components/PipelineTimeline';
import { PullRequestCard } from '../components/PullRequestCard';
import { TraceStep } from '../types';
import { 
  Activity, 
  RefreshCw, 
  Zap, 
  GitBranch, 
  GitCommit, 
  Layers, 
  Sparkles, 
  Terminal, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

interface IncidentsViewProps {
  runs: string[];
  selectedRun: string | null;
  traces: TraceStep[];
  loading: boolean;
  streamStatus: StreamStatus;
  onSelectRun: (runId: string) => void;
  onRefresh: () => void;
  onTriggerCheck: () => void;
  triggering: boolean;
}

export const IncidentsView: React.FC<IncidentsViewProps> = ({
  runs,
  selectedRun,
  traces,
  loading,
  streamStatus,
  onSelectRun,
  onRefresh,
  onTriggerCheck,
  triggering,
}) => {
  const prStep = traces.find((t) => t.stage === 'PR_CREATED');
  const patchStep = traces.find((t) => t.stage === 'PATCH_GENERATED');
  const [activeSubTab, setActiveSubTab] = useState<'timeline' | 'pr'>('timeline');

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#f0faf4]">
            Autonomous Diagnostic Workspace
          </h1>
          <p className="text-xs sm:text-sm text-[#94b8a3] mt-1">
            Real-time step-by-step reasoning telemetry emitted by the Gemini healing engine and sandbox runner.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onTriggerCheck}
            disabled={triggering}
            className="btn-solarpunk-primary px-4 py-2 text-xs font-display flex items-center gap-2 disabled:opacity-50"
          >
            <Zap className="w-4 h-4 text-[#041208]" />
            {triggering ? 'Healing...' : 'Trigger CI Check'}
          </button>
          <button
            onClick={onRefresh}
            className="btn-solarpunk-secondary p-2 text-xs font-mono flex items-center gap-1.5"
            title="Refresh runs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Split-Pane Workspace: Left Runs List + Right Diagnostic Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 4 Cols: Incidents & Runs List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="solar-card rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#94b8a3]">
                Workflow Runs ({runs.length})
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-[#00f59b]/10 text-[#00f59b] rounded border border-[#00f59b]/30">
                live feed
              </span>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {runs.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-[#557562]">
                  No runs recorded yet.<br />Click 'Trigger CI Check' above.
                </div>
              ) : (
                runs.slice().reverse().map((runId) => {
                  const isActive = selectedRun === runId;
                  return (
                    <button
                      key={runId}
                      onClick={() => onSelectRun(runId)}
                      className={`w-full text-left p-3.5 rounded-xl transition-all border flex items-center justify-between ${
                        isActive
                          ? 'bg-[#15261b] border-[#00f59b]/40 shadow-[0_0_15px_rgba(0,245,155,0.15)] text-[#f0faf4]'
                          : 'bg-[#060b08] border-[#1b3022] hover:border-[#2d543a] text-[#94b8a3]'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#00f59b] shadow-[0_0_6px_#00f59b]' : 'bg-[#557562]'}`} />
                          <span className="text-xs font-mono font-bold">
                            run/{runId}
                          </span>
                        </div>
                        <p className="text-[10px] text-[#557562] font-mono pl-4">
                          Shaswati2005/autopatch-ci @ main
                        </p>
                      </div>

                      <ChevronRight className={`w-4 h-4 ${isActive ? 'text-[#00f59b]' : 'text-[#557562]'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Deep-Dive Diagnostic Workspace */}
        <div className="lg:col-span-8 space-y-4">
          <div className="solar-card rounded-2xl overflow-hidden border border-[#1b3022]">
            
            {/* Workspace Header Bar */}
            <div className="px-6 py-4 bg-[#0b140e] border-b border-[#1b3022] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#00f59b]/10 border border-[#00f59b]/30 flex items-center justify-center text-[#00f59b]">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm text-[#f0faf4]">
                      {selectedRun ? `Incident Trace: run/${selectedRun}` : 'Select an Incident'}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#557562] font-mono">
                    Target: Shaswati2005/autopatch-ci • Branch: main
                  </p>
                </div>
              </div>

              <ConnectionStatus status={streamStatus} runId={selectedRun} />
            </div>

            {/* Workspace Content */}
            <div className="p-6">
              {loading && traces.length === 0 ? (
                <div className="py-24 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-[#00f59b] border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs font-mono text-[#94b8a3]">Retrieving agent reasoning telemetry...</p>
                </div>
              ) : traces.length === 0 ? (
                <div className="py-24 text-center space-y-3">
                  <Sparkles className="w-10 h-10 text-[#557562] mx-auto" />
                  <p className="font-display font-bold text-base text-[#f0faf4]">No Active Trace Selected</p>
                  <p className="text-xs text-[#94b8a3] max-w-sm mx-auto">
                    Select a run from the sidebar or click 'Trigger CI Check' to execute the self-healing workflow.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Visual Stepper Timeline */}
                  <PipelineTimeline traces={traces} />

                  {/* PR Card banner if PR stage reached */}
                  {prStep?.payload?.pr_url && (
                    <div className="pt-2 animate-fade-in-up">
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
        </div>

      </div>
    </div>
  );
};
