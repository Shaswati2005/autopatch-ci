import React from 'react';
import { TraceStep } from '../types';
import { DiffViewer } from './DiffViewer';
import { TerminalOutput } from './TerminalOutput';

const STAGE_CONFIG: Record<string, { icon: string; label: string; color: string; glow: string }> = {
  INGESTED:            { icon: '📡', label: 'Event Ingested',   color: '#8888aa', glow: 'rgba(136,136,170,0.20)' },
  LOGS_PARSED:         { icon: '🔍', label: 'Logs Diagnosed',  color: '#60a5fa', glow: 'rgba(59,130,246,0.22)'  },
  PATCH_GENERATED:     { icon: '🤖', label: 'Patch Generated', color: '#a78bfa', glow: 'rgba(139,92,246,0.25)'  },
  VERIFYING:           { icon: '⚙️', label: 'Verifying…',     color: '#f59e0b', glow: 'rgba(245,158,11,0.22)'  },
  VERIFIED:            { icon: '✅', label: 'Verified',        color: '#4ade80', glow: 'rgba(74,222,128,0.25)'  },
  VERIFICATION_PASSED: { icon: '✅', label: 'Verified',        color: '#4ade80', glow: 'rgba(74,222,128,0.25)'  },
  VERIFICATION_FAILED: { icon: '❌', label: 'Verify Failed',   color: '#f87171', glow: 'rgba(248,113,113,0.25)' },
  PR_CREATED:          { icon: '🚀', label: 'PR Delivered',    color: '#4ade80', glow: 'rgba(74,222,128,0.30)'  },
  FAILED:              { icon: '💥', label: 'Pipeline Failed', color: '#f87171', glow: 'rgba(248,113,113,0.25)' },
};

interface PipelineTimelineProps {
  traces: TraceStep[];
}

export const PipelineTimeline: React.FC<PipelineTimelineProps> = ({ traces }) => {
  if (traces.length === 0) return null;

  return (
    <div className="space-y-0">
      {traces.map((step, idx) => {
        const cfg = STAGE_CONFIG[step.stage] ?? {
          icon: '◆', label: step.stage,
          color: 'var(--text-secondary)', glow: 'rgba(136,136,170,0.15)',
        };
        const isPatch        = step.stage === 'PATCH_GENERATED' && step.payload?.diff;
        const isVerification = (step.stage === 'VERIFIED' || step.stage === 'VERIFICATION_PASSED' || step.stage === 'VERIFICATION_FAILED') && step.payload?.test_output;
        const isLast         = idx === traces.length - 1;
        const delay          = `${idx * 80}ms`;

        return (
          <div
            key={step.step_id || idx}
            className="relative flex gap-4 animate-slide-up"
            style={{ animationDelay: delay }}
            data-testid={`trace-step-${idx}`}
          >
            {/* ── Neon connector strand */}
            {!isLast && (
              <div
                className="absolute z-0"
                style={{
                  left: 19, top: 40, bottom: 0,
                  width: 2,
                  background: `linear-gradient(to bottom, ${cfg.color}40, transparent)`,
                }}
              />
            )}

            {/* ── Stage icon bubble */}
            <div
              className="relative flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center z-10 mt-0.5"
              style={{
                background: `rgba(0,0,0,0.5)`,
                border: `1px solid ${cfg.color}50`,
                boxShadow: `0 0 16px ${cfg.glow}, 0 0 6px ${cfg.glow}`,
                fontSize: '15px',
                backdropFilter: 'blur(8px)',
              }}
            >
              {cfg.icon}
            </div>

            {/* ── Content card */}
            <div className="flex-1 pb-5">
              <div
                className="rounded-xl p-4 transition-all"
                style={{
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Stage-colored top accent strip */}
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute', top: 0, left: '10%', right: '10%', height: 1,
                    background: `linear-gradient(90deg, transparent, ${cfg.color}60, transparent)`,
                  }}
                />

                {/* Header row */}
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-md"
                      style={{
                        background: `${cfg.color}18`,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}30`,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.03em',
                      }}
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

                {/* Detail text */}
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

                {/* Generic key-value payload */}
                {!isPatch && !isVerification && step.payload && Object.keys(step.payload).length > 0 && (
                  <div
                    className="mt-3 rounded-lg p-3 text-xs space-y-1 overflow-x-auto"
                    style={{
                      background: 'rgba(0,0,0,0.25)',
                      border: '1px solid rgba(255,255,255,0.05)',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {Object.entries(step.payload).map(([k, v]) => (
                      <div key={k} className="flex gap-3 items-center">
                        <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{k}:</span>
                        {typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://')) ? (
                          <a
                            href={v}
                            target="_blank"
                            rel="noreferrer"
                            className="underline hover:opacity-80 transition-opacity"
                            style={{ color: '#7553f6', wordBreak: 'break-all' }}
                          >
                            {v} ↗
                          </a>
                        ) : (
                          <span style={{ color: 'var(--accent-neon)', wordBreak: 'break-all' }}>{String(v)}</span>
                        )}
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


