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
  Terminal, 
  ChevronRight,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono">
            <span className="text-accent">Diagnostic Trace</span>
            <span className="text-text-dim">/</span>
            <span className="text-text-muted">Incidents</span>
          </div>
          <h1 className="font-headline text-[24px] sm:text-[26px] text-text font-semibold mt-1 tracking-tight">
            Autonomous Incident Diagnostics
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          {prStep?.payload?.pr_url && (
            <button
              onClick={() => setShowCommandCenter(true)}
              className="btn-primary text-[12px] flex items-center gap-2"
            >
              <GitMerge className="w-3.5 h-3.5 text-bg" />
              PR Command Center
            </button>
          )}

          <button
            onClick={() => setShowCopilot(true)}
            className="btn-secondary text-[12px] flex items-center gap-2 text-accent border-border-strong hover:border-accent"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Gemini Copilot
          </button>

          <button
            onClick={onTriggerCheck}
            disabled={triggering}
            className="btn-secondary text-[12px] flex items-center gap-2"
          >
            <Zap className="w-3.5 h-3.5 text-accent" />
            {triggering ? 'Verifying...' : 'Trigger CI Check'}
          </button>

          <button
            onClick={onRefresh}
            className="btn-secondary p-2 text-[12px]"
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
          <div className="warp-card p-4 space-y-3 bg-surface border border-border">
            <div className="flex items-center justify-between pb-2.5 border-b border-border">
              <span className="text-[11px] font-mono font-bold text-text uppercase tracking-wider">
                Workflow Runs ({runs.length})
              </span>
              <span className="text-[10px] font-mono text-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                live feed
              </span>
            </div>

            <div className="space-y-1.5 max-h-[560px] overflow-y-auto pr-1">
              {runs.length === 0 ? (
                <div className="py-12 text-center text-[12px] font-mono text-text-dim">
                  No runs recorded yet.<br />Click 'Trigger CI Check' to begin.
                </div>
              ) : (
                runs.slice().reverse().map((runId) => {
                  const isActive = selectedRun === runId;
                  return (
                    <button
                      key={runId}
                      onClick={() => onSelectRun(runId)}
                      className={`w-full text-left p-3 rounded-[8px] transition-colors border flex items-center justify-between ${
                        isActive
                          ? 'bg-surface-2 border-accent text-text'
                          : 'bg-bg-alt border-border hover:border-border-strong text-text-muted'
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-accent' : 'bg-text-dim'}`} />
                          <span className="text-[12px] font-mono font-bold">
                            run/{runId}
                          </span>
                        </div>
                        <p className="text-[11px] font-mono text-text-dim pl-4">
                          AutoPatch Run #{runId} • Firestore
                        </p>
                      </div>

                      <ChevronRight className={`w-3.5 h-3.5 ${isActive ? 'text-accent' : 'text-text-dim'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 8 Cols: Live Workspace */}
        <div className="lg:col-span-8 space-y-4">
          <div className="warp-card overflow-hidden bg-surface border border-border">
            
            {/* Header Bar */}
            <div className="px-5 py-3.5 bg-bg-alt border-b border-border flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-[8px] bg-surface-2 border border-border flex items-center justify-center text-accent">
                  <Terminal className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="font-mono text-[13px] font-bold text-text block">
                    {selectedRun ? `Incident Trace: run/${selectedRun}` : 'Select an Incident'}
                  </span>
                  <span className="text-[11px] text-text-dim font-mono block">
                    {prStep?.payload?.repo || 'Live AutoPatch Stream'}
                  </span>
                </div>
              </div>

              <ConnectionStatus status={streamStatus} runId={selectedRun} />
            </div>

            {/* Content Area */}
            <div className="p-5">
              {loading && traces.length === 0 ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-[12px] font-mono text-text-muted">Retrieving reasoning telemetry...</p>
                </div>
              ) : traces.length === 0 ? (
                <div className="py-16 text-center space-y-2.5">
                  <div className="w-10 h-10 rounded-[8px] bg-accent-soft/20 border border-border flex items-center justify-center mx-auto text-accent-soft">
                    <Activity className="w-5 h-5" />
                  </div>
                  <p className="font-headline text-[17px] text-text font-semibold">No Active Trace Selected</p>
                  <p className="text-[12px] text-text-muted max-w-sm mx-auto font-sans">
                    Select a run from the sidebar or click 'Trigger CI Check' to execute the self-healing workflow.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <PipelineTimeline traces={traces} />

                  {prStep?.payload?.pr_url && (
                    <div className="pt-2 space-y-3 animate-fade-in-up">
                      <PullRequestCard
                        prUrl={prStep.payload.pr_url}
                        prNumber={prStep.payload.pr_number as number | undefined}
                        branch={prStep.payload.branch}
                        repo={prStep.payload.repo}
                      />
                      <button
                        onClick={() => setShowCommandCenter(true)}
                        className="w-full btn-primary py-2.5 text-[13px] font-medium flex items-center justify-center gap-2"
                      >
                        <GitMerge className="w-4 h-4 text-bg" />
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
          repo={prStep.payload.repo || 'repository'}
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
