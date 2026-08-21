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
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Backend Test Suite',
    raw_log: `==================================== FAILURES ====================================\nFAILED src/calculator.py::test_calculate_tax - TypeError: unsupported operand type(s) for *: 'NoneType' and 'float'\nFile "src/calculator.py", line 28, in calculate_tax\n    return price * 0.15`,
  },
  {
    name: 'Python SyntaxError (engine.py)',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Build Verification',
    raw_log: `Traceback (most recent call last):\n  File "src/parser/engine.py", line 45\n    def parse_payload(:\n                      ^\nSyntaxError: invalid syntax`,
  },
  {
    name: 'TypeScript TS2322 Type Error',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Type Checker',
    raw_log: `src/components/Card.tsx(34,12): error TS2322: Type 'string' is not assignable to type 'number'.\nnpm ERR! code 1`,
  },
  {
    name: 'Jest ReferenceError (login.test.ts)',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Jest E2E Tests',
    raw_log: `FAIL src/auth/login.test.ts\n  \u25cf Login Flow \u203a should authenticate user\n    ReferenceError: localStorage is not defined\n      at Object.<anonymous> (src/auth/login.test.ts:52:7)`,
  },
  {
    name: 'Custom Stack Trace (Input your own)',
    repo: 'Shaswati2005/autopatch-ci',
    branch: 'main',
    workflow_name: 'CI / Custom Workflow',
    raw_log: '',
  },
];

const inputStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: 'var(--text-primary)',
  fontFamily: "'JetBrains Mono', monospace",
  transition: 'border-color 0.2s, box-shadow 0.2s',
  outline: 'none',
};

function GlassInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full text-xs rounded-lg px-3 py-2 outline-none ${props.className ?? ''}`}
      style={{ ...inputStyle, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.12)'; }}
      onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
    />
  );
}

export const RunSidebar: React.FC<RunSidebarProps> = ({
  runs, selectedRun, onSelect, onRefresh, onTrigger, triggering,
  scenarioIndex, onScenarioChange, repo, branch, onRepoChange, onBranchChange,
  customLog, onCustomLogChange,
}) => {
  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Trigger Panel */}
      <div
        className="rounded-2xl p-5 space-y-4 animate-slide-up stagger-0"
        style={{
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)',
          boxShadow: '0 4px 30px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{
          position: 'absolute', top: 0, left: '20%', right: '20%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(139,92,246,0.6), transparent)',
        }} aria-hidden="true" />

        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-widest" style={{
            fontFamily: "'Syne', sans-serif",
            background: 'linear-gradient(135deg, var(--accent-neon), var(--accent))',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent',
            letterSpacing: '0.12em',
          }}>
            Autonomous Repair
          </h2>
          <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{
            background: 'rgba(74,222,128,0.08)', color: 'var(--green-neon)',
            border: '1px solid rgba(74,222,128,0.2)',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--green-neon)',
              boxShadow: '0 0 6px rgba(74,222,128,0.8)', display: 'inline-block',
              animation: 'pulseRing 2s cubic-bezier(0.455,0.03,0.515,0.955) infinite',
            }} />
            Live Agent
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Failure Scenario</label>
          <select
            value={scenarioIndex}
            onChange={(e) => onScenarioChange(Number(e.target.value))}
            className="w-full text-xs rounded-xl px-3 py-2.5 outline-none appearance-none"
            style={{ ...inputStyle, borderRadius: 10, cursor: 'pointer' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            {PRESETS.map((p, i) => <option key={i} value={i}>{p.name}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Repository</label>
            <GlassInput value={repo} onChange={(e) => onRepoChange(e.target.value)} placeholder="owner/repo" />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Branch</label>
            <GlassInput value={branch} onChange={(e) => onBranchChange(e.target.value)} placeholder="main" />
          </div>
        </div>

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
                background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.06)',
                color: '#3fb950', fontFamily: "'JetBrains Mono', monospace",
                fontSize: '11px', lineHeight: '1.5', transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(139,92,246,0.35)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'; }}
            />
          </div>
        )}

        <button
          onClick={onTrigger} disabled={triggering}
          className="shimmer-btn w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
          style={{
            background: triggering ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #7c3aed, #a855f7)',
            color: triggering ? 'var(--text-muted)' : '#fff',
            boxShadow: triggering ? 'none' : '0 4px 24px rgba(139,92,246,0.35), 0 0 0 1px rgba(168,85,247,0.2)',
            cursor: triggering ? 'not-allowed' : 'pointer',
            border: 'none', fontFamily: "'Syne', sans-serif", fontWeight: 700, letterSpacing: '-0.01em',
            transition: 'transform 0.15s var(--ease-spring), box-shadow 0.2s',
          }}
          onMouseEnter={e => { if (!triggering) (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}
          onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(0.98)'; }}
          onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          data-testid="trigger-btn"
        >
          {triggering ? (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin-slow"
                style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'transparent' }} />
              Repairing failure...
            </>
          ) : <>⚡ Start Autonomous Repair</>}
        </button>
      </div>

      {/* Run History */}
      <div
        className="rounded-2xl p-5 flex-1 flex flex-col gap-3 animate-slide-up stagger-1"
        style={{
          background: 'rgba(255,255,255,0.02)',
          backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.07)', minHeight: 0,
        }}
      >
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
            Workflow Runs{' '}
            <span style={{ color: 'var(--accent)', background: 'rgba(139,92,246,0.12)', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
              {runs.length}
            </span>
          </h2>
          <button
            onClick={onRefresh}
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--accent)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
          >
            ↻ refresh
          </button>
        </div>

        <div className="overflow-y-auto flex-1 space-y-1.5 -mr-1 pr-1">
          {runs.length === 0 ? (
            <div className="text-xs text-center py-8 rounded-xl"
              style={{ color: 'var(--text-dim)', border: '1px dashed rgba(255,255,255,0.06)' }}>
              No runs yet.<br />Trigger a simulation above.
            </div>
          ) : (
            runs.slice().reverse().map((runId) => {
              const active = selectedRun === runId;
              return (
                <button
                  key={runId}
                  onClick={() => onSelect(runId)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left"
                  style={{
                    background: active ? 'rgba(139,92,246,0.10)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${active ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.05)'}`,
                    boxShadow: active ? '0 0 16px rgba(139,92,246,0.10)' : 'none',
                    cursor: 'pointer', transition: 'all 0.2s var(--ease-spring)',
                  }}
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(139,92,246,0.2)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; } }}
                  data-testid={`run-item-${runId}`}
                >
                  <span className="text-xs font-medium"
                    style={{ color: active ? 'var(--accent-neon)' : 'var(--text-secondary)', fontFamily: "'JetBrains Mono', monospace" }}>
                    run/{runId}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded-md"
                    style={{
                      background: active ? 'rgba(139,92,246,0.18)' : 'rgba(255,255,255,0.04)',
                      color: active ? 'var(--accent-neon)' : 'var(--text-muted)',
                      fontFamily: "'JetBrains Mono', monospace", fontSize: '10px',
                    }}>
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
