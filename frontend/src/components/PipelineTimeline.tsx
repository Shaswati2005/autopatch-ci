import React from 'react';
import { TraceStep } from '../app/page';
import { DiffViewer } from './DiffViewer';
import { TerminalOutput } from './TerminalOutput';

const STAGE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
  INGESTED:           { icon: '📡', label: 'Event Ingested',     color: '#8888aa', bg: 'rgba(136,136,170,0.1)' },
  LOGS_PARSED:        { icon: '🔍', label: 'Logs Diagnosed',    color: '#60a5fa', bg: 'rgba(59,130,246,0.1)'  },
  PATCH_GENERATED:    { icon: '🤖', label: 'Patch Generated',   color: '#a78bfa', bg: 'rgba(124,106,245,0.12)'},
  VERIFYING:          { icon: '⚙️', label: 'Verifying...',      color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  VERIFIED:           { icon: '✅', label: 'Verified',          color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  VERIFICATION_PASSED:{ icon: '✅', label: 'Verified',          color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  VERIFICATION_FAILED:{ icon: '❌', label: 'Verify Failed',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  PR_CREATED:         { icon: '🚀', label: 'PR Delivered',      color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  FAILED:             { icon: '💥', label: 'Pipeline Failed',   color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

interface PipelineTimelineProps {
  traces: TraceStep[];
}

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({ traces }) => {
  if (traces.length === 0) return null;

  return (
    <div className="space-y-0">
      {traces.map((step, idx) => {
        const cfg = STAGE_CONFIG[step.stage] ?? { icon: '◆', label: step.stage, color: 'var(--text-secondary)', bg: 'var(--bg-elevated)' };
        const isPatch = step.stage === 'PATCH_GENERATED' && step.payload?.diff;
        const isVerification = (step.stage === 'VERIFIED' || step.stage === 'VERIFICATION_PASSED' || step.stage === 'VERIFICATION_FAILED') && step.payload?.test_output;
        const isLast = idx === traces.length - 1;

        return (
          <div
            key={step.step_id || idx}
            className="relative flex gap-4 animate-fade-in-up"
            style={{ animationDelay: `${idx * 50}ms` }}
            data-testid={`trace-step-${idx}`}
          >
            {/* Timeline line */}
            {!isLast && (
              <div
                className="absolute left-[15px] top-8 bottom-0 w-px"
                style={{ background: 'linear-gradient(to bottom, var(--border), transparent)' }}
              />
            )}

            {/* Icon bubble */}
            <div
              className="relative flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base z-10 mt-1"
              style={{ background: cfg.bg, border: `1px solid ${cfg.color}30`, fontSize: '14px' }}
            >
              {cfg.icon}
            </div>

            {/* Content card */}
            <div className="flex-1 pb-6">
              <div
                className="rounded-xl p-4 transition-all"
                style={{
                  background: 'var(--bg-card)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{ background: cfg.bg, color: cfg.color, fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {cfg.label}
                    </span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                      {step.title}
                    </span>
                  </div>
                  <span
                    className="text-xs hidden sm:block"
                    style={{ color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {new Date(step.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                {/* Detail */}
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {step.detail}
                </p>

                {/* Rich diff */}
                {isPatch && step.payload && (
                  <div className="mt-3">
                    <DiffViewer
                      diff={step.payload.diff!}
                      targetFile={step.payload.target_file}
                      explanation={step.payload.explanation}
                    />
                  </div>
                )}

                {/* Terminal output */}
                {isVerification && step.payload && (
                  <div className="mt-3">
                    <TerminalOutput
                      output={step.payload.test_output!}
                      passed={Boolean(step.payload.passed ?? true)}
                      durationSeconds={Number(step.payload.duration_s || 0)}
                    />
                  </div>
                )}

                {/* Generic payload */}
                {!isPatch && !isVerification && step.payload && Object.keys(step.payload).length > 0 && (
                  <div
                    className="mt-3 rounded-lg p-3 text-xs space-y-1 overflow-x-auto"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {Object.entries(step.payload).map(([k, v]) => (
                      <div key={k} className="flex gap-3">
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}:</span>
                        <span style={{ color: 'var(--accent)', wordBreak: 'break-all' }}>{String(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
