import React, { useState } from 'react';
import { ConnectionStatus, StreamStatus } from '../components/ConnectionStatus';
import { PipelineTimeline } from '../components/PipelineTimeline';
import { PullRequestCard } from '../components/PullRequestCard';
import { PRCommandCenterModal } from '../components/PRCommandCenterModal';
import { PRCopilotChat } from '../components/PRCopilotChat';
import { TraceStep } from '../types';
import { 
  Activity, 
  RefreshCw, 
  Zap, 
  GitBranch, 
  Terminal, 
  CheckCircle2, 
  ChevronRight,
  ShieldCheck,
  Sparkles,
  GitMerge
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
  const [showCommandCenter, setShowCommandCenter] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);

  const prStep = traces.find((t) => t.stage === 'PR_CREATED');
  const patchStep = traces.find((t) => t.stage === 'PATCH_GENERATED');
  const diffSnippet = patchStep?.payload?.diff || '';

  return (
    <div className="space-y-6 animate-fade-in-up">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232838]">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#7553f6]">Diagnostic Trace</span>
            <span className="text-[#5f6580] font-mono text-xs">/</span>
            <span className="font-mono text-xs text-[#9aa1b3]">Incidents</span>
          </div>
          <h1 className="font-headline text-2xl sm:text-3xl text-[#f1f1f4] mt-1">
            Autonomous Incident Diagnostics
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {prStep?.payload?.pr_url && (
            <button
              onClick={() => setShowCommandCenter(true)}
              className="btn-warp-primary px-3.5 py-2 text-xs flex items-center gap-1.5"
            >
              <GitMerge className="w-3.5 h-3.5 text-[#0b0d14]" />
              PR Command Center
            </button>
          )}

          <button
            onClick={() => setShowCopilot(true)}
            className="btn-warp-secondary px-3.5 py-2 text-xs flex items-center gap-1.5 text-[#7553f6]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gemini Copilot
          </button>

          <button
            onClick={onTriggerCheck}
            disabled={triggering}
            className="btn-warp-secondary px-3.5 py-2 text-xs"
          >
            <Zap className="w-3.5 h-3.5 text-[#7553f6]" />
            {triggering ? 'Verifying...' : 'Trigger CI Check'}
          </button>

          <button
            onClick={onRefresh}
            className="btn-warp-secondary p-2 text-xs"
            title="Refresh runs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Split-Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left 4 Cols: Incidents List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="warp-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#232838]">
              <span className="text-xs font-mono font-bold text-[#f1f1f4] uppercase tracking-wider">
                Workflow Runs ({runs.length})
              </span>
              <span className="text-[10px] font-mono text-[#5ee78a]">
                live feed
              </span>
            </div>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
              {runs.length === 0 ? (
                <div className="py-12 text-center text-xs font-mono text-[#5f6580]">
                  No runs recorded yet.<br />Click 'Trigger CI Check' to begin.
                </div>
              ) : (
                runs.slice().reverse().map((runId) => {
                  const isActive = selectedRun === runId;
                  return (
                    <button
                      key={runId}
                      onClick={() => onSelectRun(runId)}
                      className={`w-full text-left p-3 rounded-lg transition-colors border flex items-center justify-between ${
                        isActive
                          ? 'bg-[#1e2331] border-[#7553f6] text-[#f1f1f4]'
                          : 'bg-[#11141d] border-[#232838] hover:border-[#2e3447] text-[#9aa1b3]'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#7553f6]' : 'bg-[#5f6580]'}`} />
                          <span className="text-xs font-mono font-bold">
                            run/{runId}
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[#5f6580] pl-4">
                          AutoPatch Run #{runId} • ADK Agent
                        </p>
                      </div>

                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-[#7553f6]' : 'text-[#5f6580]'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Live Workspace */}
        <div className="lg:col-span-8 space-y-4">
          <div className="warp-card overflow-hidden bg-[#161a25] border border-[#232838]">
            
            {/* Header Bar */}
            <div className="px-5 py-3.5 bg-[#11141d] border-b border-[#232838] flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#161a25] border border-[#2e3447] flex items-center justify-center text-[#7553f6]">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-mono text-xs font-bold text-[#f1f1f4] block">
                    {selectedRun ? `Incident Trace: run/${selectedRun}` : 'Select an Incident'}
                  </span>
                  <span className="text-[10px] text-[#5f6580] font-mono block">
                    Shaswati2005/autopatch-ci • main
                  </span>
                </div>
              </div>

              <ConnectionStatus status={streamStatus} runId={selectedRun} />
            </div>

            {/* Content Area */}
            <div className="p-6">
              {loading && traces.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-[#7553f6] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-mono text-[#9aa1b3]">Retrieving reasoning telemetry...</p>
                </div>
              ) : traces.length === 0 ? (
                <div className="py-20 text-center space-y-3">
                  <Activity className="w-8 h-8 text-[#584774] mx-auto" />
                  <p className="font-headline text-base text-[#f1f1f4]">No Active Trace Selected</p>
                  <p className="text-xs text-[#9aa1b3] max-w-sm mx-auto">
                    Select a run from the sidebar or click 'Trigger CI Check' to execute the self-healing workflow.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  <PipelineTimeline traces={traces} />

                  {prStep?.payload?.pr_url && (
                    <div className="pt-2 animate-fade-in-up space-y-3">
                      <PullRequestCard
                        prUrl={prStep.payload.pr_url}
                        prNumber={prStep.payload.pr_number as number | undefined}
                        branch={prStep.payload.branch}
                        repo={prStep.payload.repo}
                      />
                      <button
                        onClick={() => setShowCommandCenter(true)}
                        className="w-full btn-warp-primary py-2.5 text-xs font-medium flex items-center justify-center gap-2"
                      >
                        <GitMerge className="w-3.5 h-3.5 text-[#0b0d14]" />
                        Open PR Command Center & Merge
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* PR Command Center Modal */}
      {prStep?.payload?.pr_url && (
        <PRCommandCenterModal
          isOpen={showCommandCenter}
          onClose={() => setShowCommandCenter(false)}
          prUrl={prStep.payload.pr_url}
          prNumber={(prStep.payload.pr_number as number) || 1}
          branchName={prStep.payload.branch || 'autopatch/fix'}
          repo={prStep.payload.repo || 'Shaswati2005/autopatch-ci'}
          diffSnippet={diffSnippet}
          runId={selectedRun || '999'}
          onOpenCopilot={() => setShowCopilot(true)}
        />
      )}

      {/* Gemini PR Copilot Chat Drawer */}
      <PRCopilotChat
        isOpen={showCopilot}
        onClose={() => setShowCopilot(false)}
        currentCode={diffSnippet || 'def fix(): return True'}
        onApplyRefinedCode={(refined) => {
          console.log('Applied refined code:', refined);
        }}
      />

    </div>
  );
};
