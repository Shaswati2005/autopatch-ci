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

const PRESETS = [
  {
    name: 'Python TypeError (calculator.py)',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Backend Test Suite',
    raw_log: `==================================== FAILURES ====================================
FAILED src/calculator.py::test_calculate_tax - TypeError: unsupported operand type(s) for *: 'NoneType' and 'float'
File "src/calculator.py", line 28, in calculate_tax
    return price * 0.15`,
  },
  {
    name: 'Python SyntaxError (engine.py)',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Build Verification',
    raw_log: `Traceback (most recent call last):
  File "src/parser/engine.py", line 45
    def parse_payload(:
                      ^
SyntaxError: invalid syntax`,
  },
  {
    name: 'TypeScript TS2322 Type Error',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Type Checker',
    raw_log: `src/components/Card.tsx(34,12): error TS2322: Type 'string' is not assignable to type 'number'.
npm ERR! code 1`,
  },
  {
    name: 'Jest ReferenceError (login.test.ts)',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Jest E2E Tests',
    raw_log: `FAIL src/auth/login.test.ts
  ● Login Flow › should authenticate user
    ReferenceError: localStorage is not defined
      at Object.<anonymous> (src/auth/login.test.ts:52:7)`,
  },
  {
    name: 'Custom Stack Trace (Input your own)',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Custom Workflow',
    raw_log: '',
  },
];

export { PRESETS };

export const RunSidebar: React.FC<RunSidebarProps> = ({
  runs,
  selectedRun,
  onSelect,
  onRefresh,
  onTrigger,
  triggering,
  scenarioIndex,
  onScenarioChange,
  repo,
  branch,
  onRepoChange,
  onBranchChange,
  customLog,
  onCustomLogChange,
}) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Trigger Panel */}
      <div
        className="rounded-2xl p-5 space-y-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Start Autonomous Repair
          </h2>
          <span
            className="text-xs px-2 py-0.5 rounded-md"
            style={{
              background: 'rgba(34,197,94,0.1)',
              color: '#22c55e',
              border: '1px solid rgba(34,197,94,0.25)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Live Agent
          </span>
        </div>

        {/* Scenario selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            Failure Type / Scenario
          </label>
          <select
            value={scenarioIndex}
            onChange={(e) => onScenarioChange(Number(e.target.value))}
            className="w-full text-xs rounded-xl px-3 py-2.5 outline-none transition-all appearance-none"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              fontFamily: "'JetBrains Mono', monospace",
              cursor: 'pointer',
            }}
          >
            {PRESETS.map((p, i) => (
              <option key={i} value={i}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Repo / Branch inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Repository
            </label>
            <input
              value={repo}
              onChange={(e) => onRepoChange(e.target.value)}
              placeholder="owner/repo"
              className="w-full text-xs rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              Branch
            </label>
            <input
              value={branch}
              onChange={(e) => onBranchChange(e.target.value)}
              placeholder="main"
              className="w-full text-xs rounded-lg px-3 py-2 outline-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            />
          </div>
        </div>

        {/* Custom stack trace input */}
        {onCustomLogChange && (
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
              {scenarioIndex === 4 ? 'Paste Custom CI Failure Log' : 'CI Error Log Preview'}
            </label>
            <textarea
              rows={3}
              value={customLog ?? PRESETS[scenarioIndex]?.raw_log ?? ''}
              onChange={(e) => onCustomLogChange(e.target.value)}
              placeholder="Paste raw stack trace or pytest failure log..."
              className="w-full text-xs rounded-lg px-3 py-2 outline-none resize-none"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px',
                lineHeight: '1.4',
              }}
            />
          </div>
        )}

        {/* Trigger button */}
        <button
          onClick={onTrigger}
          disabled={triggering}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: triggering
              ? 'var(--bg-elevated)'
              : 'linear-gradient(135deg, var(--accent), #a855f7)',
            color: triggering ? 'var(--text-muted)' : '#fff',
            boxShadow: triggering ? 'none' : '0 4px 20px var(--accent-glow)',
            cursor: triggering ? 'not-allowed' : 'pointer',
            border: 'none',
          }}
          data-testid="trigger-btn"
        >
          {triggering ? (
            <>
              <span
                className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin-slow"
                style={{ borderColor: 'var(--text-muted)', borderTopColor: 'transparent' }}
              />
              Repairing failure...
            </>
          ) : (
            <>⚡ Start Autonomous Repair</>
          )}
        </button>
      </div>

      {/* Run History */}
      <div
        className="rounded-2xl p-5 flex-1 flex flex-col gap-3"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minHeight: 0 }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            Workflow Runs <span style={{ color: 'var(--text-muted)' }}>({runs.length})</span>
          </h2>
          <button
            onClick={onRefresh}
            className="text-xs transition-colors"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            ↻ refresh
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1.5 -mr-1 pr-1">
          {runs.length === 0 ? (
            <div
              className="text-xs text-center py-8 rounded-xl"
              style={{ color: 'var(--text-muted)', border: '1px dashed var(--border)' }}
            >
              No runs yet.<br />Trigger a simulation above.
            </div>
          ) : (
            runs.slice().reverse().map((runId) => {
              const active = selectedRun === runId;
              return (
                <button
                  key={runId}
                  onClick={() => onSelect(runId)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{
                    background: active ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                    border: `1px solid ${active ? 'rgba(124,106,245,0.35)' : 'var(--border-subtle)'}`,
                    cursor: 'pointer',
                  }}
                  data-testid={`run-item-${runId}`}
                >
                  <span
                    className="text-xs font-medium"
                    style={{ color: active ? 'var(--accent)' : 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    run/{runId}
                  </span>
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-md"
                    style={{
                      background: active ? 'rgba(124,106,245,0.15)' : 'var(--bg-card)',
                      color: active ? 'var(--accent)' : 'var(--text-muted)',
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: '10px',
                    }}
                  >
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
