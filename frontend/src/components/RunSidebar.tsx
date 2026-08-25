import React from 'react';

interface RunSidebarProps {
  runs: string[];
  selectedRun: string | null;
  onSelect: (runId: string) => void;
  onRefresh: () => void;
  onTrigger: () => void;
  triggering: boolean;
  scenarioIndex: number;
  onScenarioChange: (i: number) => void;
  repo: string;
  branch: string;
  onRepoChange: (v: string) => void;
  onBranchChange: (v: string) => void;
  customLog?: string;
  onCustomLogChange?: (v: string) => void;
}

export const PRESETS = [
  {
    name: 'Python TypeError (calculator.py)',
    repo: 'acme/payment-service',
    branch: 'main',
    workflow_name: 'CI / Backend Test Suite',
    raw_log: `==================================== FAILURES ====================================\nFAILED src/calculator.py::test_calculate_tax - TypeError: unsupported operand type(s) for *: 'NoneType' and 'float'\nFile "src/calculator.py", line 28, in calculate_tax\n    return price * 0.15`,
  },
  {
    name: 'Python SyntaxError (engine.py)',
    repo: 'acme/core-engine',
    branch: 'main',
    workflow_name: 'CI / Build Verification',
    raw_log: `Traceback (most recent call last):\n  File "src/parser/engine.py", line 45\n    def parse_payload(:\n                      ^\nSyntaxError: invalid syntax`,
  },
  {
    name: 'TypeScript TS2322 Type Error',
    repo: 'acme/web-app',
    branch: 'main',
    workflow_name: 'CI / Type Checker',
    raw_log: `src/components/Card.tsx(34,12): error TS2322: Type 'string' is not assignable to type 'number'.\nnpm ERR! code 1`,
  },
  {
    name: 'Jest ReferenceError (login.test.ts)',
    repo: 'acme/auth-service',
    branch: 'main',
    workflow_name: 'CI / Jest E2E Tests',
    raw_log: `FAIL src/auth/login.test.ts\n  ● Login Flow › should authenticate user\n    ReferenceError: localStorage is not defined\n      at Object.<anonymous> (src/auth/login.test.ts:52:7)`,
  },
  {
    name: 'Custom Stack Trace (Input your own)',
    repo: 'acme/custom-service',
    branch: 'main',
    workflow_name: 'CI / Custom Workflow',
    raw_log: '',
  },
];

export const RunSidebar: React.FC<RunSidebarProps> = ({
  runs, selectedRun, onSelect, onRefresh, onTrigger, triggering,
  scenarioIndex, onScenarioChange, repo, branch, onRepoChange, onBranchChange,
  customLog, onCustomLogChange,
}) => {
  return (
    <div className="flex flex-col gap-4 h-full font-mono text-[12px]">
      {/* Trigger Panel */}
      <div className="warp-card p-4 space-y-3 bg-surface border border-border">
        <div className="flex items-center justify-between">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-accent">
            Autonomous Repair
          </h2>
          <span className="text-[10px] px-2 py-0.5 rounded flex items-center gap-1.5 text-success bg-success/10 border border-success/30">
            <span className="w-1.5 h-1.5 rounded-full bg-success" />
            Live Agent
          </span>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] text-text-muted">Failure Scenario</label>
          <select
            value={scenarioIndex}
            onChange={(e) => onScenarioChange(Number(e.target.value))}
            className="input-warp w-full text-[12px] py-1.5 px-2.5"
          >
            {PRESETS.map((p, i) => <option key={i} value={i} className="bg-bg-alt text-text">{p.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[11px] text-text-muted">Repository</label>
            <input
              value={repo}
              onChange={(e) => onRepoChange(e.target.value)}
              placeholder="owner/repo"
              className="input-warp w-full text-[12px] py-1 px-2"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] text-text-muted">Branch</label>
            <input
              value={branch}
              onChange={(e) => onBranchChange(e.target.value)}
              placeholder="main"
              className="input-warp w-full text-[12px] py-1 px-2"
            />
          </div>
        </div>

        {onCustomLogChange && (
          <div className="space-y-1">
            <label className="text-[11px] text-text-muted">
              {scenarioIndex === 4 ? 'Paste Custom CI Failure Log' : 'CI Error Log Preview'}
            </label>
            <textarea
              rows={3}
              value={customLog ?? PRESETS[scenarioIndex]?.raw_log ?? ''}
              onChange={(e) => onCustomLogChange(e.target.value)}
              placeholder="Paste raw stack trace or pytest failure log..."
              className="input-warp w-full text-[11px] py-1.5 px-2 resize-none text-success leading-relaxed"
            />
          </div>
        )}

        <button
          onClick={onTrigger}
          disabled={triggering}
          className="btn-primary w-full py-2.5 text-[12px] font-medium transition-all disabled:opacity-50"
          data-testid="trigger-btn"
        >
          {triggering ? 'Repairing failure...' : '⚡ Start Autonomous Repair'}
        </button>
      </div>

      {/* Run History */}
      <div className="warp-card p-4 flex-1 flex flex-col gap-2.5 bg-surface border border-border min-h-0">
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
            Workflow Runs{' '}
            <span className="text-accent bg-bg-alt px-1.5 py-0.2 rounded text-[10px] border border-border tabular-nums">
              {runs.length}
            </span>
          </h2>
          <button
            onClick={onRefresh}
            className="text-[11px] text-text-dim hover:text-accent transition-colors"
          >
            ↻ refresh
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1 pr-1">
          {runs.length === 0 ? (
            <div className="text-[12px] text-center py-6 rounded text-text-dim border border-dashed border-border">
              No runs yet.<br />Trigger a simulation above.
            </div>
          ) : (
            runs.slice().reverse().map((runId) => {
              const active = selectedRun === runId;
              return (
                <button
                  key={runId}
                  onClick={() => onSelect(runId)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-[6px] text-left transition-colors ${
                    active
                      ? 'bg-surface-2 border border-accent text-text'
                      : 'bg-bg-alt border border-border hover:border-border-strong text-text-muted'
                  }`}
                  data-testid={`run-item-${runId}`}
                >
                  <span className="text-[12px] font-mono font-medium">
                    run/{runId}
                  </span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    active
                      ? 'bg-accent text-bg font-bold'
                      : 'bg-bg-alt text-text-dim border border-border'
                  }`}>
                    {active ? 'active' : 'done'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
